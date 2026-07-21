import React, { useState } from 'react';
import { Usuario } from '../types';

interface AssignTaskScreenProps {
  usuarios: Usuario[];
  onAddTask: (titulo: string, userId: string, scheduledTime: string, estimatedTime: number, visible: boolean) => void;
}

export default function AssignTaskScreen({ usuarios, onAddTask }: AssignTaskScreenProps) {
  const [recipient, setRecipient] = useState<string>('family'); // default entire family
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<number>(30);
  const [repetition, setRepetition] = useState<string>('once');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    // Simulate API request
    setTimeout(() => {
      // Find the appropriate user ID
      let finalUserId = 'user_maria'; // fallback owner
      if (recipient === 'user_leo') finalUserId = 'user_leo';
      else if (recipient === 'user_mia') finalUserId = 'user_mia';
      else if (recipient === 'user_dad') finalUserId = 'user_dad';

      onAddTask(title.trim(), finalUserId, scheduledTime || '12:00', estimatedTime, true);
      
      setLoading(false);
      setSuccess(true);
      setTitle('');
      setDescription('');
      
      setTimeout(() => setSuccess(false), 2500);
    }, 1200);
  };

  const familyMembers = usuarios.filter((u) => u.familia_id === 'fam_garcia');

  return (
    <div className="max-w-[700px] mx-auto space-y-6">
      <div className="text-center md:text-left">
        <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Asignar Tarea Adicional</h2>
        <p className="font-sans text-sm text-gray-500">Crea una nueva tarea y asígnala a un miembro de la familia.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 md:p-6 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 flex flex-col gap-5 relative overflow-hidden">
        {/* Recipient Selector */}
        <div>
          <label className="block font-sans text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Asignar A</label>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer">
              <input
                type="radio"
                name="recipient"
                value="family"
                checked={recipient === 'family'}
                onChange={() => setRecipient('family')}
                className="sr-only peer"
              />
              <div className="px-4 py-2.5 rounded-full font-sans text-xs font-bold bg-slate-50 text-slate-500 border border-indigo-50 peer-checked:bg-brand-primary peer-checked:text-white peer-checked:border-brand-primary transition-all shadow-sm">
                Toda la Familia
              </div>
            </label>

            {familyMembers.map((member) => (
              <label key={member.uid} className="cursor-pointer">
                <input
                  type="radio"
                  name="recipient"
                  value={member.uid}
                  checked={recipient === member.uid}
                  onChange={() => setRecipient(member.uid)}
                  className="sr-only peer"
                />
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-full font-sans text-xs font-bold bg-slate-50 text-slate-500 border border-indigo-50 peer-checked:bg-brand-primary peer-checked:text-white peer-checked:border-brand-primary transition-all shadow-sm">
                  <img className="w-5 h-5 rounded-full object-cover" src={member.avatar_url} alt={member.nombre} />
                  {member.nombre}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Task Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Título de la Tarea</label>
            <input
              type="text"
              required
              placeholder="ej., Limpiar el garaje"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
