import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ViewType, Usuario, TareaDiaria, Meta, DiarioEntrada, Familia, ConsecuenciaPlantilla, RecompensaPlantilla, ConsecuenciaPendiente, DesbloqueoUsuario, ConfigTareaCritica } from './types';
import OnboardingScreen, { OnboardingData } from './components/OnboardingScreen';
import HoyScreen from './components/HoyScreen';
import MetasScreen from './components/MetasScreen';
import FamiliaScreen from './components/FamiliaScreen';
import DiarioScreen from './components/DiarioScreen';
import IdeasScreen from './components/IdeasScreen';
import WidgetsScreen from './components/WidgetsScreen';
import JuegosScreen from './components/JuegosScreen';
import AdminPanelDashboard from './components/AdminPanelDashboard';
import FamilyNetworkScreen from './components/FamilyNetworkScreen';
import AssignTaskScreen from './components/AssignTaskScreen';
import UserDetailScreen from './components/UserDetailScreen';
import CodeExporterScreen from './components/CodeExporterScreen';
import PerfilScreen from './components/PerfilScreen';
import FocusModeOverlay from './components/FocusModeOverlay';
import LiveActivityBanner from './components/LiveActivityBanner';
import GeminiAdvisorModal from './components/GeminiAdvisorModal';

// Import Firebase Authentication and Firestore if available
import { 
  auth, 
  firestore,
  isFirebaseEnabled,
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  getIdTokenResult,
  collection,
  doc,
  setDoc,
  query,
  where,
  onSnapshot
} from './lib/firebase';

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onRetry?: () => void;
}

