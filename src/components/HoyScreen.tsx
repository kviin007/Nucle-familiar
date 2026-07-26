import React, { useState, useEffect } from 'react';
import { TareaDiaria, Usuario, Meta, DiarioEntrada } from '../types';
import { getCountdownInfo } from '../utils/countdown';
import { calculateStreakAndMetrics } from '../utils/streaks';

interface HoyScreenProps {
  usuarios: Usuario[];
  tareas: TareaDiaria[];
  metas: Meta[];
  diario?: DiarioEntrada[];
  currentUser: any;
  onToggleTask: (taskId: string) => void;
  onAddTaskClick: () => void;
  onGoToMetas?: () => void;
  onGoToDiario?: () => void;
}

const EMOTION_CONFIG: Record<string, { emoji: string; label: string; bg: string; text: string; border: string; score: number }> = {
  Great: { emoji: '😄', label: 'Excelente', bg: 'bg-emerald-100 text-emerald-900', text: 'text-emerald-700', border: 'border-emerald-200', score: 5 },
  Good: { emoji: '🙂', label: 'Bueno', bg: 'bg-blue-100 text-blue-900', text: 'text-blue-700', border: 'border-blue-200', score: 4 },
  Okay: { emoji: '😐', label: 'Tranquilo', bg: 'bg-amber-100 text-amber-900', text: 'text-amber-700', border: 'border-amber-200', score: 3 },
  Sad: { emoji: '😔', label: 'Algo triste', bg: 'bg-indigo-100 text-indigo-900', text: 'text-indigo-700', border: 'border-indigo-200', score: 2 },
  Angry: { emoji: '😡', label: 'Frustrado', bg: 'bg-rose-100 text-rose-900', text: 'text-rose-700', border: 'border-rose-200', score: 1 },
};

type TaskCategoryFilter = 'Todas' | 'Hogar' | 'Estudio' | 'Salud' | 'Personal' | 'Otros';
type TaskScopeFilter = 'mis_tareas' | 'familia' | 'todas';

const MEMBER_COLORS = [
  { border: 'border-indigo-200', bg: 'bg-indigo-50/70', text: 'text-indigo-800', badge: 'bg-indigo-600', ring: 'ring-indigo-300' },
  { border: 'border-emerald-200', bg: 'bg-emerald-50/70', text: 'text-emerald-800', badge: 'bg-emerald-600', ring: 'ring-emerald-300' },
  { border: 'border-purple-200', bg: 'bg-purple-50/70', text: 'text-purple-800', badge: 'bg-purple-600', ring: 'ring-purple-300' },
  { border: 'border-amber-200', bg: 'bg-amber-50/70', text: 'text-amber-800', badge: 'bg-amber-600', ring: 'ring-amber-300' },
  { border: 'border-rose-200', bg: 'bg-rose-50/70', text: 'text-rose-800', badge: 'bg-rose-600', ring: 'ring-rose-300' },
];

