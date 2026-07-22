import React, { useState, useEffect } from 'react';
import { TareaDiaria, Usuario, Meta } from '../types';

interface HoyScreenProps {
  usuarios: Usuario[];
  tareas: TareaDiaria[];
  metas: Meta[];
  currentUser: any;
  onToggleTask: (taskId: string) => void;
  onAddTaskClick: () => void;
}

type TaskCategoryFilter = 'Todas' | 'Hogar' | 'Estudio' | 'Salud' | 'Personal' | 'Otros';

export default function HoyScreen({ usuarios, tareas, metas, currentUser, onToggleTask, onAddTaskClick }: HoyScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<TaskCategoryFilter>('Todas');
  const [showDigestModal, setShowDigestModal] = useState<boolean>(false);

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

  // Calculate stats
  const familyTasks = tareas.filter(t => t.visible_familia);
  const totalFamilyTasks = familyTasks.length;
  const completedFamilyTasks = familyTasks.filter(t => t.estado === 'completada').length;
  const weeklyPercent = totalFamilyTasks > 0 ? Math.round((completedFamilyTasks / totalFamilyTasks) * 100) : 75;

  // Filter tasks for logged in user's personal view
  const userTasks = tareas.filter(t => t.usuario_id === currentUser?.uid);

  // Filter user tasks by category
  const filteredUserTasks = selectedCategory === 'Todas'
    ? userTasks
    : userTasks.filter(t => (t.categoria || 'Otros') === selectedCategory);

  // Daily Digest Upcoming Tasks (Next 4 hours or pending tasks)
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  const upcoming4hTasks = userTasks.filter((t) => {
    if (t.estado === 'completada') return false;
    if (!t.hora_programada) return true;
    const [hStr, mStr] = t.hora_programada.split(':');
    const taskH = parseInt(hStr || '12', 10);
    const taskM = parseInt(mStr || '0', 10);
    const taskTotalMin = taskH * 60 + taskM;
    const currentTotalMin = currentHours * 60 + currentMinutes;
    const diffHours = (taskTotalMin - currentTotalMin) / 60;
    
    // Include if due in the past/overdue or due within next 4 hours
    return diffHours >= -2 && diffHours <= 4;
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-sans text-xs font-semibold text-gray-500 uppercase tracking-widest">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <button
              onClick={() => setShowDigestModal(true)}
              className="bg-indigo-50 text-brand-primary border border-indigo-100 hover:bg-indigo-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all"
            >
              <span className="material-symbols-outlined text-xs">notifications_active</span>
              Resumen Diario
            </button>
          </div>
          <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            ¡Buenos días, {currentUser?.nombre || 'Familia'}!
          </h2>
        </div>

        {/* Circular Progress Weekly Goal */}
        <div className="bg-white rounded-[24px] p-5 shadow-xl shadow-indigo-100/30 border border-indigo-50/60 flex items-center gap-5 self-start md:self-auto w-full md:w-auto">
          <div className="relative w-16 h-16 flex-shrink-0">
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
              <span className="font-sans text-base font-extrabold text-[#6366F1]">{weeklyPercent}%</span>
            </div>
          </div>
          <div>
            <h3 className="font-sans text-sm font-bold text-gray-900">Meta Semanal</h3>
            <p className="font-sans text-xs text-gray-500">{completedFamilyTasks}/{totalFamilyTasks} Tareas Cumplidas</p>
          </div>
        </div>
      </section>

      {/* Quote of the Day Banner */}
      <section className="bg-indigo-50/30 border border-indigo-100/50 rounded-2xl p-5 relative overflow-hidden shadow-sm">
        <span className="font-serif absolute -top-3 -left-1 text-8xl text-brand-dark/5 select-none font-bold">“</span>
        <div className="relative z-10 text-center max-w-xl mx-auto space-y-2">
          <p className="font-sans text-base text-brand-dark font-medium italic">
            "El amor de la familia es el mayor regalo de la vida y el mejor legado que podemos construir juntos."
          </p>
          <p className="font-sans text-[10px] text-brand-primary uppercase tracking-widest font-extrabold">PENSAMIENTO DEL DÍA</p>
        </div>
      </section>

      {/* Categorical Filtering Tabs */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-sans text-lg font-extrabold text-gray-900">Rutina de Hoy</h3>
          <span className="text-xs text-brand-primary font-semibold">Toca una tarea para cambiar su estado</span>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {(['Todas', 'Hogar', 'Estudio', 'Salud', 'Personal', 'Otros'] as TaskCategoryFilter[]).map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full font-sans text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-brand-primary text-white shadow-md shadow-indigo-100 scale-105'
                    : 'bg-white border border-slate-100 text-gray-600 hover:bg-slate-50'
                }`}
              >
                {cat === 'Todas' && <span className="material-symbols-outlined text-sm">grid_view</span>}
                {cat === 'Hogar' && <span className="material-symbols-outlined text-sm">home</span>}
                {cat === 'Estudio' && <span className="material-symbols-outlined text-sm">school</span>}
                {cat === 'Salud' && <span className="material-symbols-outlined text-sm">favorite</span>}
                {cat === 'Personal' && <span className="material-symbols-outlined text-sm">person</span>}
                {cat === 'Otros' && <span className="material-symbols-outlined text-sm">more_horiz</span>}
                {cat}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredUserTasks.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-100 p-6 space-y-2">
              <span className="material-symbols-outlined text-3xl text-gray-300">task</span>
              <p className="font-sans text-sm font-bold text-gray-600">No hay tareas en esta categoría para hoy.</p>
              <p className="font-sans text-xs text-gray-400">Prueba cambiando el filtro o agrega una tarea adicional.</p>
            </div>
          ) : (
            filteredUserTasks.map((task) => {
              const isCompleted = task.estado === 'completada';
              const isInProgress = task.estado === 'en_progreso';
              const isOverdue = task.estado === 'vencido';

              return (
                <div
                  key={task.tarea_id}
                  onClick={() => onToggleTask(task.tarea_id)}
                  className={`group cursor-pointer rounded-2xl p-4 bg-white border transition-all duration-300 flex items-start gap-4 ${
                    isCompleted
                      ? 'border-slate-100 opacity-60 bg-slate-50/50'
                      : isInProgress
                      ? 'border-brand-primary/30 ring-2 ring-brand-primary/10'
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
                      <div className="flex items-center gap-1 flex-shrink-0">
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

                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                      <span className="bg-slate-100 text-gray-500 px-2.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {task.hora_programada}
                      </span>
                      <span className="bg-slate-100 text-gray-500 px-2.5 py-0.5 rounded-full text-[10px] font-medium">
                        {task.tiempo_estimado_min} min
                      </span>
                      {task.categoria && (
                        <span className="bg-indigo-50 text-brand-primary px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          {task.categoria}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Daily Digest Modal */}
      {showDigestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-indigo-50 space-y-5 relative overflow-hidden">
            {/* Header decor */}
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
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-gray-500 flex items-center justify-center transition-all"
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
                className="w-full py-2.5 rounded-full bg-brand-primary hover:bg-brand-dark text-white font-sans text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95"
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
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-brand-primary hover:bg-brand-dark text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all z-50"
      >
        <span className="material-symbols-outlined text-2xl font-bold">add</span>
      </button>
    </div>
  );
}
