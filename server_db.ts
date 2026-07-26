import { initializeApp, getApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { TareaDiaria, Meta, DiarioEntrada, Usuario, Familia, ConsecuenciaPlantilla, RecompensaPlantilla, ConsecuenciaPendiente, DesbloqueoUsuario } from "./src/types";

// Base sample datasets (Empty from scratch for real production)
export const initialUsuarios: Usuario[] = [
  {
    uid: "kevin-admin-uid",
    nombre: "Kevin (Admin)",
    avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop",
    familia_id: "fam_kevin_admin",
    racha_actual: 5,
    puntos: 150,
    configuracion_privacidad: { visible_familia_por_defecto: true },
    role: "admin",
    email: "kevin@familia.com"
  } as any
];
export const initialMetas: Meta[] = [];
export const initialTareas: TareaDiaria[] = [];
export const initialDiario: DiarioEntrada[] = [];
export const initialFamilias: Familia[] = [
  {
    familia_id: "fam_kevin_admin",
    nombre: "Familia Admin",
    codigo_invitacion: "ADMIN123",
    miembros: ["kevin-admin-uid"]
  }
];

// In-Memory fallback state
let localDatabase: {
  usuarios: Usuario[];
  metas: Meta[];
  tareas: TareaDiaria[];
  diario: DiarioEntrada[];
  familias: Familia[];
  consecuenciasPlantillas: ConsecuenciaPlantilla[];
  recompensasPlantillas: RecompensaPlantilla[];
  consecuenciasPendientes: ConsecuenciaPendiente[];
  desbloqueosUsuarios: DesbloqueoUsuario[];
} = {
  usuarios: [...initialUsuarios],
  metas: [...initialMetas],
  tareas: [...initialTareas],
  diario: [...initialDiario],
  familias: [...initialFamilias],
  consecuenciasPlantillas: [
    {
      consecuencia_id: "plantilla_1",
      familia_id: "fam_kevin_admin",
      titulo: "Lavar los platos de la cena",
      descripcion: "Responsabilidad extra por no haber completado la meta diaria",
      categoria: "Hogar",
      tiempo_estimado_min: 20,
      creado_por: "kevin-admin-uid"
    }
  ],
  recompensasPlantillas: [
    {
      recompensa_id: "recompensa_1",
      familia_id: "fam_kevin_admin",
      titulo: "Elegir la película del fin de semana",
      descripcion: "Recompensa por cumplir el 100% de tus metas esta semana",
      tipo: "generica"
    }
  ],
  consecuenciasPendientes: [],
  desbloqueosUsuarios: []
};

let db: Firestore | null = null;
let isFirestoreEnabled = false;

// Local in-memory stores for steps and game progress
let localSteps: { usuario_id: string; pasos: number; fecha: string }[] = [];
let localGameProgress: { usuario_id: string; juego: string; puntaje: number; mejor_tiempo?: number }[] = [];

// Initialize Firebase Admin safely
try {
  if (getApps().length === 0) {
    if (process.env.VITE_FIREBASE_PROJECT_ID) {
      initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID
      });
    } else {
      initializeApp();
    }
  }
  db = getFirestore();
  isFirestoreEnabled = true;
  console.log("[Firebase Admin] Initialized successfully. Firestore is active.");
  
  // Seed the Firestore instance with initial dataset if empty
  seedFirestore().then(() => {
    ensureKevinAdminExists();
  });
} catch (e) {
  console.log("[Firebase Admin] Initialization bypassed or failed. Using locally simulated in-memory state:", e);
}

// Function to handle Firestore errors and fallback gracefully
function handleFirestoreError(err: any, context: string) {
  const errMsg = String(err?.message || err);
  if (
    errMsg.includes("PERMISSION_DENIED") ||
    errMsg.includes("has not been used in project") ||
    errMsg.includes("disabled") ||
    errMsg.includes("PROJECT_NOT_FOUND") ||
    errMsg.includes("Cloud Firestore API") ||
    err?.code === 7
  ) {
    if (isFirestoreEnabled) {
      console.warn(`[Firebase Admin] Cloud Firestore API is disabled or inaccessible in GCP project. Automatically falling back to local in-memory database (${context}).`);
      isFirestoreEnabled = false;
    }
  } else {
    console.error(`[Firestore Error - ${context}]`, err);
  }
}

// Function to ensure Kevin Admin user exists in Firebase Auth with custom claims
async function ensureKevinAdminExists() {
  if (!isFirestoreEnabled || !db) return;
  try {
    const authInstance = getAuth();
    let userRecord;
    try {
      userRecord = await authInstance.getUserByEmail("kevin@familia.com");
      console.log("[Firebase Admin] Kevin admin user already exists in Firebase Auth:", userRecord.uid);
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.message?.includes("user-not-found")) {
        console.log("[Firebase Admin] Creating Kevin admin user in Firebase Auth...");
        userRecord = await authInstance.createUser({
          email: "kevin@familia.com",
          password: "123456",
          displayName: "Kevin (Admin)",
          photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"
        });
        console.log("[Firebase Admin] Kevin admin user created successfully!");
      } else {
        throw err;
      }
    }

    if (userRecord && isFirestoreEnabled && db) {
      // Set Custom Claims for admin
      await authInstance.setCustomUserClaims(userRecord.uid, { admin: true });
      console.log("[Firebase Admin] Admin claim successfully set for Kevin.");

      // Ensure user is in firestore
      const userRef = db.collection("usuarios").doc(userRecord.uid);
      await userRef.set({
        uid: userRecord.uid,
        nombre: "Kevin (Admin)",
        avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop",
        familia_id: "fam_kevin_admin",
        racha_actual: 5,
        puntos: 150,
        configuracion_privacidad: { visible_familia_por_defecto: true },
        role: "admin",
        email: "kevin@familia.com"
      }, { merge: true });
      console.log("[Firebase Admin] Kevin admin user profile created/merged in Firestore.");

      // Ensure family is in firestore
      const familyRef = db.collection("familias").doc("fam_kevin_admin");
      const familySnap = await familyRef.get();
      if (!familySnap.exists) {
        await familyRef.set({
          familia_id: "fam_kevin_admin",
          nombre: "Familia Admin",
          codigo_invitacion: "ADMIN123",
          miembros: [userRecord.uid]
        });
        console.log("[Firebase Admin] Admin family created in Firestore.");
      }
    }
  } catch (err) {
    handleFirestoreError(err, "ensureKevinAdminExists");
  }
}

