import React, { useState } from 'react';
import { Usuario, TareaDiaria } from '../types';

interface UserDetailScreenProps {
  usuarios: Usuario[];
  tareas: TareaDiaria[];
  onAddTaskClick: () => void;
  onBack: () => void;
}

export default function UserDetailScreen({ usuarios, tareas, onAddTaskClick, onBack }: UserDetailScreenProps) {
  // Let's focus on Lucas Garcia for representation of the screenshot 9
  const targetUser = usuarios.find((u) => u.uid === 'user_leo') || usuarios[1];

  const userTasks = tareas.filter((t) => t.usuario_id === targetUser.uid);
  const pendingCount = userTasks.filter((t) => t.estado === 'pendiente' || t.estado === 'en_progreso').length;

  const [activeTab, setActiveTab] = useState<'details' | 'actions'>('details');

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-500 font-sans text-xs font-bold hover:text-brand-primary transition-all"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver a Miembros
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in">
        {/* Left Side: Profile Summary (Col 1-4) */}
        <div className="md:col-span-4 bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 flex flex-col items-center text-center">
          <div className="relative mb-3">
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-amber-400">
              <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-gray-50">
                <img className="w-full h-full object-cover" src={targetUser.avatar_url} alt={targetUser.nombre} />
              </div>
            </div>
            {/* Fire Badge */}
            <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white font-sans text-[10px] font-extrabold px-3 py-1 rounded-full shadow-md border-2 border-white flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
              <span>14</span>
            </div>
          </div>

          <h2 className="font-sans text-lg font-extrabold text-gray-900">{targetUser.nombre}</h2>
          <p className="font-sans text-xs text-gray-400 mb-4">lucas.g@family.com</p>

          <div className="w-full bg-slate-50 rounded-xl p-3 border border-indigo-50 mb-4">
            <p className="font-sans text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">FAMILIA</p>
            <p className="font-sans text-xs font-bold text-gray-800">Los Garcia</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-xl p-3 border border-indigo-50 shadow-sm flex flex-col items-center">
              <span className="material-symbols-outlined text-brand-primary text-base mb-1 font-bold">star</span>
              <span className="font-sans text-lg font-extrabold text-brand-dark">{targetUser.puntos}</span>
              <span className="font-sans text-[9px] font-bold text-gray-400">Puntos</span>
            </div>
            <div className="bg-white rounded-xl p-3 border border-indigo-50 shadow-sm flex flex-col items-center">
              <span className="material-symbols-outlined text-brand-primary text-base mb-1 font-bold">check_circle</span>
              <span className="font-sans text-lg font-extrabold text-brand-dark">85%</span>
              <span className="font-sans text-[9px] font-bold text-gray-400">Tasa de Éxito</span>
            </div>
          </div>

          <button
            onClick={onAddTaskClick}
            className="w-full bg-brand-primary hover:bg-brand-dark text-white font-sans text-xs font-bold py-3 px-4 rounded-full shadow-md flex items-center justify-center gap-1 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-base font-bold">add_task</span>
            Asignar tarea adicional
          </button>
        </div>

        {/* Right Side: Weekly Chart & Tasks (Col 5-12) */}
        <div className="md:col-span-8 flex flex-col gap-6">
          {/* Progress Chart */}
          <div className="bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20">
            <h3 className="font-sans text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-brand-primary text-sm font-bold">trending_up</span>
              Progreso Semanal (Últimas 4 semanas)
            </h3>
            {/* CSS Bar Chart */}
            <div className="h-32 w-full flex items-end gap-3 px-2 pb-2">
              {[
                { label: 'Sem 1', count: 12, height: 'h-[60%]' },
                { label: 'Sem 2', count: 15, height: 'h-[80%]' },
                { label: 'Sem 3', count: 10, height: 'h-[50%]' },
                { label: 'Sem 4', count: 18, height: 'h-[95%]' }
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-1.5 group">
                  <span className="font-sans text-[10px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {bar.count}
                  </span>
                  <div className="w-full bg-slate-50 border border-indigo-50 rounded-t-xl relative overflow-hidden h-24">
                    <div className={`absolute bottom-0 w-full bg-brand-primary/80 rounded-t-xl shadow-inner ${bar.height}`}></div>
                  </div>
                  <span className="font-sans text-[9px] font-bold text-gray-400 uppercase tracking-wider">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Tasks list */}
          <div className="bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 flex-grow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-sans text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-purple-600 text-sm font-bold">list_alt</span>
                Estructura de Tareas Activas
              </h3>
              <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-sans text-[10px] font-bold">
                {pendingCount} Pendientes
              </span>
            </div>

            <div className="space-y-3">
              {userTasks.map((task) => (
                <div key={task.tarea_id} className="bg-slate-50/50 rounded-2xl p-4 border border-indigo-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-gray-500">
                      <span className="material-symbols-outlined text-sm font-bold">
                        {task.titulo.toLowerCase().includes('leer') || task.titulo.toLowerCase().includes('lectura') ? 'book' : 'cleaning_services'}
                      </span>
                    </div>
                    <div>
                      <p className="font-sans text-sm font-bold text-gray-800">{task.titulo}</p>
                      <p className="font-sans text-[10px] text-gray-400">Hora: {task.hora_programada} • {task.tiempo_estimado_min} mins</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full font-sans text-[9px] font-bold uppercase tracking-wider ${
                    task.estado === 'completada'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : task.estado === 'en_progreso'
                      ? 'bg-amber-50 text-amber-700 border border-amber-100'
                      : task.estado === 'vencido'
                      ? 'bg-rose-50 text-rose-700 border border-rose-100'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {task.estado === 'completada' ? 'Completada' : task.estado === 'en_progreso' ? 'En Progreso' : task.estado === 'vencido' ? 'Atrasado' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Admin Actions Zone */}
        <div className="md:col-span-12 bg-white rounded-3xl p-5 border-l-4 border-rose-500 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 space-y-4">
          <h3 className="font-sans text-sm font-bold text-rose-600 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-rose-600 text-lg font-bold">warning</span>
            Acciones Administrativas
          </h3>
          <p className="font-sans text-xs text-gray-500">Estas acciones afectan de forma permanente el acceso de este usuario en Vinculo.</p>
          <div className="flex gap-3">
            <button className="bg-white border border-slate-250 shadow-sm text-gray-700 font-sans text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 hover:bg-slate-50 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-sm font-bold">block</span>
              Suspender cuenta
            </button>
            <button className="bg-rose-600 hover:bg-rose-700 text-white font-sans text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all">
              <span className="material-symbols-outlined text-sm font-bold">delete_forever</span>
              Eliminar cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
