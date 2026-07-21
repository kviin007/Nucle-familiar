import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  ArrowLeft, 
  Sparkles, 
  Smile, 
  Flame, 
  HelpCircle, 
  Footprints, 
  Layers, 
  CheckCircle, 
  Play, 
  RotateCcw 
} from 'lucide-react';

export default function JuegosScreen() {
  const [activeGame, setActiveGame] = useState<'trivia' | 'pasos' | 'memoria' | null>(null);

  // Common Score and Reward state
  const [gameScore, setGameScore] = useState(0);

  // ==========================================
  // GAME 1: TRIVIA FAMILIAR STATE & DATA
  // ==========================================
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [selectedTriviaOpt, setSelectedTriviaOpt] = useState<number | null>(null);
  const [triviaFeedback, setTriviaFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaFinished, setTriviaFinished] = useState(false);

  const triviaQuestions = [
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
    }
  ];

  const handleTriviaAnswer = (idx: number) => {
    if (triviaFeedback !== null) return;
    setSelectedTriviaOpt(idx);
    const correct = idx === triviaQuestions[triviaIndex].correctIndex;
    if (correct) {
      setTriviaFeedback('correct');
      setTriviaScore(prev => prev + 10);
    } else {
      setTriviaFeedback('wrong');
    }
  };

  const handleTriviaNext = () => {
    setSelectedTriviaOpt(null);
    setTriviaFeedback(null);
    if (triviaIndex < triviaQuestions.length - 1) {
      setTriviaIndex(prev => prev + 1);
    } else {
      setTriviaFinished(true);
    }
  };

  const resetTrivia = () => {
    setTriviaIndex(0);
    setSelectedTriviaOpt(null);
    setTriviaFeedback(null);
    setTriviaScore(0);
    setTriviaFinished(false);
  };

  // ==========================================
  // GAME 2: RETO DE PASOS STATE & DATA
  // ==========================================
  const [familySteps, setFamilySteps] = useState<Record<'maria' | 'leo' | 'mia' | 'papa', number>>({
    maria: 8400,
    leo: 12500,
    mia: 6300,
    papa: 9200
  });
  const [selectedMemberForSteps, setSelectedMemberForSteps] = useState<'maria' | 'leo' | 'mia' | 'papa'>('maria');
  const [stepsInput, setStepsInput] = useState<string>('2000');
  const [stepsLoggedNotification, setStepsLoggedNotification] = useState<string | null>(null);

  const stepsGoal = 50000;
  const currentTotalSteps = (Object.values(familySteps) as number[]).reduce((a, b) => a + b, 0);
  const stepsPercentage = Math.min(100, Math.round((currentTotalSteps / stepsGoal) * 100));

  const handleAddSteps = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(stepsInput);
    if (isNaN(parsed) || parsed <= 0) return;

    setFamilySteps(prev => ({
      ...prev,
      [selectedMemberForSteps]: prev[selectedMemberForSteps] + parsed
    }));

    const memberName = selectedMemberForSteps === 'maria' ? 'Mamá María' 
                     : selectedMemberForSteps === 'leo' ? 'Leo' 
                     : selectedMemberForSteps === 'mia' ? 'Mía' 
                     : 'Papá Hugo';

    setStepsLoggedNotification(`¡Registrado! Se sumaron ${parsed.toLocaleString()} pasos a ${memberName}.`);
    setStepsInput('2000');

    setTimeout(() => {
      setStepsLoggedNotification(null);
    }, 4000);
  };

  // ==========================================
  // GAME 3: MEMORY MATCH (ROMPECABEZAS) STATE
  // ==========================================
  const initialCards = [
    { id: 1, name: 'Mamá', icon: '👩‍🍳', matched: false },
    { id: 2, name: 'Papá', icon: '👨‍🔧', matched: false },
    { id: 3, name: 'Leo', icon: '👦', matched: false },
    { id: 4, name: 'Mía', icon: '👧', matched: false },
    { id: 5, name: 'Lema', icon: '🤝', matched: false },
    { id: 6, name: 'Racha', icon: '🔥', matched: false },
    { id: 7, name: 'Mamá', icon: '👩‍🍳', matched: false },
    { id: 8, name: 'Papá', icon: '👨‍🔧', matched: false },
    { id: 9, name: 'Leo', icon: '👦', matched: false },
    { id: 10, name: 'Mía', icon: '👧', matched: false },
    { id: 11, name: 'Lema', icon: '🤝', matched: false },
    { id: 12, name: 'Racha', icon: '🔥', matched: false },
  ];

  const [cards, setCards] = useState<typeof initialCards>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [matchesCount, setMatchesCount] = useState(0);
  const [memFinished, setMemFinished] = useState(false);

  const shuffleCards = () => {
    const shuffled = [...initialCards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setSelectedCards([]);
    setMatchesCount(0);
    setMemFinished(false);
  };

  useEffect(() => {
    if (activeGame === 'memoria') {
      shuffleCards();
    }
  }, [activeGame]);

  const handleCardClick = (index: number) => {
    if (selectedCards.length === 2 || cards[index].matched || selectedCards.includes(index)) return;

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      const first = cards[newSelected[0]];
      const second = cards[newSelected[1]];

      if (first.name === second.name) {
        // Matched!
        setTimeout(() => {
          setCards(prev => prev.map((card, idx) => {
            if (idx === newSelected[0] || idx === newSelected[1]) {
              return { ...card, matched: true };
            }
            return card;
          }));
          setMatchesCount(prev => {
            const next = prev + 1;
            if (next === 6) {
              setMemFinished(true);
            }
            return next;
          });
          setSelectedCards([]);
        }, 500);
      } else {
        // Not a match
        setTimeout(() => {
          setSelectedCards([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title block with Breadcrumb if in game */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {activeGame ? (
            <button 
              onClick={() => setActiveGame(null)}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-100 text-slate-600 hover:text-slate-900 transition-all font-bold text-xs shadow-sm mb-2"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              Volver a Juegos
            </button>
          ) : null}
          <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
            {activeGame === 'trivia' ? 'Trivia Familiar' 
             : activeGame === 'pasos' ? 'Reto de Pasos Colectivo' 
             : activeGame === 'memoria' ? 'Memoria del Núcleo' 
             : '¡A Jugar!'}
          </h2>
          <p className="font-sans text-sm text-gray-500 font-medium">
            {activeGame === 'trivia' ? 'Pon a prueba cuánto conoces a los miembros de tu familia.' 
             : activeGame === 'pasos' ? 'Sumen sus pasos diarios y avancen juntos hacia la meta.' 
             : activeGame === 'memoria' ? 'Encuentra las parejas de iconos representativos de nuestro hogar.' 
             : 'Diviértete y conecta con tu familia a través de estos retos cooperativos.'}
          </p>
        </div>

        {/* Global Stats or Streak banner if no active game */}
        {!activeGame && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-left self-start md:self-auto">
            <span className="text-xl">🏆</span>
            <div>
              <span className="text-[10px] text-amber-800 font-black uppercase tracking-wider block">Racha Familiar</span>
              <span className="text-xs font-bold text-amber-950">¡7 Días Jugando Juntos!</span>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* GAME SELECTION MENU */}
        {!activeGame && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Game Card 1: Trivia */}
            <div className="bg-white rounded-[32px] border border-indigo-50/60 shadow-xl shadow-indigo-100/25 overflow-hidden flex flex-col justify-between h-[380px] relative group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="absolute inset-0 z-0">
                <img
                  alt="Trivia"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-all duration-500"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbxlpViINInMwblvJVtu-pXCAhYNWTI_I5eQld1WkJhppLZEueEnGsKkxMm7iAfCypOhwUfKniyhZscWNnBzq6dE6k8xW7uSGNxefZib4H_affWRU9QHA_b-3zJAuXCHjqYPezRL-wwysLWu4n6r5ByuUHJ50AWdmfUHRD0gkgPI_NplNOgTnLyxTZGJtpUZG1JmTi9kkqhIR7-wj-r639HFu14cg4NFdqGT62i_KJKUwtOKKp4yD4d8AtJIPSY-7gHuluMrrriLc"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-transparent z-10" />
              <div className="z-20 p-4 flex justify-end">
                <span className="px-3 py-1 rounded-full bg-brand-light text-brand-dark font-sans text-[10px] font-bold shadow-sm uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle size={12} />
                  2-6 Jugadores
                </span>
              </div>
              <div className="z-20 p-5 mt-auto text-left space-y-3">
                <h3 className="font-sans text-xl font-extrabold text-white tracking-tight">Trivia Familiar</h3>
                <p className="font-sans text-xs text-gray-300 line-clamp-2 leading-relaxed">
                  ¿Quién conoce mejor las historias, anécdotas y detalles divertidos de la familia?
                </p>
                <button 
                  onClick={() => {
                    resetTrivia();
                    setActiveGame('trivia');
                  }}
                  className="w-full bg-brand-primary hover:bg-brand-dark text-white py-3 rounded-full font-sans text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Play size={14} />
                  Jugar Ahora
                </button>
              </div>
            </div>

            {/* Game Card 2: Steps Challenge */}
            <div className="bg-white rounded-[32px] border border-indigo-50/60 shadow-xl shadow-indigo-100/25 overflow-hidden flex flex-col justify-between h-[380px] relative group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="absolute inset-0 z-0">
                <img
                  alt="Steps Challenge"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-all duration-500"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8OUW6wnl3nx6ERBkcSZZWb64be48IIBf3_kruWb9yA5wUSRWlmVNHYIMxsVnN9oP24uAg1lAjSvmTnNvxNokh19C4jscYydF_wlAavoZ2-f4aFsRSMKcwWoG6hThwSus6ns-RKRW7gN_A6GqKWEni1Xlwn3CI1YeUagjGf1Wmgoav_Sy0dZwnIgSWu_dE3PlwYz-0Z-Z9n3v5dHSSnEF1xrbrLgQDlH_f3mdQT-TE4rFnMw0RjlXRmt9WgfXmL1egwvzzC78cNOw"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-transparent z-10" />
              <div className="z-20 p-4 flex justify-end">
                <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-sans text-[10px] font-bold shadow-sm uppercase tracking-wider flex items-center gap-1">
                  <Footprints size={12} />
                  Colaborativo
                </span>
              </div>
              <div className="z-20 p-5 mt-auto text-left space-y-3">
                <h3 className="font-sans text-xl font-extrabold text-white tracking-tight">Reto de Pasos</h3>
                <p className="font-sans text-xs text-gray-300 line-clamp-2 leading-relaxed">
                  Sincronicen sus podómetros y acumulen pasos juntos esta semana. ¡A moverse!
                </p>
                <button 
                  onClick={() => setActiveGame('pasos')}
                  className="w-full bg-brand-primary hover:bg-brand-dark text-white py-3 rounded-full font-sans text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Footprints size={14} />
                  Ver Desafío de Pasos
                </button>
              </div>
            </div>

            {/* Game Card 3: Memory */}
            <div className="bg-white rounded-[32px] border border-indigo-50/60 shadow-xl shadow-indigo-100/25 overflow-hidden flex flex-col justify-between h-[380px] relative group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="absolute inset-0 z-0">
                <img
                  alt="Rompecabezas"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-all duration-500"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCONKNEZ086uD1Fqrgr7_HTKsQ4wyGfFZSms6OO_cmDQu8mAbeXZOovAINgoS5u1KDckk7TiwISLPnwJ1NP0ERn0QGLfpBdwkNZc7TP0ccTWI9fjYbCw2_cfguJvBaNEr7l9p7hSn_K3dYKEiMNdr6YTMt4IXNwMmlVj2fOXPPWpzVTIZaLHl50EIHzgJn1ZksKOu4kEZnLBMR06DWXpqQk_t9H0iB6rNBcuw1UTvQ1DaNNAykcg5pGzCqAOr5BoDrkL-MidZZTbrA"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-transparent z-10" />
              <div className="z-20 p-4 flex justify-end">
                <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-sans text-[10px] font-bold shadow-sm uppercase tracking-wider flex items-center gap-1">
                  <Layers size={12} />
                  Ejercita Mente
                </span>
              </div>
              <div className="z-20 p-5 mt-auto text-left space-y-3">
                <h3 className="font-sans text-xl font-extrabold text-white tracking-tight">Memoria del Núcleo</h3>
                <p className="font-sans text-xs text-gray-300 line-clamp-2 leading-relaxed">
                  Encuentra pares de iconos representativos de nuestro Núcleo Familiar en el menor tiempo.
                </p>
                <button 
                  onClick={() => setActiveGame('memoria')}
                  className="w-full bg-brand-primary hover:bg-brand-dark text-white py-3 rounded-full font-sans text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Layers size={14} />
                  Jugar Memoria
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* 1. TRIVIA GAME BOARD */}
        {activeGame === 'trivia' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full max-w-2xl mx-auto bg-white rounded-3xl border border-indigo-50/60 shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden"
          >
            {/* Top info and score */}
            <div className="flex justify-between items-center border-b border-indigo-50 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-[#6366F1] font-bold text-xs uppercase">
                  Pregunta {triviaIndex + 1} de {triviaQuestions.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                <Trophy size={16} />
                <span>Puntos: {triviaScore}</span>
              </div>
            </div>

            {!triviaFinished ? (
              <div className="space-y-6">
                <h3 className="font-sans text-lg md:text-xl font-extrabold text-gray-900 leading-snug">
                  {triviaQuestions[triviaIndex].question}
                </h3>

                {/* Option buttons */}
                <div className="grid grid-cols-1 gap-3">
                  {triviaQuestions[triviaIndex].options.map((opt, idx) => {
                    const isSelected = selectedTriviaOpt === idx;
                    const isCorrect = idx === triviaQuestions[triviaIndex].correctIndex;
                    
                    let style = "border-slate-150 hover:border-[#6366F1] bg-slate-50/40 text-gray-800";
                    if (selectedTriviaOpt !== null) {
                      if (isSelected) {
                        style = isCorrect 
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-sm" 
                          : "border-rose-400 bg-rose-50 text-rose-900 font-bold";
                      } else if (isCorrect) {
                        style = "border-emerald-500 bg-emerald-50/50 text-emerald-900 font-bold";
                      } else {
                        style = "border-slate-100 opacity-40 text-gray-400";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={selectedTriviaOpt !== null}
                        onClick={() => handleTriviaAnswer(idx)}
                        className={`w-full text-left p-4 rounded-2xl border text-sm font-semibold transition-all active:scale-98 ${style}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                            isSelected && isCorrect ? 'bg-emerald-500 text-white' 
                            : isSelected ? 'bg-rose-500 text-white' 
                            : 'bg-indigo-50 text-brand-primary'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback explanation block */}
                {triviaFeedback && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                      triviaFeedback === 'correct' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-900' 
                        : 'bg-rose-50 border-rose-100 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <span className="material-symbols-outlined text-base">
                        {triviaFeedback === 'correct' ? 'check_circle' : 'info'}
                      </span>
                      {triviaFeedback === 'correct' ? '¡Excelente respuesta!' : '¡Oh, no es la correcta!'}
                    </div>
                    <p>{triviaQuestions[triviaIndex].explanation}</p>
                  </motion.div>
                )}

                {/* Action button */}
                {selectedTriviaOpt !== null && (
                  <button
                    onClick={handleTriviaNext}
                    className="w-full py-4 rounded-full bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
                  >
                    {triviaIndex === triviaQuestions.length - 1 ? 'Terminar Trivia' : 'Siguiente Pregunta'}
                  </button>
                )}
              </div>
            ) : (
              /* FINISHED SCREEN */
              <div className="text-center py-6 space-y-6">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle size={44} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900">¡Reto Completado!</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Has respondido todas las preguntas sobre nuestro núcleo familiar. ¡Buen trabajo!
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 max-w-xs mx-auto flex justify-between items-center text-left">
                  <div>
                    <span className="text-xs text-gray-400 block font-bold">Puntaje logrado</span>
                    <span className="text-base font-black text-gray-900">Sabiduría Familiar</span>
                  </div>
                  <span className="font-mono text-xl font-black text-[#6366F1]">{triviaScore} / 30 Pts</span>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={resetTrivia}
                    className="px-6 py-3 rounded-full border border-slate-200 hover:bg-slate-50 font-bold text-xs text-gray-600 transition-all active:scale-95"
                  >
                    Reintentar
                  </button>
                  <button
                    onClick={() => setActiveGame(null)}
                    className="px-6 py-3 rounded-full bg-brand-primary hover:bg-brand-dark text-white font-bold text-xs transition-all shadow-md active:scale-95"
                  >
                    Salir al Menu
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* 2. STEPS CHALLENGE BOARD */}
        {activeGame === 'pasos' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Steps Goal Progress Container */}
            <div className="md:col-span-2 bg-white rounded-3xl border border-indigo-50/60 shadow-xl shadow-indigo-100/20 p-5 md:p-6 space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-sans text-base font-extrabold text-gray-900 uppercase tracking-wide">
                      Meta Colectiva Semanal
                    </h3>
                    <p className="font-sans text-xs text-gray-500 mt-1">
                      Sumamos todos nuestros pasos cotidianos para promover la vida activa.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider">
                    Objetivo
                  </span>
                </div>

                {/* Progress bar and details */}
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between items-end text-xs font-bold text-gray-600">
                    <span>Avance Acumulado</span>
                    <span className="text-brand-primary font-black text-sm">
                      {currentTotalSteps.toLocaleString()} / {stepsGoal.toLocaleString()} pasos
                    </span>
                  </div>
                  
                  {/* Visual full bar */}
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-150/50">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-400 via-pink-500 to-[#6366F1] rounded-full transition-all duration-700"
                      style={{ width: `${stepsPercentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <span>Falta {(stepsGoal - Math.min(stepsGoal, currentTotalSteps)).toLocaleString()} pasos</span>
                    <span className="text-emerald-500">{stepsPercentage}% completado</span>
                  </div>
                </div>
              </div>

              {/* Members Breakdown */}
              <div className="space-y-3 mt-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Desglose por Integrante
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'maria', name: 'Mamá María', value: familySteps.maria, color: 'bg-emerald-500' },
                    { id: 'leo', name: 'Leo García', value: familySteps.leo, color: 'bg-rose-500' },
                    { id: 'mia', name: 'Mía García', value: familySteps.mia, color: 'bg-amber-500' },
                    { id: 'papa', name: 'Papá Hugo', value: familySteps.papa, color: 'bg-[#6366F1]' }
                  ].map(m => (
                    <div key={m.id} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${m.color}`} />
                        <span className="text-xs font-bold text-gray-700">{m.name}</span>
                      </div>
                      <span className="font-mono text-xs font-black text-gray-900">{m.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Logger Card */}
            <div className="bg-white rounded-3xl border border-indigo-50/60 shadow-xl shadow-indigo-100/20 p-5 md:p-6 space-y-4">
              <h3 className="font-sans text-base font-extrabold text-gray-900">
                Registrar Caminata
              </h3>
              <p className="font-sans text-xs text-gray-500 leading-relaxed">
                ¿Hiciste ejercicio o saliste a caminar hoy? Registra tus nuevos pasos en el podómetro familiar.
              </p>

              <form onSubmit={handleAddSteps} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    ¿Quién caminó?
                  </label>
                  <select
                    value={selectedMemberForSteps}
                    onChange={(e) => setSelectedMemberForSteps(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-brand-primary outline-none"
                  >
                    <option value="maria">Mamá María</option>
                    <option value="leo">Leo García (Explorador)</option>
                    <option value="mia">Mía García (Estudiante)</option>
                    <option value="papa">Papá Hugo (Guía)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Pasos dados
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={50000}
                    value={stepsInput}
                    onChange={(e) => setStepsInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Footprints size={14} />
                  Sincronizar Pasos
                </button>
              </form>

              {/* Notification Banner */}
              {stepsLoggedNotification && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-semibold text-emerald-800 text-center flex items-center justify-center gap-1"
                >
                  <Sparkles size={11} className="animate-spin" />
                  {stepsLoggedNotification}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* 3. MEMORY GAME BOARD */}
        {activeGame === 'memoria' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full max-w-2xl mx-auto bg-white rounded-3xl border border-indigo-50/60 shadow-2xl p-6 md:p-8 space-y-6"
          >
            <div className="flex justify-between items-center border-b border-indigo-50 pb-4">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-brand-primary font-bold text-xs uppercase">
                Encuentra las parejas
              </span>
              <button 
                onClick={shuffleCards}
                className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all active:scale-95"
              >
                <RotateCcw size={12} />
                Reiniciar Tablero
              </button>
            </div>

            {!memFinished ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 py-4">
                {cards.map((card, idx) => {
                  const isFlipped = selectedCards.includes(idx) || card.matched;

                  return (
                    <button
                      key={card.id}
                      onClick={() => handleCardClick(idx)}
                      className={`h-24 sm:h-28 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden ${
                        isFlipped 
                          ? 'border-brand-primary/40 bg-brand-light/30 text-slate-800 shadow-inner' 
                          : 'border-slate-150 bg-gradient-to-tr from-indigo-50 to-white hover:border-[#6366F1] shadow-sm'
                      }`}
                    >
                      {isFlipped ? (
                        <div className="flex flex-col items-center gap-1.5 animate-fade-in">
                          <span className="text-3xl">{card.icon}</span>
                          <span className="text-[10px] font-black uppercase text-brand-dark tracking-wider">{card.name}</span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100/50 flex items-center justify-center text-brand-primary font-bold">
                          ★
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 space-y-6">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                  <Sparkles size={44} className="animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900">¡Memoria Superada!</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Has sincronizado todas las tarjetas simbólicas del Núcleo Familiar con éxito.
                  </p>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={shuffleCards}
                    className="px-6 py-3 rounded-full border border-slate-200 hover:bg-slate-50 font-bold text-xs text-gray-600 transition-all active:scale-95"
                  >
                    Jugar de Nuevo
                  </button>
                  <button
                    onClick={() => setActiveGame(null)}
                    className="px-6 py-3 rounded-full bg-brand-primary hover:bg-brand-dark text-white font-bold text-xs transition-all shadow-md active:scale-95"
                  >
                    Volver a Juegos
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
