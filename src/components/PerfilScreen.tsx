import React, { useState, useRef } from 'react';
import { Usuario, TareaDiaria, Familia } from '../types';
import WidgetsScreen from './WidgetsScreen';
import CodeExporterScreen from './CodeExporterScreen';
import { Sparkles, User, Shield, Award, Flame, Code, Palette, Camera, CheckCircle2, Upload } from 'lucide-react';

interface PerfilScreenProps {
  currentUser: Usuario | null;
  usuarios: Usuario[];
  tareas: TareaDiaria[];
  familias: Familia[];
  isAdmin: boolean;
  onUpdateUser: (data: Partial<Usuario>) => Promise<void> | void;
  onToggleTask: (taskId: string) => void;
  onSnoozeTask?: (taskId: string, minutesToSnooze?: number) => Promise<void> | void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function PerfilScreen({
  currentUser,
  usuarios,
  tareas,
  familias,
  isAdmin,
  onUpdateUser,
  onToggleTask,
  onSnoozeTask,
  showToast
}: PerfilScreenProps) {
  const [activeTab, setActiveTab] = useState<'perfil' | 'widgets' | 'codigo'>('perfil');
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop');
  const [nombre, setNombre] = useState<string>(currentUser?.nombre || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFamily = familias.find(f => f.familia_id === currentUser?.familia_id);
  const userTasks = (tareas || []).filter(t => t.usuario_id === currentUser?.uid);
  const completedTasksCount = userTasks.filter(t => t.estado === 'completada').length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("La imagen es demasiado grande. Selecciona una menor a 5MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setAvatarUrl(reader.result as string);
          showToast("¡Foto de perfil cargada! Guarda los cambios para aplicar.", "info");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await onUpdateUser({
        nombre: nombre.trim() || currentUser.nombre,
        avatar_url: avatarUrl.trim() || currentUser.avatar_url
      });
      showToast("¡Perfil actualizado con éxito! 🎉", "success");
    } catch (e) {
      console.error("Error updating profile:", e);
      showToast("Error al guardar el perfil.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Top Header Navigation Tabs */}
      <div className="bg-white p-2 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer ${
              activeTab === 'perfil'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User size={16} />
            <span>Mi Perfil</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('widgets')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer ${
              activeTab === 'widgets'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Palette size={16} />
            <span>Mis Widgets & Temas</span>
          </button>

          {/* CODE EXPORTER - ONLY FOR ADMIN */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('codigo')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                activeTab === 'codigo'
                  ? 'bg-slate-900 text-amber-300 shadow-md border border-amber-400/40'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200'
              }`}
            >
              <Code size={16} />
              <span>Código Desarrollador (Admin)</span>
              <span className="bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0.5 rounded font-black">
                SOLO ADMIN
              </span>
            </button>
          )}
        </div>

        {/* Admin Badge Info */}
        {isAdmin && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 rounded-xl text-[10px] font-black text-amber-900">
            <Shield size={13} className="text-amber-600" />
            <span>MODO ADMINISTRADOR ACTIVO</span>
          </div>
        )}
      </div>

      {/* TAB 1: PERFIL */}
      {activeTab === 'perfil' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Profile Card Preview */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-500/30 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              
              {/* Badge Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-400" />
                  Nivel {Math.floor((currentUser?.puntos || 0) / 100) + 1}
                </span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                  {isAdmin ? '👑 Administrador' : '⭐ Miembro Activo'}
                </span>
              </div>

              {/* Photo Preview */}
              <div className="relative inline-block mx-auto my-3">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-800 border-4 border-indigo-500 shadow-xl">
                  <img
                    src={avatarUrl}
                    alt="Foto de Perfil"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-full shadow-lg border-2 border-slate-900 transition-transform hover:scale-110 cursor-pointer"
                  title="Subir foto"
                >
                  <Camera size={16} />
                </button>
              </div>

              {/* User Name & Level */}
              <h3 className="text-xl font-extrabold text-white mt-2">
                {nombre || currentUser?.nombre || 'Miembro Familiar'}
              </h3>
              <p className="text-xs text-indigo-300 font-medium">
                Familia: {activeFamily?.nombre || 'Núcleo Familiar'}
              </p>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 mt-6 bg-slate-900/80 p-3 rounded-2xl border border-indigo-800/40">
                <div>
                  <span className="text-[10px] text-indigo-300 font-bold uppercase block">Puntos</span>
                  <span className="text-sm font-black text-amber-400 flex items-center justify-center gap-0.5">
                    <Award size={14} /> {currentUser?.puntos || 0}
                  </span>
                </div>
                <div className="border-x border-indigo-800/40">
                  <span className="text-[10px] text-indigo-300 font-bold uppercase block">Racha</span>
                  <span className="text-sm font-black text-rose-400 flex items-center justify-center gap-0.5">
                    <Flame size={14} /> {currentUser?.racha_actual || 0}d
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-300 font-bold uppercase block">Completadas</span>
                  <span className="text-sm font-black text-emerald-400 flex items-center justify-center gap-0.5">
                    <CheckCircle2 size={14} /> {completedTasksCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Name & Photo Controls */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <User size={20} className="text-indigo-600" />
                Editar Perfil
              </h3>
              <p className="text-xs text-slate-500">
                Actualiza tu nombre de usuario y tu foto de perfil.
              </p>
            </div>

            {/* Edit Name */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase mb-2">
                Nombre de Usuario
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingresa tu nombre..."
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Upload Profile Photo */}
            <div className="space-y-3">
              <label className="block text-xs font-extrabold text-slate-700 uppercase">
                Foto de Perfil
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-2 border-dashed border-indigo-300 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer font-bold text-xs"
                >
                  <Upload size={24} className="text-indigo-600" />
                  <span>Subir foto desde mi dispositivo</span>
                  <span className="text-[10px] text-slate-500 font-normal">Soporta JPG, PNG, WEBP</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  O pega una URL de imagen
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://ejemplo.com/mi-foto.jpg"
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg border-b-4 border-indigo-900 active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={18} />
                <span>{isSaving ? 'Guardando...' : 'Guardar Cambios de Perfil'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WIDGETS INTEGRATION */}
      {activeTab === 'widgets' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <WidgetsScreen
            currentUser={currentUser}
            tareas={tareas}
            onToggleTask={onToggleTask}
            onSnoozeTask={onSnoozeTask}
            showToast={showToast}
          />
        </div>
      )}

      {/* TAB 3: DEVELOPER CODE EXPORTER (RESTRICTED TO ADMIN ONLY) */}
      {activeTab === 'codigo' && isAdmin && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <CodeExporterScreen />
        </div>
      )}
    </div>
  );
}
