import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  FileUp,
  Loader2,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { approveDoctorSession, getDoctorSessionDetail } from '../lib/api';
import type { DoctorDocument, DoctorSessionDetailResponse } from '../lib/types';

const formatTimestamp = (value?: string | null) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const DoctorSessionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<DoctorSessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError('Session not found.');
      setLoading(false);
      return;
    }

    const loadSession = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getDoctorSessionDetail(sessionId);
        setSession(data);
      } catch (err: any) {
        setError(err?.message || 'Unable to load this patient session.');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  const handleApprove = async () => {
    if (!sessionId) return;

    setApproving(true);
    try {
      await approveDoctorSession(sessionId);
      navigate('/doctor/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Approval failed. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  const openDocument = (doc: DoctorDocument) => {
    if (doc.url) {
      window.open(doc.url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (doc.storage_path) {
      setError('The uploaded document is stored in the backend but no view URL was generated.');
      return;
    }

    setError('No document is available for this session yet.');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8 flex items-center gap-4 text-[#0C3B4A] font-bold text-xl">
          <Loader2 className="w-8 h-8 animate-spin" />
          Loading patient record...
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8 max-w-xl w-full">
          <h2 className="text-3xl font-black text-[#0C3B4A] mb-3">Unable to load patient session</h2>
          <p className="text-lg text-slate-600 mb-6">{error || 'Session missing or inaccessible.'}</p>
          <button
            type="button"
            onClick={() => navigate('/doctor/dashboard')}
            className="bg-[#0C3B4A] hover:bg-[#124d60] text-white font-bold px-6 py-3 rounded-2xl"
          >
            Return to queue
          </button>
        </div>
      </div>
    );
  }

  const transcriptTurns = session.transcript?.turns || [];
  const uploadedDocs = session.documents || [];
  const isReadyForApproval = session.state === 'summary_ready';

  return (
    <div className="flex-1 flex flex-col px-4 py-8 max-w-7xl mx-auto w-full">
      <div className="w-full bg-[#0C3B4A] text-white p-6 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4 border-b-4 border-[#00C9A7]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/doctor/dashboard')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-2xl border border-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Queue</span>
          </button>
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Patient Session</p>
            <h1 className="text-3xl font-black">{session.patient.name || 'Unknown patient'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-4 py-2 rounded-full text-sm font-bold uppercase bg-cyan-100 text-cyan-900">
            Token: {session.token}
          </span>
          <span className="px-4 py-2 rounded-full text-sm font-bold uppercase bg-emerald-100 text-emerald-900">
            {session.state}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6 mt-8">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-[#0C3B4A]" />
              <h2 className="text-2xl font-black text-[#0C3B4A]">Transcript</h2>
            </div>
            <span className="text-sm text-slate-500">{transcriptTurns.length} turns</span>
          </div>

          {transcriptTurns.length > 0 ? (
            <div className="space-y-4 max-h-[680px] overflow-y-auto pr-2">
              {transcriptTurns.map((turn, index) => (
                <div key={`${turn.timestamp}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500 mb-2">
                    <span>Question {index + 1}</span>
                    <span>{formatTimestamp(turn.timestamp)}</span>
                  </div>
                  <p className="font-bold text-[#0C3B4A] mb-2">{turn.q}</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{turn.a || 'No response recorded yet.'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">
              No transcript is available for this session yet.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-4">
              <FileUp className="w-6 h-6 text-[#0C3B4A]" />
              <h2 className="text-2xl font-black text-[#0C3B4A]">Uploaded Document</h2>
            </div>

            {uploadedDocs.length > 0 ? (
              <div className="space-y-3">
                {uploadedDocs.map((doc) => (
                  <div key={doc.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-[#0C3B4A]">{doc.filename || 'Medical document'}</p>
                        <p className="text-sm text-slate-600">
                          {doc.file_type || 'Unknown type'} • {doc.size ? `${Math.round(doc.size / 1024)} KB` : 'Unknown size'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDocument(doc)}
                        className="inline-flex items-center gap-2 bg-[#0C3B4A] hover:bg-[#123d4a] text-white font-bold px-4 py-2 rounded-xl text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-slate-600">
                No uploaded document has been associated with this session yet.
              </div>
            )}
          </div>

          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-4">
              <ShieldAlert className="w-6 h-6 text-amber-600" />
              <h2 className="text-2xl font-black text-[#0C3B4A]">Summary</h2>
            </div>

            <button
              type="button"
              disabled
              className="w-full bg-slate-200 text-slate-500 font-bold px-5 py-3 rounded-2xl cursor-not-allowed opacity-80"
            >
              Summary preview coming soon
            </button>
          </div>

          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-6">
            <h2 className="text-2xl font-black text-[#0C3B4A] mb-4">Ready to continue</h2>
            <button
              type="button"
              disabled={!isReadyForApproval || approving}
              onClick={handleApprove}
              className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-xl ${
                !isReadyForApproval || approving
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#0D9488] to-[#059669] text-white hover:from-teal-700 hover:to-emerald-700'
              }`}
            >
              {approving ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Approve patient
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
