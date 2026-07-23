export interface BotPersonality {
  id: 'oscar' | 'bea' | 'vikram' | 'lin';
  name: string;
  role: string;
  avatar: string;
  difficulty: 'Fácil' | 'Medio' | 'Desafío' | 'Maestro';
  level: number;
  badgeColor: string;
  pointsReward: number;
  description: string;
  dialogs: {
    welcome: string;
    goodMove: string[];
    checkUser?: string[];
    userCheck?: string[];
    captureUser?: string[];
    userCapture?: string[];
    hitTarget?: string[];
    missTarget?: string[];
    botWin: string;
    userWin: string;
  };
}

export const BOTS: BotPersonality[] = [
  {
    id: 'oscar',
    name: 'Oscar 🐣',
    role: 'Osezno Principiante',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
    difficulty: 'Fácil',
    level: 1,
    badgeColor: 'bg-emerald-500 text-white',
    pointsReward: 50,
    description: 'Apenas está aprendiendo los juegos de mesa. Ideal para niños y principiantes.',
    dialogs: {
      welcome: '¡Hola! Estoy muy emocionado de jugar contigo. ¡Vamos a divertirnos!',
      goodMove: ['¡Upa! Ese movimiento me tomó por sorpresa.', '¡Gran jugada!', '¡Muy bien jugado!'],
      hitTarget: ['¡Oh, acertaste de lleno!', '¡Ay! Le diste a mi objetivo.'],
      missTarget: ['¡Uff, cayó al agua!', '¡Por poco! Casi me das.'],
      botWin: '¡Gané por esta vez! Pero jugaste súper bien. ¿Revancha?',
      userWin: '¡Felicidades! ¡Me ganaste! Eres un genio de los juegos. 🏆'
    }
  },
  {
    id: 'bea',
    name: 'Bea 🦊',
    role: 'Estratega Veloz',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop',
    difficulty: 'Medio',
    level: 2,
    badgeColor: 'bg-amber-500 text-white',
    pointsReward: 80,
    description: 'Le encantan los juegos ágiles. Juega con astucia y buena intuición.',
    dialogs: {
      welcome: '¡Hola! Me encantan las partidas dinámicas. Demuéstrame tu mejor estrategia.',
      goodMove: ['¡Excelente visión de juego!', '¡Buena táctica!', '¡Qué movimiento tan inteligente!'],
      hitTarget: ['¡Impacto directo! Tienes buena puntería.', '¡Diablos, diste en el blanco!'],
      missTarget: ['¡Te desviaste un poco!', 'Agua total, estoy a salvo por ahora.'],
      botWin: '¡Partida estratégica ganada! Practicamos muy bien hoy.',
      userWin: '¡Increíble victoria! Dominaste el juego por completo. 🌟'
    }
  },
  {
    id: 'vikram',
    name: 'Vikram 🦁',
    role: 'Gran Maestro León',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop',
    difficulty: 'Desafío',
    level: 3,
    badgeColor: 'bg-indigo-600 text-white',
    pointsReward: 120,
    description: 'Evalúa la posición, analiza patrones y no regala ninguna oportunidad.',
    dialogs: {
      welcome: 'Un honor enfrentarte. Cada jugada requiere paciencia y precisión.',
      goodMove: ['Un movimiento de alto nivel.', 'Demuestras buena lectura de juego.', 'Sólida deducción.'],
      hitTarget: ['Impacto preciso en mis filas.', 'Lógica impecable, buen disparo.'],
      missTarget: ['Tiro fallido. Mi defensa se mantiene intacta.'],
      botWin: 'Partida finalizada. Excelente esfuerzo, cada juego te hace más fuerte.',
      userWin: '¡Soberbia victoria! Derrotaste al maestro León. 👑'
    }
  },
  {
    id: 'lin',
    name: 'Lin 👑',
    role: 'Campeona Mundial',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
    difficulty: 'Maestro',
    level: 4,
    badgeColor: 'bg-purple-600 text-white',
    pointsReward: 200,
    description: 'Calcula probabilidades instantáneamente. ¡El desafío definitivo de la IA!',
    dialogs: {
      welcome: 'Bienvenido al nivel máximo. Analizaré cada posibilidad para darte batalla.',
      goodMove: ['Precisión óptima de juego.', 'Estrategia profunda.', 'Respuesta excelente.'],
      hitTarget: ['Impacto confirmado. Buena distribución probabilística.'],
      missTarget: ['Fallo detectado. Mi cálculo posicional prevalece.'],
      botWin: 'Partida finalizada. ¡Un gran honor competir contigo!',
      userWin: '¡HISTÓRICO! Has vencido al nivel Maestro de la IA. ¡Eres una leyenda! 🏆'
    }
  }
];

export function isBotUnlocked(botId: string, unlocks: { tipo: string; valor: string; usuario_id?: string }[] = [], userId?: string): boolean {
  if (botId === 'oscar' || botId === 'bea') return true;
  return unlocks.some(u => u.tipo === 'bot' && u.valor === botId && (!userId || !u.usuario_id || u.usuario_id === userId));
}