// Function to seed Firestore if empty
async function seedFirestore() {
  if (!db || !isFirestoreEnabled) return;
  try {
    const userCol = await db.collection("usuarios").limit(1).get();
    if (userCol.empty) {
      console.log("[Firebase Admin] Database is empty. Seeding Firestore default datasets...");
      const batch = db.batch();
      
      initialUsuarios.forEach(u => {
        batch.set(db!.collection("usuarios").doc(u.uid), u);
      });
      initialMetas.forEach(m => {
        batch.set(db!.collection("metas").doc(m.meta_id), m);
      });
      initialTareas.forEach(t => {
        batch.set(db!.collection("tareas_diarias").doc(t.tarea_id), {
          ...t,
          ultima_actualizacion: FieldValue.serverTimestamp()
        });
      });
      initialDiario.forEach(d => {
        batch.set(db!.collection("diario").doc(d.entrada_id), d);
      });
      initialFamilias.forEach(f => {
        batch.set(db!.collection("familias").doc(f.familia_id), f);
      });
      
      await batch.commit();
      console.log("[Firebase Admin] Seeding completed!");
    }
  } catch (err) {
    handleFirestoreError(err, "seedFirestore");
  }
}

// Check admin claims using standard Firebase Auth ID Tokens
export async function verifyUserAdmin(idToken: string): Promise<boolean> {
  if (!isFirestoreEnabled) {
    return true;
  }
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return !!decodedToken.admin;
  } catch (e) {
    console.error("[Auth Admin Verification Failed]", e);
    return false;
  }
}

