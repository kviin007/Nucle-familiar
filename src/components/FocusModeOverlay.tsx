import React, { useState, useEffect, useRef } from 'react';
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
  Play, 
  Pause, 
  FastForward,
  Sparkles,
  Lock,
  ShieldAlert,
  BellOff,
  PhoneOff,
  Flame,
  Clock,
  Zap,
  Flame as FlameIcon
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
  const isCritical = !!task.es_critica;

  // Timer State
  const totalDurationSeconds = (task.tiempo_estimado_min || 30) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalDurationSeconds);
  const [isActive, setIsActive] = useState(true); // start active by default
  const [isSpeedy, setIsSpeedy] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [ambientSound, setAmbientSound] = useState(true);

  // 5-Second Hold-to-Exit Safety State
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [isHoldingExit, setIsHoldingExit] = useState(false);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stats calculation
  const [timeSpentSec, setTimeSpentSec] = useState(0);
  const [punctualityPercent, setPunctualityPercent] = useState(100);

  // Dynamic content loaded from backend (Gemini)
  const [loadingContent, setLoadingContent] = useState(!isCritical);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [questions, setQuestions] = useState<DuoQuestion[]>([]);

  // Reading Mode State
  const [readingPage, setReadingPage] = useState(0);

  // Duolingo App Simulator State
  const [duoQuestionIndex, setDuoQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [duoCorrectAnswers, setDuoCorrectAnswers] = useState(0);
  const [duoFeedback, setDuoFeedback] = useState<'correct' | 'wrong' | null>(null);

  // General Mode State
  const [inhaleState, setInhaleState] = useState<'Inhala' | 'Exhala' | 'Mantén'>('Inhala');
  const [generalChecklist, setGeneralChecklist] = useState([
    { id: 1, text: "Silenciar el celular o ponerlo en modo no molestar", checked: true },
    { id: 2, text: "Organizar mi espacio de trabajo físico", checked: true },
    { id: 3, text: "Tener un vaso de agua cerca para mantenerme hidratado", checked: true }
  ]);

  // Audio player
  const [audioElement] = useState(() => {
    const audio = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3");
    audio.loop = true;
    audio.volume = 0.20;
    return audio;
  });

  useEffect(() => {
    if (ambientSound && isActive && !showCelebration) {
      audioElement.play().catch(err => {
        console.warn("Autoplay was blocked by browser", err);
      });
    } else {
      audioElement.pause();
    }
  }, [ambientSound, isActive, showCelebration, audioElement]);

  useEffect(() => {
    return () => {
      audioElement.pause();
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [audioElement]);

  // Fetch dynamic content for standard tasks
  useEffect(() => {
    if (isCritical) {
      setLoadingContent(false);
      return;
    }

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
          if (modeType === 'lectura') setChapters(data);
          else if (modeType === 'celular') setQuestions(data);
        }
      } catch (err) {
        console.error("Error loading dynamic focus content:", err);
      } finally {
        setLoadingContent(false);
      }
    };

    fetchDynamicContent();
  }, [task.titulo, modeType, isCritical]);

  // Breathing loop
  useEffect(() => {
    if (modeType !== 'general' || isCritical) return;
    const interval = setInterval(() => {
      setInhaleState(prev => {
        if (prev === 'Inhala') return 'Mantén';
        if (prev === 'Mantén') return 'Exhala';
        return 'Inhala';
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [modeType, isCritical]);

  // Timer tick
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

  const handleTimeExpiration = () => {
    setIsActive(false);
    const elapsed = totalDurationSeconds - secondsRemaining;
    setTimeSpentSec(elapsed > 0 ? elapsed : totalDurationSeconds);
    setPunctualityPercent(Math.min(100, Math.max(85, Math.round(100 - (secondsRemaining / totalDurationSeconds) * 10))));
    setShowCelebration(true);
  };

  // 5-Second Press-and-Hold Safety Exit Handlers
  const handleStartHoldExit = () => {
    setIsHoldingExit(true);
    const startTime = Date.now();
    const duration = 5000; // 5000 ms = 5s
    
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setHoldProgress(progress);

      if (elapsed >= duration) {
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        setIsHoldingExit(false);
        setHoldProgress(0);
        
        // Calculate stats on manual exit
        const timeDone = totalDurationSeconds - secondsRemaining;
        setTimeSpentSec(timeDone);
        setPunctualityPercent(Math.min(100, Math.max(70, Math.round((timeDone / totalDurationSeconds) * 100))));
        setShowCelebration(true);
      }
    }, 50);
  };

  const handleCancelHoldExit = () => {
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    setIsHoldingExit(false);
    setHoldProgress(0);
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

  return (
    <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-xl z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto font-sans select-none">
      
      {/* Background Visual Flair */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
        <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl ${isCritical ? 'bg-rose-600' : 'bg-brand-primary'}`} />
        <div className={`absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl ${isCritical ? 'bg-indigo-600' : 'bg-purple-600'}`} />
      </div>

      <AnimatePresence mode="wait">
        {!showCelebration ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className={`relative w-full ${isCritical ? 'max-w-3xl' : 'max-w-4xl'} bg-slate-900 border ${isCritical ? 'border-rose-900/60 shadow-rose-950/50' : 'border-slate-800'} rounded-[32px] overflow-hidden shadow-2xl flex flex-col min-h-[560px]`}
          >
            {/* Header controls */}
            <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                {isCritical ? (
                  <span className="bg-rose-600 text-white font-black text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-rose-600/30 animate-pulse">
                    <ShieldAlert size={14} />
                    MODO MISIÓN / PROCESO CRÍTICO
                  </span>
                ) : (
                  <span className="bg-brand-primary/20 text-brand-primary border border-brand-primary/30 font-extrabold text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Sparkles size={14} />
                    MODO FOCO INMERSIVO
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setAmbientSound(!ambientSound)}
                  className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
                  title={ambientSound ? "Silenciar audio" : "Activar audio de fondo"}
                >
                  {ambientSound ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button 
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Cerrar vista"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* CRITICAL MISSION MODE SCREEN */}
            {isCritical ? (
              <div className="flex-1 p-6 md:p-10 flex flex-col justify-between items-center text-center space-y-6">
                
                {/* Upper Activity Title */}
                <div className="space-y-2 max-w-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-950/80 border border-rose-800/80 px-3 py-1 rounded-full inline-block">
                    ACTIVIDAD PRIORITARIA CRÍTICA EN CURSO
                  </span>
                  <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-wider leading-tight">
                    {task.titulo.toUpperCase()}
                  </h1>
                </div>

                {/* Distractions Blocked Banner */}
                <div className="w-full max-w-lg bg-slate-950/80 border border-rose-500/30 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-2 text-rose-300 font-extrabold text-xs">
                    <Lock size={16} className="text-rose-500 shrink-0 animate-bounce" />
                    <span>Redes Sociales & Distracciones Bloqueadas:</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-black">
                    <span className="bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800/50 line-through">Instagram</span>
                    <span className="bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800/50 line-through">TikTok</span>
                    <span className="bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800/50 line-through">Facebook</span>
                    <span className="bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800/50 line-through">YouTube</span>
                  </div>
                </div>

                {/* Giant Countdown Timer Display */}
                <div className="my-2 relative flex flex-col items-center justify-center">
                  <div className="font-mono text-6xl md:text-8xl font-black tracking-widest text-white drop-shadow-[0_0_25px_rgba(244,63,94,0.4)]">
                    {formatTime(secondsRemaining)}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-rose-400 mt-2 flex items-center gap-1.5">
                    <Clock size={14} /> TIEMPO RESTANTE DE MISIÓN
                  </span>
                </div>

                {/* Active Automated Protections Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-xl text-[11px] font-bold">
                  <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-emerald-400 flex items-center justify-center gap-1.5">
                    <span>🌙 No Molestar: ACTIVO</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-emerald-400 flex items-center justify-center gap-1.5">
                    <BellOff size={12} />
                    <span>🔕 Notif. Silenciadas</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-emerald-400 flex items-center justify-center gap-1.5">
                    <span>💡 Pantalla Encendida</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-emerald-400 flex items-center justify-center gap-1.5">
                    <span>⏱️ Cronómetro Activo</span>
                  </div>
                </div>

                {/* 5-Second Press & Hold Safety Mechanism Exit Button */}
                <div className="w-full max-w-md pt-2 space-y-2">
                  <button
                    onMouseDown={handleStartHoldExit}
                    onMouseUp={handleCancelHoldExit}
                    onMouseLeave={handleCancelHoldExit}
                    onTouchStart={handleStartHoldExit}
                    onTouchEnd={handleCancelHoldExit}
                    className="relative w-full py-4 rounded-2xl bg-rose-950 hover:bg-rose-900 border border-rose-700/60 text-white font-black text-xs uppercase tracking-widest overflow-hidden transition-all shadow-xl active:scale-95 cursor-pointer select-none"
                  >
                    {/* Hold Progress Fill */}
                    <div 
                      className="absolute inset-0 bg-rose-600 transition-all duration-75"
                      style={{ width: `${holdProgress}%` }}
                    />

                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <ShieldAlert size={16} />
                      {isHoldingExit 
                        ? `Manteniendo... ${Math.ceil((5000 - (holdProgress * 50)) / 1000)}s` 
                        : 'Mantén Presionado 5s para Salir / Cancelar'
                      }
                    </span>
                  </button>

                  <p className="text-[10px] text-slate-400 font-bold text-center">
                    🔒 Mecanismo anti-interrupción: Previene salidas accidentales o impulsivas.
                  </p>
                </div>

              </div>
            ) : (
              /* STANDARD FOCUS MODE DISPLAY */
              <div className="flex-1 flex flex-col md:flex-row min-h-[480px]">
                {/* Left Side: Timer & Speed controls */}
                <div className="w-full md:w-2/5 p-6 bg-slate-950/40 border-r border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold text-white leading-snug">
                      {task.titulo}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Mantente enfocado en esta tarea sin distracciones.
                    </p>
                  </div>

                  <div className="my-6 flex flex-col items-center justify-center">
                    <div className="relative w-36 h-36 flex items-center justify-center">
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
                        <span className="text-2xl font-mono font-black text-white tracking-widest">
                          {formatTime(secondsRemaining)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5">
                          restantes
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsActive(!isActive)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        {isActive ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Reanudar</>}
                      </button>

                      <button
                        onClick={() => setIsSpeedy(!isSpeedy)}
                        className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSpeedy ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                        }`}
                        title="Simular tiempo rápido"
                      >
                        <FastForward size={14} />
                        {isSpeedy ? 'Rápido' : 'Normal'}
                      </button>
                    </div>

                    <button
                      onClick={handleTimeExpiration}
                      className="w-full py-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Terminar Tarea
                    </button>
                  </div>
                </div>

                {/* Right Side: Interactive Focus helper */}
                <div className="flex-1 p-6 bg-slate-900/60 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles size={12} />
                      Preparación & Entorno
                    </h4>
                    <div className="space-y-2">
                      {generalChecklist.map(item => (
                        <label key={item.id} className="flex items-center gap-2.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-xs font-medium text-slate-300">
                          <input type="checkbox" checked={item.checked} onChange={() => {
                            setGeneralChecklist(prev => prev.map(p => p.id === item.id ? { ...p, checked: !p.checked } : p));
                          }} className="w-4 h-4 rounded text-brand-primary" />
                          <span>{item.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="text-center text-xs text-slate-400 bg-slate-950/30 p-4 rounded-xl border border-slate-800">
                    💡 Mantén tu atención enfocada. Al finalizar se registrará tu tiempo y racha diaria.
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        ) : (
          /* RESUMEN POST-ACTIVIDAD Y ESTADÍSTICAS */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[32px] p-6 md:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
          >
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <Award size={36} className="animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full inline-block">
                RESUMEN POST-ACTIVIDAD CUMPLIDA
              </span>
              <h3 className="text-2xl font-black text-white">
                {isCritical ? '¡MISIÓN CUMPLIDA CON ÉXITO!' : '¡Excelente Trabajo!'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Has finalizado la sesión de la actividad <strong>"{task.titulo}"</strong>. Aquí tienes el reporte de tu desempeño:
              </p>
            </div>

            {/* Post-Activity Statistics Breakdown Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-800 pb-2">
                Estadísticas de la Sesión
              </span>

              {/* 1. Duration Realized vs Planned */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-400" />
                  Duración realizada vs. planificada:
                </span>
                <span className="font-extrabold text-white font-mono">
                  {Math.max(1, Math.round(timeSpentSec / 60))} min / {task.tiempo_estimado_min || 30} min
                </span>
              </div>

              {/* 2. Punctuality Percentage */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" />
                  Porcentaje de Puntualidad:
                </span>
                <span className="font-extrabold text-emerald-400 font-mono">
                  {punctualityPercent}%
                </span>
              </div>

              {/* 3. Streak Increase (+🔥) */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Flame size={14} className="text-amber-500 fill-amber-500 animate-pulse" />
                  Incremento en la Racha de días:
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-black text-xs flex items-center gap-1">
                  🔥 +1 Día de Racha!
                </span>
              </div>
            </div>

            <button
              onClick={handleCompleteTask}
              className="w-full py-4 rounded-2xl bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer"
            >
              Registrar Logro en el Tablero
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
