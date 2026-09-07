import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../lib/authService';
import { getReceptionQueue, acknowledgeRedFlag } from '../../lib/api';

interface Stats {
  total_today: number;
  in_progress: number;
  completed: number;
  red_flags_today: number;
}

interface IntakeSession {
  id: string;
  token: string;
  patient?: { name: string; age?: number; gender?: string; };
  priority_reason?: string;
  priority_flag?: boolean;
  red_flag_acknowledged?: boolean;
  department?: string;
  started_at: string;
  state: string;
}

export const ReceptionDashboard: React.FC = () => {
  const [queue, setQueue] = useState<IntakeSession[]>([]);
  const [stats, setStats] = useState<Stats>({ total_today: 0, in_progress: 0, completed: 0, red_flags_today: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchQueue = async () => {
    try {
      const data = await getReceptionQueue();
      setQueue(data.active_sessions || []);
      setStats({
        total_today: (data.total_active || 0) + (data.completed_today || 0),
        in_progress: data.total_active || 0,
        completed: data.completed_today || 0,
        red_flags_today: data.red_flags_pending || 0,
      });
    } catch (err) {
      console.error('Failed to fetch queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auth check
    if (!authService.getCurrentUser()) {
      navigate('/reception/login', { replace: true });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQueue();

    // Polling as a fallback for realtime updates
    const timer = setInterval(() => {
      fetchQueue().catch(console.error);
    }, 5000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleAcknowledge = async (sessionId: string) => {
    try {
      await acknowledgeRedFlag(sessionId);
      fetchQueue();
    } catch (err) {
      console.error('Failed to acknowledge flag', err);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/reception/login');
  };

  const redFlagged = queue.filter(s => s.priority_flag && !s.red_flag_acknowledged);
  const normal = queue.filter(s => !s.priority_flag || s.red_flag_acknowledged);

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 text-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-600 to-orange-500 mx-4 mt-4 mb-2 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-amber-600/30 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-white tracking-tight">NivaKiosk Reception Portal</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/reception/register')}
            className="bg-white text-amber-600 px-6 py-2 rounded-xl hover:bg-amber-50 active:scale-95 font-black transition-all shadow-sm">
            + Register Patient
          </button>
          <button onClick={handleLogout}
            className="text-white/80 hover:text-white text-sm font-bold transition-colors">
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 w-full flex-1">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Today" value={stats.total_today} color="gray" />
          <StatCard label="In Progress" value={stats.in_progress} color="blue" />
          <StatCard label="Completed" value={stats.completed} color="green" />
          <StatCard label="Red Flags" value={stats.red_flags_today} color="red" alert={stats.red_flags_today > 0} />
        </div>

        {/* Red flag alerts */}
        {redFlagged.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-600 rounded-r-xl p-5 mb-6 shadow-sm">
            <h2 className="text-red-800 font-bold text-lg mb-3">⚠ Priority Alerts — Immediate Action Needed</h2>
            {redFlagged.map(session => (
              <div key={session.id} className="bg-white rounded-lg p-4 mb-2 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm">
                <div className="mb-3 md:mb-0">
                  <p className="text-xl font-bold text-red-900">
                    Token #{session.token} — {session.patient?.name}
                  </p>
                  <p className="text-red-700 mt-1 font-medium">{session.priority_reason}</p>
                </div>
                <button onClick={() => handleAcknowledge(session.id)}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors shrink-0">
                  Mark Acknowledged
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Active queue */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b bg-gray-50/50 px-5 py-4">
            <h2 className="font-bold text-gray-900 text-lg">Active Queue ({normal.length})</h2>
          </div>
          {loading ? (
            <p className="p-8 text-center text-gray-500 font-medium">Loading queue...</p>
          ) : normal.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400">
              <div className="text-5xl mb-4">🏥</div>
              <p className="text-lg font-medium text-gray-500">No active sessions right now</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {normal.map(session => (
                <QueueRow key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: number, color: string, alert?: boolean }> = ({ label, value, color, alert = false }) => {
  const colors: Record<string, string> = {
    gray: 'bg-gray-50 text-gray-900 border border-gray-200',
    blue: 'bg-blue-50 text-blue-900 border border-blue-100',
    green: 'bg-green-50 text-green-900 border border-green-100',
    red: alert ? 'bg-red-600 text-white border border-red-700 shadow-sm' : 'bg-red-50 text-red-900 border border-red-100',
  };
  return (
    <div className={`${colors[color]} rounded-2xl p-6 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 duration-200`}>
      <p className={`text-sm font-semibold opacity-80 ${alert ? 'text-red-100' : ''}`}>{label}</p>
      <p className="text-4xl font-extrabold mt-1">{value}</p>
    </div>
  );
};

const QueueRow: React.FC<{ session: IntakeSession }> = ({ session }) => {
  const stateLabels: Record<string, string> = {
    started: 'Waiting to start',
    consented: 'Consenting',
    interviewing: 'Interview in progress',
    summary_ready: 'Ready for doctor',
  };
  
  const stateLabel = stateLabels[session.state] || session.state;

  return (
    <div className="flex justify-between items-center p-5 hover:bg-gray-50/80 transition-colors">
      <div className="flex items-center gap-4">
        <span className="text-2xl font-mono font-bold text-slate-700 w-16">#{session.token}</span>
        <div>
          <p className="font-bold text-gray-900 text-lg">
            {session.patient?.name || 'Unknown'}
            <span className="text-gray-500 font-medium ml-2 text-sm">
              {session.patient?.age ? `${session.patient.age}y` : ''} 
              {session.patient?.gender ? ` · ${session.patient.gender}` : ''}
            </span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {stateLabel}
            </span>
            <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-gray-400"></span>
              {session.department}
            </span>
          </div>
        </div>
      </div>
      <div className="text-sm font-medium text-gray-400">
        {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
};
