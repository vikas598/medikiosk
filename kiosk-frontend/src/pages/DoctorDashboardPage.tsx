import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Users, LogOut, CheckCircle } from 'lucide-react';
import { authService } from '../lib/authService';

export const DoctorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const doctor = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  return (
    <div className="flex-1 flex flex-col justify-between items-center px-4 py-8 max-w-6xl mx-auto w-full">
      {/* Doctor Header Bar */}
      <div className="w-full bg-[#0C3B4A] text-white p-6 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4 border-b-4 border-[#00C9A7]">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#00C9A7] text-slate-950 flex items-center justify-center">
            <Stethoscope className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-black">
              Doctor Dashboard Portal
            </h2>
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

      {/* Main Kiosk Dashboard Content */}
      <div className="kiosk-card w-full p-8 md:p-12 rounded-[2.5rem] shadow-2xl border-4 border-slate-200 bg-white my-8 space-y-8">
        <div className="flex items-center justify-between border-b pb-6">
          <div>
            <h3 className="text-3xl font-black text-[#0C3B4A]">
              Active Patient Queue & Triage Summaries
            </h3>
            <p className="text-xl text-slate-600 mt-1">
              Select a patient from the queue below to review AI-generated triage summaries.
            </p>
          </div>

          <div className="bg-teal-50 border border-teal-300 text-teal-900 px-5 py-2.5 rounded-2xl font-bold text-lg flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" />
            <span>2 Patients Waiting</span>
          </div>
        </div>

        {/* Demo Patient Queue Table / Cards for Kiosk Review */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl border-2 border-amber-300 bg-amber-50/50 flex flex-wrap items-center justify-between gap-4 shadow-sm hover:border-amber-500 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl">
                P-01
              </div>
              <div>
                <h4 className="text-2xl font-bold text-slate-900">Patient: John Doe (Token: DEMO01)</h4>
                <p className="text-lg text-slate-600">Chief Complaint: Intermittent Chest Pain (Severity 6/10)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-4 py-1.5 rounded-full bg-amber-200 text-amber-900 font-bold text-sm uppercase">
                Summary Ready
              </span>
              <button
                onClick={() => alert('Reviewing Patient Session DEMO01 summary...')}
                className="bg-[#0C3B4A] hover:bg-[#0f4c5c] text-white font-bold px-6 py-3 rounded-2xl text-lg shadow-md"
              >
                REVIEW INTAKE
              </button>
            </div>
          </div>

          <div className="p-6 rounded-3xl border-2 border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4 shadow-sm hover:border-slate-400 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-xl">
                P-02
              </div>
              <div>
                <h4 className="text-2xl font-bold text-slate-900">Patient: Maria Garcia (Token: DEMO02)</h4>
                <p className="text-lg text-slate-600">Chief Complaint: Severe Headache & Fever (2 days)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm uppercase flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Approved
              </span>
              <button
                onClick={() => alert('Viewing approved session record...')}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-6 py-3 rounded-2xl text-lg shadow-sm"
              >
                VIEW RECORD
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
