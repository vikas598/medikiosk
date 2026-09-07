import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Stethoscope, ChevronRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex-1 flex flex-col justify-center items-center px-4 py-3 md:py-4 max-w-6xl mx-auto w-full">
      {/* Subtitle Under Logo */}
      <div className="text-center mb-4">
        <h2 className="question-enter text-2xl md:text-3xl font-semibold text-slate-100 tracking-tight">
          Tell us who’s <span className="text-[#16d9b5]">checking in</span> today
        </h2>
      </div>

      {/* Main Container Box matching Screenshot 1 */}
      <div className="bg-[#123e50]/90 backdrop-blur-md rounded-[2.5rem] p-3 md:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-[#2b6072] w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PATIENT OPTION CARD */}
          <button
            type="button"
            onClick={() => navigate('/patient')}
            className="group flex flex-col items-center justify-center text-center p-4 md:p-5 min-h-[220px] md:min-h-[230px] rounded-3xl bg-gradient-to-br from-[#d7fff7] via-[#e9fffc] to-[#c9f5ed] hover:brightness-105 border border-[#c1f1e8] shadow-[0_10px_24px_rgba(0,0,0,0.16)] hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            <div className="w-20 h-20 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-[#18d9b2] to-[#07a995] text-white flex items-center justify-center shadow-[0_8px_18px_rgba(0,169,149,0.35)] group-hover:scale-105 transition-transform duration-300 mb-3">
              <User className="w-10 h-10 md:w-10 md:h-10 stroke-[2]" />
            </div>

            <h3 className="text-3xl md:text-3xl font-extrabold text-[#071822] tracking-tight mb-2">
              Patient
            </h3>

            <p className="text-lg md:text-lg text-slate-500 font-medium mb-3">
              Enter your token to begin your visit
            </p>

            <div className="inline-flex items-center justify-center gap-2 w-48 py-2 rounded-full bg-[#11bea7] text-white font-bold text-lg md:text-lg shadow-[0_7px_14px_rgba(8,147,131,0.25)] group-hover:translate-x-1 transition-transform">
              <span>Continue</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </button>

          {/* DOCTOR OPTION CARD */}
          <button
            type="button"
            onClick={() => navigate('/doctor')}
            className="group flex flex-col items-center justify-center text-center p-4 md:p-5 min-h-[220px] md:min-h-[230px] rounded-3xl bg-gradient-to-br from-[#dcecff] via-[#eff6ff] to-[#c8dcf6] hover:brightness-105 border border-[#c6ddf7] shadow-[0_10px_24px_rgba(0,0,0,0.16)] hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            <div className="w-20 h-20 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-[#1686ed] to-[#0964ca] text-white flex items-center justify-center shadow-[0_8px_18px_rgba(20,112,220,0.35)] group-hover:scale-105 transition-transform duration-300 mb-3">
              <Stethoscope className="w-10 h-10 md:w-10 md:h-10 stroke-[2]" />
            </div>

            <h3 className="text-3xl md:text-3xl font-extrabold text-[#071822] tracking-tight mb-2">
              Doctor
            </h3>

            <p className="text-lg md:text-lg text-slate-500 font-medium mb-3">
              Sign in to review today's queue
            </p>

            <div className="inline-flex items-center justify-center gap-2 w-48 py-2 rounded-full bg-[#187fe5] text-white font-bold text-lg md:text-lg shadow-[0_7px_14px_rgba(20,107,214,0.25)] group-hover:translate-x-1 transition-transform">
              <span>Continue</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="absolute bottom-1 md:bottom-2 left-0 right-0 w-full max-w-4xl mx-auto flex flex-col items-center text-center text-slate-400 text-xs md:text-sm font-medium">
        <span>AI-powered clinical intake and patient management system.</span>
        <span className="mt-2">Powered by NivaKiosk</span>
      </footer>
    </div>
  );
};
