import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Users, LogOut, Clock3, AlertTriangle, Loader2, RefreshCw, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { authService } from '../lib/authService';
import { getDoctorQueue } from '../lib/api';
import type { DoctorQueueItem } from '../lib/types';

const stateStyles: Record<string, string> = {
  started: 'bg-slate-200 text-slate-800',
  consented: 'bg-cyan-100 text-cyan-800',
  interviewing: 'bg-teal-100 text-teal-900',
  summary_ready: 'bg-amber-200 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  expired: 'bg-slate-100 text-slate-600',
};

const formatStateLabel = (state: string) => state.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const QUEUE_PAGE_SIZE = 20;

export const DoctorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const doctor = authService.getCurrentUser();
  const [patients, setPatients] = useState<DoctorQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadQueue = useCallback(async (manual = false, background = false) => {
    if (manual) {
      setRefreshing(true);
    } else if (!background) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await getDoctorQueue(page, QUEUE_PAGE_SIZE);
      setPatients(response?.patients || []);
      setTotalPages(Math.max(response?.total_pages || 1, 1));
      setTotalCount(response?.total_count || 0);
    } catch (err: any) {
      setError(err?.message || 'Unable to load the patient queue right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    void loadQueue(false);

    const refreshInterval = window.setInterval(() => {
      void loadQueue(false, true);
    }, 5000);

    return () => window.clearInterval(refreshInterval);
  }, [loadQueue]);

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const handleOpenPatient = (patient: DoctorQueueItem) => {
    navigate(`/doctor/session/${patient.session_id}`);
  };

  return (
    <div className="flex-1 flex flex-col justify-between items-center px-4 py-4 max-w-6xl mx-auto w-full">
      <div className="w-full bg-[#0C3B4A] text-white p-4 md:p-5 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4 border-b-4 border-[#00C9A7]">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#00C9A7] text-slate-950 flex items-center justify-center">
            <Stethoscope className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-black">Doctor Dashboard Portal</h2>
            <p className="text-cyan-200 text-lg">
              Logged in as: <strong className="text-white">{doctor?.name || 'Dr. Practitioner'}</strong> ({doctor?.email || 'doctor@hospital.org'})
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white font-bold px-6 py-3 rounded-2xl border border-rose-500/40 text-lg transition-all active:scale-95"
        >
          <LogOut className="w-6 h-6" />
          <span>LOG OUT</span>
        </button>
      </div>

      <div className="kiosk-card w-full p-5 md:p-8 rounded-[2.5rem] shadow-2xl border-4 border-slate-200 bg-white my-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div>
            <h3 className="text-3xl font-black text-[#0C3B4A]">Active Patient Queue & Triage Summaries</h3>
            <p className="text-xl text-slate-600 mt-1">Select a patient to review the current intake state.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-teal-50 border border-teal-300 text-teal-900 px-5 py-2.5 rounded-2xl font-bold text-lg flex items-center gap-2">
              <Users className="w-6 h-6 text-teal-600" />
              <span>{totalCount} Patients</span>
            </div>
            <button
              type="button"
              onClick={() => void loadQueue(true)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-2xl border border-slate-200"
            >
              {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />} 
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#0C3B4A] font-bold text-xl">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            Loading queue...
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-5 font-bold">
            {error}
          </div>
        ) : patients.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600">
            <p className="text-2xl font-bold text-[#0C3B4A] mb-2">No patients in queue</p>
            <p>As patients enter a valid token and progress through intake, they will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {patients.map((patient) => {
              const stateClass = stateStyles[patient.state] || 'bg-slate-100 text-slate-700';
              const patientName = patient.patient?.name || 'Unknown Patient';
              const summaryText = patient.summary_status ? `Summary status: ${patient.summary_status}` : 'No summary yet';

              return (
                <div
                  key={patient.session_id}
                  className={`p-6 rounded-3xl border-2 flex flex-wrap items-center justify-between gap-4 shadow-sm transition-all ${
                    patient.priority_flag ? 'border-amber-300 bg-amber-50/50 hover:border-amber-500' : 'border-slate-200 bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center font-bold text-xl ${patient.priority_flag ? 'bg-amber-500' : 'bg-teal-600'}`}>
                      {patientName
                        .split(' ')
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'P'}
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-slate-900">Patient: {patientName}</h4>
                      <p className="text-lg text-slate-600">
                        Token: {patient.token} • {summaryText}
                      </p>
                      {patient.priority_flag && (
                        <p className="mt-1 flex items-center gap-2 text-sm font-bold text-amber-800">
                          <AlertTriangle className="w-4 h-4" />
                          {patient.priority_reason || 'Priority patient'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <span className={`px-4 py-1.5 rounded-full font-bold text-sm uppercase ${stateClass}`}>
                      {formatStateLabel(patient.state)}
                    </span>
                    {patient.state === 'interviewing' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-cyan-100 text-cyan-900 font-bold text-xs uppercase">
                        <Clock3 className="w-4 h-4" /> In progress
                      </span>
                    ) : null}
                    <button
                      onClick={() => handleOpenPatient(patient)}
                      className="inline-flex items-center gap-2 bg-[#0C3B4A] hover:bg-[#0f4c5c] text-white font-bold px-5 py-3 rounded-2xl text-base shadow-md"
                    >
                      <FileText className="w-5 h-5" />
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => setPage((currentPage) => currentPage - 1)}
              disabled={page === 1 || refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-100 px-5 py-2.5 font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
              Previous
            </button>
            <span className="font-bold text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={page >= totalPages || refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-100 px-5 py-2.5 font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
