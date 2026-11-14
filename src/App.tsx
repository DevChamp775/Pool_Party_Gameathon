import { useState } from 'react';
import { ChevronLeft, Gamepad2, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { PixelBackground } from '@/components/shared';
import AdminApp from '@/admin/AdminApp';
import PlayerApp from '@/player/PlayerApp';

type Role = 'pick' | 'admin' | 'player';

function App() {
  const [role, setRole] = useState<Role>('pick');

  if (role === 'admin') return <AdminApp onExit={() => setRole('pick')} />;
  if (role === 'player') return <PlayerApp onExit={() => setRole('pick')} />;

  return <main className="app-shell role-shell"><PixelBackground /><nav className="topbar"><div className="brand"><div className="brand-mark"><Gamepad2 size={22} /></div><span>POOL</span><b>PARTY</b><i>×2</i></div><div className="setup-step">CHOOSE YOUR ROLE</div></nav><section className="role-wrap"><div className="role-grid"><button className="role-card role-admin" onClick={() => setRole('admin')}><div className="role-icon"><ShieldCheck size={34} /></div><span className="section-label">FOR THE ORGANIZER</span><h2>Admin<br /><em>console.</em></h2><p>Create the room, add AI opponents, start and end every round. Best on a laptop or projector.</p><span className="role-cta">Open console <ChevronLeft size={16} className="rotate-90" /></span></button><button className="role-card role-player" onClick={() => setRole('player')}><div className="role-icon"><Users size={34} /></div><span className="section-label">FOR EACH TEAM</span><h2>Player<br /><em>entrance.</em></h2><p>Join with the room code, wait in the lobby, and lock in your secret contributions each round.</p><span className="role-cta">Join a room <ChevronLeft size={16} className="rotate-90" /></span></button></div><div className="role-note"><Sparkles size={16} /><span>Open the admin console on one device and the player entrance on every other device. Everyone sees rounds, reveals, and results live.</span></div></section></main>;
}

export default App;
