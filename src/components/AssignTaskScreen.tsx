import React, { useState } from 'react';
import { Usuario } from '../types';

export type TaskCategory = 'Hogar' | 'Estudio' | 'Salud' | 'Personal' | 'Otros';

interface AssignTaskScreenProps {
  usuarios: Usuario[];
  onAddTask: (
    titulo: string,
    userId: string,
    scheduledTime: string,
    estimatedTime: number,
    visible: boolean,
    category?: TaskCategory,
    esPrioridadAlta?: boolean
  ) => void;
}

const CATEGORIES: { id: TaskCategory; label: string; icon: string; color: string }[] = [
  { id: 'Hogar', label: 'Hogar (Household)', icon: 'home', color: 'bg-amber-500 text-white' },
  { id: 'Estudio', label: 'Estudio (Study)', icon: 'school', color: 'bg-indigo-500 text-white' },
  { id: 'Salud', label: 'Bienestar / Salud (Wellness)', icon: 'favorite', color: 'bg-emerald-500 text-white' },
  { id: 'Personal', label: 'Personal', icon: 'person', color: 'bg-purple-500 text-white' },
  { id: 'Otros', label: 'Otros', icon: 'more_horiz', color: 'bg-slate-500 text-white' },
];

export default function AssignTaskScreen({ usuarios, onAddTask }: AssignTaskScreenProps) {
  const [recipient, setRecipient] = useState<string>(''); // default empty, must select
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<TaskCategory>('Hogar');
  const [isHighPriority, setIsHighPriority] = useState<boolean>(false);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<number>(30);
  const [repetition, setRepetition] = useState<string>('once');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!recipient) {
      setValidationError("Debes seleccionar un miembro de la familia para asignarle la tarea.");
      return;
    }

    const selectedUserExists = usuarios.some((u) => u.uid === recipient);
    if (!selectedUserExists) {
      setValidationError("El destinatario seleccionado no es válido.");
      return;
    }

    if (!title.trim()) {
      setValidationError("El título de la tarea es obligatorio.");
      return;
    }

    setLoading(true);
    // Simulate API request
    setTimeout(() => {
      onAddTask(
        title.trim(),
        recipient,
        scheduledTime || '12:00',
        estimatedTime,
        true,
        category,
        isHighPriority
      );
      
      setLoading(false);
      setSuccess(true);
      setTitle('');
      setDescription('');
      setRecipient('');
      setIsHighPriority(false);
      
      setTimeout(() => setSuccess(false), 2500);
    }, 1200);
  };

  return (
    <div className="max-w-[700px] mx-auto space-y-6">
      <div className="text-center md:text-left">
        <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
          Asignar Tarea Adicional
        </h2>
        <p className="font-sans text-sm text-gray-500">
          Crea una nueva tarea categorizada y asígnala a un miembro de la familia.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 md:p-6 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 flex flex-col gap-5 relative overflow-hidden">
        {/* Recipient Selector */}
        <div>
          <label className="block font-sans text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Asignar A <span className="text-rose-500">*</span>
          </label>
          {usuarios.length === 0 ? (
            <p className="font-sans text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
              No hay miembros disponibles para asignar tareas.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {usuarios.map((member) => (
                <label key={member.uid} className="cursor-pointer">
                  <input
                    type="radio"
                    name="recipient"
                    value={member.uid}
                    checked={recipient === member.uid}
                    onChange={() => {
                      setRecipient(member.uid);
                      setValidationError(null);
                    }}
                    className="sr-only peer"
                  />
                  <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-sans text-xs font-bold bg-slate-50 text-slate-500 border border-indigo-50 peer-checked:bg-brand-primary peer-checked:text-white peer-checked:border-brand-primary transition-all shadow-sm hover:bg-slate-100">
                    <img className="w-5 h-5 rounded-full object-cover" src={member.avatar_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop"} alt={member.nombre} />
                    {member.nombre}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Task Category Selection */}
        <div>
          <label className="block font-sans text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Categoría de Tarea
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center ${
                    isSelected
                      ? 'border-brand-primary bg-indigo-50/70 text-brand-dark ring-2 ring-brand-primary/20 shadow-sm'
                      : 'border-slate-100 bg-slate-50/50 text-gray-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`material-symbols-outlined text-lg p-1.5 rounded-xl mb-1 ${cat.color}`}>
                    {cat.icon}
                  </span>
                  <span className="font-sans text-[11px] font-bold">{cat.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority Toggle */}
        <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-lg font-bold">stars</span>
            </div>
            <div>
              <h4 className="font-sans text-xs font-bold text-amber-900">Marca como Meta Prioritaria / Alta Prioridad</h4>
              <p className="font-sans text-[11px] text-amber-700">Generará animación de confeti y bonificación de puntos al completarse.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={isHighPriority}
              onChange={(e) => setIsHighPriority(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Task Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Título de la Tarea <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              placeholder="ej., Limpiar el garaje o Estudiar Matemáticas"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setValidationError(null);
              }}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-primary outline-none text-gray-800"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Descripción Breve</label>
            <textarea
              placeholder="Añade algunos detalles..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-primary outline-none text-gray-800 resize-none"
            />
          </div>

          <div>
            <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Hora Programada</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-primary outline-none text-gray-800"
            />
          </div>

          <div>
            <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tiempo Máximo Estimado (min)</label>
            <input
              type="number"
              min={5}
              step={5}
              placeholder="30"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-primary outline-none text-gray-800"
            />
          </div>
        </div>

        {/* Repetition */}
        <div>
          <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Repetición</label>
          <div className="flex bg-slate-50 border border-indigo-50 p-1 rounded-xl w-full md:w-max">
            {[
              { value: 'once', label: 'Una vez' },
              { value: 'daily', label: 'Diario' },
              { value: 'weekly', label: 'Semanal' }
            ].map((rep) => (
              <label key={rep.value} className="flex-1 md:flex-none cursor-pointer">
                <input
                  type="radio"
                  name="repetition"
                  value={rep.value}
                  checked={repetition === rep.value}
                  onChange={() => setRepetition(rep.value)}
                  className="sr-only"
                />
                <div className={`text-center px-5 py-2.5 rounded-lg font-sans text-xs font-bold uppercase tracking-wider transition-all ${
                  repetition === rep.value ? 'bg-brand-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-700'
                }`}>
                  {rep.label}
                </div>
              </label>
            ))}
          </div>
        </div>

        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 font-sans text-xs font-semibold rounded-xl text-center">
            {validationError}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`w-full md:w-auto px-10 py-3 rounded-full font-sans text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 ${
              success
                ? 'bg-emerald-600 text-white'
                : 'bg-brand-primary hover:bg-brand-dark text-white'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Asignando...</span>
              </>
            ) : success ? (
              <span>¡Asignado con éxito!</span>
            ) : (
              <span>Asignar</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
