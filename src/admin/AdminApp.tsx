import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight, BarChart3, Bot, Check, Flag, Gauge, Play, Plus, RotateCcw, ShieldCheck,
  Sparkles, Users, X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PixelBackground, RevealCard, RoundResultsCard, Toast, useToast } from '@/components/shared';
import {
  ADMIN_KEY, botChoice, createRoom, findRoom, loadSaved, makeBot, makeRoomCode, MAX_TEAMS,
  newSession, nextTeamId, REVEAL_MILLIS, ROUND_SECONDS, saveRoom, Session, settleRound,
  storeLocal, subscribeToRoom,
} from '@/lib/game';

export default function AdminApp({ onExit }: { onExit: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [gateError, setGateError] = useState('');
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const revealRef = useRef<number | undefined>(undefined);
  const botTimersRef = useRef<number[]>([]);
  const sessionRef = useRef<Session | null>(null);
  const { message, showToast } = useToast();

  const clearTimers = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (revealRef.current) window.clearTimeout(revealRef.current);
    botTimersRef.current.forEach((id) => window.clearTimeout(id));
    botTimersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const update = useCallback((next: Session, save = true) => {
    sessionRef.current = next;
    setSession(next);
    if (next.id) storeLocal(ADMIN_KEY, next);
    if (save && next.id) void saveRoom(next);
  }, []);

  const closeRound = useCallback((base: Session) => {
    if (base.phase !== 'open') return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    botTimersRef.current.forEach((id) => window.clearTimeout(id));
    botTimersRef.current = [];
    const contributions = { ...base.currentContributions };
    base.teams.forEach((team) => { if (contributions[team.id] === undefined) contributions[team.id] = 0; });
    const revealing: Session = { ...base, phase: 'revealing', currentContributions: contributions, locked: base.teams.map((team) => team.id) };
    update(revealing);
    revealRef.current = window.setTimeout(() => {
      const { teams, results } = settleRound(revealing);
      update({ ...revealing, teams, roundResults: results, phase: 'results' });
    }, REVEAL_MILLIS);
  }, [update]);

  const startRound = useCallback((base: Session, round: number) => {
    clearTimers();
    const next: Session = { ...base, phase: 'open', currentRound: round, timeLeft: ROUND_SECONDS, locked: [], currentContributions: {}, roundResults: [] };
    update(next);
    timerRef.current = window.setInterval(() => {
      const current = sessionRef.current;
      if (!current || current.phase !== 'open') { window.clearInterval(timerRef.current); return; }
      if (current.timeLeft <= 1) {
        window.clearInterval(timerRef.current);
        closeRound({ ...current, timeLeft: 0 });
        return;
      }
      const ticked = { ...current, timeLeft: current.timeLeft - 1 };
      sessionRef.current = ticked;
      setSession(ticked);
      if (ticked.id && ticked.timeLeft % 5 === 0) void saveRoom(ticked);
    }, 1000);
    base.teams.filter((team) => team.isBot).forEach((bot) => {
      const delay = 4000 + Math.random() * (ROUND_SECONDS * 1000 - 14000);
      const id = window.setTimeout(() => {
        const current = sessionRef.current;
        if (!current || current.phase !== 'open' || current.currentContributions[bot.id] !== undefined) return;
        const balance = current.teams.find((team) => team.id === bot.id)?.balance ?? 0;
        const botNext: Session = {
          ...current,
          currentContributions: { ...current.currentContributions, [bot.id]: botChoice(balance) },
          locked: Array.from(new Set([...current.locked, bot.id])),
        };
        update(botNext);
        if (botNext.locked.length >= botNext.teams.length) closeRound(botNext);
      }, delay);
      botTimersRef.current.push(id);
    });
  }, [clearTimers, closeRound, update]);

  useEffect(() => {
    const saved = loadSaved<Session>(ADMIN_KEY);
    if (saved && ['lobby', 'open', 'revealing', 'results'].includes(saved.phase)) {
      sessionRef.current = saved;
      setSession(saved);
      if (saved.phase === 'open' && !saved.ended) startRound(saved, saved.currentRound);
    }
  }, [startRound]);

  useEffect(() => {
    if (!session?.id) return;
    return subscribeToRoom(session.id, (remote) => {
      const current = sessionRef.current;
      if (!current) return;
      // The countdown is admin-owned: during a live round, only take remote
      // contributions, not the remote clock.
      if (remote.phase === 'open' && current.phase === 'open') {
        const merged = { ...remote, timeLeft: current.timeLeft };
        sessionRef.current = merged;
        setSession(merged);
        return;
      }
      sessionRef.current = remote;
      setSession(remote);
    });
  }, [session?.id]);

  const handleCreate = async () => {
    setBusy(true); setGateError('');
    const created = await createRoom(newSession(makeRoomCode()));
    setBusy(false);
    if (!created) { setGateError('Could not reach the game server. Check your connection and try again.'); return; }
    storeLocal(ADMIN_KEY, created);
    sessionRef.current = created;
    setSession(created);
    showToast(`Room ${created.roomCode} is open`);
  };

  const handleResume = () => {
    const saved = loadSaved<Session>(ADMIN_KEY);
    if (!saved) return;
    sessionRef.current = saved;
    setSession(saved);
    if (saved.phase === 'open' && !saved.ended) startRound(saved, saved.currentRound);
  };

  const handleRejoin = async () => {
    setBusy(true); setGateError('');
    const found = await findRoom(roomCode.trim().toUpperCase());
    setBusy(false);
    if (!found) { setGateError('No room found with that code.'); return; }
    const rejoined = { ...found.state, id: found.id };
    storeLocal(ADMIN_KEY, rejoined);
    sessionRef.current = rejoined;
    setSession(rejoined);
    if (rejoined.phase === 'open' && !rejoined.ended) startRound(rejoined, rejoined.currentRound);
  };

  const addBot = () => {
    if (!session || session.phase !== 'lobby' || session.teams.length >= MAX_TEAMS) return;
    const bot = makeBot(nextTeamId(session), session.initialTokens);
    update({ ...session, teams: [...session.teams, bot] });
    showToast(`${bot.name} joined the room`);
  };

  const removeBot = (teamId: number) => {
    if (!session || session.phase !== 'lobby') return;
    update({ ...session, teams: session.teams.filter((team) => !(team.id === teamId && team.isBot)) });
  };

  const startGame = () => { if (session?.phase === 'lobby') startRound(session, 1); };
  const nextRound = () => { if (session?.phase === 'results' && session.currentRound < session.rounds) startRound(session, session.currentRound + 1); };
  const endGame = () => {
    if (!session || session.ended) return;
    clearTimers();
    update({ ...session, ended: true });
    showToast('Session ended for everyone');
  };

  const quit = () => { clearTimers(); localStorage.removeItem(ADMIN_KEY); setSession(null); sessionRef.current = null; onExit(); };

  if (!session) {
    return <AdminGate roomCode={roomCode} setRoomCode={setRoomCode} error={gateError} busy={busy} hasSaved={!!loadSaved<Session>(ADMIN_KEY)} onCreate={handleCreate} onResume={handleResume} onRejoin={handleRejoin} onBack={onExit} />;
  }
  if (session.ended) {
    return <AdminFinal session={session} onExit={quit} />;
  }
  return <AdminConsole session={session} onCloseRound={closeRound} onAddBot={addBot} onRemoveBot={removeBot} onStart={startGame} onNext={nextRound} onEnd={endGame} onQuit={quit} toast={message} />;
}

function AdminFinal({ session, onExit }: { session: Session; onExit: () => void }) {
  const ranked = [...session.teams].sort((a, b) => b.balance - a.balance);
  const totalContributed = session.teams.reduce((sum, team) => sum + team.contributed, 0);
  const totalRewards = session.teams.reduce((sum, team) => sum + team.rewards, 0);
  const roundsPlayed = session.phase === 'results' ? session.currentRound : Math.max(0, session.currentRound - 1);
  return <main className="app-shell final-shell"><PixelBackground /><nav className="topbar"><div className="setup-step">ADMIN CONSOLE · ROOM {session.roomCode}</div><button className="button button-ghost" onClick={onExit}><RotateCcw size={16} /> Run another session</button></nav><section className="final-wrap"><div className="final-hero"><div className="eyebrow"><span className="live-dot" /> SESSION ENDED · {totalContributed} TOKENS IN · {totalRewards} OUT</div><h1>FINAL<br /><em>STANDINGS.</em></h1></div><div className="podium">{ranked.slice(0, 3).map((team, index) => <div className={`podium-player place-${index + 1}`} key={team.id}><span className="team-dot" style={{ background: team.color }} /><b>{team.name}{team.isBot && <small> BOT</small>}</b><strong>{team.balance}</strong><small>{index === 0 ? 'WINNER' : `#${index + 1}`}</small></div>)}</div><div className="final-grid"><div className="final-table"><div className="side-heading"><span>RESULTS</span><BarChart3 size={17} /></div>{ranked.map((team, index) => <div className="final-row" key={team.id}><strong>#{index + 1}</strong><span className="team-dot" style={{ background: team.color }} /><span>{team.name}{team.isBot && <small> BOT</small>}</span><small>+{team.rewards - team.contributed} net</small><b>{team.balance}</b></div>)}</div><div className="final-stats"><div><small>GROUP COOPERATION</small><strong>{session.teams.length && roundsPlayed ? Math.round((totalContributed / (session.initialTokens * session.teams.length * roundsPlayed)) * 100) : 0}%</strong><span>of possible tokens entered</span></div><div><small>TOTAL MULTIPLIED</small><strong>+{totalRewards - totalContributed}</strong><span>new tokens created</span></div><button className="button button-primary" onClick={onExit}><RotateCcw size={17} /> Back to admin gate</button></div></div></section></main>;
}

function AdminGate({ roomCode, setRoomCode, error, busy, hasSaved, onCreate, onResume, onRejoin, onBack }: { roomCode: string; setRoomCode: (value: string) => void; error: string; busy: boolean; hasSaved: boolean; onCreate: () => void; onResume: () => void; onRejoin: () => void; onBack: () => void }) {
  return <main className="app-shell registration-shell"><PixelBackground /><nav className="topbar"><button className="back-button" onClick={onBack}><ShieldCheck size={16} /> Switch role</button><div className="setup-step">ADMIN CONSOLE</div></nav><section className="registration-wrap"><div className="registration-card"><div className="registration-icon admin-icon"><ShieldCheck size={30} /></div><div className="eyebrow">GAME MASTER ACCESS</div><h1>Admin<br /><em>console.</em></h1><p>You control the room: add AI opponents, start every round, and end the session for all players. Players join separately from their own devices using the room code.</p><div className="admin-gate-actions"><button className="button button-primary" onClick={onCreate} disabled={busy}><Play size={18} fill="currentColor" /> Create a new room <ArrowRight size={18} /></button>{hasSaved && <button className="button button-ghost" onClick={onResume}>Resume last room</button>}</div><div className="admin-rejoin"><label htmlFor="admin-code">REJOIN AN EXISTING ROOM</label><div className="admin-rejoin-row"><input id="admin-code" className="room-code-input" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().slice(0, 6))} placeholder="ROOM CODE" maxLength={6} /><button className="button button-ghost" onClick={onRejoin} disabled={busy || roomCode.trim().length < 4}>Rejoin</button></div></div>{error && <div className="form-error">{error}</div>}</div></section></main>;
}

function TeamRow({ team, youId }: { team: { id: number; name: string; isBot?: boolean }; youId?: number }) {
  return <span className="team-name">{team.name}{youId === team.id && <small> YOU</small>}{team.isBot && <small> BOT</small>}</span>;
}

function AdminConsole({ session, onCloseRound, onAddBot, onRemoveBot, onStart, onNext, onEnd, onQuit, toast }: { session: Session; onCloseRound: (base: Session) => void; onAddBot: () => void; onRemoveBot: (teamId: number) => void; onStart: () => void; onNext: () => void; onEnd: () => void; onQuit: () => void; toast: string }) {
  const leaderboard = [...session.teams].sort((a, b) => b.balance - a.balance);
  const totalPool = Object.values(session.currentContributions).reduce((sum, value) => sum + value, 0);
  const waiting = session.teams.length - session.locked.length;
  if (session.phase === 'lobby') {
    return <main className="app-shell game-shell"><PixelBackground /><header className="game-header"><div className="player-badge">ADMIN CONSOLE<span> · ROOM {session.roomCode}</span></div><div className="game-status"><span className="live-dot" /> WAITING ROOM <b>LOBBY</b></div><button className="icon-button" onClick={onQuit} title="Leave console"><RotateCcw size={17} /></button></header><div className="game-content"><div className="game-main"><div className="lobby-card"><div className="lobby-copy"><span className="section-label">HOST CONTROL PANEL</span><h1>Waiting in<br /><em>the lobby.</em></h1><p>Players join from the player entrance with code <b className="lobby-code">{session.roomCode}</b>, or they can scan the QR code on the right. When everyone is in, start round 1. You keep control of every round and can end the session at any moment.</p><div className="host-actions"><button className="button button-primary" onClick={onStart}><Play size={18} fill="currentColor" /> Start round 1 <ArrowRight size={18} /></button><button className="button button-ghost" onClick={onEnd}><Flag size={18} /> End session</button></div></div><div className="lobby-roster"><div className="qr-block"><QRCodeSVG value={`${window.location.origin}${window.location.pathname}#/join/${session.roomCode}`} size={140} bgColor="#0a2a29" fgColor="#f7f4e8" level="M" className="qr-code" /><div className="qr-caption"><span>SCAN TO JOIN</span><b>{session.roomCode}</b></div></div><div className="side-heading"><span>IN THE ROOM · {session.teams.length}</span><Users size={16} /></div>{leaderboard.map((team) => <div className="leader-row" key={team.id}><span className="team-dot" style={{ background: team.color }} /><TeamRow team={team} />{team.isBot && <button className="bot-remove" onClick={() => onRemoveBot(team.id)} title="Remove bot"><X size={13} /></button>}{team.isBot && <Bot size={14} className="bot-icon" />}</div>)}{session.teams.length < MAX_TEAMS && <button className="add-bot-button" onClick={onAddBot}><Plus size={15} /> Add AI opponent</button>}<div className="host-hint"><Bot size={15} /><span>Filling the room with bots? Start whenever you are ready — real players can still join until round 1 begins.</span></div></div></div></div><aside className="game-sidebar"><div className="wallet-card"><div className="wallet-head"><span>ROOM SETTINGS</span><Gauge size={18} /></div><div className="wallet-balance"><strong>{session.rounds}</strong><span>rounds · ×{session.multiplier.toFixed(2)}</span></div><div className="wallet-stats"><div><small>TOKENS EACH</small><b>{session.initialTokens}</b></div><div><small>ROUND TIME</small><b>{ROUND_SECONDS}s</b></div><div><small>PLAYERS</small><b>{session.teams.length}</b></div></div></div><div className="arena-note"><Sparkles size={16} /><span><b>Tip:</b> keep this console on the projector while players use their phones.</span></div></aside></div><Toast message={toast} /></main>;
  }
  return <main className="app-shell game-shell"><PixelBackground /><header className="game-header"><div className="player-badge">ADMIN CONSOLE<span> · ROOM {session.roomCode}</span></div><div className="game-status"><span className={session.phase === 'open' ? 'live-dot' : 'status-dot'} /> {session.phase === 'open' ? 'ROUND LIVE' : session.phase === 'revealing' ? 'REVEAL IN PROGRESS' : 'ROUND COMPLETE'} <b>{session.currentRound} / {session.rounds}</b></div><div className="host-controls"><button className="end-button" onClick={onEnd} disabled={session.ended}><Flag size={14} /> END GAME</button><button className="icon-button" onClick={onQuit} title="Leave console"><RotateCcw size={17} /></button></div></header><div className="game-content"><div className="game-main"><div className="round-title"><div><span className="section-label">ROUND {String(session.currentRound).padStart(2, '0')} / {String(session.rounds).padStart(2, '0')}</span><h1>{session.phase === 'open' ? 'The room is deciding.' : session.phase === 'revealing' ? 'The pool is opening.' : 'The round is settled.'}</h1></div><div className={`timer ${session.timeLeft < 10 && session.phase === 'open' ? 'urgent' : ''}`}><strong>{session.phase === 'open' ? `00:${String(session.timeLeft).padStart(2, '0')}` : session.phase === 'revealing' ? '•••' : 'DONE'}</strong></div></div>{session.phase === 'open' && <div className="contribution-card admin-monitor"><div className="contribution-copy"><span className="section-label">LIVE ROUND MONITOR</span><h2>{waiting === 0 ? 'All decisions are in.' : `${waiting} decision${waiting === 1 ? '' : 's'} still open.`}</h2><p>The round ends automatically when everyone locks in or when the timer hits zero. Amounts stay hidden until the reveal.</p><div className="admin-progress"><div className="admin-progress-bar"><span style={{ width: `${session.teams.length ? (session.locked.length / session.teams.length) * 100 : 0}%` }} /></div><small>{session.locked.length} / {session.teams.length} locked</small></div></div><div className="contribution-control"><div className="admin-pool"><span>POOL SO FAR</span><strong>{totalPool}</strong><small>amounts hidden · ×{session.multiplier.toFixed(2)} on reveal</small></div><button className="button button-primary lock-button" onClick={() => onCloseRound(session)}><Flag size={18} /> Close round now</button></div></div>}{session.phase === 'revealing' && <RevealCard pool={totalPool} reward={Math.floor(totalPool * session.multiplier)} multiplier={session.multiplier} />}{session.phase === 'results' && <RoundResultsCard session={session} footer={<>{session.currentRound < session.rounds ? <button className="button button-primary" onClick={onNext}>Start round {session.currentRound + 1} <ArrowRight size={18} /></button> : <button className="button button-primary" onClick={onEnd}><Flag size={18} /> End session &amp; publish results</button>}<span><Sparkles size={15} /> You control when the next round starts</span></>} />}</div><aside className="game-sidebar"><div className="leaderboard-card admin-leaderboard"><div className="side-heading"><span>LIVE STANDINGS</span><BarChart3 size={16} /></div>{leaderboard.map((team, index) => <div className="leader-row" key={team.id}><b className="rank">{index + 1}</b><span className="team-dot" style={{ background: team.color }} /><TeamRow team={team} />{session.phase === 'open' && session.locked.includes(team.id) && <Check size={14} className="locked-check" />}<strong>{team.balance}</strong></div>)}</div><div className="arena-note"><Sparkles size={16} /><span><b>Admin powers:</b> close a round early, start the next one, or end the whole session — every player sees the change instantly.</span></div></aside></div><Toast message={toast} /></main>;
}
