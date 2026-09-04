import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, Send, CheckCircle2, Loader2, ArrowRight, FileUp, FileText } from 'lucide-react';
import { submitTurn, finalizeSession } from '../lib/api';
import type { SessionResponse, StructuredSummary } from '../lib/types';

export const PatientInterviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const session: SessionResponse | null =
    location.state?.session ||
    (localStorage.getItem('niva_current_session')
      ? JSON.parse(localStorage.getItem('niva_current_session')!)
      : null);

  const [currentQuestion, setCurrentQuestion] = useState<string>(
    'What brings you to the hospital today?'
  );
  const [touchOptions, setTouchOptions] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string>('');
  const [turnIndex, setTurnIndex] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [summary, setSummary] = useState<StructuredSummary | null>(null);

  const handleNextTurn = async (responseVal?: string) => {
    const textToSubmit = responseVal || answer;
    if (!textToSubmit.trim() || !session) return;

    setLoading(true);
    try {
      const res = await submitTurn(session.id, textToSubmit);
      setAnswer('');

      if (res.is_complete || !res.question) {
        setIsComplete(true);
        const finalRes = await finalizeSession(session.id);
        setSummary(finalRes.summary);
      } else {
        setCurrentQuestion(res.question);
        setTouchOptions(res.touch_options || []);
        setTurnIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Turn submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="p-8 text-center">
        <button onClick={() => navigate('/patient')} className="btn-primary">
          Return to Patient Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between items-center px-4 pb-12 max-w-4xl mx-auto w-full">
      {/* Header Banner */}
      <div className="w-full bg-[#0C3B4A] text-white p-6 rounded-3xl shadow-xl flex items-center justify-between border-b-4 border-[#00C9A7]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#00C9A7] text-slate-950 flex items-center justify-center font-black text-2xl">
            Q{turnIndex}
          </div>
          <div>
            <h3 className="text-2xl font-bold">Patient Intake Interview</h3>
            <p className="text-cyan-200">Patient: {session.patients?.name || 'Session ' + session.token}</p>
          </div>
        </div>


      </div>

      {/* Main Card */}
      <div className="kiosk-card w-full p-8 md:p-12 rounded-[2.5rem] shadow-2xl border-4 border-teal-500/20 bg-white my-6">
        {!isComplete ? (
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[#00A389] font-extrabold text-xl">
                <HelpCircle className="w-8 h-8" />
                <span>QUESTION FOR PATIENT</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-[#0C3B4A] leading-tight">
                {currentQuestion}
              </h2>
            </div>

            {/* Quick Touch Option Chips */}
            {touchOptions.length > 0 && (
              <div className="flex flex-wrap gap-4 pt-2">
                {touchOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleNextTurn(opt)}
                    className="py-4 px-8 rounded-2xl bg-teal-50 hover:bg-[#00C9A7] hover:text-slate-950 text-[#0C3B4A] font-bold text-xl border-2 border-teal-200 shadow-md transition-all active:scale-95"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Response Input */}
            <div className="space-y-4 pt-4">
              <textarea
                rows={3}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type or tap response here..."
                className="w-full p-6 rounded-2xl border-2 border-slate-300 focus:border-[#00C9A7] text-2xl font-medium text-slate-900 bg-slate-50 outline-none shadow-inner resize-none"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => handleNextTurn()}
                  disabled={loading || !answer.trim()}
                  className="md:col-span-3 h-20 bg-gradient-to-r from-[#0D9488] to-[#059669] hover:from-teal-700 hover:to-emerald-700 active:scale-98 disabled:opacity-50 text-white font-black text-2xl rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <>
                      <span>SUBMIT ANSWER</span>
                      <Send className="w-7 h-7" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Intake Completion & Structured Summary */
          <div className="text-center space-y-8 py-4">
            <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-16 h-16" />
            </div>

            <div>
              <h2 className="text-4xl font-black text-[#0C3B4A]">Your problem has been recorded</h2>
              <p className="text-2xl text-slate-600 font-medium mt-2">
                Thank you. The doctor will review your information shortly.
              </p>
            </div>

            {summary && (
              <div className="text-left bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-xl text-[#0C3B4A] border-b pb-2 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-teal-600" />
                  <span>Clinical Summary Preview</span>
                </h4>
                <p className="text-lg text-slate-800">
                  <strong className="text-slate-900">Chief Complaint:</strong> {summary.chief_complaint}
                </p>
                <p className="text-lg text-slate-800">
                  <strong className="text-slate-900">HPI:</strong> {summary.hpi}
                </p>
              </div>
            )}

            {/* Document Upload Secondary Action before returning home */}
            <div className="pt-2 flex flex-col md:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate('/patient/documents', { state: { session } })}
                className="flex-1 py-5 bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold text-xl rounded-2xl border border-teal-300 transition-all flex items-center justify-center gap-2"
              >
                <FileUp className="w-6 h-6 text-teal-600" />
                <span>Upload Medical Documents</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 py-5 bg-[#0C3B4A] text-white font-black text-xl rounded-2xl shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>FINISH & RETURN TO HOME</span>
                <ArrowRight className="w-7 h-7" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