const CATEGORY_CONFIG: {
  [key in TaskCategoryFilter]: {
    label: string;
    icon: string;
    activeBg: string;
    activeText: string;
    badgeColor: string;
    borderColor: string;
    lightBg: string;
  };
} = {
  Todas: {
    label: 'Todas',
    icon: 'apps',
    activeBg: 'bg-brand-primary',
    activeText: 'text-white',
    badgeColor: 'bg-indigo-700 text-white',
    borderColor: 'border-indigo-200',
    lightBg: 'bg-indigo-50/80 text-indigo-900',
  },
  Hogar: {
    label: 'Hogar',
    icon: 'home',
    activeBg: 'bg-amber-500',
    activeText: 'text-white',
    badgeColor: 'bg-amber-100 text-amber-900',
    borderColor: 'border-amber-200',
    lightBg: 'bg-amber-50 text-amber-900',
  },
  Estudio: {
    label: 'Estudio',
    icon: 'school',
    activeBg: 'bg-blue-600',
    activeText: 'text-white',
    badgeColor: 'bg-blue-100 text-blue-900',
    borderColor: 'border-blue-200',
    lightBg: 'bg-blue-50 text-blue-900',
  },
  Salud: {
    label: 'Salud',
    icon: 'health_and_safety',
    activeBg: 'bg-emerald-600',
    activeText: 'text-white',
    badgeColor: 'bg-emerald-100 text-emerald-900',
    borderColor: 'border-emerald-200',
    lightBg: 'bg-emerald-50 text-emerald-900',
  },
  Personal: {
    label: 'Personal',
    icon: 'person',
    activeBg: 'bg-purple-600',
    activeText: 'text-white',
    badgeColor: 'bg-purple-100 text-purple-900',
    borderColor: 'border-purple-200',
    lightBg: 'bg-purple-50 text-purple-900',
  },
  Otros: {
    label: 'Otros',
    icon: 'more_horiz',
    activeBg: 'bg-slate-700',
    activeText: 'text-white',
    badgeColor: 'bg-slate-200 text-slate-800',
    borderColor: 'border-slate-300',
    lightBg: 'bg-slate-100 text-slate-800',
  },
};

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function HoyScreen({ usuarios = [], tareas = [], metas = [], diario = [], currentUser, onToggleTask, onAddTaskClick, onGoToMetas, onGoToDiario }: HoyScreenProps) {
  const [activeView, setActiveView] = useState<'lista' | 'calendario'>('lista');
  const [selectedCategory, setSelectedCategory] = useState<TaskCategoryFilter>('Todas');
  const [taskScope, setTaskScope] = useState<TaskScopeFilter>('mis_tareas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('todos');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [showDigestModal, setShowDigestModal] = useState<boolean>(false);

  // Live timer tick to update countdowns automatically every 30 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Compute Streak and Daily/Weekly/Monthly metrics
  const streakMetrics = calculateStreakAndMetrics(tareas, currentUser?.uid);

  // Trigger Daily Digest on first load of Hoy screen
  useEffect(() => {
    const digestShown = sessionStorage.getItem(`daily_digest_shown_${currentUser?.uid || 'guest'}`);
    if (!digestShown) {
      setShowDigestModal(true);
    }
  }, [currentUser?.uid]);

  const closeDigestModal = () => {
    setShowDigestModal(false);
    sessionStorage.setItem(`daily_digest_shown_${currentUser?.uid || 'guest'}`, 'true');
  };

  // Helper function to get color for a member
  const getMemberColor = (userId: string) => {
    const index = usuarios.findIndex(u => u.uid === userId);
    return MEMBER_COLORS[Math.max(0, index) % MEMBER_COLORS.length];
  };

  // Overall family stats
  const familyTasks = tareas.filter(t => t.visible_familia);
  const totalFamilyTasks = familyTasks.length;
  const completedFamilyTasks = familyTasks.filter(t => t.estado === 'completada').length;
  const weeklyPercent = totalFamilyTasks > 0 ? Math.round((completedFamilyTasks / totalFamilyTasks) * 100) : 75;

  // Base tasks depending on scope filter
  const baseScopeTasks = tareas.filter(t => {
    if (taskScope === 'mis_tareas') {
      return t.usuario_id === currentUser?.uid;
    }
    if (taskScope === 'familia') {
      return t.visible_familia;
    }
    return true; // todas
  });

  // Filter tasks by category & search query
  const filteredUserTasks = baseScopeTasks.filter(t => {
    const matchCategory = selectedCategory === 'Todas' || (t.categoria || 'Otros') === selectedCategory;
    const matchQuery = !searchQuery.trim() || t.titulo.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchCategory && matchQuery;
  });

  // Helper to count tasks per category within current scope
  const getCategoryTaskCount = (cat: TaskCategoryFilter) => {
    if (cat === 'Todas') return baseScopeTasks.length;
    return baseScopeTasks.filter(t => (t.categoria || 'Otros') === cat).length;
  };

  // User pending tasks counter and imminent tasks (< 3 hours)
  const myPendingTasks = tareas.filter(t => t.usuario_id === currentUser?.uid && t.estado !== 'completada');
  const myPendingCount = myPendingTasks.length;

  const imminent3hTasks = myPendingTasks.filter(t => {
    if (!t.hora_programada) return false;
    const [hStr, mStr] = t.hora_programada.split(':');
    const taskH = parseInt(hStr || '12', 10);
    const taskM = parseInt(mStr || '0', 10);
    const taskTotalMin = taskH * 60 + taskM;
    const currentTotalMin = currentHours * 60 + currentMinutes;
    const diffHours = (taskTotalMin - currentTotalMin) / 60;
    return diffHours >= -2 && diffHours <= 3;
  });
  const hasImminent3h = imminent3hTasks.length > 0;

  // Daily Digest Upcoming Tasks (Next 4 hours or pending tasks)
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  const userTasksForDigest = tareas.filter(t => t.usuario_id === currentUser?.uid);
  const upcoming4hTasks = userTasksForDigest.filter((t) => {
    if (t.estado === 'completada') return false;
    if (!t.hora_programada) return true;
    const [hStr, mStr] = t.hora_programada.split(':');
    const taskH = parseInt(hStr || '12', 10);
    const taskM = parseInt(mStr || '0', 10);
    const taskTotalMin = taskH * 60 + taskM;
    const currentTotalMin = currentHours * 60 + currentMinutes;
    const diffHours = (taskTotalMin - currentTotalMin) / 60;
    
    return diffHours >= -2 && diffHours <= 4;
  });

  // Calculate 7 dates of the week based on weekOffset (Monday to Sunday)
  const getWeekDates = (offset: number) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday
    const distToMon = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distToMon + offset * 7);
    monday.setHours(0, 0, 0, 0);

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates(weekOffset);
  const todayStr = new Date().toISOString().split('T')[0];

  // Format week range header label
  const startDay = weekDates[0];
  const endDay = weekDates[6];
  const weekRangeLabel = `${startDay.getDate()} ${MONTH_NAMES[startDay.getMonth()]} - ${endDay.getDate()} ${MONTH_NAMES[endDay.getMonth()]}, ${endDay.getFullYear()}`;

  // Get tasks for a specific calendar day
  const getTasksForDay = (dayDate: Date) => {
    const dayStr = dayDate.toISOString().split('T')[0];
    const dayOfWeekIndex = dayDate.getDay(); // 0 = Dom, 1 = Lun, ...

    return tareas.filter((task) => {
      // Member filter
      if (selectedMemberFilter !== 'todos' && task.usuario_id !== selectedMemberFilter) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'Todas' && (task.categoria || 'Otros') !== selectedCategory) {
        return false;
      }

      const taskDateStr = task.ultima_actualizacion ? task.ultima_actualizacion.split('T')[0] : null;

      // 1. Direct date match
      if (taskDateStr === dayStr) {
        return true;
      }

      // 2. Goal preferred days match
      if (task.meta_id) {
        const parentMeta = metas.find(m => m.meta_id === task.meta_id);
        if (parentMeta?.dias_preferidos && parentMeta.dias_preferidos.includes(dayOfWeekIndex === 0 ? 0 : dayOfWeekIndex)) {
          return true;
        }
      }

      // 3. Fallback for current week: if no specific date set, match today's column
      if (weekOffset === 0 && dayStr === todayStr && (!taskDateStr || taskDateStr === todayStr)) {
        return true;
      }

      return false;
    });
  };

  // Compute total tasks in selected week for calendar view
  const allWeekTasks = weekDates.flatMap(d => getTasksForDay(d));
  const uniqueWeekTasks = Array.from(new Set(allWeekTasks.map(t => t.tarea_id)))
    .map(id => allWeekTasks.find(t => t.tarea_id === id)!);
  const completedWeekTasks = uniqueWeekTasks.filter(t => t.estado === 'completada').length;
  const calendarWeekPercent = uniqueWeekTasks.length > 0
    ? Math.round((completedWeekTasks / uniqueWeekTasks.length) * 100)
    : 0;

  const categoriesList: TaskCategoryFilter[] = ['Todas', 'Hogar', 'Estudio', 'Salud', 'Personal', 'Otros'];

  // --- WIDGET 1: USER ACTIVE GOALS SUMMARY ---
  const myActiveGoals = metas.filter(m => {
    if (m.usuario_id === currentUser?.uid) return true;
    if (m.tipo === 'familiar') {
      return !m.miembros_asignados || m.miembros_asignados.length === 0 || m.miembros_asignados.includes(currentUser?.uid);
    }
    return false;
  });

  const activeGoalsCount = myActiveGoals.length;
  const completedGoalsCount = myActiveGoals.filter(m => {
    const pct = m.tipo === 'familiar'
      ? (m.progreso_por_miembro?.find(p => p.usuario_id === currentUser?.uid)?.porcentaje ?? m.porcentaje_semanal ?? 0)
      : (m.porcentaje_semanal || 0);
    return pct >= 100;
  }).length;

  const avgGoalProgress = activeGoalsCount > 0
    ? Math.round(myActiveGoals.reduce((acc, m) => {
        const pct = m.tipo === 'familiar'
          ? (m.progreso_por_miembro?.find(p => p.usuario_id === currentUser?.uid)?.porcentaje ?? m.porcentaje_semanal ?? 0)
          : (m.porcentaje_semanal || 0);
        return acc + pct;
      }, 0) / activeGoalsCount)
    : 0;

  // --- WIDGET 2: FAMILY MOOD SUMMARY FROM JOURNAL ENTRIES ---
  const familyVisibleEntries = diario.filter(d => d.visible_familia || d.usuario_id === currentUser?.uid);

  // Map each user to their latest diary entry
  const familyMemberMoods = usuarios.map(u => {
    const userEntries = familyVisibleEntries
      .filter(d => d.usuario_id === u.uid)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return {
      usuario: u,
      latestEntry: userEntries[0] || null
    };
  });

  const membersWithMood = familyMemberMoods.filter(item => item.latestEntry);

  let familyClimate = {
    label: 'Sin publicaciones hoy',
    emoji: '💛',
    badgeStyle: 'bg-slate-100 text-slate-800 border-slate-200',
    description: 'Aún no hay registros de emociones en el diario hoy'
  };

  if (membersWithMood.length > 0) {
    const totalScore = membersWithMood.reduce((acc, item) => {
      const em = item.latestEntry?.emocion || 'Okay';
      return acc + (EMOTION_CONFIG[em]?.score || 3);
    }, 0);
    const avgScore = totalScore / membersWithMood.length;

    if (avgScore >= 4.2) {
      familyClimate = {
        label: '¡Súper Positivo y Animado!',
        emoji: '😄',
        badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        description: 'La mayoría de la familia se siente excelente'
      };
    } else if (avgScore >= 3.4) {
      familyClimate = {
        label: 'Agradable y Armónico',
        emoji: '🙂',
        badgeStyle: 'bg-blue-100 text-blue-900 border-blue-300',
        description: 'Ambiente alegre y en buen equilibrio'
      };
    } else if (avgScore >= 2.6) {
      familyClimate = {
        label: 'Tranquilo / En Calma',
        emoji: '😐',
        badgeStyle: 'bg-amber-100 text-amber-900 border-amber-300',
        description: 'Día sereno con ánimos estables'
      };
    } else if (avgScore >= 1.8) {
      familyClimate = {
        label: 'Sensible / Requiere Apoyo',
        emoji: '😔',
        badgeStyle: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        description: 'Algunos miembros necesitan un momento de cariño'
      };
    } else {
      familyClimate = {
        label: 'Día Desafiante',
        emoji: '😡',
        badgeStyle: 'bg-rose-100 text-rose-900 border-rose-300',
        description: 'Tensión o frustración reportada en el diario'
      };
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header Section */}
      <section className="flex flex-col md:flex-row md:justify-between md:items-stretch gap-4">
        <div className="flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-sans text-xs font-semibold text-gray-500 uppercase tracking-widest">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <button
              onClick={() => setShowDigestModal(true)}
              className="bg-indigo-50 text-brand-primary border border-indigo-100 hover:bg-indigo-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">notifications_active</span>
              Resumen Diario
            </button>
          </div>
          <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            ¡Buenos días, {currentUser?.nombre || 'Familia'}!
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Contador de Tareas Pendientes del Usuario con animación < 3 horas */}
          <div className={`bg-white rounded-[24px] p-4 shadow-xl shadow-indigo-100/30 border transition-all flex items-center gap-4 flex-1 sm:flex-initial ${
            hasImminent3h ? 'border-amber-400 ring-2 ring-amber-300/50 bg-amber-50/20' : 'border-indigo-50/60'
          }`}>
            <div className="relative flex-shrink-0">
              <div className={`w-13 h-13 rounded-2xl flex items-center justify-center font-black text-xl transition-all ${
                hasImminent3h
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 animate-pulse'
                  : 'bg-indigo-50 text-brand-primary'
              }`}>
                {myPendingCount}
              </div>
              {hasImminent3h && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white items-center justify-center text-[9px] text-white font-black">
                    ⚡
                  </span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-sans text-xs font-bold text-gray-900">Mis Pendientes</h3>
                {hasImminent3h && (
                  <span className="bg-amber-100 text-amber-900 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 animate-bounce">
                    <span className="material-symbols-outlined text-[11px] animate-spin">schedule</span>
                    &lt; 3h
                  </span>
                )}
              </div>
              <p className="font-sans text-[11px] text-gray-500 mt-0.5">
                {hasImminent3h ? (
                  <span className="text-amber-700 font-semibold">
                    🔥 {imminent3hTasks.length} tarea(s) próxima(s)
                  </span>
                ) : myPendingCount === 0 ? (
                  <span className="text-emerald-600 font-medium">¡Al día!</span>
                ) : (
                  <span>{myPendingCount} por completar hoy</span>
                )}
              </p>
            </div>
          </div>

          {/* Circular Progress Weekly Goal */}
          <div className="bg-white rounded-[24px] p-4 shadow-xl shadow-indigo-100/30 border border-indigo-50/60 flex items-center gap-4 flex-1 sm:flex-initial">
            <div className="relative w-13 h-13 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#edeef0" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="40"
                  stroke="#6366F1"
                  strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * weeklyPercent) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-sans text-xs font-extrabold text-[#6366F1]">{weeklyPercent}%</span>
              </div>
            </div>
            <div>
              <h3 className="font-sans text-xs font-bold text-gray-900">Meta Semanal</h3>
              <p className="font-sans text-[11px] text-gray-500 mt-0.5">{completedFamilyTasks}/{totalFamilyTasks} Tareas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quote of the Day Banner */}
      <section className="bg-indigo-50/30 border border-indigo-100/50 rounded-2xl p-4 relative overflow-hidden shadow-xs">
        <span className="font-serif absolute -top-3 -left-1 text-7xl text-brand-dark/5 select-none font-bold">“</span>
        <div className="relative z-10 text-center max-w-xl mx-auto space-y-1">
          <p className="font-sans text-sm text-brand-dark font-medium italic">
            "El amor de la familia es el mayor regalo de la vida y el mejor legado que podemos construir juntos."
          </p>
          <p className="font-sans text-[9px] text-brand-primary uppercase tracking-widest font-extrabold">PENSAMIENTO DEL DÍA</p>
        </div>
      </section>

      {/* SECCIÓN DE PROGRESO DIARIO Y RACHAS (STREAKS & PROGRESS) */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[28px] p-5 md:p-6 text-white shadow-xl relative overflow-hidden space-y-4">
        <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg">
              <span className="material-symbols-outlined text-2xl animate-bounce">local_fire_department</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                  Racha Activa
                </span>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/30">
                  🔥 {streakMetrics.currentStreakDays} {streakMetrics.currentStreakDays === 1 ? 'día' : 'días'} seguidos
                </span>
              </div>
              <h3 className="font-sans text-base md:text-lg font-black text-white">
                Progreso Diario & Cumplimiento
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-indigo-200 shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-indigo-300/80 uppercase block">Rendimiento Semanal</span>
              <span className="text-sm font-black text-emerald-400">{streakMetrics.weeklyCompliancePercentage}%</span>
            </div>
            <div className="w-px h-8 bg-indigo-800/80" />
            <div className="text-right">
              <span className="text-[10px] text-indigo-300/80 uppercase block">Rendimiento Mensual</span>
              <span className="text-sm font-black text-blue-400">{streakMetrics.monthlyCompliancePercentage}%</span>
            </div>
          </div>
        </div>

        {/* General Progress Bar */}
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-indigo-200">
              {streakMetrics.completedTodayCount} de {streakMetrics.totalTodayCount} tareas completadas hoy
            </span>
            <span className="text-amber-400 font-extrabold">{streakMetrics.todayPercentage}%</span>
          </div>
          <div className="w-full bg-slate-800/90 h-3 rounded-full overflow-hidden p-0.5 border border-indigo-900/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-400 transition-all duration-700 shadow-sm"
              style={{ width: `${streakMetrics.todayPercentage}%` }}
            />
          </div>
        </div>
      </section>

      {/* WIDGETS SECTION: METAS ACTIVAS & ESTADO DE ÁNIMO FAMILIAR */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CARD 1: METAS ACTIVAS DEL USUARIO */}
        <div className="bg-white rounded-[28px] p-5 border border-indigo-100/80 shadow-md shadow-indigo-100/20 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                  <span className="material-symbols-outlined text-xl">ads_click</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-sans text-sm font-extrabold text-gray-900">
                      Mis Metas Activas
                    </h3>
                    <span className="bg-indigo-100 text-indigo-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {activeGoalsCount} {activeGoalsCount === 1 ? 'meta' : 'metas'}
                    </span>
                  </div>
                  <p className="font-sans text-[11px] text-gray-500">
                    Avance medio: <strong className="text-indigo-700">{avgGoalProgress}%</strong> ({completedGoalsCount} al 100%)
                  </p>
                </div>
              </div>

              {onGoToMetas && (
                <button
                  onClick={onGoToMetas}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  Ver todas
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              )}
            </div>

            {/* Overall Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${avgGoalProgress}%` }}
              />
            </div>

            {/* Goals List Preview */}
            {myActiveGoals.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center space-y-2">
                <span className="material-symbols-outlined text-gray-400 text-2xl">flag</span>
                <p className="text-xs text-gray-500 font-medium">No tienes metas activas registradas actualmente.</p>
                {onGoToMetas && (
                  <button
                    onClick={onGoToMetas}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                    Crear mi primera meta
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                {myActiveGoals.slice(0, 3).map((goal) => {
                  const goalPct = goal.tipo === 'familiar'
                    ? (goal.progreso_por_miembro?.find(p => p.usuario_id === currentUser?.uid)?.porcentaje ?? goal.porcentaje_semanal ?? 0)
                    : (goal.porcentaje_semanal || 0);

                  const categoryIcons: Record<string, string> = {
                    Salud: 'health_and_safety',
                    Estudio: 'school',
                    Finanzas: 'payments',
                    Hogar: 'home',
                    Personal: 'person'
                  };

                  return (
                    <div
                      key={goal.meta_id}
                      onClick={onGoToMetas}
                      className="p-3 bg-slate-50/80 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 rounded-2xl transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-indigo-600 text-base shrink-0">
                            {categoryIcons[goal.categoria] || 'flag'}
                          </span>
                          <span className="font-sans text-xs font-bold text-gray-900 truncate">
                            {goal.titulo}
                          </span>
                        </div>
                        <span className="text-xs font-black text-indigo-700 shrink-0">
                          {goalPct}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-bold text-gray-700">
                            {goal.frecuencia_objetivo}x / {goal.unidad_frecuencia}
                          </span>
                          {goal.recompensa_activa && (
                            <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded-md font-extrabold flex items-center gap-0.5">
                              🎁 Premio
                            </span>
                          )}
                          {goal.consecuencias_activas && (
                            <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-md font-extrabold flex items-center gap-0.5">
                              ⚠️ Consecuencia
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-900">
                          {goal.tipo === 'familiar' ? 'Familiar' : 'Individual'}
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            goalPct >= 100 ? 'bg-emerald-500' : goalPct >= 50 ? 'bg-indigo-600' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, goalPct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: ESTADO DE ÁNIMO DE LA FAMILIA */}
        <div className="bg-white rounded-[28px] p-5 border border-indigo-100/80 shadow-md shadow-indigo-100/20 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
                  <span className="material-symbols-outlined text-xl">mood</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-sans text-sm font-extrabold text-gray-900">
                      Estado de Ánimo Familiar
                    </h3>
                  </div>
                  <p className="font-sans text-[11px] text-gray-500">
                    Basado en las últimas publicaciones del diario
                  </p>
                </div>
              </div>

              {onGoToDiario && (
                <button
                  onClick={onGoToDiario}
                  className="text-amber-600 hover:text-amber-800 text-xs font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  Abrir Diario
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              )}
            </div>

            {/* Global Climate Badge */}
            <div className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 ${familyClimate.badgeStyle}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{familyClimate.emoji}</span>
                <div>
                  <span className="text-xs font-extrabold block">
                    {familyClimate.label}
                  </span>
                  <span className="text-[10px] opacity-80 block">
                    {familyClimate.description}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60 text-gray-800 shadow-2xs">
                {membersWithMood.length} / {usuarios.length} activos
              </span>
            </div>

            {/* Member Moods Breakdown */}
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {familyMemberMoods.map(({ usuario, latestEntry }) => {
                const emotionKey = latestEntry?.emocion || 'Okay';
                const emotionConfig = EMOTION_CONFIG[emotionKey] || EMOTION_CONFIG.Okay;
                const isCurrentUser = usuario.uid === currentUser?.uid;

                return (
                  <div
                    key={usuario.uid}
                    onClick={onGoToDiario}
                    className="p-2.5 bg-slate-50/80 hover:bg-amber-50/40 border border-slate-200/80 hover:border-amber-200 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={usuario.avatar_url}
                        alt={usuario.nombre}
                        className="w-8 h-8 rounded-full object-cover border border-white shadow-2xs shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-sans text-xs font-bold text-gray-900 truncate">
                            {usuario.nombre} {isCurrentUser ? '(Tú)' : ''}
                          </span>
                        </div>
                        {latestEntry ? (
                          <p className="text-[10px] text-gray-500 truncate max-w-[200px] italic">
                            "{latestEntry.texto}"
                          </p>
                        ) : (
                          <p className="text-[10px] text-gray-400">Sin entrada aún</p>
                        )}
                      </div>
                    </div>

                    {latestEntry ? (
                      <span className={`px-2 py-1 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 shrink-0 ${emotionConfig.bg} ${emotionConfig.border}`}>
                        <span>{emotionConfig.emoji}</span>
                        <span>{emotionConfig.label}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-xl border border-slate-200 bg-white text-gray-400 text-[10px] font-bold shrink-0">
                        Pendiente
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* VIEW SWITCHER & CONTROL BAR */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-indigo-50 shadow-xs">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 w-full sm:w-auto">
          <button
            onClick={() => setActiveView('lista')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeView === 'lista'
                ? 'bg-white text-brand-primary shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">format_list_bulleted</span>
            Vista Hoy
          </button>
          <button
            onClick={() => setActiveView('calendario')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeView === 'calendario'
                ? 'bg-white text-brand-primary shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">calendar_view_week</span>
            Calendario Semanal
          </button>
        </div>

        <button
          onClick={onAddTaskClick}
          className="bg-brand-primary hover:bg-brand-dark text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Nueva Tarea
        </button>
      </section>

      {/* PROMINENT CATEGORY FILTER SELECTOR SECTION */}
      <section className="bg-white rounded-3xl p-5 border border-indigo-50/80 shadow-md shadow-indigo-100/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-brand-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">filter_alt</span>
            </div>
            <div>
              <h3 className="font-sans text-sm font-extrabold text-gray-900 flex items-center gap-2">
                Filtrar Tareas por Categoría
              </h3>
              <p className="font-sans text-[11px] text-gray-500">
                Selecciona una categoría para organizar tus responsabilidades diarias
              </p>
            </div>
          </div>

          {/* Active filter badge / Reset option */}
          {selectedCategory !== 'Todas' && (
            <button
              onClick={() => setSelectedCategory('Todas')}
              className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-xs font-bold transition-all self-start sm:self-auto cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Borrar Filtro ({selectedCategory})
            </button>
          )}
        </div>

        {/* Category Pills Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {categoriesList.map((cat) => {
            const isSelected = selectedCategory === cat;
            const config = CATEGORY_CONFIG[cat];
            const count = getCategoryTaskCount(cat);

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex flex-col items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? `${config.activeBg} ${config.activeText} border-transparent shadow-md scale-[1.03]`
                    : `bg-slate-50/80 hover:bg-white text-gray-700 border-slate-200/80 hover:border-indigo-200 hover:shadow-xs`
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className={`material-symbols-outlined text-lg ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                    {config.icon}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white backdrop-blur-xs'
                        : `${config.lightBg}`
                    }`}
                  >
                    {count}
                  </span>
                </div>

                <span className="font-sans text-xs font-extrabold tracking-tight truncate w-full text-center">
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* CONDITIONAL CONTENT: VISTA HOY vs CALENDARIO SEMANAL */}
      {activeView === 'lista' ? (
        /* VISTA HOY LIST */
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-sans text-lg font-extrabold text-gray-900">Rutina de Hoy</h3>
              <span className="text-xs text-brand-primary font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-full">
                {filteredUserTasks.length} {filteredUserTasks.length === 1 ? 'tarea' : 'tareas'}
              </span>
            </div>

            {/* Scope Toggle & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-48">
                <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-gray-400 text-sm">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por título..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl font-sans text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>

              {/* Scope Selector */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setTaskScope('mis_tareas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    taskScope === 'mis_tareas' ? 'bg-white text-brand-dark shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Mis Tareas
                </button>
                <button
                  onClick={() => setTaskScope('familia')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    taskScope === 'familia' ? 'bg-white text-brand-dark shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Familia
                </button>
                <button
                  onClick={() => setTaskScope('todas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    taskScope === 'todas' ? 'bg-white text-brand-dark shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Todas
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUserTasks.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-indigo-50/80 p-8 space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-brand-primary flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl">
                    {selectedCategory === 'Todas' ? 'task_alt' : CATEGORY_CONFIG[selectedCategory].icon}
                  </span>
                </div>
                
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="font-sans text-base font-extrabold text-gray-900">
                    {selectedCategory === 'Todas'
                      ? 'No hay tareas encontradas'
                      : `Sin tareas en la categoría "${selectedCategory}"`}
                  </h4>
                  <p className="font-sans text-xs text-gray-500">
                    {selectedCategory === 'Todas'
                      ? 'No tienes tareas registradas que coincidan con tu búsqueda actual.'
                      : `Aún no has agregado tareas de ${selectedCategory.toLowerCase()} para hoy.`}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  {selectedCategory !== 'Todas' && (
                    <button
                      onClick={() => setSelectedCategory('Todas')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-full font-sans text-xs font-bold transition-all cursor-pointer"
                    >
                      Ver todas las categorías
                    </button>
                  )}
                  <button
                    onClick={onAddTaskClick}
                    className="px-5 py-2 bg-brand-primary hover:bg-brand-dark text-white rounded-full font-sans text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Añadir Tarea
                  </button>
                </div>
              </div>
            ) : (
              filteredUserTasks.map((task) => {
                const isCompleted = task.estado === 'completada';
                const isInProgress = task.estado === 'en_progreso';
                const isOverdue = task.estado === 'vencido';
                const owner = usuarios.find(u => u.uid === task.usuario_id);
                const taskCat = (task.categoria || 'Otros') as TaskCategoryFilter;
                const catCfg = CATEGORY_CONFIG[taskCat] || CATEGORY_CONFIG.Otros;
                const countdown = !isCompleted ? getCountdownInfo(task.hora_programada) : null;

                return (
                  <div
                    key={task.tarea_id}
                    onClick={() => onToggleTask(task.tarea_id)}
                    className={`group cursor-pointer rounded-2xl p-4 bg-white border transition-all duration-300 flex items-start gap-4 ${
                      isCompleted
                        ? 'border-slate-100 opacity-60 bg-slate-50/50'
                        : isInProgress
                        ? 'border-brand-primary/30 ring-2 ring-brand-primary/10 shadow-xs'
                        : isOverdue
                        ? 'border-rose-100 bg-rose-50/10'
                        : 'border-slate-150 hover:border-brand-primary/30 hover:shadow-md'
                    }`}
                  >
                    {/* Custom Checkbox */}
                    <div
                      className={`w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                        isCompleted
                          ? 'bg-brand-primary border-brand-primary text-white'
                          : isInProgress
                          ? 'border-brand-primary bg-brand-light text-brand-dark'
                          : 'border-slate-300 bg-white group-hover:border-brand-primary'
                      }`}
                    >
                      {isCompleted && (
                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                      )}
                      {isInProgress && (
                        <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {task.es_prioridad_alta && (
                            <span className="material-symbols-outlined text-amber-500 text-sm font-bold flex-shrink-0" title="Alta Prioridad">
                              star
                            </span>
                          )}
                          <h4
                            className={`font-sans text-sm font-bold text-gray-900 truncate ${
                              isCompleted ? 'line-through text-gray-400' : ''
                            }`}
                          >
                            {task.titulo}
                          </h4>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap items-center gap-1 flex-shrink-0 justify-end">
                          {task.es_critica && (
                            <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm animate-pulse flex items-center gap-1 border border-rose-400">
                              <span className="material-symbols-outlined text-[12px]">warning</span>
                              <span>Tarea Crítica</span>
                            </span>
                          )}
                          {countdown && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 border transition-all ${countdown.badgeClass}`}>
                              <span className="material-symbols-outlined text-[12px]">{countdown.icon}</span>
                              <span>{countdown.label}</span>
                            </span>
                          )}
                          {task.es_prioridad_alta && (
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                              Prioritaria
                            </span>
                          )}
                          {isInProgress && (
                            <span className="bg-brand-light text-brand-dark px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              En Progreso
                            </span>
                          )}
                          {isOverdue && (
                            <span className="bg-rose-500/10 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              Atrasado
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2 items-center justify-between">
                        <div className="flex flex-wrap gap-2 items-center">
                          {/* Member avatar if family view */}
                          {owner && task.usuario_id !== currentUser?.uid && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-gray-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <img src={owner.avatar_url} alt={owner.nombre} className="w-3.5 h-3.5 rounded-full object-cover" />
                              {owner.nombre}
                            </span>
                          )}

                          <span className="bg-slate-100 text-gray-500 px-2.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            {task.hora_programada}
                          </span>

                          <span className="bg-slate-100 text-gray-500 px-2.5 py-0.5 rounded-full text-[10px] font-medium">
                            {task.tiempo_estimado_min} min
                          </span>

                          {/* Category Badge */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategory(taskCat);
                            }}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${catCfg.lightBg}`}
                            title={`Filtrar solo por ${taskCat}`}
                          >
                            <span className="material-symbols-outlined text-xs">{catCfg.icon}</span>
                            {taskCat}
                          </button>
                        </div>

                        {/* Direct Launch Mission / Focus Mode Button */}
                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTask(task.tarea_id);
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                              task.es_critica
                                ? 'bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white'
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">rocket_launch</span>
                            <span>{task.es_critica ? 'Iniciar Misión' : 'Modo Foco'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      ) : (
        /* CALENDARIO SEMANAL COMPARTIDO */
        <section className="space-y-6 animate-fade-in">
          {/* Week Navigation Header */}
          <div className="bg-white p-4 rounded-3xl border border-indigo-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-gray-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="Semana anterior"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                  {weekOffset === 0 ? 'Semana Actual' : weekOffset < 0 ? `Hace ${Math.abs(weekOffset)} semana(s)` : `En ${weekOffset} semana(s)`}
                </span>
                <h3 className="font-sans text-base md:text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600 text-xl">calendar_month</span>
                  {weekRangeLabel}
                </h3>
              </div>

              <button
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-gray-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="Semana siguiente"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">today</span>
                  Ir a Hoy
                </button>
              )}
            </div>
          </div>

          {/* Member Filter Pills & Weekly Progress Breakdown */}
          <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/70 to-pink-50/70 p-4 rounded-3xl border border-indigo-100/80 space-y-4">
            {/* Filter by Member Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-700 text-lg">groups</span>
                <span className="font-sans text-xs font-bold text-gray-900">
                  Miembros de la Familia:
                </span>
              </div>

              {/* Family Week Summary Pill */}
              <div className="bg-white/90 px-3 py-1 rounded-full border border-indigo-100 text-xs font-bold text-indigo-900 flex items-center gap-2 self-start sm:self-auto">
                <span>Cumplimiento Semanal:</span>
                <span className="text-brand-primary">{calendarWeekPercent}% ({completedWeekTasks}/{uniqueWeekTasks.length})</span>
              </div>
            </div>

            {/* Member Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedMemberFilter('todos')}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  selectedMemberFilter === 'todos'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-indigo-100 hover:bg-indigo-50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">groups</span>
                Toda la Familia ({uniqueWeekTasks.length})
              </button>

              {usuarios.map((u) => {
                const isSelected = selectedMemberFilter === u.uid;
                const mTasks = uniqueWeekTasks.filter(t => t.usuario_id === u.uid);
                const mCompleted = mTasks.filter(t => t.estado === 'completada').length;
                const mColor = getMemberColor(u.uid);

                return (
                  <button
                    key={u.uid}
                    onClick={() => setSelectedMemberFilter(u.uid)}
                    className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950 text-white shadow-sm ring-2 ring-indigo-400'
                        : `bg-white text-gray-800 border ${mColor.border} hover:bg-slate-50`
                    }`}
                  >
                    <img className="w-5 h-5 rounded-full object-cover border border-white" src={u.avatar_url} alt={u.nombre} />
                    <span>{u.nombre}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${isSelected ? 'bg-indigo-800 text-white' : mColor.bg + ' ' + mColor.text}`}>
                      {mCompleted}/{mTasks.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Per-Member Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1 border-t border-indigo-100/60">
              {usuarios.map((u) => {
                const mTasks = uniqueWeekTasks.filter(t => t.usuario_id === u.uid);
                const mCompleted = mTasks.filter(t => t.estado === 'completada').length;
                const mPercent = mTasks.length > 0 ? Math.round((mCompleted / mTasks.length) * 100) : 0;
                const mColor = getMemberColor(u.uid);

                return (
                  <div key={u.uid} className="bg-white/80 p-2.5 rounded-2xl border border-indigo-50 flex flex-col justify-between space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <img className="w-4 h-4 rounded-full object-cover" src={u.avatar_url} alt={u.nombre} />
                        <span className="font-bold text-gray-800 text-[11px] truncate">{u.nombre}</span>
                      </div>
                      <span className="font-extrabold text-[11px] text-indigo-700">{mPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${mColor.badge}`}
                        style={{ width: `${mPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7-DAY WEEKLY GRID MATRIX */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 overflow-x-auto pb-4">
            {weekDates.map((dayDate, dayIdx) => {
              const dayStr = dayDate.toISOString().split('T')[0];
              const isToday = dayStr === todayStr;
              const dayTasks = getTasksForDay(dayDate);
              const dayCompleted = dayTasks.filter(t => t.estado === 'completada').length;
              const dayPercent = dayTasks.length > 0 ? Math.round((dayCompleted / dayTasks.length) * 100) : 0;

              return (
                <div
                  key={dayIdx}
                  className={`bg-white rounded-3xl p-3 border shadow-xs flex flex-col justify-between min-h-[320px] transition-all ${
                    isToday
                      ? 'border-brand-primary ring-2 ring-brand-primary/20 bg-indigo-50/10'
                      : 'border-indigo-50/80 hover:border-indigo-100'
                  }`}
                >
                  {/* Day Column Header */}
                  <div className="border-b border-slate-100 pb-2 mb-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-sans text-xs font-extrabold uppercase tracking-wider ${isToday ? 'text-brand-primary' : 'text-gray-500'}`}>
                        {DAY_NAMES[dayDate.getDay()]}
                      </span>
                      {isToday && (
                        <span className="bg-brand-primary text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest">
                          Hoy
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className={`font-sans text-xl font-black ${isToday ? 'text-brand-primary' : 'text-gray-900'}`}>
                        {dayDate.getDate()} <span className="text-xs font-medium text-gray-400">{MONTH_NAMES[dayDate.getMonth()]}</span>
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-[10px] font-bold text-gray-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                          {dayCompleted}/{dayTasks.length} ✓
                        </span>
                      )}
                    </div>

                    {dayTasks.length > 0 && (
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-brand-primary h-full rounded-full transition-all duration-300"
                          style={{ width: `${dayPercent}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Tasks List for this Day */}
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[360px] pr-0.5 no-scrollbar">
                    {dayTasks.length === 0 ? (
                      <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center p-2 rounded-2xl bg-slate-50/50 border border-dashed border-slate-150">
                        <span className="material-symbols-outlined text-gray-300 text-2xl">event_available</span>
                        <span className="text-[10px] text-gray-400 font-medium mt-1">Sin tareas</span>
                      </div>
                    ) : (
                      dayTasks.map((task) => {
                        const owner = usuarios.find(u => u.uid === task.usuario_id);
                        const isCompleted = task.estado === 'completada';
                        const ownerColor = getMemberColor(task.usuario_id);
                        const taskCat = (task.categoria || 'Otros') as TaskCategoryFilter;
                        const catCfg = CATEGORY_CONFIG[taskCat] || CATEGORY_CONFIG.Otros;

                        return (
                          <div
                            key={task.tarea_id}
                            onClick={() => onToggleTask(task.tarea_id)}
                            className={`p-2.5 rounded-2xl border transition-all cursor-pointer group space-y-1.5 ${
                              isCompleted
                                ? 'bg-slate-50/80 border-slate-200 opacity-60'
                                : `${ownerColor.bg} ${ownerColor.border} hover:shadow-sm`
                            }`}
                          >
                            {/* Member Avatar & Time */}
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {owner && (
                                  <img
                                    className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                                    src={owner.avatar_url}
                                    alt={owner.nombre}
                                    title={owner.nombre}
                                  />
                                )}
                                <span className={`text-[10px] font-extrabold truncate ${ownerColor.text}`}>
                                  {owner?.nombre || 'Miembro'}
                                </span>
                              </div>

                              <span className="bg-white/80 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0">
                                {task.hora_programada || '09:00'}
                              </span>
                            </div>

                            {/* Title & Checkbox */}
                            <div className="flex items-start justify-between gap-1">
                              <p className={`font-sans text-xs font-bold leading-tight ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                {task.es_prioridad_alta && <span className="text-amber-500 mr-0.5">⭐</span>}
                                {task.titulo}
                              </p>

                              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isCompleted ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white group-hover:border-indigo-500'
                              }`}>
                                {isCompleted && <span className="material-symbols-outlined text-[10px] font-bold">check</span>}
                              </div>
                            </div>

                            {/* Category Badge & Duration */}
                            <div className="flex items-center justify-between text-[9px] text-gray-500 pt-0.5">
                              <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-extrabold ${catCfg.lightBg}`}>
                                <span className="material-symbols-outlined text-[10px]">
                                  {catCfg.icon}
                                </span>
                                {taskCat}
                              </span>
                              <span>{task.tiempo_estimado_min}m</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Task Button for Column */}
                  <button
                    onClick={onAddTaskClick}
                    className="w-full mt-2 py-1.5 rounded-xl border border-dashed border-indigo-200 hover:border-brand-primary hover:bg-indigo-50 text-indigo-600 text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                    Añadir
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Daily Digest Modal */}
      {showDigestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-indigo-50 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-brand-primary via-purple-500 to-amber-400" />
            
            <div className="flex justify-between items-start pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-brand-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">wb_sunny</span>
                </div>
                <div>
                  <h3 className="font-sans text-lg font-extrabold text-gray-900">Resumen Diario (Daily Digest)</h3>
                  <p className="font-sans text-xs text-gray-500">Próximas tareas programadas (Siguientes 4 Horas)</p>
                </div>
              </div>
              <button
                onClick={closeDigestModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-gray-500 flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            {upcoming4hTasks.length === 0 ? (
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 text-center space-y-1">
                <span className="material-symbols-outlined text-2xl text-emerald-600">task_alt</span>
                <p className="font-sans text-xs font-bold text-emerald-900">¡Todo bajo control!</p>
                <p className="font-sans text-[11px] text-emerald-700">No tienes tareas pendientes programadas para las próximas 4 horas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                  <span>Tareas Pendientes ({upcoming4hTasks.length})</span>
                  <span className="text-amber-600 text-[11px]">⏰ Próximo Bloque</span>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {upcoming4hTasks.map((t) => (
                    <div
                      key={t.tarea_id}
                      onClick={() => {
                        onToggleTask(t.tarea_id);
                        closeDigestModal();
                      }}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-indigo-50/50 cursor-pointer transition-all flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-sans text-xs font-bold text-gray-800 truncate flex items-center gap-1">
                          {t.es_prioridad_alta && <span className="text-amber-500 font-bold">⭐</span>}
                          {t.titulo}
                        </p>
                        <p className="font-sans text-[10px] text-gray-400">{t.categoria || 'General'} • {t.tiempo_estimado_min} min</p>
                      </div>
                      <span className="bg-indigo-100 text-brand-primary text-[10px] font-extrabold px-2 py-1 rounded-md flex-shrink-0">
                        {t.hora_programada}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-3 justify-end">
              <button
                onClick={closeDigestModal}
                className="w-full py-2.5 rounded-full bg-brand-primary hover:bg-brand-dark text-white font-sans text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
              >
                ¡Entendido, a darle con todo!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={onAddTaskClick}
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-brand-primary hover:bg-brand-dark text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all z-50 cursor-pointer"
      >
        <span className="material-symbols-outlined text-2xl font-bold">add</span>
      </button>
    </div>
  );
}
