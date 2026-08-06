import React, { useState } from 'react';
import { Usuario, ConfigTareaCritica } from '../types';
import { createTaskSchema, getZodErrors } from '../lib/validation';

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
    esPrioridadAlta?: boolean,
    esCritica?: boolean,
    configCritica?: ConfigTareaCritica
  ) => void;
}

const DEFAULT_CATEGORIES: { id: string; label: string; icon: string; color: string }[] = [
  { id: 'Hogar', label: 'Hogar', icon: 'home', color: 'bg-amber-500 text-white' },
  { id: 'Estudio', label: 'Estudio', icon: 'school', color: 'bg-indigo-500 text-white' },
  { id: 'Salud', label: 'Bienestar / Salud', icon: 'favorite', color: 'bg-emerald-500 text-white' },
  { id: 'Personal', label: 'Personal', icon: 'person', color: 'bg-purple-500 text-white' },
  { id: 'Otros', label: 'Otros', icon: 'more_horiz', color: 'bg-slate-500 text-white' },
];

export default function AssignTaskScreen({ usuarios, onAddTask }: AssignTaskScreenProps) {
  const [categoriesList, setCategoriesList] = useState<Array<{ id: string; label: string; icon: string; color: string }>>(() => {
    try {
      const savedMetas = localStorage.getItem('custom_meta_categories');
      if (savedMetas) {
        const parsed: string[] = JSON.parse(savedMetas);
        const merged = [...DEFAULT_CATEGORIES];
        parsed.forEach(cName => {
          if (!merged.some(item => item.id.toLowerCase() === cName.toLowerCase())) {
            merged.push({
              id: cName,
              label: cName,
              icon: 'label',
              color: 'bg-purple-600 text-white'
            });
          }
        });
        return merged;
      }
    } catch (e) {}
    return DEFAULT_CATEGORIES;
  });
  const [showAddCat, setShowAddCat] = useState<boolean>(false);
  const [newCatInput, setNewCatInput] = useState<string>('');

  const handleAddCustomTaskCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (!categoriesList.some(c => c.id.toLowerCase() === trimmed.toLowerCase())) {
      const newItem = { id: trimmed, label: trimmed, icon: 'label', color: 'bg-indigo-600 text-white' };
      const updated = [...categoriesList, newItem];
      setCategoriesList(updated);
      try {
        const catNames = updated.map(c => c.id);
        localStorage.setItem('custom_meta_categories', JSON.stringify(catNames));
      } catch (e) {}
    }
    setCategory(trimmed as any);
    setNewCatInput('');
    setShowAddCat(false);
  };

  const handleDeleteTaskCategory = (catId: string) => {
    if (categoriesList.length <= 1) return;
    const updated = categoriesList.filter(c => c.id !== catId);
    setCategoriesList(updated);
    try {
      localStorage.setItem('custom_meta_categories', JSON.stringify(updated.map(c => c.id)));
    } catch (e) {}
    if (category === catId) setCategory(updated[0].id);
  };

  const [recipient, setRecipient] = useState<string>(''); // default empty, must select
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Hogar');
  const [isHighPriority, setIsHighPriority] = useState<boolean>(false);
  const [isCritical, setIsCritical] = useState<boolean>(false);
  const [criticalConfig, setCriticalConfig] = useState<ConfigTareaCritica>({
    dnd_activo: true,
    silenciar_llamadas: true,
    bloquear_redes: true,
    pantalla_encendida: true,
    auto_cronometro: true
  });
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<number>(30);
  const [repetition, setRepetition] = useState<string>('once');
  const [loading, setLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Gemini AI task generator state
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [suggestedTasks, setSuggestedTasks] = useState<Array<{
    title: string;
    category: TaskCategory;
    estimatedTime: number;
    isHighPriority: boolean;
    points: number;
    reasoning: string;
  }>>([]);

  const handleGenerateAiTasks = async () => {
    setAiLoading(true);
    try {
      const selectedMember = usuarios.find((u) => u.uid === recipient);
      const res = await fetch('/api/gemini/suggest-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRole: selectedMember?.nombre || "Familiar",
          theme: category || "Organización y hogar",
          count: 3
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestedTasks(data);
        }
      }
    } catch (e) {
      console.error("Error generating AI tasks:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestedTask = (task: typeof suggestedTasks[0]) => {
    setTitle(task.title);
    if (task.category && categoriesList.some(c => c.id === task.category)) {
      setCategory(task.category);
    }
    setEstimatedTime(task.estimatedTime || 20);
    setIsHighPriority(task.isHighPriority || false);
    setDescription(`Sugerencia de Gemini IA: ${task.reasoning}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || loading) return;
    setValidationError(null);
    setFieldErrors({});

    const parseResult = createTaskSchema.safeParse({
      titulo: title,
      usuario_id: recipient,
      hora_programada: scheduledTime || '12:00',
      tiempo_estimado_min: Number(estimatedTime),
      categoria: (category as any) || 'Hogar'
    });

    if (!parseResult.success) {
      const errs = getZodErrors(parseResult);
      setFieldErrors(errs);
      const firstErrorMsg = Object.values(errs)[0] || "Campos requeridos faltantes o con formato incorrecto.";
      setValidationError(firstErrorMsg);
      return;
    }

    const selectedUserExists = usuarios.some((u) => u.uid === recipient);
    if (!selectedUserExists) {
      setValidationError("El destinatario seleccionado no es válido.");
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    try {
      await onAddTask(
        title.trim(),
        recipient,
        scheduledTime || '12:00',
        estimatedTime,
        true,
        category as TaskCategory,
        isHighPriority,
        isCritical,
        isCritical ? criticalConfig : undefined
      );

      setSuccess(true);
      setTitle('');
      setDescription('');
      setRecipient('');
      setIsHighPriority(false);
      setIsCritical(false);

      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      console.error("Error assigning task:", err);
      setValidationError("Error al asignar la tarea.");
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
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
                      if (fieldErrors.usuario_id) setFieldErrors(prev => ({ ...prev, usuario_id: '' }));
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
          {fieldErrors.usuario_id && (
            <p className="font-sans text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1">
              <span>⚠️ {fieldErrors.usuario_id}</span>
            </p>
          )}
        </div>

        {/* Task Category Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block font-sans text-xs font-bold text-gray-500 uppercase tracking-wider">
              Categoría de Tarea
            </label>
            <button
              type="button"
              onClick={() => setShowAddCat(true)}
              className="text-xs font-black text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm font-bold">add</span>
              + Categoría
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {categoriesList.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center cursor-pointer ${
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

        {/* Gemini AI Task Suggestion Trigger */}
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-amber-300 flex items-center justify-center shadow-sm shrink-0">
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
            </div>
            <div>
              <h4 className="font-sans text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                Generar Ideas de Tareas con Gemini IA
                <span className="bg-indigo-600 text-white text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full">
                  IA
                </span>
              </h4>
              <p className="font-sans text-[11px] text-gray-600">Obtén recomendaciones inteligentes adaptadas al integrante y categoría.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerateAiTasks}
            disabled={aiLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 disabled:opacity-50"
          >
            {aiLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                Generando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">sparkles</span>
                Sugerir Tareas
              </>
            )}
          </button>
        </div>

        {/* Suggested AI Tasks List */}
        {suggestedTasks.length > 0 && (
          <div className="space-y-2 bg-indigo-50/40 p-3.5 rounded-2xl border border-indigo-100">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
              Sugerencias de Gemini (Haz clic para usar):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {suggestedTasks.map((st, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applySuggestedTask(st)}
                  className="p-3 bg-white hover:bg-indigo-50 border border-indigo-100 rounded-xl text-left transition-all hover:scale-[1.02] shadow-xs flex flex-col justify-between gap-2"
                >
                  <div>
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-md inline-block mb-1">
                      {st.category} • {st.estimatedTime}m
                    </span>
                    <h5 className="font-sans text-xs font-bold text-gray-900 leading-snug">{st.title}</h5>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">add_circle</span> Cargar Tarea
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

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
                if (fieldErrors.titulo) setFieldErrors(prev => ({ ...prev, titulo: '' }));
              }}
              className={`w-full bg-slate-50 border rounded-xl p-3 text-sm focus:ring-2 outline-none text-gray-800 transition-all ${
                fieldErrors.titulo ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200 focus:ring-rose-400' : 'border-slate-100 focus:ring-brand-primary'
              }`}
            />
            {fieldErrors.titulo && (
              <p className="font-sans text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                <span>⚠️ {fieldErrors.titulo}</span>
              </p>
            )}
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

        {/* Priority and Critical Task Toggles */}
        <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isHighPriority}
                onChange={(e) => setIsHighPriority(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-white border-slate-300 focus:ring-amber-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                ⭐ Alta Prioridad
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
              <input
                type="checkbox"
                checked={isCritical}
                onChange={(e) => setIsCritical(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 bg-white border-rose-300 focus:ring-rose-500 cursor-pointer"
              />
              <span className="text-xs font-black text-rose-900 flex items-center gap-1">
                🚨 Tarea Crítica / Modo Misión
              </span>
            </label>
          </div>

          {/* Automatic Actions for Critical Tasks */}
          {isCritical && (
            <div className="mt-3 pt-3 border-t border-rose-200/60 space-y-2.5 animate-fadeIn">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block">
                Acciones Automáticas al Iniciar Misión:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={criticalConfig.dnd_activo}
                    onChange={(e) => setCriticalConfig(prev => ({ ...prev, dnd_activo: e.target.checked }))}
                    className="w-3.5 h-3.5 text-rose-600 rounded"
                  />
                  <span>🌙 Activar Modo No Molestar</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={criticalConfig.silenciar_llamadas}
                    onChange={(e) => setCriticalConfig(prev => ({ ...prev, silenciar_llamadas: e.target.checked }))}
                    className="w-3.5 h-3.5 text-rose-600 rounded"
                  />
                  <span>🔕 Silenciar llamadas / notif.</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={criticalConfig.bloquear_redes}
                    onChange={(e) => setCriticalConfig(prev => ({ ...prev, bloquear_redes: e.target.checked }))}
                    className="w-3.5 h-3.5 text-rose-600 rounded"
                  />
                  <span>🚫 Bloquear Redes Sociales (IG, TikTok, YT)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={criticalConfig.pantalla_encendida}
                    onChange={(e) => setCriticalConfig(prev => ({ ...prev, pantalla_encendida: e.target.checked }))}
                    className="w-3.5 h-3.5 text-rose-600 rounded"
                  />
                  <span>💡 Mantener pantalla encendida</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={criticalConfig.auto_cronometro}
                    onChange={(e) => setCriticalConfig(prev => ({ ...prev, auto_cronometro: e.target.checked }))}
                    className="w-3.5 h-3.5 text-rose-600 rounded"
                  />
                  <span>⏱️ Iniciar cronómetro automáticamente</span>
                </label>
              </div>
            </div>
          )}
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
            disabled={loading || isSubmitting}
            className={`w-full md:w-auto px-10 py-3 rounded-full font-sans text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              success
                ? 'bg-emerald-600 text-white'
                : 'bg-brand-primary hover:bg-brand-dark text-white'
            }`}
          >
            {loading || isSubmitting ? (
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

      {/* ADD CUSTOM TASK CATEGORY MODAL */}
      {showAddCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowAddCat(false)}></div>
          <div className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-indigo-100 animate-fadeIn">
            <h3 className="font-sans text-lg font-extrabold text-slate-900 mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600">category</span>
              Nueva Categoría de Tarea
            </h3>
            <p className="font-sans text-xs text-slate-500 mb-4">
              Crea una categoría personalizada para agrupar y filtrar las tareas.
            </p>

            <form onSubmit={handleAddCustomTaskCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de la Categoría</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  placeholder="Ej. Mascotas, Compras, Proyectos..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCat(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md cursor-pointer"
                >
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
