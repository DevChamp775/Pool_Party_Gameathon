import { supabase } from '@/lib/supabase';

export type Phase = 'lobby' | 'open' | 'revealing' | 'results';
export type Team = { id: number; name: string; balance: number; contributed: number; rewards: number; history: RoundResult[]; color: string; isBot?: boolean };
export type RoundResult = { round: number; previous: number; contribution: number; reward: number; balance: number };
export type Session = {
  id?: string;
  roomCode: string;
  initialTokens: number;
  rounds: number;
  multiplier: number;
  teams: Team[];
  currentRound: number;
  phase: Phase;
  timeLeft: number;
  locked: number[];
  currentContributions: Record<number, number>;
  roundResults: RoundResult[];
  createdAt: string;
  ended?: boolean;
};

export const TEAM_COLORS = ['#ffd400', '#ff5a36', '#24d4d8', '#ff9d28', '#f52f58', '#78e45b', '#a98cff', '#e978ff'];
export const BOT_NAMES = ['Bot Rex', 'Bot Nova', 'Bot Zed', 'Bot Ivy', 'Bot Ace', 'Bot Mo', 'Bot Lux'];
export const ROUND_SECONDS = 45;
export const REVEAL_MILLIS = 2200;
export const MAX_TEAMS = 8;
export const START_TOKENS = 100;
export const TOTAL_ROUNDS = 5;
export const POOL_MULTIPLIER = 2;

export const ADMIN_KEY = 'pool-party-admin-session';
export const PLAYER_KEY = 'pool-party-player-session';

export const makeTeam = (id: number, name: string, tokens: number): Team => ({
  id, name, balance: tokens, contributed: 0, rewards: 0, history: [], color: TEAM_COLORS[id % TEAM_COLORS.length], isBot: false,
});

export const makeBot = (id: number, tokens: number): Team => ({
  ...makeTeam(id, BOT_NAMES[(id - 1) % BOT_NAMES.length] ?? `Bot ${id}`, tokens), isBot: true,
});

export const nextTeamId = (session: Session) => session.teams.reduce((highest, team) => Math.max(highest, team.id), -1) + 1;

// Bots contribute 15-75% of their wallet, occasionally free-riding entirely.
export const botChoice = (balance: number) => (balance > 0 && Math.random() < 0.12 ? 0 : Math.floor(balance * (0.15 + Math.random() * 0.6)));

export function settleRound(base: Session): { teams: Team[]; results: RoundResult[] } {
  const totalPool = Object.values(base.currentContributions).reduce((sum, value) => sum + value, 0);
  const totalReward = Math.floor(totalPool * base.multiplier);
  const share = Math.floor(totalReward / base.teams.length);
  const remainder = totalReward % base.teams.length;
  const results = base.teams.map((team, index) => {
    const contribution = base.currentContributions[team.id] ?? 0;
    const reward = share + (index < remainder ? 1 : 0);
    return { round: base.currentRound, previous: team.balance, contribution, reward, balance: team.balance - contribution + reward };
  });
  const teams = base.teams.map((team, index) => ({
    ...team,
    balance: results[index].balance,
    contributed: team.contributed + results[index].contribution,
    rewards: team.rewards + results[index].reward,
    history: [...team.history, results[index]],
  }));
  return { teams, results };
}

export const newSession = (roomCode: string): Session => ({
  roomCode,
  initialTokens: START_TOKENS,
  rounds: TOTAL_ROUNDS,
  multiplier: POOL_MULTIPLIER,
  teams: [],
  currentRound: 1,
  phase: 'lobby',
  timeLeft: ROUND_SECONDS,
  locked: [],
  currentContributions: {},
  roundResults: [],
  createdAt: new Date().toISOString(),
});

export const makeRoomCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

export async function createRoom(session: Session): Promise<Session | null> {
  if (!supabase) return { ...session };
  const payload = { status: session.phase, join_code: session.roomCode, state: session, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('pool_party_sessions').insert(payload).select('id').maybeSingle();
  if (error || !data?.id) return null;
  return { ...session, id: data.id };
}

export async function saveRoom(session: Session): Promise<void> {
  if (!supabase || !session.id) return;
  await supabase.from('pool_party_sessions').update({ status: session.phase, state: session, updated_at: new Date().toISOString() }).eq('id', session.id);
}

export async function findRoom(code: string): Promise<{ id: string; state: Session } | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('pool_party_sessions').select('id, state').eq('join_code', code).maybeSingle();
  if (!data?.state) return null;
  return { id: data.id, state: data.state as Session };
}

// Merges one player's secret contribution into the latest remote state so the
// admin console (which owns the round timers) picks it up over realtime.
export async function submitContribution(sessionId: string, teamId: number, amount: number): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('pool_party_sessions').select('state').eq('id', sessionId).maybeSingle();
  const remote = data?.state as Session | undefined;
  if (!remote || remote.phase !== 'open' || remote.locked.includes(teamId)) return remote ?? null;
  const merged: Session = {
    ...remote,
    currentContributions: { ...remote.currentContributions, [teamId]: amount },
    locked: Array.from(new Set([...remote.locked, teamId])),
  };
  await saveRoom(merged);
  return merged;
}

export function subscribeToRoom(sessionId: string, onUpdate: (session: Session) => void) {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client.channel(`pool-party-room-${sessionId}`).on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'pool_party_sessions', filter: `id=eq.${sessionId}` },
    (payload) => {
      const remote = payload.new as { state?: Session };
      if (remote.state) onUpdate(remote.state);
    },
  ).subscribe();
  return () => { void client.removeChannel(channel); };
}

export function loadSaved<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export const storeLocal = <T,>(key: string, value: T) => localStorage.setItem(key, JSON.stringify(value));
