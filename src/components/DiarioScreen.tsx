import React, { useState } from 'react';
import { DiarioEntrada, Usuario } from '../types';

interface DiarioScreenProps {
  diario: DiarioEntrada[];
  usuarios: Usuario[];
  onAddEntry: (texto: string, emocion: DiarioEntrada['emocion'], visible_familia: boolean) => void;
}

export default function DiarioScreen({ diario, usuarios, onAddEntry }: DiarioScreenProps) {
  const [mood, setMood] = useState<DiarioEntrada['emocion']>('Great');
  const [text, setText] = useState<string>('');
  const [visible, setVisible] = useState<boolean>(true);
  const [recording, setRecording] = useState<boolean>(false);

  const moods: { label: string; icon: string; value: DiarioEntrada['emocion']; color: string }[] = [
    { label: 'Triste', icon: '😢', value: 'Sad', color: 'bg-blue-50 text-blue-800' },
    { label: 'Enojado', icon: '😠', value: 'Angry', color: 'bg-red-50 text-red-800' },
    { label: 'Regular', icon: '😐', value: 'Okay', color: 'bg-gray-100 text-gray-800' },
    { label: 'Bien', icon: '🙂', value: 'Good', color: 'bg-emerald-50 text-emerald-800' },
    { label: 'Excelente', icon: '😁', value: 'Great', color: 'bg-amber-50 text-amber-800' },
  ];

  const [supported] = useState<boolean>(() => {
    return typeof window !== 'undefined' && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);
  });
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  // Gemini AI Reflection state
  const [reflectionLoading, setReflectionLoading] = useState<boolean>(false);
  const [reflectionData, setReflectionData] = useState<{
    reflection: string;
    advice: string;
    activityIdea: string;
  } | null>(null);

  const handleGetReflection = async () => {
    if (!text.trim()) return;
    setReflectionLoading(true);
    try {
      const res = await fetch('/api/gemini/journal-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          emotion: mood
        })
      });
      if (res.ok) {
        const data = await res.json();
        setReflectionData(data);
      }
    } catch (e) {
      console.error("Error fetching journal reflection:", e);
    } finally {
      setReflectionLoading(false);
    }
  };

  const handleSave = () => {
    if (text.trim()) {
      onAddEntry(text.trim(), mood, visible);
      setText('');
    }
  };

  const toggleRecording = () => {
    if (!supported) return;

    if (recording) {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
      setRecording(false);
    } else {
      try {
        const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const rec = new SpeechRecognitionClass();
        rec.continuous = false;
        rec.lang = 'es-ES';
        rec.interimResults = false;

        rec.onstart = () => {
          setRecording(true);
        };

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setText((prev) => (prev ? prev + ' ' : '') + transcript);
        };

        rec.onerror = (err: any) => {
          console.error("Speech recognition error:", err);
          setRecording(false);
        };

        rec.onend = () => {
          setRecording(false);
        };

        rec.start();
        setRecognitionInstance(rec);
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
        setRecording(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Diario</h2>
        <p className="font-sans text-sm text-gray-500">¿Cómo te sientes hoy?</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entry Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Emotion Selector */}
          <div className="bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20">
            <h3 className="font-sans text-sm font-bold text-gray-700 mb-4">Estado de ánimo</h3>
            <div className="flex justify-between items-center px-1">
              {moods.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  className={`flex flex-col items-center gap-1.5 transition-all ${
                    mood === m.value ? 'scale-110' : 'opacity-50 hover:opacity-100'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm ${
                    mood === m.value ? 'border-4 border-brand-primary bg-white ring-2 ring-indigo-100' : 'bg-slate-50 border border-slate-150'
                  }`}>
                    {m.icon}
                  </div>
                  <span className={`font-sans text-[10px] font-extrabold ${mood === m.value ? 'text-brand-dark' : 'text-gray-400'}`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Textarea Container */}
          <div className="bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 relative">
            <textarea
              className="w-full h-48 bg-slate-50 rounded-2xl p-4 font-sans text-sm text-gray-900 border-none resize-none focus:ring-2 focus:ring-brand-primary outline-none"
              placeholder="Escribe tus pensamientos del día..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {/* Mic Button */}
            <div className="absolute bottom-8 right-8 group z-10">
              <button
                disabled={!supported}
                onClick={toggleRecording}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                  !supported 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-slate-200'
                    : recording 
                      ? 'bg-rose-500 text-white animate-bounce' 
                      : 'bg-brand-primary text-white hover:bg-brand-dark'
                }`}
                title={!supported ? "El dictado de voz no está soportado en este navegador" : "Grabar con voz"}
              >
                <span className="material-symbols-outlined text-xl">
                  {!supported ? 'mic_off' : recording ? 'graphic_eq' : 'mic'}
                </span>
              </button>
              {!supported && (
                <div className="absolute bottom-14 right-0 bg-slate-800 text-white text-[10px] rounded py-1.5 px-3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                  El dictado de voz no es soportado (usa Chrome, Edge o Safari)
                </div>
              )}
            </div>
          </div>

          {/* Controls & Save */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Privacy Toggle */}
            <div className="flex bg-slate-100/80 p-1 rounded-full border border-indigo-50 w-full sm:w-auto">
              <button
                onClick={() => setVisible(false)}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-full font-sans text-xs font-bold transition-all ${
                  !visible ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Solo yo
              </button>
              <button
                onClick={() => setVisible(true)}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-full font-sans text-xs font-bold transition-all ${
                  visible ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Visible para la familia
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleGetReflection}
                disabled={reflectionLoading || !text.trim()}
                className="flex-1 sm:flex-none px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full font-sans text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                {reflectionLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">sync</span>
                    Reflexionando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-amber-500 text-base">auto_awesome</span>
                    Reflexión IA (Gemini)
                  </>
                )}
              </button>

              <button
                onClick={handleSave}
                className="flex-1 sm:flex-none px-6 py-3 bg-brand-primary hover:bg-brand-dark text-white rounded-full font-sans text-sm font-bold shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                Guardar
              </button>
            </div>
          </div>

          {/* Gemini AI Reflection Card */}
          {reflectionData && (
            <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-amber-50/70 rounded-3xl p-5 border border-indigo-100 shadow-md space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-xl">auto_awesome</span>
                  <h4 className="font-sans text-sm font-bold text-indigo-950">Reflexión de Gemini IA</h4>
                </div>
                <button 
                  onClick={() => setReflectionData(null)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <p className="font-sans text-xs text-gray-800 leading-relaxed italic">
                "{reflectionData.reflection}"
              </p>

              {reflectionData.advice && (
                <div className="bg-white/80 p-3 rounded-2xl border border-indigo-100/60 text-xs text-indigo-900 flex items-start gap-2">
                  <span className="material-symbols-outlined text-indigo-600 text-base shrink-0 mt-0.5">psychology</span>
                  <div>
                    <strong>Consejo:</strong> {reflectionData.advice}
                  </div>
                </div>
              )}

              {reflectionData.activityIdea && (
                <div className="bg-amber-100/70 p-3 rounded-2xl border border-amber-200/60 text-xs text-amber-950 flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-base shrink-0 mt-0.5">favorite</span>
                  <div>
                    <strong>Idea de Conexión:</strong> {reflectionData.activityIdea}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Decor / Memories list */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-brand-light/30 border border-indigo-100/50 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <span className="font-serif absolute -top-3 -left-3 text-7xl text-brand-dark/5 select-none font-bold">“</span>
            <p className="font-sans text-sm text-brand-dark font-medium italic leading-relaxed">
              "La familia es el primer núcleo donde se aprende a amar, a perdonar y a vivir juntos."
            </p>
            <p className="font-sans text-[10px] text-brand-primary font-extrabold text-right mt-3">- Papa Francisco</p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 space-y-4">
            <h3 className="font-sans text-sm font-bold text-gray-700">Recuerdos Recientes</h3>
            <div className="grid grid-cols-2 gap-3">
              {diario.map((entry) => (
                <div key={entry.entrada_id} className="aspect-square rounded-2xl bg-gray-50 border border-slate-150 relative overflow-hidden group shadow-inner">
                  <div className="absolute inset-0 bg-cover bg-center p-3 flex flex-col justify-end bg-gradient-to-t from-gray-900/80 to-transparent">
                    <span className="text-[16px] absolute top-2 right-2">
                      {entry.emocion === 'Great' ? '😁' : entry.emocion === 'Good' ? '🙂' : entry.emocion === 'Okay' ? '😐' : entry.emocion === 'Angry' ? '😠' : '😢'}
                    </span>
                    <p className="font-sans text-[10px] text-white line-clamp-2 leading-relaxed">{entry.texto}</p>
                    <p className="font-sans text-[8px] text-gray-300 mt-1">{entry.fecha}</p>
                  </div>
                </div>
              ))}
              {/* Fallback image memories */}
              <div className="aspect-square rounded-2xl bg-gray-100 overflow-hidden relative group">
                <img
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiQmsZgkvj1QGuPwyTQDFAIBnPkoHFymeIL6pTEsukp_eRd5bC6RG65uKuCNvbv6OfZlAE9mqnXgQOGK6GgGxoB6btFYwCC0kclBVmnmK2v7sIUx7pASFjUk7C_t34BDk_QyVKbCfndiZ6BTdHxlVQeWgyG_N6r03tXrHWGrHLB7mHJFyEOrOdl6SiYFH9gep1UcvPwXb0igTGTx0Nm01-gWnklqeqzdhZRxmu8sMZUR-2e1PLtPZqNcnwr7pQBGvSlpf_C3qmSi8"
                  alt="Picnic"
                />
                <span className="absolute bottom-1.5 left-2 bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-bold text-gray-800">12/08</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
