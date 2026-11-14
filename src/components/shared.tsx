import { ReactNode, useEffect, useState } from 'react';
import { Award, Check, Coins, Crown, Gamepad2, Medal, Sparkles, Trophy, Waves } from 'lucide-react';
import { Session, Team } from '@/lib/game';

export function Brand() { return <div className="brand"><div className="brand-mark"><Gamepad2 size={22} /></div><span>POOL</span><b>PARTY</b><i>×2</i></div>; }
export function PixelBackground() { return <div className="pixel-background" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /></div>; }
export function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="hero-stat"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>; }
export function RuleCard({ number, icon, title, text }: { number: string; icon: ReactNode; title: string; text: string }) { return <div className="rule-card"><div className="rule-icon">{icon}</div><div><small>{number}</small><h3>{title}</h3><p>{text}</p></div></div>; }

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return <div className="toast"><Check size={16} /> {message}</div>;
}

export function useToast() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(''), 2400);
    return () => window.clearTimeout(id);
  }, [message]);
  return { message, showToast: setMessage };
}

export function TeamTag({ team, youId }: { team: Team; youId?: number }) {
  return <span className="team-name">{team.name}{youId === team.id && <small> YOU</small>}{team.isBot && <small> BOT</small>}</span>;
}

export function RevealCard({ pool, reward, multiplier }: { pool: number; reward: number; multiplier: number }) {
  return <div className="reveal-card"><div className="reveal-ring"><Waves size={40} /><strong>{pool}</strong><span>TOTAL POOL</span></div><div className="reveal-arrow">×{multiplier}</div><div className="reveal-result"><Sparkles size={22} /><strong>{reward}</strong><span>ROOM REWARD</span></div><div className="reveal-message">The room just created <b>{reward - pool} new tokens</b>. See where they land.</div></div>;
}

export function RoundResultsCard({ session, footer }: { session: Session; footer?: ReactNode }) {
  const results = session.roundResults;
  const pool = results.reduce((sum, result) => sum + result.contribution, 0);
  const reward = results.reduce((sum, result) => sum + result.reward, 0);
  return <div className="results-card"><div className="results-heading"><div><span className="section-label">ROUND {session.currentRound} REVEALED</span><h2>Here is what happened.</h2></div><div className="result-total"><span>POOL</span><b>{pool}</b><i>→ {reward} rewarded</i></div></div><div className="results-table"><div className="table-head"><span>TEAM</span><span>BEFORE</span><span>GAVE</span><span>REWARD</span><span>NOW</span></div>{session.teams.map((team, index) => { const result = results.find((row) => row.round === session.currentRound && row.previous === team.balance + (results[index]?.contribution ?? 0) && results[index] && results[index].round === session.currentRound) ?? results[index]; return <div className="table-row" key={team.id}><span><i className="team-dot" style={{ background: team.color }} />{team.name}{team.isBot && <small> BOT</small>}</span><b>{result?.previous ?? '—'}</b><b className="loss">−{result?.contribution ?? 0}</b><b className="gain">+{result?.reward ?? 0}</b><strong>{result?.balance ?? team.balance}</strong></div>; })}</div>{footer && <div className="results-actions">{footer}</div>}</div>;
}

export function FinalResults({ session, actionLabel, onAction }: { session: Session; actionLabel: string; onAction: () => void }) {
  const ranked = [...session.teams].sort((a, b) => b.balance - a.balance);
  const totalContributed = session.teams.reduce((sum, team) => sum + team.contributed, 0);
  const totalRewards = session.teams.reduce((sum, team) => sum + team.rewards, 0);
  const roundsPlayed = session.ended ? session.currentRound - (session.phase === 'open' ? 1 : 0) : session.rounds;
  return <main className="app-shell final-shell"><PixelBackground /><nav className="topbar"><Brand /><div className="setup-step">FINAL SCOREBOARD</div></nav><section className="final-wrap"><div className="final-hero"><div className="eyebrow"><span className="live-dot" /> SESSION {session.ended ? 'ENDED BY ADMIN' : 'COMPLETE'} · ROOM {session.roomCode}</div><h1>THE ROOM<br /><em>CREATED VALUE.</em></h1><p>{totalContributed} tokens entered the pool and became {totalRewards} tokens of shared reward.</p></div><div className="podium">{ranked.slice(0, 3).map((team, index) => <div className={`podium-player place-${index + 1}`} key={team.id}><div className="medal">{index === 0 ? <Crown /> : index === 1 ? <Medal /> : <Award />}</div><span className="team-dot" style={{ background: team.color }} /><b>{team.name}{team.isBot && <small> BOT</small>}</b><strong>{team.balance}</strong><small>{index === 0 ? 'WINNER' : `#${index + 1}`}</small></div>)}</div><div className="final-grid"><div className="final-table"><div className="side-heading"><span>FINAL STANDINGS</span><Trophy size={17} /></div>{ranked.map((team, index) => <div className="final-row" key={team.id}><strong>#{index + 1}</strong><span className="team-dot" style={{ background: team.color }} /><span>{team.name}{team.isBot && <small> BOT</small>}</span><small>+{team.rewards - team.contributed} net</small><b>{team.balance}</b></div>)}</div><div className="final-stats"><div><small>GROUP COOPERATION</small><strong>{Math.round((totalContributed / (session.initialTokens * session.teams.length * roundsPlayed)) * 100)}%</strong><span>of possible tokens entered</span></div><div><small>TOTAL MULTIPLIED</small><strong>+{totalRewards - totalContributed}</strong><span>new tokens created</span></div><button className="button button-primary" onClick={onAction}>{actionLabel}</button></div></div></section></main>;
}
