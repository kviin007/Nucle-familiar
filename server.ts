import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { TareaDiaria, Meta, DiarioEntrada, Usuario, Familia } from "./src/types";

// In-Memory Database State representing the initial mockups
const initialUsuarios: Usuario[] = [
  {
    uid: "user_maria",
    nombre: "Maria",
    avatar_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDOMJAP3t5bp1oJYXlFGQBDX_NAoqRTgAJ8zftLuakcfkO0VctxmpjH4gTDBS6EocoQN4hhf3tYKnGCgfuTHbMuHl8WasVFEnyrEcTRrK8p1Cjb0EHyT2mYTxWiENN1obGn22tkzCznaRmQ6-mytpjFN94bMgci4Ex74C2E086_0Tpu_cEW9AN_6d0HZDuHPLGYOJlytMfcnBYVKKaAGdcTObLbJkgP7Zi6FuUWC9HIwMdnL0QT33S1gmIQA8hBwDdLm_b4fr8BGxM",
    familia_id: "fam_garcia",
    racha_actual: 12,
    puntos: 850,
    configuracion_privacidad: { visible_familia_por_defecto: true }
  },
  {
    uid: "user_leo",
    nombre: "Leo",
    avatar_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBTlGZ5vfYi3NLy08_hbdozUnHkrte-6jre_i9zAF7nigsszLMwB3ta-dMgnBF3XNGBmZlzeufy3xs7fwYf8X3LFioX_qCjo32ft2t0ZmeKZ0wcb6mXRQWmMqhWrYIgvQ5DvNA-9VS6AjpbunbATJCD-HCQ3qFlOaCXSYOM9AdhDTdjQbLL5wIox2EY6rbfWa1i-p5LPw1AGl7E281c2qv663Xbx9uYbK9PC_yv6OKOctc_pX0VohRxf8wGb6bP1sBgYj3TtZw3rmg",
    familia_id: "fam_garcia",
    racha_actual: 14,
    puntos: 1240,
    configuracion_privacidad: { visible_familia_por_defecto: true }
  },
  {
    uid: "user_mia",
    nombre: "Mia",
    avatar_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuD8Ji9YYut7gh-sIeqkg10HmPRgPxba7aLM99Whx4Tu8WoSBu8Hy1bKRVUtp--6UgDh5Gz9Y25p-qpXSE3c5jJb-EZL8E8rxG6BqjCQSMtEssbJvSeXsOaHcXWGW96R0Nz1_MlUYJKukbbTd80cU5i9HRIYa9ZvfVM6TCXtpvDOAWSP3sAdb9Q-X4wKoum-svvbV3Gx8Yi4zq9bto03Czee3Te-bnV6hf16knEiii2Z2ePNMj6_WX6Gkm4kGTa2B81H386g7Q0uH60",
    familia_id: "fam_garcia",
    racha_actual: 5,
    puntos: 650,
    configuracion_privacidad: { visible_familia_por_defecto: true }
  },
  {
    uid: "user_dad",
    nombre: "Dad",
    avatar_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBfu5FuLdnUtbMomHC98DEJ0HC6K0yFKAPkvNHOKudotUCYT0aGjE1VixmB4i1Jl2V4v4PQLkGKI-tEJcL7OMJklGyo-F1C13fDWX_LsuPUeXyQ3yt-lTs_qDF4EnzqEICDlEeFNlmz4zJo5JGmNpJSnYKZ8cSPicM75t4m-8xQvuP7uP1c9rccmMZlRwm4TF9OVaZaywRJN6QIsgxcXLQuSMsViCFxndzub86oeXyvFD4N2C5lzqrqNZRF-5b_RsGT96Sa7M5iQw4",
    familia_id: "fam_garcia",
    racha_actual: 2,
    puntos: 340,
    configuracion_privacidad: { visible_familia_por_defecto: true }
  }
];

const initialMetas: Meta[] = [
  {
    meta_id: "meta_1",
    usuario_id: "user_leo",
    titulo: "Hacer ejercicio",
    categoria: "Salud",
    fecha_limite: "2026-12-31",
    porcentaje_semanal: 75,
    visible_familia: true
  },
  {
    meta_id: "meta_2",
    usuario_id: "user_mia",
    titulo: "Leer 20 mins",
    categoria: "Estudio",
    fecha_limite: "2026-12-31",
    porcentaje_semanal: 50,
    visible_familia: true
  },
  {
    meta_id: "meta_3",
    usuario_id: "user_dad",
    titulo: "Ahorro Viaje",
    categoria: "Finanzas",
    fecha_limite: "2026-10-15",
    porcentaje_semanal: 20,
    visible_familia: true
  }
];

