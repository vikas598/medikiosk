import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { getSessionByToken } from '../lib/api';
import type { ApiErrorResponse } from '../lib/api';
import { OnScreenKeypad } from '../components/OnScreenKeypad';

export const PatientTokenPage: React.FC = () => {
  const navigate = useNavigate();

  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorObj, setErrorObj] = useState<ApiErrorResponse | null>(null);

  // Keypad Handlers
  const handleKeyPress = (key: string) => {
    if (token.length < 12) {
      setToken((prev) => prev + key);
      setErrorObj(null);
    }
  };

  const handleDelete = () => {
    setToken((prev) => prev.slice(0, -1));
    setErrorObj(null);
  };

  const handleClear = () => {
    setToken('');
    setErrorObj(null);
  };

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setErrorObj(null);

    try {
      const session = await getSessionByToken(token);
      localStorage.setItem('niva_current_session', JSON.stringify(session));
      navigate('/patient/consent', { state: { session } });
    } catch (err: any) {
      if (err && err.type) {
        setErrorObj(err as ApiErrorResponse);
      } else {
        setErrorObj({
          status: 500,
          message: "We're unable to connect right now. Please try again.",
          type: 'NETWORK_ERROR',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Format token output with dashes if empty
  const renderTokenDisplay = () => {
    if (!token) {
      return (
        <div className="flex justify-center items-center gap-4 text-slate-300 font-mono text-3xl font-bold">
          <span>-</span>
          <span>-</span>
          <span>-</span>
          <span>-</span>
        </div>
      );
    }
    return (
      <span className="font-mono text-3xl font-extrabold tracking-widest text-[#0A1926]">
        {token}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 pb-12 w-full">
      {/* Central White Card matching Screenshot 2 */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl max-w-md w-full text-center space-y-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0A1926] tracking-tight">
            Patient Access
          </h2>
          <p className="text-lg text-slate-500 font-medium mt-1">
            Enter your patient token
          </p>
        </div>

        {/* Error Messages */}
        {errorObj && (
          <div
            className={`p-4 rounded-2xl text-left text-sm flex items-start gap-3 ${
              errorObj.type === 'EXPIRED_TOKEN'
                ? 'bg-amber-50 text-amber-900 border border-amber-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}
          >
            {errorObj.type === 'EXPIRED_TOKEN' ? (
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : errorObj.type === 'INVALID_TOKEN' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <RefreshCw className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{errorObj.message}</p>
            </div>
          </div>
        )}

        {/* Token Input Box */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl py-5 px-6 flex justify-center items-center shadow-inner min-h-[72px]">
            {renderTokenDisplay()}
          </div>

          {/* On-Screen Keypad */}
          <OnScreenKeypad
            onKeyPress={handleKeyPress}
            onDelete={handleDelete}
            onClear={handleClear}
          />

          {/* Continue Button */}
          <button
            type="submit"
            disabled={loading || !token.trim()}
            className={`w-full py-5 rounded-2xl font-bold text-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
              loading || !token.trim()
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-[#0D9488] to-[#059669] hover:from-teal-700 hover:to-emerald-700 active:scale-98 text-white'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-white" />
                <span>Validating...</span>
              </>
            ) : (
              <span>Continue</span>
            )}
          </button>
        </form>

        {/* Back Link */}
        <div className="pt-2">
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
  );
};
