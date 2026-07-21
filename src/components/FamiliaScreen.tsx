import React, { useState } from 'react';
import { Usuario, TareaDiaria } from '../types';

interface FamiliaScreenProps {
  usuarios: Usuario[];
  tareas: TareaDiaria[];
  onInviteClick: () => void;
  onUpdateUser: (uid: string, nombre: string, avatar_url: string) => Promise<void>;
}

const AVATAR_PRESETS = [
  { name: 'Gatito', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&h=150&fit=crop' },
  { name: 'Perrito', url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&h=150&fit=crop' },
  { name: 'Zorro', url: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=150&h=150&fit=crop' },
  { name: 'Astronauta', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop' },
  { name: 'Espacio', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=150&h=150&fit=crop' },
];

export default function FamiliaScreen({ usuarios, tareas, onInviteClick, onUpdateUser }: FamiliaScreenProps) {
  const familyMembers = usuarios.filter(u => u.familia_id === 'fam_garcia');

  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  const getMemberCompletion = (userId: string) => {
    const memberTasks = tareas.filter(t => t.usuario_id === userId);
    const total = memberTasks.length;
    if (total === 0) return 0;
    const completed = memberTasks.filter(t => t.estado === 'completada').length;
    return Math.round((completed / total) * 100);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    if (!editName.trim()) {
      alert("Por favor ingresa un nombre o alias válido.");
      return;
    }
    setSaving(true);
    try {
      await onUpdateUser(editingUser.uid, editName, editAvatar);
      setEditingUser(null);
    } catch (e) {
      console.error("Error updating profile", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Header */}
      <div className="text-center md:text-left">
        <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Familia</h2>
        <p className="font-sans text-sm text-gray-500">Mira cómo le va a cada miembro de tu equipo hoy, o edita sus perfiles.</p>
      </div>

      {/* Grid of Members */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {familyMembers.map((member) => {
          const completion = getMemberCompletion(member.uid);
          
          return (
            <div
              key={member.uid}
              className="flex flex-col items-center justify-center p-5 bg-white rounded-3xl border border-indigo-50/60 shadow-xl shadow-indigo-100/20 relative group cursor-pointer hover:shadow-md transition-all duration-300"
            >
              {/* Quick edit button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingUser(member);
                  setEditName(member.nombre);
                  setEditAvatar(member.avatar_url);
                }}
                className="absolute top-3 right-3 w-7 h-7 bg-white hover:bg-indigo-50 text-gray-400 hover:text-brand-primary border border-slate-100 rounded-full shadow-sm flex items-center justify-center transition-all duration-200"
                title="Editar alias y foto"
              >
                <span className="material-symbols-outlined text-xs font-bold">edit</span>
              </button>

              {/* Profile Image with Conic/Gradient Ring */}
              <div className="relative w-24 h-24 md:w-28 md:h-24 rounded-full p-[3px] bg-gradient-to-tr from-indigo-500 to-amber-400 mb-3">
                <div className="w-full h-full rounded-full bg-white p-[2px]">
                  <div className="w-full h-full rounded-full overflow-hidden border border-slate-100 bg-gray-50">
                    <img className="w-full h-full object-cover" src={member.avatar_url} alt={member.nombre} />
                  </div>
                </div>

                {/* Fire Streak Badge */}
                <div className="absolute -bottom-2 -right-1.5 bg-rose-500 text-white font-sans text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5 border border-white">
                  <span className="material-symbols-outlined text-xs font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                    local_fire_department
                  </span>
                  {member.racha_actual}
                </div>
              </div>

              <h3 className="font-sans text-base font-extrabold text-gray-900">{member.nombre}</h3>
              <p className="font-sans text-xs text-gray-500 mb-2">{member.uid === 'user_maria' ? 'Madre' : member.uid === 'user_leo' ? 'Explorador' : member.uid === 'user_mia' ? 'Estudiante' : 'Guía'}</p>

              {/* Completion Pill */}
              <div className="bg-slate-50 border border-slate-150 rounded-full px-3 py-1 flex items-center gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${completion === 100 ? 'bg-emerald-500' : completion > 50 ? 'bg-amber-400' : 'bg-gray-300'}`} />
                <span className="font-sans text-[10px] font-bold text-gray-700">{completion}% completado</span>
              </div>
            </div>
          );
        })}

        {/* Add Member / Invite Placeholder */}
        <div
          onClick={onInviteClick}
          className="flex flex-col items-center justify-center p-5 bg-slate-50/50 rounded-3xl border-2 border-dashed border-indigo-100/85 cursor-pointer hover:bg-white hover:border-brand-primary/40 hover:shadow-lg hover:shadow-indigo-100/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-brand-light flex items-center justify-center mb-3 text-brand-primary group-hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-xl font-bold">add</span>
          </div>
          <h3 className="font-sans text-base font-bold text-gray-500 group-hover:text-brand-primary">Invitar</h3>
          <p className="font-sans text-[10px] text-gray-400 text-center mt-1">Añade un nuevo miembro</p>
        </div>
      </div>

      {/* Activity Summary / Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 space-y-4">
          <h3 className="font-sans text-base font-extrabold text-gray-900">Ambiente Familiar</h3>
          <div className="flex items-center gap-3 bg-brand-light/30 border border-indigo-100/50 rounded-xl p-4">
            <span className="material-symbols-outlined text-brand-primary text-2xl font-bold">mood</span>
            <p className="font-sans text-sm text-brand-dark font-medium leading-relaxed">
              ¡Todos están cooperando hoy de maravilla! La tasa general de tareas va viento en popa con racha colectiva activa.
            </p>
          </div>
        </div>

        <div className="bg-rose-50/30 border border-rose-100/50 rounded-3xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <span className="font-serif absolute -top-3 -right-3 text-7xl text-rose-900/5 select-none font-bold">“</span>
          <p className="font-sans text-sm text-rose-900 font-semibold italic relative z-10 leading-relaxed">
            "¡En equipo todo es posible!"
          </p>
          <p className="font-sans text-[10px] text-rose-800 tracking-wider font-extrabold mt-4 relative z-10">
            - LEMA DIARIO
          </p>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-indigo-50 shadow-2xl p-6 md:p-8 w-full max-w-md space-y-6 animate-scale-up text-left">
            <div>
              <h3 className="font-sans text-xl font-extrabold text-gray-900 tracking-tight">Editar Perfil</h3>
              <p className="font-sans text-xs text-gray-500 mt-1">
                Personaliza el alias y la foto de perfil para <span className="font-bold text-brand-primary">{editingUser.nombre}</span>.
              </p>
            </div>

            <div className="space-y-4">
              {/* Name field */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Alias o Nombre
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ej. Súper Mamá, Leo, etc."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none"
                  required
                />
              </div>

              {/* Avatar options */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Elegir foto de perfil (Pre-establecidos)
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setEditAvatar(preset.url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all p-0.5 ${
                        editAvatar === preset.url ? 'border-brand-primary scale-105 shadow-md shadow-indigo-100' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      title={preset.name}
                    >
                      <img className="w-full h-full object-cover rounded-lg" src={preset.url} alt={preset.name} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom URL Input */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  O pega una URL de imagen personalizada
                </label>
                <input
                  type="url"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://ejemplo.com/foto.jpg"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                disabled={saving}
                className="flex-1 py-3 rounded-full border border-slate-200 hover:bg-slate-50 font-bold text-xs text-gray-600 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-full bg-brand-primary hover:bg-brand-dark text-white font-bold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
