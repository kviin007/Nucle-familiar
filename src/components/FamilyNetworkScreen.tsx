import React, { useState } from 'react';

interface FamilyCard {
  name: string;
  code: string;
  members: number;
  goals: number;
  activity: string;
  status: 'Active' | 'Inactive';
  created: string;
  avatarLetter: string;
}

export default function FamilyNetworkScreen() {
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created'>('name');

  const families: FamilyCard[] = [
    { name: 'Familia Martínez', code: 'Código: NUCL-M82X', members: 5, goals: 12, activity: '89%', status: 'Active', created: 'Creado: 12 Oct 2023', avatarLetter: 'M' },
    { name: 'Hogar García', code: 'Código: NUCL-G44P', members: 3, goals: 8, activity: '65%', status: 'Active', created: 'Creado: 02 Nov 2023', avatarLetter: 'G' },
    { name: 'Familia Smith', code: 'Código: NUCL-S91K', members: 4, goals: 0, activity: '0%', status: 'Inactive', created: 'Creado: 15 Ene 2024', avatarLetter: 'S' }
  ];

  const filtered = families
    .filter((f) => {
      const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.code.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || f.status === 'Active';
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return a.created.localeCompare(b.created);
      }
    });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Red Familiar</h1>
        <p className="font-sans text-sm text-gray-500">Resumen y gestión de todos los grupos familiares registrados.</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="w-full md:w-80 relative flex items-center bg-slate-50 border border-indigo-50 rounded-xl px-4 py-2.5 shadow-inner">
          <span className="material-symbols-outlined text-gray-400 text-lg mr-2 font-bold">search</span>
          <input
            type="text"
            className="w-full bg-transparent border-none text-xs focus:ring-0 focus:outline-none placeholder:text-gray-400 text-gray-800 outline-none"
            placeholder="Buscar familias por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button 
            onClick={() => setStatusFilter('all')}
            className={`flex items-center gap-1 px-4 py-2 rounded-full font-sans text-xs font-bold whitespace-nowrap active:scale-95 transition-all ${
              statusFilter === 'all' ? 'bg-brand-primary text-white' : 'bg-slate-100 text-gray-500 hover:bg-slate-200'
            }`}
          >
            Todas las Familias
          </button>
          <button 
            onClick={() => setStatusFilter('active')}
            className={`flex items-center gap-1 px-4 py-2 rounded-full font-sans text-xs font-bold whitespace-nowrap active:scale-95 transition-all ${
              statusFilter === 'active' ? 'bg-brand-primary text-white' : 'bg-slate-100 text-gray-500 hover:bg-slate-200'
            }`}
          >
            Solo Activas
          </button>
          <button 
            onClick={() => setSortBy(sortBy === 'name' ? 'created' : 'name')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-sans text-xs font-bold whitespace-nowrap active:scale-95 transition-all ${
              sortBy === 'created' ? 'bg-[#6366F1] text-white' : 'bg-slate-100 text-gray-500 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm font-bold">calendar_today</span>
            {sortBy === 'created' ? 'Orden: Creación' : 'Orden: Alfabético'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((family, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 flex flex-col relative overflow-hidden group transition-all duration-300 ${
              family.status === 'Inactive' ? 'opacity-70 grayscale-[20%]' : 'hover:-translate-y-1 hover:shadow-md'
            }`}
          >
            {/* Status indicator */}
            <div className={`absolute top-4 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
              family.status === 'Active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-slate-100 text-gray-500 border-slate-200'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${family.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              <span>{family.status === 'Active' ? 'Activo' : 'Inactivo'}</span>
            </div>

            {/* Header info */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-light text-brand-dark flex items-center justify-center font-sans text-lg font-bold">
                {family.avatarLetter}
              </div>
              <div>
                <h3 className="font-sans text-base font-extrabold text-gray-900 leading-tight">{family.name}</h3>
                <p className="font-sans text-xs text-gray-400 flex items-center gap-0.5 mt-1">
                  <span className="material-symbols-outlined text-xs font-bold">key</span>
                  {family.code}
                </p>
              </div>
            </div>

            {/* Metrics (Inlaid) */}
            <div className="bg-slate-50/50 rounded-2xl p-3.5 flex justify-between items-center shadow-inner border border-indigo-50/40 mb-4">
              <div className="flex flex-col items-center flex-1 border-r border-slate-200">
                <span className="font-sans text-lg font-extrabold text-brand-dark">{family.members}</span>
                <span className="font-sans text-[8px] font-extrabold text-gray-400 uppercase tracking-wider mt-0.5">Miembros</span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <span className="font-sans text-lg font-extrabold text-gray-700">{family.goals}</span>
                <span className="font-sans text-[8px] font-extrabold text-gray-400 uppercase tracking-wider mt-0.5">Metas</span>
              </div>
              <div className="flex flex-col items-center flex-1 border-l border-slate-200">
                <span className="font-sans text-lg font-extrabold text-rose-600">{family.activity}</span>
                <span className="font-sans text-[8px] font-extrabold text-gray-400 uppercase tracking-wider mt-0.5">Actividad</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-medium">
              <span>{family.created}</span>
              <button className="text-gray-400 hover:text-gray-900 p-1 rounded-full hover:bg-gray-150 transition-colors">
                <span className="material-symbols-outlined text-base font-bold">more_vert</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
