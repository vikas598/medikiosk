import React, { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, FolderPlus, Trash2, CheckCircle2, FileText, Loader2, KeyRound, ArrowRight } from 'lucide-react';
import { documentService } from '../lib/documentService';

interface FilePreviewItem {
  id: string;
  file: File;
  previewUrl?: string;
}

export const MobileUploadPage: React.FC = () => {
  const { token } = useParams<{ token: string }>(); // This is the handoff_token

  // Verification State
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [patientToken, setPatientToken] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [uploadClaimToken, setUploadClaimToken] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<FilePreviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Verification Handler
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientToken.trim()) return;
    
    setVerifying(true);
    setErrorMsg(null);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE}/mobile/document-handoff/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handoff_token: token,
          patient_token: patientToken.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setUploadClaimToken(data.upload_claim_token);
        setIsVerified(true);
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || 'Verification failed. Please check your token.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error. Could not verify token.');
    } finally {
      setVerifying(false);
    }
  };

  // File Selection Handler
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const filesArray = Array.from(e.target.files);
    const newItems: FilePreviewItem[] = filesArray.map((file) => {
      const isImage = file.type.startsWith('image/');
      return {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      };
    });

    setSelectedFiles((prev) => [...prev, ...newItems]);
    setErrorMsg(null);

    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  // Remove File Handler
  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  // Submit Upload Handler
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setErrorMsg('Please select or capture at least one document before uploading.');
      return;
    }

    if (!token) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Upload files one by one (or as multiple depending on API, API expects one by one)
      let allSuccess = true;
      for (const item of selectedFiles) {
        const formData = new FormData();
        formData.append('file', item.file);
        
        const res = await fetch(`${API_BASE}/mobile/upload?handoff_token=${token}`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          const err = await res.json();
          setErrorMsg(err.detail || 'Failed to upload some documents.');
          allSuccess = false;
          break;
        }
      }

      if (allSuccess) {
        setSuccess(true);
      }
    } catch (err) {
      setErrorMsg('Failed to upload documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071822] text-slate-900 flex flex-col justify-between p-4 md:p-6 font-sans">
      {/* Mobile Top Header with NivaKiosk Branding */}
      <header className="w-full text-center pt-4 pb-6">
        <div className="inline-flex items-center justify-center bg-white p-3 rounded-2xl shadow-xl mb-3 border border-white/20">
          <img src="/logo.png" alt="NivaKiosk Logo" className="h-10 w-auto object-contain" />
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">
          Niva<span className="text-[#0D9488]">Kiosk</span> Medical Upload
        </h1>
      </header>

      {/* Main Mobile Upload Container Card */}
      <main className="flex-1 max-w-md w-full mx-auto bg-white rounded-3xl p-6 shadow-2xl space-y-6 my-auto">
        
        {!isVerified ? (
          /* VERIFICATION STEP */
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-600 mx-auto flex items-center justify-center mb-4">
                <KeyRound className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-[#0A1926]">
                Verify Patient Token
              </h2>
              <p className="text-slate-500 text-sm font-medium">
                Enter the same 3 or 4 digit token you used on the kiosk to continue.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-sm font-semibold text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={patientToken}
                  onChange={(e) => setPatientToken(e.target.value.toUpperCase())}
                  placeholder="e.g. 001"
                  maxLength={4}
                  className="w-full text-center text-4xl font-black text-slate-800 tracking-[0.2em] p-4 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={verifying || !patientToken}
                className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-lg rounded-2xl shadow-lg active:scale-95 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
              >
                {verifying ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span>VERIFY TOKEN</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : !success ? (
          <>
            {/* Title & Instructions */}
            <div className="space-y-1 text-center">
              <h2 className="text-2xl font-extrabold text-[#0A1926]">
                Upload Medical Documents
              </h2>
              <p className="text-slate-500 text-sm font-medium">
                Upload your medical reports, prescriptions, scans, or other relevant documents.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-sm font-semibold">
                {errorMsg}
              </div>
            )}

            {/* ACTION BUTTONS: CAMERA & GALLERY */}
            <div className="space-y-3 pt-2">
              {/* Hidden File Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {/* 📷 TAKE PHOTO BUTTON */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full py-4 px-6 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-98 text-white font-bold text-lg rounded-2xl shadow-md transition-all flex items-center justify-center gap-3"
              >
                <Camera className="w-6 h-6" />
                <span>📷 TAKE PHOTO</span>
              </button>

              {/* 📁 CHOOSE FROM PHONE BUTTON */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full py-4 px-6 bg-[#F1F5F9] hover:bg-slate-200 active:scale-98 text-slate-800 font-bold text-lg rounded-2xl transition-all flex items-center justify-center gap-3 border border-slate-200"
              >
                <FolderPlus className="w-6 h-6 text-teal-700" />
                <span>📁 CHOOSE FROM PHONE</span>
              </button>
            </div>

            {/* SELECTED DOCUMENTS PREVIEW LIST */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Selected Documents ({selectedFiles.length})
                </h3>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedFiles.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt="Preview"
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}

                        <div className="truncate">
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {item.file.name}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {(item.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      {/* Large Touch-friendly Remove Control */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.id)}
                        className="w-10 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-90 text-rose-600 flex items-center justify-center transition-all shrink-0"
                        title="Remove file"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* UPLOAD BUTTON */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleUpload}
                disabled={loading || selectedFiles.length === 0}
                className={`w-full py-4.5 rounded-2xl font-black text-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                  loading || selectedFiles.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-[#0D9488] to-[#059669] hover:from-teal-700 hover:to-emerald-700 active:scale-98 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                    <span>UPLOADING DOCUMENTS...</span>
                  </>
                ) : (
                  <span>UPLOAD DOCUMENTS</span>
                )}
              </button>
            </div>
          </>
        ) : (
          /* SUCCESS STATE */
          <div className="text-center space-y-6 py-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-[#0A1926]">
                Documents Uploaded Successfully!
              </h2>
              <p className="text-slate-600 text-base font-medium">
                Your medical files have been attached to your kiosk visit session. You may now return to the kiosk screen to continue.
              </p>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setSelectedFiles([]);
                }}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold rounded-2xl text-base transition-all"
              >
                Upload Additional Files
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-slate-500 text-xs font-medium">
        Secure Encrypted Document Gateway • NivaKiosk
      </footer>
    </div>
  );
};
