import React, { useState } from 'react';
import { TareaDiaria, Usuario, Meta } from '../types';
import { CheckCircle2, Circle, Target, Calendar, Clock, Sparkles, ChevronRight, AlertCircle, Plus, Filter, Tag } from 'lucide-react';

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

  // Filter Goals Pending
  const myPendingGoals = metas.filter(m => {
    // Member matching
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

  // Filter Tasks Pending for Today
  const scopedTasks = tareas.filter(t => {
    if (filterScope === 'mis_tareas') {
      return t.usuario_id === currentUser?.uid;
    }
    return t.visible_familia;
  });

  const pendingTasks = scopedTasks.filter(t => {
    const matchCat = selectedCategory === 'Todas' || (t.categoria || 'Otros') === selectedCategory;
    return t.estado !== 'completada' && matchCat;
  });

  const completedTasksCount = scopedTasks.filter(t => t.estado === 'completada').length;

  const categories = ['Todas', 'Hogar', 'Estudio', 'Salud', 'Personal', 'Otros'];

  const getAssigneeName = (uid: string) => {
    const found = usuarios.find(u => u.uid === uid);
    return found ? found.nombre : 'Familiar';
  };

  return (
    <div className="space-y-8 select-none font-sans max-w-5xl mx-auto pb-12">
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
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
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
          <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-2">
            <p className="text-sm font-extrabold text-slate-800">🎉 ¡Felicidades! Has completado todas tus metas activas.</p>
            <p className="text-xs text-slate-500">Puedes crear una nueva meta o revisar tus metas familiares.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myPendingGoals.map(meta => {
              const progressPct = meta.tipo === 'familiar'
                ? (meta.progreso_por_miembro?.find(p => p.usuario_id === currentUser?.uid)?.porcentaje ?? meta.porcentaje_semanal ?? 0)
                : (meta.porcentaje_semanal || 0);

              return (
                <div
                  key={meta.meta_id}
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: TAREAS DIARIAS POR CUMPLIR */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-2xl">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Tareas Diarias por Cumplir</h3>
              <p className="text-xs text-slate-500 font-medium">
                {pendingTasks.length} pendiente{pendingTasks.length !== 1 ? 's' : ''} · {completedTasksCount} completada{completedTasksCount !== 1 ? 's' : ''} hoy
              </p>
            </div>
          </div>

          {/* Controls */}
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

        {/* Categories bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[10px] font-black text-slate-400 uppercase pr-1 flex items-center gap-1">
            <Filter size={10} /> Categoría:
          </span>
          {categories.map(cat => (
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

        {/* Task List */}
        {pendingTasks.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-sm font-extrabold text-slate-800">¡Todo al día! No tienes tareas pendientes por cumplir.</p>
            <p className="text-xs text-slate-500">Agrega una tarea diaria o revisa la lista de tareas completadas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map(tarea => {
              const assigneeName = getAssigneeName(tarea.usuario_id);

              return (
                <div
                  key={tarea.tarea_id}
                  className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleTask(tarea.tarea_id)}
                      className="text-slate-300 hover:text-emerald-600 transition-transform hover:scale-110 cursor-pointer shrink-0"
                      title="Marcar como completada"
                    >
                      <Circle size={24} />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                          {tarea.categoria || 'Hogar'}
                        </span>
                        {tarea.es_prioridad_alta && (
                          <span className="bg-rose-50 text-rose-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                            <AlertCircle size={10} /> Alta
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 truncate">{tarea.titulo}</h4>
                      <p className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                        <span>Asignado: <strong className="text-slate-700">{assigneeName}</strong></span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        {tarea.hora_programada || 'Hoy'}
                      </span>
                      <span className="text-[10px] font-extrabold text-amber-600 block">
                        +{tarea.puntos || 10} pts
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleTask(tarea.tarea_id)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs px-3.5 py-2 rounded-2xl border border-emerald-200 transition-all cursor-pointer"
                    >
                      Cumplir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
