import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import EmptyStateIllustration from './EmptyStateIllustration';
import GoogleTasksView from './GoogleTasksView';
import { TareaDiaria, Usuario, Meta } from '../types';
import { CheckCircle2, Circle, Target, Calendar, Clock, Sparkles, ChevronRight, ChevronDown, AlertCircle, Plus, Filter, Tag, FolderOpen, RefreshCw, ExternalLink, ListTodo, CalendarDays } from 'lucide-react';
import { fetchGoogleCalendarEvents, fetchGoogleTasks, GoogleCalendarEvent, GoogleTaskItem } from '../services/googleWorkspace';

interface HoyScreenProps {
  usuarios: Usuario[];
  tareas: TareaDiaria[];
  metas: Meta[];
  diario?: any[];
  currentUser: Usuario | null;
  googleAccessToken?: string | null;
  onConnectGoogleWorkspace?: () => void;
  onToggleTask: (taskId: string) => void;
  onAddTaskClick: () => void;
  onGoToMetas?: () => void;
  onGoToDiario?: () => void;
}

export default function HoyScreen({
  usuarios = [],
  tareas = [],
  metas = [],
  currentUser,
  googleAccessToken,
  onConnectGoogleWorkspace,
  onToggleTask,
  onAddTaskClick,
  onGoToMetas
}: HoyScreenProps) {
  const [activeTab, setActiveTab] = useState<'tareas' | 'calendar'>('tareas');
  const [filterScope, setFilterScope] = useState<'mis_tareas' | 'familia'>('mis_tareas');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Hogar': true,
    'Estudio': true,
    'Salud': true,
    'Personal': true,
    'Otros': true
  });

  // Google Calendar & Tasks state
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [googleTasks, setGoogleTasks] = useState<GoogleTaskItem[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState<boolean>(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const loadGoogleData = async () => {
    if (!googleAccessToken) return;
    setIsLoadingCalendar(true);
    setCalendarError(null);
    try {
      const events = await fetchGoogleCalendarEvents(googleAccessToken);
      setCalendarEvents(events);

      try {
        const gTasks = await fetchGoogleTasks(googleAccessToken);
        setGoogleTasks(gTasks);
      } catch (tErr) {
        console.warn("Could not load Google Tasks:", tErr);
      }
    } catch (err: any) {
      console.error("Error loading Google Calendar data:", err);
      setCalendarError(err.message || "Error al sincronizar con Google Calendar");
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'calendar' && googleAccessToken) {
      loadGoogleData();
    }
  }, [activeTab, googleAccessToken]);

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Filter Goals Pending
  const myPendingGoals = metas.filter(m => {
    const isMine = m.usuario_id === currentUser?.uid || 
      (m.tipo === 'familiar' && (!m.miembros_asignados || m.miembros_asignados.length === 0 || m.miembros_asignados.includes(currentUser?.uid || '')));
    
    if (!isMine) return false;

    const progressPct = m.tipo === 'familiar'
      ? (m.progreso_por_miembro?.find(p => p.usuario_id === currentUser?.uid)?.porcentaje ?? m.porcentaje_semanal ?? 0)
      : (m.porcentaje_semanal || 0);

    return progressPct < 100;
  });

  const completedGoalsCount = metas.filter(m => {
    const isMine = m.usuario_id === currentUser?.uid || 
      (m.tipo === 'familiar' && (!m.miembros_asignados || m.miembros_asignados.length === 0 || m.miembros_asignados.includes(currentUser?.uid || '')));
    if (!isMine) return false;
    const progressPct = m.tipo === 'familiar'
      ? (m.progreso_por_miembro?.find(p => p.usuario_id === currentUser?.uid)?.porcentaje ?? m.porcentaje_semanal ?? 0)
      : (m.porcentaje_semanal || 0);
    return progressPct >= 100;
  }).length;

  // Filter Tasks for Today
  const scopedTasks = tareas.filter(t => {
    if (filterScope === 'mis_tareas') {
      return t.usuario_id === currentUser?.uid;
    }
    return t.visible_familia;
  });

  const categories = ['Hogar', 'Estudio', 'Salud', 'Personal', 'Otros'];

  const getAssigneeName = (uid: string) => {
    const found = usuarios.find(u => u.uid === uid);
    return found ? found.nombre : 'Familiar';
  };

  const handleTaskToggle = (taskId: string, wasCompleted: boolean) => {
    onToggleTask(taskId);
    if (!wasCompleted) {
      // Check if this was the last remaining task
      const remaining = scopedTasks.filter(t => t.estado !== 'completada' && t.tarea_id !== taskId);
      if (remaining.length === 0 && scopedTasks.length > 0) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 }
        });
      }
    }
  };

  const totalScopedCount = scopedTasks.length;
  const completedScopedCount = scopedTasks.filter(t => t.estado === 'completada').length;
  const pendingTasksTotal = totalScopedCount - completedScopedCount;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 select-none font-sans max-w-5xl mx-auto pb-12"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <Sparkles size={14} className="text-amber-400" />
            <span>Resumen del Día</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ¡Hola, {currentUser?.nombre || 'Familiar'}! 👋
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200/90 font-medium max-w-md">
            Aquí tienes tus metas y tareas diarias pendientes por cumplir. ¡Mantén el enfoque y suma puntos hoy!
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto">
          <button
            type="button"
            onClick={onAddTaskClick}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs active:scale-95"
          >
            <Plus size={18} />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* VIEW TOGGLE BAR: INTERNAL TASKS VS GOOGLE CALENDAR */}
      <div className="bg-white p-2 rounded-2xl border border-indigo-50 shadow-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('tareas')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'tareas'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ListTodo size={16} />
            <span>Tareas del Núcleo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-brand-primary text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CalendarDays size={16} />
            <span>Google Calendar & Tasks</span>
          </button>
        </div>

        {activeTab === 'calendar' && googleAccessToken && (
          <button
            type="button"
            onClick={loadGoogleData}
            disabled={isLoadingCalendar}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-brand-primary rounded-xl text-xs font-extrabold transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={isLoadingCalendar ? 'animate-spin' : ''} />
            <span>Sincronizar</span>
          </button>
        )}
      </div>

      {/* GOOGLE CALENDAR TAB CONTENT */}
      {activeTab === 'calendar' ? (
        <div className="space-y-6 animate-fade-in">
          {!googleAccessToken ? (
            <div className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-100/30 text-center max-w-lg mx-auto space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-brand-primary flex items-center justify-center mx-auto text-3xl font-black shadow-sm">
                🗓️
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-extrabold text-slate-900">Conecta tu Google Calendar</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Sincroniza tus eventos y tareas de Google directamente en tu panel de Hoy para no perder de vista tus compromisos.
                </p>
              </div>

              {onConnectGoogleWorkspace && (
                <button
                  type="button"
                  onClick={onConnectGoogleWorkspace}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs py-3.5 px-5 rounded-2xl border border-slate-300 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                  </svg>
                  <span>Sincronizar con Google Calendar & Tasks</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Event Header & Reload */}
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-indigo-50 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 text-brand-primary rounded-xl">
                    <Calendar size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Eventos de Hoy en Google Calendar</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Sincronizado desde tu cuenta de Google primaria</p>
                  </div>
                </div>
                <button
                  onClick={loadGoogleData}
                  disabled={isLoadingCalendar}
                  className="p-2 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-brand-primary rounded-xl transition-all cursor-pointer"
                  title="Recargar eventos"
                >
                  <RefreshCw size={16} className={isLoadingCalendar ? 'animate-spin' : ''} />
                </button>
              </div>

              {calendarError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2">
                  <span>⚠️ {calendarError}</span>
                  <button
                    onClick={onConnectGoogleWorkspace}
                    className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Reconectar
                  </button>
                </div>
              )}

              {/* Events List */}
              {isLoadingCalendar ? (
                <div className="bg-white p-8 rounded-3xl border border-indigo-50 text-center space-y-3">
                  <RefreshCw size={24} className="animate-spin text-brand-primary mx-auto" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cargando eventos de Google Calendar...</p>
                </div>
              ) : calendarEvents.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl border border-indigo-50 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-800">📅 No tienes eventos programados en Google Calendar para hoy.</p>
                  <p className="text-xs text-slate-500">¡Tu agenda de hoy está libre en Google Calendar!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {calendarEvents.map((evt) => {
                    const startTime = evt.start?.dateTime ? new Date(evt.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (evt.start?.date || 'Todo el día');
                    const endTime = evt.end?.dateTime ? new Date(evt.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <div key={evt.id} className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-md shadow-indigo-100/20 hover:border-indigo-200 transition-all space-y-3 relative overflow-hidden">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-brand-primary bg-indigo-50 px-2.5 py-0.5 rounded-md inline-block">
                              Google Calendar
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{evt.summary || 'Sin título'}</h4>
                          </div>

                          {evt.htmlLink && (
                            <a
                              href={evt.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-brand-primary transition-colors p-1"
                              title="Abrir en Google Calendar"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                        </div>

                        {evt.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{evt.description}</p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="text-brand-primary" />
                            <span>{startTime} {endTime ? `- ${endTime}` : ''}</span>
                          </span>

                          {evt.location && (
                            <span className="truncate max-w-[140px] text-slate-400">
                              📍 {evt.location}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Google Tasks View Component */}
              <div className="pt-4 border-t border-slate-200">
                <GoogleTasksView googleAccessToken={googleAccessToken} onConnectGoogleWorkspace={onConnectGoogleWorkspace} />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* REGULAR INTERNAL TASKS & GOALS CONTENT */
        <>

      {/* SECTION 1: METAS POR CUMPLIR */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-500/15 text-indigo-300 rounded-2xl border border-indigo-400/20">
              <Target size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Metas por Cumplir</h3>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {myPendingGoals.length} meta{myPendingGoals.length !== 1 ? 's' : ''} pendiente{myPendingGoals.length !== 1 ? 's' : ''} · {completedGoalsCount} completada{completedGoalsCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {onGoToMetas && (
            <button
              type="button"
              onClick={onGoToMetas}
              className="text-xs font-black text-indigo-300 hover:text-indigo-200 flex items-center gap-1 cursor-pointer bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 transition-all hover:scale-105"
            >
              <span>Ver todas las Metas</span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {myPendingGoals.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 text-center space-y-2 shadow-lg"
          >
            <p className="text-base font-extrabold text-white">🎉 ¡Felicidades! Has completado todas tus metas activas.</p>
            <p className="text-xs text-slate-300 leading-relaxed">Puedes crear una nueva meta o revisar tus metas familiares.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {myPendingGoals.map((meta, index) => {
              const progressPct = meta.tipo === 'familiar'
                ? (meta.progreso_por_miembro?.find(p => p.usuario_id === currentUser?.uid)?.porcentaje ?? meta.porcentaje_semanal ?? 0)
                : (meta.porcentaje_semanal || 0);

              return (
                <motion.div
                  key={meta.meta_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  whileHover={{ y: -3, scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.22, ease: 'easeOut', delay: index * 0.04 }}
                  className="bg-slate-900/80 p-5 rounded-3xl border border-indigo-500/20 shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-500/40 transition-all space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block mb-1.5 tracking-wider">
                        {meta.categoria || 'Hogar'} · {meta.frecuencia || 'Semanal'}
                      </span>
                      <h4 className="font-black text-base text-white leading-snug">{meta.titulo}</h4>
                    </div>
                    <span className="text-xs font-black text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-xl">
                      {progressPct}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${Math.min(100, progressPct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300 font-bold pt-1">
                    <span>{meta.tipo === 'familiar' ? '👥 Meta Familiar' : '👤 Meta Personal'}</span>
                    <span className="text-amber-400 font-black">+{meta.puntos_recompensa || 50} pts</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: TAREAS DIARIAS POR CATEGORÍA (ACORDEONES COLAPSABLES) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-purple-500/15 text-purple-300 rounded-2xl border border-purple-400/20">
              <Calendar size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Checklist de Tareas por Categoría</h3>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {pendingTasksTotal} pendiente{pendingTasksTotal !== 1 ? 's' : ''} · {completedScopedCount} de {totalScopedCount} completadas hoy
              </p>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setFilterScope('mis_tareas')}
                className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                  filterScope === 'mis_tareas'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mis Tareas
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('familia')}
                className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                  filterScope === 'familia'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Familia
              </button>
            </div>
          </div>
        </div>

        {/* Filter categories bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[10px] font-black text-slate-400 uppercase pr-1 flex items-center gap-1">
            <Filter size={10} /> Filtrar:
          </span>
          {['Todas', ...categories].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Accordions per category */}
        {totalScopedCount === 0 ? (
          <EmptyStateIllustration
            topic="tareas"
            title="¡Todo al día! No tienes tareas pendientes."
            description="Agrega nuevas tareas con el botón '+' para mantener los hábitos de tu familia al día."
            actionButton={
              <button
                onClick={onAddTaskClick}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>Agregar Tarea</span>
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {categories
              .filter(cat => selectedCategory === 'Todas' || selectedCategory === cat)
              .map(cat => {
                const catTasks = scopedTasks.filter(t => (t.categoria || 'Otros') === cat);
                if (catTasks.length === 0) return null;

                const catCompleted = catTasks.filter(t => t.estado === 'completada').length;
                const catTotal = catTasks.length;
                const isOpen = !!openCategories[cat];

                return (
                  <div key={cat} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs transition-all">
                    {/* Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 bg-slate-50/70 hover:bg-slate-100/80 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <Tag size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900">{cat}</h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {catCompleted} de {catTotal} completadas ({catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0}%)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${catTotal > 0 ? (catCompleted / catTotal) * 100 : 0}%` }}
                          />
                        </div>

                        <div className="text-slate-400">
                          {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </div>
                      </div>
                    </button>

                    {/* Accordion Content */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="divide-y divide-slate-100 border-t border-slate-100"
                        >
                          <div className="p-3 sm:p-4 space-y-2.5">
                            {catTasks.map((tarea, index) => {
                              const isDone = tarea.estado === 'completada';
                              const assigneeName = getAssigneeName(tarea.usuario_id);

                              return (
                                <motion.div
                                  key={tarea.tarea_id}
                                  initial={{ opacity: 0, y: 14 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -8 }}
                                  transition={{ duration: 0.25, ease: 'easeOut', delay: index * 0.03 }}
                                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                    isDone
                                      ? 'bg-emerald-50/40 border-emerald-100 opacity-75'
                                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => handleTaskToggle(tarea.tarea_id, isDone)}
                                      className={`transition-transform hover:scale-110 cursor-pointer shrink-0 ${
                                        isDone ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-600'
                                      }`}
                                      title={isDone ? "Marcar como pendiente" : "Marcar como completada"}
                                    >
                                      {isDone ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                                    </button>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        {tarea.es_prioridad_alta && (
                                          <span className="bg-rose-50 text-rose-700 text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <AlertCircle size={9} /> Alta
                                          </span>
                                        )}
                                      </div>
                                      <h5 className={`font-extrabold text-xs sm:text-sm truncate ${
                                        isDone ? 'line-through text-slate-400' : 'text-slate-900'
                                      }`}>
                                        {tarea.titulo}
                                      </h5>
                                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                        Asignado: <strong className="text-slate-600">{assigneeName}</strong>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-right hidden sm:block">
                                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                                        <Clock size={11} className="text-slate-400" />
                                        {tarea.hora_programada || 'Hoy'}
                                      </span>
                                      <span className="text-[10px] font-extrabold text-amber-600 block">
                                        +{tarea.puntos || 10} pts
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleTaskToggle(tarea.tarea_id, isDone)}
                                      className={`font-extrabold text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                                        isDone
                                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                      }`}
                                    >
                                      {isDone ? 'Deshacer' : 'Cumplir'}
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      </>
      )}
    </motion.div>
  );
}
