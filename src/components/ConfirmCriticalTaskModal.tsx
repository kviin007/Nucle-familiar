import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TareaDiaria } from '../types';

interface ConfirmCriticalTaskModalProps {
  isOpen: boolean;
  task: TareaDiaria | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmCriticalTaskModal({
  isOpen,
  task,
  onConfirm,
  onCancel,
}: ConfirmCriticalTaskModalProps) {
  if (!isOpen || !task) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-rose-100 shadow-2xl space-y-6 text-left relative overflow-hidden"
        >
          {/* Top Warning Accent Header */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

          <div className="flex items-start gap-4 pt-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-2xl font-bold">warning</span>
            </div>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-sans text-[10px] font-black uppercase tracking-wider inline-block">
                Tarea Crítica / Prioritaria
              </span>
              <h3 className="font-sans text-lg sm:text-xl font-black text-slate-900 leading-snug">
                ¿Confirmar tarea completada?
              </h3>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <p className="font-sans text-xs text-gray-500 font-bold uppercase tracking-wider">Título de la tarea:</p>
            <p className="font-sans text-sm font-extrabold text-slate-900">{task.titulo}</p>
            {task.categoria && (
              <p className="font-sans text-[11px] text-indigo-600 font-bold">Categoría: {task.categoria}</p>
            )}
          </div>

          <p className="font-sans text-xs text-slate-600 leading-relaxed">
            Esta tarea requiere atención prioritaria para la rutina de tu familia. Por favor confirma que se ha realizado correctamente antes de actualizar el estado.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-1/2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans text-xs font-bold rounded-2xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="w-full sm:w-1/2 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-sans text-xs font-bold rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>Sí, completar</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
