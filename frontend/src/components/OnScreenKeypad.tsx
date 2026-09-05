import React from 'react';
import { Delete } from 'lucide-react';

interface KeypadProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onClear: () => void;
  mode?: 'numeric' | 'alphanumeric';
}

export const OnScreenKeypad: React.FC<KeypadProps> = ({
  onKeyPress,
  onDelete,
}) => {
  const numericKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="w-full max-w-sm mx-auto select-none space-y-3">
      {/* 3x3 Top Grid */}
      <div className="grid grid-cols-3 gap-3">
        {numericKeys.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onKeyPress(num)}
            className="h-16 bg-[#F1F5F9] hover:bg-slate-200 active:bg-slate-300 active:scale-95 text-[#0A1926] font-extrabold text-2xl rounded-2xl transition-all flex items-center justify-center shadow-sm"
          >
            {num}
          </button>
        ))}
      </div>

      {/* Bottom Row: Empty, 0, Backspace */}
      <div className="grid grid-cols-3 gap-3">
        <div className="h-16" />

        <button
          type="button"
          onClick={() => onKeyPress('0')}
          className="h-16 bg-[#F1F5F9] hover:bg-slate-200 active:bg-slate-300 active:scale-95 text-[#0A1926] font-extrabold text-2xl rounded-2xl transition-all flex items-center justify-center shadow-sm"
        >
          0
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="h-16 bg-[#F1F5F9] hover:bg-rose-100 active:scale-95 text-slate-700 hover:text-rose-600 font-bold rounded-2xl transition-all flex items-center justify-center shadow-sm"
        >
          <Delete className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
