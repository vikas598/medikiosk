import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle, XCircle, ArrowLeft, Loader2, FileText, User } from 'lucide-react';
import { recordConsent } from '../lib/api';
import type { SessionResponse } from '../lib/types';

export const PatientConsentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const session: SessionResponse | null =
    location.state?.session ||
    (localStorage.getItem('niva_current_session')
      ? JSON.parse(localStorage.getItem('niva_current_session')!)
      : null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConsent = async (granted: boolean) => {
    if (!session) {
      navigate('/patient');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await recordConsent(session.id, granted);

      if (granted) {
        navigate('/patient/interview', { state: { session } });
      } else {
        alert('Thank you. You have declined the kiosk check-in process. Please see the reception desk.');
        navigate('/');
      }
    } catch (err) {
      setErrorMsg('Failed to record consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">No active session found</h2>
        <button
          onClick={() => navigate('/patient')}
          className="bg-[#0C3B4A] text-white px-8 py-4 rounded-2xl text-xl font-bold"
        >
          Return to Token Entry
        </button>
      </div>
    );
  }

  const patientName = session.patients?.name || 'Valued Patient';

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-4 py-8 max-w-4xl mx-auto w-full">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/patient')}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 font-bold px-6 py-3 rounded-2xl shadow-sm text-lg md:text-xl transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
          <span>BACK</span>
        </button>

        <div className="flex items-center gap-2 bg-emerald-100 text-emerald-900 px-5 py-2 rounded-2xl font-bold text-lg border border-emerald-300">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <span>Privacy & Information Consent</span>
        </div>
      </div>

      {/* Main Consent Card */}
      <div className="kiosk-card w-full p-8 md:p-12 rounded-[2.5rem] shadow-2xl border-4 border-slate-200 bg-white">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-[#0C3B4A] text-white flex items-center justify-center">
            <User className="w-9 h-9 text-[#00C9A7]" />
          </div>
          <div>
            <span className="text-sm font-bold text-teal-700 tracking-wider uppercase">
              Verified Session Token: {session.token}
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[#0C3B4A]">
              Welcome, {patientName}
            </h2>
          </div>
        </div>

        <div className="space-y-4 mb-8 text-slate-700 text-xl leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-200">
          <div className="flex items-start gap-3">
            <FileText className="w-7 h-7 text-[#00C9A7] shrink-0 mt-1" />
            <p>
              By proceeding with this self-service kiosk, you consent to answering brief medical triage questions. Your responses will be securely transmitted to your attending physician.
            </p>
          </div>
          <p className="text-lg text-slate-500 italic pl-10">
            • All data is protected under hospital confidentiality guidelines.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-100 text-rose-800 text-lg font-bold">
            {errorMsg}
          </div>
        )}

        {/* HUGE TOUCH BUTTONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <button
            type="button"
            onClick={() => handleConsent(true)}
            disabled={loading}
            className="h-24 md:h-28 bg-[#00C9A7] hover:bg-[#00A389] active:scale-98 text-slate-950 font-black text-3xl rounded-3xl shadow-xl transition-all flex items-center justify-center gap-3 border-b-6 border-teal-800"
          >
            {loading ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-10 h-10 stroke-[2.5]" />
                <span>I AGREE</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleConsent(false)}
            disabled={loading}
            className="h-24 md:h-28 bg-slate-200 hover:bg-slate-300 active:scale-98 text-slate-800 font-bold text-2xl rounded-3xl shadow-md transition-all flex items-center justify-center gap-3 border-b-4 border-slate-400"
          >
            <XCircle className="w-9 h-9 text-slate-600" />
            <span>I DECLINE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
