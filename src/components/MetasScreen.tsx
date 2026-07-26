import React, { useState } from 'react';
import { Meta, Usuario, ConsecuenciaPlantilla, RecompensaPlantilla, ConsecuenciaPendiente } from '../types';

interface MetasScreenProps {
  metas: Meta[];
  usuarios: Usuario[];
  currentUser: any;
  consecuenciasPlantillas?: ConsecuenciaPlantilla[];
  recompensasPlantillas?: RecompensaPlantilla[];
  consecuenciasPendientes?: ConsecuenciaPendiente[];
  onAddGoal: (goalData: Partial<Meta>) => void;
  onCreateConsequenceTemplate?: (template: Partial<ConsecuenciaPlantilla>) => Promise<void>;
  onCreateRewardTemplate?: (template: Partial<RecompensaPlantilla>) => Promise<void>;
  onResolvePendingConsequence?: (pendiente_id: string, action: 'assign' | 'forgive') => Promise<void>;
  onEvaluateCompliance?: () => void;
}

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
];

// Helper to calculate deadline status for a goal
export interface GoalDeadlineInfo {
  isNear: boolean;
  isUnder24h: boolean;
  isExpired: boolean;
  label: string;
  badgeClass: string;
  cardBorderClass?: string;
  icon: string;
  hoursLeft: number;
}

export function getGoalDeadlineInfo(meta: Meta): GoalDeadlineInfo | null {
  let deadlineStr = meta.fecha_fin || meta.fecha_limite;
  if (!deadlineStr && meta.fecha_inicio) {
    const d = new Date(meta.fecha_inicio);
    const val = meta.duracion_valor || 1;
    const unit = meta.duracion_unidad || 'meses';
    if (unit === 'dias') d.setDate(d.getDate() + val);
    else if (unit === 'semanas') d.setDate(d.getDate() + val * 7);
    else d.setMonth(d.getMonth() + val);
    deadlineStr = d.toISOString().split('T')[0];
  }
  if (!deadlineStr) return null;

  const now = new Date();
  const deadlineDate = deadlineStr.includes('T') ? new Date(deadlineStr) : new Date(`${deadlineStr}T23:59:59`);

  if (isNaN(deadlineDate.getTime())) return null;

  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) {
    return {
      isNear: true,
      isUnder24h: true,
      isExpired: true,
      label: 'Plazo Vencido',
      badgeClass: 'bg-rose-950 text-rose-200 border border-rose-800 font-bold shadow-xs',
      cardBorderClass: 'border-rose-300 bg-rose-50/10',
      icon: 'running_with_errors',
      hoursLeft: 0,
    };
  }

  // Less than 24 hours away!
  if (diffHours <= 24) {
    const hours = Math.max(1, Math.floor(diffHours));
    return {
      isNear: true,
      isUnder24h: true,
      isExpired: false,
      label: `🚨 ¡Límite: <24h! (${hours}h)`,
      badgeClass: 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white border border-rose-300 shadow-md animate-pulse font-black',
      cardBorderClass: 'border-rose-400 ring-2 ring-rose-500/30 shadow-rose-100',
      icon: 'alarm',
      hoursLeft: hours,
    };
  }

  // Near deadline: <= 72 hours (3 days)
  if (diffHours <= 72) {
    const days = Math.ceil(diffHours / 24);
    return {
      isNear: true,
      isUnder24h: false,
      isExpired: false,
      label: `⏰ Vence en ${days} días`,
      badgeClass: 'bg-amber-500/20 text-amber-900 border border-amber-400/80 font-extrabold',
      cardBorderClass: 'border-amber-300/80',
      icon: 'schedule',
      hoursLeft: Math.floor(diffHours),
    };
  }

  // Near deadline: <= 168 hours (7 days)
  if (diffHours <= 168) {
    const days = Math.ceil(diffHours / 24);
    return {
      isNear: true,
      isUnder24h: false,
      isExpired: false,
      label: `⏳ Quedan ${days} días`,
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200 font-semibold',
      cardBorderClass: '',
      icon: 'calendar_month',
      hoursLeft: Math.floor(diffHours),
    };
  }

  return null;
}

