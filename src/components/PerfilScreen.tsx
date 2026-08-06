import React, { useState, useRef, useEffect } from 'react';
import { Usuario, TareaDiaria, Familia } from '../types';
import CodeExporterScreen from './CodeExporterScreen';
import { Sparkles, User, Shield, Award, Flame, Code, Camera, CheckCircle2, Upload, Lock, Key, Eye, EyeOff, MessageSquarePlus, ExternalLink, X, Bell, BellRing, Check, AlertTriangle } from 'lucide-react';
import { auth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from '../lib/firebase';
import { getFamilyFeedbackFormUrl, subscribeFamilyFeedbackFormUrl } from '../services/googleWorkspace';
import { pushNotificationService, PushNotificationPayload } from '../services/pushNotificationService';

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
  const [activeTab, setActiveTab] = useState<'perfil' | 'codigo'>('perfil');
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop');
  const [nombre, setNombre] = useState<string>(currentUser?.nombre || '');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackFormUrl, setFeedbackFormUrl] = useState<string>(getFamilyFeedbackFormUrl());

  useEffect(() => {
    const unsub = subscribeFamilyFeedbackFormUrl((url) => {
      setFeedbackFormUrl(url);
    });
    return () => unsub();
  }, []);

  // Push Notifications State
  const [pushPermission, setPushPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [isActivatingPush, setIsActivatingPush] = useState(false);
  const [pushHistory, setPushHistory] = useState<PushNotificationPayload[]>(
    pushNotificationService.getNotificationHistory()
  );

  useEffect(() => {
    const unsub = pushNotificationService.subscribe(() => {
      setPushHistory([...pushNotificationService.getNotificationHistory()]);
    });
    return () => unsub();
  }, []);

  const handleEnablePush = async () => {
    setIsActivatingPush(true);
    try {
      const res = await pushNotificationService.requestPermissionAndGetToken(currentUser?.uid);
      if (res.success) {
        setPushPermission('granted');
        showToast("¡Notificaciones Push y FCM activadas correctamente! 🔔", "success");
      } else {
        showToast(res.error || "No se pudieron activar las notificaciones.", "error");
      }
    } catch (e: any) {
      showToast("Error al activar notificaciones push.", "error");
    } finally {
      setIsActivatingPush(false);
    }
  };

  const handleTestPushNotification = () => {
    const fakeTask: TareaDiaria = {
      tarea_id: `test_${Date.now()}`,
      usuario_id: currentUser?.uid || '',
      titulo: 'Prueba: Tarea Crítica & Notificación FCM',
      estado: 'pendiente',
      hora_programada: '12:00',
      tiempo_estimado_min: 15,
      es_critica: true,
      visible_familia: true,
      ultima_actualizacion: new Date().toISOString()
    };
    pushNotificationService.triggerTaskNotification(fakeTask, 'critical');
    showToast("¡Notificación push de prueba enviada! 🚨", "info");
  };

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const trimmedNombre = nombre.trim();
    if (!trimmedNombre) {
      showToast("El nombre no puede estar vacío.", "error");
      return;
    }
    if (trimmedNombre.length > 30) {
      showToast("El nombre no puede exceder los 30 caracteres (máximo 30).", "error");
      return;
    }

    setIsSavingProfile(true);
    try {
      await onUpdateUser({
        nombre: trimmedNombre,
        avatar_url: avatarUrl.trim() || currentUser.avatar_url
      });
      showToast("¡Nombre y perfil actualizados con éxito! 🎉", "success");
    } catch (e) {
      console.error("Error updating profile:", e);
      showToast("Error al guardar el perfil.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;

    if (!newPassword.trim()) {
      showToast("Ingresa la nueva contraseña.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Las contraseñas no coinciden.", "error");
      return;
    }

    setIsSavingPass(true);
    try {
      // 1. If Firebase Auth user is active, attempt update via Firebase Auth
      if (auth?.currentUser) {
        try {
          await updatePassword(auth.currentUser, newPassword);
        } catch (authErr: any) {
          if (authErr.code === 'auth/requires-recent-login' && currentPassword && auth.currentUser.email) {
            const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);
          }
        }
      }

      // 2. Call backend endpoint to handle persistent or simulated password update
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          currentPassword,
          newPassword
        })
      });

      if (res.ok) {
        showToast("¡Contraseña actualizada con éxito! 🔒", "success");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        showToast(data.error || "No se pudo actualizar la contraseña.", "error");
      }
    } catch (err: any) {
      console.error("Error changing password:", err);
      showToast(err.message || "Error al actualizar la contraseña.", "error");
    } finally {
      setIsSavingPass(false);
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
            <span>Perfil</span>
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
                  title="Cambiar foto de perfil"
                >
                  <Camera size={16} />
                </button>
              </div>

              {/* User Name & Family */}
              <h3 className="text-xl font-extrabold text-white mt-2">
                {nombre || currentUser?.nombre || 'Miembro Familiar'}
              </h3>
              <p className="text-xs text-indigo-300 font-medium mt-0.5">
                {currentUser?.email || 'email@familia.com'}
              </p>
              <p className="text-xs text-indigo-200/80 font-medium mt-1">
                Familia: <span className="font-bold text-amber-300">{activeFamily?.nombre || 'Núcleo Familiar'}</span>
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

            {/* QUICK GOOGLE FORM FEEDBACK BUTTON */}
            <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <MessageSquarePlus size={18} />
                </span>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Sugerencias y Comentarios</h4>
                  <p className="text-[10px] text-slate-500">Envía tus ideas para mejorar el núcleo familiar.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(true)}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Enviar Sugerencia (Google Form)</span>
                <ExternalLink size={14} />
              </button>
            </div>

            {/* FCM & WEB PUSH NOTIFICATIONS CARD */}
            <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <BellRing size={20} />
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Notificaciones Push & FCM</h4>
                    <p className="text-[10px] text-slate-500">Alertas en tiempo real para tareas críticas y recordatorios.</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                  pushPermission === 'granted'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {pushPermission === 'granted' ? <Check size={12} /> : <AlertTriangle size={12} />}
                  {pushPermission === 'granted' ? 'Activas' : 'Inactivas'}
                </span>
              </div>

              <div className="space-y-2">
                {pushPermission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    disabled={isActivatingPush}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Bell size={14} />
                    <span>{isActivatingPush ? 'Activando...' : 'Activar Notificaciones Push'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleTestPushNotification}
                    className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-2xl border border-amber-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <BellRing size={14} />
                    <span>Probar Notificación Push (Tarea Crítica)</span>
                  </button>
                )}
              </div>

              {pushHistory.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Historial Reciente ({pushHistory.length})</span>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {pushHistory.slice(0, 4).map((n) => (
                      <div key={n.id} className="p-2 bg-slate-50 rounded-xl border border-slate-150 text-[11px]">
                        <p className="font-extrabold text-slate-800">{n.title}</p>
                        <p className="text-[10px] text-slate-600 line-clamp-1">{n.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Edit Profile Name & Change Password Forms */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* CARD 1: Edit Profile Name & Avatar */}
            <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <User size={20} className="text-indigo-600" />
                  Cambiar Nombre y Foto
                </h3>
                <p className="text-xs text-slate-500">
                  Modifica tu nombre visible en la familia y actualiza tu foto de perfil.
                </p>
              </div>

              {/* Cambiar Nombre */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase">
                    Nombre de Usuario
                  </label>
                  <span className={`text-[10px] font-bold ${nombre.trim().length > 30 ? 'text-rose-600 font-extrabold' : 'text-slate-400'}`}>
                    {nombre.length}/30 caracteres
                  </span>
                </div>
                <input
                  type="text"
                  value={nombre}
                  maxLength={35}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ingresa tu nombre (máx 30 caracteres)..."
                  className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none transition-all ${
                    !nombre.trim() || nombre.trim().length > 30
                      ? 'border-rose-300 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-300 focus:border-indigo-500'
                  }`}
                />

                {/* Real-time Error Visual Message */}
                {!nombre.trim() && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <span className="text-rose-500 font-black">⚠️</span>
                    <span>El nombre no puede estar vacío.</span>
                  </div>
                )}
                {nombre.trim().length > 30 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <span className="text-rose-500 font-black">⚠️</span>
                    <span>El nombre no puede superar los 30 caracteres.</span>
                  </div>
                )}
              </div>

              {/* Upload Profile Photo */}
              <div className="space-y-2">
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

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border-2 border-dashed border-indigo-300 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer font-bold text-xs"
                >
                  <Upload size={22} className="text-indigo-600" />
                  <span>Subir foto desde tu dispositivo</span>
                  <span className="text-[10px] text-slate-500 font-normal">Formatos soportados: JPG, PNG, WEBP</span>
                </button>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile || !nombre.trim() || nombre.trim().length > 30}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg border-b-4 border-indigo-900 active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-indigo-600 disabled:hover:to-purple-600"
                >
                  <Sparkles size={18} />
                  <span>{isSavingProfile ? 'Guardando...' : 'Guardar Nombre y Foto'}</span>
                </button>
              </div>
            </form>

            {/* CARD 2: Cambiar Contraseña */}
            <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Lock size={20} className="text-indigo-600" />
                  Cambiar Contraseña
                </h3>
                <p className="text-xs text-slate-500">
                  Actualiza tu contraseña para mantener tu cuenta familiar protegida.
                </p>
              </div>

              {/* Contraseña Actual */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Escribe tu contraseña actual..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-4 pr-11 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Nueva Contraseña */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-4 pr-11 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nueva Contraseña */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu nueva contraseña..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Submit Password Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingPass}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-sm py-3.5 rounded-2xl shadow-md border-b-4 border-slate-950 active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Key size={18} className="text-amber-400" />
                  <span>{isSavingPass ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* TAB 2: DEVELOPER CODE EXPORTER (RESTRICTED TO ADMIN ONLY) */}
      {activeTab === 'codigo' && isAdmin && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <CodeExporterScreen />
        </div>
      )}

      {/* GOOGLE FORM FEEDBACK MODAL */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-indigo-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <MessageSquarePlus size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Feedback y Sugerencias de la Familia</h3>
                  <p className="text-[11px] text-purple-200">Formulario Oficial de Google Forms</p>
                </div>
              </div>
              <button
                onClick={() => setIsFeedbackModalOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body with embedded Google Form */}
            <div className="flex-1 p-4 bg-slate-50 overflow-hidden min-h-[420px]">
              <iframe
                src={feedbackFormUrl}
                title="Google Form Sugerencias"
                className="w-full h-full min-h-[400px] rounded-2xl border border-slate-200 bg-white"
                loading="lazy"
              >
                Cargando formulario de sugerencias...
              </iframe>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
              <a
                href={feedbackFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
              >
                <span>Abrir en Google Forms en nueva pestaña</span>
                <ExternalLink size={14} />
              </a>

              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
