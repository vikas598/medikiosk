import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '../lib/authService';

export const DoctorAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [mode, setMode] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleToggleMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await authService.login(email, password);
        if (res.success) {
          setSuccessMsg(`Welcome, Dr. ${res.user?.name}!`);
          setTimeout(() => {
            navigate('/doctor/dashboard');
          }, 1000);
        } else {
          setErrorMsg(res.message || 'Login failed.');
        }
      } else {
        const res = await authService.signup(name, email, password, confirmPassword);
        if (res.success) {
          setSuccessMsg(`Account created for Dr. ${res.user?.name}!`);
          setTimeout(() => {
            navigate('/doctor/dashboard');
          }, 1000);
        } else {
          setErrorMsg(res.message || 'Registration failed.');
        }
      }
    } catch (err: any) {
      setErrorMsg('An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 pb-12 w-full">
      {/* Central White Card matching Screenshot 3 */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl max-w-md w-full text-center space-y-6">
        
        {/* Toggle Log In / Sign Up Tabs */}
        <div className="bg-[#F1F5F9] p-1.5 rounded-2xl flex">
          <button
            type="button"
            onClick={() => handleToggleMode('login')}
            className={`flex-1 py-3 rounded-xl font-bold text-base md:text-lg transition-all ${
              mode === 'login'
                ? 'bg-white text-[#0A1926] shadow'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode('signup')}
            className={`flex-1 py-3 rounded-xl font-bold text-base md:text-lg transition-all ${
              mode === 'signup'
                ? 'bg-white text-[#0A1926] shadow'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Header */}
        <div className="text-left space-y-1">
          <h2 className="text-3xl font-extrabold text-[#0A1926] tracking-tight">
            {mode === 'login' ? 'Doctor Log In' : 'Doctor Sign Up'}
          </h2>
          <p className="text-slate-400 text-sm font-medium">
            {mode === 'login'
              ? "Sign in to review today's patient queue."
              : 'Create your account to review patient queues.'}
          </p>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-left text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-left text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {mode === 'signup' && (
            <div>
              <div className="relative flex items-center">
                <User className="absolute left-4 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-[#0D9488] text-slate-900 font-semibold bg-white outline-none transition-all text-base"
                />
              </div>
            </div>
          )}

          <div>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-[#0D9488] text-slate-900 font-semibold bg-white outline-none transition-all text-base"
              />
            </div>
          </div>

          <div>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-5 h-5 text-slate-400" />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-[#0D9488] text-slate-900 font-semibold bg-white outline-none transition-all text-base"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-[#0D9488] text-slate-900 font-semibold bg-white outline-none transition-all text-base"
                />
              </div>
            </div>
          )}

          {/* Primary Gradient Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-xl text-white bg-gradient-to-r from-[#0D9488] to-[#059669] hover:from-teal-700 hover:to-emerald-700 active:scale-98 shadow-lg transition-all flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            ) : mode === 'login' ? (
              <span>Log In</span>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        {/* Footer Subtext */}
        <div className="pt-2 text-center space-y-3">
          {mode === 'login' ? (
            <p className="text-sm text-slate-500 font-medium">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => handleToggleMode('signup')}
                className="text-[#0D9488] font-bold hover:underline"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className="text-sm text-slate-500 font-medium">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleToggleMode('login')}
                className="text-[#0D9488] font-bold hover:underline"
              >
                Log In
              </button>
            </p>
          )}

          <div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
            >
              ← Back to start
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
