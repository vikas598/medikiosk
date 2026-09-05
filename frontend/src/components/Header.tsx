import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="w-full flex flex-col items-center justify-center pt-4 pb-2 z-10 logo-glow">
      <div 
        onClick={() => navigate('/')}
        className="relative z-10 w-40 h-20 md:w-48 md:h-24 bg-white rounded-3xl p-2 shadow-2xl flex items-center justify-center cursor-pointer border border-slate-100/60 hover:scale-105 transition-transform"
      >
        <img
          src="/logo-cropped.png"
          alt="NivaKiosk Logo"
          className="w-full h-full object-contain"
        />
      </div>
    </header>
  );
};
