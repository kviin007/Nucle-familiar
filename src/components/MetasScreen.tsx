import React, { useState } from 'react';
import { Meta, Usuario } from '../types';

interface MetasScreenProps {
  metas: Meta[];
  usuarios: Usuario[];
  onAddGoal: (titulo: string, categoria: Meta['categoria']) => void;
}

export default function MetasScreen({ metas, usuarios, onAddGoal }: MetasScreenProps) {
  const [filter, setFilter] = useState<string>('Todos');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<Meta['categoria']>('Salud');

  const categories: string[] = ['Todos', 'Salud', 'Estudio', 'Finanzas', 'Hogar', 'Personal'];

  const filteredMetas = filter === 'Todos'
    ? metas
    : metas.filter(m => m.categoria === filter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onAddGoal(newTitle.trim(), newCategory);
      setNewTitle('');
      setShowModal(false);
    }
  };

  const getCategoryIcon = (category: Meta['categoria']) => {
    switch (category) {
      case 'Salud': return 'fitness_center';
      case 'Estudio': return 'menu_book';
      case 'Finanzas': return 'savings';
      case 'Hogar': return 'home';
      default: return 'person';
    }
  };

  const getCategoryColor = (category: Meta['categoria']) => {
    switch (category) {
      case 'Salud': return 'text-emerald-700 bg-emerald-50';
      case 'Estudio': return 'text-purple-700 bg-purple-50';
      case 'Finanzas': return 'text-amber-700 bg-amber-50';
      default: return 'text-indigo-700 bg-brand-light';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Mis Metas</h2>
          <p className="font-sans text-sm text-gray-500">Sigue tu progreso y alcanza tus objetivos en familia.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-brand-primary text-white px-5 py-2.5 rounded-full font-sans text-sm font-bold flex items-center justify-center gap-1.5 shadow-md hover:bg-brand-dark hover:shadow-lg hover:shadow-indigo-100 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva Meta
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`whitespace-nowrap px-5 py-2 rounded-full font-sans text-xs font-semibold border transition-all ${
              filter === cat
                ? 'bg-brand-light text-brand-dark border-brand-primary shadow-sm'
                : 'bg-white text-gray-500 border-slate-150 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMetas.map((meta) => {
          const owner = usuarios.find(u => u.uid === meta.usuario_id);
          return (
            <div key={meta.meta_id} className="bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 min-h-[180px]">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${getCategoryColor(meta.categoria)}`}>
                    <span className="material-symbols-outlined text-lg font-bold">
                      {getCategoryIcon(meta.categoria)}
                    </span>
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-gray-500 font-sans text-[10px] font-bold uppercase tracking-wider mb-1">
                      {meta.categoria}
                    </span>
                    <h3 className="font-sans text-base font-bold text-gray-900 line-clamp-1">{meta.titulo}</h3>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                  {owner && (
                    <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-50">
                      <img className="w-full h-full object-cover" src={owner.avatar_url} alt={owner.nombre} />
                    </div>
                  )}
                  <span className="font-sans text-xs text-gray-500">{owner?.nombre || 'Miembro'}</span>
                </div>

                {/* Progress Circle */}
                <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
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
                      strokeDashoffset={251.2 - (251.2 * meta.porcentaje_semanal) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute font-sans text-[10px] font-extrabold text-brand-dark">{meta.porcentaje_semanal}%</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty placeholder to create new goal */}
        <div
          onClick={() => setShowModal(true)}
          className="bg-slate-50/50 border-2 border-dashed border-indigo-100/80 rounded-3xl p-5 flex flex-col items-center justify-center min-h-[180px] cursor-pointer hover:bg-white hover:border-brand-primary/40 hover:shadow-lg hover:shadow-indigo-100/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-50 flex items-center justify-center mb-2 shadow-sm group-hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-brand-primary text-xl font-bold">add</span>
          </div>
          <span className="font-sans text-sm font-bold text-gray-500 group-hover:text-brand-primary transition-all">
            Crear Nueva Meta
          </span>
        </div>
      </div>

      {/* Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/10 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white rounded-3xl p-6 shadow-xl max-w-sm w-full border border-indigo-50/80 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-sans text-lg font-bold text-gray-900 flex items-center gap-1.5">
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-sans text-xs font-bold text-gray-400 uppercase mb-1">Título de la Meta</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Caminata diaria de 30 mins"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                />
              </div>

              <div>
                <label className="block font-sans text-xs font-bold text-gray-400 uppercase mb-1">Categoría</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as Meta['categoria'])}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                >
                  <option value="Salud">Salud</option>
                  <option value="Estudio">Estudio</option>
                  <option value="Finanzas">Finanzas</option>
                  <option value="Hogar">Hogar</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-brand-primary text-white py-3 rounded-full font-sans text-sm font-bold shadow-md hover:bg-brand-dark active:scale-95 transition-all"
                >
                  Crear Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
