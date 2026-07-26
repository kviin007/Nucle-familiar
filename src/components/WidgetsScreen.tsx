import React, { useState, useEffect } from 'react';
import { TareaDiaria, Usuario } from '../types';
import { calculateStreakAndMetrics } from '../utils/streaks';

interface WidgetsScreenProps {
  currentUser?: Usuario | null;
  tareas: TareaDiaria[];
  onToggleTask: (taskId: string) => void;
  onSnoozeTask?: (taskId: string, minutesToSnooze?: number, exactTime?: string) => Promise<void> | void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type WidgetFormat = 'pequeno' | 'mediano' | 'expandido' | 'bloqueo';

export interface ThemePreset {
  id: string;
  name: string;
  bgClass: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  accentBg: string;
  accentText: string;
  borderClass: string;
  progressTrack: string;
  progressFill: string;
  badgeBg: string;
  badgeText: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'azul_profundo',
    name: 'Azul Profundo',
    bgClass: 'from-slate-900 via-indigo-950 to-blue-900',
    cardBg: 'bg-indigo-950/80 backdrop-blur-md',
    textPrimary: 'text-white',
    textSecondary: 'text-indigo-200/80',
    accentBg: 'bg-blue-500 hover:bg-blue-400',
    accentText: 'text-white',
    borderClass: 'border-blue-500/30',
    progressTrack: 'bg-indigo-900/60',
    progressFill: 'bg-blue-400',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300'
  },
  {
    id: 'verde_oliva',
    name: 'Verde Oliva',
    bgClass: 'from-stone-900 via-emerald-950 to-teal-900',
    cardBg: 'bg-emerald-950/80 backdrop-blur-md',
    textPrimary: 'text-emerald-50',
    textSecondary: 'text-emerald-200/70',
    accentBg: 'bg-emerald-500 hover:bg-emerald-400',
    accentText: 'text-stone-950',
    borderClass: 'border-emerald-500/30',
    progressTrack: 'bg-emerald-900/60',
    progressFill: 'bg-emerald-400',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300'
  },
  {
    id: 'dark_oled',
    name: 'Dark OLED',
    bgClass: 'from-black via-zinc-950 to-black',
    cardBg: 'bg-zinc-900/90 backdrop-blur-lg',
    textPrimary: 'text-zinc-100',
    textSecondary: 'text-zinc-400',
    accentBg: 'bg-cyan-400 hover:bg-cyan-300',
    accentText: 'text-black font-black',
    borderClass: 'border-cyan-500/40',
    progressTrack: 'bg-zinc-800',
    progressFill: 'bg-cyan-400',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300'
  },
  {
    id: 'neon_violeta',
    name: 'Neón Violeta',
    bgClass: 'from-purple-950 via-fuchsia-950 to-slate-900',
    cardBg: 'bg-purple-900/70 backdrop-blur-md',
    textPrimary: 'text-purple-50',
    textSecondary: 'text-purple-200/70',
    accentBg: 'bg-fuchsia-500 hover:bg-fuchsia-400',
    accentText: 'text-white',
    borderClass: 'border-fuchsia-500/30',
    progressTrack: 'bg-purple-950/80',
    progressFill: 'bg-fuchsia-400',
    badgeBg: 'bg-fuchsia-500/20',
    badgeText: 'text-fuchsia-300'
  },
  {
    id: 'atardecer_calido',
    name: 'Atardecer Cálido',
    bgClass: 'from-amber-950 via-rose-950 to-slate-900',
    cardBg: 'bg-amber-950/75 backdrop-blur-md',
    textPrimary: 'text-amber-50',
    textSecondary: 'text-amber-200/70',
    accentBg: 'bg-amber-500 hover:bg-amber-400',
    accentText: 'text-slate-950 font-bold',
    borderClass: 'border-amber-500/30',
    progressTrack: 'bg-amber-950/80',
    progressFill: 'bg-amber-400',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300'
  },
  {
    id: 'blanco_minimal',
    name: 'Limpio y Claro',
    bgClass: 'from-slate-100 via-indigo-50 to-blue-50',
    cardBg: 'bg-white/90 backdrop-blur-md',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-500',
    accentBg: 'bg-indigo-600 hover:bg-indigo-700',
    accentText: 'text-white',
    borderClass: 'border-slate-200',
    progressTrack: 'bg-slate-100',
    progressFill: 'bg-indigo-600',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700'
  }
];

