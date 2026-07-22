import { initializeApp, getApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { TareaDiaria, Meta, DiarioEntrada, Usuario, Familia } from "./src/types";

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
let localDatabase = {
  usuarios: [...initialUsuarios],
  metas: [...initialMetas],
  tareas: [...initialTareas],
  diario: [...initialDiario],
  familias: [...initialFamilias]
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

        const usuarios: Usuario[] = [];
        const metas: Meta[] = [];
        const tareas: TareaDiaria[] = [];
        const diario: DiarioEntrada[] = [];
        const familias: Familia[] = [];

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

        // Sort journal entries by date/time (unshifted / latest first)
        diario.sort((a, b) => b.fecha.localeCompare(a.fecha));

        return { usuarios, metas, tareas, diario, familias };
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
      familias: [...initialFamilias]
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

  createTask: async (task: Partial<TareaDiaria>) => {
    const tarea_id = `tarea_${Date.now()}`;
    const newTask: TareaDiaria = {
      tarea_id,
      usuario_id: task.usuario_id!,
      meta_id: task.meta_id || "",
      titulo: task.titulo!,
      categoria: task.categoria || "Otros",
      es_prioridad_alta: !!task.es_prioridad_alta,
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
    const newGoal: Meta = {
      meta_id,
      usuario_id: goal.usuario_id!,
      titulo: goal.titulo!,
      categoria: goal.categoria!,
      fecha_limite: goal.fecha_limite || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      porcentaje_semanal: 0,
      visible_familia: goal.visible_familia !== false
    };

    if (isFirestoreEnabled && db) {
      try {
        await db.collection("metas").doc(meta_id).set(newGoal);
        return { success: true, newGoal };
      } catch (e) {
        console.error("[Firestore createGoal Error]", e);
      }
    }

    localDatabase.metas.push(newGoal);
    return { success: true, newGoal };
  },

  createJournalEntry: async (entry: Partial<DiarioEntrada>) => {
    const entrada_id = `entrada_${Date.now()}`;
    const newEntry: DiarioEntrada = {
      entrada_id,
      usuario_id: entry.usuario_id!,
      texto: entry.texto!,
      emocion: entry.emocion!,
      visible_familia: entry.visible_familia !== false,
      fecha: entry.fecha || new Date().toISOString().split('T')[0]
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
  }
};
