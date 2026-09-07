import { Printer, Check } from 'lucide-react';

interface TokenSlipProps {
  data: Record<string, any>;
  onDone: () => void;
}

export default function ReceptionTokenSlip({ data, onDone }: TokenSlipProps) {
  const { patient, session } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 w-full print:bg-white print:p-0">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full print:shadow-none print:max-w-none print:w-auto print:mx-auto">
        
        {/* Slip content - printable area */}
        <div className="p-10 border-b-2 border-dashed border-gray-200 print:border-none print:p-8">
          <div className="text-center mb-8 flex flex-col items-center">
            <h2 className="text-2xl font-extrabold text-[#0A1926] tracking-tight">NivaKiosk</h2>
            <p className="text-sm font-medium text-gray-500 mt-1 uppercase tracking-wider">Patient Token</p>
          </div>

          <div className="text-center mb-10 py-8 bg-amber-50/50 rounded-3xl border border-amber-100/50 print:bg-transparent print:border-none print:py-4">
            <p className="text-[6rem] leading-none font-black text-amber-600 tracking-tighter drop-shadow-sm print:text-black">
              {session.token}
            </p>
          </div>

          <div className="space-y-3 text-center mb-8">
            <p className="text-2xl font-extrabold text-gray-900">{patient.name}</p>
            <p className="text-gray-500 font-medium text-lg">
              {patient.age ? `${patient.age} years ` : ''}
              {patient.gender ? `• ${patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}` : ''}
            </p>
            <div className="inline-block px-4 py-1.5 bg-gray-100 rounded-full font-bold text-gray-700 mt-2 print:border print:border-gray-300 print:bg-transparent">
              {session.department}
            </div>
          </div>

          <div className="pt-8 border-t border-dashed border-gray-200 print:pt-6">
            <p className="text-sm font-medium text-gray-600 text-center">
              Please proceed to the patient kiosk and enter your token number.
            </p>
            <p className="text-xs font-semibold text-gray-400 text-center mt-3 uppercase tracking-wider">
              Valid until {new Date(session.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Actions - hidden when printing */}
        <div className="p-6 flex flex-col sm:flex-row gap-3 print:hidden bg-gray-50 rounded-b-[2rem]">
          <button onClick={handlePrint}
            className="flex-1 py-4 border-2 border-gray-200 rounded-xl hover:bg-white hover:border-gray-300 font-bold text-gray-700 transition-all flex items-center justify-center gap-2">
            <Printer className="w-5 h-5" />
            Print Slip
          </button>
          <button onClick={onDone}
            className="flex-[1.5] py-4 bg-amber-600 text-white rounded-xl font-bold text-lg hover:bg-amber-700 shadow-[0_4px_14px_rgba(217,119,6,0.3)] hover:shadow-[0_6px_20px_rgba(217,119,6,0.4)] transition-all flex items-center justify-center gap-2">
            <Check className="w-5 h-5 stroke-[3]" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