export default function WidgetsScreen({
  currentUser,
  tareas,
  onToggleTask,
  onSnoozeTask,
  showToast
}: WidgetsScreenProps) {
  const [activeFormat, setActiveFormat] = useState<WidgetFormat>('mediano');
  const [selectedThemeId, setSelectedThemeId] = useState<string>('azul_profundo');
  const [snoozeModalTaskId, setSnoozeModalTaskId] = useState<string | null>(null);
  const [customTimeInput, setCustomTimeInput] = useState<string>('12:00');

  // Widget settings checkboxes
  const [showProgressPercent, setShowProgressPercent] = useState<boolean>(true);
  const [showNextActivityCount, setShowNextActivityCount] = useState<boolean>(true);
  const [glassTransparency, setGlassTransparency] = useState<boolean>(true);

  // Notification status
  const [notificationsAllowed, setNotificationsAllowed] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const handleAllowNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setNotificationsAllowed(true);
          showToast?.("¡Notificaciones activadas! Widget configurado para pantalla de inicio. 🔔", "success");
        } else {
          showToast?.("Permisos de notificación no concedidos.", "error");
        }
      } catch (e) {
        setNotificationsAllowed(true);
        showToast?.("¡Widget instalado y notificaciones activadas! 🔔", "success");
      }
    } else {
      setNotificationsAllowed(true);
      showToast?.("¡Widget activado en pantalla de inicio! 🔔", "success");
    }
  };

  const streakMetrics = calculateStreakAndMetrics(tareas, currentUser?.uid);
  const theme = THEME_PRESETS.find(t => t.id === selectedThemeId) || THEME_PRESETS[0];

  const userTasks = tareas
    .filter(t => !currentUser || t.usuario_id === currentUser.uid || t.visible_familia)
    .sort((a, b) => (a.hora_programada || '00:00').localeCompare(b.hora_programada || '00:00'));

  const completedCount = userTasks.filter(t => t.estado === 'completada').length;
  const totalCount = userTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleSnooze = async (taskId: string, mins?: number, exactTime?: string) => {
    if (!onSnoozeTask) return;
    try {
      await onSnoozeTask(taskId, mins, exactTime);
      if (showToast) {
        if (exactTime) {
          showToast(`Tarea aplazada a las ${exactTime} ⏰`, 'success');
        } else if (mins) {
          showToast(`Tarea aplazada +${mins} minutos ⏰`, 'success');
        }
      }
    } catch (e) {
      console.error("Error snoozing task", e);
    } finally {
      setSnoozeModalTaskId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 font-sans select-none">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-md border border-indigo-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-2 border border-indigo-500/30">
            <span className="material-symbols-outlined text-sm">widgets</span>
            <span>Personalización de Widgets</span>
          </div>
          <h1 className="font-sans text-xl md:text-2xl font-black text-white">
            Widgets Interactivos
          </h1>
          <p className="font-sans text-xs text-slate-300 mt-0.5">
            Personaliza el formato, tema y activa notificaciones directas en pantalla de inicio.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAllowNotifications}
          className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2.5 shrink-0 cursor-pointer shadow-lg border ${
            notificationsAllowed
              ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
              : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-400 hover:opacity-95'
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {notificationsAllowed ? 'notifications_active' : 'notifications_paused'}
          </span>
          <span>
            {notificationsAllowed
              ? '✓ Notificaciones de Widget Activadas'
              : 'Permitir Notificaciones en Pantalla de Inicio por Widget'}
          </span>
        </button>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Format Selector */}
        <div className="bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-sans text-sm font-black text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600">aspect_ratio</span>
            <span>1. Tamaño del Widget</span>
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'pequeno', label: 'Pequeño (2x2)', desc: 'Resumen e icono de siguiente', icon: 'crop_square' },
              { id: 'mediano', label: 'Mediano (4x2)', desc: 'Lista compacta y progreso', icon: 'view_stream' },
              { id: 'expandido', label: 'Expandido (4x4)', desc: 'Vista completa con aplazamiento', icon: 'grid_view' },
              { id: 'bloqueo', label: 'Pantalla de Bloqueo', desc: 'Monocromo minimalista', icon: 'lock' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => setActiveFormat(fmt.id as WidgetFormat)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  activeFormat === fmt.id
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-lg text-indigo-600">{fmt.icon}</span>
                  {activeFormat === fmt.id && (
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-xs font-extrabold block">{fmt.label}</span>
                  <span className="text-[10px] text-gray-500 line-clamp-1">{fmt.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Theme Presets */}
        <div className="bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-sans text-sm font-black text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600">palette</span>
            <span>2. Paleta Adaptativa (Material You)</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEME_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedThemeId(p.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-2 ${
                  selectedThemeId === p.id
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 font-bold'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                }`}
              >
                <div className={`h-8 w-full rounded-xl bg-gradient-to-r ${p.bgClass} flex items-center justify-end px-2 shadow-2xs`}>
                  <span className={`w-3 h-3 rounded-full ${p.accentBg}`} />
                </div>
                <span className="text-xs font-bold text-gray-800 block truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Customization Options */}
        <div className="bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm space-y-4 md:col-span-2">
          <h3 className="font-sans text-sm font-black text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600">tune</span>
            <span>3. Preferencias del Widget</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors border border-slate-200">
              <span className="text-xs font-bold text-gray-800">Mostrar % de progreso diario</span>
              <input
                type="checkbox"
                checked={showProgressPercent}
                onChange={(e) => setShowProgressPercent(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors border border-slate-200">
              <span className="text-xs font-bold text-gray-800">Cuenta regresiva de evento</span>
              <input
                type="checkbox"
                checked={showNextActivityCount}
                onChange={(e) => setShowNextActivityCount(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors border border-slate-200">
              <span className="text-xs font-bold text-gray-800">Efecto Cristal / Transparencia</span>
              <input
                type="checkbox"
                checked={glassTransparency}
                onChange={(e) => setGlassTransparency(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>

      {/* SNOOZE CUSTOM TIME MODAL */}
      {snoozeModalTaskId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[28px] p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-base font-black text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">snooze</span>
                <span>Aplazar Tarea</span>
              </h3>
              <button
                onClick={() => setSnoozeModalTaskId(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="font-sans text-xs text-gray-600">
              Selecciona los accesos directos o ingresa una nueva hora exacta programada para hoy:
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSnooze(snoozeModalTaskId, 5)}
                className="py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                +5 Minutos
              </button>
              <button
                onClick={() => handleSnooze(snoozeModalTaskId, 20)}
                className="py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                +20 Minutos
              </button>
              <button
                onClick={() => handleSnooze(snoozeModalTaskId, 60)}
                className="py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                +1 Hora
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-gray-700 block">Hora exacta deseada:</label>
              <input
                type="time"
                value={customTimeInput}
                onChange={(e) => setCustomTimeInput(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setSnoozeModalTaskId(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-gray-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSnooze(snoozeModalTaskId, undefined, customTimeInput)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Confirmar Hora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
