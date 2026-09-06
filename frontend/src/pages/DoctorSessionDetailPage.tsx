import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Edit3,
  FileText,
  Files,
  Loader2,
  ShieldAlert,
  ExternalLink,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { approveDoctorSession, getDoctorSessionDetail, updateDoctorSummary } from '../lib/api';
import type { DoctorDocument, DoctorSessionDetailResponse, StructuredSummary, SummaryPoint } from '../lib/types';

const formatTimestamp = (value?: string | null) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatLabel = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const formatSummaryValue = (value: unknown) => {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return String(value);
};

export const DoctorSessionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<DoctorSessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [draftPoints, setDraftPoints] = useState<SummaryPoint[]>([]);
  const [draftRedFlags, setDraftRedFlags] = useState<string>('');

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
        setError(err?.response?.data?.detail || err?.message || 'Unable to load this patient session.');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  const handleApprove = async () => {
    if (!sessionId || approving || session?.state !== 'summary_ready') return;

    setApproving(true);
    try {
      await approveDoctorSession(sessionId);
      navigate('/doctor/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Approval failed. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  const startEditingSummary = () => {
    if (!session?.summary) return;
    setDraftPoints(session.summary.points.map((p) => ({ en: p.en, hi: p.hi })));
    setDraftRedFlags(session.summary.red_flags.join('\n'));
    setError(null);
    setEditingSummary(true);
  };

  const handleSaveSummary = async () => {
    if (!sessionId || !session?.summary || savingSummary) return;

    const structured: StructuredSummary = {
      points: draftPoints.filter((p) => p.en.trim() || p.hi.trim()),
      red_flags: draftRedFlags.split(/\r?\n/).map((f) => f.trim()).filter(Boolean),
    };

    setSavingSummary(true);
    setError(null);
    try {
      await updateDoctorSummary(sessionId, structured);
      setSession({ ...session, summary: structured });
      setEditingSummary(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Unable to save the edited summary.');
    } finally {
      setSavingSummary(false);
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

  if (!session) {
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
  const previousSummaries = session.previous_summaries || [];
  const isReadyForApproval = session.state === 'summary_ready';
  const summaryPoints = session.summary?.points || [];
  const summaryFlags = Array.isArray(session.summary?.red_flags)
    ? session.summary.red_flags.filter((flag): flag is string => typeof flag === 'string' && flag.trim().length > 0)
    : [];
  const flagReadings = [
    ...(session.priority_flag
      ? [{ label: 'Priority flag', detail: session.priority_reason || 'Priority flag raised for this session.' }]
      : []),
    ...summaryFlags.map((flag) => ({ label: 'Summary flag', detail: flag })),
  ];

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
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Patient Record</p>
            <h1 className="text-3xl font-black">{session.patient.name || 'Unknown patient'}</h1>
            <p className="text-sm text-cyan-100">Patient ID: {session.patient_id}</p>
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

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6 mt-8">
        <section id="summary" className="bg-white rounded-[2rem] shadow-xl border-2 border-teal-200 p-6 scroll-mt-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <FileText className="w-7 h-7 text-teal-700" />
              <div>
                <h2 className="text-2xl font-black text-[#0C3B4A]">AI Clinical Summary</h2>
                <p className="text-sm text-slate-500">Review the information generated from this consultation.</p>
              </div>
            </div>
            {session.summary ? (
              <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase">{session.state === 'approved' ? 'Approved' : 'Draft'}</span>
            ) : null}
          </div>

          {editingSummary ? (
            <div className="space-y-4">
              {draftPoints.map((point, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Point {i + 1}</span>
                  <label className="block">
                    <span className="text-xs font-bold text-teal-700">English (Clinical)</span>
                    <textarea
                      rows={2}
                      value={point.en}
                      onChange={(e) => setDraftPoints((pts) => pts.map((p, idx) => idx === i ? { ...p, en: e.target.value } : p))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 outline-none focus:border-teal-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500">Hinglish</span>
                    <textarea
                      rows={2}
                      value={point.hi}
                      onChange={(e) => setDraftPoints((pts) => pts.map((p, idx) => idx === i ? { ...p, hi: e.target.value } : p))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 outline-none focus:border-teal-500"
                    />
                  </label>
                </div>
              ))}
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Red Flags</span>
                <textarea
                  rows={2}
                  value={draftRedFlags}
                  onChange={(e) => setDraftRedFlags(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 p-3 text-slate-800 outline-none focus:border-teal-500"
                />
                <span className="text-xs text-slate-500">Enter one flag per line. Leave empty if none.</span>
              </label>
              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" onClick={() => setEditingSummary(false)} disabled={savingSummary} className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-700">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveSummary} disabled={savingSummary} className="inline-flex items-center gap-2 rounded-2xl bg-[#0C3B4A] px-5 py-3 font-bold text-white disabled:opacity-50">
                  {savingSummary ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {savingSummary ? 'Saving...' : 'Save Summary'}
                </button>
              </div>
            </div>
          ) : summaryPoints.length > 0 ? (
            <div className="space-y-4">
              {summaryPoints.map((point, i) => (
                <div key={i} className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-lg font-semibold text-[#0C3B4A]">{point.en}</p>
                  <p className="text-base text-slate-500 mt-1">{point.hi}</p>
                </div>
              ))}
              {summaryFlags.length > 0 && (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                  <p className="font-bold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Red Flags
                  </p>
                  <ul className="mt-2 space-y-1">
                    {summaryFlags.map((flag, i) => (
                      <li key={i} className="text-red-600 text-lg">• {flag}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">
              Summary not available yet.
            </div>
          )}
          {!editingSummary && session.summary ? (
            <button type="button" onClick={startEditingSummary} className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-5 py-3 font-bold text-teal-900 hover:bg-teal-100">
              <Edit3 className="h-5 w-5" />
              Edit Summary
            </button>
          ) : null}
        </section>

        <section id="flags" className={`rounded-[2rem] shadow-xl p-6 scroll-mt-8 ${flagReadings.length > 0 ? 'bg-amber-50 border-2 border-amber-300' : 'bg-white border border-slate-200'}`}>
          <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4 mb-4">
            <ShieldAlert className={`w-7 h-7 ${flagReadings.length > 0 ? 'text-amber-700' : 'text-slate-500'}`} />
            <div>
              <h2 className="text-2xl font-black text-[#0C3B4A]">Flags & Risk Readings</h2>
              <p className="text-sm text-slate-600">Recorded indicators for this session.</p>
            </div>
          </div>
          {flagReadings.length > 0 ? (
            <div className="space-y-3">
              {flagReadings.map((flag, index) => (
                <div key={`${flag.label}-${index}`} className="flex gap-3 rounded-2xl border border-amber-200 bg-white/80 p-4">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-black text-amber-950">{flag.label}</p>
                    <p className="text-slate-700 mt-1">{flag.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-slate-600">No flags recorded for this session.</p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6 mt-6">
        <section id="transcript" className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-6 scroll-mt-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-[#0C3B4A]" />
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
        </section>

        <div className="space-y-6">
          <section id="documents" className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-6 scroll-mt-8">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-4">
              <Files className="w-6 h-6 text-[#0C3B4A]" />
              <h2 className="text-2xl font-black text-[#0C3B4A]">Documents</h2>
            </div>

            {uploadedDocs.length > 0 ? (
              <div className="space-y-3">
                {uploadedDocs.map((doc) => (
                  <div key={doc.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-[#0C3B4A]">{doc.filename || 'Medical document'}</p>
                        <p className="text-sm text-slate-600">
                          Token {doc.token || session.token} • {doc.file_type || 'Unknown type'} • {doc.size ? `${Math.round(doc.size / 1024)} KB` : 'Unknown size'}
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
          </section>

          <section className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-4">
              <Files className="w-6 h-6 text-[#0C3B4A]" />
              <h2 className="text-2xl font-black text-[#0C3B4A]">Previous Summaries</h2>
            </div>
            {previousSummaries.length > 0 ? (
              <div className="space-y-3">
                {previousSummaries.map((previous) => (
                  <details key={previous.session_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <summary className="cursor-pointer font-bold text-[#0C3B4A]">
                      Token {previous.token} · {formatTimestamp(previous.started_at)}
                    </summary>
                    <div className="mt-3 space-y-2">
                      {previous.summary.points?.map((point, index) => (
                        <div key={index}>
                          <p className="font-semibold text-[#0C3B4A]">{point.en}</p>
                          <p className="text-sm text-slate-500">{point.hi}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-slate-600">
                No previous summaries for this patient.
              </p>
            )}
          </section>

          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-6">
            <h2 className="text-2xl font-black text-[#0C3B4A] mb-4">Ready to continue</h2>
            {session.state === 'approved' ? (
              <div className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-xl">
                <CheckCircle className="w-6 h-6" />
                Approved
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
