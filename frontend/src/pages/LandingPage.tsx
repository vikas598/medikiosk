import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Stethoscope, ChevronRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 max-w-6xl mx-auto w-full">
      {/* Subtitle Under Logo */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-100 tracking-tight">
          Tell us who’s <span className="text-[#16d9b5]">checking in</span> today
        </h2>
      </div>

      {/* Main Container Box matching Screenshot 1 */}
      <div className="bg-[#123e50]/90 backdrop-blur-md rounded-[2.5rem] p-5 md:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-[#2b6072] w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PATIENT OPTION CARD */}
          <button
            type="button"
            onClick={() => navigate('/patient')}
            className="group flex flex-col items-center justify-center text-center p-6 md:p-10 min-h-[280px] md:min-h-[348px] rounded-3xl bg-gradient-to-br from-[#d7fff7] via-[#e9fffc] to-[#c9f5ed] hover:brightness-105 border border-[#c1f1e8] shadow-[0_10px_24px_rgba(0,0,0,0.16)] hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-[#18d9b2] to-[#07a995] text-white flex items-center justify-center shadow-[0_8px_18px_rgba(0,169,149,0.35)] group-hover:scale-105 transition-transform duration-300 mb-5">
              <User className="w-10 h-10 md:w-12 md:h-12 stroke-[2]" />
            </div>

            <h3 className="text-3xl md:text-4xl font-extrabold text-[#071822] tracking-tight mb-2">
              Patient
            </h3>

            <p className="text-lg md:text-xl text-slate-500 font-medium mb-5">
              Enter your token to begin your visit
            </p>

            <div className="inline-flex items-center justify-center gap-2 w-56 py-3 rounded-full bg-[#11bea7] text-white font-bold text-lg md:text-xl shadow-[0_7px_14px_rgba(8,147,131,0.25)] group-hover:translate-x-1 transition-transform">
              <span>Continue</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </button>

          {/* DOCTOR OPTION CARD */}
          <button
            type="button"
            onClick={() => navigate('/doctor')}
            className="group flex flex-col items-center justify-center text-center p-6 md:p-10 min-h-[280px] md:min-h-[348px] rounded-3xl bg-gradient-to-br from-[#dcecff] via-[#eff6ff] to-[#c8dcf6] hover:brightness-105 border border-[#c6ddf7] shadow-[0_10px_24px_rgba(0,0,0,0.16)] hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-[#1686ed] to-[#0964ca] text-white flex items-center justify-center shadow-[0_8px_18px_rgba(20,112,220,0.35)] group-hover:scale-105 transition-transform duration-300 mb-5">
              <Stethoscope className="w-10 h-10 md:w-12 md:h-12 stroke-[2]" />
            </div>

            <h3 className="text-3xl md:text-4xl font-extrabold text-[#071822] tracking-tight mb-2">
              Doctor
            </h3>

            <p className="text-lg md:text-xl text-slate-500 font-medium mb-5">
              Sign in to review today's queue
            </p>

            <div className="inline-flex items-center justify-center gap-2 w-56 py-3 rounded-full bg-[#187fe5] text-white font-bold text-lg md:text-xl shadow-[0_7px_14px_rgba(20,107,214,0.25)] group-hover:translate-x-1 transition-transform">
              <span>Continue</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="w-full max-w-5xl flex flex-col items-center pt-6 text-center text-slate-400 text-xs md:text-sm font-medium">
        <span>AI-powered clinical intake and patient management system.</span>
        <span className="mt-2">Powered by NivaKiosk</span>
      </footer>
    </div>
  );
};
