import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { dbService } from "./server_db";
import { getAuth } from "firebase-admin/auth";
import { GoogleGenAI } from "@google/genai";

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

  // API Route: Email & Password sign-in / authentication simulation
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // If it's Kevin (Admin)
    if (normalizedEmail === "kevin@familia.com" && password === "123456") {
      return res.json({
        success: true,
        user: {
          uid: "kevin-admin-uid",
          nombre: "Kevin (Admin)",
          email: "kevin@familia.com",
          avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop",
          familia_id: "fam_kevin_admin",
          role: "admin",
          puntos: 150,
          racha_actual: 5
        },
        idToken: "simulated-admin-token-kevin"
      });
    }

    // Default simulated fallback login
    try {
      const state = await dbService.getState();
      const existingUser = state.usuarios.find(
        (u: any) => u.email?.toLowerCase() === normalizedEmail || u.uid === `user-${normalizedEmail.replace(/[@.]/g, "-")}`
      );

      if (existingUser) {
        return res.json({
          success: true,
          user: {
            uid: existingUser.uid,
            nombre: existingUser.nombre,
            email: normalizedEmail,
            avatar_url: existingUser.avatar_url,
            familia_id: existingUser.familia_id,
            role: (existingUser as any).role || "member",
            puntos: existingUser.puntos || 0,
            racha_actual: existingUser.racha_actual || 0
          },
          idToken: `simulated-token-${existingUser.uid}`
        });
      } else {
        // Register new user locally
        const newUid = `user-${normalizedEmail.replace(/[@.]/g, "-")}`;
        const newProfileRes = await dbService.updateUserProfile(
          newUid,
          normalizedEmail.split('@')[0],
          "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop",
          "member",
          ""
        );
        const newProfile = newProfileRes.updatedUser;

        return res.json({
          success: true,
          user: {
            uid: newUid,
            nombre: newProfile?.nombre || normalizedEmail.split('@')[0],
            email: normalizedEmail,
            avatar_url: newProfile?.avatar_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop",
            familia_id: "",
            role: "member",
            puntos: 0,
            racha_actual: 0
          },
          idToken: `simulated-token-${newUid}`
        });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al autenticar." });
    }
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

  // API Route: Create Task
  app.post("/api/tasks/create", async (req, res) => {
    const { titulo, usuario_id, hora_programada, tiempo_estimado_min, visible_familia, meta_id } = req.body;
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
        meta_id
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al crear la tarea." });
    }
  });

  // API Route: Create Goal
  app.post("/api/goals/create", async (req, res) => {
    const { titulo, categoria, usuario_id, visible_familia, fecha_limite } = req.body;
    if (!titulo || !categoria || !usuario_id) {
      return res.status(400).json({ error: "Título, categoría y usuario son obligatorios." });
    }
    try {
      const result = await dbService.createGoal({
        titulo,
        categoria,
        usuario_id,
        visible_familia,
        fecha_limite
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Error al crear la meta." });
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
        model: "gemini-3.5-flash",
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
  });
}

startServer();
