import React from 'react';
import { TareaDiaria, Usuario, Meta } from '../types';

interface HoyScreenProps {
  usuarios: Usuario[];
  tareas: TareaDiaria[];
  metas: Meta[];
  currentUser: any;
  onToggleTask: (taskId: string) => void;
  onAddTaskClick: () => void;
}

export default function HoyScreen({ usuarios, tareas, metas, currentUser, onToggleTask, onAddTaskClick }: HoyScreenProps) {
  // Calculate stats
  const familyTasks = tareas.filter(t => t.visible_familia);
  const totalFamilyTasks = familyTasks.length;
  const completedFamilyTasks = familyTasks.filter(t => t.estado === 'completada').length;
  const weeklyPercent = totalFamilyTasks > 0 ? Math.round((completedFamilyTasks / totalFamilyTasks) * 100) : 75;

  // Filter tasks for logged in user's personal view
  const userTasks = tareas.filter(t => t.usuario_id === currentUser?.uid);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <p className="font-sans text-xs font-semibold text-gray-500 uppercase tracking-widest">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            ¡Buenos días, Familia!
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

      {/* Checklist */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-sans text-lg font-extrabold text-gray-900">Rutina de Hoy</h3>
          <span className="text-xs text-brand-primary font-semibold">Toca una tarea para cambiar su estado</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userTasks.map((task) => {
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
                    <h4
                      className={`font-sans text-sm font-bold text-gray-900 truncate ${
                        isCompleted ? 'line-through text-gray-400' : ''
                      }`}
                    >
                      {task.titulo}
                    </h4>

                    {/* Status Badge */}
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

                  <div className="flex gap-2 mt-2">
                    <span className="bg-slate-100 text-gray-500 px-2.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      {task.hora_programada}
                    </span>
                    <span className="bg-slate-100 text-gray-500 px-2.5 py-0.5 rounded-full text-[10px] font-medium">
                      {task.tiempo_estimado_min} min
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

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
