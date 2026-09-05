import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { FileUp, ArrowLeft, Smartphone, ExternalLink } from 'lucide-react';

export const KioskDocumentUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const session =
    location.state?.session ||
    (localStorage.getItem('niva_current_session')
      ? JSON.parse(localStorage.getItem('niva_current_session')!)
      : null);

  const sessionId = session?.id;

  const [handoffToken, setHandoffToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Construct absolute Mobile Upload URL using env var or fallback
  const baseUrl = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
  const mobileUploadPath = handoffToken ? `/mobile-upload/${handoffToken}` : '';
  const fullUploadUrl = handoffToken ? `${baseUrl}${mobileUploadPath}` : '';

  // Initialize handoff
  useEffect(() => {
    if (!sessionId) {
      setErrorMsg("Session not found.");
      return;
    }

    const initHandoff = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_BASE}/kiosk/sessions/${sessionId}/document-handoff`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error("Failed to create handoff");
        const data = await res.json();
        setHandoffToken(data.handoff_token);
      } catch (err) {
        console.error(err);
        setErrorMsg("Could not connect to backend to create upload link.");
      }
    };
    initHandoff();
  }, [sessionId]);

  // Poll for handoff status
  useEffect(() => {
    if (!handoffToken) return;

    let intervalId: ReturnType<typeof setInterval>;

    const checkStatus = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_BASE}/kiosk/document-handoff/${handoffToken}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'claimed' || data.status === 'verified') {
            // Mobile has verified the token, clean up and go to landing page
            localStorage.removeItem('niva_current_session');
            clearInterval(intervalId);
            // Navigate to home immediately
            navigate('/', { replace: true });
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    intervalId = setInterval(checkStatus, 3000);
    return () => clearInterval(intervalId);
  }, [handoffToken, navigate]);

  return (
    <div className="flex-1 flex flex-col justify-between items-center px-4 pb-12 w-full max-w-5xl mx-auto">
      {/* Top Header Controls */}
      <div className="w-full flex items-center justify-between mb-4 z-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-slate-200/80 hover:bg-slate-300 active:scale-95 text-slate-800 font-bold px-6 py-3.5 rounded-2xl shadow-sm text-lg md:text-xl transition-all"
        >
          <ArrowLeft className="w-7 h-7" />
          <span>BACK</span>
        </button>

        <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-5 py-2.5 rounded-2xl border border-emerald-500/30 shadow-sm font-bold text-lg">
          <FileUp className="w-6 h-6 text-emerald-400" />
          <span>Document Upload Portal</span>
        </div>
      </div>

      {/* Main Kiosk QR Card */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl max-w-3xl w-full text-center space-y-8 border border-slate-100">
        
        {/* Title & Large Icon */}
        <div className="space-y-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white mx-auto flex items-center justify-center shadow-lg mb-4">
            <FileUp className="w-10 h-10 stroke-[2.5]" />
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-[#0A1926] tracking-tight">
            Upload Medical Documents
          </h1>

          <p className="text-xl md:text-2xl text-[#0D9488] font-bold">
            Scan this QR code with your phone to upload your documents
          </p>

          <p className="text-base md:text-lg text-slate-500 max-w-xl mx-auto font-medium">
            You can upload physical prescriptions, lab test reports, X-rays, or previous medical records directly from your mobile phone camera or files.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* LARGE QR CODE BOX */}
        {handoffToken ? (
          <div className="bg-[#F8FAFC] border-2 border-dashed border-teal-500/40 p-6 md:p-8 rounded-3xl inline-block shadow-inner">
            <div className="bg-white p-4 rounded-2xl shadow-md inline-block">
              <QRCodeSVG
                value={fullUploadUrl}
                size={260}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-slate-600 font-semibold text-sm">
              <Smartphone className="w-5 h-5 text-teal-600" />
              <span>Open phone camera & point at QR code</span>
            </div>

            {/* Desktop Direct Link Helper for Testing */}
            <div className="mt-3">
              <a
                href={mobileUploadPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-teal-700 hover:text-teal-900 font-bold text-sm bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl border border-teal-200 transition-colors"
              >
                <span>Test Mobile Upload Page in New Tab</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : !errorMsg ? (
          <div className="text-slate-500 font-medium">Generating QR Code...</div>
        ) : null}

        {/* Removed local document list and manual continue button, since Kiosk now auto-redirects on verification */}

      </div>
    </div>
  );
};
