import React, { useState, useEffect } from 'react';
import { TareaDiaria } from '../types';

interface LiveActivityBannerProps {
  task: TareaDiaria;
  onComplete: (taskId: string) => void;
  onPause: (taskId: string) => void;
  onOpenFocusMode?: (task: TareaDiaria) => void;
}

export default function LiveActivityBanner({
  task,
  onComplete,
  onPause,
  onOpenFocusMode
}: LiveActivityBannerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [task.tarea_id]);

  const totalEstimateSeconds = Math.max(60, (task.tiempo_estimado_min || 15) * 60);
  const remainingSeconds = Math.max(0, totalEstimateSeconds - elapsedSeconds);
  const percentComplete = Math.min(100, Math.round((elapsedSeconds / totalEstimateSeconds) * 100));

  // Calculate estimated completion time
  const completionDate = new Date(Date.now() + remainingSeconds * 1000);
  const endTimeStr = completionDate.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getCategoryIcon = (cat?: string) => {
    switch (cat) {
      case 'Hogar': return 'home';
      case 'Estudio': return 'school';
      case 'Salud': return 'favorite';
      case 'Personal': return 'person';
      default: return 'play_circle';
    }
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl animate-slide-down">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 text-white rounded-3xl p-3.5 shadow-2xl shadow-indigo-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Left: Icon, Title, Status badge */}
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <span className="material-symbols-outlined text-xl">
                {getCategoryIcon(task.categoria)}
              </span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full animate-ping" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-500/30">
                🔴 Actividad en Vivo
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Fin est: <strong className="text-emerald-400 font-mono font-bold">{endTimeStr}</strong>
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-black text-white truncate max-w-[200px] sm:max-w-[240px]">
              {task.titulo}
            </h4>
          </div>
        </div>

        {/* Center: Live Timers */}
        <div className="flex items-center gap-4 bg-slate-800/80 px-3.5 py-1.5 rounded-2xl border border-slate-700/80 shrink-0">
          <div className="text-center">
            <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-bold">Transcurrido</span>
            <span className="text-xs font-mono font-extrabold text-indigo-300">{formatTime(elapsedSeconds)}</span>
          </div>

          <div className="w-px h-6 bg-slate-700" />

          <div className="text-center">
            <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-bold">Restante</span>
            <span className={`text-xs font-mono font-extrabold ${remainingSeconds <= 300 ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
              {formatTime(remainingSeconds)}
            </span>
          </div>

          <div className="hidden md:block w-12 bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Right: Direct Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          {onOpenFocusMode && (
            <button
              onClick={() => onOpenFocusMode(task)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1"
              title="Modo Foco Extendido"
            >
              <span className="material-symbols-outlined text-sm text-indigo-400">fullscreen</span>
              <span className="hidden xs:inline">Foco</span>
            </button>
          )}

          <button
            onClick={() => onPause(task.tarea_id)}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1"
            title="Pausar actividad"
          >
            <span className="material-symbols-outlined text-sm">pause</span>
            <span>Pausar</span>
          </button>

          <button
            onClick={() => onComplete(task.tarea_id)}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1"
            title="Finalizar actividad"
          >
            <span className="material-symbols-outlined text-sm font-black">check</span>
            <span>Finalizar</span>
          </button>
        </div>

      </div>
    </div>
  );
}
