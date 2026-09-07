import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../lib/authService';

export const ReceptionLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await authService.login(email, password);
      if (res.success) {
        setSuccessMsg(`Welcome, ${res.user?.name || 'Receptionist'}!`);
        setTimeout(() => {
          navigate('/reception/dashboard');
        }, 1000);
      } else {
        setErrorMsg(res.message || 'Login failed.');
      }
    } catch (_err) {
      setErrorMsg('An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 pb-6 w-full bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <div className="mb-8 drop-shadow-xl">
        <img src="/orange.png" alt="NivaKiosk Logo" className="h-16 md:h-20 w-auto object-contain" />
      </div>
      <div className="bg-white rounded-[2rem] p-6 md:p-7 shadow-[0_20px_50px_-12px_rgba(217,119,6,0.25)] max-w-md w-full text-center space-y-4 border-t-8 border-amber-500">
        <div className="text-left space-y-1">
          <h2 className="text-3xl font-extrabold text-[#0A1926] tracking-tight">
            NivaKiosk - Reception Portal
          </h2>
          <p className="text-slate-400 text-sm font-medium">
            Sign in to manage the patient queue.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl text-sm font-medium border border-red-100">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-xl text-sm font-medium border border-green-100">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left mt-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-900"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-900"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3.5 rounded-xl font-bold text-lg shadow-[0_4px_14px_rgba(217,119,6,0.3)] hover:shadow-[0_6px_20px_rgba(217,119,6,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
