import React, { useState } from 'react';
import { Usuario, Familia, TareaDiaria, Meta } from '../types';

interface AdminPanelDashboardProps {
  usuarios: Usuario[];
  familias: Familia[];
  tareas: TareaDiaria[];
  metas?: Meta[];
  onSelectUser: (userId: string) => void;
  onOpenGeminiAdvisor?: () => void;
}

export default function AdminPanelDashboard({ usuarios, familias, tareas, metas = [], onSelectUser, onOpenGeminiAdvisor }: AdminPanelDashboardProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [exported, setExported] = useState<boolean>(false);

  const totalUsuarios = usuarios.length;
  const totalFamilias = familias.length;
  const tareasCompletadasHoy = tareas.filter(t => t.estado === 'completada').length;
  const totalTareasHoy = tareas.length;
  const porcentajeTareasHoy = totalTareasHoy > 0 ? Math.round((tareasCompletadasHoy / totalTareasHoy) * 100) : 0;

  const handleExportWeeklySummaryJSON = () => {
    const exportData = {
      fecha_exportacion: new Date().toISOString(),
      periodo: "Resumen Semanal de Actividad Familiar",
      metricas_generales: {
        total_familias: totalFamilias,
        total_usuarios: totalUsuarios,
        total_tareas: totalTareasHoy,
        tareas_completadas: tareasCompletadasHoy,
        tasa_cumplimiento_porcentaje: porcentajeTareasHoy,
        total_metas: metas.length
      },
      resumen_por_familia: dynamicFamilies.map(f => ({
        familia_id: f.familia_id,
        nombre: f.name,
        miembros_count: f.members.length,
        tasa_cumplimiento: `${f.progress}%`,
        miembros: f.members.map(m => ({
          uid: m.uid,
          nombre: m.nombre,
          puntos: m.puntos || 0,
          racha_actual: m.racha_actual || 0
        }))
      })),
      desglose_metas: metas.map(m => ({
        id: m.meta_id,
        titulo: m.titulo,
        categoria: m.categoria,
        usuario_id: m.usuario_id,
        fecha_limite: m.fecha_limite
      })),
      desglose_tareas: tareas.map(t => ({
        id: t.tarea_id,
        titulo: t.titulo,
        categoria: t.categoria || 'Otros',
        estado: t.estado,
        es_prioridad_alta: !!t.es_prioridad_alta,
        usuario_id: t.usuario_id
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen_semanal_actividad_familiar_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const summaryCards = [
    { 
      title: 'Total de Familias', 
      value: totalFamilias.toLocaleString(), 
      trend: undefined, 
      icon: 'group', 
      color: 'text-brand-dark bg-brand-light' 
    },
    { 
      title: 'Usuarios Activos', 
      value: totalUsuarios.toLocaleString(), 
      trend: undefined, 
      icon: 'person', 
      color: 'text-rose-700 bg-rose-50' 
    },
    { 
      title: 'Tareas Completadas', 
      value: `${tareasCompletadasHoy} / ${totalTareasHoy}`, 
      progress: porcentajeTareasHoy, 
      icon: 'task_alt', 
      color: 'text-purple-700 bg-purple-50' 
    }
  ];

  const dynamicFamilies = familias.map((f) => {
    const members = usuarios.filter((u) => u.familia_id === f.familia_id);
    const memberUids = members.map(m => m.uid);
    const familyTasks = tareas.filter(t => memberUids.includes(t.usuario_id));
    const totalFamilyTasks = familyTasks.length;
    const completedFamilyTasks = familyTasks.filter(t => t.estado === 'completada').length;
    const progress = totalFamilyTasks > 0 ? Math.round((completedFamilyTasks / totalFamilyTasks) * 100) : 0;

    return {
      familia_id: f.familia_id,
      name: f.nombre || 'Sin Nombre',
      avatarLetter: f.nombre ? f.nombre.charAt(0).toUpperCase() : 'F',
      created: `Código: ${f.codigo_invitacion || 'N/A'}`,
      membersAvatars: members.map(m => m.avatar_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop"),
      progress: progress,
      color: progress > 75 ? 'bg-emerald-500' : progress > 40 ? 'bg-brand-primary' : 'bg-rose-500',
      members
    };
  });

  const filteredFamilies = dynamicFamilies.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <section className="bg-brand-primary text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-sans text-xl md:text-2xl font-extrabold">Vista General del Administrador</h2>
          <p className="font-sans text-xs text-indigo-100 mt-1">Visión unificada y analíticas de la red real en tiempo real.</p>
        </div>

        {/* Actions group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenGeminiAdvisor && (
            <button
              onClick={onOpenGeminiAdvisor}
              className="px-4 py-2.5 rounded-2xl font-sans text-xs font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-900 shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-amber-300"
            >
              <span className="material-symbols-outlined text-base font-bold text-slate-900">auto_awesome</span>
              <span>Asistente Gemini IA (General)</span>
            </button>
          )}

          {/* Export JSON Button */}
          <button
            onClick={handleExportWeeklySummaryJSON}
            className={`px-4 py-2.5 rounded-2xl font-sans text-xs font-bold border flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer ${
              exported
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'bg-white text-brand-primary hover:bg-slate-50 border-white/20'
            }`}
          >
            <span className="material-symbols-outlined text-base font-bold">
              {exported ? 'check_circle' : 'download'}
            </span>
            <span>{exported ? '¡Resumen Exportado!' : 'Exportar Resumen (JSON)'}</span>
          </button>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaryCards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
              <span className="font-sans text-xs font-bold text-gray-500 uppercase tracking-wider">{card.title}</span>
              <span className={`material-symbols-outlined p-2 rounded-xl text-lg font-bold ${card.color}`}>
                {card.icon}
              </span>
            </div>
            <div className="mt-4">
              <span className="font-sans text-3xl font-extrabold text-gray-900">{card.value}</span>
              {card.progress !== undefined && (
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                  <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${card.progress}%` }}></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Search and Filter */}
      <section className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80 rounded-full border border-indigo-50 bg-white overflow-hidden shadow-inner px-4 py-2.5 flex items-center">
          <span className="material-symbols-outlined text-gray-400 text-lg mr-2 font-bold">search</span>
          <input
            type="text"
            placeholder="Buscar familias..."
            className="w-full bg-transparent border-none text-xs focus:ring-0 focus:outline-none placeholder:text-gray-400 outline-none text-gray-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* Recent Families Table */}
      <section className="bg-white rounded-3xl border border-indigo-50/60 shadow-xl shadow-indigo-100/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-indigo-50 bg-slate-50/50">
          <h3 className="font-sans text-sm font-extrabold text-gray-900 uppercase tracking-wider">Familias Registradas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-indigo-50 font-sans text-[10px] font-bold text-gray-400 bg-slate-50/30 uppercase tracking-wider">
                <th className="py-4 px-6">Nombre de la Familia</th>
                <th className="py-4 px-6">Miembros</th>
                <th className="py-4 px-6">Progreso de Tareas Diarias</th>
              </tr>
            </thead>
            <tbody className="font-sans text-xs text-gray-700">
              {filteredFamilies.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-gray-400 font-sans italic">
                    No se encontraron familias registradas.
                  </td>
                </tr>
              ) : (
                filteredFamilies.map((family, idx) => (
                  <tr key={family.familia_id || idx} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-brand-light text-brand-dark font-extrabold flex items-center justify-center">
                          {family.avatarLetter}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{family.name}</p>
                          <p className="text-[10px] text-gray-400">{family.created}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5">
                        {family.members.length === 0 ? (
                          <span className="text-[10px] text-gray-400 italic">Sin miembros</span>
                        ) : (
                          family.members.map((member) => (
                            <button
                              key={member.uid}
                              onClick={() => onSelectUser(member.uid)}
                              className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 border border-slate-150 rounded-full transition-all"
                              title={`Ver perfil de ${member.nombre}`}
                            >
                              <img
                                className="w-4 h-4 rounded-full object-cover"
                                src={member.avatar_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop"}
                                alt="Member"
                              />
                              <span className="text-[10px] font-bold text-gray-700">{member.nombre}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${family.color}`} style={{ width: `${family.progress}%` }}></div>
                        </div>
                        <span className="font-bold text-gray-900">{family.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
