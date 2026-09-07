import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPatient } from '../../lib/api';
import ReceptionTokenSlip from './TokenSlip';

export const ReceptionRegister: React.FC = () => {
  const [form, setForm] = useState({
    name: '', age: '', gender: 'M', phone: '',
    department: 'General Medicine', language: 'en'
  });
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (form.phone && form.phone.length !== 10) { setError('Phone number must be exactly 10 digits'); return; }

    setLoading(true);
    setError('');
    try {
      const data = await registerPatient({
        ...form,
        phone: form.phone ? `+91${form.phone}` : undefined,
        age: form.age ? parseInt(form.age) : null,
      });
      setGeneratedToken(data);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      setError(errorObj?.response?.data?.detail || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (generatedToken) {
    return <ReceptionTokenSlip data={generatedToken} onDone={() => navigate('/reception/dashboard')} />;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 pb-6 w-full bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <div className="mb-8 mt-4 drop-shadow-xl">
        <img src="/orange.png" alt="NivaKiosk Logo" className="h-16 md:h-20 w-auto object-contain" />
      </div>
      <div className="max-w-2xl w-full">
        <button onClick={() => navigate('/reception/dashboard')}
          className="text-amber-600 hover:text-amber-800 mb-6 flex items-center gap-2 font-medium transition-colors">
          <span className="text-xl">←</span> Back to Dashboard
        </button>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-8 md:p-10 border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-2xl">
              🏥
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Register New Patient</h1>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} required
                onChange={e => {
                  const val = e.target.value.replace(/[^A-Za-z\s]/g, '');
                  setForm({ ...form, name: val });
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all font-medium"
                placeholder="E.g., Ramesh Kumar"
                autoFocus />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Age</label>
                <input type="number" value={form.age} min="0" max="120"
                  onChange={e => setForm({ ...form, age: e.target.value })}
                  placeholder="Years"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Gender</label>
                <div className="flex gap-2">
                  {['M', 'F', 'O'].map(g => (
                    <button key={g} type="button"
                      onClick={() => setForm({ ...form, gender: g })}
                      className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all ${
                        form.gender === g ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                      {g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number</label>
              <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
                <span className="flex items-center justify-center px-4 bg-slate-100 border-r border-slate-200 text-slate-600 font-bold">
                  +91
                </span>
                <input type="text" value={form.phone} minLength={10} maxLength={10}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setForm({ ...form, phone: val });
                  }}
                  placeholder="9876543210"
                  className="w-full px-4 py-3 bg-transparent focus:outline-none font-medium text-slate-900" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Department</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['General Medicine', 'Cardiology', 'Ayurveda'].map(dept => (
                  <button key={dept} type="button"
                    onClick={() => setForm({ ...form, department: dept })}
                    className={`p-3 border-2 rounded-xl font-bold transition-all ${
                      form.department === dept ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Language Preference</label>
              <div className="flex gap-3">
                {[{ code: 'en', label: 'English' }, { code: 'hi', label: 'Hindi' }].map(l => (
                  <button key={l.code} type="button"
                    onClick={() => setForm({ ...form, language: l.code })}
                    className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all ${
                      form.language === l.code ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ABHA/Aadhaar stubs for architectural readiness */}
            <div className="border-t border-gray-100 pt-6 mt-6">
              <p className="text-sm font-semibold text-gray-400 mb-3">Optional identity linkage (coming soon)</p>
              <div className="flex gap-3">
                <button type="button" disabled className="flex-1 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-400 font-medium cursor-not-allowed">
                  Link ABHA ID
                </button>
                <button type="button" disabled className="flex-1 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-400 font-medium cursor-not-allowed">
                  Verify with Aadhaar
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-100 mt-4">
                {error}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 pt-6 mt-2">
              <button type="button" onClick={() => navigate('/reception/dashboard')}
                className="flex-1 py-4 border-2 border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-[2] py-4 bg-amber-600 text-white rounded-xl font-bold text-lg hover:bg-amber-700 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(217,119,6,0.3)] hover:shadow-[0_6px_20px_rgba(217,119,6,0.4)] transition-all flex items-center justify-center">
                {loading ? 'Registering...' : 'Register & Generate Token'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
