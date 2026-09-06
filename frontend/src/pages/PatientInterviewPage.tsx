import React, { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, Send, CheckCircle2, Loader2, ArrowRight, FileUp, FileText, AlertCircle, Mic, MicOff } from 'lucide-react';
import { submitTurn, finalizeSession, transcribeAudio } from '../lib/api';
import type { SessionResponse, StructuredSummary } from '../lib/types';

export const PatientInterviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const session: SessionResponse | null =
    location.state?.session ||
    (localStorage.getItem('niva_current_session')
      ? JSON.parse(localStorage.getItem('niva_current_session')!)
      : null);

  const [currentQuestion, setCurrentQuestion] = useState<string>(
    'What brings you to the hospital today?'
  );
  const [touchOptions, setTouchOptions] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string>('');
  const [turnIndex, setTurnIndex] = useState<number>(1);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [skipLoading, setSkipLoading] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [summary, setSummary] = useState<StructuredSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitInFlight = useRef(false);

  const startRecording = async () => {
    try {
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all mic tracks so the browser mic indicator turns off
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (!session) return;

        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(session.id, audioBlob);
          if (text.trim()) {
            setAnswer((prev) => (prev ? prev + ' ' + text : text));
          } else {
            setErrorMsg('Could not hear anything. Please try again. / Kuch sunai nahi diya, dobara try karein.');
          }
        } catch (err) {
          console.error('Transcription error:', err);
          setErrorMsg('Voice transcription failed. Please type your answer. / Awaaz nahi samajh aaya, type karein.');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      // Auto-stop after 30 seconds
      recordingTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 30000);
    } catch (err) {
      console.error('Mic access error:', err);
      setErrorMsg('Microphone access denied. Please allow mic permission. / Mic ki permission dein.');
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleNextTurn = async (responseVal?: string) => {
    const textToSubmit = responseVal || answer;
    if (!textToSubmit.trim() || !session || submitInFlight.current) return;

    const isSkip = textToSubmit === '[Skipped by patient]';
    submitInFlight.current = true;
    setSubmitLoading(!isSkip);
    setSkipLoading(isSkip);

    try {
      setErrorMsg('');
      const res = await submitTurn(session.id, textToSubmit, currentQuestion);
      setAnswer('');

      if (res.is_complete || !res.question) {
        setIsComplete(true);
        setSummaryLoading(true);
        try {
          const finalRes = await finalizeSession(session.id);
          setSummary(finalRes.summary);
        } finally {
          setSummaryLoading(false);
        }
      } else {
        setCurrentQuestion(res.question);
        setTouchOptions(res.touch_options || []);
        setTurnIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Turn submission error:', err);
      setErrorMsg('Something went wrong. Please try again. / Kuch gadbad ho gayi, dobara try karein.');
    } finally {
      submitInFlight.current = false;
      setSubmitLoading(false);
      setSkipLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="p-8 text-center">
        <button onClick={() => navigate('/patient')} className="btn-primary">
          Return to Patient Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between items-center px-4 pb-6 max-w-4xl mx-auto w-full">
      {/* Header Banner */}
      <div className="w-full bg-[#0C3B4A] text-white p-4 md:p-5 rounded-3xl shadow-xl flex items-center justify-between border-b-4 border-[#00C9A7]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#00C9A7] text-slate-950 flex items-center justify-center font-black text-2xl">
            Q{turnIndex}
          </div>
          <div>
            <h3 className="text-2xl font-bold">Patient Intake Interview</h3>
            <p className="text-cyan-200">Patient: {session.patients?.name || 'Session ' + session.token}</p>
          </div>
        </div>


      </div>

      {/* Main Card */}
      <div className="kiosk-card w-full p-6 md:p-8 rounded-[2.5rem] shadow-2xl border-4 border-teal-500/20 bg-white my-4">
        {!isComplete ? (
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[#00A389] font-extrabold text-xl">
                <HelpCircle className="w-8 h-8" />
                <span>QUESTION FOR PATIENT</span>
              </div>
              <h2 key={turnIndex} className="question-enter text-3xl md:text-4xl font-black text-[#0C3B4A] leading-tight">
                {currentQuestion}
              </h2>
            </div>

            {/* Quick Touch Option Chips */}
            {touchOptions.length > 0 && (
              <div className="flex flex-wrap gap-4 pt-2">
                {touchOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleNextTurn(opt)}
                    disabled={submitLoading || skipLoading || isRecording || isTranscribing}
                    className="py-4 px-8 rounded-2xl bg-teal-50 hover:bg-[#00C9A7] hover:text-slate-950 text-[#0C3B4A] font-bold text-xl border-2 border-teal-200 shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-lg font-medium">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Response Input */}
            <div className="space-y-4 pt-4">
              {/* Mic Button */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={submitLoading || skipLoading || isTranscribing}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : 'bg-[#0C3B4A] hover:bg-slate-700'
                  }`}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-7 h-7 text-white" />
                  ) : (
                    <Mic className="w-7 h-7 text-white" />
                  )}
                </button>
                <span className="text-lg font-medium text-slate-600">
                  {isTranscribing
                    ? 'Transcribing... / Samajh raha hai...'
                    : isRecording
                      ? 'Listening... Tap to stop / Sun raha hai... Rokne ke liye dabayein'
                      : 'Tap to speak / Bolne ke liye dabayein'}
                </span>
              </div>

              <textarea
                rows={2}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer or use the mic above to speak / Jawab likhen ya upar mic se bolein..."
                className="w-full p-4 rounded-2xl border-2 border-slate-300 focus:border-[#00C9A7] text-xl font-medium text-slate-900 bg-slate-50 outline-none shadow-inner resize-none"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => handleNextTurn()}
                  disabled={submitLoading || skipLoading || isRecording || isTranscribing || !answer.trim()}
                  className="md:col-span-3 h-16 bg-gradient-to-r from-[#0D9488] to-[#059669] hover:from-teal-700 hover:to-emerald-700 active:scale-98 disabled:opacity-50 text-white font-black text-xl rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3"
                >
                  {submitLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <>
                      <span>SUBMIT ANSWER</span>
                      <Send className="w-7 h-7" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleNextTurn('[Skipped by patient]')}
                  disabled={submitLoading || skipLoading || isRecording || isTranscribing}
                  className="md:col-span-3 h-12 border-2 border-slate-300 hover:border-slate-500 text-slate-700 font-bold text-base rounded-2xl transition-all disabled:opacity-50"
                >
                  {skipLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Skipping question...
                    </>
                  ) : "I'm not comfortable with this question — skip"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Intake Completion & Structured Summary */
          <div className="text-center space-y-8 py-4">
            <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-16 h-16" />
            </div>

            <div>
              <h2 className="text-4xl font-black text-[#0C3B4A]">Your problem has been recorded</h2>
              <p className="text-2xl text-slate-600 font-medium mt-2">
                Thank you. The doctor will review your information shortly.
              </p>
            </div>

            {summaryLoading && (
              <div className="flex flex-col items-center gap-4 py-6">
                <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
                <p className="text-2xl font-bold text-[#0C3B4A]">Aapki jaanch ho rahi hai...</p>
                <p className="text-lg text-slate-500">Generating your clinical summary / Summary tayyar ho raha hai</p>
              </div>
            )}

            {!summaryLoading && summary && (
              <div className="text-left space-y-6">
                {/* Hindi Summary */}
                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-200 space-y-3">
                  <h4 className="font-bold text-xl text-orange-900 border-b border-orange-200 pb-2">Hindi Summary</h4>
                  {summary.points.map((point, i) => (
                    <p key={i} className="text-lg text-orange-900">• {point.hi}</p>
                  ))}
                </div>

                {/* English Summary */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-xl text-[#0C3B4A] border-b border-slate-200 pb-2 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-teal-600" />
                    <span>Clinical Summary (English)</span>
                  </h4>
                  {summary.points.map((point, i) => (
                    <p key={i} className="text-lg text-slate-800">• {point.en}</p>
                  ))}
                </div>

                {/* Red Flags */}
                {summary.red_flags.length > 0 && (
                  <div className="bg-red-50 rounded-3xl p-6 border border-red-200">
                    <p className="font-bold text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Red Flags
                    </p>
                    <ul className="mt-2 space-y-1">
                      {summary.red_flags.map((flag, i) => (
                        <li key={i} className="text-red-600 text-lg">• {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Document Upload Secondary Action before returning home */}
            <div className="pt-2 flex flex-col md:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate('/patient/documents', { state: { session } })}
                className="flex-1 py-5 bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold text-xl rounded-2xl border border-teal-300 transition-all flex items-center justify-center gap-2"
              >
                <FileUp className="w-6 h-6 text-teal-600" />
                <span>Upload Medical Documents</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 py-5 bg-[#0C3B4A] text-white font-black text-xl rounded-2xl shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>FINISH & RETURN TO HOME</span>
                <ArrowRight className="w-7 h-7" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