const initialTareas: TareaDiaria[] = [
  {
    tarea_id: "tarea_1",
    usuario_id: "user_maria",
    meta_id: "meta_1",
    titulo: "Desayuno juntos",
    hora_programada: "07:30",
    tiempo_estimado_min: 30,
    estado: "completada",
    ultima_actualizacion: new Date().toISOString(),
    visible_familia: true
  },
  {
    tarea_id: "tarea_2",
    usuario_id: "user_maria",
    titulo: "Ayudar con la tarea",
    hora_programada: "16:00",
    tiempo_estimado_min: 45,
    estado: "en_progreso",
    ultima_actualizacion: new Date().toISOString(),
    visible_familia: true
  },
  {
    tarea_id: "tarea_3",
    usuario_id: "user_maria",
    titulo: "Cena familiar",
    hora_programada: "19:00",
    tiempo_estimado_min: 60,
    estado: "pendiente",
    ultima_actualizacion: new Date().toISOString(),
    visible_familia: true
  },
  {
    tarea_id: "tarea_4",
    usuario_id: "user_leo",
    titulo: "Llevar a Leo al colegio",
    hora_programada: "08:30",
    tiempo_estimado_min: 20,
    estado: "vencido",
    ultima_actualizacion: new Date().toISOString(),
    visible_familia: true
  },
  {
    tarea_id: "tarea_5",
    usuario_id: "user_maria",
    titulo: "Preparar desayunos",
    hora_programada: "08:00",
    tiempo_estimado_min: 25,
    estado: "pendiente",
    ultima_actualizacion: new Date().toISOString(),
    visible_familia: true
  },
  {
    tarea_id: "tarea_6",
    usuario_id: "user_mia",
    titulo: "Comprar víveres",
    hora_programada: "14:00",
    tiempo_estimado_min: 30,
    estado: "completada",
    ultima_actualizacion: new Date().toISOString(),
    visible_familia: true
  }
];

const initialDiario: DiarioEntrada[] = [
  {
    entrada_id: "entrada_1",
    usuario_id: "user_maria",
    texto: "Un día increíble compartiendo un picnic con la familia. Los niños se divirtieron mucho.",
    emocion: "Great",
    visible_familia: true,
    fecha: "2026-07-19"
  },
  {
    entrada_id: "entrada_2",
    usuario_id: "user_leo",
    texto: "Hoy jugamos trivia y gané la medalla de explorer. ¡Fue super divertido!",
    emocion: "Good",
    visible_familia: true,
    fecha: "2026-07-18"
  }
];

