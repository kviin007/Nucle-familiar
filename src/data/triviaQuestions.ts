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
    explanation: "¡Exacto! El diario de emociones de Vinculo Familiar promueve la transparencia y el apoyo emocional entre todos."
  }
];
