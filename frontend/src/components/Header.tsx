import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isPatientCompactPage = location.pathname.startsWith('/patient');

  return (
    <header className={`w-full flex flex-col items-center justify-center z-10 logo-glow ${isLandingPage ? 'pt-6 pb-1' : isPatientCompactPage ? 'pt-5 pb-1' : 'pt-10 pb-2'}`}>
      <div
        onClick={() => navigate('/')}
        className={`relative z-10 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform ${isLandingPage ? 'w-64 md:w-72' : isPatientCompactPage ? 'w-44 md:w-48' : 'w-56 md:w-64'}`}
      >
        <img
          src="/new-niva.png"
          alt="NivaKiosk Logo"
          className="w-full h-auto object-contain"
        />
        <span className="mt-3 w-full px-1 text-center text-[10px] md:text-xs leading-none font-light text-slate-100 font-sans tracking-[0.2em] whitespace-nowrap">
          Care closer to you.
        </span>
      </div>
    </header>
  );
};