export default function App() {
  const [view, setView] = useState<ViewType | 'family_onboarding'>('onboarding');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tareas, setTareas] = useState<TareaDiaria[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [diario, setDiario] = useState<DiarioEntrada[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [consecuenciasPlantillas, setConsecuenciasPlantillas] = useState<ConsecuenciaPlantilla[]>([]);
  const [recompensasPlantillas, setRecompensasPlantillas] = useState<RecompensaPlantilla[]>([]);
  const [consecuenciasPendientes, setConsecuenciasPendientes] = useState<ConsecuenciaPendiente[]>([]);
  const [desbloqueosUsuarios, setDesbloqueosUsuarios] = useState<DesbloqueoUsuario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [focusedTask, setFocusedTask] = useState<TareaDiaria | null>(null);
  const [isGeminiAdvisorOpen, setIsGeminiAdvisorOpen] = useState<boolean>(false);

  // Toast System
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', onRetry?: () => void) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type, onRetry }]);
    if (type !== 'error') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pendingOnboardingData, setPendingOnboardingData] = useState<OnboardingData | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Email and password login states
  const [loginMethod, setLoginMethod] = useState<'google' | 'email'>('email');
  const [loginEmail, setLoginEmail] = useState<string>('kevin@familia.com');
  const [loginPassword, setLoginPassword] = useState<string>('123456');

  // Real-time Firestore Listeners (onSnapshot)
  useEffect(() => {
    if (!firestore || !currentUser?.familia_id) return;

    const famId = currentUser.familia_id;

    // Real-time listener for tasks (filtered by familia_id)
    const qTareas = query(collection(firestore, "tareas_diarias"), where("familia_id", "==", famId));
    const unsubTareas = onSnapshot(qTareas, (snap) => {
      const list: TareaDiaria[] = [];
      snap.forEach(d => list.push({ tarea_id: d.id, ...d.data() } as TareaDiaria));
      setTareas(list);
    }, (err) => {
      console.warn("Sync tareas warning:", err);
    });

    // Real-time listener for goals (filtered by familia_id)
    const qMetas = query(collection(firestore, "metas"), where("familia_id", "==", famId));
    const unsubMetas = onSnapshot(qMetas, (snap) => {
      const list: Meta[] = [];
      snap.forEach(d => list.push({ meta_id: d.id, ...d.data() } as Meta));
      setMetas(list);
    }, (err) => {
      console.warn("Sync metas warning:", err);
    });

    // Real-time listener for family members (filtered by familia_id)
    const qUsuarios = query(collection(firestore, "usuarios"), where("familia_id", "==", famId));
    const unsubUsuarios = onSnapshot(qUsuarios, (snap) => {
      const list: Usuario[] = [];
      snap.forEach(d => list.push({ uid: d.id, ...d.data() } as Usuario));
      setUsuarios(list);
    }, (err) => {
      console.warn("Sync usuarios warning:", err);
    });

    // Real-time listener for active family document
    const unsubFamilias = onSnapshot(doc(firestore, "familias", famId), (snap) => {
      if (snap.exists()) {
        const famData = { familia_id: snap.id, ...snap.data() } as Familia;
        setFamilias(prev => {
          const exists = prev.some(f => f.familia_id === famData.familia_id);
          return exists ? prev.map(f => f.familia_id === famData.familia_id ? famData : f) : [...prev, famData];
        });
      }
    }, (err) => {
      console.warn("Sync familia warning:", err);
    });

    // Real-time listener for journal entries (filtered by familia_id)
    const qDiario = query(collection(firestore, "diario"), where("familia_id", "==", famId));
    const unsubDiario = onSnapshot(qDiario, (snap) => {
      const list: DiarioEntrada[] = [];
      snap.forEach(d => list.push({ entrada_id: d.id, ...d.data() } as DiarioEntrada));
      setDiario(list);
    }, (err) => {
      console.warn("Sync diario warning:", err);
    });

    // Real-time listener for pending consequences
    const qPendientes = query(collection(firestore, "consecuencias_pendientes"), where("familia_id", "==", famId));
    const unsubPendientes = onSnapshot(qPendientes, (snap) => {
      const list: ConsecuenciaPendiente[] = [];
      snap.forEach(d => list.push({ pendiente_id: d.id, ...d.data() } as ConsecuenciaPendiente));
      setConsecuenciasPendientes(list);
    }, (err) => {
      console.warn("Sync consecuencias pendientes warning:", err);
    });

    return () => {
      unsubTareas();
      unsubMetas();
      unsubUsuarios();
      unsubFamilias();
      unsubDiario();
      unsubPendientes();
    };
  }, [currentUser?.familia_id]);

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
        setFamilias(data.familias || []);
        setConsecuenciasPlantillas(data.consecuenciasPlantillas || []);
        setRecompensasPlantillas(data.recompensasPlantillas || []);
        setConsecuenciasPendientes(data.consecuenciasPendientes || []);
        setDesbloqueosUsuarios(data.desbloqueosUsuarios || []);

        // Sync local current user's details if modified on server
        if (currentUser) {
          const freshProfile = (data.usuarios || []).find((u: any) => u.uid === currentUser.uid);
          if (freshProfile) {
            setCurrentUser((prev: any) => ({
              ...prev,
              nombre: freshProfile.nombre,
              avatar_url: freshProfile.avatar_url,
              familia_id: freshProfile.familia_id,
              puntos: freshProfile.puntos,
              racha_actual: freshProfile.racha_actual
            }));
          }
        }
      }
    } catch (e) {
      console.error("Error fetching synced state", e);
    } finally {
      setLoading(false);
    }
  };

  // Auth setup and listener
  useEffect(() => {
    // Real Firebase Auth listener
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            // Register or update user document
            const syncRes = await fetch('/api/user/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uid: firebaseUser.uid,
                nombre: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Miembro de la Familia",
                avatar_url: firebaseUser.photoURL || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop"
              })
            });

            if (syncRes.ok) {
              const uData = await syncRes.json();
              const tokenResult = await getIdTokenResult(firebaseUser);
              const isUserAdmin = !!tokenResult.claims.admin || uData.updatedUser?.role === 'admin';

              setIdToken(tokenResult.token);
              setIsAdmin(isUserAdmin);
              
              const profile = {
                uid: firebaseUser.uid,
                nombre: uData.updatedUser?.nombre || firebaseUser.displayName || "Usuario",
                email: firebaseUser.email,
                avatar_url: uData.updatedUser?.avatar_url || firebaseUser.photoURL || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop",
                familia_id: uData.updatedUser?.familia_id || ""
              };

              if (firestore) {
                try {
                  await setDoc(doc(firestore, "usuarios", firebaseUser.uid), profile, { merge: true });
                } catch (e) {
                  console.warn("Could not save user profile to firestore client directly", e);
                }
              }

              setCurrentUser(profile);
              await fetchState();

              if (profile.familia_id) {
                setView('hoy');
              } else {
                setView('family_onboarding');
              }
            }
          } catch (err: any) {
            console.error("Firebase syncing failed:", err);
            setErrorBanner("Fallo de sincronización Firebase.");
          } finally {
            setLoading(false);
          }
        } else {
          setCurrentUser(null);
          setIdToken(null);
          setIsAdmin(false);
          setView('login');
          setLoading(false);
        }
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
      setView('login');
    }
  }, []);

  // Process onboarding data on successful authentication
  useEffect(() => {
    const applyPendingOnboarding = async () => {
      if (!currentUser || !pendingOnboardingData) return;
      
      setLoading(true);
      try {
        let finalFamilyId = "";
        
        // 1. Create or Join Family
        if (pendingOnboardingData.onboardingAction === 'create') {
          const res = await fetch('/api/family/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: currentUser.uid,
              nombre: pendingOnboardingData.familyName || "Familia"
            })
          });
          if (res.ok) {
            const data = await res.json();
            finalFamilyId = data.newFamily.familia_id;
          }
        } else if (pendingOnboardingData.onboardingAction === 'join' && pendingOnboardingData.inviteCode) {
          const res = await fetch('/api/family/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: currentUser.uid,
              code: pendingOnboardingData.inviteCode
            })
          });
          if (res.ok) {
            const data = await res.json();
            finalFamilyId = data.family.familia_id;
          }
        }

        // 2. Create First Goal if specified
        if (pendingOnboardingData.firstGoal) {
          await fetch('/api/goals/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              titulo: pendingOnboardingData.firstGoal,
              categoria: pendingOnboardingData.category || 'Personal',
              usuario_id: currentUser.uid
            }),
          });
        }

        // Refresh state
        await fetchState();
        
        // Clear pending data
        setPendingOnboardingData(null);
        
        // Direct to home view
        setView('hoy');
      } catch (err) {
        console.error("Error applying pending onboarding data:", err);
      } finally {
        setLoading(false);
      }
    };

    applyPendingOnboarding();
  }, [currentUser, pendingOnboardingData]);

  // Sync actions with Express backend
  const handleToggleTask = async (taskId: string) => {
    const task = tareas.find(t => t.tarea_id === taskId);
    try {
      const res = await fetch('/api/tasks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarea_id: taskId }),
      });
      if (res.ok) {
        // If task is transitioning to completed
        if (task && task.estado !== 'completada') {
          if (task.es_prioridad_alta) {
            try {
              const confetti = (await import('canvas-confetti')).default;
              confetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#6366F1', '#F59E0B', '#10B981', '#EC4899']
              });
            } catch (e) {
              console.log('Confetti load error', e);
            }
            showToast("⭐ ¡Increíble! Has completado una tarea de alta prioridad.", "success");
          } else {
            showToast("¡Tarea completada con éxito!", "success");
          }
        }
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
      await handleToggleTask(taskId);
    } else if (task.estado === 'en_progreso') {
      setFocusedTask(task);
    } else {
      await handleToggleTask(taskId);
      setFocusedTask({ ...task, estado: 'en_progreso' });
    }
  };

  const handleCompleteFocusTask = async (taskId: string) => {
    await handleToggleTask(taskId);
    setFocusedTask(null);
  };

  const handleSnoozeTask = async (taskId: string, minutesToSnooze?: number, exactTime?: string) => {
    try {
      const res = await fetch('/api/tasks/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarea_id: taskId, minutesToSnooze, exactTime }),
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (e) {
      console.error("Error snoozing task", e);
    }
  };

  const handleAddTask = async (
    titulo: string,
    userId: string,
    scheduledTime: string,
    estimatedTime: number,
    visible: boolean,
    categoria?: 'Hogar' | 'Estudio' | 'Salud' | 'Personal' | 'Otros',
    esPrioridadAlta?: boolean,
    esCritica?: boolean,
    configCritica?: ConfigTareaCritica
  ) => {
    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          usuario_id: userId,
          hora_programada: scheduledTime,
          tiempo_estimado_min: estimatedTime,
          visible_familia: visible,
          categoria: categoria || 'Otros',
          es_prioridad_alta: !!esPrioridadAlta,
          es_critica: !!esCritica,
          config_critica: configCritica
        }),
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (e) {
      console.error("Error creating task", e);
    }
  };

  const handleAddGoal = async (goalData: Partial<Meta> | string, cat?: Meta['categoria']) => {
    if (!currentUser) return;
    try {
      const payload = typeof goalData === 'string'
        ? { titulo: goalData, categoria: cat || 'Hogar', usuario_id: currentUser.uid, familia_id: currentUser.familia_id }
        : { usuario_id: currentUser.uid, familia_id: currentUser.familia_id, ...goalData };

      const res = await fetch('/api/goals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (e) {
      console.error("Error creating goal", e);
    }
  };

  const handleCreateConsequenceTemplate = async (template: Partial<ConsecuenciaPlantilla>) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/consequences/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familia_id: currentUser.familia_id || "fam_kevin_admin",
          creado_por: currentUser.uid,
          ...template
        })
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (e) {
      console.error("Error creating consequence template", e);
    }
  };

  const handleCreateRewardTemplate = async (template: Partial<RecompensaPlantilla>) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/rewards/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familia_id: currentUser.familia_id || "fam_kevin_admin",
          ...template
        })
      });
      if (res.ok) {
        await fetchState();
        showToast("Plantilla de recompensa creada con éxito 🎁", "success");
      }
    } catch (e) {
      console.error("Error creating reward template", e);
    }
  };

  // Check for unseen unlocks and trigger toast notification + confetti
  useEffect(() => {
    if (!currentUser?.uid || desbloqueosUsuarios.length === 0) return;

    const unseen = desbloqueosUsuarios.filter(d => d.usuario_id === currentUser.uid && !d.visto);
    if (unseen.length > 0) {
      unseen.forEach(async (u) => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        let msg = `🎉 ¡NUEVA RECOMPENSA DESBLOQUEADA!`;
        if (u.tipo === 'bot') {
          msg = `🤖 ¡RECOMPENSA DE META CUMPLIDA! Desbloqueaste al Bot ${u.valor.toUpperCase()} en los juegos vs IA.`;
        } else if (u.tipo === 'tiempo_extra') {
          msg = `⏱️ ¡RECOMPENSA DE META CUMPLIDA! Ganaste +${u.valor} minutos extra de juegos.`;
        } else {
          msg = `🎁 ¡RECOMPENSA DE META CUMPLIDA! Has ganado: ${u.valor}`;
        }

        showToast(msg, 'success');

        try {
          await fetch('/api/unlocks/mark-seen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ desbloqueo_id: u.desbloqueo_id })
          });
          setDesbloqueosUsuarios(prev => prev.map(item => item.desbloqueo_id === u.desbloqueo_id ? { ...item, visto: true } : item));
        } catch (err) {
          console.error("Error marking unlock as seen:", err);
        }
      });
    }
  }, [desbloqueosUsuarios, currentUser?.uid]);

  const handleResolvePendingConsequence = async (pendiente_id: string, action: 'assign' | 'forgive') => {
    try {
      const res = await fetch('/api/consequences/pending/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendiente_id, action })
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (e) {
      console.error("Error resolving pending consequence", e);
    }
  };

  const handleEvaluateCompliance = async () => {
    try {
      const res = await fetch('/api/goals/evaluate-compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familia_id: currentUser?.familia_id || "fam_kevin_admin" })
      });
      if (res.ok) {
        await fetchState();
        showToast("Evaluación de metas completada con éxito 📊", "success");
      }
    } catch (e) {
      console.error("Error evaluating compliance", e);
    }
  };

  const handleAddDiaryEntry = async (texto: string, emocion: DiarioEntrada['emocion'], visible_familia: boolean) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/journal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto,
          emocion,
          visible_familia,
          usuario_id: currentUser.uid
        }),
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (e) {
      console.error("Error creating diary entry", e);
    }
  };

  const handleAddJournalReaction = async (entrada_id: string, emoji: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/journal/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entrada_id,
          usuario_id: currentUser.uid,
          emoji
        }),
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (e) {
      console.error("Error adding journal reaction", e);
    }
  };

  const handleUpdateUser = async (dataOrUid: string | Partial<Usuario>, nombre?: string, avatar_url?: string) => {
    try {
      let targetUid = typeof dataOrUid === 'string' ? dataOrUid : (currentUser?.uid || '');
      let targetNombre = typeof dataOrUid === 'string' ? nombre : dataOrUid.nombre;
      let targetAvatar = typeof dataOrUid === 'string' ? avatar_url : dataOrUid.avatar_url;

      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: targetUid, nombre: targetNombre, avatar_url: targetAvatar }),
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
      const res = await fetch('/api/reset', { method: 'POST', headers });
      if (res.ok) {
        await fetchState();
        alert("¡Base de datos sincronizada con el estado inicial!");
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || "No autorizado"}`);
      }
    } catch (e) {
      console.error("Error resetting state", e);
    }
  };

  // Google Provider SSO Login
  const handleLoginWithGoogle = async () => {
    setErrorBanner(null);
    if (auth) {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (err: any) {
        console.error("Error signing in with Google:", err);
        if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
          const currentDomain = window.location.hostname;
          setErrorBanner(
            `Nota: El dominio actual '${currentDomain}' no está en la lista de Dominios Autorizados de Firebase Console. Se ha iniciado sesión automáticamente en Modo Demo.`
          );
          await handleQuickDemoLogin("kevin@familia.com", "123456");
        } else if (err.code === 'auth/popup-closed-by-user') {
          setErrorBanner("Ventana de inicio de sesión de Google cerrada por el usuario.");
        } else {
          setErrorBanner(`Fallo al conectar con Google: ${err.message || err}.`);
        }
      }
    } else {
      setErrorBanner("Firebase no está configurado. Configure las credenciales de Firebase.");
    }
  };

  // Quick Demo Login helper for testing without setup issues
  const handleQuickDemoLogin = async (email = "kevin@familia.com", password = "123456") => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCurrentUser(data.user);
          setIdToken(data.idToken);
          setIsAdmin(data.user.role === 'admin');
          await fetchState();

          if (data.user.familia_id) {
            setView('hoy');
          } else {
            setView('family_onboarding');
          }
        } else {
          setErrorBanner(data.error || "Fallo al ingresar con la cuenta demo.");
        }
      } else {
        setErrorBanner("Error en el servidor al intentar acceso rápido demo.");
      }
    } catch (err: any) {
      console.error("Demo login error:", err);
      setErrorBanner("Error de conexión al ingresar en modo demo.");
    } finally {
      setLoading(false);
    }
  };

  // Email and Password Login & Simulation Fallback
  const handleLoginWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorBanner("Por favor complete todos los campos.");
      return;
    }

    setLoading(true);
    try {
      // 1. Try real Firebase Auth if enabled
      if (auth) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword.trim());
          if (userCredential.user) {
            console.log("Real Firebase Auth login successful!");
            setLoading(false);
            return;
          }
        } catch (authErr: any) {
          console.warn("Real Firebase Auth login failed, falling back to database verification...", authErr);
        }
      }

      // 2. Fallback to our custom simulated / seeded backend login
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCurrentUser(data.user);
          setIdToken(data.idToken);
          setIsAdmin(data.user.role === 'admin');
          await fetchState();
          
          if (data.user.familia_id) {
            setView('hoy');
          } else {
            setView('family_onboarding');
          }
        } else {
          setErrorBanner(data.error || "Fallo al iniciar sesión.");
        }
      } else {
        const errData = await res.json();
        setErrorBanner(errData.error || "Credenciales incorrectas o error en el servidor.");
      }
    } catch (err: any) {
      console.error("Error signing in with Email/Password:", err);
      setErrorBanner(`Error al iniciar sesión: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Sign out failed:", err);
      }
    } else {
      setCurrentUser(null);
      setIsAdmin(false);
      setView('login');
    }
  };

  // Dynamic Family Handlers
  const handleCreateFamily = async (nombreFamilia: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/family/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          nombre: nombreFamilia
        })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchState();
        
        const updatedProfile = {
          ...currentUser,
          familia_id: data.newFamily.familia_id
        };
        setCurrentUser(updatedProfile);
        setView('hoy');
      }
    } catch (err) {
      console.error("Error creating family", err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async (inviteCode: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/family/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          code: inviteCode
        })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchState();
        
        const updatedProfile = {
          ...currentUser,
          familia_id: data.family.familia_id
        };
        setCurrentUser(updatedProfile);
        setView('hoy');
      } else {
        const err = await res.json();
        alert(err.error || "Fallo al unirse a la familia.");
      }
    } catch (err) {
      console.error("Error joining family", err);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'onboarding') {
    return (
      <OnboardingScreen
        onComplete={(data) => {
          setPendingOnboardingData(data);
          setView('login');
        }}
      />
    );
  }

  // Pre-login screen mimicking Google Sign-In & local selection fallback
  if (view === 'login') {
    return (
      <div className="bg-[#F7F9FC] min-h-screen flex items-center justify-center p-4 animate-fade-in">
        <main className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-xl shadow-indigo-100/50 border border-indigo-50/80 flex flex-col justify-between">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-brand-primary rounded-[22px] flex items-center justify-center text-white shadow-lg shadow-indigo-200/50 mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl font-bold">diversity_3</span>
            </div>
            <h1 className="font-sans text-3xl font-extrabold text-brand-dark mb-1">Bienvenido de nuevo</h1>
            <p className="font-sans text-sm text-gray-500">Continuemos construyendo juntos.</p>
          </div>

          {/* Selector de Método de Login */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
            <button
              onClick={() => setLoginMethod('email')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                loginMethod === 'email'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Usuario y Clave
            </button>
            <button
              onClick={() => setLoginMethod('google')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                loginMethod === 'google'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Google SSO
            </button>
          </div>

          <div className="space-y-6">
            {loginMethod === 'google' ? (
              <div className="space-y-4">
                <button
                  onClick={handleLoginWithGoogle}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white text-gray-700 font-sans text-xs font-bold rounded-2xl shadow-sm hover:bg-slate-50 hover:border-brand-primary active:scale-95 transition-all border border-gray-200 cursor-pointer"
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
                <p className="text-center font-sans text-[11px] text-gray-400">
                  Usa tu cuenta de Google para sincronizar tus metas y tareas.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLoginWithEmail} className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="font-sans text-[11px] font-bold text-gray-500 uppercase tracking-wider">Correo Electrónico</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="correo@familia.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-gray-800 outline-none focus:border-brand-primary focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="font-sans text-[11px] font-bold text-gray-500 uppercase tracking-wider">Contraseña</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-gray-800 outline-none focus:border-brand-primary focus:bg-white transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-brand-primary text-white font-sans text-xs font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-brand-dark active:scale-95 transition-all cursor-pointer mt-2"
                >
                  Entrar
                </button>
              </form>
            )}

            {errorBanner && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 font-sans text-xs font-semibold rounded-2xl text-left space-y-2">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-rose-500 text-base mt-0.5">error</span>
                  <div className="flex-1 leading-snug">{errorBanner}</div>
                </div>
                <button
                  onClick={() => handleQuickDemoLogin("kevin@familia.com", "123456")}
                  className="w-full mt-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white font-sans text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  Ingresar Inmediatamente en Modo Demo (Kevin Admin)
                </button>
              </div>
            )}

            {/* Quick Demo Login Option */}
            <div className="pt-2 border-t border-slate-100 text-center space-y-2">
              <span className="text-[11px] font-medium text-gray-400">¿Quieres probar la app rápidamente?</span>
              <button
                onClick={() => handleQuickDemoLogin("kevin@familia.com", "123456")}
                type="button"
                className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 font-sans text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">badge</span>
                Acceso Rápido Demo (Admin)
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Intermediate family onboarding screen if user is authenticated but not in any family
  if (view === 'family_onboarding') {
    return (
      <div className="bg-[#F7F9FC] min-h-screen flex items-center justify-center p-4 animate-fade-in">
        <main className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-xl shadow-indigo-100/50 border border-indigo-50/80 flex flex-col justify-between">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-brand-primary rounded-[22px] flex items-center justify-center text-white shadow-lg shadow-indigo-200/50 mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl font-bold">diversity_1</span>
            </div>
            <h1 className="font-sans text-2xl font-extrabold text-brand-dark mb-1">¡Hola, {currentUser?.nombre}!</h1>
            <p className="font-sans text-xs text-gray-500">Antes de comenzar, conéctate con tu núcleo familiar.</p>
          </div>

          <div className="space-y-6">
            {/* Create Family Option */}
            <div className="p-5 border border-indigo-50/80 rounded-2xl bg-indigo-50/20 text-left">
              <h3 className="font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Crear Nuevo Núcleo</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nombre de la familia (ej. García)"
                  id="newFamilyName"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-800 outline-none"
                />
                <button
                  onClick={async () => {
                    const el = document.getElementById('newFamilyName') as HTMLInputElement;
                    if (el && el.value.trim()) {
                      await handleCreateFamily(el.value.trim());
                    } else {
                      alert("Por favor ingresa un nombre para la familia.");
                    }
                  }}
                  className="bg-brand-primary hover:bg-brand-dark text-white font-sans text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all cursor-pointer"
                >
                  Crear
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px bg-slate-100 flex-1"></div>
              <span className="font-sans text-[10px] text-gray-300 font-extrabold tracking-widest uppercase">O BIEN</span>
              <div className="h-px bg-slate-100 flex-1"></div>
            </div>

            {/* Join Family Option */}
            <div className="p-5 border border-indigo-50/80 rounded-2xl bg-slate-50/30 text-left">
              <h3 className="font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Unirse con código</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Código de invitación (ej. GARCIA123)"
                  id="inviteFamilyCode"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-800 outline-none uppercase"
                />
                <button
                  onClick={async () => {
                    const el = document.getElementById('inviteFamilyCode') as HTMLInputElement;
                    if (el && el.value.trim()) {
                      await handleJoinFamily(el.value.trim());
                    } else {
                      alert("Por favor ingresa un código de invitación.");
                    }
                  }}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-sans text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all cursor-pointer"
                >
                  Unirse
                </button>
              </div>
            </div>
            
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full text-center text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider cursor-pointer"
            >
              Cerrar sesión
            </button>
          </div>
        </main>
      </div>
    );
  }

  const freshCurrentUser = usuarios.find((u) => u.uid === currentUser?.uid) || currentUser;
  const isSuspended = freshCurrentUser?.estado === 'suspendido';

  if (isSuspended) {
    return (
      <div className="bg-[#F7F9FC] min-h-screen flex items-center justify-center p-4 animate-fade-in">
        <main className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-xl shadow-indigo-100/50 border border-rose-100/50 flex flex-col justify-between text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
          <div className="my-6">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-4 animate-pulse">
              <span className="material-symbols-outlined text-3xl font-bold">block</span>
            </div>
            <h1 className="font-sans text-2xl font-extrabold text-gray-900 mb-2">Cuenta Suspendida</h1>
            <p className="font-sans text-sm text-gray-500 leading-relaxed mb-6">
              Tu cuenta ha sido suspendida de forma administrativa por el gestor de la red familiar. Por favor ponte en contacto con el administrador de tu núcleo familiar para resolverlo.
            </p>
            <button
              onClick={handleLogout}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-sans text-xs font-bold py-3.5 px-4 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm font-bold">logout</span>
              <span>Cerrar Sesión</span>
            </button>
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
            { id: 'diario', label: 'Diario', icon: 'menu_book' },
            { id: 'familia', label: 'Familia', icon: 'group' },
            { id: 'juegos', label: 'Juegos', icon: 'sports_esports' },
            { id: 'perfil', label: 'Perfil & Avatar', icon: 'account_circle' },
            ...(isAdmin ? [{ id: 'ideas', label: 'Ideas IA', icon: 'lightbulb' }] : [])
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewType)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-sans text-xs font-bold transition-all text-left cursor-pointer ${
                view === item.id
                  ? 'bg-brand-light text-brand-dark shadow-sm'
                  : 'text-gray-500 hover:bg-slate-50 hover:text-brand-dark'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          {/* Admin Panels (Visible ONLY to users with admin token or simulated admin status) */}
          {isAdmin && (
            <>
              <div className="h-px bg-slate-100 my-4" />
              <p className="font-sans text-[9px] font-extrabold text-gray-400 uppercase tracking-widest px-2.5 mb-2">GESTIÓN ADMINISTRADOR</p>
              {[
                { id: 'admin-dashboard', label: 'Panel de Control', icon: 'dashboard' },
                { id: 'admin-families', label: 'Redes de Familias', icon: 'hub' },
                { id: 'admin-assign-task', label: 'Asignar Tarea', icon: 'add_task' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as ViewType)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-sans text-xs font-bold transition-all text-left cursor-pointer ${
                    view === item.id || (item.id === 'admin-dashboard' && view === 'admin-user-detail')
                      ? 'bg-amber-50 text-amber-800 shadow-sm'
                      : 'text-gray-500 hover:bg-slate-50 hover:text-brand-dark'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </>
          )}

          {/* Gemini AI Assistant Button (Only visible to Admin) */}
          {isAdmin && (
            <>
              <div className="h-px bg-slate-100 my-3" />
              <button
                onClick={() => setIsGeminiAdvisorOpen(true)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl font-sans text-xs font-bold transition-all text-left cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg hover:opacity-95"
              >
                <span className="material-symbols-outlined text-lg text-amber-300">auto_awesome</span>
                <span>Asistente Gemini IA</span>
              </button>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-auto px-2 pt-4 flex flex-col gap-2">
          {/* Active profile badge with Logout */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-150">
            <div className="flex items-center gap-2">
              <img className="w-7 h-7 rounded-full object-cover" src={currentUser?.avatar_url} alt={currentUser?.nombre} referrerPolicy="no-referrer" />
              <div className="text-left">
                <p className="font-sans text-[10px] font-bold text-gray-800 truncate max-w-[100px]">{currentUser?.nombre}</p>
                <p className="font-sans text-[8px] text-gray-400 font-bold uppercase tracking-wider">{isAdmin ? 'ADMIN' : 'MIEMBRO'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-6 h-6 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer" title="Cerrar sesión">
              <span className="material-symbols-outlined text-base">logout</span>
            </button>
          </div>

          <button
            onClick={handleResetDatabase}
            className="w-full py-2 bg-brand-light hover:bg-indigo-100/80 text-brand-dark font-sans text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Sincronizar Estado
          </button>
          <p className="text-center font-sans text-[10px] text-gray-400 font-semibold">v1.1.0 • Núcleo Familiar</p>
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
          {/* Gemini AI Advisor Button */}
          <button
            onClick={() => setIsGeminiAdvisorOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-sans text-xs font-bold shadow-xs cursor-pointer hover:opacity-95"
          >
            <span className="material-symbols-outlined text-sm text-amber-300">auto_awesome</span>
            <span>IA</span>
          </button>

          {/* Quick sync */}
          <button
            onClick={handleResetDatabase}
            className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-gray-500 hover:bg-slate-100 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-50">
            <img
              className="w-full h-full object-cover"
              src={currentUser?.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop"}
              alt="Avatar"
              referrerPolicy="no-referrer"
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
            {!isFirebaseEnabled && (
              <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm text-left">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 mt-0.5 md:mt-0 shadow-sm">
                    <span className="material-symbols-outlined text-2xl">warning</span>
                  </div>
                  <div>
                    <h3 className="font-sans text-sm font-extrabold text-amber-950">
                      Firebase no está configurado
                    </h3>
                    <p className="font-sans text-xs text-amber-900/90 mt-0.5 leading-relaxed">
                      Las funciones de sincronización y juegos multijugador no funcionarán hasta configurar las credenciales en tus variables de entorno (<code className="bg-amber-100/90 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold text-amber-950">VITE_FIREBASE_*</code>).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setView('code-exporter')}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm shrink-0 whitespace-nowrap cursor-pointer"
                >
                  Ver Instrucciones .env
                </button>
              </div>
            )}
            {view === 'hoy' && (
              <HoyScreen
                usuarios={usuarios}
                tareas={tareas}
                metas={metas}
                diario={diario}
                currentUser={currentUser}
                onToggleTask={handleTaskClick}
                onAddTaskClick={() => setView('admin-assign-task')}
                onGoToMetas={() => setView('metas')}
                onGoToDiario={() => setView('diario')}
              />
            )}
            {view === 'metas' && (
              <MetasScreen
                metas={metas}
                usuarios={usuarios}
                currentUser={currentUser}
                consecuenciasPlantillas={consecuenciasPlantillas}
                recompensasPlantillas={recompensasPlantillas}
                consecuenciasPendientes={consecuenciasPendientes}
                onAddGoal={handleAddGoal}
                onCreateConsequenceTemplate={handleCreateConsequenceTemplate}
                onCreateRewardTemplate={handleCreateRewardTemplate}
                onResolvePendingConsequence={handleResolvePendingConsequence}
                onEvaluateCompliance={handleEvaluateCompliance}
              />
            )}
            {view === 'familia' && (
              <FamiliaScreen 
                usuarios={usuarios} 
                tareas={tareas} 
                onInviteClick={() => showToast("¡Código de invitación copiado al portapapeles! 📋", "success")} 
                onUpdateUser={handleUpdateUser}
                currentUser={currentUser}
                familias={familias}
                onSelectUser={(uid) => {
                  setSelectedUserId(uid);
                  setView('admin-user-detail');
                }}
              />
            )}
            {view === 'diario' && (
              <DiarioScreen 
                diario={diario} 
                usuarios={usuarios} 
                currentUser={currentUser}
                onAddEntry={handleAddDiaryEntry} 
                onAddReaction={handleAddJournalReaction}
              />
            )}
            {view === 'ideas' && (
              isAdmin ? (
                <IdeasScreen
                  currentUser={currentUser}
                  onAddTask={(taskData: any) => handleAddTask(
                    taskData.titulo,
                    taskData.usuario_id,
                    taskData.hora_programada,
                    taskData.tiempo_estimado_min,
                    taskData.visible_familia,
                    taskData.categoria,
                    taskData.es_prioridad_alta
                  )}
                  onAddGoal={(goalData: any) => handleAddGoal(goalData)}
                  showToast={showToast}
                />
              ) : (
                <HoyScreen
                  usuarios={usuarios}
                  tareas={tareas}
                  metas={metas}
                  diario={diario}
                  currentUser={currentUser}
                  onToggleTask={handleTaskClick}
                  onAddTaskClick={() => setView('admin-assign-task')}
                  onGoToMetas={() => setView('metas')}
                  onGoToDiario={() => setView('diario')}
                />
              )
            )}
            {(view === 'perfil' || view === 'widgets') && (
              <PerfilScreen
                currentUser={currentUser}
                usuarios={usuarios}
                tareas={tareas}
                familias={familias}
                isAdmin={isAdmin}
                onUpdateUser={handleUpdateUser}
                onToggleTask={handleToggleTask}
                onSnoozeTask={handleSnoozeTask}
                showToast={showToast}
              />
            )}
            {view === 'juegos' && (
              <JuegosScreen
                currentUser={currentUser}
                usuarios={usuarios}
                desbloqueosUsuarios={desbloqueosUsuarios}
                onStateUpdate={fetchState}
              />
            )}
            {view === 'admin-dashboard' && (
              <AdminPanelDashboard
                usuarios={usuarios}
                familias={familias}
                tareas={tareas}
                metas={metas}
                onSelectUser={(uid) => {
                  setSelectedUserId(uid);
                  setView('admin-user-detail');
                }}
              />
            )}
            {view === 'admin-families' && (
              <FamilyNetworkScreen
                usuarios={usuarios}
                familias={familias}
                onSelectUser={(uid) => {
                  setSelectedUserId(uid);
                  setView('admin-user-detail');
                }}
              />
            )}
            {view === 'admin-assign-task' && (
              <AssignTaskScreen usuarios={usuarios} onAddTask={handleAddTask} />
            )}
            {view === 'admin-user-detail' && (
              <UserDetailScreen
                userId={selectedUserId || currentUser?.uid || ""}
                usuarios={usuarios}
                tareas={tareas}
                familias={familias}
                idToken={idToken}
                onAddTaskClick={() => setView('admin-assign-task')}
                onBack={() => setView('admin-families')}
                onStateUpdate={fetchState}
              />
            )}
            {view === 'code-exporter' && (
              isAdmin ? (
                <CodeExporterScreen />
              ) : (
                <PerfilScreen
                  currentUser={currentUser}
                  usuarios={usuarios}
                  tareas={tareas}
                  familias={familias}
                  isAdmin={isAdmin}
                  onUpdateUser={handleUpdateUser}
                  onToggleTask={handleToggleTask}
                  onSnoozeTask={handleSnoozeTask}
                  showToast={showToast}
                />
              )
            )}
          </div>
        )}
      </main>

      {/* Live Activity Floating Banner (when a task is in progress and overlay is not full-screen) */}
      {!focusedTask && (() => {
        const inProgressTask = tareas.find(t => t.estado === 'en_progreso');
        if (!inProgressTask) return null;
        return (
          <LiveActivityBanner
            task={inProgressTask}
            onComplete={handleCompleteFocusTask}
            onPause={(taskId) => handleToggleTask(taskId)}
            onOpenFocusMode={(task) => setFocusedTask(task)}
          />
        );
      })()}

      {/* Focus Mode Overlay when active */}
      {focusedTask && (
        <FocusModeOverlay 
          task={focusedTask} 
          onClose={() => setFocusedTask(null)} 
          onComplete={handleCompleteFocusTask} 
        />
      )}

      {/* Mobile Bottom Navigation (Visible only on mobile screen widths) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-indigo-100 py-2 px-2 flex justify-around items-center z-40 shadow-lg overflow-x-auto no-scrollbar">
        {[
          { id: 'hoy', label: 'Hoy', icon: 'home' },
          { id: 'metas', label: 'Metas', icon: 'target' },
          { id: 'diario', label: 'Diario', icon: 'menu_book' },
          { id: 'juegos', label: 'Juegos', icon: 'sports_esports' },
          { id: 'perfil', label: 'Perfil', icon: 'account_circle' },
          { id: 'familia', label: 'Familia', icon: 'group' },
          ...(isAdmin ? [{ id: 'ideas', label: 'Ideas IA', icon: 'lightbulb' }] : [])
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as ViewType)}
            className={`flex flex-col items-center justify-center min-w-[56px] px-1 py-1 transition-all cursor-pointer ${
              view === item.id
                ? 'text-brand-primary font-black scale-105'
                : 'text-slate-400 hover:text-brand-primary'
            }`}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            <span className="font-sans text-[9px] uppercase tracking-wider mt-0.5 whitespace-nowrap">{item.label}</span>
          </button>
        ))}

        {isAdmin && (
          <button
            onClick={() => setView('admin-dashboard')}
            className={`flex flex-col items-center justify-center w-14 transition-all cursor-pointer ${
              view === 'admin-dashboard' || view.startsWith('admin-')
                ? 'text-amber-600 font-bold scale-105'
                : 'text-gray-400 hover:text-amber-600/85'
            }`}
          >
            <span className="material-symbols-outlined text-xl">dashboard</span>
            <span className="font-sans text-[9px] uppercase tracking-wider mt-1">Admin</span>
          </button>
        )}

        {/* Toggle link for Code */}
        <button
          onClick={() => setView('code-exporter')}
          className={`flex flex-col items-center justify-center w-14 transition-all cursor-pointer ${
            view === 'code-exporter' ? 'text-brand-primary font-bold' : 'text-gray-400 hover:text-brand-primary/85'
          }`}
        >
          <span className="material-symbols-outlined text-xl">code</span>
          <span className="font-sans text-[9px] uppercase tracking-wider mt-1">Código</span>
        </button>
      </nav>

      {/* Toast Notifications Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs font-bold transition-all animate-bounce-short ${
              toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : toast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            {toast.onRetry && (
              <button
                onClick={() => {
                  toast.onRetry?.();
                  removeToast(toast.id);
                }}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-black uppercase cursor-pointer"
              >
                Reintentar
              </button>
            )}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white font-black text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Gemini AI Advisor Modal */}
      <GeminiAdvisorModal
        isOpen={isGeminiAdvisorOpen}
        onClose={() => setIsGeminiAdvisorOpen(false)}
        familyName={familias[0]?.nombre}
      />
    </div>
  );
}
