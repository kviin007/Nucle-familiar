/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ViewType, Usuario, TareaDiaria, Meta, DiarioEntrada } from './types';
import OnboardingScreen from './components/OnboardingScreen';
import HoyScreen from './components/HoyScreen';
import MetasScreen from './components/MetasScreen';
import FamiliaScreen from './components/FamiliaScreen';
import DiarioScreen from './components/DiarioScreen';
import JuegosScreen from './components/JuegosScreen';
import AdminPanelDashboard from './components/AdminPanelDashboard';
import FamilyNetworkScreen from './components/FamilyNetworkScreen';
import AssignTaskScreen from './components/AssignTaskScreen';
import UserDetailScreen from './components/UserDetailScreen';
import CodeExporterScreen from './components/CodeExporterScreen';
import FocusModeOverlay from './components/FocusModeOverlay';

export default function App() {
  const [view, setView] = useState<ViewType>('onboarding');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tareas, setTareas] = useState<TareaDiaria[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [diario, setDiario] = useState<DiarioEntrada[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [focusedTask, setFocusedTask] = useState<TareaDiaria | null>(null);

  // Fetch full synchronized state from backend Express API
  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data.usuarios || []);
        setTareas(data.tareas || []);
        setMetas(data.metas || []);
        setDiario(data.diario || []);
      }
    } catch (e) {
      console.error("Error fetching synced state", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Sync actions with Express backend
  const handleToggleTask = async (taskId: string) => {
    try {
      const res = await fetch('/api/tasks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarea_id: taskId }),
      });
      if (res.ok) {
        await fetchState(); // fetch updated state
      }
    } catch (e) {
      console.error("Error toggling task", e);
    }
  };

  const handleTaskClick = async (taskId: string) => {
    const task = tareas.find(t => t.tarea_id === taskId);
    if (!task) return;

    if (task.estado === 'completada') {
      // Toggle back to pending
      await handleToggleTask(taskId);
    } else if (task.estado === 'en_progreso') {
      // Already in progress, open focus mode immediately
      setFocusedTask(task);
    } else {
      // Is 'pendiente' or 'vencido'.
      // 1. Move to 'en_progreso' on server
      await handleToggleTask(taskId);
      // 2. Open focus mode overlay. We pass the updated state as 'en_progreso'
      setFocusedTask({ ...task, estado: 'en_progreso' });
    }
  };

  const handleCompleteFocusTask = async (taskId: string) => {
    // Transition from 'en_progreso' to 'completada'
    await handleToggleTask(taskId);
    setFocusedTask(null);
  };

  const handleAddTask = async (titulo: string, userId: string, scheduledTime: string, estimatedTime: number, visible: boolean) => {
    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          usuario_id: userId,
          hora_programada: scheduledTime,
          tiempo_estimado_min: estimatedTime,
          visible_familia: visible
        }),
      });
      if (res.ok) {
        fetchState();
      }
    } catch (e) {
      console.error("Error creating task", e);
    }
  };

  const handleAddGoal = async (titulo: string, categoria: Meta['categoria']) => {
    try {
      const res = await fetch('/api/goals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          categoria,
          usuario_id: 'user_leo' // default assignment for demo
        }),
      });
      if (res.ok) {
        fetchState();
      }
    } catch (e) {
      console.error("Error creating goal", e);
    }
  };

  const handleAddDiaryEntry = async (texto: string, emocion: DiarioEntrada['emocion'], visible_familia: boolean) => {
    try {
      const res = await fetch('/api/journal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto,
          emocion,
          visible_familia,
          usuario_id: 'user_maria'
        }),
      });
      if (res.ok) {
        fetchState();
      }
    } catch (e) {
      console.error("Error creating diary entry", e);
    }
  };

  const handleUpdateUser = async (uid: string, nombre: string, avatar_url: string) => {
    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, nombre, avatar_url }),
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (e) {
      console.error("Error updating user profile", e);
    }
  };

  const handleResetDatabase = async () => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        fetchState();
        alert("¡Base de datos sincronizada con el estado inicial!");
      }
    } catch (e) {
      console.error("Error resetting state", e);
    }
  };

  if (view === 'onboarding') {
    return <OnboardingScreen onComplete={(nextView) => setView(nextView)} />;
  }

  // Pre-login screen mimicking Google Sign-In
  if (view === 'login') {
    return (
      <div className="bg-[#F7F9FC] min-h-screen flex items-center justify-center p-4 animate-fade-in">
        <main className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-xl shadow-indigo-100/50 border border-indigo-50/80 flex flex-col justify-between">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-primary rounded-[22px] flex items-center justify-center text-white shadow-lg shadow-indigo-200/50 mx-auto mb-4 animate-pulse">
              <span className="material-symbols-outlined text-3xl font-bold">diversity_3</span>
            </div>
            <h1 className="font-sans text-3xl font-extrabold text-brand-dark mb-2">Bienvenido de nuevo</h1>
            <p className="font-sans text-sm text-gray-500">Continuemos construyendo juntos.</p>
          </div>

          <div className="space-y-6">
            {/* Google SSO Button */}
            <button
              onClick={() => setView('hoy')}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white text-gray-700 font-sans text-xs font-bold rounded-2xl shadow-sm hover:bg-indigo-50/50 hover:border-brand-primary/45 active:scale-95 transition-all border border-gray-200"
              type="button"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
              </svg>
              <span>Iniciar sesión con Google</span>
            </button>
            <p className="text-center font-sans text-xs text-gray-400">Solo el inicio de sesión de Google está habilitado para los miembros de la familia.</p>
          </div>
        </main>
      </div>
    );
  }

  // Common Header and sidebar navigation layout
  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col md:flex-row text-gray-800">
      {/* Sidebar navigation drawer (Desktop) */}
      <nav className="hidden md:flex flex-col w-64 bg-white border-r border-indigo-50 h-screen fixed left-0 top-0 py-6 px-4 z-40 shadow-sm">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-brand-light flex items-center justify-center border-2 border-brand-primary shadow-md shadow-indigo-100">
            <span className="material-symbols-outlined text-brand-dark font-bold">diversity_3</span>
          </div>
          <div>
            <h2 className="font-sans text-lg font-extrabold text-brand-dark tracking-tight">Núcleo Familiar</h2>
            <p className="font-sans text-[10px] text-brand-primary font-bold uppercase tracking-wider">Centro Familiar</p>
          </div>
        </div>

        {/* Primary View Selectors */}
        <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto no-scrollbar">
          <p className="font-sans text-[9px] font-extrabold text-gray-400 uppercase tracking-widest px-2.5 mb-2">ZONA FAMILIAR</p>
          {[
            { id: 'hoy', label: 'Hoy', icon: 'home' },
            { id: 'metas', label: 'Metas', icon: 'target' },
            { id: 'familia', label: 'Familia', icon: 'group' },
            { id: 'diario', label: 'Diario', icon: 'menu_book' },
            { id: 'juegos', label: 'Juegos', icon: 'sports_esports' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewType)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-sans text-xs font-bold transition-all text-left ${
                view === item.id
                  ? 'bg-brand-light text-brand-dark shadow-sm'
                  : 'text-gray-500 hover:bg-slate-50 hover:text-brand-dark'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          <div className="h-px bg-slate-100 my-4" />

          <p className="font-sans text-[9px] font-extrabold text-gray-400 uppercase tracking-widest px-2.5 mb-2">PANEL DE CONTROL</p>
          {[
            { id: 'admin-dashboard', label: 'Panel de Administración', icon: 'dashboard' },
            { id: 'admin-families', label: 'Red Familiar', icon: 'hub' },
            { id: 'admin-assign-task', label: 'Asignar Tarea', icon: 'add_task' },
            { id: 'admin-user-detail', label: 'Detalle de Usuario', icon: 'badge' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewType)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-sans text-xs font-bold transition-all text-left ${
                view === item.id
                  ? 'bg-amber-50 text-brand-accent shadow-sm'
                  : 'text-gray-500 hover:bg-slate-50 hover:text-brand-accent'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          <div className="h-px bg-slate-100 my-4" />

          {/* Dev Code Exporter */}
          <button
            key="code-exporter"
            onClick={() => setView('code-exporter')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-sans text-xs font-bold transition-all text-left ${
              view === 'code-exporter'
                ? 'bg-slate-100 text-slate-800 shadow-sm font-extrabold'
                : 'text-gray-500 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-lg">code</span>
            <span>Código de Desarrollador</span>
          </button>
        </div>

        {/* Footer actions */}
        <div className="mt-auto px-2 pt-4">
          <button
            onClick={handleResetDatabase}
            className="w-full py-2.5 bg-brand-light hover:bg-indigo-100/80 text-brand-dark font-sans text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
          >
            Sincronizar Estado
          </button>
          <p className="text-center font-sans text-[10px] text-gray-400 mt-2 font-semibold">v1.0.2 • Núcleo Familiar</p>
        </div>
      </nav>

      {/* Mobile Top App Bar */}
      <header className="md:hidden flex justify-between items-center px-4 py-3 bg-white border-b border-indigo-50 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-brand-light flex items-center justify-center border border-brand-primary">
            <span className="material-symbols-outlined text-brand-dark text-base font-bold">diversity_3</span>
          </div>
          <h1 className="font-sans text-base font-extrabold text-brand-dark">Núcleo Familiar</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick sync */}
          <button
            onClick={handleResetDatabase}
            className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-gray-500 hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-50">
            <img
              className="w-full h-full object-cover"
              src={usuarios.find(u => u.uid === 'user_maria')?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuDOMJAP3t5bp1oJYXlFGQBDX_NAoqRTgAJ8zftLuakcfkO0VctxmpjH4gTDBS6EocoQN4hhf3tYKnGCgfuTHbMuHl8WasVFEnyrEcTRrK8p1Cjb0EHyT2mYTxWiENN1obGn22tkzCznaRmQ6-mytpjFN94bMgci4Ex74C2E086_0Tpu_cEW9AN_6d0HZDuHPLGYOJlytMfcnBYVKKaAGdcTObLbJkgP7Zi6FuUWC9HIwMdnL0QT33S1gmIQA8hBwDdLm_b4fr8BGxM"}
              alt="Avatar"
            />
          </div>
        </div>
      </header>

      {/* Main Content scroll area */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[500px] gap-2">
            <div className="w-8 h-8 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
            <p className="font-sans text-xs text-gray-400 font-bold uppercase tracking-wider">Sincronizando estado...</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            {view === 'hoy' && (
              <HoyScreen
                usuarios={usuarios}
                tareas={tareas}
                metas={metas}
                onToggleTask={handleTaskClick}
                onAddTaskClick={() => setView('admin-assign-task')}
              />
            )}
            {view === 'metas' && (
              <MetasScreen metas={metas} usuarios={usuarios} onAddGoal={handleAddGoal} />
            )}
            {view === 'familia' && (
              <FamiliaScreen 
                usuarios={usuarios} 
                tareas={tareas} 
                onInviteClick={() => alert('¡Código de invitación copiado!')} 
                onUpdateUser={handleUpdateUser}
              />
            )}
            {view === 'diario' && (
              <DiarioScreen diario={diario} usuarios={usuarios} onAddEntry={handleAddDiaryEntry} />
            )}
            {view === 'juegos' && <JuegosScreen />}
            {view === 'admin-dashboard' && <AdminPanelDashboard />}
            {view === 'admin-families' && <FamilyNetworkScreen />}
            {view === 'admin-assign-task' && (
              <AssignTaskScreen usuarios={usuarios} onAddTask={handleAddTask} />
            )}
            {view === 'admin-user-detail' && (
              <UserDetailScreen usuarios={usuarios} tareas={tareas} onAddTaskClick={() => setView('admin-assign-task')} onBack={() => setView('admin-families')} />
            )}
            {view === 'code-exporter' && <CodeExporterScreen />}
          </div>
        )}
      </main>

      {/* Focus Mode Overlay when active */}
      {focusedTask && (
        <FocusModeOverlay 
          task={focusedTask} 
          onClose={() => setFocusedTask(null)} 
          onComplete={handleCompleteFocusTask} 
        />
      )}

      {/* Mobile Bottom Navigation (Visible only on mobile screen widths) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-indigo-50 py-2.5 px-2 flex justify-around items-center z-40 shadow-md">
        {[
          { id: 'hoy', label: 'Hoy', icon: 'home' },
          { id: 'metas', label: 'Metas', icon: 'target' },
          { id: 'familia', label: 'Familia', icon: 'group' },
          { id: 'diario', label: 'Diario', icon: 'menu_book' },
          { id: 'admin-dashboard', label: 'Admin', icon: 'dashboard' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as ViewType)}
            className={`flex flex-col items-center justify-center w-14 transition-all ${
              view === item.id || (item.id === 'admin-dashboard' && view.startsWith('admin-'))
                ? 'text-brand-primary font-bold scale-105'
                : 'text-gray-400 hover:text-brand-primary/85'
            }`}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            <span className="font-sans text-[9px] uppercase tracking-wider mt-1">{item.label}</span>
          </button>
        ))}
        {/* Toggle link for Code */}
        <button
          onClick={() => setView('code-exporter')}
          className={`flex flex-col items-center justify-center w-14 transition-all ${
            view === 'code-exporter' ? 'text-brand-primary font-bold' : 'text-gray-400 hover:text-brand-primary/85'
          }`}
        >
          <span className="material-symbols-outlined text-xl">code</span>
          <span className="font-sans text-[9px] uppercase tracking-wider mt-1">Código</span>
        </button>
      </nav>
    </div>
  );
}