// Server state managers
let database = {
  usuarios: [...initialUsuarios],
  metas: [...initialMetas],
  tareas: [...initialTareas],
  diario: [...initialDiario]
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Reset Database State
  app.post("/api/reset", (req, res) => {
    database = {
      usuarios: [...initialUsuarios],
      metas: [...initialMetas],
      tareas: [...initialTareas],
      diario: [...initialDiario]
    };
    res.json({ success: true, message: "Base de datos restaurada correctamente." });
  });

  // API Route: Get State
  app.get("/api/state", (req, res) => {
    res.json(database);
  });

  // API Route: Toggle Task State
  app.post("/api/tasks/toggle", (req, res) => {
    const { tarea_id } = req.body;
    const taskIndex = database.tareas.findIndex(t => t.tarea_id === tarea_id);
    if (taskIndex !== -1) {
      const current = database.tareas[taskIndex].estado;
      let nextState: 'pendiente' | 'en_progreso' | 'completada' | 'vencido' = 'pendiente';
      if (current === 'pendiente') {
        nextState = 'en_progreso';
      } else if (current === 'en_progreso') {
        nextState = 'completada';
      } else if (current === 'completada') {
        nextState = 'pendiente';
      } else {
        nextState = 'pendiente'; // default reset from overdue
      }
      database.tareas[taskIndex].estado = nextState;
      database.tareas[taskIndex].ultima_actualizacion = new Date().toISOString();

      // Recalculate stats for the owner
      const userId = database.tareas[taskIndex].usuario_id;
      const userTasks = database.tareas.filter(t => t.usuario_id === userId);
      const completed = userTasks.filter(t => t.estado === 'completada').length;
      const total = userTasks.length;
      const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Give points when a task is completed!
      if (nextState === 'completada') {
        const userIndex = database.usuarios.findIndex(u => u.uid === userId);
        if (userIndex !== -1) {
          database.usuarios[userIndex].puntos += 50; // Add 50 points
        }
      }

      res.json({ success: true, updatedTask: database.tareas[taskIndex], progressPercent });
    } else {
      res.status(404).json({ error: "Tarea no encontrada." });
    }
  });

  // API Route: Create Task
  app.post("/api/tasks/create", (req, res) => {
    const { titulo, usuario_id, hora_programada, tiempo_estimado_min, visible_familia, meta_id } = req.body;
    if (!titulo || !usuario_id) {
      return res.status(400).json({ error: "Título y destinatario son obligatorios." });
    }

    const newTask: TareaDiaria = {
      tarea_id: `tarea_${Date.now()}`,
      usuario_id,
      meta_id,
      titulo,
      hora_programada: hora_programada || "12:00",
      tiempo_estimado_min: Number(tiempo_estimado_min) || 30,
      estado: "pendiente",
      ultima_actualizacion: new Date().toISOString(),
      visible_familia: visible_familia !== false
    };

    database.tareas.push(newTask);
    res.json({ success: true, newTask });
  });

  // API Route: Create Goal
  app.post("/api/goals/create", (req, res) => {
    const { titulo, categoria, usuario_id } = req.body;
    if (!titulo || !categoria || !usuario_id) {
      return res.status(400).json({ error: "Título, categoría y usuario son obligatorios." });
    }

    const newGoal: Meta = {
      meta_id: `meta_${Date.now()}`,
      usuario_id,
      titulo,
      categoria,
      fecha_limite: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0], // 30 days from now
      porcentaje_semanal: 0,
      visible_familia: true
    };

    database.metas.push(newGoal);
    res.json({ success: true, newGoal });
  });

  // API Route: Save Journal Entry
  app.post("/api/journal/create", (req, res) => {
    const { texto, emocion, visible_familia, usuario_id } = req.body;
    if (!texto || !emocion || !usuario_id) {
      return res.status(400).json({ error: "Texto, emoción y usuario son obligatorios." });
    }

    const newEntry: DiarioEntrada = {
      entrada_id: `entrada_${Date.now()}`,
      usuario_id,
      texto,
      emocion,
      visible_familia: visible_familia !== false,
      fecha: new Date().toISOString().split('T')[0]
    };

    database.diario.unshift(newEntry); // Prepend to show first
    res.json({ success: true, newEntry });
  });

  // API Route: Update User Profile
  app.post("/api/user/update", (req, res) => {
    const { uid, nombre, avatar_url } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "UID de usuario es obligatorio." });
    }
    const userIndex = database.usuarios.findIndex(u => u.uid === uid);
    if (userIndex !== -1) {
      if (nombre !== undefined) database.usuarios[userIndex].nombre = nombre;
      if (avatar_url !== undefined) database.usuarios[userIndex].avatar_url = avatar_url;
      res.json({ success: true, updatedUser: database.usuarios[userIndex] });
    } else {
      res.status(404).json({ error: "Usuario no encontrado." });
    }
  });

  // Scheduled check simulation endpoint: emulates the cloud function to mark overdue tasks
  app.post("/api/cron/check-overdue", (req, res) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let updatedCount = 0;

    database.tareas.forEach((task, index) => {
      if (task.estado === 'pendiente' || task.estado === 'en_progreso') {
        const [hora, min] = task.hora_programada.split(':').map(Number);
        const taskMinutes = hora * 60 + min;
        const estimatedEndMinutes = taskMinutes + task.tiempo_estimado_min;

        if (currentMinutes > estimatedEndMinutes) {
          database.tareas[index].estado = 'vencido';
          database.tareas[index].ultima_actualizacion = new Date().toISOString();
          updatedCount++;
        }
      }
    });

    res.json({ success: true, updatedCount });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Vinculo Backend] Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
