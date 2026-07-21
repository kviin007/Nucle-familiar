export interface Usuario {
  uid: string;
  nombre: string;
  avatar_url: string;
  familia_id: string;
  racha_actual: number;
  puntos: number;
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
  usuario_id: string;
  titulo: string;
  categoria: 'Salud' | 'Estudio' | 'Finanzas' | 'Hogar' | 'Personal';
  fecha_limite: string;
  porcentaje_semanal: number;
  visible_familia: boolean;
}

export interface TareaDiaria {
  tarea_id: string;
  usuario_id: string;
  meta_id?: string;
  titulo: string;
  hora_programada: string; // HH:MM
  tiempo_estimado_min: number;
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'vencido';
  ultima_actualizacion: string; // ISO string
  visible_familia: boolean;
}

export interface DiarioEntrada {
  entrada_id: string;
  usuario_id: string;
  texto: string;
  emocion: 'Sad' | 'Angry' | 'Okay' | 'Good' | 'Great';
  nota_voz_url?: string;
  visible_familia: boolean;
  fecha: string; // YYYY-MM-DD
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

export type ViewType =
  | 'onboarding'
  | 'login'
  | 'hoy'
  | 'metas'
  | 'familia'
  | 'diario'
  | 'juegos'
  | 'admin-dashboard'
  | 'admin-families'
  | 'admin-assign-task'
  | 'admin-user-detail'
  | 'code-exporter';
