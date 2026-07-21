import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Smartphone, 
  Compass, 
  Volume2, 
  VolumeX, 
  X, 
  CheckCircle, 
  Award, 
  HelpCircle, 
  RotateCcw, 
  Play, 
  Pause, 
  FastForward,
  Sparkles,
  Lock
} from 'lucide-react';
import { TareaDiaria } from '../types';

interface FocusModeOverlayProps {
  task: TareaDiaria;
  onClose: () => void;
  onComplete: (taskId: string) => void;
}

interface Chapter {
  title: string;
  text: string;
}

interface DuoQuestion {
  prompt: string;
  phrase: string;
  options: string[];
  correctIndex: number;
}

export default function FocusModeOverlay({ task, onClose, onComplete }: FocusModeOverlayProps) {
  const titleLower = task.titulo.toLowerCase();
  const isReading = titleLower.includes('leer') || 
                    titleLower.includes('lectura') || 
                    titleLower.includes('libro') || 
                    titleLower.includes('cuento') || 
                    titleLower.includes('estudi') || 
                    titleLower.includes('novela');

  const isDeviceApp = titleLower.includes('duolingo') || 
                      titleLower.includes('celular') || 
                      titleLower.includes('app') || 
                      titleLower.includes('pantalla') || 
                      titleLower.includes('teléfono') || 
                      titleLower.includes('movil') || 
                      titleLower.includes('inglés') || 
                      titleLower.includes('idioma') || 
                      titleLower.includes('juego');

  const modeType = isReading ? 'lectura' : isDeviceApp ? 'celular' : 'general';

  // Timer State (starts with task's estimated time)
  const totalDurationSeconds = task.tiempo_estimado_min * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalDurationSeconds);
  const [isActive, setIsActive] = useState(false); // start paused until checklist is ready (for general) or content loads
  const [isSpeedy, setIsSpeedy] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [ambientSound, setAmbientSound] = useState(true);

  // Dynamic content loaded from backend (Gemini powered!)
  const [loadingContent, setLoadingContent] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [questions, setQuestions] = useState<DuoQuestion[]>([]);

  // 1. Reading Mode State
  const [readingPage, setReadingPage] = useState(0);

  // 2. Duolingo App Simulator State
  const [duoQuestionIndex, setDuoQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [duoCorrectAnswers, setDuoCorrectAnswers] = useState(0);
  const [duoFeedback, setDuoFeedback] = useState<'correct' | 'wrong' | null>(null);

  // 3. General Mode State (Breathing / Checklist)
  const [inhaleState, setInhaleState] = useState<'Inhala' | 'Exhala' | 'Mantén'>('Inhala');
  const [generalChecklist, setGeneralChecklist] = useState([
    { id: 1, text: "Silenciar el celular o ponerlo en modo no molestar", checked: false },
    { id: 2, text: "Organizar mi espacio de trabajo físico", checked: false },
    { id: 3, text: "Tener un vaso de agua cerca para mantenerme hidratado", checked: false }
  ]);

  // Checklist verification
  const isChecklistComplete = generalChecklist.every(item => item.checked);

  // Real Audio player initialization (Instrumental chill focus music)
  const [audioElement] = useState(() => {
    const audio = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3");
    audio.loop = true;
    audio.volume = 0.20;
    return audio;
  });

  // Play/pause background music based on sound settings, play state, and celebration
  useEffect(() => {
    if (ambientSound && isActive && !showCelebration) {
      audioElement.play().catch(err => {
        console.warn("Autoplay was blocked by browser. Audio will play upon direct interaction.", err);
      });
    } else {
      audioElement.pause();
    }
  }, [ambientSound, isActive, showCelebration, audioElement]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      audioElement.pause();
    };
  }, [audioElement]);

  // Fetch dynamic AI content on mount
  useEffect(() => {
    const fetchDynamicContent = async () => {
      setLoadingContent(true);
      try {
        const res = await fetch('/api/focus/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.titulo,
            mode: modeType
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (modeType === 'lectura') {
            setChapters(data);
          } else if (modeType === 'celular') {
            setQuestions(data);
          }
        }
      } catch (err) {
        console.error("Error loading dynamic Gemini focus content:", err);
      } finally {
        setLoadingContent(false);
        // Automatically start the timer if not General mode (General mode waits for mandatory checklist completion)
        if (modeType !== 'general') {
          setIsActive(true);
        }
      }
    };

    fetchDynamicContent();
  }, [task.titulo, modeType]);

  // Breathing loop for General Mode
  useEffect(() => {
    if (modeType !== 'general') return;
    const interval = setInterval(() => {
      setInhaleState(prev => {
        if (prev === 'Inhala') return 'Mantén';
        if (prev === 'Mantén') return 'Exhala';
        return 'Inhala';
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [modeType]);

  // Main countdown timer logic
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isActive && secondsRemaining > 0) {
      const step = isSpeedy ? 60 : 1; 
      timer = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= step) {
            clearInterval(timer!);
            handleTimeExpiration();
            return 0;
          }
          return prev - step;
        });
      }, 1000);
    } else if (secondsRemaining === 0) {
      handleTimeExpiration();
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive, secondsRemaining, isSpeedy]);

  // Automatically pause/resume timer based on checklist status in General mode
  useEffect(() => {
    if (modeType === 'general') {
      if (isChecklistComplete) {
        setIsActive(true);
      } else {
        setIsActive(false);
      }
    }
  }, [isChecklistComplete, modeType]);

  const handleTimeExpiration = () => {
    setIsActive(false);
    setShowCelebration(true);
  };

  const handleCompleteTask = () => {
    onComplete(task.tarea_id);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percentProgress = ((totalDurationSeconds - secondsRemaining) / totalDurationSeconds) * 100;

  // Duolingo actions with dynamic percentage-based time bonus calculation!
  const handleDuoSelect = (idx: number) => {
    if (duoFeedback !== null || questions.length === 0) return;
    setSelectedAnswer(idx);
    
    const currentQuestion = questions[duoQuestionIndex];
    const correct = idx === currentQuestion.correctIndex;
    
    if (correct) {
      setDuoFeedback('correct');
      setDuoCorrectAnswers(prev => prev + 1);
      
      // Time bonus: 15% of the total estimated duration of the task!
      const timeBonusSeconds = Math.round(totalDurationSeconds * 0.15);
      setSecondsRemaining(prev => Math.max(0, prev - timeBonusSeconds));
    } else {
      setDuoFeedback('wrong');
    }
  };

  const handleDuoNext = () => {
    if (questions.length === 0) return;
    setSelectedAnswer(null);
    setDuoFeedback(null);
    setDuoQuestionIndex(prev => (prev + 1) % questions.length);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto font-sans">
      
      {/* Background Visual Flair */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-primary rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
      </div>

      <AnimatePresence mode="wait">
        {!showCelebration ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[550px]"
          >
            {/* Header controls for entire focus mode */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
              <button 
                onClick={() => setAmbientSound(!ambientSound)}
                className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
                title={ambientSound ? "Silenciar música ambiente real" : "Activar música de concentración real"}
              >
                {ambientSound ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
                title="Abandonar sesión"
              >
                <X size={18} />
              </button>
            </div>

            {/* Left Column: Shared Focus Timer Controls */}
            <div className="w-full md:w-2/5 p-6 md:p-8 bg-slate-950/40 border-r border-slate-800/50 flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-3">
                  {modeType === 'lectura' && <BookOpen size={13} />}
                  {modeType === 'celular' && <Smartphone size={13} />}
                  {modeType === 'general' && <Compass size={13} />}
                  Modo de Enfoque
                </span>
                <h3 className="text-xl md:text-2xl font-extrabold text-white leading-tight">
                  {task.titulo}
                </h3>
                <p className="text-xs text-slate-400 mt-2">
                  Sesión de enfoque sin interrupciones. Mantente concentrado en tu actividad.
                </p>
              </div>

              {/* Central Circle Progress */}
              <div className="my-8 flex flex-col items-center justify-center">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" fill="transparent" r="42" stroke="#1e293b" strokeWidth="6" />
                    <circle
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="42"
                      stroke="#6366F1"
                      strokeWidth="6"
                      strokeDasharray="263.8"
                      strokeDashoffset={263.8 - (263.8 * percentProgress) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-mono font-black text-white tracking-widest">
                      {formatTime(secondsRemaining)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase mt-1">
                      restantes
                    </span>
                  </div>
                </div>

                {/* Ambient Visualizer */}
                {ambientSound && isActive && (
                  <div className="flex items-center gap-1 mt-4 h-4">
                    <span className="w-1 bg-brand-primary/80 rounded-full animate-bounce h-2" style={{ animationDelay: '0.1s' }} />
                    <span className="w-1 bg-brand-primary rounded-full animate-bounce h-4" style={{ animationDelay: '0.3s' }} />
                    <span className="w-1 bg-brand-primary/80 rounded-full animate-bounce h-3" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1 bg-brand-primary/50 rounded-full animate-bounce h-2" style={{ animationDelay: '0.4s' }} />
                  </div>
                )}
              </div>

              {/* Quick controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-4">
                  <button
                    disabled={modeType === 'general' && !isChecklistComplete}
                    onClick={() => setIsActive(!isActive)}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-45 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    {isActive ? (
                      <>
                        <Pause size={14} /> Pausar
                      </>
                    ) : (
                      <>
                        <Play size={14} /> Reanudar
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setIsSpeedy(!isSpeedy)}
                    className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSpeedy 
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="Simular paso rápido del tiempo"
                  >
                    <FastForward size={14} />
                    {isSpeedy ? 'Rápido' : 'Normal'}
                  </button>
                </div>

                <button
                  onClick={handleTimeExpiration}
                  className="w-full py-2.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer"
                >
                  Omitir y Terminar Tarea
                </button>
              </div>
            </div>

            {/* Right Column: Custom Interactive Theme Area */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-slate-900/60 relative">
              
              {loadingContent && modeType !== 'general' ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 border-2 border-brand-primary/20 rounded-full" />
                    <div className="absolute inset-0 border-2 border-t-brand-primary rounded-full animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5 justify-center">
                      <Sparkles className="text-brand-primary animate-pulse" size={12} />
                      IA Generativa Activa
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Gemini está adaptando el contenido a tu tarea...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* READING FOCUS DESIGN */}
                  {modeType === 'lectura' && chapters.length > 0 && (
                    <div className="flex-1 flex flex-col justify-between space-y-6">
                      <div>
                        <h4 className="text-xs font-bold text-[#6366F1] uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Sparkles size={12} className="text-brand-primary" />
                          Biblioteca Familiar AI
                        </h4>
                        <p className="text-sm text-slate-300">
                          Lectura tranquila creada en tiempo real por Gemini para inspirar tu tarea: <strong>"{task.titulo}"</strong>.
                        </p>
                      </div>

                      {/* Cozy Amber Notebook Visual */}
                      <div className="flex-1 bg-[#FFFBEB] text-[#451A03] rounded-2xl p-6 md:p-8 shadow-inner border-l-[6px] border-amber-800 flex flex-col justify-between min-h-[220px]">
                        <div className="space-y-4">
                          <h5 className="font-serif text-base font-extrabold text-amber-900 border-b border-amber-200 pb-2">
                            {chapters[readingPage]?.title}
                          </h5>
                          <p className="font-serif text-sm leading-relaxed text-amber-950">
                            {chapters[readingPage]?.text}
                          </p>
                        </div>

                        <div className="flex justify-between items-center mt-6 text-xs font-bold text-amber-800 border-t border-amber-200/60 pt-3">
                          <span>Pág. {readingPage + 1} de {chapters.length}</span>
                          <div className="flex gap-2">
                            <button 
                              disabled={readingPage === 0}
                              onClick={() => setReadingPage(prev => Math.max(0, prev - 1))}
                              className="px-2.5 py-1 rounded bg-amber-200/50 hover:bg-amber-200 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                            >
                              Atrás
                            </button>
                            <button 
                              disabled={readingPage === chapters.length - 1}
                              onClick={() => setReadingPage(prev => Math.min(chapters.length - 1, prev + 1))}
                              className="px-2.5 py-1 rounded bg-amber-800 text-[#FFFBEB] hover:bg-amber-950 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="text-center text-xs text-slate-500 italic">
                        💡 Termina el temporizador para sumar los puntos correspondientes a tu racha familiar.
                      </div>
                    </div>
                  )}

                  {/* DEVICE/CELULAR FOCUS DESIGN (DUOLINGO SIMULATION) */}
                  {modeType === 'celular' && questions.length > 0 && (
                    <div className="flex-1 flex flex-col justify-between space-y-6">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Sparkles size={12} />
                          Desafío de Idiomas AI
                        </h4>
                        <p className="text-sm text-slate-300 font-medium">
                          Preguntas personalizadas por Gemini basadas en tu tarea para ejercitar la mente.
                        </p>
                      </div>

                      {/* Interactive Smartphone Container Mockup */}
                      <div className="mx-auto w-full max-w-sm bg-slate-950 border-4 border-slate-700 rounded-[40px] p-4 shadow-xl relative overflow-hidden min-h-[300px] flex flex-col">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-700 rounded-b-xl z-10"></div>
                        
                        {/* Simulated App Header */}
                        <div className="flex justify-between items-center mt-2 mb-4 px-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-[10px] font-black">
                              D
                            </div>
                            <span className="text-xs font-bold text-emerald-400">Duolingo AI</span>
                          </div>
                          <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                            🔥 {duoCorrectAnswers} Correctas
                          </div>
                        </div>

                        {/* App Question View */}
                        <div className="flex-1 flex flex-col justify-between bg-slate-900 rounded-[28px] p-4 text-white">
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                              {questions[duoQuestionIndex]?.prompt}
                            </span>
                            <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 text-center font-mono font-bold text-xs text-emerald-300">
                              {questions[duoQuestionIndex]?.phrase}
                            </div>
                          </div>

                          {/* Options */}
                          <div className="space-y-2 my-4">
                            {questions[duoQuestionIndex]?.options.map((opt, idx) => {
                              const isSelected = selectedAnswer === idx;
                              let btnStyle = "border-slate-700 bg-slate-800 text-slate-300 hover:border-emerald-500";
                              
                              if (isSelected) {
                                if (duoFeedback === 'correct') {
                                  btnStyle = "border-emerald-500 bg-emerald-950/40 text-emerald-300";
                                } else if (duoFeedback === 'wrong') {
                                  btnStyle = "border-rose-500 bg-rose-950/40 text-rose-300";
                                } else {
                                  btnStyle = "border-brand-primary bg-slate-800 text-white";
                                }
                              }

                              return (
                                <button
                                  key={idx}
                                  disabled={duoFeedback !== null}
                                  onClick={() => handleDuoSelect(idx)}
                                  className={`w-full text-left p-2.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${btnStyle}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>

                          {/* Feedback block */}
                          {duoFeedback && (
                            <div className="mt-2 flex flex-col gap-2">
                              <div className={`p-2.5 rounded-xl text-center text-[10px] font-bold flex items-center justify-center gap-1.5 ${
                                duoFeedback === 'correct' 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}>
                                <span className="material-symbols-outlined text-sm">
                                  {duoFeedback === 'correct' ? 'verified' : 'cancel'}
                                </span>
                                {duoFeedback === 'correct' 
                                  ? `¡Excelente! Bono de -${Math.round(totalDurationSeconds * 0.15 / 60)} min` 
                                  : 'Respuesta incorrecta'}
                              </div>
                              
                              <button
                                onClick={handleDuoNext}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] py-2 rounded-xl transition-all cursor-pointer"
                              >
                                Siguiente Pregunta
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GENERAL MODE FOCUS DESIGN */}
                  {modeType === 'general' && (
                    <div className="flex-1 flex flex-col justify-between space-y-6">
                      <div>
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                          Concentración Plena & Mindful
                        </h4>
                        <p className="text-sm text-slate-300">
                          Respira de forma guiada y asume una postura correcta para mantener la lucidez mental.
                        </p>
                      </div>

                      {/* Guided Breathing Box */}
                      <div className="flex flex-col items-center justify-center bg-slate-950/30 border border-slate-800 rounded-2xl p-6 min-h-[160px]">
                        <motion.div
                          animate={{
                            scale: inhaleState === 'Inhala' ? 1.3 : inhaleState === 'Exhala' ? 0.9 : 1.1,
                            opacity: inhaleState === 'Mantén' ? 0.8 : 1
                          }}
                          transition={{ duration: 4, ease: "easeInOut" }}
                          className="w-24 h-24 rounded-full bg-gradient-to-tr from-brand-primary to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"
                        >
                          <span className="text-xs font-black uppercase tracking-widest">
                            {inhaleState}
                          </span>
                        </motion.div>
                        <p className="text-xs text-slate-400 mt-4 text-center">
                          Sigue el compás de respiración para calmar el sistema nervioso.
                        </p>
                      </div>

                      {/* Task Preparation Checklist (MANDATORY TO START TEMP) */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Preparación Obligatoria del Entorno
                          </h5>
                          {isChecklistComplete ? (
                            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold">
                              Listo para empezar
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Lock size={10} />
                              Pendiente
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {generalChecklist.map(item => (
                            <label 
                              key={item.id} 
                              className="flex items-center gap-3 bg-slate-950/40 border border-slate-800/40 rounded-xl p-3 cursor-pointer hover:border-slate-700 transition-all"
                            >
                              <input 
                                type="checkbox"
                                checked={item.checked}
                                onChange={() => {
                                  setGeneralChecklist(prev => prev.map(p => p.id === item.id ? { ...p, checked: !p.checked } : p));
                                }}
                                className="w-4 h-4 rounded text-brand-primary bg-slate-800 border-slate-700 focus:ring-brand-primary cursor-pointer"
                              />
                              <span className={`text-xs ${item.checked ? 'line-through text-slate-500' : 'text-slate-300 font-medium'}`}>
                                {item.text}
                              </span>
                            </label>
                          ))}
                        </div>
                        {!isChecklistComplete && (
                          <p className="text-[10px] text-slate-500 text-center font-bold">
                            * Marca todos los preparativos para iniciar el temporizador.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          </motion.div>
        ) : (
          /* CELEBRATION CONGRATS OVERLAY */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[32px] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
          >
            {/* Sparkles elements */}
            <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
            <div className="absolute bottom-8 right-6 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
            
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award size={48} className="animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">
                ¡SESIÓN COMPLETADA!
              </span>
              <h3 className="text-2xl font-black text-white">
                ¡Buen trabajo enfocado!
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                Has cumplido el tiempo estipulado para la tarea <strong>"{task.titulo}"</strong> sin interrupciones. ¡Excelente ejemplo para el núcleo familiar!
              </p>
            </div>

            {/* Reward box */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                  🏆
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Recompensa de Enfoque</span>
                  <span className="text-[10px] text-slate-400">Puntos de motivación</span>
                </div>
              </div>
              <span className="font-mono text-lg font-black text-amber-400">+50 Pts</span>
            </div>

            <button
              onClick={handleCompleteTask}
              className="w-full py-4 rounded-2xl bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer"
            >
              Registrar Logro en el Tablero
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
