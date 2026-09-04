import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="w-full flex flex-col items-center justify-center pt-8 pb-4 z-10 logo-glow">
      <div 
        onClick={() => navigate('/')}
        className="relative z-10 w-28 h-28 md:w-32 md:h-32 bg-white rounded-3xl p-3 shadow-2xl flex items-center justify-center cursor-pointer border border-slate-100/60 hover:scale-105 transition-transform"
      >
        <img
          src="/logo.png"
          alt="NivaKiosk Logo"
          className="w-full h-full object-contain"
        />
      </div>
    </header>
  );
};