// Primary DB Service Adapter API
export const dbService = {
  getIsFirestoreEnabled: () => isFirestoreEnabled,

  getState: async () => {
    if (isFirestoreEnabled && db) {
      try {
        const usersSnap = await db.collection("usuarios").get();
        const metasSnap = await db.collection("metas").get();
        const tasksSnap = await db.collection("tareas_diarias").get();
        const journalSnap = await db.collection("diario").get();
        const familiesSnap = await db.collection("familias").get();
        const plantillasSnap = await db.collection("consecuencias_plantillas").get();
        const recompensasSnap = await db.collection("recompensas_plantillas").get();
        const pendientesSnap = await db.collection("consecuencias_pendientes").get();
        const desbloqueosSnap = await db.collection("desbloqueos_usuarios").get();

        const usuarios: Usuario[] = [];
        const metas: Meta[] = [];
        const tareas: TareaDiaria[] = [];
        const diario: DiarioEntrada[] = [];
        const familias: Familia[] = [];
        const consecuenciasPlantillas: ConsecuenciaPlantilla[] = [];
        const recompensasPlantillas: RecompensaPlantilla[] = [];
        const consecuenciasPendientes: ConsecuenciaPendiente[] = [];
        const desbloqueosUsuarios: DesbloqueoUsuario[] = [];

        usersSnap.forEach(doc => usuarios.push({ uid: doc.id, ...doc.data() } as Usuario));
        metasSnap.forEach(doc => metas.push({ meta_id: doc.id, ...doc.data() } as Meta));
        tasksSnap.forEach(doc => {
          const data = doc.data();
          const lastUp = data.ultima_actualizacion && typeof data.ultima_actualizacion.toDate === "function"
            ? data.ultima_actualizacion.toDate().toISOString()
            : data.ultima_actualizacion;
          tareas.push({ 
            tarea_id: doc.id, 
            ...data, 
            ultima_actualizacion: lastUp 
          } as TareaDiaria);
        });
        journalSnap.forEach(doc => diario.push({ entrada_id: doc.id, ...doc.data() } as DiarioEntrada));
        familiesSnap.forEach(doc => familias.push({ familia_id: doc.id, ...doc.data() } as Familia));
        plantillasSnap.forEach(doc => consecuenciasPlantillas.push({ consecuencia_id: doc.id, ...doc.data() } as ConsecuenciaPlantilla));
        recompensasSnap.forEach(doc => recompensasPlantillas.push({ recompensa_id: doc.id, ...doc.data() } as RecompensaPlantilla));
        pendientesSnap.forEach(doc => consecuenciasPendientes.push({ pendiente_id: doc.id, ...doc.data() } as ConsecuenciaPendiente));
        desbloqueosSnap.forEach(doc => desbloqueosUsuarios.push({ desbloqueo_id: doc.id, ...doc.data() } as DesbloqueoUsuario));

        // Sort journal entries by date/time (unshifted / latest first)
        diario.sort((a, b) => b.fecha.localeCompare(a.fecha));

        return { usuarios, metas, tareas, diario, familias, consecuenciasPlantillas, recompensasPlantillas, consecuenciasPendientes, desbloqueosUsuarios };
      } catch (err) {
        handleFirestoreError(err, "getState");
      }
    }
    return localDatabase;
  },

  resetState: async () => {
    if (isFirestoreEnabled && db) {
      try {
        // Simple clean and overwrite
        const batch = db.batch();
        
        // Clear collections first
        const usersSnap = await db.collection("usuarios").get();
        const metasSnap = await db.collection("metas").get();
        const tasksSnap = await db.collection("tareas_diarias").get();
        const journalSnap = await db.collection("diario").get();
        const familiesSnap = await db.collection("familias").get();

        usersSnap.forEach(doc => batch.delete(doc.ref));
        metasSnap.forEach(doc => batch.delete(doc.ref));
        tasksSnap.forEach(doc => batch.delete(doc.ref));
        journalSnap.forEach(doc => batch.delete(doc.ref));
        familiesSnap.forEach(doc => batch.delete(doc.ref));

        await batch.commit();

        // Seed fresh
        await seedFirestore();
        return { success: true };
      } catch (e) {
        console.error("[Firestore reset error]", e);
      }
    }
    
    localDatabase = {
      usuarios: [...initialUsuarios],
      metas: [...initialMetas],
      tareas: [...initialTareas],
      diario: [...initialDiario],
      familias: [...initialFamilias],
      consecuenciasPlantillas: [],
      recompensasPlantillas: [],
      consecuenciasPendientes: [],
      desbloqueosUsuarios: []
    };
    return { success: true };
  },

  toggleTask: async (tarea_id: string) => {
    if (isFirestoreEnabled && db) {
      try {
        const taskRef = db.collection("tareas_diarias").doc(tarea_id);
        const taskSnap = await taskRef.get();
        if (taskSnap.exists) {
          const task = taskSnap.data() as TareaDiaria;
          const current = task.estado;
          let nextState: 'pendiente' | 'en_progreso' | 'completada' | 'vencido' = 'pendiente';
          if (current === 'pendiente') {
            nextState = 'en_progreso';
          } else if (current === 'en_progreso') {
            nextState = 'completada';
          } else if (current === 'completada') {
            nextState = 'pendiente';
          } else {
            nextState = 'pendiente';
          }

          const updates: any = {
            estado: nextState,
            ultima_actualizacion: FieldValue.serverTimestamp()
          };
          await taskRef.update(updates);

          // If completed, add points to the user document
          if (nextState === 'completada') {
            const userRef = db.collection("usuarios").doc(task.usuario_id);
            const userSnap = await userRef.get();
            if (userSnap.exists) {
              const uData = userSnap.data() as Usuario;
              await userRef.update({
                puntos: (uData.puntos || 0) + 50
              });
            }
          }

          return { success: true };
        }
      } catch (err) {
        console.error("[Firestore toggleTask Error]", err);
      }
    }

    const taskIndex = localDatabase.tareas.findIndex(t => t.tarea_id === tarea_id);
    if (taskIndex !== -1) {
      const current = localDatabase.tareas[taskIndex].estado;
      let nextState: 'pendiente' | 'en_progreso' | 'completada' | 'vencido' = 'pendiente';
      if (current === 'pendiente') {
        nextState = 'en_progreso';
      } else if (current === 'en_progreso') {
        nextState = 'completada';
      } else if (current === 'completada') {
        nextState = 'pendiente';
      } else {
        nextState = 'pendiente';
      }
      localDatabase.tareas[taskIndex].estado = nextState;
      localDatabase.tareas[taskIndex].ultima_actualizacion = new Date().toISOString();

      if (nextState === 'completada') {
        const userIndex = localDatabase.usuarios.findIndex(u => u.uid === localDatabase.tareas[taskIndex].usuario_id);
        if (userIndex !== -1) {
          localDatabase.usuarios[userIndex].puntos += 50;
        }
      }
      return { success: true };
    }
    throw new Error("Tarea no encontrada.");
  },

  snoozeTask: async (tarea_id: string, minutesToSnooze?: number, exactTime?: string) => {
    let newHora = exactTime || "";

    if (isFirestoreEnabled && db) {
      try {
        const taskRef = db.collection("tareas_diarias").doc(tarea_id);
        const taskSnap = await taskRef.get();
        if (taskSnap.exists) {
          const task = taskSnap.data() as TareaDiaria;
          if (!newHora && minutesToSnooze) {
            const [h, m] = (task.hora_programada || "10:00").split(':').map(Number);
            const date = new Date();
            date.setHours(h || 0, (m || 0) + minutesToSnooze, 0, 0);
            newHora = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          }

          if (!newHora) newHora = "12:00";

          const updates: any = {
            hora_programada: newHora,
            ultima_actualizacion: FieldValue.serverTimestamp()
          };
          await taskRef.update(updates);
          return { success: true, newHora };
        }
      } catch (err) {
        console.error("[Firestore snoozeTask Error]", err);
      }
    }

    const taskIndex = localDatabase.tareas.findIndex(t => t.tarea_id === tarea_id);
    if (taskIndex !== -1) {
      const task = localDatabase.tareas[taskIndex];
      if (!newHora && minutesToSnooze) {
        const [h, m] = (task.hora_programada || "10:00").split(':').map(Number);
        const date = new Date();
        date.setHours(h || 0, (m || 0) + minutesToSnooze, 0, 0);
        newHora = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      }
      if (!newHora) newHora = "12:00";

      localDatabase.tareas[taskIndex].hora_programada = newHora;
      localDatabase.tareas[taskIndex].ultima_actualizacion = new Date().toISOString();
      return { success: true, newHora };
    }
    throw new Error("Tarea no encontrada.");
  },

  createTask: async (task: Partial<TareaDiaria>) => {
    const tarea_id = `tarea_${Date.now()}`;
    const newTask: TareaDiaria = {
      tarea_id,
      usuario_id: task.usuario_id!,
      meta_id: task.meta_id || "",
      titulo: task.titulo!,
      categoria: task.categoria || "Otros",
      es_prioridad_alta: !!task.es_prioridad_alta,
      es_critica: !!task.es_critica,
      config_critica: task.config_critica,
      hora_programada: task.hora_programada || "12:00",
      tiempo_estimado_min: Number(task.tiempo_estimado_min) || 30,
      estado: "pendiente",
      ultima_actualizacion: new Date().toISOString(),
      visible_familia: task.visible_familia !== false
    };

    if (isFirestoreEnabled && db) {
      try {
        await db.collection("tareas_diarias").doc(tarea_id).set({
          ...newTask,
          ultima_actualizacion: FieldValue.serverTimestamp()
        });
        return { success: true, newTask };
      } catch (e) {
        console.error("[Firestore createTask Error]", e);
      }
    }

    localDatabase.tareas.push(newTask);
    return { success: true, newTask };
  },

  createGoal: async (goal: Partial<Meta>) => {
    const meta_id = `meta_${Date.now()}`;
    const startDate = goal.fecha_inicio || new Date().toISOString().split('T')[0];
    
    // Calculate end date based on duracion_valor & duracion_unidad
    let endCalculated = new Date(startDate);
    const durVal = Number(goal.duracion_valor) || 1;
    const durUnit = goal.duracion_unidad || 'meses';
    if (durUnit === 'dias') {
      endCalculated.setDate(endCalculated.getDate() + durVal);
    } else if (durUnit === 'semanas') {
      endCalculated.setDate(endCalculated.getDate() + durVal * 7);
    } else {
      endCalculated.setMonth(endCalculated.getMonth() + durVal);
    }
    const fecha_fin = endCalculated.toISOString().split('T')[0];

    const newGoal: Meta = {
      meta_id,
      usuario_id: goal.usuario_id!,
      familia_id: goal.familia_id || "fam_kevin_admin",
      tipo: goal.tipo || 'individual',
      titulo: goal.titulo!,
      categoria: goal.categoria || 'Salud',
      frecuencia_objetivo: Number(goal.frecuencia_objetivo) || 3,
      unidad_frecuencia: goal.unidad_frecuencia || 'semana',
      duracion_valor: durVal,
      duracion_unidad: durUnit,
      fecha_inicio: startDate,
      fecha_fin: goal.fecha_fin || fecha_fin,
      miembros_asignados: goal.miembros_asignados || (goal.tipo === 'familiar' ? [goal.usuario_id!] : undefined),
      progreso_por_miembro: goal.tipo === 'familiar' ? [] : undefined,
      generar_tareas_automaticas: !!goal.generar_tareas_automaticas,
      dias_preferidos: goal.dias_preferidos || [],
      hora_sugerida: goal.hora_sugerida || '09:00',
      consecuencias_activas: !!goal.consecuencias_activas,
      consecuencia_id: goal.consecuencia_id || "",
      requiere_aprobacion_adulto: goal.requiere_aprobacion_adulto !== false,
      recompensa_activa: !!goal.recompensa_activa,
      recompensa_id: goal.recompensa_id || "",
      fecha_limite: goal.fecha_limite || fecha_fin,
      porcentaje_semanal: 0,
      visible_familia: goal.visible_familia !== false
    };

    if (isFirestoreEnabled && db) {
      try {
        await db.collection("metas").doc(meta_id).set(newGoal);
      } catch (e) {
        console.error("[Firestore createGoal Error]", e);
      }
    }

    localDatabase.metas.push(newGoal);

    // Auto-generate tasks if configured
    if (newGoal.generar_tareas_automaticas) {
      await dbService.generarTareasDesdeMetas(newGoal);
    }

    return { success: true, newGoal };
  },

  generarTareasDesdeMetas: async (goal: Meta) => {
    if (!goal.generar_tareas_automaticas) return;

    const startDateStr = goal.fecha_inicio || new Date().toISOString().split('T')[0];
    const startDate = new Date(startDateStr);

    let targetUserIds: string[] = [];
    if (goal.tipo === 'individual') {
      targetUserIds = [goal.usuario_id];
    } else {
      if (goal.miembros_asignados && goal.miembros_asignados.length > 0) {
        targetUserIds = goal.miembros_asignados;
      } else {
        const fam = localDatabase.familias.find(f => f.familia_id === goal.familia_id);
        targetUserIds = fam?.miembros || [goal.usuario_id];
      }
    }

    // SEMANA DE GRACIA (Grace Week calculation)
    const dayOfWeek = startDate.getDay(); // 0=Sun..6=Sat
    const daysRemainingInWeek = 7 - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    let targetCount = goal.frecuencia_objetivo || 3;

    if (goal.unidad_frecuencia === 'semana' && daysRemainingInWeek < 7) {
      targetCount = Math.max(1, Math.round((goal.frecuencia_objetivo * daysRemainingInWeek) / 7));
    }

    // Determine target days
    let scheduledDays: number[] = [];
    if (goal.dias_preferidos && goal.dias_preferidos.length > 0) {
      scheduledDays = goal.dias_preferidos.slice(0, targetCount);
    } else {
      const step = Math.max(1, Math.floor(7 / targetCount));
      for (let i = 0; i < targetCount; i++) {
        scheduledDays.push((dayOfWeek + i * step) % 7);
      }
    }

    // Create tasks for scheduled days within current week
    for (let d = 0; d < 7; d++) {
      const tDate = new Date(startDate);
      tDate.setDate(startDate.getDate() + d);

      if (scheduledDays.includes(tDate.getDay())) {
        const dateStr = tDate.toISOString().split('T')[0];
        for (const uid of targetUserIds) {
          const taskTitle = `${goal.titulo} (${dateStr})`;
          
          const alreadyExists = localDatabase.tareas.some(
            t => t.meta_id === goal.meta_id && t.usuario_id === uid && t.titulo === taskTitle
          );

          if (!alreadyExists) {
            await dbService.createTask({
              usuario_id: uid,
              familia_id: goal.familia_id,
              meta_id: goal.meta_id,
              titulo: taskTitle,
              categoria: (['Hogar', 'Estudio', 'Salud', 'Personal'].includes(goal.categoria) ? goal.categoria : 'Otros') as any,
              hora_programada: goal.hora_sugerida || '09:00',
              tiempo_estimado_min: 30,
              origen: 'meta_automatica',
              visible_familia: goal.visible_familia
            });
          }
        }
      }
    }
  },

  evaluarCumplimientoMetas: async (familia_id: string) => {
    const familyGoals = localDatabase.metas.filter(m => m.familia_id === familia_id);

    const grantRewardUnlockIfEligible = async (goal: Meta, targetUid: string) => {
      if (!goal.recompensa_activa && !goal.recompensa_id) return;
      const reward = localDatabase.recompensasPlantillas.find(r => r.recompensa_id === goal.recompensa_id);
      if (!reward) return;

      const alreadyUnlocked = localDatabase.desbloqueosUsuarios.some(
        u => u.usuario_id === targetUid && u.origen_meta_id === goal.meta_id
      );

      if (!alreadyUnlocked) {
        let unlockType: 'bot' | 'tiempo_extra' | 'generico' = 'generico';
        let unlockVal = reward.titulo;

        if (reward.tipo === 'desbloqueo_bot') {
          unlockType = 'bot';
          unlockVal = reward.bot_id_desbloqueado || 'vikram';
        } else if (reward.tipo === 'tiempo_extra_juegos') {
          unlockType = 'tiempo_extra';
          unlockVal = String(reward.minutos_extra || 30);
        }

        const newUnlock: DesbloqueoUsuario = {
          desbloqueo_id: `unlock_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
          usuario_id: targetUid,
          familia_id: goal.familia_id,
          tipo: unlockType,
          valor: unlockVal,
          origen_meta_id: goal.meta_id,
          fecha_obtenido: new Date().toISOString().split('T')[0],
          visto: false
        };

        localDatabase.desbloqueosUsuarios.push(newUnlock);
        if (isFirestoreEnabled && db) {
          try {
            await db.collection("desbloqueos_usuarios").doc(newUnlock.desbloqueo_id).set(newUnlock);
          } catch (e) {
            console.error("[Firestore grantRewardUnlock Error]", e);
          }
        }
      }
    };

    for (const goal of familyGoals) {
      const goalTasks = localDatabase.tareas.filter(t => t.meta_id === goal.meta_id);

      if (goal.tipo === 'individual') {
        const userTasks = goalTasks.filter(t => t.usuario_id === goal.usuario_id);
        const total = userTasks.length;
        const completed = userTasks.filter(t => t.estado === 'completada').length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        goal.porcentaje_semanal = pct;

        if (pct >= 100) {
          await grantRewardUnlockIfEligible(goal, goal.usuario_id);
        } else if (goal.consecuencias_activas) {
          const alreadyHasPending = localDatabase.consecuenciasPendientes.some(
            p => p.usuario_id === goal.usuario_id && p.familia_id === familia_id && p.estado === 'pendiente'
          );

          if (!alreadyHasPending) {
            const plantilla = localDatabase.consecuenciasPlantillas.find(cp => cp.consecuencia_id === goal.consecuencia_id);
            const consTitle = plantilla ? plantilla.titulo : "Lavar los platos de la cena";

            if (goal.requiere_aprobacion_adulto) {
              const newPendiente: ConsecuenciaPendiente = {
                pendiente_id: `pendiente_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
                familia_id: goal.familia_id,
                usuario_id: goal.usuario_id,
                meta_id: goal.meta_id,
                meta_titulo: goal.titulo,
                periodo: "Semana actual",
                cumplimiento: `${completed}/${goal.frecuencia_objetivo || total}`,
                consecuencia_sugerida_id: goal.consecuencia_id,
                consecuencia_titulo: consTitle,
                fecha_creacion: new Date().toISOString().split('T')[0],
                estado: 'pendiente'
              };
              localDatabase.consecuenciasPendientes.push(newPendiente);
              if (isFirestoreEnabled && db) {
                await db.collection("consecuencias_pendientes").doc(newPendiente.pendiente_id).set(newPendiente);
              }
            } else {
              await dbService.createTask({
                usuario_id: goal.usuario_id,
                familia_id: goal.familia_id,
                meta_id: goal.meta_id,
                titulo: `Consecuencia: ${consTitle}`,
                categoria: 'Hogar',
                hora_programada: '18:00',
                tiempo_estimado_min: plantilla?.tiempo_estimado_min || 30,
                origen: 'consecuencia',
                visible_familia: true
              });
            }
          }
        }
      } else {
        const miembros = goal.miembros_asignados && goal.miembros_asignados.length > 0
          ? goal.miembros_asignados
          : (localDatabase.familias.find(f => f.familia_id === familia_id)?.miembros || [goal.usuario_id]);

        const progreso_por_miembro = [];
        let grandTotalPct = 0;

        for (const uid of miembros) {
          const memberTasks = goalTasks.filter(t => t.usuario_id === uid);
          const total = memberTasks.length;
          const completed = memberTasks.filter(t => t.estado === 'completada').length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          grandTotalPct += pct;

          progreso_por_miembro.push({
            usuario_id: uid,
            periodos_cumplidos: completed,
            periodos_totales: goal.frecuencia_objetivo || total || 1,
            porcentaje: pct
          });

          if (pct >= 100) {
            await grantRewardUnlockIfEligible(goal, uid);
          } else if (goal.consecuencias_activas) {
            const alreadyHasPending = localDatabase.consecuenciasPendientes.some(
              p => p.usuario_id === uid && p.familia_id === familia_id && p.estado === 'pendiente'
            );

            if (!alreadyHasPending) {
              const plantilla = localDatabase.consecuenciasPlantillas.find(cp => cp.consecuencia_id === goal.consecuencia_id);
              const consTitle = plantilla ? plantilla.titulo : "Lavar los platos de la cena";

              if (goal.requiere_aprobacion_adulto) {
                const newPendiente: ConsecuenciaPendiente = {
                  pendiente_id: `pendiente_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
                  familia_id: goal.familia_id,
                  usuario_id: uid,
                  meta_id: goal.meta_id,
                  meta_titulo: goal.titulo,
                  periodo: "Semana actual",
                  cumplimiento: `${completed}/${goal.frecuencia_objetivo || total}`,
                  consecuencia_sugerida_id: goal.consecuencia_id,
                  consecuencia_titulo: consTitle,
                  fecha_creacion: new Date().toISOString().split('T')[0],
                  estado: 'pendiente'
                };
                localDatabase.consecuenciasPendientes.push(newPendiente);
                if (isFirestoreEnabled && db) {
                  await db.collection("consecuencias_pendientes").doc(newPendiente.pendiente_id).set(newPendiente);
                }
              } else {
                await dbService.createTask({
                  usuario_id: uid,
                  familia_id: goal.familia_id,
                  meta_id: goal.meta_id,
                  titulo: `Consecuencia: ${consTitle}`,
                  categoria: 'Hogar',
                  hora_programada: '18:00',
                  tiempo_estimado_min: plantilla?.tiempo_estimado_min || 30,
                  origen: 'consecuencia',
                  visible_familia: true
                });
              }
            }
          }
        }

        goal.progreso_por_miembro = progreso_por_miembro;
        goal.porcentaje_semanal = miembros.length > 0 ? Math.round(grandTotalPct / miembros.length) : 0;
      }

      if (isFirestoreEnabled && db) {
        await db.collection("metas").doc(goal.meta_id).set(goal, { merge: true });
      }
    }

    return { success: true };
  },

  createConsequenceTemplate: async (plantilla: Partial<ConsecuenciaPlantilla>) => {
    const consecuencia_id = `plantilla_${Date.now()}`;
    const newPlantilla: ConsecuenciaPlantilla = {
      consecuencia_id,
      familia_id: plantilla.familia_id || "fam_kevin_admin",
      titulo: plantilla.titulo!,
      descripcion: plantilla.descripcion || "",
      categoria: plantilla.categoria || "Hogar",
      tiempo_estimado_min: Number(plantilla.tiempo_estimado_min) || 30,
      creado_por: plantilla.creado_por || "kevin-admin-uid"
    };

    if (isFirestoreEnabled && db) {
      try {
        await db.collection("consecuencias_plantillas").doc(consecuencia_id).set(newPlantilla);
      } catch (e) {
        console.error("[Firestore createConsequenceTemplate Error]", e);
      }
    }

    localDatabase.consecuenciasPlantillas.push(newPlantilla);
    return { success: true, newPlantilla };
  },

  resolvePendingConsequence: async (pendiente_id: string, action: 'assign' | 'forgive') => {
    const idx = localDatabase.consecuenciasPendientes.findIndex(p => p.pendiente_id === pendiente_id);
    if (idx !== -1) {
      const item = localDatabase.consecuenciasPendientes[idx];
      item.estado = action === 'assign' ? 'asignada' : 'perdonada';

      if (action === 'assign') {
        const plantilla = localDatabase.consecuenciasPlantillas.find(c => c.consecuencia_id === item.consecuencia_sugerida_id);
        const consTitle = item.consecuencia_titulo || plantilla?.titulo || "Tarea de Consecuencia";

        await dbService.createTask({
          usuario_id: item.usuario_id,
          familia_id: item.familia_id,
          meta_id: item.meta_id,
          titulo: `Consecuencia: ${consTitle}`,
          categoria: 'Hogar',
          hora_programada: '18:00',
          tiempo_estimado_min: plantilla?.tiempo_estimado_min || 30,
          origen: 'consecuencia',
          visible_familia: true
        });
      }

      if (isFirestoreEnabled && db) {
        await db.collection("consecuencias_pendientes").doc(pendiente_id).update({
          estado: item.estado
        });
      }

      return { success: true, estado: item.estado };
    }
    throw new Error("Consecuencia pendiente no encontrada.");
  },

  createJournalEntry: async (entry: Partial<DiarioEntrada>) => {
    const entrada_id = `entrada_${Date.now()}`;
    const newEntry: DiarioEntrada = {
      entrada_id,
      usuario_id: entry.usuario_id!,
      texto: entry.texto!,
      emocion: entry.emocion!,
      visible_familia: entry.visible_familia !== false,
      fecha: entry.fecha || new Date().toISOString().split('T')[0],
      reacciones: []
    };

    if (isFirestoreEnabled && db) {
      try {
        await db.collection("diario").doc(entrada_id).set(newEntry);
        return { success: true, newEntry };
      } catch (e) {
        console.error("[Firestore createJournalEntry Error]", e);
      }
    }

    localDatabase.diario.unshift(newEntry);
    return { success: true, newEntry };
  },

  addJournalReaction: async (entrada_id: string, usuario_id: string, emoji: string) => {
    const entry = localDatabase.diario.find(d => d.entrada_id === entrada_id);
    if (entry) {
      if (!entry.reacciones) entry.reacciones = [];
      const userPrevIdx = entry.reacciones.findIndex(r => r.usuario_id === usuario_id);
      
      if (userPrevIdx !== -1 && entry.reacciones[userPrevIdx].emoji === emoji) {
        // Toggle off if same emoji clicked again
        entry.reacciones.splice(userPrevIdx, 1);
      } else if (userPrevIdx !== -1) {
        // Change reaction emoji
        entry.reacciones[userPrevIdx] = { usuario_id, emoji, fecha: new Date().toISOString() };
      } else {
        // Add new reaction
        entry.reacciones.push({ usuario_id, emoji, fecha: new Date().toISOString() });
      }

      if (isFirestoreEnabled && db) {
        try {
          await db.collection("diario").doc(entrada_id).update({
            reacciones: entry.reacciones
          });
        } catch (e) {
          console.error("[Firestore addJournalReaction Error]", e);
        }
      }
      return { success: true, reacciones: entry.reacciones };
    }
    throw new Error("Entrada de diario no encontrada.");
  },

  updateUserProfile: async (uid: string, nombre?: string, avatar_url?: string, role?: string, familia_id?: string) => {
    const updates: any = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (role !== undefined) updates.role = role;
    if (familia_id !== undefined) updates.familia_id = familia_id;

    if (isFirestoreEnabled && db) {
      try {
        const userRef = db.collection("usuarios").doc(uid);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          await userRef.update(updates);
        } else {
          // Provision new user
          const newUser: Usuario = {
            uid,
            nombre: nombre || "Nuevo Usuario",
            avatar_url: avatar_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop",
            familia_id: familia_id || "",
            racha_actual: 0,
            puntos: 0,
            configuracion_privacidad: { visible_familia_por_defecto: true }
          };
          if (role) (newUser as any).role = role;
          await userRef.set(newUser);
        }
        const updatedSnap = await userRef.get();
        return { success: true, updatedUser: updatedSnap.data() };
      } catch (e) {
        console.error("[Firestore updateUserProfile Error]", e);
      }
    }

    const userIndex = localDatabase.usuarios.findIndex(u => u.uid === uid);
    if (userIndex !== -1) {
      if (nombre !== undefined) localDatabase.usuarios[userIndex].nombre = nombre;
      if (avatar_url !== undefined) localDatabase.usuarios[userIndex].avatar_url = avatar_url;
      if (role !== undefined) (localDatabase.usuarios[userIndex] as any).role = role;
      if (familia_id !== undefined) localDatabase.usuarios[userIndex].familia_id = familia_id;
      return { success: true, updatedUser: localDatabase.usuarios[userIndex] };
    } else {
      // Create local user
      const newUser: Usuario = {
        uid,
        nombre: nombre || "Nuevo Usuario",
        avatar_url: avatar_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop",
        familia_id: familia_id || "",
        racha_actual: 0,
        puntos: 0,
        configuracion_privacidad: { visible_familia_por_defecto: true }
      };
      if (role) (newUser as any).role = role;
      localDatabase.usuarios.push(newUser);
      return { success: true, updatedUser: newUser };
    }
  },

  suspendUser: async (uid: string, suspend: boolean) => {
    if (isFirestoreEnabled && db) {
      try {
        const userRef = db.collection("usuarios").doc(uid);
        await userRef.update({ estado: suspend ? 'suspendido' : 'activo' });
        return { success: true };
      } catch (e) {
        console.error("[Firestore suspendUser Error]", e);
        throw e;
      }
    }
    const userIndex = localDatabase.usuarios.findIndex(u => u.uid === uid);
    if (userIndex !== -1) {
      localDatabase.usuarios[userIndex].estado = suspend ? 'suspendido' : 'activo';
      return { success: true };
    }
    throw new Error("Usuario no encontrado.");
  },

  deleteUser: async (uid: string) => {
    if (isFirestoreEnabled && db) {
      try {
        const batch = db.batch();
        
        // Delete user's tasks
        const tasksSnap = await db.collection("tareas_diarias").where("usuario_id", "==", uid).get();
        tasksSnap.forEach(doc => batch.delete(doc.ref));

        // Delete user's goals
        const goalsSnap = await db.collection("metas").where("usuario_id", "==", uid).get();
        goalsSnap.forEach(doc => batch.delete(doc.ref));

        // Delete user's journal entries
        const journalSnap = await db.collection("diario").where("usuario_id", "==", uid).get();
        journalSnap.forEach(doc => batch.delete(doc.ref));

        // Delete user profile
        batch.delete(db.collection("usuarios").doc(uid));

        await batch.commit();
        return { success: true };
      } catch (e) {
        console.error("[Firestore deleteUser Error]", e);
        throw e;
      }
    }

    // Local fallback
    localDatabase.usuarios = localDatabase.usuarios.filter(u => u.uid !== uid);
    localDatabase.tareas = localDatabase.tareas.filter(t => t.usuario_id !== uid);
    localDatabase.metas = localDatabase.metas.filter(m => m.usuario_id !== uid);
    localDatabase.diario = localDatabase.diario.filter(d => d.usuario_id !== uid);
    return { success: true };
  },

  createFamily: async (uid: string, nombreFamilia: string) => {
    const familia_id = `fam_${Date.now()}`;
    const codigo_invitacion = `CODE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const newFamily: Familia = {
      familia_id,
      nombre: nombreFamilia,
      codigo_invitacion,
      miembros: [uid]
    };

    if (isFirestoreEnabled && db) {
      try {
        await db.collection("familias").doc(familia_id).set(newFamily);
        // Link user to this family
        await db.collection("usuarios").doc(uid).update({ familia_id });
        return { success: true, newFamily };
      } catch (e) {
        console.error("[Firestore createFamily Error]", e);
      }
    }

    localDatabase.familias.push(newFamily);
    const userIndex = localDatabase.usuarios.findIndex(u => u.uid === uid);
    if (userIndex !== -1) {
      localDatabase.usuarios[userIndex].familia_id = familia_id;
    }
    return { success: true, newFamily };
  },

  joinFamilyByCode: async (uid: string, code: string) => {
    const trimmedCode = code.trim().toUpperCase();
    
    if (isFirestoreEnabled && db) {
      try {
        const familiesSnap = await db.collection("familias").where("codigo_invitacion", "==", trimmedCode).limit(1).get();
        if (!familiesSnap.empty) {
          const familyDoc = familiesSnap.docs[0];
          const familyData = familyDoc.data() as Familia;
          
          await db.collection("usuarios").doc(uid).update({ familia_id: familyData.familia_id });
          return { success: true, family: familyData };
        } else {
          throw new Error("Código de invitación no encontrado.");
        }
      } catch (e: any) {
        console.error("[Firestore joinFamily Error]", e);
        throw new Error(e.message || "Error al unirse a la familia.");
      }
    }

    const family = localDatabase.familias.find(f => f.codigo_invitacion.toUpperCase() === trimmedCode);
    if (family) {
      const userIndex = localDatabase.usuarios.findIndex(u => u.uid === uid);
      if (userIndex !== -1) {
        localDatabase.usuarios[userIndex].familia_id = family.familia_id;
      }
      return { success: true, family };
    }
    throw new Error("Código de invitación no válido.");
  },

  checkOverdueTasks: async () => {
    let updatedCount = 0;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (isFirestoreEnabled && db) {
      try {
        const querySnapshot = await db.collection("tareas_diarias")
          .where("estado", "in", ["pendiente", "en_progreso"])
          .get();

        const batch = db.batch();
        querySnapshot.forEach(doc => {
          const data = doc.data() as TareaDiaria;
          const [hora, min] = data.hora_programada.split(":").map(Number);
          const taskMinutes = hora * 60 + min;
          const estimatedEndMinutes = taskMinutes + (data.tiempo_estimado_min || 30);

          if (currentMinutes > estimatedEndMinutes) {
            batch.update(doc.ref, {
              estado: "vencido",
              ultima_actualizacion: FieldValue.serverTimestamp()
            });
            updatedCount++;
          }
        });

        if (updatedCount > 0) {
          await batch.commit();
        }
        return { success: true, updatedCount };
      } catch (e) {
        console.error("[Firestore checkOverdueTasks Error]", e);
      }
    }

    localDatabase.tareas.forEach((task, index) => {
      if (task.estado === 'pendiente' || task.estado === 'en_progreso') {
        const [hora, min] = task.hora_programada.split(':').map(Number);
        const taskMinutes = hora * 60 + min;
        const estimatedEndMinutes = taskMinutes + task.tiempo_estimado_min;

        if (currentMinutes > estimatedEndMinutes) {
          localDatabase.tareas[index].estado = 'vencido';
          localDatabase.tareas[index].ultima_actualizacion = new Date().toISOString();
          updatedCount++;
        }
      }
    });

    return { success: true, updatedCount };
  },

  addPointsToUser: async (uid: string, points: number) => {
    if (isFirestoreEnabled && db) {
      try {
        const userRef = db.collection("usuarios").doc(uid);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          const currentPoints = (userSnap.data() as Usuario).puntos || 0;
          await userRef.update({ puntos: currentPoints + points });
          return { success: true, puntos: currentPoints + points };
        }
      } catch (e) {
        console.error("[Firestore addPointsToUser Error]", e);
      }
    }

    const userIndex = localDatabase.usuarios.findIndex(u => u.uid === uid);
    if (userIndex !== -1) {
      localDatabase.usuarios[userIndex].puntos = (localDatabase.usuarios[userIndex].puntos || 0) + points;
      return { success: true, puntos: localDatabase.usuarios[userIndex].puntos };
    }
    return { success: false, error: "Usuario no encontrado" };
  },

  getStepsForFamily: async (familia_id: string, fecha: string) => {
    if (isFirestoreEnabled && db) {
      try {
        const familyDoc = await db.collection("familias").doc(familia_id).get();
        if (familyDoc.exists) {
          const members = (familyDoc.data() as Familia).miembros || [];
          if (members.length === 0) return {};

          const stepsSnap = await db.collection("pasos_diarios")
            .where("usuario_id", "in", members)
            .where("fecha", "==", fecha)
            .get();

          const stepsMap: Record<string, number> = {};
          // Initialize members with 0
          members.forEach(m => { stepsMap[m] = 0; });
          
          stepsSnap.forEach(doc => {
            const data = doc.data();
            stepsMap[data.usuario_id] = data.pasos || 0;
          });
          return stepsMap;
        }
      } catch (e) {
        console.error("[Firestore getStepsForFamily Error]", e);
      }
    }

    // Local fallback
    const family = localDatabase.familias.find(f => f.familia_id === familia_id);
    const stepsMap: Record<string, number> = {};
    if (family) {
      family.miembros.forEach(m => {
        const record = localSteps.find(s => s.usuario_id === m && s.fecha === fecha);
        stepsMap[m] = record ? record.pasos : 0;
      });
    }
    return stepsMap;
  },

  logSteps: async (usuario_id: string, pasos: number, fecha: string) => {
    if (isFirestoreEnabled && db) {
      try {
        const docId = `${usuario_id}_${fecha}`;
        await db.collection("pasos_diarios").doc(docId).set({
          usuario_id,
          pasos,
          fecha,
          actualizado_en: FieldValue.serverTimestamp()
        }, { merge: true });
        return { success: true };
      } catch (e) {
        console.error("[Firestore logSteps Error]", e);
      }
    }

    // Local fallback
    const idx = localSteps.findIndex(s => s.usuario_id === usuario_id && s.fecha === fecha);
    if (idx !== -1) {
      localSteps[idx].pasos = pasos;
    } else {
      localSteps.push({ usuario_id, pasos, fecha });
    }
    return { success: true };
  },

  getGameProgress: async (usuario_id: string) => {
    if (isFirestoreEnabled && db) {
      try {
        const snap = await db.collection("progreso_juegos")
          .where("usuario_id", "==", usuario_id)
          .get();

        const progress: Record<string, { puntaje: number; mejor_tiempo?: number }> = {};
        snap.forEach(doc => {
          const data = doc.data();
          progress[data.juego] = {
            puntaje: data.puntaje || 0,
            mejor_tiempo: data.mejor_tiempo
          };
        });
        return progress;
      } catch (e) {
        console.error("[Firestore getGameProgress Error]", e);
      }
    }

    // Local fallback
    const progress: Record<string, { puntaje: number; mejor_tiempo?: number }> = {};
    localGameProgress.forEach(p => {
      if (p.usuario_id === usuario_id) {
        progress[p.juego] = {
          puntaje: p.puntaje,
          mejor_tiempo: p.mejor_tiempo
        };
      }
    });
    return progress;
  },

  saveGameProgress: async (usuario_id: string, game: string, score: number, bestTime?: number) => {
    if (isFirestoreEnabled && db) {
      try {
        const docId = `${usuario_id}_${game}`;
        const updates: any = {
          usuario_id,
          juego: game,
          puntaje: score,
          actualizado_en: FieldValue.serverTimestamp()
        };
        if (bestTime !== undefined) {
          updates.mejor_tiempo = bestTime;
        }
        await db.collection("progreso_juegos").doc(docId).set(updates, { merge: true });
        return { success: true };
      } catch (e) {
        console.error("[Firestore saveGameProgress Error]", e);
      }
    }

    // Local fallback
    const idx = localGameProgress.findIndex(p => p.usuario_id === usuario_id && p.juego === game);
    if (idx !== -1) {
      localGameProgress[idx].puntaje = score;
      if (bestTime !== undefined) {
        localGameProgress[idx].mejor_tiempo = bestTime;
      }
    } else {
      localGameProgress.push({
        usuario_id,
        juego: game,
        puntaje: score,
        mejor_tiempo: bestTime
      });
    }
    return { success: true };
  },

  createRewardTemplate: async (plantilla: Partial<RecompensaPlantilla>) => {
    const recompensa_id = `recompensa_${Date.now()}`;
    const newPlantilla: RecompensaPlantilla = {
      recompensa_id,
      familia_id: plantilla.familia_id || "fam_kevin_admin",
      titulo: plantilla.titulo!,
      descripcion: plantilla.descripcion || "",
      tipo: plantilla.tipo || "generica",
      bot_id_desbloqueado: plantilla.bot_id_desbloqueado,
      minutos_extra: plantilla.minutos_extra
    };

    if (isFirestoreEnabled && db) {
      try {
        await db.collection("recompensas_plantillas").doc(recompensa_id).set(newPlantilla);
      } catch (e) {
        console.error("[Firestore createRewardTemplate Error]", e);
      }
    }

    localDatabase.recompensasPlantillas.push(newPlantilla);
    return { success: true, newPlantilla };
  },

  markUnlockAsSeen: async (desbloqueo_id: string) => {
    if (isFirestoreEnabled && db) {
      try {
        await db.collection("desbloqueos_usuarios").doc(desbloqueo_id).update({ visto: true });
      } catch (e) {
        console.error("[Firestore markUnlockAsSeen Error]", e);
      }
    }

    const item = localDatabase.desbloqueosUsuarios.find(u => u.desbloqueo_id === desbloqueo_id);
    if (item) {
      item.visto = true;
    }
    return { success: true };
  }
};
