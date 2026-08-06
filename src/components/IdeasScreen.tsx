import React, { useState, useEffect } from 'react';
import { OrganizedIdea, OrganizedIdeaStep, Usuario } from '../types';

interface IdeasScreenProps {
  currentUser?: Usuario | null;
  onAddTask?: (taskData: any) => void;
  onAddGoal?: (goalData: any) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PRESET_IDEAS = [
  { emoji: '🌱', label: 'Huerto en Casa', prompt: 'Quiero crear un pequeño huerto urbano de verduras y hierbas aromáticas en nuestro balcón o patio.' },
  { emoji: '✈️', label: 'Viaje Familiar', prompt: 'Quiero planificar unas vacaciones familiares de fin de semana con bajo presupuesto en la naturaleza.' },
  { emoji: '📖', label: 'Hábito de Lectura', prompt: 'Quiero que toda la familia lea 20 minutos diarios antes de dormir y comente los libros juntos.' },
  { emoji: '🧁', label: 'Venta de Cupcakes', prompt: 'Quiero hacer un pequeño emprendimiento de galletas y cupcakes caseros con los niños para vender los fines de semana.' },
  { emoji: '🧘', label: 'Rutina de Ejercicio', prompt: 'Quiero establecer una rutina matutina de 15 minutos de estiramientos y yoga familiar.' },
  { emoji: '🎨', label: 'Proyecto Artístico', prompt: 'Quiero pintar un mural o cuadro colaborativo entre todos los integrantes de la familia.' },
];

export default function IdeasScreen({ currentUser, onAddTask, onAddGoal, showToast }: IdeasScreenProps) {
  const [ideaInput, setIdeaInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeIdea, setActiveIdea] = useState<OrganizedIdea | null>(null);
  const [savedIdeas, setSavedIdeas] = useState<OrganizedIdea[]>(() => {
    try {
      const stored = localStorage.getItem('nucleo_saved_ideas');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Speech Recognition state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechSupported] = useState<boolean>(() => {
    return typeof window !== 'undefined' && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);
  });

  const handleToggleVoiceRecording = () => {
    if (!speechSupported) return;

    if (isRecording) {
      setIsRecording(false);
    } else {
      try {
        const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechClass();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (e: any) => {
          const transcript = e.results[0][0].transcript;
          setIdeaInput(prev => prev ? `${prev} ${transcript}` : transcript);
          setIsRecording(false);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognition.start();
      } catch (e) {
        console.error("Speech recognition error", e);
        setIsRecording(false);
      }
    }
  };

  const handleOrganizeIdea = async (textToOrganize?: string) => {
    const text = textToOrganize || ideaInput;
    if (!text.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/gemini/organize-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaText: text.trim() })
      });

      if (res.ok) {
        const data: OrganizedIdea = await res.json();
        setActiveIdea({
          ...data,
          idea_id: `idea_${Date.now()}`,
          createdAt: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
        });
        if (showToast) showToast('¡Idea estructurada con éxito por Gemini IA! 💡', 'success');
      } else {
        throw new Error("Error en el servidor");
      }
    } catch (e) {
      console.error("Error organizing idea:", e);
      if (showToast) showToast('No se pudo estructurar la idea en este momento.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIdea = (ideaToSave: OrganizedIdea) => {
    if (!ideaToSave) return;
    const exists = savedIdeas.some(i => i.idea_id === ideaToSave.idea_id || i.title === ideaToSave.title);
    if (exists) {
      if (showToast) showToast('Esta idea ya se encuentra guardada.', 'info');
      return;
    }

    const updated = [ideaToSave, ...savedIdeas];
    setSavedIdeas(updated);
    try {
      localStorage.setItem('nucleo_saved_ideas', JSON.stringify(updated));
    } catch (e) {
      console.error("Storage error:", e);
    }
    if (showToast) showToast('Idea guardada en tu Laboratorio de Ideas 💾', 'success');
  };

  const handleDeleteSavedIdea = (idea_id?: string) => {
    if (!idea_id) return;
    const updated = savedIdeas.filter(i => i.idea_id !== idea_id);
    setSavedIdeas(updated);
    try {
      localStorage.setItem('nucleo_saved_ideas', JSON.stringify(updated));
    } catch (e) {
      console.error("Storage error:", e);
    }
    if (showToast) showToast('Idea eliminada', 'info');
  };

  const handleConvertStepToTask = (step: OrganizedIdeaStep) => {
    if (!currentUser || !onAddTask) return;

    onAddTask({
      titulo: step.title,
      usuario_id: currentUser.uid,
      hora_programada: '10:00',
      tiempo_estimado_min: 30,
      visible_familia: true,
      categoria: step.category || 'Personal',
      es_prioridad_alta: false
    });

    if (showToast) showToast(`Paso "${step.title}" añadido como Tarea Diaria 📋`, 'success');
  };

  const handleConvertIdeaToGoal = (idea: OrganizedIdea) => {
    if (!currentUser || !onAddGoal) return;

    onAddGoal({
      titulo: idea.suggestedGoal?.title || idea.title,
      categoria: (['Salud', 'Estudio', 'Finanzas', 'Hogar', 'Personal'].includes(idea.category) ? idea.category : 'Personal') as any,
      usuario_id: currentUser.uid,
      familia_id: currentUser.familia_id || "",
      tipo: 'individual',
      frecuencia_objetivo: 3,
      unidad_frecuencia: 'semana',
      duracion_valor: 1,
      duracion_unidad: 'meses',
      fecha_inicio: new Date().toISOString().split('T')[0],
      generar_tareas_automaticas: true,
      consecuencias_activas: false,
      requiere_aprobacion_adulto: false,
      visible_familia: true
    });

    if (showToast) showToast(`Idea "${idea.title}" convertida en Meta activa 🎯`, 'success');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-900 rounded-[32px] p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300">
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            <span>Inteligencia Artificial Gemini</span>
          </div>
          <h1 className="font-sans text-2xl md:text-3xl font-black tracking-tight">
            Laboratorio de Ideas 💡
          </h1>
          <p className="font-sans text-xs md:text-sm text-purple-100/90 leading-relaxed">
            Escribe cualquier ocurrencia, proyecto o sueño que tengas en mente. La IA organizará tu idea, estructurará sus propósitos y te dará los pasos claros para hacerlo realidad.
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-[28px] p-6 border border-indigo-100/80 shadow-lg shadow-indigo-100/20 space-y-5">
        <div className="flex items-center justify-between">
          <label className="font-sans text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600">lightbulb</span>
            ¿Qué idea deseas organizar hoy?
          </label>
          {speechSupported && (
            <button
              onClick={handleToggleVoiceRecording}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isRecording ? 'mic' : 'mic_none'}
              </span>
              <span>{isRecording ? 'Grabando idea...' : 'Dictar por voz'}</span>
            </button>
          )}
        </div>

        <div className="relative">
          <textarea
            value={ideaInput}
            onChange={(e) => setIdeaInput(e.target.value)}
            placeholder="Ejemplo: Quiero construir un huerto de verduras en el balcón, o Quiero planificar una escapada de camping en familia los fines de semana..."
            rows={4}
            className="w-full p-4 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-800 placeholder-gray-400 resize-none transition-all"
          />
        </div>

        {/* Preset Inspiration Pills */}
        <div className="space-y-2">
          <p className="font-sans text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
            ¿Buscas inspiración? Prueba con una idea rápida:
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_IDEAS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIdeaInput(preset.prompt);
                  handleOrganizeIdea(preset.prompt);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-900 border border-slate-200 hover:border-indigo-200 text-xs font-bold transition-all cursor-pointer"
              >
                <span>{preset.emoji}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={() => handleOrganizeIdea()}
            disabled={loading || !ideaInput.trim()}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-sans text-xs font-black shadow-md shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Estructurando Idea con IA...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm text-amber-300">auto_awesome</span>
                <span>Organizar y Crear Plan con IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ACTIVE ORGANIZED IDEA RESULT */}
      {activeIdea && (
        <div className="bg-white rounded-[28px] p-6 border-2 border-indigo-200 shadow-xl space-y-6 animate-fade-in">
          {/* Header Card Info */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-indigo-100 text-indigo-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {activeIdea.category}
                </span>
                <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  ⏱️ {activeIdea.estimatedDuration}
                </span>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  ⚡ Dificultad: {activeIdea.difficulty}
                </span>
              </div>
              <h2 className="font-sans text-xl md:text-2xl font-black text-gray-900">
                {activeIdea.title}
              </h2>
              <p className="font-sans text-xs md:text-sm text-gray-600 leading-relaxed">
                {activeIdea.summary}
              </p>
            </div>

            {/* Save & Convert Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleSaveIdea(activeIdea)}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-200"
              >
                <span className="material-symbols-outlined text-sm">bookmark</span>
                <span>Guardar Idea</span>
              </button>
              {onAddGoal && (
                <button
                  onClick={() => handleConvertIdeaToGoal(activeIdea)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">target</span>
                  <span>Convertir en Meta</span>
                </button>
              )}
            </div>
          </div>

          {/* Steps Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">format_list_bulleted</span>
                Pasos para Materializar tu Idea ({activeIdea.steps?.length || 0} pasos)
              </h3>
            </div>

            <div className="space-y-3">
              {activeIdea.steps?.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-4 bg-slate-50/90 hover:bg-indigo-50/40 border border-slate-200 rounded-2xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      {step.stepNumber}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-sans text-xs md:text-sm font-bold text-gray-900">
                          {step.title}
                        </h4>
                        <span className="text-[10px] font-bold text-gray-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                          ⏱️ {step.estimatedTime}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-gray-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Add as Task */}
                  {onAddTask && (
                    <button
                      onClick={() => handleConvertStepToTask(step)}
                      className="self-end md:self-center px-3 py-1.5 bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-sm">add_task</span>
                      <span>Hacer Tarea</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Goal & Encouragement Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {activeIdea.suggestedGoal && (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs">
                  <span className="material-symbols-outlined text-sm text-amber-600">military_tech</span>
                  <span>Sugerencia de Meta Habitual</span>
                </div>
                <p className="text-xs font-bold text-gray-900">{activeIdea.suggestedGoal.title}</p>
                <p className="text-[11px] text-gray-600">{activeIdea.suggestedGoal.recommendation}</p>
              </div>
            )}

            <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-center gap-3">
              <span className="text-2xl shrink-0">🚀</span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block">
                  Mensaje Motivacional Gemini
                </span>
                <p className="text-xs font-bold text-indigo-950 italic">
                  "{activeIdea.encouragement}"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAVED IDEAS SECTION */}
      {savedIdeas.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600">collections_bookmark</span>
              Mis Ideas Guardadas ({savedIdeas.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedIdeas.map((idea) => (
              <div
                key={idea.idea_id}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-indigo-50 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {idea.category}
                    </span>
                    <button
                      onClick={() => handleDeleteSavedIdea(idea.idea_id)}
                      className="text-gray-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                      title="Eliminar idea"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                  <h4 className="font-sans text-sm font-extrabold text-gray-900">
                    {idea.title}
                  </h4>
                  <p className="font-sans text-xs text-gray-600 line-clamp-2">
                    {idea.summary}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium">
                    {idea.steps?.length || 0} pasos • {idea.estimatedDuration}
                  </span>
                  <button
                    onClick={() => setActiveIdea(idea)}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Ver detalles</span>
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