export default function MetasScreen({
  metas = [],
  usuarios = [],
  currentUser,
  consecuenciasPlantillas = [],
  recompensasPlantillas = [],
  consecuenciasPendientes = [],
  onAddGoal,
  onCreateConsequenceTemplate,
  onCreateRewardTemplate,
  onResolvePendingConsequence,
  onEvaluateCompliance
}: MetasScreenProps) {
  // Main Tab
  const [activeTab, setActiveTab] = useState<'individual' | 'familiar'>('individual');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');

  // Modal States
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showConsModal, setShowConsModal] = useState<boolean>(false);
  const [selectedGoalDetail, setSelectedGoalDetail] = useState<Meta | null>(null);

  // Category List State with Custom Category Creation
  const [allCategories, setAllCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('custom_meta_categories');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['Salud', 'Estudio', 'Finanzas', 'Hogar', 'Personal'];
  });
  const [showAddCategoryModal, setShowAddCategoryModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Goal Form State
  const [tipo, setTipo] = useState<'individual' | 'familiar'>('individual');
  const [titulo, setTitulo] = useState<string>('');
  const [categoria, setCategoria] = useState<Meta['categoria']>('Salud');

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (!allCategories.includes(trimmed)) {
      const updated = [...allCategories, trimmed];
      setAllCategories(updated);
      try {
        localStorage.setItem('custom_meta_categories', JSON.stringify(updated));
      } catch (e) {}
    }
    setCategoria(trimmed as any);
    setCategoryFilter(trimmed);
    setNewCategoryName('');
    setShowAddCategoryModal(false);
  };

  const handleEditCategory = (oldCat: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldCat) return;
    const updated = allCategories.map(c => c === oldCat ? trimmed : c);
    setAllCategories(updated);
    try {
      localStorage.setItem('custom_meta_categories', JSON.stringify(updated));
    } catch (e) {}
    if (categoria === oldCat) setCategoria(trimmed as any);
    if (categoryFilter === oldCat) setCategoryFilter(trimmed);
  };

  const handleDeleteCategory = (catToDelete: string) => {
    if (allCategories.length <= 1) return;
    const updated = allCategories.filter(c => c !== catToDelete);
    setAllCategories(updated);
    try {
      localStorage.setItem('custom_meta_categories', JSON.stringify(updated));
    } catch (e) {}
    if (categoria === catToDelete) setCategoria(updated[0] as any);
    if (categoryFilter === catToDelete) setCategoryFilter('Todos');
  };
  const [frecuenciaObjetivo, setFrecuenciaObjetivo] = useState<number>(5);
  const [unidadFrecuencia, setUnidadFrecuencia] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [duracionValor, setDuracionValor] = useState<number>(1);
  const [duracionUnidad, setDuracionUnidad] = useState<'dias' | 'semanas' | 'meses'>('meses');
  const [fechaInicio, setFechaInicio] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Member selection for family goals
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(usuarios.map(u => u.uid));

  // Automatic tasks toggle
  const [generarTareas, setGenerarTareas] = useState<boolean>(true);
  const [diasPreferidos, setDiasPreferidos] = useState<number[]>([1, 2, 3, 4, 5]);
  const [horaSugerida, setHoraSugerida] = useState<string>('09:00');

  // Rewards toggle
  const [recompensaActiva, setRecompensaActiva] = useState<boolean>(false);
  const [recompensaId, setRecompensaId] = useState<string>('');

  // Create Reward Form State
  const [showRewModal, setShowRewModal] = useState<boolean>(false);
  const [rewTitulo, setRewTitulo] = useState<string>('');
  const [rewDesc, setRewDesc] = useState<string>('');
  const [rewTipo, setRewTipo] = useState<'generica' | 'desbloqueo_bot' | 'tiempo_extra_juegos'>('desbloqueo_bot');
  const [rewBotId, setRewBotId] = useState<'oscar' | 'bea' | 'vikram' | 'lin'>('vikram');
  const [rewMinutos, setRewMinutos] = useState<number>(30);

  // Consequences toggle
  const [consecuenciasActivas, setConsecuenciasActivas] = useState<boolean>(false);
  const [consecuenciaId, setConsecuenciaId] = useState<string>('');
  const [requiereAprobacionAdulto, setRequiereAprobacionAdulto] = useState<boolean>(true);

  // Create Consequence Form State
  const [consTitulo, setConsTitulo] = useState<string>('');
  const [consDesc, setConsDesc] = useState<string>('');
  const [consMin, setConsMin] = useState<number>(20);

  // AI Suggestion State
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [suggestedGoals, setSuggestedGoals] = useState<Array<{
    title: string;
    category: Meta['categoria'];
    description: string;
    milestones: string[];
  }>>([]);

  // Calculate fecha_fin dynamically
  const calculateEndDate = (start: string, val: number, unit: 'dias' | 'semanas' | 'meses') => {
    const d = new Date(start || Date.now());
    if (unit === 'dias') d.setDate(d.getDate() + val);
    else if (unit === 'semanas') d.setDate(d.getDate() + val * 7);
    else d.setMonth(d.getMonth() + val);
    return d.toISOString().split('T')[0];
  };

  const computedFechaFin = calculateEndDate(fechaInicio, duracionValor, duracionUnidad);

  const categories: string[] = ['Todos', ...allCategories];

  // Filter metas by Tab and Category
  const currentFamilyId = currentUser?.familia_id || "fam_kevin_admin";
  const tabMetas = metas.filter(m => (m.tipo || 'individual') === activeTab);
  const filteredMetas = categoryFilter === 'Todos'
    ? tabMetas
    : tabMetas.filter(m => m.categoria === categoryFilter);

  // Active pending consequences for review
  const pendingForReview = consecuenciasPendientes.filter(p => p.estado === 'pendiente');

  const handleGenerateAiGoals = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/gemini/suggest-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: categoryFilter !== 'Todos' ? categoryFilter : 'Hogar' })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestedGoals(data);
        }
      }
    } catch (e) {
      console.error("Error generating AI goals:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    onAddGoal({
      usuario_id: currentUser?.uid || "kevin-admin-uid",
      familia_id: currentFamilyId,
      tipo,
      titulo: titulo.trim(),
      categoria,
      frecuencia_objetivo: Number(frecuenciaObjetivo),
      unidad_frecuencia: unidadFrecuencia,
      duracion_valor: Number(duracionValor),
      duracion_unidad: duracionUnidad,
      fecha_inicio: fechaInicio,
      fecha_fin: computedFechaFin,
      miembros_asignados: tipo === 'familiar' ? selectedMemberIds : [currentUser?.uid || "kevin-admin-uid"],
      generar_tareas_automaticas: generarTareas,
      dias_preferidos: diasPreferidos,
      hora_sugerida: horaSugerida,
      consecuencias_activas: consecuenciasActivas,
      consecuencia_id: consecuenciaId,
      requiere_aprobacion_adulto: requiereAprobacionAdulto,
      recompensa_activa: recompensaActiva,
      recompensa_id: recompensaId,
      porcentaje_semanal: 0,
      visible_familia: true
    });

    setTitulo('');
    setShowModal(false);
  };

  const handleCreateRewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewTitulo.trim() || !onCreateRewardTemplate) return;

    await onCreateRewardTemplate({
      familia_id: currentFamilyId,
      titulo: rewTitulo.trim(),
      descripcion: rewDesc.trim(),
      tipo: rewTipo,
      bot_id_desbloqueado: rewTipo === 'desbloqueo_bot' ? rewBotId : undefined,
      minutos_extra: rewTipo === 'tiempo_extra_juegos' ? Number(rewMinutos) : undefined
    });

    setRewTitulo('');
    setRewDesc('');
    setShowRewModal(false);
  };

  const handleCreateConsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consTitulo.trim() || !onCreateConsequenceTemplate) return;

    await onCreateConsequenceTemplate({
      familia_id: currentFamilyId,
      titulo: consTitulo.trim(),
      descripcion: consDesc.trim(),
      categoria: 'Hogar',
      tiempo_estimado_min: Number(consMin),
      creado_por: currentUser?.uid || "kevin-admin-uid"
    });

    setConsTitulo('');
    setConsDesc('');
    setShowConsModal(false);
  };

  const toggleDay = (dayId: number) => {
    setDiasPreferidos(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const toggleMember = (uid: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const getCategoryIcon = (cat: Meta['categoria']) => {
    switch (cat) {
      case 'Salud': return 'fitness_center';
      case 'Estudio': return 'menu_book';
      case 'Finanzas': return 'savings';
      case 'Hogar': return 'home';
      default: return 'person';
    }
  };

  const getCategoryColor = (cat: Meta['categoria']) => {
    switch (cat) {
      case 'Salud': return 'text-emerald-700 bg-emerald-50';
      case 'Estudio': return 'text-purple-700 bg-purple-50';
      case 'Finanzas': return 'text-amber-700 bg-amber-50';
      case 'Hogar': return 'text-rose-700 bg-rose-50';
      default: return 'text-indigo-700 bg-brand-light';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Metas del Núcleo Familiar
          </h2>
          <p className="font-sans text-sm text-gray-500">
            Crea metas individuales y familiares con hábitos medibles y consecuencias constructivas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onEvaluateCompliance && (
            <button
              onClick={() => onEvaluateCompliance()}
              className="bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 px-3.5 py-2.5 rounded-full font-sans text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              title="Evaluar cumplimiento semanal de metas"
            >
              <span className="material-symbols-outlined text-base">fact_check</span>
              Evaluar Cumplimiento
            </button>
          )}
          <button
            onClick={handleGenerateAiGoals}
            disabled={aiLoading}
            className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-4 py-2.5 rounded-full font-sans text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            {aiLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-base">sync</span>
                Generando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-amber-500 text-base">auto_awesome</span>
                Sugerir con Gemini IA
              </>
            )}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-primary text-white px-5 py-2.5 rounded-full font-sans text-sm font-bold flex items-center justify-center gap-1.5 shadow-md hover:bg-brand-dark transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Nueva Meta
          </button>
        </div>
      </div>

      {/* PENDING CONSEQUENCES REVIEW BANNER (PARTE 7) */}
      {pendingForReview.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 p-5 rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-xl font-bold">gavel</span>
              <h3 className="font-sans text-sm font-bold text-amber-950">
                Revisiones de Consecuencias Pendientes ({pendingForReview.length})
              </h3>
            </div>
            <span className="text-[11px] font-medium text-amber-700">
              Evaluación constructiva de compromisos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingForReview.map((pend) => {
              const user = usuarios.find(u => u.uid === pend.usuario_id);
              return (
                <div key={pend.pendiente_id} className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={user?.avatar_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop"}
                      alt={user?.nombre}
                      className="w-10 h-10 rounded-full object-cover border border-amber-200"
                    />
                    <div>
                      <h4 className="font-sans text-xs font-bold text-gray-900">{user?.nombre || "Miembro"}</h4>
                      <p className="font-sans text-xs text-gray-700 font-semibold mt-0.5">
                        Meta: {pend.meta_titulo}
                      </p>
                      <p className="font-sans text-[11px] text-amber-800 font-medium">
                        Cumplimiento: <span className="font-bold">{pend.cumplimiento}</span> en el periodo.
                      </p>
                      <div className="mt-1.5 p-2 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-900">
                        Consecuencia sugerida: <span className="font-bold">{pend.consecuencia_titulo || "Tarea de responsabilidad"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => onResolvePendingConsequence && onResolvePendingConsequence(pend.pendiente_id, 'assign')}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">assignment</span>
                      Asignar Consecuencia
                    </button>
                    <button
                      onClick={() => onResolvePendingConsequence && onResolvePendingConsequence(pend.pendiente_id, 'forgive')}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-gray-700 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">volunteer_activism</span>
                      Perdonar esta vez
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested AI Goals Banner */}
      {suggestedGoals.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50/80 via-purple-50/80 to-amber-50/80 p-5 rounded-3xl border border-indigo-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-xl">auto_awesome</span>
              <h3 className="font-sans text-sm font-bold text-indigo-950">
                Sugerencias de Metas por Gemini IA
              </h3>
            </div>
            <button onClick={() => setSuggestedGoals([])} className="text-gray-400 hover:text-gray-600 text-xs font-bold">
              Ocultar
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {suggestedGoals.map((sg, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-indigo-100/80 shadow-xs flex flex-col justify-between space-y-3">
                <div>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-md inline-block mb-1.5">
                    {sg.category}
                  </span>
                  <h4 className="font-sans text-xs font-bold text-gray-900 mb-1">{sg.title}</h4>
                  <p className="font-sans text-[11px] text-gray-600 leading-snug">{sg.description}</p>
                </div>
                <button
                  onClick={() => {
                    onAddGoal({
                      usuario_id: currentUser?.uid || "kevin-admin-uid",
                      familia_id: currentFamilyId,
                      tipo: 'individual',
                      titulo: sg.title,
                      categoria: sg.category || 'Hogar',
                      frecuencia_objetivo: 5,
                      unidad_frecuencia: 'semana',
                      duracion_valor: 1,
                      duracion_unidad: 'meses',
                      fecha_inicio: new Date().toISOString().split('T')[0],
                      generar_tareas_automaticas: true,
                      consecuencias_activas: false,
                      requiere_aprobacion_adulto: true,
                      porcentaje_semanal: 0,
                      visible_familia: true
                    });
                    setSuggestedGoals(prev => prev.filter((_, i) => i !== idx));
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-sans text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">add_task</span>
                  Añadir esta Meta
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Mode Tabs: Individuales vs Familiares */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-6 py-2.5 rounded-2xl font-sans text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'individual'
                ? 'bg-brand-primary text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">person</span>
            Metas Individuales ({metas.filter(m => (m.tipo || 'individual') === 'individual').length})
          </button>

          <button
            onClick={() => setActiveTab('familiar')}
            className={`px-6 py-2.5 rounded-2xl font-sans text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'familiar'
                ? 'bg-brand-primary text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">groups</span>
            Metas Familiares ({metas.filter(m => m.tipo === 'familiar').length})
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center overflow-x-auto pb-1 gap-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full font-sans text-xs font-semibold border transition-all cursor-pointer ${
              categoryFilter === cat
                ? 'bg-brand-light text-brand-dark border-brand-primary shadow-xs font-bold'
                : 'bg-white text-gray-500 border-slate-200 hover:text-gray-900'
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowAddCategoryModal(true)}
          className="whitespace-nowrap px-3 py-1.5 rounded-full font-sans text-xs font-black bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          + Categoría
        </button>
      </div>

      {/* Metas Grid */}
      {(() => {
        const criticalMetas = (metas || []).filter(m => {
          const info = getGoalDeadlineInfo(m);
          return info && info.isUnder24h && !info.isExpired;
        });

        return criticalMetas.length > 0 ? (
          <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 border border-rose-300 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-rose-900 font-extrabold text-xs">
              <span className="material-symbols-outlined text-rose-600 text-lg animate-bounce">alarm</span>
              <span>
                ¡Atención! Tienes <strong className="text-rose-700 underline font-black">{criticalMetas.length} meta(s)</strong> con fecha límite a menos de 24 horas.
              </span>
            </div>
            <span className="bg-rose-600 text-white font-black text-[10px] uppercase px-2.5 py-1 rounded-full animate-pulse shrink-0">
              Urgente &lt; 24 Horas
            </span>
          </div>
        ) : null;
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMetas.map((meta) => {
          const owner = usuarios.find(u => u.uid === meta.usuario_id);
          const isFamiliar = meta.tipo === 'familiar';
          const deadlineInfo = getGoalDeadlineInfo(meta);

          return (
            <div
              key={meta.meta_id}
              onClick={() => setSelectedGoalDetail(meta)}
              className={`bg-white rounded-3xl p-5 border shadow-xl flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 min-h-[200px] cursor-pointer relative group ${
                deadlineInfo?.cardBorderClass 
                  ? deadlineInfo.cardBorderClass 
                  : 'border-indigo-50/80 shadow-indigo-100/20'
              }`}
            >
              {/* Top Badge for Deadline Alert (if critical or near) */}
              {deadlineInfo && (
                <div className="mb-2 flex items-center justify-between gap-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] ${deadlineInfo.badgeClass}`}>
                    <span className="material-symbols-outlined text-xs">{deadlineInfo.icon}</span>
                    <span>{deadlineInfo.label}</span>
                  </span>

                  {deadlineInfo.isUnder24h && !deadlineInfo.isExpired && (
                    <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 uppercase tracking-wider">
                      Próximo a vencer
                    </span>
                  )}
                </div>
              )}

              {/* Badge for Type */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${getCategoryColor(meta.categoria)}`}>
                    <span className="material-symbols-outlined text-lg font-bold">
                      {getCategoryIcon(meta.categoria)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-gray-600 font-sans text-[10px] font-bold uppercase tracking-wider">
                        {meta.categoria}
                      </span>
                      <span className={`inline-block px-2 py-0.5 rounded-md font-sans text-[10px] font-bold uppercase tracking-wider ${
                        isFamiliar ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isFamiliar ? 'Familiar' : 'Individual'}
                      </span>
                    </div>
                    <h3 className="font-sans text-base font-bold text-gray-900 line-clamp-1">{meta.titulo}</h3>
                  </div>
                </div>
              </div>

              {/* Goal Frequency & Duration Info */}
              <div className="bg-slate-50 p-2.5 rounded-2xl text-xs text-gray-600 space-y-1 mb-3">
                <div className="flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-sm text-brand-primary">repeat</span>
                  <span>
                    Objetivo: <strong className="text-gray-900">{meta.frecuencia_objetivo || 3} veces por {meta.unidad_frecuencia || 'semana'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                  <span>Duración: {meta.duracion_valor || 1} {meta.duracion_unidad || 'meses'}</span>
                </div>
              </div>

              {/* Progress & Members Breakdown */}
              {isFamiliar ? (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                    <span>Progreso Familiar</span>
                    <span className="text-purple-700">{meta.porcentaje_semanal || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${meta.porcentaje_semanal || 0}%` }}
                    />
                  </div>

                  {/* Participant Avatars */}
                  <div className="flex items-center gap-1 pt-1">
                    <span className="text-[10px] font-bold text-gray-400 mr-1">Participantes:</span>
                    <div className="flex -space-x-2 overflow-hidden">
                      {(meta.miembros_asignados || usuarios.map(u => u.uid)).map((uid) => {
                        const mUser = usuarios.find(u => u.uid === uid);
                        if (!mUser) return null;
                        return (
                          <img
                            key={uid}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
                            src={mUser.avatar_url}
                            alt={mUser.nombre}
                            title={mUser.nombre}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    {owner && (
                      <div className="w-7 h-7 rounded-full border border-slate-200 overflow-hidden bg-gray-50">
                        <img className="w-full h-full object-cover" src={owner.avatar_url} alt={owner.nombre} />
                      </div>
                    )}
                    <span className="font-sans text-xs text-gray-600 font-medium">{owner?.nombre || 'Miembro'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-10 h-10 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" fill="transparent" r="40" stroke="#edeef0" strokeWidth="12" />
                        <circle
                          cx="50"
                          cy="50"
                          fill="transparent"
                          r="40"
                          stroke="#6366F1"
                          strokeWidth="12"
                          strokeDasharray="251.2"
                          strokeDashoffset={251.2 - (251.2 * (meta.porcentaje_semanal || 0)) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute font-sans text-[9px] font-extrabold text-brand-dark">{meta.porcentaje_semanal || 0}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Create Card Button */}
        <div
          onClick={() => setShowModal(true)}
          className="bg-slate-50/60 border-2 border-dashed border-indigo-100 rounded-3xl p-5 flex flex-col items-center justify-center min-h-[200px] cursor-pointer hover:bg-white hover:border-brand-primary/40 hover:shadow-lg transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-100 flex items-center justify-center mb-2 shadow-sm group-hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-brand-primary text-xl font-bold">add</span>
          </div>
          <span className="font-sans text-sm font-bold text-gray-600 group-hover:text-brand-primary">
            Crear Meta {activeTab === 'familiar' ? 'Familiar' : 'Individual'}
          </span>
        </div>
      </div>

      {/* CREATE GOAL MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white rounded-3xl p-6 md:p-8 shadow-2xl max-w-lg w-full border border-indigo-50/80 animate-fade-in max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-sans text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-primary">flag</span>
                Crear Nueva Meta
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-gray-500 hover:bg-slate-200"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateGoalSubmit} className="space-y-5">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setTipo('individual')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    tipo === 'individual' ? 'bg-white text-brand-primary shadow-xs' : 'text-gray-500'
                  }`}
                >
                  Meta Individual
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('familiar')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    tipo === 'familiar' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-500'
                  }`}
                >
                  Meta Familiar
                </button>
              </div>

              {/* Title & Category */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título de la Meta</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Leer 20 minutos diariamente"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Categoría</label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryModal(true)}
                      className="text-[10px] font-black text-indigo-600 hover:underline cursor-pointer"
                    >
                      + Nueva
                    </button>
                  </div>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as Meta['categoria'])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                  />
                </div>
              </div>

              {/* Family Members Selector if Familiar */}
              {tipo === 'familiar' && (
                <div className="space-y-2 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                  <label className="block text-xs font-bold text-purple-900 uppercase">
                    Miembros Asignados
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {usuarios.map((u) => {
                      const isSelected = selectedMemberIds.includes(u.uid);
                      return (
                        <button
                          key={u.uid}
                          type="button"
                          onClick={() => toggleMember(u.uid)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-white text-gray-600 border border-purple-200'
                          }`}
                        >
                          <img className="w-4 h-4 rounded-full object-cover" src={u.avatar_url} alt={u.nombre} />
                          {u.nombre}
                          {isSelected && <span className="material-symbols-outlined text-xs">check</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Frequency & Duration */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase">Frecuencia y Duración Medible</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase">Frecuencia Objetivo</label>
                    <div className="flex gap-2 items-center mt-1">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={frecuenciaObjetivo}
                        onChange={(e) => setFrecuenciaObjetivo(Number(e.target.value))}
                        className="w-20 bg-white border border-slate-300 rounded-xl p-2 text-sm font-bold text-center"
                      />
                      <span className="text-xs text-gray-500 font-medium">veces por</span>
                      <select
                        value={unidadFrecuencia}
                        onChange={(e) => setUnidadFrecuencia(e.target.value as any)}
                        className="bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold"
                      >
                        <option value="dia">Día</option>
                        <option value="semana">Semana</option>
                        <option value="mes">Mes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase">Duración de la Meta</label>
                    <div className="flex gap-2 items-center mt-1">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={duracionValor}
                        onChange={(e) => setDuracionValor(Number(e.target.value))}
                        className="w-16 bg-white border border-slate-300 rounded-xl p-2 text-sm font-bold text-center"
                      />
                      <select
                        value={duracionUnidad}
                        onChange={(e) => setDuracionUnidad(e.target.value as any)}
                        className="bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold"
                      >
                        <option value="dias">Días</option>
                        <option value="semanas">Semanas</option>
                        <option value="meses">Meses</option>
                      </select>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 italic">
                  Fecha fin estimada: <strong className="text-gray-800">{computedFechaFin}</strong>
                </p>
              </div>

              {/* Automatic Tasks Toggle */}
              <div className="space-y-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950">Generar Tareas Diarias Automáticamente</h4>
                    <p className="text-[11px] text-indigo-700">Crea los pendientes en la agenda según los días preferidos.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={generarTareas}
                    onChange={(e) => setGenerarTareas(e.target.checked)}
                    className="w-5 h-5 text-brand-primary rounded-md focus:ring-brand-primary"
                  />
                </div>

                {generarTareas && (
                  <div className="space-y-3 pt-2 border-t border-indigo-100">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-800 uppercase mb-1.5">
                        Días Preferidos
                      </label>
                      <div className="flex gap-1.5">
                        {DAYS_OF_WEEK.map((d) => {
                          const active = diasPreferidos.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => toggleDay(d.id)}
                              className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                                active ? 'bg-brand-primary text-white shadow-xs' : 'bg-white text-gray-500 border border-slate-200'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-indigo-800 uppercase mb-1">
                        Hora Sugerida de la Tarea
                      </label>
                      <input
                        type="time"
                        value={horaSugerida}
                        onChange={(e) => setHoraSugerida(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Rewards System */}
              <div className="space-y-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">Activar Recompensa al Cumplir Meta</h4>
                    <p className="text-[11px] text-emerald-800">Desbloquea contenido de juegos o privilegios especiales al alcanzar el 100%.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={recompensaActiva}
                    onChange={(e) => setRecompensaActiva(e.target.checked)}
                    className="w-5 h-5 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                {recompensaActiva && (
                  <div className="space-y-3 pt-2 border-t border-emerald-200/60">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                        Seleccionar Recompensa
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={recompensaId}
                          onChange={(e) => setRecompensaId(e.target.value)}
                          className="flex-1 bg-white border border-emerald-200 rounded-xl p-2 text-xs font-bold text-gray-800 outline-none"
                        >
                          <option value="">-- Seleccionar recompensa --</option>
                          {recompensasPlantillas.map((rp) => (
                            <option key={rp.recompensa_id} value={rp.recompensa_id}>
                              🎁 {rp.titulo} {rp.tipo === 'desbloqueo_bot' ? `(Bot: ${rp.bot_id_desbloqueado?.toUpperCase()})` : rp.tipo === 'tiempo_extra_juegos' ? `(+${rp.minutos_extra} min juegos)` : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowRewModal(true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">add</span>
                          Nueva
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Consequences System */}
              <div className="space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">Activar Consecuencias por Incumplimiento</h4>
                    <p className="text-[11px] text-amber-800">Sistema constructivo de tareas familiares adaptadas.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consecuenciasActivas}
                    onChange={(e) => setConsecuenciasActivas(e.target.checked)}
                    className="w-5 h-5 text-amber-600 rounded-md focus:ring-amber-500"
                  />
                </div>

                {consecuenciasActivas && (
                  <div className="space-y-3 pt-2 border-t border-amber-200/60">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">
                        Plantilla de Consecuencia Constructiva
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={consecuenciaId}
                          onChange={(e) => setConsecuenciaId(e.target.value)}
                          className="flex-1 bg-white border border-amber-200 rounded-xl p-2 text-xs font-bold text-gray-800 outline-none"
                        >
                          <option value="">-- Seleccionar consecuencia --</option>
                          {consecuenciasPlantillas.map((cp) => (
                            <option key={cp.consecuencia_id} value={cp.consecuencia_id}>
                              {cp.titulo} ({cp.tiempo_estimado_min} mins)
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowConsModal(true)}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                        >
                          <span className="material-symbols-outlined text-xs">add</span>
                          Nueva
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="reqAdult"
                        checked={requiereAprobacionAdulto}
                        onChange={(e) => setRequiereAprobacionAdulto(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded"
                      />
                      <label htmlFor="reqAdult" className="text-xs text-amber-900 font-medium">
                        Requiere aprobación de un adulto antes de asignar la consecuencia
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-brand-primary hover:bg-brand-dark text-white py-3 rounded-full font-sans text-sm font-bold shadow-md transition-all active:scale-95"
                >
                  Guardar y Activar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CONSEQUENCE TEMPLATE MODAL */}
      {showConsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs" onClick={() => setShowConsModal(false)}></div>
          <div className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-amber-100 animate-scale-up">
            <h3 className="font-sans text-base font-bold text-amber-950 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600">construction</span>
              Crear Plantilla de Consecuencia
            </h3>

            <form onSubmit={handleCreateConsSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Título de la Consecuencia</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Lavar los platos de la cena"
                  value={consTitulo}
                  onChange={(e) => setConsTitulo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descripción Constructiva</label>
                <textarea
                  rows={2}
                  placeholder="Instrucción amable o tarea del hogar asignada..."
                  value={consDesc}
                  onChange={(e) => setConsDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tiempo Estimado (Minutos)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={consMin}
                  onChange={(e) => setConsMin(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConsModal(false)}
                  className="flex-1 py-2.5 rounded-full border border-slate-200 text-xs font-bold text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL GOAL MODAL */}
      {selectedGoalDetail && (() => {
        const detailDeadlineInfo = getGoalDeadlineInfo(selectedGoalDetail);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-xs" onClick={() => setSelectedGoalDetail(null)}></div>
            <div className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-indigo-50 animate-scale-up space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                      Meta {selectedGoalDetail.tipo === 'familiar' ? 'Familiar' : 'Individual'}
                    </span>
                    {detailDeadlineInfo && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] ${detailDeadlineInfo.badgeClass}`}>
                        <span className="material-symbols-outlined text-[12px]">{detailDeadlineInfo.icon}</span>
                        <span>{detailDeadlineInfo.label}</span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-sans text-lg font-bold text-gray-900">{selectedGoalDetail.titulo}</h3>
                </div>
                <button
                  onClick={() => setSelectedGoalDetail(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-gray-500 cursor-pointer hover:bg-slate-200"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {detailDeadlineInfo && detailDeadlineInfo.isUnder24h && !detailDeadlineInfo.isExpired && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-center gap-2.5 text-xs text-rose-900 font-medium">
                  <span className="material-symbols-outlined text-rose-600 text-lg animate-pulse">alarm</span>
                  <div>
                    <strong className="block font-black text-rose-700 uppercase text-[10px] tracking-wider">¡Alerta de Fecha Límite Crítica!</strong>
                    <span>Esta meta vence en menos de 24 horas. ¡Completa las tareas para asegurar el cumplimiento!</span>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs text-gray-700">
                <p><strong>Categoría:</strong> {selectedGoalDetail.categoria}</p>
                <p><strong>Frecuencia:</strong> {selectedGoalDetail.frecuencia_objetivo} veces por {selectedGoalDetail.unidad_frecuencia}</p>
                <p><strong>Duración:</strong> {selectedGoalDetail.duracion_valor} {selectedGoalDetail.duracion_unidad}</p>
                <p><strong>Periodo:</strong> {selectedGoalDetail.fecha_inicio} a {selectedGoalDetail.fecha_fin || selectedGoalDetail.fecha_limite}</p>
                <p><strong>Generación Automática Tareas:</strong> {selectedGoalDetail.generar_tareas_automaticas ? 'Sí' : 'No'}</p>
                <p><strong>Consecuencias Activas:</strong> {selectedGoalDetail.consecuencias_activas ? 'Sí' : 'No'}</p>
              </div>

            {selectedGoalDetail.tipo === 'familiar' && selectedGoalDetail.progreso_por_miembro && selectedGoalDetail.progreso_por_miembro.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-800 uppercase">Desglose por Miembro Participante</h4>
                <div className="space-y-2">
                  {selectedGoalDetail.progreso_por_miembro.map((p) => {
                    const mUser = usuarios.find(u => u.uid === p.usuario_id);
                    return (
                      <div key={p.usuario_id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                          <img className="w-6 h-6 rounded-full object-cover" src={mUser?.avatar_url} alt={mUser?.nombre} />
                          <span className="font-bold text-gray-800">{mUser?.nombre}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">{p.periodos_cumplidos}/{p.periodos_totales}</span>
                          <span className="font-extrabold text-indigo-600">{p.porcentaje}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedGoalDetail(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-gray-800 py-2.5 rounded-full text-xs font-bold"
            >
              Cerrar
            </button>
          </div>
        </div>
        );
      })()}

      {/* CREATE REWARD TEMPLATE MODAL */}
      {showRewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs" onClick={() => setShowRewModal(false)}></div>
          <div className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-emerald-100 animate-scale-up space-y-4">
            <h3 className="font-sans text-base font-bold text-emerald-950 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600">military_tech</span>
              Nueva Recompensa
            </h3>

            <form onSubmit={handleCreateRewSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Título de la Recompensa
                </label>
                <input
                  type="text"
                  required
                  value={rewTitulo}
                  onChange={(e) => setRewTitulo(e.target.value)}
                  placeholder="ej. Desbloquear Bot Lin 👑"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-gray-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Tipo de Recompensa
                </label>
                <select
                  value={rewTipo}
                  onChange={(e) => setRewTipo(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-gray-800 outline-none"
                >
                  <option value="desbloqueo_bot">🤖 Desbloqueo de Bot de IA</option>
                  <option value="tiempo_extra_juegos">⏱️ Tiempo Extra de Juegos</option>
                  <option value="generica">🎁 Premio Genérico / Especial</option>
                </select>
              </div>

              {rewTipo === 'desbloqueo_bot' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Bot a Desbloquear
                  </label>
                  <select
                    value={rewBotId}
                    onChange={(e) => setRewBotId(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-gray-800 outline-none"
                  >
                    <option value="vikram">Vikram 🧙‍♂️ (Nivel Avanzado)</option>
                    <option value="lin">Lin 👑 (Nivel Maestro)</option>
                    <option value="bea">Bea 🚀 (Disponible por defecto)</option>
                    <option value="oscar">Óscar 🎯 (Disponible por defecto)</option>
                  </select>
                </div>
              )}

              {rewTipo === 'tiempo_extra_juegos' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Minutos Extra de Juegos
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={rewMinutos}
                    onChange={(e) => setRewMinutos(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-gray-800 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={rewDesc}
                  onChange={(e) => setRewDesc(e.target.value)}
                  placeholder="Detalles adicionales para celebrar el cumplimiento..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-gray-800 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Guardar Recompensa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CUSTOM CATEGORY MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowAddCategoryModal(false)}></div>
          <div className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-indigo-100 animate-fadeIn">
            <h3 className="font-sans text-lg font-extrabold text-slate-900 mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600">category</span>
              Agregar Nueva Categoría
            </h3>
            <p className="font-sans text-xs text-slate-500 mb-4">
              Crea una categoría personalizada para clasificar tus metas y tareas.
            </p>

            <form onSubmit={handleAddCustomCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de la Categoría</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej. Deportes, Arte, Proyectos..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
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
