import React, { useState } from 'react';
import { Usuario, Familia } from '../types';

interface FamilyNetworkScreenProps {
  usuarios: Usuario[];
  familias: Familia[];
  onSelectUser: (userId: string) => void;
}

export default function FamilyNetworkScreen({ usuarios, familias, onSelectUser }: FamilyNetworkScreenProps) {
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active'>('all');

  // Map database families with dynamic statistics
  const dynamicFamilies = familias.map((f) => {
    const members = usuarios.filter((u) => u.familia_id === f.familia_id);
    const totalPoints = members.reduce((sum, m) => sum + (m.puntos || 0), 0);
    const averageStreak = members.length > 0 ? Math.round(members.reduce((sum, m) => sum + (m.racha_actual || 0), 0) / members.length) : 0;
    
    return {
      ...f,
      members,
      totalPoints,
      averageStreak,
      status: members.length > 0 ? 'Active' : 'Inactive',
      avatarLetter: f.nombre ? f.nombre.charAt(0).toUpperCase() : 'F'
    };
  });

  const filtered = dynamicFamilies.filter((f) => {
    const matchesSearch = f.nombre.toLowerCase().includes(search.toLowerCase()) || f.codigo_invitacion.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.status === 'Active';
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Red Familiar</h1>
        <p className="font-sans text-sm text-gray-500">Resumen y gestión de todos los grupos familiares registrados en la base de datos.</p>
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
            Solo con Miembros
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-3xl border border-dashed border-indigo-100">
            <span className="material-symbols-outlined text-4xl text-gray-300">diversity_3</span>
            <p className="font-sans text-sm text-gray-400 mt-2">No se encontraron familias registradas.</p>
          </div>
        ) : (
          filtered.map((family) => (
            <div
              key={family.familia_id}
              className={`bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 flex flex-col relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}
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
                  <h3 className="font-sans text-base font-extrabold text-gray-900 leading-tight">{family.nombre}</h3>
                  <p className="font-sans text-[10px] text-gray-400 flex items-center gap-0.5 mt-1">
                    <span className="material-symbols-outlined text-xs font-bold">key</span>
                    <span>Código: {family.codigo_invitacion}</span>
                  </p>
                </div>
              </div>

              {/* Metrics (Inlaid) */}
              <div className="bg-slate-50/50 rounded-2xl p-3.5 flex justify-between items-center shadow-inner border border-indigo-50/40 mb-4">
                <div className="flex flex-col items-center flex-1 border-r border-slate-200">
                  <span className="font-sans text-lg font-extrabold text-brand-dark">{family.members.length}</span>
                  <span className="font-sans text-[8px] font-extrabold text-gray-400 uppercase tracking-wider mt-0.5">Miembros</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <span className="font-sans text-lg font-extrabold text-gray-700">{family.totalPoints}</span>
                  <span className="font-sans text-[8px] font-extrabold text-gray-400 uppercase tracking-wider mt-0.5">Puntos Col.</span>
                </div>
                <div className="flex flex-col items-center flex-1 border-l border-slate-200">
                  <span className="font-sans text-lg font-extrabold text-rose-600">{family.averageStreak}d</span>
                  <span className="font-sans text-[8px] font-extrabold text-gray-400 uppercase tracking-wider mt-0.5">Racha Prom.</span>
                </div>
              </div>

              {/* Members List inside Card */}
              <div className="space-y-2 mt-2">
                <p className="font-sans text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Miembros del núcleo:</p>
                {family.members.length === 0 ? (
                  <p className="font-sans text-[10px] text-gray-400 italic">No hay miembros en esta familia.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {family.members.map((member) => (
                      <button
                        key={member.uid}
                        onClick={() => onSelectUser(member.uid)}
                        className={`flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-150 rounded-full hover:bg-brand-light hover:border-brand-primary/30 transition-all text-left group/btn ${
                          member.estado === 'suspendido' ? 'opacity-50 line-through' : ''
                        }`}
                        title={member.estado === 'suspendido' ? 'Cuenta Suspendida' : `Ver perfil de ${member.nombre}`}
                      >
                        <img className="w-4 h-4 rounded-full object-cover" src={member.avatar_url} alt={member.nombre} referrerPolicy="no-referrer" />
                        <span className="font-sans text-[10px] font-bold text-gray-700 group-hover/btn:text-brand-dark">{member.nombre}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
