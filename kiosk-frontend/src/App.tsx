import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { DoctorAuthPage } from './pages/DoctorAuthPage';
import { PatientTokenPage } from './pages/PatientTokenPage';
import { PatientConsentPage } from './pages/PatientConsentPage';
import { PatientInterviewPage } from './pages/PatientInterviewPage';
import { DoctorDashboardPage } from './pages/DoctorDashboardPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#F4F8FA] text-slate-900 font-sans selection:bg-[#00C9A7] selection:text-slate-950">
        {/* Main Kiosk Header */}
        <Header />

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
          </Routes>
        </main>
      </div>
    </Router>
  );
}
