import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, Award, BarChart3, Check, ChevronLeft, Clock3, Coins, Crown,
  Gamepad2, Gauge, LockKeyhole, Medal, Play, RotateCcw, Sparkles, Trophy,
  Users, Waves, Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Screen = 'landing' | 'register' | 'game' | 'results';
type Phase = 'ready' | 'open' | 'revealing' | 'results';
type Team = { id: number; name: string; balance: number; contributed: number; rewards: number; history: RoundResult[]; color: string };
type RoundResult = { round: number; previous: number; contribution: number; reward: number; balance: number };
type Session = { id?: string; roomCode: string; initialTokens: number; rounds: number; multiplier: number; teams: Team[]; currentRound: number; phase: Phase; timeLeft: number; locked: number[]; currentContributions: Record<number, number>; roundResults: RoundResult[]; createdAt: string };

const colors = ['#ffd400', '#ff5a36', '#24d4d8', '#ff9d28', '#f52f58', '#78e45b', '#a98cff', '#e978ff'];
const seedNames = ['Pixel Pioneers', 'Data Dragons', 'Neon Nomads', 'Code Crushers', 'Byte Bandits'];
const defaultTeams = (count: number, tokens: number): Team[] => Array.from({ length: count }, (_, index) => ({
  id: index, name: seedNames[index] ?? `Team ${String.fromCharCode(65 + index)}`, balance: tokens, contributed: 0, rewards: 0, history: [], color: colors[index % colors.length],
}));

