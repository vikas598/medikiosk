import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { DoctorAuthPage } from './pages/DoctorAuthPage';
import { PatientTokenPage } from './pages/PatientTokenPage';
import { PatientConsentPage } from './pages/PatientConsentPage';
import { PatientInterviewPage } from './pages/PatientInterviewPage';
import { DoctorDashboardPage } from './pages/DoctorDashboardPage';
import { KioskDocumentUploadPage } from './pages/KioskDocumentUploadPage';
import { MobileUploadPage } from './pages/MobileUploadPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#071822] text-slate-900 font-sans selection:bg-[#0D9488] selection:text-white">
        {/* Render Main Header except on standalone Mobile Upload route */}
        <Routes>
          <Route path="/mobile-upload/:token" element={null} />
          <Route path="*" element={<Header />} />
        </Routes>

        {/* Dynamic Route Pages */}
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/doctor" element={<DoctorAuthPage />} />
            <Route path="/doctor/signup" element={<DoctorAuthPage />} />
            <Route path="/doctor/dashboard" element={<DoctorDashboardPage />} />
            <Route path="/patient" element={<PatientTokenPage />} />
            <Route path="/patient/consent" element={<PatientConsentPage />} />
            <Route path="/patient/interview" element={<PatientInterviewPage />} />
            <Route path="/patient/documents" element={<KioskDocumentUploadPage />} />
            <Route path="/mobile-upload/:token" element={<MobileUploadPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
