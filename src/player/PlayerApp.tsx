import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight, BarChart3, Check, ChevronLeft, Clock3, Coins, LockKeyhole, Play,
  RotateCcw, Sparkles, Users,
} from 'lucide-react';
import { PixelBackground, RevealCard, RoundResultsCard, FinalResults, Toast, useToast } from '@/components/shared';
import {
  findRoom, loadSaved, makeTeam, PLAYER_KEY, Phase, ROUND_SECONDS, saveRoom, Session,
  storeLocal, subscribeToRoom, submitContribution, Team,
} from '@/lib/game';

type SavedPlayer = { teamId: number; session: Session };

type PlayerScreen = 'join' | 'lobby' | 'game' | 'final';

export default function PlayerApp({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<PlayerScreen>('join');
  const [session, setSession] = useState<Session | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [contribution, setContribution] = useState(0);
  const [joinError, setJoinError] = useState('');
  const [busy, setBusy] = useState(false);
  const { message, showToast } = useToast();

  useEffect(() => {
    const saved = loadSaved(PLAYER_KEY);
    if (saved && typeof saved.teamId === 'number' && saved.session) {
      setSession(saved.session); setTeamId(saved.teamId);
      setScreen(saved.session.phase === 'lobby' ? 'lobby' : 'game');
    }
  }, []);

  useEffect(() => {
    if (!session?.id) return;
    return subscribeToRoom(session.id, (remote) => {
      setSession((current) => {
        if (!current) return remote;
        const next = { ...remote, id: current.id };
        storeLocal(PLAYER_KEY, { teamId, session: next } as SavedPlayer);
        return next;
      });
    });
  }, [session?.id, teamId]);

  useEffect(() => {
    if (!session) return;
    if (session.ended || (session.phase === 'results' && session.currentRound >= session.rounds)) setScreen('final');
    else if (session.phase === 'lobby') setScreen((current) => (current === 'join' ? 'lobby' : current === 'lobby' ? 'lobby' : current));
  }, [session?.phase, session?.ended, session]);

  const join = async () => {
    setBusy(true); setJoinError('');
    const code = roomCode.trim().toUpperCase();
    const name = teamName.trim();
    if (code.length < 4 || name.length < 2) { setBusy(false); setJoinError('Enter your team name and the room code.'); return; }
    const found = await findRoom(code);
    if (!found) { setBusy(false); setJoinError('No open room with that code. Double-check with your admin.'); return; }
    if (found.state.ended || found.state.phase !== 'lobby') { setBusy(false); setJoinError('That room has already started. Ask the admin to add you before round 1.'); return; }
    const id = found.state.teams.reduce((highest, team) => Math.max(highest, team.id), -1) + 1;
    const player: Team = makeTeam(id, name, found.state.initialTokens);
    const joined: Session = { ...found.state, id: found.id, teams: [...found.state.teams, player] };
    if (joined.id) void saveRoom(joined);
    storeLocal(PLAYER_KEY, { teamId: id, session: joined } as SavedPlayer);
    setSession(joined); setTeamId(id); setScreen('lobby');
    setBusy(false);
    showToast(`Joined ${name} in room ${code}`);
  };

  const lockIn = useCallback(async () => {
    if (!session || !session.id || teamId === null || session.phase !== 'open') return;
    const me = session.teams.find((team) => team.id === teamId);
    if (!me) return;
    const amount = Math.max(0, Math.min(Math.floor(contribution), me.balance));
    setBusy(true);
    await submitContribution(session.id, teamId, amount);
    setBusy(false);
    showToast(`Locked ${amount} tokens. Waiting for the reveal...`);
  }, [session, teamId, contribution, showToast]);

  const leave = () => { localStorage.removeItem(PLAYER_KEY); setSession(null); setTeamId(null); setScreen('join'); };

  if (screen === 'join') return <JoinGate teamName={teamName} setTeamName={setTeamName} roomCode={roomCode} setRoomCode={setRoomCode} error={joinError} busy={busy} onJoin={join} onBack={onExit} />;
  if (!session || teamId === null) return <JoinGate teamName={teamName} setTeamName={setTeamName} roomCode={roomCode} setRoomCode={setRoomCode} error={joinError} busy={busy} onJoin={join} onBack={onExit} />;
  if (screen === 'final') return <FinalResults session={session} actionLabel="Leave the room" onAction={leave} />;
  if (screen === 'lobby' || session.phase === 'lobby') return <WaitingRoom session={session} teamId={teamId} onLeave={leave} />;
  return <PlayScreen session={session} teamId={teamId} contribution={contribution} setContribution={setContribution} onLock={lockIn} busy={busy} toast={message} onLeave={leave} />;
}

type SavedPlayer = { teamId: number; session: Session };

function WaitingRoom({ session, teamId, onLeave }: { session: Session; teamId: number; onLeave: () => void }) {
  const me = session.teams.find((team) => team.id === teamId);
  return <main className="app-shell game-shell"><PixelBackground /><header className="game-header"><div className="player-badge">YOU ARE <b>{me?.name ?? 'PLAYER'}</b><span> · ROOM {session.roomCode}</span></div><div className="game-status"><span className="live-dot" /> WAITING ROOM <b>LOBBY</b></div><button className="icon-button" onClick={onLeave} title="Leave room"><RotateCcw size={17} /></button></header><div className="game-content"><div className="game-main"><div className="lobby-card"><div className="lobby-copy"><span className="section-label">YOU ARE IN</span><h1>Waiting for<br /><em>the admin.</em></h1><p>The admin starts round 1 when everyone is seated. Keep this page open — the game appears here automatically.</p><div className="host-hint"><Sparkles size={15} /><span>Each round gives you {ROUND_SECONDS} seconds to secretly choose how many tokens go into the pool.</span></div></div><div className="lobby-roster"><div className="side-heading"><span>IN THE ROOM · {session.teams.length}</span><Users size={16} /></div>{session.teams.map((team) => <div className={`leader-row ${team.id === teamId ? 'is-you' : ''}`} key={team.id}><span className="team-dot" style={{ background: team.color }} /><span className="team-name">{team.name}{team.id === teamId && <small> YOU</small>}{team.isBot && <small> BOT</small>}</span></div>)}</div></div></div><aside className="game-sidebar"><div className="wallet-card"><div className="wallet-head"><span>YOUR WALLET</span><Coins size={18} /></div><div className="wallet-balance"><strong>{me?.balance ?? 0}</strong><span>tokens</span></div></div><div className="arena-note"><Sparkles size={16} /><span><b>Remember:</b> everyone contributes in secret. The pool multiplies, then the reward is split equally.</span></div></aside></div></main>;
}

function PlayScreen({ session, teamId, contribution, setContribution, onLock, busy, toast, onLeave }: { session: Session; teamId: number; contribution: number; setContribution: (value: number) => void; onLock: () => void; busy: boolean; toast: string; onLeave: () => void }) {
  const me = session.teams.find((team) => team.id === teamId) ?? session.teams[0];
  const totalPool = Object.values(session.currentContributions).reduce((sum, value) => sum + value, 0);
  const percent = me.balance ? Math.round((contribution / me.balance) * 100) : 0;
  const leaderboard = [...session.teams].sort((a, b) => b.balance - a.balance);
  const locked = session.locked.includes(teamId);
  return <main className="app-shell game-shell"><PixelBackground /><header className="game-header"><div className="player-badge">YOU ARE <b>{me.name}</b><span> · ROOM {session.roomCode}</span></div><div className="game-status"><span className={session.phase === 'open' ? 'live-dot' : 'status-dot'} /> {session.phase === 'open' ? 'ROUND LIVE' : session.phase === 'revealing' ? 'REVEAL IN PROGRESS' : 'ROUND COMPLETE'} <b>{session.currentRound} / {session.rounds}</b></div><button className="icon-button" onClick={onLeave} title="Leave room"><RotateCcw size={17} /></button></header><div className="game-content"><div className="game-main"><div className="round-title"><div><span className="section-label">ROUND {String(session.currentRound).padStart(2, '0')} / {String(session.rounds).padStart(2, '0')}</span><h1>{session.phase === 'open' ? 'Make your move.' : session.phase === 'revealing' ? 'The pool is opening.' : 'The room has decided.'}</h1></div><div className={`timer ${session.timeLeft < 10 && session.phase === 'open' ? 'urgent' : ''}`}><Clock3 size={18} /><strong>{session.phase === 'open' ? `00:${String(session.timeLeft).padStart(2, '0')}` : session.phase === 'revealing' ? '•••' : 'DONE'}</strong></div></div>{session.phase === 'open' && <ContributionCard balance={me.balance} value={contribution} setValue={setContribution} percent={percent} onLock={onLock} locked={locked} busy={busy} />}{session.phase === 'revealing' && <RevealCard pool={totalPool} reward={Math.floor(totalPool * session.multiplier)} multiplier={session.multiplier} />}{session.phase === 'results' && <RoundResultsCard session={session} footer={<span><Sparkles size={15} /> The admin starts the next round</span>} />}{session.phase === 'open' && <div className="waiting-bar"><span><span className="live-dot" /> {session.locked.length} / {session.teams.length} decisions locked</span><span>Amounts stay hidden until reveal</span></div>}</div><aside className="game-sidebar"><div className="wallet-card"><div className="wallet-head"><span>YOUR WALLET</span><Coins size={18} /></div><div className="wallet-balance"><strong>{me.balance}</strong><span>tokens</span></div><div className="wallet-stats"><div><small>CONTRIBUTED</small><b>{me.contributed}</b></div><div><small>REWARDS</small><b className="gain">+{me.rewards}</b></div><div><small>RANK</small><b>#{leaderboard.findIndex((team) => team.id === me.id) + 1}</b></div></div></div><div className="leaderboard-card"><div className="side-heading"><span>LIVE LEADERBOARD</span><BarChart3 size={16} /></div>{leaderboard.map((team, index) => <div className={`leader-row ${team.id === me.id ? 'is-you' : ''}`} key={team.id}><b className="rank">{index + 1}</b><span className="team-dot" style={{ background: team.color }} /><span className="team-name">{team.name}{team.id === teamId && <small> YOU</small>}{team.isBot && <small> BOT</small>}</span><strong>{team.balance}</strong></div>)}</div><div className="arena-note"><Sparkles size={16} /><span><b>Remember:</b> the pool only grows when someone takes the first step.</span></div></aside></div><Toast message={toast} /></main>;
}

function ContributionCard({ balance, value, setValue, percent, onLock, locked, busy }: { balance: number; value: number; setValue: (value: number) => void; percent: number; onLock: () => void; locked: boolean; busy: boolean }) {
  return <div className="contribution-card"><div className="contribution-copy"><span className="section-label">YOUR SECRET DECISION</span><h2>How much will you put<br />into the pool?</h2><p>Once locked, your choice cannot be changed. The room only sees your decision after the admin closes the round.</p></div><div className="contribution-control"><div className="number-input"><input type="number" min="0" max={balance} value={value} onChange={(event) => setValue(Math.max(0, Math.min(balance, Number(event.target.value) || 0)))} /><span>TOKENS</span></div><input className="contribution-slider" type="range" min="0" max={balance} value={value} onChange={(event) => setValue(Number(event.target.value))} /><div className="quick-picks"><button onClick={() => setValue(0)}>0</button><button onClick={() => setValue(Math.floor(balance * .25))}>25%</button><button onClick={() => setValue(Math.floor(balance * .5))}>50%</button><button onClick={() => setValue(balance)}>ALL IN</button></div><div className="contribution-hint"><span>{percent}% of your wallet</span><span>MAX {balance}</span></div><button className="button button-primary lock-button" onClick={onLock} disabled={locked || busy}>{locked ? <><Check size={18} /> Decision locked</> : <><LockKeyhole size={18} /> Lock {value} tokens</>}</button></div></div>;
}

function JoinGate({ teamName, setTeamName, roomCode, setRoomCode, error, busy, onJoin, onBack }: { teamName: string; setTeamName: (value: string) => void; roomCode: string; setRoomCode: (value: string) => void; error: string; busy: boolean; onJoin: () => void; onBack: () => void }) {
  const valid = teamName.trim().length >= 2 && roomCode.trim().length >= 4;
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (valid) onJoin(); };
  return <main className="app-shell registration-shell"><PixelBackground /><nav className="topbar"><button className="back-button" onClick={onBack}><ChevronLeft size={18} /> Switch role</button><div className="setup-step">PLAYER ENTRANCE</div></nav><section className="registration-wrap"><div className="registration-card"><div className="registration-icon"><Users size={30} /></div><div className="eyebrow">WELCOME TO THE ARENA</div><h1>Join<br /><em>the room.</em></h1><p>Enter the room code from your admin, pick a team name, and wait in the lobby. The admin starts every round.</p><form onSubmit={submit}><label htmlFor="team-name">TEAM NAME</label><input id="team-name" autoFocus value={teamName} onChange={(event) => setTeamName(event.target.value.slice(0, 24))} placeholder="Enter your team name" maxLength={24} /><label htmlFor="room-code">ROOM CODE</label><input id="room-code" className="room-code-input" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().slice(0, 6))} placeholder="Example: A1B2C3" maxLength={6} /><div className="registration-meta"><span>{teamName.length}/24 characters</span><span><Coins size={14} /> Tokens come from the admin's room</span></div><button className="button button-primary registration-button" type="submit" disabled={!valid || busy}><Play size={18} fill="currentColor" /> Join and wait <ArrowRight size={18} /></button></form>{error && <div className="form-error">{error}</div>}</div></section></main>;
}
