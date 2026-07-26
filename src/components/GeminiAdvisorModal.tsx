import React, { useState, useEffect } from 'react';

interface GeminiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyName?: string;
  initialPrompt?: string;
  modalTitle?: string;
}

interface AdvisorResponse {
  response: string;
  tips?: string[];
  suggestedAction?: string;
}

export default function GeminiAdvisorModal({ isOpen, onClose, familyName, initialPrompt, modalTitle }: GeminiAdvisorModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdvisorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialPrompt && initialPrompt.trim()) {
        setPrompt(initialPrompt);
        handleAsk(initialPrompt);
      } else {
        setPrompt('');
        setResult(null);
        setError(null);
      }
    } else {
      setResult(null);
      setError(null);
    }
  }, [isOpen, initialPrompt]);

  if (!isOpen) return null;

  const quickPrompts = [
    { title: "🥗 Menú Semanal", query: "Genera un menú familiar equilibrado y económico para los 5 días de la semana escolar." },
    { title: "🎒 Mañanas Sin Prisas", query: "¿Cómo estructurar la rutina matutina para que los niños salgan a tiempo al colegio sin gritos ni prisas?" },
    { title: "🎉 Plan de Fin de Semana", query: "Dame 3 ideas de actividades familiares divertidas sin pantallas y de bajo presupuesto para este sábado." },
    { title: "🤝 Mediación de Hermanos", query: "Consejos prácticos para solucionar discusiones sobre el uso compartido de juguetes o dispositivos." },
    { title: "🌟 Hábitos de Estudio", query: "Estrategias para motivar a mis hijos a hacer sus tareas escolares sin postergar." }
  ];

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || prompt).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setPrompt(q);

    try {
      const res = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: q,
          context: familyName ? `Familia ${familyName}` : undefined
        })
      });

      if (!res.ok) {
        throw new Error('No se pudo conectar con el asistente.');
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError('Hubo un inconveniente al consultar a la Inteligencia Artificial. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-indigo-100 flex flex-col max-h-[90vh] overflow-hidden relative"
        id="gemini-advisor-modal"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white p-5 md:p-6 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <span className="material-symbols-outlined text-amber-300 text-2xl">auto_awesome</span>
            </div>
            <div>
              <h3 className="font-sans text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                {modalTitle || 'Asistente Familiar Gemini'}
                <span className="bg-amber-400 text-indigo-950 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                  IA
                </span>
              </h3>
              <p className="font-sans text-xs text-indigo-100">
                Consejos de convivencia, rutinas, menús e ideas para tu hogar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            id="close-gemini-modal"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
              Consultas Rápidas Recomendadas
            </label>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(item.query)}
                  disabled={loading}
                  className="bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-900 border border-indigo-150/60 px-3.5 py-1.5 rounded-xl font-sans text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-left flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-indigo-500 text-sm">sparkles</span>
                  {item.title}
                </button>
              ))}
            </div>
          </div>

          {/* Search/Query Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
              ¿En qué puede ayudarte Gemini hoy?
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Escribe tu consulta o duda familiar (ej: Ideas para organizar las tareas de la cocina, menú de cenas rápidas...)"
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none font-sans"
              />
              <button
                onClick={() => handleAsk()}
                disabled={loading || !prompt.trim()}
                className="absolute right-3 bottom-3 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all active:scale-95"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    Pensando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">send</span>
                    Consultar IA
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          {/* Result Card */}
          {result && !loading && (
            <div className="bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 rounded-2xl p-5 border border-indigo-100/80 shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm border-b border-indigo-100 pb-2">
                <span className="material-symbols-outlined text-amber-500">lightbulb</span>
                Respuesta y Recomendación de Gemini
              </div>

              <p className="font-sans text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {result.response}
              </p>

              {result.tips && result.tips.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Consejos Prácticos:
                  </span>
                  <ul className="space-y-1.5">
                    {result.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700 font-sans">
                        <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.suggestedAction && (
                <div className="mt-4 pt-3 border-t border-indigo-100/80 flex items-center justify-between gap-3 bg-amber-50/80 p-3 rounded-xl border-amber-200/60">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-lg">flag</span>
                    <span className="text-xs font-medium text-amber-900">
                      <strong>Sugerencia de Acción:</strong> {result.suggestedAction}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1 text-[11px]">
            <span className="material-symbols-outlined text-amber-500 text-sm">bolt</span>
            Impulsado por Google Gemini 3.6 Flash
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-gray-700 rounded-xl font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
