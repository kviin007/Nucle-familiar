import React, { useState } from 'react';
import { TareaDiaria, Usuario } from '../types';
import { Plus, CheckCircle2, Circle, Clock, Tag, Calendar, User, Filter, Search, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface TareasDiariasScreenProps {
  currentUser: Usuario | null;
  usuarios: Usuario[];
  tareas: TareaDiaria[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (
    titulo: string,
    userId: string,
    scheduledTime: string,
    estimatedTime: number,
    visible: boolean,
    categoria?: 'Hogar' | 'Estudio' | 'Salud' | 'Personal' | 'Otros',
    esPrioridadAlta?: boolean
  ) => Promise<void> | void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function TareasDiariasScreen({
  currentUser,
  usuarios,
  tareas,
  onToggleTask,
  onAddTask,
  showToast
}: TareasDiariasScreenProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [filterStatus, setFilterStatus] = useState<'todas' | 'pendientes' | 'completadas'>('pendientes');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State for New Task
  const [titulo, setTitulo] = useState('');
  const [usuarioId, setUsuarioId] = useState<string>(currentUser?.uid || '');
  const [horaProgramada, setHoraProgramada] = useState('09:00');
  const [tiempoEstimado, setTiempoEstimado] = useState(30);
  const [categoria, setCategoria] = useState<'Hogar' | 'Estudio' | 'Salud' | 'Personal' | 'Otros'>('Hogar');
  const [visibleFamilia, setVisibleFamilia] = useState(true);
  const [esPrioridadAlta, setEsPrioridadAlta] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Todas', 'Hogar', 'Estudio', 'Salud', 'Personal', 'Otros'];

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!titulo.trim()) {
      showToast("Por favor ingresa un título para la tarea.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddTask(
        titulo.trim(),
        usuarioId || currentUser?.uid || '',
        horaProgramada,
        tiempoEstimado,
        visibleFamilia,
        categoria,
        esPrioridadAlta
      );
      showToast("¡Tarea diaria agregada con éxito! ✨", "success");
      setTitulo('');
      setShowAddModal(false);
    } catch (err) {
      console.error("Error al agregar tarea:", err);
      showToast("Error al agregar la tarea.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter tasks
  const filteredTareas = (tareas || []).filter(t => {
    // Search term
    if (searchTerm && !t.titulo.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // Category
    if (filterCategory !== 'Todas' && t.categoria !== filterCategory) {
      return false;
    }
    // Status
    if (filterStatus === 'pendientes' && t.estado === 'completada') {
      return false;
    }
    if (filterStatus === 'completadas' && t.estado !== 'completada') {
      return false;
    }
    return true;
  });

  const getAssigneeName = (uid: string) => {
    const found = usuarios.find(u => u.uid === uid);
    return found ? found.nombre : 'Familiar';
  };

  const getAssigneeAvatar = (uid: string) => {
    const found = usuarios.find(u => u.uid === uid);
    return found?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
  };

  return (
    <div className="space-y-6 select-none font-sans max-w-6xl mx-auto">
      {/* Top Header & Create Button */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="text-indigo-600" size={28} />
            Gestión de Tareas Diarias
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Organiza, asigna y da seguimiento a las actividades del día para ti y tu familia.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-lg border-b-4 border-indigo-950 active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
        >
          <Plus size={20} />
          <span>Nueva Tarea Diaria</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar tarea..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-full md:w-auto justify-center">
            <button
              type="button"
              onClick={() => setFilterStatus('pendientes')}
              className={`px-4 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                filterStatus === 'pendientes'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pendientes ({tareas.filter(t => t.estado !== 'completada').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('completadas')}
              className={`px-4 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                filterStatus === 'completadas'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completadas ({tareas.filter(t => t.estado === 'completada').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('todas')}
              className={`px-4 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                filterStatus === 'todas'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({tareas.length})
            </button>
          </div>
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase flex items-center gap-1 pr-1">
            <Filter size={12} /> Categoria:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-xl font-extrabold text-xs transition-all whitespace-nowrap cursor-pointer ${
                filterCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Task List Grid */}
      {filteredTareas.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <Sparkles size={32} />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">No hay tareas encontradas</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterStatus === 'pendientes'
              ? '¡Excelente! No tienes tareas pendientes por realizar.'
              : 'Agrega una nueva tarea diaria para organizar tu día.'}
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Agregar Tarea
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTareas.map((tarea) => {
            const isDone = tarea.estado === 'completada';
            const assigneeName = getAssigneeName(tarea.usuario_id);
            const assigneeAvatar = getAssigneeAvatar(tarea.usuario_id);

            return (
              <div
                key={tarea.tarea_id}
                className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between gap-4 ${
                  isDone
                    ? 'bg-slate-50/80 border-slate-200 opacity-75'
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300'
                }`}
              >
                <div className="space-y-2">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Tag size={10} />
                      {tarea.categoria || 'Hogar'}
                    </span>

                    {tarea.es_prioridad_alta && (
                      <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle size={10} /> Alta Prioridad
                      </span>
                    )}
                  </div>

                  {/* Title & Checkbox */}
                  <div className="flex items-start gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => onToggleTask(tarea.tarea_id)}
                      className={`mt-0.5 transition-transform hover:scale-110 cursor-pointer ${
                        isDone ? 'text-emerald-600' : 'text-slate-300 hover:text-indigo-600'
                      }`}
                    >
                      {isDone ? <CheckCircle2 size={22} className="fill-emerald-100" /> : <Circle size={22} />}
                    </button>
                    <h4 className={`font-extrabold text-sm leading-snug ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {tarea.titulo}
                    </h4>
                  </div>
                </div>

                {/* Footer details */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 font-bold">
                    <img
                      src={assigneeAvatar}
                      alt={assigneeName}
                      className="w-5 h-5 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="truncate max-w-[100px]">{assigneeName}</span>
                  </div>

                  <div className="flex items-center gap-3 font-semibold text-[11px] text-slate-600">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      {tarea.hora_programada || 'Hoy'}
                    </span>
                    <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-lg font-black text-[10px]">
                      +{tarea.puntos || 10} pts
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Plus size={20} className="text-indigo-600" />
                Nueva Tarea Diaria
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTask} className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                  Título de la Tarea *
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Preparar la cena, Hacer ejercicio..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Asignar A */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                  Asignar a
                </label>
                <select
                  value={usuarioId}
                  onChange={(e) => setUsuarioId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  {usuarios.map(u => (
                    <option key={u.uid} value={u.uid}>
                      {u.nombre} {u.uid === currentUser?.uid ? '(Yo)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoría & Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                    Categoría
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Hogar">Hogar</option>
                    <option value="Estudio">Estudio</option>
                    <option value="Salud">Salud</option>
                    <option value="Personal">Personal</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                    Hora Programada
                  </label>
                  <input
                    type="time"
                    value={horaProgramada}
                    onChange={(e) => setHoraProgramada(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Tiempo estimado & Opciones */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                    Tiempo Estimado (min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    step="5"
                    value={tiempoEstimado}
                    onChange={(e) => setTiempoEstimado(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col justify-end space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={esPrioridadAlta}
                      onChange={(e) => setEsPrioridadAlta(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Prioridad Alta</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleFamilia}
                      onChange={(e) => setVisibleFamilia(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Visible para la familia</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-6 py-2.5 rounded-2xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Crear Tarea</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
