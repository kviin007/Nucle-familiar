import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GoogleTaskItem, fetchGoogleTasks, completeGoogleTask } from '../services/googleWorkspace';
import confetti from 'canvas-confetti';

interface GoogleTasksViewProps {
  googleAccessToken?: string | null;
  onConnectGoogleWorkspace?: () => void;
}

export default function GoogleTasksView({ googleAccessToken, onConnectGoogleWorkspace }: GoogleTasksViewProps) {
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const loadTasks = async () => {
    if (!googleAccessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGoogleTasks(googleAccessToken);
      setTasks(data);
    } catch (err: any) {
      console.warn("Error fetching Google Tasks:", err);
      setError(err.message || "No se pudieron cargar las tareas de Google Tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (googleAccessToken) {
      loadTasks();
    }
  }, [googleAccessToken]);

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    if (currentStatus === 'completed') return; // Google Tasks completion API is 1-way patch in this view

    setCompletingTaskId(taskId);
    try {
      await completeGoogleTask(taskId, googleAccessToken || undefined);
      
      // Optimistically mark as completed in state
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (err: any) {
      console.error("Error marking Google Task as completed:", err);
      alert(err.message || "Error al actualizar la tarea en Google Tasks");
    } finally {
      setCompletingTaskId(null);
    }
  };

  if (!googleAccessToken) {
    return (
      <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/80 rounded-3xl p-6 border border-indigo-100 shadow-md text-left space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <span className="material-symbols-outlined text-xl">check_box</span>
          </div>
          <div>
            <h3 className="font-sans text-sm sm:text-base font-extrabold text-indigo-950">
              Sincronización con Google Tasks
            </h3>
            <p className="font-sans text-xs text-indigo-900/80 mt-0.5">
              Conecta tu cuenta de Google Workspace para ver y gestionar tus tareas de Google directamente desde la app.
            </p>
          </div>
        </div>

        {onConnectGoogleWorkspace && (
          <button
            onClick={onConnectGoogleWorkspace}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-bold rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">login</span>
            <span>Conectar con Google Workspace</span>
          </button>
        )}
      </div>
    );
  }

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return t.status === 'needsAction';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const pendingCount = tasks.filter(t => t.status === 'needsAction').length;

  return (
    <div className="bg-white rounded-3xl p-6 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">task</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans text-base font-extrabold text-gray-900">
                Tareas de Google Tasks
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-sans text-[10px] font-bold">
                {pendingCount} pendientes
              </span>
            </div>
            <p className="font-sans text-xs text-gray-400">
              Sincronizado en tiempo real con tu cuenta de Google
            </p>
          </div>
        </div>

        {/* Filters and Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${
                filter === 'pending' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${
                filter === 'completed' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
              }`}
            >
              Completadas
            </button>
          </div>

          <button
            onClick={loadTasks}
            disabled={loading}
            className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-gray-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
            title="Recargar Google Tasks"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>sync</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadTasks} className="font-bold underline text-rose-900">Reintentar</button>
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="font-sans text-xs text-gray-400">Obteniendo tareas de Google Workspace...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-8 text-center text-gray-400 font-sans text-xs">
          {filter === 'pending'
            ? '¡No tienes tareas pendientes en Google Tasks!'
            : 'No hay tareas completadas para mostrar.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((t, index) => {
            const isCompleted = t.status === 'completed';
            const isProcessing = completingTaskId === t.id;

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut', delay: index * 0.03 }}
                className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  isCompleted
                    ? 'bg-slate-50/70 border-slate-200/60 opacity-60'
                    : 'bg-white border-slate-200/80 hover:border-blue-200 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    disabled={isCompleted || isProcessing}
                    onClick={() => handleToggleComplete(t.id, t.status)}
                    className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'border-2 border-slate-300 hover:border-blue-500'
                    }`}
                  >
                    {isCompleted && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                    {isProcessing && <span className="material-symbols-outlined text-xs animate-spin text-blue-600">sync</span>}
                  </button>

                  <div>
                    <p className={`font-sans text-xs sm:text-sm font-bold text-gray-800 ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                      {t.title}
                    </p>
                    {t.notes && (
                      <p className="font-sans text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                        {t.notes}
                      </p>
                    )}
                    {t.due && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-bold mt-1">
                        <span className="material-symbols-outlined text-[12px]">event</span>
                        {new Date(t.due).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-bold text-gray-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                  Google Tasks
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
