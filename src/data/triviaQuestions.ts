export interface TriviaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const triviaQuestions: TriviaQuestion[] = [
  {
    question: "¿Cuál es el lema diario oficial de nuestro Núcleo Familiar?",
    options: [
      "¡Cada quien por su lado y que rinda el tiempo!",
      "¡En equipo todo es posible!",
      "La paciencia es una virtud pero la prisa ayuda."
    ],
    correctIndex: 1,
    explanation: "¡Correcto! Nuestro lema familiar oficial es '¡En equipo todo es posible!', recordándonos que unidos superamos cualquier reto."
  },
  {
    question: "¿Quién es reconocido por ser el 'Explorador' del hogar?",
    options: [
      "Mía García",
      "Leo García",
      "Mamá María"
    ],
    correctIndex: 1,
    explanation: "¡Sí! Leo García ostenta el título de Explorador oficial gracias a su curiosidad y pasión por descubrir el mundo exterior."
  },
  {
    question: "¿Cuál es la recompensa principal tras completar todas las metas semanales?",
    options: [
      "Puntos de motivación familiar (+50 Pts) y orgullo colectivo",
      "Un boleto de avión para toda la familia",
      "Dormir 24 horas seguidas el fin de semana"
    ],
    correctIndex: 0,
    explanation: "¡Exacto! Lograr la meta semanal de tareas nos llena de orgullo y nos otorga valiosos puntos de motivación familiar."
  },
  {
    question: "¿Cuál de las siguientes acciones fortalece más el Núcleo Familiar?",
    options: [
      "Completar la preparación de entorno y colaborar en las tareas",
      "Comprar regalos costosos cada semana",
      "Pasar todo el día usando redes sociales de forma individual"
    ],
    correctIndex: 0,
    explanation: "¡Correcto! Trabajar juntos de forma organizada y respetuosa edifica un hogar más feliz y saludable."
  },
  {
    question: "¿Qué emoción se fomenta registrar en el diario para desahogarse de un mal día?",
    options: [
      "No registrar nada y reprimir la emoción",
      "Registrar con honestidad (como Sad u Okay) y compartir en familia para recibir apoyo",
      "Inventar que todo está bien siempre"
    ],
    correctIndex: 1,
    explanation: "¡Exacto! El diario de emociones de Vínculo Familiar promueve la transparencia y el apoyo emocional entre todos."
  },
  {
    question: "¿Qué hábito saludable ayuda a mantener alta la energía de toda la familia?",
    options: [
      "Tomar suficiente agua y registrar el reto de pasos diarios",
      "Ver televisión hasta la madrugada",
      "Comer comida rápida en todas las comidas"
    ],
    correctIndex: 0,
    explanation: "¡Muy bien! Registrar nuestros pasos y mantenernos activos nos da fuerza y salud para compartir tiempo juntos."
  },
  {
    question: "¿Qué planeta del sistema solar es conocido como el Planeta Rojo?",
    options: [
      "Júpiter",
      "Marte",
      "Venus"
    ],
    correctIndex: 1,
    explanation: "¡Correcto! Marte es conocido como el Planeta Rojo debido al óxido de hierro en su superficie."
  },
  {
    question: "¿Cuál es el océano más grande del planeta Tierra?",
    options: [
      "Océano Atlántico",
      "Océano Índico",
      "Océano Pacífico"
    ],
    correctIndex: 2,
    explanation: "¡Excelente! El Océano Pacífico es el más extenso de la Tierra, cubriendo más del 30% de la superficie del planeta."
  },
  {
    question: "¿Cuál es el mamífero volador más grande del mundo?",
    options: [
      "El Zorro Volador (Murciélago gigante)",
      "El Águila Real",
      "El Pájaro Carpintero"
    ],
    correctIndex: 0,
    explanation: "¡Correcto! El Zorro Volador es una especie de murciélago gigante de las Filipinas con una envergadura de hasta 1.7 metros."
  },
  {
    question: "¿Qué valor familiar nos ayuda a ponernos en el lugar del otro ante un problema?",
    options: [
      "Egoísmo",
      "Empatía",
      "Indiferencia"
    ],
    correctIndex: 1,
    explanation: "¡Exacto! La empatía nos permite entender y sentir lo que el otro experimenta, fortaleciendo el lazo familiar."
  }
];
