import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Stethoscope, ChevronRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col justify-between items-center px-4 pb-8 max-w-6xl mx-auto w-full">
      {/* Subtitle Under Logo */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-medium text-slate-200 tracking-tight">
          Tell us who’s checking in today
        </h2>
      </div>

      {/* Main Container Box matching Screenshot 1 */}
      <div className="bg-[#F8FAFC]/95 backdrop-blur-md rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-white/20 w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PATIENT OPTION CARD */}
          <div
            onClick={() => navigate('/patient')}
            className="group flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-3xl bg-[#F1F5F9]/60 hover:bg-white border border-slate-200/80 hover:border-teal-500/40 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 mb-6">
              <User className="w-10 h-10 md:w-12 md:h-12 stroke-[2]" />
            </div>

            <h3 className="text-3xl md:text-4xl font-extrabold text-[#0A1926] tracking-tight mb-2">
              Patient
            </h3>

            <p className="text-lg md:text-xl text-slate-500 font-medium mb-6">
              Enter your token to begin your visit
            </p>

            <div className="inline-flex items-center gap-1 text-[#0D9488] font-bold text-lg md:text-xl group-hover:translate-x-1 transition-transform">
              <span>Continue</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>

          {/* DOCTOR OPTION CARD */}
          <div
            onClick={() => navigate('/doctor')}
            className="group flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-3xl bg-[#F1F5F9]/60 hover:bg-white border border-slate-200/80 hover:border-teal-500/40 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#0C3B4A] text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 mb-6">
              <Stethoscope className="w-10 h-10 md:w-12 md:h-12 stroke-[2]" />
            </div>

            <h3 className="text-3xl md:text-4xl font-extrabold text-[#0A1926] tracking-tight mb-2">
              Doctor
            </h3>

            <p className="text-lg md:text-xl text-slate-500 font-medium mb-6">
              Sign in to review today's queue
            </p>

            <div className="inline-flex items-center gap-1 text-[#0D9488] font-bold text-lg md:text-xl group-hover:translate-x-1 transition-transform">
              <span>Continue</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="text-center pt-8 text-slate-400 text-sm font-medium">
        Powered by NivaKiosk
      </footer>
    </div>
  );
};
