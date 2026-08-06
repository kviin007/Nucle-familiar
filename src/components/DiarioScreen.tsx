import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import EmptyStateIllustration from './EmptyStateIllustration';
import { DiarioEntrada, Usuario, ReaccionDiario } from '../types';

interface DiarioScreenProps {
  diario: DiarioEntrada[];
  usuarios: Usuario[];
  currentUser?: Usuario | null;
  onAddEntry: (texto: string, emocion: DiarioEntrada['emocion'], visible_familia: boolean) => void;
  onAddReaction?: (entrada_id: string, emoji: string) => void;
}

export default function DiarioScreen({ diario = [], usuarios = [], currentUser, onAddEntry, onAddReaction }: DiarioScreenProps) {
  const [mood, setMood] = useState<DiarioEntrada['emocion']>('Great');
  const [text, setText] = useState<string>('');
  const [visible, setVisible] = useState<boolean>(true);
  const [recording, setRecording] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<'all' | 'mine'>('all');
  const [showPastEntries, setShowPastEntries] = useState<boolean>(false);

  const moods: { label: string; icon: string; value: DiarioEntrada['emocion']; color: string }[] = [
    { label: 'Triste', icon: '😢', value: 'Sad', color: 'bg-blue-50 text-blue-800' },
    { label: 'Enojado', icon: '😠', value: 'Angry', color: 'bg-red-50 text-red-800' },
    { label: 'Regular', icon: '😐', value: 'Okay', color: 'bg-gray-100 text-gray-800' },
    { label: 'Bien', icon: '🙂', value: 'Good', color: 'bg-emerald-50 text-emerald-800' },
    { label: 'Excelente', icon: '😁', value: 'Great', color: 'bg-amber-50 text-amber-800' },
  ];

  const reactionEmojis = [
    { emoji: '❤️', label: 'Me encanta' },
    { emoji: '👏', label: 'Aplausos' },
    { emoji: '😂', label: 'Risas' },
    { emoji: '🔥', label: 'Genial' },
    { emoji: '🤗', label: 'Abrazo' },
  ];

  const [supported] = useState<boolean>(() => {
    return typeof window !== 'undefined' && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);
  });
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

  React.useEffect(() => {
    let interval: any = null;
    if (recording) {
      interval = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => clearInterval(interval);
  }, [recording]);

  // Gemini AI Reflection state
  const [reflectionLoading, setReflectionLoading] = useState<boolean>(false);
  const [reflectionData, setReflectionData] = useState<{
    reflection: string;
    advice: string;
    activityIdea: string;
  } | null>(null);

  // Gemini AI Journal Prompt state
  const [promptLoading, setPromptLoading] = useState<boolean>(false);
  const [promptData, setPromptData] = useState<{
    weeklySummary: string;
    questions: string[];
  } | null>(null);

  const handleGetJournalPrompt = async () => {
    setPromptLoading(true);
    try {
      const recentUserEntries = diario
        .filter(e => e.usuario_id === currentUser?.uid)
        .map(e => e.texto);

      const res = await fetch('/api/gemini/journal-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emotion: mood,
          recentEntries: recentUserEntries
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPromptData(data);
      }
    } catch (e) {
      console.error("Error fetching journal prompt:", e);
    } finally {
      setPromptLoading(false);
    }
  };

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
      setReflectionData(null);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
      setRecording(false);
      setIsTranscribing(true);
      setTimeout(() => setIsTranscribing(false), 1200);
    } else {
      setRecording(true);
      if (supported) {
        try {
          const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          const rec = new SpeechRecognitionClass();
          rec.continuous = true;
          rec.lang = 'es-ES';
          rec.interimResults = true;

          rec.onresult = (event: any) => {
            let currentTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              currentTranscript += event.results[i][0].transcript;
            }
            if (currentTranscript.trim()) {
              setText((prev) => {
                const base = prev.trim();
                return base ? `${base} ${currentTranscript.trim()}` : currentTranscript.trim();
              });
            }
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
        } catch (err) {
          console.error("Error starting speech recognition:", err);
          // Fallback to API simulation
          handleFallbackApiTranscription();
        }
      } else {
        // Fallback for browsers without WebSpeech API
        handleFallbackApiTranscription();
      }
    }
  };

  const handleFallbackApiTranscription = async () => {
    setIsTranscribing(true);
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioData: 'simulated_audio' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setText(prev => (prev ? `${prev} ${data.text}` : data.text));
        }
      }
    } catch (err) {
      console.error("API transcribe error:", err);
    } finally {
      setIsTranscribing(false);
      setRecording(false);
    }
  };

  const getAuthor = (userId: string): Usuario => {
    const found = usuarios.find(u => u.uid === userId);
    return found || {
      uid: userId,
      nombre: userId === currentUser?.uid ? currentUser.nombre : 'Familiar',
      avatar_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop',
      familia_id: '',
      racha_actual: 0,
      puntos: 0,
      configuracion_privacidad: { visible_familia_por_defecto: true }
    };
  };

  // Demo fallback journal entries if database is empty
  const displayDiario: DiarioEntrada[] = diario.length > 0 ? diario : [
    {
      entrada_id: 'demo_1',
      usuario_id: usuarios[0]?.uid || 'user_1',
      texto: '¡Hoy la cena en familia estuvo riquísima y jugamos juegos de mesa juntas! Me hizo muy feliz compartir esta noche sin pantallas.',
      emocion: 'Great',
      visible_familia: true,
      fecha: new Date().toISOString().split('T')[0],
      reacciones: [
        { usuario_id: currentUser?.uid || 'user_2', emoji: '❤️' },
        { usuario_id: 'user_3', emoji: '👏' }
      ]
    },
    {
      entrada_id: 'demo_2',
      usuario_id: usuarios[1]?.uid || 'user_2',
      texto: 'Completé todas mis tareas escolares de la semana antes del viernes. ¡Me siento con mucha energía para el fin de semana!',
      emocion: 'Good',
      visible_familia: true,
      fecha: new Date().toISOString().split('T')[0],
      reacciones: [
        { usuario_id: currentUser?.uid || 'user_1', emoji: '🔥' }
      ]
    }
  ];

  const filteredEntries = displayDiario.filter(entry => {
    if (filterTab === 'mine') {
      return entry.usuario_id === currentUser?.uid;
    }
    return entry.visible_familia || entry.usuario_id === currentUser?.uid;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 font-sans text-xs font-semibold mb-3 border border-white/10">
              <span className="material-symbols-outlined text-sm">auto_stories</span>
              Diario y Reflexiones
            </div>
            <h2 className="font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Diario Emocional Compartido
            </h2>
            <p className="font-sans text-xs sm:text-sm text-indigo-200 mt-1 max-w-xl">
              Escribe cómo te sientes hoy, recibe orientaciones de IA y conecta con tus seres queridos dejando reacciones cariñosas.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shrink-0 self-start md:self-center">
            <div className="text-right">
              <p className="font-sans text-[10px] uppercase font-bold text-indigo-300">Entradas Familiares</p>
              <p className="font-sans text-lg font-black text-white">{filteredEntries.length}</p>
            </div>
            <span className="material-symbols-outlined text-amber-400 text-3xl">favorite</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Entry Form & Journal Feed */}
        <div className="lg:col-span-8 space-y-8">
          {/* Editor Card */}
          <div className="bg-white rounded-3xl p-6 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-sans text-base font-extrabold text-brand-dark flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-primary">edit_note</span>
                ¿Cómo te sientes hoy?
              </h3>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGetJournalPrompt}
                  disabled={promptLoading}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:opacity-95 text-white rounded-full font-sans text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Obtener preguntas e ideas para reflexionar en tu diario de hoy"
                >
                  {promptLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xs">sync</span>
                      <span>Generando idea...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xs text-amber-200">auto_awesome</span>
                      <span>✨ Ayúdame a reflexionar</span>
                    </>
                  )}
                </button>
                <span className="font-sans text-xs text-gray-400 font-medium hidden md:inline">
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>

            {/* Inspirational Reflection Helper Card (Contextual AI) */}
            {promptData && (
              <div className="bg-gradient-to-br from-amber-50/90 via-purple-50/80 to-indigo-50/90 p-4 rounded-2xl border border-amber-200 space-y-3 animate-fade-in shadow-xs">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-lg">auto_awesome</span>
                    <h4 className="font-sans text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Guía para tu Reflexión de Hoy
                    </h4>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setPromptData(null)} 
                    className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>

                {promptData.weeklySummary && (
                  <p className="font-sans text-xs text-amber-900 font-medium italic leading-snug">
                    "{promptData.weeklySummary}"
                  </p>
                )}

                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900">
                    Preguntas e ideas para inspirar tu diario:
                  </p>
                  <ul className="space-y-1.5">
                    {promptData.questions.map((q, idx) => (
                      <li 
                        key={idx} 
                        className="bg-white/90 p-2.5 rounded-xl border border-purple-100/80 text-xs text-gray-800 font-medium flex items-center justify-between gap-2 shadow-2xs hover:bg-white transition-all"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{q}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            // Append quote header as a prompt header without replacing text
                            setText(prev => prev ? `${prev}\n\n[Reflexión: ${q}]\n` : `[Reflexión: ${q}]\n`);
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline shrink-0 cursor-pointer"
                          title="Usar esta pregunta como encabezado de tu entrada"
                        >
                          Usar tema
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-gray-400 italic pt-1">
                    * Gemini no escribirá la entrada por ti. Selecciona un tema o responde en tus propias palabras a continuación.
                  </p>
                </div>
              </div>
            )}

            {/* Mood Selector */}
            <div className="grid grid-cols-5 gap-2">
              {moods.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all cursor-pointer border ${
                    mood === m.value
                      ? `${m.color} border-brand-primary/40 shadow-sm scale-105 font-bold`
                      : 'bg-slate-50 text-gray-500 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <span className="text-2xl mb-1">{m.icon}</span>
                  <span className="font-sans text-[10px] font-semibold">{m.label}</span>
                </button>
              ))}
            </div>

            {/* Live Voice Recording Banner */}
            {(recording || isTranscribing) && (
              <div className="p-4 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 rounded-2xl text-white shadow-lg space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-200"></span>
                    </span>
                    <span className="font-sans text-xs font-black uppercase tracking-wider">
                      {isTranscribing ? "Procesando y Transcribiendo..." : "Grabando Nota de Voz en Vivo..."}
                    </span>
                  </div>

                  <span className="font-mono text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
                    00:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds}
                  </span>
                </div>

                {/* Animated Sound Waves */}
                <div className="flex items-center justify-center gap-1.5 py-2">
                  <div className="w-1 bg-white/80 rounded-full h-4 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 bg-white/80 rounded-full h-8 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 bg-white/80 rounded-full h-6 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <div className="w-1 bg-white/80 rounded-full h-10 animate-bounce" style={{ animationDelay: '450ms' }} />
                  <div className="w-1 bg-white/80 rounded-full h-5 animate-bounce" style={{ animationDelay: '600ms' }} />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className="px-3.5 py-1.5 bg-white text-rose-600 hover:bg-rose-50 font-sans text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">stop_circle</span>
                    <span>{isTranscribing ? "Transcribiendo..." : "Detener y Guardar Texto"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Entry Input Area */}
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe aquí tus pensamientos del día, logros o cómo te sientes..."
                rows={4}
                className="w-full p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl font-sans text-xs sm:text-sm text-gray-800 focus:ring-2 focus:ring-brand-primary focus:bg-white focus:outline-none transition-all placeholder:text-gray-400 resize-none"
              />

              <button
                type="button"
                onClick={toggleRecording}
                title={recording ? "Detener grabación" : "Dictar nota de voz"}
                className={`absolute bottom-3 right-3 p-2.5 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                  recording
                    ? 'bg-rose-500 text-white animate-pulse shadow-md ring-4 ring-rose-200'
                    : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-brand-primary border border-slate-200 shadow-xs'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {recording ? 'mic' : 'mic_none'}
                </span>
              </button>
            </div>

            {/* Controls & Save */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Privacy Toggle */}
              <div className="flex bg-slate-100/80 p-1 rounded-full border border-indigo-50 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setVisible(false)}
                  className={`flex-1 sm:flex-none px-5 py-2 rounded-full font-sans text-xs font-bold transition-all ${
                    !visible ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  🔒 Solo yo
                </button>
                <button
                  type="button"
                  onClick={() => setVisible(true)}
                  className={`flex-1 sm:flex-none px-5 py-2 rounded-full font-sans text-xs font-bold transition-all ${
                    visible ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  👨‍👩‍👧‍👦 Para la familia
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleGetReflection}
                  disabled={reflectionLoading || !text.trim()}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full font-sans text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {reflectionLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">sync</span>
                      Reflexionando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-amber-500 text-base">auto_awesome</span>
                      Reflexión IA
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!text.trim()}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-brand-primary hover:bg-brand-dark text-white rounded-full font-sans text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
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
                    type="button"
                    onClick={() => setReflectionData(null)}
                    className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
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

          {/* Family Journal Entries Wall & Reactions */}
          <div className="bg-white rounded-3xl p-6 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-sans text-base font-extrabold text-brand-dark flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-500">forum</span>
                  Muro de Diario y Reacciones
                </h3>
                <p className="font-sans text-xs text-gray-400">
                  Reacciona con emoticonos rápidos a las publicaciones de tu familia
                </p>
              </div>

              {/* Filter tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1.5 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${
                    filterTab === 'all' ? 'bg-white text-brand-dark shadow-xs' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('mine')}
                  className={`px-3 py-1.5 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${
                    filterTab === 'mine' ? 'bg-white text-brand-dark shadow-xs' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Mis Entradas
                </button>
              </div>
            </div>

            {/* Entries Feed List */}
            <div className="space-y-4">
              {filteredEntries.length === 0 ? (
                <EmptyStateIllustration
                  topic="diario"
                  title="Sin entradas en el diario"
                  description="Comparte cómo fue tu día o escribe una reflexiones para el historial de tu familia."
                />
              ) : (
                (() => {
                  const recentEntries = filteredEntries.slice(0, 2);
                  const olderEntries = filteredEntries.slice(2);

                  const renderEntryCard = (entry: DiarioEntrada) => {
                    const author = getAuthor(entry.usuario_id);
                    const isMine = entry.usuario_id === currentUser?.uid;
                    const reactions = entry.reacciones || [];

                    const groupedReactions: { [emoji: string]: { count: number; userIds: string[]; reactedByMe: boolean } } = {};
                    reactions.forEach(r => {
                      if (!groupedReactions[r.emoji]) {
                        groupedReactions[r.emoji] = { count: 0, userIds: [], reactedByMe: false };
                      }
                      groupedReactions[r.emoji].count += 1;
                      groupedReactions[r.emoji].userIds.push(r.usuario_id);
                      if (currentUser && r.usuario_id === currentUser.uid) {
                        groupedReactions[r.emoji].reactedByMe = true;
                      }
                    });

                    return (
                      <motion.div
                        key={entry.entrada_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-indigo-100/60 shadow-xs space-y-4 hover:shadow-md transition-all"
                      >
                        {/* Entry Top Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={author.avatar_url}
                              alt={author.nombre}
                              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-sans text-xs font-bold text-gray-800">
                                  {author.nombre} {isMine && <span className="text-[10px] text-brand-primary font-normal">(Tú)</span>}
                                </h4>
                                <span className="text-sm">
                                  {entry.emocion === 'Great' ? '😁' : entry.emocion === 'Good' ? '🙂' : entry.emocion === 'Okay' ? '😐' : entry.emocion === 'Angry' ? '😠' : '😢'}
                                </span>
                              </div>
                              <p className="font-sans text-[10px] text-gray-400 font-medium">{entry.fecha}</p>
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 rounded-full font-sans text-[10px] font-bold flex items-center gap-1 ${
                            entry.visible_familia ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-gray-700'
                          }`}>
                            <span className="material-symbols-outlined text-[12px]">
                              {entry.visible_familia ? 'groups' : 'lock'}
                            </span>
                            {entry.visible_familia ? 'Familia' : 'Privado'}
                          </span>
                        </div>

                        {/* Entry Body */}
                        <p className="font-sans text-xs sm:text-sm text-gray-700 leading-relaxed pl-1 border-l-2 border-brand-primary/40">
                          {entry.texto}
                        </p>

                        {/* Reactions Bar */}
                        <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {Object.keys(groupedReactions).length === 0 ? (
                              <span className="font-sans text-[11px] text-gray-400 italic">Sin reacciones aún</span>
                            ) : (
                              Object.entries(groupedReactions).map(([emoji, data]) => {
                                const reactorNames = data.userIds.map(uid => getAuthor(uid).nombre).join(', ');
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => onAddReaction && onAddReaction(entry.entrada_id, emoji)}
                                    title={`Reaccionaron: ${reactorNames}`}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-sans text-xs font-bold transition-all cursor-pointer ${
                                      data.reactedByMe
                                        ? 'bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs scale-105'
                                        : 'bg-white text-gray-700 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    <span>{data.count}</span>
                                  </button>
                                );
                              })
                            )}
                          </div>

                          <div className="flex items-center gap-1 bg-white/90 p-1 rounded-full border border-slate-200/80 shadow-2xs">
                            <span className="font-sans text-[10px] text-gray-400 px-2 font-bold uppercase tracking-wider hidden sm:inline">
                              Reaccionar:
                            </span>
                            {reactionEmojis.map((r) => {
                              const hasReactedThis = reactions.some(rx => rx.usuario_id === currentUser?.uid && rx.emoji === r.emoji);
                              return (
                                <button
                                  key={r.emoji}
                                  type="button"
                                  onClick={() => onAddReaction && onAddReaction(entry.entrada_id, r.emoji)}
                                  title={r.label}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all cursor-pointer hover:scale-125 ${
                                    hasReactedThis ? 'bg-rose-100 border border-rose-300 scale-110 shadow-xs' : 'hover:bg-slate-100'
                                  }`}
                                >
                                  {r.emoji}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    );
                  };

                  return (
                    <div className="space-y-4">
                      {/* Recent 2 entries */}
                      {recentEntries.map(renderEntryCard)}

                      {/* Accordion for older entries */}
                      {olderEntries.length > 0 && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setShowPastEntries(!showPastEntries)}
                            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-sans text-xs font-bold rounded-2xl border border-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                          >
                            <span className="material-symbols-outlined text-base">
                              {showPastEntries ? 'expand_less' : 'history'}
                            </span>
                            <span>
                              {showPastEntries
                                ? 'Ocultar entradas pasadas'
                                : `Ver ${olderEntries.length} entrada(s) pasada(s)`}
                            </span>
                          </button>

                          <AnimatePresence>
                            {showPastEntries && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-4 mt-4 overflow-hidden"
                              >
                                {olderEntries.map(renderEntryCard)}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Decor */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-amber-50 to-indigo-50 border border-indigo-100/60 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <span className="font-serif absolute -top-3 -left-3 text-7xl text-brand-dark/5 select-none font-bold">“</span>
            <p className="font-sans text-xs sm:text-sm text-brand-dark font-medium italic leading-relaxed relative z-10">
              "Expresar nuestras emociones en familia fortalece los lazos de empatía y comprensión mutua."
            </p>
            <p className="font-sans text-[10px] text-brand-primary font-extrabold text-right mt-3">- Consejería Núcleo Familiar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
