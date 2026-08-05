import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { dbService } from "./server_db";
import { getAuth } from "firebase-admin/auth";
import { GoogleGenAI } from "@google/genai";
import cron from "node-cron";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to check admin claim
  async function adminAuthMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!dbService.getIsFirestoreEnabled()) {
      return next(); // Bypass check if Firestore is not active (simulated mode)
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Autorización de administrador requerida." });
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      if (decodedToken.admin) {
        (req as any).user = decodedToken;
        next();
      } else {
        res.status(403).json({ error: "Acceso denegado. Se requiere rol de administrador." });
      }
    } catch (err) {
      res.status(401).json({ error: "Token de autorización inválido o expirado." });
    }
  }

  // API Route: Get Firebase client configuration
  app.get("/api/firebase-config", (req, res) => {
    res.json({
      apiKey: process.env.VITE_FIREBASE_API_KEY || "",
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.VITE_FIREBASE_APP_ID || ""
    });
  });

  // API Route: Check Firestore Status
  app.get("/api/health/firestore-status", (req, res) => {
    res.json({
      isFirestoreEnabled: dbService.getIsFirestoreEnabled()
    });
  });

  // API Route: Reset Database State (Protected by admin claims)
  app.post("/api/reset", adminAuthMiddleware, async (req, res) => {
    try {
      const result = await dbService.resetState();
      res.json({ success: true, message: "Base de datos restaurada correctamente." });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al restaurar la base de datos." });
    }
  });

  // API Route: Suspend User (Protected by admin claims)
  app.post("/api/admin/suspend-user", adminAuthMiddleware, async (req, res) => {
    const { uid, suspend } = req.body;
    if (!uid || suspend === undefined) {
      return res.status(400).json({ error: "UID y estado suspend son obligatorios." });
    }
    try {
      const result = await dbService.suspendUser(uid, suspend);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al suspender al usuario." });
    }
  });

  // API Route: Delete User (Protected by admin claims)
  app.post("/api/admin/delete-user", adminAuthMiddleware, async (req, res) => {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "UID es obligatorio." });
    }
    try {
      const result = await dbService.deleteUser(uid);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al eliminar al usuario." });
    }
  });

  // API Route: Get State
  app.get("/api/state", async (req, res) => {
    try {
      const state = await dbService.getState();
      res.json(state);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al obtener el estado." });
    }
  });

  // API Route: Toggle Task State
  app.post("/api/tasks/toggle", async (req, res) => {
    const { tarea_id } = req.body;
    if (!tarea_id) {
      return res.status(400).json({ error: "ID de tarea es obligatorio." });
    }
    try {
      const result = await dbService.toggleTask(tarea_id);
      res.json(result);
    } catch (e: any) {
      res.status(404).json({ error: e.message || "Tarea no encontrada." });
    }
  });

  // API Route: Snooze / Aplazar Task
  app.post("/api/tasks/snooze", async (req, res) => {
    const { tarea_id, minutesToSnooze, exactTime } = req.body;
    if (!tarea_id) {
      return res.status(400).json({ error: "ID de tarea es obligatorio." });
    }
    try {
      const result = await dbService.snoozeTask(tarea_id, minutesToSnooze, exactTime);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Error al aplazar la tarea." });
    }
  });

  // API Route: Create Task
  app.post("/api/tasks/create", async (req, res) => {
    const { titulo, usuario_id, hora_programada, tiempo_estimado_min, visible_familia, meta_id, categoria, es_prioridad_alta, es_critica, config_critica, requiere_app_externa } = req.body;
    if (!titulo || !usuario_id) {
      return res.status(400).json({ error: "Título y destinatario son obligatorios." });
    }
    try {
      const result = await dbService.createTask({
        titulo,
        usuario_id,
        hora_programada,
        tiempo_estimado_min,
        visible_familia,
        meta_id,
        categoria,
        es_prioridad_alta,
        es_critica,
        config_critica,
        requiere_app_externa
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al crear la tarea." });
    }
  });

  // API Route: Create Goal (Extended)
  app.post("/api/goals/create", async (req, res) => {
    const { 
      titulo, 
      categoria, 
      usuario_id, 
      familia_id,
      tipo,
      frecuencia_objetivo,
      unidad_frecuencia,
      duracion_valor,
      duracion_unidad,
      fecha_inicio,
      fecha_fin,
      miembros_asignados,
      generar_tareas_automaticas,
      dias_preferidos,
      hora_sugerida,
      consecuencias_activas,
      consecuencia_id,
      requiere_aprobacion_adulto,
      visible_familia, 
      fecha_limite 
    } = req.body;

    if (!titulo || !categoria || !usuario_id) {
      return res.status(400).json({ error: "Título, categoría y usuario son obligatorios." });
    }
    try {
      const result = await dbService.createGoal({
        titulo,
        categoria,
        usuario_id,
        familia_id,
        tipo,
        frecuencia_objetivo,
        unidad_frecuencia,
        duracion_valor,
        duracion_unidad,
        fecha_inicio,
        fecha_fin,
        miembros_asignados,
        generar_tareas_automaticas,
        dias_preferidos,
        hora_sugerida,
        consecuencias_activas,
        consecuencia_id,
        requiere_aprobacion_adulto,
        visible_familia,
        fecha_limite
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al crear la meta." });
    }
  });

  // API Route: Evaluate Goals Compliance
  app.post("/api/goals/evaluate-compliance", async (req, res) => {
    const { familia_id } = req.body;
    if (!familia_id) {
      return res.status(400).json({ error: "ID de familia es obligatorio." });
    }
    try {
      const result = await dbService.evaluarCumplimientoMetas(familia_id);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al evaluar cumplimiento de metas." });
    }
  });

  // API Route: Create Reward Template
  app.post("/api/rewards/templates/create", async (req, res) => {
    const { titulo, descripcion, tipo, bot_id_desbloqueado, minutos_extra, familia_id } = req.body;
    if (!titulo || !familia_id) {
      return res.status(400).json({ error: "Título y ID de familia son obligatorios." });
    }
    try {
      const result = await dbService.createRewardTemplate({
        titulo,
        descripcion,
        tipo,
        bot_id_desbloqueado,
        minutos_extra,
        familia_id
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al crear la plantilla de recompensa." });
    }
  });

  // API Route: Mark Unlock as Seen
  app.post("/api/unlocks/mark-seen", async (req, res) => {
    const { desbloqueo_id } = req.body;
    if (!desbloqueo_id) {
      return res.status(400).json({ error: "desbloqueo_id es obligatorio." });
    }
    try {
      const result = await dbService.markUnlockAsSeen(desbloqueo_id);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al marcar desbloqueo como visto." });
    }
  });

  // API Route: Create Consequence Template
  app.post("/api/consequences/templates/create", async (req, res) => {
    const { titulo, descripcion, categoria, tiempo_estimado_min, familia_id, creado_por } = req.body;
    if (!titulo || !familia_id) {
      return res.status(400).json({ error: "Título y ID de familia son obligatorios." });
    }
    try {
      const result = await dbService.createConsequenceTemplate({
        titulo,
        descripcion,
        categoria,
        tiempo_estimado_min,
        familia_id,
        creado_por
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al crear la plantilla de consecuencia." });
    }
  });

  // API Route: Resolve Pending Consequence
  app.post("/api/consequences/pending/resolve", async (req, res) => {
    const { pendiente_id, action } = req.body; // action: 'assign' | 'forgive'
    if (!pendiente_id || !action) {
      return res.status(400).json({ error: "pendiente_id y acción son obligatorios." });
    }
    try {
      const result = await dbService.resolvePendingConsequence(pendiente_id, action);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al resolver la consecuencia pendiente." });
    }
  });

  // API Route: Save Journal Entry
  app.post("/api/journal/create", async (req, res) => {
    const { texto, emocion, visible_familia, usuario_id } = req.body;
    if (!texto || !emocion || !usuario_id) {
      return res.status(400).json({ error: "Texto, emoción y usuario son obligatorios." });
    }
    try {
      const result = await dbService.createJournalEntry({
        texto,
        emocion,
        visible_familia,
        usuario_id
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al guardar en el diario." });
    }
  });

  // API Route: Add or Toggle Reaction to Journal Entry
  app.post("/api/journal/react", async (req, res) => {
    const { entrada_id, usuario_id, emoji } = req.body;
    if (!entrada_id || !usuario_id || !emoji) {
      return res.status(400).json({ error: "entrada_id, usuario_id y emoji son obligatorios." });
    }
    try {
      const result = await dbService.addJournalReaction(entrada_id, usuario_id, emoji);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al registrar la reacción." });
    }
  });

  // API Route: Update User Profile / Register New User
  app.post("/api/user/update", async (req, res) => {
    const { uid, nombre, avatar_url, role, familia_id } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "UID de usuario es obligatorio." });
    }
    try {
      const result = await dbService.updateUserProfile(uid, nombre, avatar_url, role, familia_id);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al actualizar el perfil." });
    }
  });

  // API Route: Update / Change User Password
  const handlePasswordChange = async (req: express.Request, res: express.Response) => {
    const { uid, currentPassword, newPassword } = req.body;
    if (!uid || !newPassword) {
      return res.status(400).json({ error: "El UID y la nueva contraseña son obligatorios." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
    }
    try {
      if (dbService.getIsFirestoreEnabled()) {
        try {
          await getAuth().updateUser(uid, { password: newPassword });
        } catch (e: any) {
          console.warn("[Firebase Admin updateUser password note]", e.message);
        }
      }
      res.json({ success: true, message: "Contraseña actualizada con éxito." });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al cambiar la contraseña." });
    }
  };

  app.post("/api/user/update-password", handlePasswordChange);
  app.post("/api/user/change-password", handlePasswordChange);

  // API Route: Create Family
  app.post("/api/family/create", async (req, res) => {
    const { uid, nombre } = req.body;
    if (!uid || !nombre) {
      return res.status(400).json({ error: "UID de usuario y nombre de familia son obligatorios." });
    }
    try {
      const result = await dbService.createFamily(uid, nombre);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al crear la familia." });
    }
  });

  // API Route: Join Family
  app.post("/api/family/join", async (req, res) => {
    const { uid, code } = req.body;
    if (!uid || !code) {
      return res.status(400).json({ error: "UID de usuario y código son obligatorios." });
    }
    try {
      const result = await dbService.joinFamilyByCode(uid, code);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // API Route: Scheduled check simulation
  app.post("/api/cron/check-overdue", async (req, res) => {
    try {
      const result = await dbService.checkOverdueTasks();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al ejecutar comprobación de tareas." });
    }
  });

  // API Route: Add Points to User
  app.post("/api/user/add-points", async (req, res) => {
    const { uid, points } = req.body;
    if (!uid || points === undefined) {
      return res.status(400).json({ error: "UID y puntos son obligatorios." });
    }
    try {
      const result = await dbService.addPointsToUser(uid, Number(points));
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al añadir puntos." });
    }
  });

  // API Route: Get steps for all family members
  app.get("/api/steps", async (req, res) => {
    const { familia_id, fecha } = req.query;
    if (!familia_id || !fecha) {
      return res.status(400).json({ error: "familia_id y fecha son obligatorios." });
    }
    try {
      const result = await dbService.getStepsForFamily(familia_id as string, fecha as string);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al obtener los pasos de la familia." });
    }
  });

  // API Route: Log/Update steps for a user
  app.post("/api/steps/log", async (req, res) => {
    const { usuario_id, pasos, fecha } = req.body;
    if (!usuario_id || pasos === undefined || !fecha) {
      return res.status(400).json({ error: "usuario_id, pasos y fecha son obligatorios." });
    }
    try {
      const result = await dbService.logSteps(usuario_id, Number(pasos), fecha);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al guardar los pasos." });
    }
  });

  // API Route: Get Game Progress
  app.get("/api/games/progress", async (req, res) => {
    const { usuario_id } = req.query;
    if (!usuario_id) {
      return res.status(400).json({ error: "usuario_id es obligatorio." });
    }
    try {
      const result = await dbService.getGameProgress(usuario_id as string);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al obtener el progreso del juego." });
    }
  });

  // API Route: Save Game Progress
  app.post("/api/games/progress/save", async (req, res) => {
    const { usuario_id, game, score, bestTime } = req.body;
    if (!usuario_id || !game || score === undefined) {
      return res.status(400).json({ error: "usuario_id, game y score son obligatorios." });
    }
    try {
      const result = await dbService.saveGameProgress(usuario_id, game, Number(score), bestTime !== undefined ? Number(bestTime) : undefined);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al guardar el progreso del juego." });
    }
  });

  // Lazy Initialization for Gemini
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY no está configurada.");
      }
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  // Helper to strip markdown and parse JSON
  function parseCleanJson(text: string) {
    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      const lines = cleanText.split("\n");
      if (lines[0].startsWith("```")) {
        lines.shift();
      }
      if (lines[lines.length - 1].startsWith("```")) {
        lines.pop();
      }
      cleanText = lines.join("\n").trim();
    }
    return JSON.parse(cleanText);
  }

  // API Route: Dynamic Focus Content Generation (using Gemini API)
  app.post("/api/focus/content", async (req, res) => {
    const { title, mode } = req.body;
    if (!title || !mode) {
      return res.status(400).json({ error: "title y mode son obligatorios." });
    }

    try {
      const ai = getGeminiClient();
      let prompt = "";

      if (mode === "lectura") {
        prompt = `Genera 3 capítulos cortos de lectura inspiradora en español para un niño/joven basados en la tarea: "${title}". Cada capítulo debe tener un título interesante ("title") y un texto reflexivo corto de 2-3 frases ("text"). Devuelve únicamente un JSON válido con la forma: [ { "title": "...", "text": "..." }, ... ] sin formato markdown ni texto adicional.`;
      } else if (mode === "celular") {
        prompt = `Genera 3 preguntas de opción múltiple estilo Duolingo en español para aprender inglés, inspiradas o relacionadas temáticamente con la tarea: "${title}". Cada pregunta debe tener: "prompt" (una instrucción en español como "Traduce esta frase sobre..."), "phrase" (una frase en inglés relacionada con el tema), "options" (una lista con exactamente 3 opciones en español, donde solo una sea la traducción correcta y las otras dos sean incorrectas pero plausibles), y "correctIndex" (el índice 0, 1 o 2 de la opción correcta en la lista "options"). Devuelve únicamente un JSON válido con la forma: [ { "prompt": "...", "phrase": "...", "options": ["...", "...", "..."], "correctIndex": 0 }, ... ] sin formato markdown ni texto adicional.`;
      } else {
        return res.status(400).json({ error: "Modo inválido para generación dinámica de contenido." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      if (!response || !response.text) {
        throw new Error("No se recibió respuesta válida del modelo.");
      }

      const parsedData = parseCleanJson(response.text);
      res.json(parsedData);
    } catch (e: any) {
      console.error("[Gemini Focus Content Error]", e);
      // Fail gracefully: send mock/fallback content if Gemini fails or is not configured
      if (mode === "lectura") {
        res.json([
          {
            title: `Capítulo 1: El Valor de ${title}`,
            text: `Cada vez que nos proponemos completar ${title}, estamos sembrando semillas de responsabilidad en nuestro núcleo familiar. No se trata solo de la tarea en sí, sino del amor y la dedicación que ponemos en ella.`
          },
          {
            title: "Capítulo 2: El Secreto del Ritmo",
            text: "El tiempo se expande mágicamente cuando nos enfocamos sin interrupciones. Cada minuto de concentración nos regala minutos adicionales para reír, jugar y compartir juntos como familia."
          },
          {
            title: "Capítulo 3: Crecer Paso a Paso",
            text: "La perseverancia es el motor de los grandes sueños. Completar tus tareas diarias edifica un puente indestructible hacia un futuro libre, feliz y lleno de éxitos compartidos."
          }
        ]);
      } else {
        res.json([
          {
            prompt: `Traduce esta frase relacionada con ${title}:`,
            phrase: `“Doing ${title} helps my family.”`,
            options: [
              `Hacer ${title} ayuda a mi familia.`,
              `Mi perro juega en el jardín de la casa.`,
              `Mañana comeremos manzanas frescas.`
            ],
            correctIndex: 0
          },
          {
            prompt: "Traduce esta frase de superación familiar:",
            phrase: "“Working together makes us stronger.”",
            options: [
              "Hacer la tarea es aburrido los lunes.",
              "Trabajar juntos nos hace más fuertes.",
              "Ayer leímos un libro de aventuras."
            ],
            correctIndex: 1
          },
          {
            prompt: "Traduce esta meta diaria de constancia:",
            phrase: "“Success is built step by step.”",
            options: [
              "La comida de mamá está deliciosa hoy.",
              "El éxito se construye paso a paso.",
              "Mi hermano menor duerme por la tarde."
            ],
            correctIndex: 1
          }
        ]);
      }
    }
  });

  // API Route: Consejero Familiar Gemini AI (General Consultation / Family Advice)
  app.post("/api/gemini/advisor", async (req, res) => {
    const { prompt, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "El campo prompt es obligatorio." });
    }

    try {
      const ai = getGeminiClient();
      const systemInstruction = `Eres NúcleoIA, un consejero y asistente de convivencia familiar empático, positivo, organizado y experto en crianza respetuosa, organización del hogar, menús familiares equilibrados y mediación de conflictos. Responde siempre en español con tono cálido, directo y constructivo. Devuelve la respuesta en formato JSON con la siguiente estructura: { "response": "tu respuesta principal explicativa y empática", "tips": ["consejo práctico 1", "consejo práctico 2", "consejo práctico 3"], "suggestedAction": "una acción concreta para la familia hoy" }.`;

      const userMessage = `${context ? `[Contexto Familiar: ${context}]\n` : ""}${prompt}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: userMessage,
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      if (!response || !response.text) {
        throw new Error("No se obtuvo respuesta del modelo Gemini.");
      }

      const parsed = parseCleanJson(response.text);
      res.json(parsed);
    } catch (err: any) {
      console.error("[Gemini Advisor Error]", err);
      // Fallback response if offline or key not ready
      res.json({
        response: `Excelente consulta sobre "${prompt}". La comunicación abierta y las rutinas predecibles ayudan a fortalecer la armonía familiar.`,
        tips: [
          "Establezcan un momento diario para conversar sobre cómo se sienten.",
          "Involucren a todos los miembros en las decisiones de la casa.",
          "Celebren los pequeños logros de cada día en familia."
        ],
        suggestedAction: "Planificar juntos las actividades de este fin de semana."
      });
    }
  });

  // API Route: Sugerir Tareas Inteligentes con Gemini AI
  app.post("/api/gemini/suggest-tasks", async (req, res) => {
    const { userRole, theme, count } = req.body;
    const taskCount = count || 3;

    try {
      const ai = getGeminiClient();
      const prompt = `Genera exactamente ${taskCount} tareas del hogar o hábitos sugeridos en español para una app de organización familiar. 
Rol del integrante: "${userRole || "Cualquier integrante"}".
Tema o enfoque: "${theme || "Organización diaria del hogar y bienestar"}".
Cada tarea debe tener:
- "title": Título claro y motivador de la tarea (máx 8 palabras).
- "category": Una de las siguientes categorías exactas: "Hogar", "Estudio", "Salud", "Personal", "Otros".
- "estimatedTime": Tiempo estimado en minutos (número, ej. 15, 20, 30, 45).
- "isHighPriority": booleano (true o false).
- "points": Puntos recompensa sugeridos (número entre 10 y 50).
- "reasoning": Breve razón de por qué esta tarea beneficia a la familia.

Devuelve ÚNICAMENTE un array JSON válido de objetos con esas propiedades. Sin markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      if (!response || !response.text) {
        throw new Error("No se obtuvo respuesta del modelo Gemini.");
      }

      const tasks = parseCleanJson(response.text);
      res.json(tasks);
    } catch (err: any) {
      console.error("[Gemini Suggest Tasks Error]", err);
      // Fallback tasks
      res.json([
        {
          title: "Organizar y limpiar el escritorio de estudio",
          category: "Estudio",
          estimatedTime: 20,
          isHighPriority: false,
          points: 25,
          reasoning: "Un espacio ordenado mejora la concentración y reduce el estrés."
        },
        {
          title: "Preparar mochilas y ropa para el día siguiente",
          category: "Hogar",
          estimatedTime: 15,
          isHighPriority: true,
          points: 30,
          reasoning: "Asegura mañanas tranquilas sin prisas ni olvidos."
        },
        {
          title: "Caminata o estiramiento en familia (15 mins)",
          category: "Salud",
          estimatedTime: 15,
          isHighPriority: false,
          points: 20,
          reasoning: "Promueve el movimiento físico y el tiempo compartido."
        }
      ]);
    }
  });

  // API Route: Generar Ilustración SVG para Estados Vacíos con Gemini AI
  app.post("/api/gemini/empty-illustration", async (req, res) => {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "El campo topic es obligatorio." });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("MY_GEMINI_API_KEY")) {
      return res.json({ svg: null, message: "GEMINI_API_KEY no configurada o usando valor por defecto." });
    }

    try {
      const ai = getGeminiClient();
      const prompt = `Crea una ilustración vectorial SVG simple, limpia, moderna y estética para un estado vacío con el tema: "${topic}".
La ilustración debe usar colores suaves en la paleta indigo/amber/purple (ej. #6366F1, #F59E0B, #8B5CF6, #E0E7FF, #EEF2FF).
Debe tener viewBox="0 0 200 200" e incluir formas vectoriales simples (<circle>, <path>, <rect>, <g>) sin texto ni etiquetas externas.
Devuelve ÚNICAMENTE el código SVG puro iniciando con <svg> y terminando con </svg>. Sin bloques de formato markdown ni explicaciones.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      let svgText = response?.text || "";
      svgText = svgText.trim();
      if (svgText.includes("<svg") && svgText.includes("</svg>")) {
        const startIdx = svgText.indexOf("<svg");
        const endIdx = svgText.lastIndexOf("</svg>") + 6;
        svgText = svgText.substring(startIdx, endIdx);
        res.json({ svg: svgText });
      } else {
        res.json({ svg: null });
      }
    } catch (e: any) {
      res.json({ svg: null, fallback: true });
    }
  });

  // API Route: Sugerir Metas Familiares con Gemini AI
  app.post("/api/gemini/suggest-goals", async (req, res) => {
    const { category, familyContext } = req.body;

    try {
      const ai = getGeminiClient();
      const prompt = `Genera 3 metas familiares o personales inspiradoras en español para la categoría "${category || "Hogar"}". ${familyContext ? `Contexto familiar: ${familyContext}` : ""}
Cada meta debe incluir:
- "title": Título inspirador y concreto (ej. "Comer juntos en la mesa 5 días a la semana").
- "category": Categoría exactas ("Salud", "Estudio", "Finanzas", "Hogar", "Personal").
- "description": Breve descripción motivacional (1-2 oraciones).
- "milestones": Lista con 3 pasos o hitos clave para alcanzar la meta.

Devuelve ÚNICAMENTE un array JSON válido de objetos con esas propiedades. Sin markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      if (!response || !response.text) {
        throw new Error("No se obtuvo respuesta del modelo.");
      }

      const goals = parseCleanJson(response.text);
      res.json(goals);
    } catch (err: any) {
      console.error("[Gemini Suggest Goals Error]", err);
      res.json([
        {
          title: "Noche de Juegos y Convivencia Semanal",
          category: category || "Hogar",
          description: "Desconectar de las pantallas los viernes por la noche para jugar en familia.",
          milestones: [
            "Elegir los juegos preferidos de cada integrante",
            "Fijar el horario de los viernes a las 7 PM",
            "Preparar snacks o merienda especial juntos"
          ]
        },
        {
          title: "Ahorro Familiar para Actividad Especial",
          category: "Finanzas",
          description: "Juntar un fondo en familia para una salida especial a fin de mes.",
          milestones: [
            "Definir el destino o la actividad familiar",
            "Anotar los aportes o puntos semanales",
            "Revisar el progreso cada domingo"
          ]
        }
      ]);
    }
  });

  // API Route: Reflexión de Diario Familiar con Gemini AI
  app.post("/api/gemini/journal-reflection", async (req, res) => {
    const { text, emotion } = req.body;
    if (!text) {
      return res.status(400).json({ error: "El texto del diario es obligatorio." });
    }

    try {
      const ai = getGeminiClient();
      const prompt = `Un miembro de la familia escribió esta entrada en su diario expresando la emoción "${emotion || "neutral"}":
"${text}"

Proporciona una reflexión empática y cálida en español (estilo consejero familiar) que motive a la persona y dé una sugerencia positiva.
Devuelve ÚNICAMENTE un JSON con la estructura:
{
  "reflection": "Mensaje reflexivo cálido y motivador",
  "advice": "Un consejo práctico para afrontar o celebrar el momento",
  "activityIdea": "Una pequeña idea o detalle para conectar con la familia hoy"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      if (!response || !response.text) {
        throw new Error("Sin respuesta del modelo.");
      }

      const reflection = parseCleanJson(response.text);
      res.json(reflection);
    } catch (err: any) {
      console.error("[Gemini Journal Reflection Error]", err);
      res.json({
        reflection: "Gracias por compartir tus sentimientos. Registrar lo que vivimos cada día es un paso valioso para conocernos y valorar lo importante.",
        advice: "Tómate un momento para respirar profundo y compartir este sentir con alguien de confianza.",
        activityIdea: "Disfruten de una bebida caliente juntos y compartan lo mejor de su día."
      });
    }
  });

  // API Route: Ayuda para reflexionar en Diario (Sugerir preguntas e ideas de inicio)
  app.post("/api/gemini/journal-prompt", async (req, res) => {
    const { emotion, recentEntries } = req.body;

    try {
      const ai = getGeminiClient();
      const entriesContext = Array.isArray(recentEntries) && recentEntries.length > 0
        ? `Las entradas recientes del usuario esta semana son:\n- ${recentEntries.slice(0, 4).join("\n- ")}`
        : "El usuario aún no ha guardado entradas recientes esta semana.";

      const prompt = `Un miembro de la familia quiere escribir en su diario hoy y necesita inspiración para reflexionar.
Emoción seleccionada actualmente: "${emotion || "Good"}".
${entriesContext}

Tu objetivo es darle un punto de partida inspirador y preguntas reflexivas para que ÉL/ELLA escriba sus propios pensamientos.
REGLA ABSOLUTA: NUNCA redactes ni escribas la entrada del diario por el usuario. Únicamente proporciona preguntas guía y un breve resumen empático de cómo viene su semana.

Devuelve ÚNICAMENTE un JSON con la siguiente estructura:
{
  "weeklySummary": "Un resumen empático o mensaje motivador de 1-2 frases sobre su estado emocional o semana.",
  "questions": [
    "¿Pregunta o punto de partida inspirador 1?",
    "¿Pregunta o punto de partida inspirador 2?",
    "¿Pregunta o punto de partida inspirador 3?"
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      if (!response || !response.text) {
        throw new Error("Sin respuesta del modelo.");
      }

      const promptData = parseCleanJson(response.text);
      res.json(promptData);
    } catch (err: any) {
      console.error("[Gemini Journal Prompt Error]", err);
      res.json({
        weeklySummary: "Reflexionar sobre tu día a día te ayuda a valorar tus pequeños logros y descargar tensiones.",
        questions: [
          "¿Qué momento sencillo de hoy te hizo sonreír o sentir paz?",
          "¿Hubo algún reto hoy y qué aprendizaje o cualidad tuya te ayudó a afrontarlo?",
          "¿Por qué pequeña cosa o gesto de alguien de tu familia te sientes agradecido hoy?"
        ]
      });
    }
  });

  // API Route: Organizar Ideas con Gemini AI
  app.post("/api/gemini/organize-idea", async (req, res) => {
    const { ideaText, category } = req.body;
    if (!ideaText || !ideaText.trim()) {
      return res.status(400).json({ error: "El texto de la idea es obligatorio." });
    }

    try {
      const ai = getGeminiClient();
      const prompt = `Un usuario introdujo la siguiente idea en su laboratorio de ideas:
"${ideaText.trim()}"
${category ? `Categoría sugerida: ${category}` : ""}

Actúa como un estratega de proyectos e Inteligencia Artificial experto en estructuración de proyectos personales, profesionales y familiares.
Analiza la idea y organízala de forma muy clara, pragmática y altamente motivadora.
Estructura la respuesta exclusivamente como un objeto JSON con las siguientes propiedades exactas:
{
  "title": "Un título conciso e inspirador para la idea (máx 8 palabras)",
  "summary": "Resumen ejecutivo claro de la idea y su propósito principal (2-3 frases)",
  "category": "Una categoría entre: 'Hogar', 'Estudio', 'Salud', 'Finanzas', 'Personal', 'Creativo', 'Proyecto'",
  "estimatedDuration": "Estimación del tiempo total o alcance (ej. '2 semanas', '1 mes', '3 días')",
  "difficulty": "Nivel de dificultad: 'Fácil', 'Moderado' o 'Avanzado'",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Título corto del paso 1",
      "description": "Explicación clara y concreta de lo que se debe hacer en este paso",
      "estimatedTime": "Tiempo estimado (ej. 15 min, 1 hora, 1 día)",
      "category": "Una categoría entre: 'Hogar', 'Estudio', 'Salud', 'Personal', 'Otros'"
    }
  ],
  "suggestedGoal": {
    "title": "Título sugerido si se convierte en Meta semanal/mensual",
    "frequency": "ej. 3 veces por semana durante 1 mes",
    "recommendation": "Recomendación para mantener la constancia"
  },
  "encouragement": "Un mensaje breve de motivación para empezar hoy mismo"
}

Genera entre 3 y 5 pasos secuenciales lógicos en el array "steps".
Devuelve ÚNICAMENTE el JSON válido. Sin formato markdown ni texto adicional.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      if (!response || !response.text) {
        throw new Error("No se obtuvo respuesta del modelo Gemini.");
      }

      const structuredIdea = parseCleanJson(response.text);
      res.json(structuredIdea);
    } catch (err: any) {
      console.error("[Gemini Organize Idea Error]", err);
      // Fallback structured idea if offline or key missing
      res.json({
        title: `Proyecto: ${ideaText.trim().slice(0, 30)}...`,
        summary: `Estructura paso a paso para llevar a la realidad tu idea: "${ideaText.trim()}".`,
        category: category || "Proyecto",
        estimatedDuration: "2 semanas",
        difficulty: "Moderado",
        steps: [
          {
            stepNumber: 1,
            title: "Definir alcance y recursos necesarios",
            description: "Anotar materiales, presupuesto y espacio o tiempo requerido antes de iniciar.",
            estimatedTime: "30 min",
            category: "Personal"
          },
          {
            stepNumber: 2,
            title: "Realizar una primera prueba o prototipo",
            description: "Ejecutar una versión simplificada inicial para validar la viabilidad.",
            estimatedTime: "1 hora",
            category: "Proyecto"
          },
          {
            stepNumber: 3,
            title: "Implementación completa y seguimiento",
            description: "Llevar a cabo la idea involucrando a la familia o equipo y midiendo avances.",
            estimatedTime: "2 horas",
            category: "Hogar"
          }
        ],
        suggestedGoal: {
          title: `Meta: ${ideaText.trim().slice(0, 25)}`,
          frequency: "2 veces por semana durante 1 mes",
          recommendation: "Separar bloques fijos en la agenda para avanzar sin interrupciones."
        },
        encouragement: "¡Toda gran obra comenzó como una simple idea! Da el primer paso hoy."
      });
    }
  });

  // Vite integration / Static Assets serving
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
    console.log(`[Vinculo Backend] Server running on http://0.0.0.0:${PORT}`);

    // Configurar tareas programadas con node-cron
    console.log("[Cron Engine] Inicializando tareas programadas...");

    // 1. Cada 5 minutos: Comprobar y marcar tareas vencidas
    cron.schedule("*/5 * * * *", async () => {
      const timestamp = new Date().toISOString();
      console.log(`[Cron Job - Check Overdue] [${timestamp}] Iniciando verificación automática de tareas vencidas...`);
      try {
        const result = await dbService.checkOverdueTasks();
        console.log(`[Cron Job - Check Overdue] [${timestamp}] Éxito. Tareas actualizadas a 'vencido': ${result.updatedCount ?? 0}`);
      } catch (err: any) {
        console.error(`[Cron Job - Check Overdue] [${timestamp}] Error al verificar tareas vencidas:`, err?.message || err);
      }
    });

    // 2. Cada domingo a las 23:59 (hora de Colombia, America/Bogota):
    // Evaluará el cumplimiento semanal de metas de todas las familias y regenerará las tareas de la siguiente semana.
    cron.schedule("59 23 * * 0", async () => {
      const timestamp = new Date().toISOString();
      console.log(`[Cron Job - Weekly Evaluation] [${timestamp}] Iniciando evaluación semanal de metas y regeneración de tareas (America/Bogota)...`);
      try {
        // Obtener el estado actual (sincroniza familias y metas de Firestore o Base Local)
        const state = await dbService.getState();
        const familias = state.familias || [];
        console.log(`[Cron Job - Weekly Evaluation] Procesando ${familias.length} familia(s) encontrada(s)...`);

        let evaluatedFamilies = 0;
        for (const fam of familias) {
          if (fam.familia_id) {
            try {
              await dbService.evaluarCumplimientoMetas(fam.familia_id);
              evaluatedFamilies++;
              console.log(`[Cron Job - Weekly Evaluation] Cumplimiento evaluado exitosamente para la familia: ${fam.familia_id} (${fam.nombre || 'Sin Nombre'})`);
            } catch (famErr: any) {
              console.error(`[Cron Job - Weekly Evaluation] Error al evaluar la familia ${fam.familia_id}:`, famErr?.message || famErr);
            }
          }
        }

        // Regenerar tareas automáticas para todas las metas activas
        const activeAutoGoals = (state.metas || []).filter(m => m.generar_tareas_automaticas);
        console.log(`[Cron Job - Weekly Evaluation] Regenerando tareas para ${activeAutoGoals.length} meta(s) con generación automática...`);
        let regeneratedGoals = 0;

        for (const goal of activeAutoGoals) {
          try {
            await dbService.generarTareasDesdeMetas(goal);
            regeneratedGoals++;
          } catch (goalErr: any) {
            console.error(`[Cron Job - Weekly Evaluation] Error al regenerar tareas para la meta ${goal.meta_id}:`, goalErr?.message || goalErr);
          }
        }

        console.log(`[Cron Job - Weekly Evaluation] [${timestamp}] Finalizado con éxito. Familias evaluadas: ${evaluatedFamilies}/${familias.length}, Metas regeneradas: ${regeneratedGoals}/${activeAutoGoals.length}`);
      } catch (err: any) {
        console.error(`[Cron Job - Weekly Evaluation] [${timestamp}] Error global en la evaluación semanal:`, err?.message || err);
      }
    }, {
      timezone: "America/Bogota"
    });

    console.log("[Cron Engine] Tareas programadas con node-cron configuradas correctamente.");
  });
}

startServer();
