export interface Usuario {
  uid: string;
  nombre: string;
  avatar_url: string;
  familia_id: string;
  racha_actual: number;
  puntos: number;
  estado?: 'activo' | 'suspendido';
  configuracion_privacidad: {
    visible_familia_por_defecto: boolean;
  };
}

export interface Familia {
  familia_id: string;
  nombre: string;
  codigo_invitacion: string;
  miembros: string[]; // UIDs
}

export interface Meta {
  meta_id: string;
  usuario_id: string;          // creador de la meta
  familia_id: string;          // requerido siempre, incluso en metas individuales
  tipo: 'individual' | 'familiar';
  titulo: string;
  categoria: 'Salud' | 'Estudio' | 'Finanzas' | 'Hogar' | 'Personal';
  
  // Definición de frecuencia y duración
  frecuencia_objetivo: number;        // ej. 5
  unidad_frecuencia: 'dia' | 'semana' | 'mes'; // "5 veces por SEMANA"
  duracion_valor: number;             // ej. 1
  duracion_unidad: 'dias' | 'semanas' | 'meses'; // la meta dura 1 MES
  fecha_inicio: string;               // YYYY-MM-DD
  fecha_fin: string;                  // calculada automáticamente
  
  // Solo para metas familiares
  miembros_asignados?: string[];      // UIDs participantes (default: todos los miembros de la familia)
  progreso_por_miembro?: {            // se actualiza automáticamente
    usuario_id: string;
    periodos_cumplidos: number;
    periodos_totales: number;
    porcentaje: number;
  }[];
  
  // Generación automática de tareas
  generar_tareas_automaticas: boolean;
  dias_preferidos?: number[];          // 0=domingo..6=sábado, opcional.
  hora_sugerida?: string;              // HH:MM
  
  // Sistema de consecuencias
  consecuencias_activas: boolean;      // false por defecto
  consecuencia_id?: string;            // referencia a plantilla
  requiere_aprobacion_adulto: boolean; // true por defecto
  
  // Sistema de recompensas
  recompensa_activa?: boolean;
  recompensa_id?: string;             // referencia a RecompensaPlantilla
  
  fecha_limite?: string;               // compatibilidad con campos previos
  porcentaje_semanal: number;          // % del periodo actual
  visible_familia: boolean;
}

export interface TareaDiaria {
  tarea_id: string;
  usuario_id: string;
  familia_id?: string;
  meta_id?: string;
  titulo: string;
  categoria?: 'Hogar' | 'Estudio' | 'Salud' | 'Personal' | 'Otros';
  es_prioridad_alta?: boolean;
  hora_programada: string; // HH:MM
  tiempo_estimado_min: number;
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'vencido';
  origen?: 'manual' | 'meta_automatica' | 'consecuencia' | 'admin_asignada';
  ultima_actualizacion: string; // ISO string
  visible_familia: boolean;
}

export interface ConsecuenciaPlantilla {
  consecuencia_id: string;
  familia_id: string;
  titulo: string;               // ej. "Lavar los platos"
  descripcion?: string;
  categoria: 'Hogar' | 'Otros';
  tiempo_estimado_min: number;
  creado_por: string;            // uid del admin/adulto que la definió
}

export interface RecompensaPlantilla {
  recompensa_id: string;
  familia_id: string;
  titulo: string;                // ej. "Elegir la película del domingo"
  descripcion?: string;
  tipo?: 'generica' | 'desbloqueo_bot' | 'tiempo_extra_juegos';  // NUEVO
  bot_id_desbloqueado?: 'oscar' | 'bea' | 'vikram' | 'lin';     // NUEVO, solo si tipo = 'desbloqueo_bot'
  minutos_extra?: number;                                       // NUEVO, solo si tipo = 'tiempo_extra_juegos'
}

export interface DesbloqueoUsuario {
  desbloqueo_id: string;
  usuario_id: string;
  familia_id: string;
  tipo: 'bot' | 'tiempo_extra' | 'generico';
  valor: string;              // ej. 'lin', o minutos como string
  origen_meta_id: string;     // qué meta lo desbloqueó
  fecha_obtenido: string;
  visto?: boolean;
}

export interface ConsecuenciaPendiente {
  pendiente_id: string;
  familia_id: string;
  usuario_id: string;
  meta_id: string;
  meta_titulo: string;
  periodo: string;
  cumplimiento: string;          // ej "4/5"
  consecuencia_sugerida_id?: string;
  consecuencia_titulo?: string;
  fecha_creacion: string;
  estado: 'pendiente' | 'asignada' | 'perdonada';
}

export interface ReaccionDiario {
  usuario_id: string;
  emoji: string;
  fecha?: string;
}

export interface DiarioEntrada {
  entrada_id: string;
  usuario_id: string;
  texto: string;
  emocion: 'Sad' | 'Angry' | 'Okay' | 'Good' | 'Great';
  nota_voz_url?: string;
  visible_familia: boolean;
  fecha: string; // YYYY-MM-DD
  reacciones?: ReaccionDiario[];
}

export interface AhorroSobre {
  sobre_id: string;
  familia_id?: string;
  usuario_id?: string;
  titulo: string;
  monto_meta: number;
  monto_actual: number;
  aportes: {
    usuario_id: string;
    monto: number;
    fecha: string;
  }[];
}

export interface Frase {
  frase_id: string;
  texto: string;
  autor: string;
}

export interface OrganizedIdeaStep {
  stepNumber: number;
  title: string;
  description: string;
  estimatedTime: string;
  category?: 'Hogar' | 'Estudio' | 'Salud' | 'Personal' | 'Otros';
}

export interface OrganizedIdea {
  idea_id?: string;
  title: string;
  summary: string;
  category: string;
  estimatedDuration: string;
  difficulty: string;
  steps: OrganizedIdeaStep[];
  suggestedGoal?: {
    title: string;
    frequency: string;
    recommendation: string;
  };
  encouragement: string;
  createdAt?: string;
}

export type ViewType =
  | 'onboarding'
  | 'login'
  | 'hoy'
  | 'metas'
  | 'familia'
  | 'diario'
  | 'ideas'
  | 'juegos'
  | 'admin-dashboard'
  | 'admin-families'
  | 'admin-assign-task'
  | 'admin-user-detail'
  | 'code-exporter';
