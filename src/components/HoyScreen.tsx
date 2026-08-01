import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import EmptyStateIllustration from './EmptyStateIllustration';
import { TareaDiaria, Usuario, Meta } from '../types';
import { CheckCircle2, Circle, Target, Calendar, Clock, Sparkles, ChevronRight, ChevronDown, AlertCircle, Plus, Filter, Tag, FolderOpen } from 'lucide-react';

interface HoyScreenProps {
  usuarios: Usuario[];
  tareas: TareaDiaria[];
  metas: Meta[];
  diario?: any[];
  currentUser: Usuario | null;
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
  onToggleTask,
  onAddTaskClick,
  onGoToMetas
}: HoyScreenProps) {
  const [filterScope, setFilterScope] = useState<'mis_tareas' | 'familia'>('mis_tareas');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Hogar': false,
    'Estudio': false,
    'Salud': false,
    'Personal': false,
    'Otros': false
  });

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

      {/* SECTION 1: METAS POR CUMPLIR */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-2xl">
              <Target size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Metas por Cumplir</h3>
              <p className="text-xs text-slate-500 font-medium">
                {myPendingGoals.length} meta{myPendingGoals.length !== 1 ? 's' : ''} pendiente{myPendingGoals.length !== 1 ? 's' : ''} · {completedGoalsCount} completada{completedGoalsCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {onGoToMetas && (
            <button
              type="button"
              onClick={onGoToMetas}
              className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
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
            className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-2 shadow-xs"
          >
            <p className="text-sm font-extrabold text-slate-800">🎉 ¡Felicidades! Has completado todas tus metas activas.</p>
            <p className="text-xs text-slate-500">Puedes crear una nueva meta o revisar tus metas familiares.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myPendingGoals.map(meta => {
              const progressPct = meta.tipo === 'familiar'
                ? (meta.progreso_por_miembro?.find(p => p.usuario_id === currentUser?.uid)?.porcentaje ?? meta.porcentaje_semanal ?? 0)
                : (meta.porcentaje_semanal || 0);

              return (
                <motion.div
                  key={meta.meta_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                        {meta.categoria || 'Hogar'} · {meta.frecuencia || 'Semanal'}
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900">{meta.titulo}</h4>
                    </div>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
                      {progressPct}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-500"
                      style={{ width: `${Math.min(100, progressPct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold pt-1">
                    <span>{meta.tipo === 'familiar' ? '👥 Meta Familiar' : '👤 Meta Personal'}</span>
                    <span className="text-amber-600 font-extrabold">+{meta.puntos_recompensa || 50} pts</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: TAREAS DIARIAS POR CATEGORÍA (ACORDEONES COLAPSABLES) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-2xl">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Checklist de Tareas por Categoría</h3>
              <p className="text-xs text-slate-500 font-medium">
                {pendingTasksTotal} pendiente{pendingTasksTotal !== 1 ? 's' : ''} · {completedScopedCount} de {totalScopedCount} completadas hoy
              </p>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setFilterScope('mis_tareas')}
                className={`px-3 py-1 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                  filterScope === 'mis_tareas'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mis Tareas
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('familia')}
                className={`px-3 py-1 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                  filterScope === 'familia'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
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
                            {catTasks.map(tarea => {
                              const isDone = tarea.estado === 'completada';
                              const assigneeName = getAssigneeName(tarea.usuario_id);

                              return (
                                <motion.div
                                  key={tarea.tarea_id}
                                  initial={{ opacity: 0, x: -5 }}
                                  animate={{ opacity: 1, x: 0 }}
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
    </motion.div>
  );
}