function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [session, setSession] = useState<Session | null>(null);
  const [playerTeamId, setPlayerTeamId] = useState(0);
  const [teamName, setTeamName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [setupTeams, setSetupTeams] = useState(seedNames);
  const [setupTokens, setSetupTokens] = useState(100);
  const [setupRounds, setSetupRounds] = useState(5);
  const [setupMultiplier, setSetupMultiplier] = useState(2);
  const [playerContribution, setPlayerContribution] = useState(0);
  const [toast, setToast] = useState('');
  const timerRef = useRef<number | undefined>(undefined);
  const revealRef = useRef<number | undefined>(undefined);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }, []);

  const persist = useCallback(async (next: Session) => {
    localStorage.setItem('pool-party-session', JSON.stringify(next));
    if (!supabase) return;
    const payload = { status: next.phase, join_code: next.roomCode, state: next, updated_at: new Date().toISOString() };
    if (next.id) await supabase.from('pool_party_sessions').update(payload).eq('id', next.id);
    else {
      const { data } = await supabase.from('pool_party_sessions').insert(payload).select('id').maybeSingle();
      if (data?.id) setSession((current) => current ? { ...current, id: data.id } : current);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('pool-party-session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Session;
        if (parsed.phase === 'results' || parsed.phase === 'ready') setSession(parsed);
      } catch { localStorage.removeItem('pool-party-session'); }
    }
  }, []);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (revealRef.current) window.clearTimeout(revealRef.current);
  }, []);

  useEffect(() => {
    if (!supabase || !session?.id) return;
    const client = supabase;
    const channel = client.channel(`pool-party-room-${session.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pool_party_sessions', filter: `id=eq.${session.id}` }, (payload) => {
      const remote = payload.new as { state?: Session };
      if (remote.state) setSession(remote.state);
    }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [session?.id]);

  const startGame = (chosenName = teamName) => {
    const playerName = chosenName.trim();
    if (playerName.length < 2) return;
    const tokens = 100;
    const rounds = 5;
    const multiplier = 2;
    const room = Math.random().toString(36).slice(2, 8).toUpperCase();
    const firstTeam = { ...defaultTeams(1, tokens)[0], name: playerName };
    const next: Session = { roomCode: room, initialTokens: tokens, rounds, multiplier, teams: [firstTeam], currentRound: 1, phase: 'ready', timeLeft: 45, locked: [], currentContributions: {}, roundResults: [], createdAt: new Date().toISOString() };
    setPlayerTeamId(firstTeam.id); setSession(next); setScreen('game'); setPlayerContribution(0); startRound(next);
  };

  const joinGame = async () => {
    const cleanCode = roomCode.trim().toUpperCase();
    const playerName = teamName.trim();
    if (!supabase || playerName.length < 2 || cleanCode.length < 4) return;
    const { data } = await supabase.from('pool_party_sessions').select('id, state').eq('join_code', cleanCode).maybeSingle();
    if (!data?.state) return;
    const remote = data.state as Session;
    if (remote.phase === 'results') return;
    const nextId = remote.teams.reduce((highest, team) => Math.max(highest, team.id), -1) + 1;
    const joinedTeam = { ...defaultTeams(1, remote.initialTokens)[0], id: nextId, name: playerName };
    const next = { ...remote, id: data.id, teams: [...remote.teams, joinedTeam] };
    setPlayerTeamId(nextId); setSession(next); setScreen('game'); setPlayerContribution(0); await persist(next); 
  };

  const resumeGame = () => {
    if (!session) return;
    setScreen('game');
    if (session.phase === 'ready') startRound(session);
  };

  const startRound = (base = session) => {
    if (!base) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    const next = { ...base, phase: 'open' as Phase, timeLeft: 45, locked: [], currentContributions: {} };
    setSession(next); setPlayerContribution(0); persist(next);
    timerRef.current = window.setInterval(() => setSession((current) => {
      if (!current || current.phase !== 'open') return current;
      if (current.timeLeft <= 1) { window.clearInterval(timerRef.current); closeRound(current); return { ...current, timeLeft: 0 }; }
      const next = { ...current, timeLeft: current.timeLeft - 1 };
      persist(next);
      return next;
    }), 1000);
  };

  const closeRound = (base: Session) => {
    if (base.phase !== 'open') return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    const contributions: Record<number, number> = { ...base.currentContributions };
    base.teams.forEach((team) => {
      if (contributions[team.id] === undefined) contributions[team.id] = 0;
    });
    const revealing = { ...base, phase: 'revealing' as Phase, currentContributions: contributions, locked: base.teams.map((team) => team.id) };
    setSession(revealing);
    revealRef.current = window.setTimeout(() => settleRound(revealing), 2200);
  };

  const lockContribution = () => {
    if (!session || session.phase !== 'open') return;
    const player = session.teams.find((team) => team.id === playerTeamId) ?? session.teams[0];
    const amount = Math.max(0, Math.min(Math.floor(playerContribution), player.balance));
    const next = { ...session, currentContributions: { ...session.currentContributions, [player.id]: amount }, locked: Array.from(new Set([...session.locked, player.id])) };
    setSession(next); showToast(`Locked ${amount} tokens. Waiting for the room...`);
    if (next.locked.length >= next.teams.length) closeRound(next); else persist(next);
  };

  const settleRound = (base: Session) => {
    const totalPool = Object.values(base.currentContributions).reduce((sum, value) => sum + value, 0);
    const totalReward = Math.floor(totalPool * base.multiplier);
    const share = Math.floor(totalReward / base.teams.length);
    const remainder = totalReward % base.teams.length;
    const results = base.teams.map((team, index) => {
      const contribution = base.currentContributions[team.id] ?? 0;
      const reward = share + (index < remainder ? 1 : 0);
      const balance = team.balance - contribution + reward;
      return { round: base.currentRound, previous: team.balance, contribution, reward, balance };
    });
    const teams = base.teams.map((team, index) => ({ ...team, balance: results[index].balance, contributed: team.contributed + results[index].contribution, rewards: team.rewards + results[index].reward, history: [...team.history, results[index]] }));
    const next = { ...base, teams, phase: 'results' as Phase, roundResults: results, currentContributions: { ...base.currentContributions } };
    setSession(next); persist(next);
  };

  const nextRound = () => {
    if (!session) return;
    if (session.currentRound >= session.rounds) { setScreen('results'); return; }
    startRound({ ...session, currentRound: session.currentRound + 1 });
  };

  const reset = () => { if (timerRef.current) window.clearInterval(timerRef.current); if (revealRef.current) window.clearTimeout(revealRef.current); setSession(null); setScreen('landing'); localStorage.removeItem('pool-party-session'); };

  if (screen === 'landing') return <Landing onStart={() => setScreen('register')} onResume={session ? resumeGame : undefined} />;
  if (screen === 'register') return <TeamRegistration teamName={teamName} setTeamName={setTeamName} roomCode={roomCode} setRoomCode={setRoomCode} onBack={() => setScreen('landing')} onCreate={startGame} onJoin={joinGame} />;
  if (screen === 'results' && session) return <FinalResults session={session} onReset={reset} />;
  if (session) return <GameRoom session={session} playerTeamId={playerTeamId} playerContribution={playerContribution} setPlayerContribution={setPlayerContribution} onLock={lockContribution} onNext={nextRound} onEnd={() => setScreen('results')} onReset={reset} toast={toast} />;
  return null;
}

function Brand() { return <div className="brand"><div className="brand-mark"><Gamepad2 size={22} /></div><span>POOL</span><b>PARTY</b><i>×2</i></div>; }
function PixelBackground() { return <div className="pixel-background" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /></div>; }
function Landing({ onStart, onResume }: { onStart: () => void; onResume?: () => void }) {
  return <main className="app-shell"><PixelBackground /><nav className="topbar"><Brand /><div className="top-links"><a href="#rules">How to play</a><a href="#formula">The dilemma</a>{onResume && <button className="link-button" onClick={onResume}>Resume game</button>}</div></nav><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="live-dot" /> LIVE COOPERATION LAB · DSATM 2026</div><h1>BUILD THE<br /><em>POOL.</em><br />SHARE THE <strong>WIN.</strong></h1><p className="hero-lede">A high-stakes public goods experiment where every token you give grows the pool for everyone.</p><div className="hero-actions"><button className="button button-primary" onClick={onStart}><Play size={18} fill="currentColor" /> Start a game <ArrowRight size={18} /></button><a className="button button-ghost" href="#rules">Read the rules <ChevronLeft size={16} className="rotate-90" /></a></div><div className="hero-stats"><Stat icon={<Users />} label="TEAMS" value="2—40" /><Stat icon={<Coins />} label="START TOKENS" value="100" /><Stat icon={<Zap />} label="DEFAULT BOOST" value="×2" /></div></div><div className="hero-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="pool-machine"><div className="machine-top"><span>POOL</span><strong>×2</strong></div><div className="machine-screen"><div className="pixel-alien">✦</div><div className="screen-scan" /></div><div className="machine-controls"><i /><i /><i /><i /><i /></div><div className="machine-base"><span>SHARE</span><b>WIN</b></div></div><div className="floating-token token-a">+1</div><div className="floating-token token-b">+2</div><div className="floating-token token-c">+1</div><div className="art-caption"><Waves size={16} /> THE HOUSE ALWAYS MULTIPLIES</div></div></section><section className="rules-section" id="rules"><div className="section-label">01 / THE MISSION</div><div className="rules-grid"><div><h2>One pool.<br /><span>Many choices.</span></h2><p>Everyone gets tokens. Everyone secretly chooses how many to contribute. We multiply the shared pool, then split it evenly. The richest team wins—but the room only thrives when you cooperate.</p></div><div className="rule-cards"><RuleCard number="01" icon={<LockKeyhole />} title="Contribute in secret" text="Your decision stays private until the reveal." /><RuleCard number="02" icon={<Gauge />} title="The pool multiplies" text="Every token creates more value for the room." /><RuleCard number="03" icon={<Trophy />} title="Beat the leaderboard" text="Finish with the biggest balance to win." /></div></div></section><section className="formula-section" id="formula"><div className="formula-card"><div><div className="section-label">02 / THE DILEMMA</div><h2>Giving feels costly.<br /><span>Winning feels better together.</span></h2></div><div className="formula">YOUR TOKENS <b>→</b> SHARED POOL <b>×2</b> <b>→</b> EVERY TEAM</div></div></section><footer><Brand /><span>IMAGINE. BUILD. PLAY. COMPETE.</span><span>DAYANANDA SAGAR ACADEMY OF TECHNOLOGY & MANAGEMENT</span></footer></main>;
}
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="hero-stat"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>; }
function TeamRegistration({ teamName, setTeamName, roomCode, setRoomCode, onBack, onCreate, onJoin }: { teamName: string; setTeamName: (value: string) => void; roomCode: string; setRoomCode: (value: string) => void; onBack: () => void; onCreate: () => void; onJoin: () => void }) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const valid = teamName.trim().length >= 2 && (mode === 'create' || roomCode.trim().length >= 4);
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!valid) return; if (mode === 'create') onCreate(); else onJoin(); };
  return <main className="app-shell registration-shell"><PixelBackground /><nav className="topbar"><button className="back-button" onClick={onBack}><ChevronLeft size={18} /> Back</button><Brand /><div className="setup-step">PLAYER REGISTRATION / 01</div></nav><section className="registration-wrap"><div className="registration-card"><div className="registration-icon"><Users size={30} /></div><div className="eyebrow">WELCOME TO THE ARENA</div><div className="mode-switch"><button className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')} type="button">Create room</button><button className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')} type="button">Join room</button></div><h1>{mode === 'create' ? <>Create<br /><em>your room.</em></> : <>Join<br /><em>the room.</em></>}</h1><p>{mode === 'create' ? 'Register your team and share the room code with the other players.' : 'Enter the room code shared by the player who created the game.'}</p><form onSubmit={submit}><label htmlFor="team-name">TEAM NAME</label><input id="team-name" autoFocus value={teamName} onChange={(event) => setTeamName(event.target.value.slice(0, 24))} placeholder="Enter your team name" maxLength={24} />{mode === 'join' && <><label htmlFor="room-code">ROOM CODE</label><input id="room-code" className="room-code-input" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().slice(0, 6))} placeholder="Example: A1B2C3" maxLength={6} /></>}<div className="registration-meta"><span>{teamName.length}/24 characters</span><span><Coins size={14} /> 100 starting tokens</span></div><button className="button button-primary registration-button" type="submit" disabled={!valid}><Play size={18} fill="currentColor" /> {mode === 'create' ? 'Create and play' : 'Join and play'} <ArrowRight size={18} /></button></form></div><div className="registration-aside"><span className="section-label">MULTIPLAYER FLOW</span><div><b>01</b><span>Register each team on their own device</span></div><div><b>02</b><span>Use the same room code</span></div><div><b>03</b><span>Submit before the shared timer ends</span></div></div></section></main>;
}
function RuleCard({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) { return <div className="rule-card"><div className="rule-icon">{icon}</div><div><small>{number}</small><h3>{title}</h3><p>{text}</p></div></div>; }

function Setup({ teams, setTeams, tokens, setTokens, rounds, setRounds, multiplier, setMultiplier, onBack, onStart }: { teams: string[]; setTeams: (value: string[]) => void; tokens: number; setTokens: (value: number) => void; rounds: number; setRounds: (value: number) => void; multiplier: number; setMultiplier: (value: number) => void; onBack: () => void; onStart: () => void }) {
  const addTeam = () => teams.length < 8 && setTeams([...teams, `Team ${String.fromCharCode(65 + teams.length)}`]);
  const removeTeam = () => teams.length > 2 && setTeams(teams.slice(0, -1));
  const mpcr = multiplier / teams.length;
  return <main className="app-shell setup-shell"><PixelBackground /><nav className="topbar"><button className="back-button" onClick={onBack}><ChevronLeft size={18} /> Back</button><Brand /><div className="setup-step">SETUP / 01</div></nav><section className="setup-wrap"><div className="setup-intro"><div className="eyebrow">CONFIGURE YOUR ARENA</div><h1>Set the rules.<br /><em>Start the experiment.</em></h1><p>Shape the room before the first token drops. Your choices are frozen once the game begins.</p></div><div className="setup-layout"><div className="setup-panel"><div className="panel-heading"><div><span className="section-label">01 / PLAYERS</span><h2>Build your teams</h2></div><div className="stepper"><button onClick={removeTeam}>−</button><strong>{teams.length}</strong><button onClick={addTeam}>+</button></div></div><div className="team-inputs">{teams.map((team, index) => <label key={index}><span style={{ background: colors[index % colors.length] }}>{String(index + 1).padStart(2, '0')}</span><input value={team} onChange={(event) => setTeams(teams.map((current, i) => i === index ? event.target.value : current))} maxLength={24} /></label>)}</div></div><div className="setup-panel"><span className="section-label">02 / ECONOMY</span><h2>Set the stakes</h2><div className="range-setting"><div><label>Starting tokens <b>{tokens}</b></label><input type="range" min="50" max="500" step="10" value={tokens} onChange={(event) => setTokens(Number(event.target.value))} /></div><small>Equal allocation for every team.</small></div><div className="range-setting"><div><label>Number of rounds <b>{rounds}</b></label><input type="range" min="3" max="10" value={rounds} onChange={(event) => setRounds(Number(event.target.value))} /></div><small>More rounds means more room to recover.</small></div><div className="range-setting"><div><label>Pool multiplier <b>×{multiplier.toFixed(2)}</b></label><input type="range" min="1.25" max="3" step="0.25" value={multiplier} onChange={(event) => setMultiplier(Number(event.target.value))} /></div><small>Each token in the pool creates {multiplier.toFixed(2)} tokens.</small></div></div><div className="setup-panel theory-panel"><div className="theory-top"><span className="section-label">03 / GAME THEORY CHECK</span><span className="status-badge"><span /> {mpcr < 1 ? 'REAL DILEMMA' : 'COOPERATIVE MODE'}</span></div><div className="mpcr"><strong>MPCR</strong><b>{mpcr.toFixed(2)}</b><span>Marginal per-capita return</span></div><p>{mpcr < 1 ? 'Contributing costs you personally—but it creates more value for the entire room. Trust is the winning strategy.' : 'Every contribution returns at least one token. Cooperation is the obvious move in this setup.'}</p></div><div className="setup-summary"><div><small>SESSION PREVIEW</small><strong>{teams.length} teams · {rounds} rounds · ×{multiplier.toFixed(2)}</strong><span>{tokens} tokens each · Equal split rewards</span></div><button className="button button-primary" onClick={onStart}>Launch arena <ArrowRight size={18} /></button></div></div></section></main>;
}

function GameRoom({ session, playerTeamId, playerContribution, setPlayerContribution, onLock, onNext, onEnd, onReset, toast }: { session: Session; playerTeamId: number; playerContribution: number; setPlayerContribution: (value: number) => void; onLock: () => void; onNext: () => void; onEnd: () => void; onReset: () => void; toast: string }) {
  const player = session.teams.find((team) => team.id === playerTeamId) ?? session.teams[0];
  const totalPool = Object.values(session.currentContributions).reduce((sum, value) => sum + value, 0);
  const roundReward = Math.floor(totalPool * session.multiplier);
  const percent = player.balance ? Math.round((playerContribution / player.balance) * 100) : 0;
  const leaderboard = [...session.teams].sort((a, b) => b.balance - a.balance);
  return <main className="app-shell game-shell"><PixelBackground /><header className="game-header"><Brand /><div className="player-badge">YOU ARE <b>{player.name}</b><span> · ROOM {session.roomCode}</span></div><div className="game-status"><span className={session.phase === 'open' ? 'live-dot' : 'status-dot'} /> {session.phase === 'open' ? 'ROUND LIVE' : session.phase === 'revealing' ? 'REVEAL IN PROGRESS' : 'ROUND COMPLETE'} <b>{session.currentRound} / {session.rounds}</b></div><button className="icon-button" onClick={onReset} title="Reset session"><RotateCcw size={17} /></button></header><div className="game-content"><div className="game-main"><div className="round-title"><div><span className="section-label">ROUND {String(session.currentRound).padStart(2, '0')} / {String(session.rounds).padStart(2, '0')}</span><h1>{session.phase === 'open' ? 'Make your move.' : session.phase === 'revealing' ? 'The pool is opening.' : 'The room has decided.'}</h1></div><div className={`timer ${session.timeLeft < 10 && session.phase === 'open' ? 'urgent' : ''}`}><Clock3 size={18} /><strong>{session.phase === 'open' ? `00:${String(session.timeLeft).padStart(2, '0')}` : session.phase === 'revealing' ? '•••' : 'DONE'}</strong></div></div>{session.phase === 'open' && <ContributionCard balance={player.balance} value={playerContribution} setValue={setPlayerContribution} percent={percent} onLock={onLock} locked={session.locked.includes(playerTeamId)} />}{session.phase === 'revealing' && <RevealCard pool={totalPool} reward={roundReward} multiplier={session.multiplier} />}{session.phase === 'results' && <ResultsCard session={session} onNext={onNext} onEnd={onEnd} />}{session.phase === 'open' && <div className="waiting-bar"><span><span className="live-dot" /> {session.locked.length} / {session.teams.length} decisions locked</span><span>Amounts stay hidden until reveal</span></div>}</div><aside className="game-sidebar"><div className="wallet-card"><div className="wallet-head"><span>YOUR WALLET</span><Coins size={18} /></div><div className="wallet-balance"><strong>{player.balance}</strong><span>tokens</span></div><div className="wallet-stats"><div><small>CONTRIBUTED</small><b>{player.contributed}</b></div><div><small>REWARDS</small><b className="gain">+{player.rewards}</b></div><div><small>RANK</small><b>#{leaderboard.findIndex((team) => team.id === player.id) + 1}</b></div></div></div><div className="leaderboard-card"><div className="side-heading"><span>LIVE LEADERBOARD</span><BarChart3 size={16} /></div>{leaderboard.map((team, index) => <div className={`leader-row ${team.id === player.id ? 'is-you' : ''}`} key={team.id}><b className="rank">{index + 1}</b><span className="team-dot" style={{ background: team.color }} /><span className="team-name">{team.name}{team.id === playerTeamId && <small> YOU</small>}</span><strong>{team.balance}</strong></div>)}</div><div className="arena-note"><Sparkles size={16} /><span><b>Remember:</b> the pool only grows when someone takes the first step.</span></div></aside></div>{toast && <div className="toast"><Check size={16} /> {toast}</div>}</main>;
}
function ContributionCard({ balance, value, setValue, percent, onLock, locked }: { balance: number; value: number; setValue: (value: number) => void; percent: number; onLock: () => void; locked: boolean }) { return <div className="contribution-card"><div className="contribution-copy"><span className="section-label">YOUR SECRET DECISION</span><h2>How much will you put<br />into the pool?</h2><p>Once locked, your choice cannot be changed. The room only sees your decision after everyone is ready.</p></div><div className="contribution-control"><div className="number-input"><input type="number" min="0" max={balance} value={value} onChange={(event) => setValue(Math.max(0, Math.min(balance, Number(event.target.value) || 0)))} /><span>TOKENS</span></div><input className="contribution-slider" type="range" min="0" max={balance} value={value} onChange={(event) => setValue(Number(event.target.value))} /><div className="quick-picks"><button onClick={() => setValue(0)}>0</button><button onClick={() => setValue(Math.floor(balance * .25))}>25%</button><button onClick={() => setValue(Math.floor(balance * .5))}>50%</button><button onClick={() => setValue(balance)}>ALL IN</button></div><div className="contribution-hint"><span>{percent}% of your wallet</span><span>MAX {balance}</span></div><button className="button button-primary lock-button" onClick={onLock} disabled={locked}>{locked ? <><Check size={18} /> Decision locked</> : <><LockKeyhole size={18} /> Lock {value} tokens</>}</button></div></div>; }
function RevealCard({ pool, reward, multiplier }: { pool: number; reward: number; multiplier: number }) { return <div className="reveal-card"><div className="reveal-ring"><Waves size={40} /><strong>{pool}</strong><span>TOTAL POOL</span></div><div className="reveal-arrow">×{multiplier}</div><div className="reveal-result"><Sparkles size={22} /><strong>{reward}</strong><span>ROOM REWARD</span></div><div className="reveal-message">The room just created <b>{reward - pool} new tokens</b>. See where they land.</div></div>; }
function ResultsCard({ session, onNext, onEnd }: { session: Session; onNext: () => void; onEnd: () => void }) { const results = session.roundResults; const pool = results.reduce((sum, result) => sum + result.contribution, 0); const reward = results.reduce((sum, result) => sum + result.reward, 0); return <div className="results-card"><div className="results-heading"><div><span className="section-label">ROUND {session.currentRound} REVEALED</span><h2>Here is what happened.</h2></div><div className="result-total"><span>POOL</span><b>{pool}</b><i>→ {reward} rewarded</i></div></div><div className="results-table"><div className="table-head"><span>TEAM</span><span>BEFORE</span><span>GAVE</span><span>REWARD</span><span>NOW</span></div>{session.teams.map((team, index) => { const result = results[index]; return <div className="table-row" key={team.id}><span><i className="team-dot" style={{ background: team.color }} />{team.name}</span><b>{result.previous}</b><b className="loss">−{result.contribution}</b><b className="gain">+{result.reward}</b><strong>{result.balance}</strong></div>; })}</div><div className="results-actions">{session.currentRound < session.rounds ? <button className="button button-primary" onClick={onNext}>Start round {session.currentRound + 1} <ArrowRight size={18} /></button> : <button className="button button-primary" onClick={onEnd}><Trophy size={18} /> See final results</button>}<span><Sparkles size={15} /> Equal split · rotating remainder</span></div></div>; }

function FinalResults({ session, onReset }: { session: Session; onReset: () => void }) { const ranked = [...session.teams].sort((a, b) => b.balance - a.balance); const totalContributed = session.teams.reduce((sum, team) => sum + team.contributed, 0); const totalRewards = session.teams.reduce((sum, team) => sum + team.rewards, 0); return <main className="app-shell final-shell"><PixelBackground /><nav className="topbar"><Brand /><div className="setup-step">FINAL SCOREBOARD / 05</div></nav><section className="final-wrap"><div className="final-hero"><div className="eyebrow"><span className="live-dot" /> SESSION COMPLETE · {session.rounds} ROUNDS PLAYED</div><h1>THE ROOM<br /><em>CREATED VALUE.</em></h1><p>{totalContributed} tokens entered the pool and became {totalRewards} tokens of shared reward.</p></div><div className="podium">{ranked.slice(0, 3).map((team, index) => <div className={`podium-player place-${index + 1}`} key={team.id}><div className="medal">{index === 0 ? <Crown /> : index === 1 ? <Medal /> : <Award />}</div><span className="team-dot" style={{ background: team.color }} /><b>{team.name}</b><strong>{team.balance}</strong><small>{index === 0 ? 'WINNER' : `#${index + 1}`}</small></div>)}</div><div className="final-grid"><div className="final-table"><div className="side-heading"><span>FINAL STANDINGS</span><Trophy size={17} /></div>{ranked.map((team, index) => <div className="final-row" key={team.id}><strong>#{index + 1}</strong><span className="team-dot" style={{ background: team.color }} /><span>{team.name}</span><small>+{team.rewards - team.contributed} net</small><b>{team.balance}</b></div>)}</div><div className="final-stats"><div><small>GROUP COOPERATION</small><strong>{Math.round((totalContributed / (session.initialTokens * session.teams.length * session.rounds)) * 100)}%</strong><span>of possible tokens entered</span></div><div><small>TOTAL MULTIPLIED</small><strong>+{totalRewards - totalContributed}</strong><span>new tokens created</span></div><button className="button button-primary" onClick={onReset}><RotateCcw size={17} /> Play another session</button></div></div></section></main>; }

export default App;
