import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  ArrowLeft, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  Sparkles, 
  UserCheck, 
  X, 
  Check, 
  RotateCcw,
  MessageSquare
} from 'lucide-react';
import { Usuario, DesbloqueoUsuario } from '../../types';
import { BOTS, BotPersonality, isBotUnlocked } from '../../data/gameBots';

interface GuessWhoVsAiGameProps {
  currentUser: Usuario;
  usuarios?: Usuario[];
  desbloqueosUsuarios?: DesbloqueoUsuario[];
  onExit: () => void;
  onAwardPoints: (points: number) => void;
  onSaveProgress?: (game: string, score: number) => void;
}

export interface CharacterCard {
  id: string;
  nombre: string;
  avatar_url: string;
  glasses: boolean;
  longHair: boolean;
  hat: boolean;
  smile: boolean;
  isFamily: boolean;
}

const PRESET_EXTRA_CHARACTERS: CharacterCard[] = [
  { id: 'c-abuela', nombre: 'Abuela Sabia', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop', glasses: true, longHair: true, hat: false, smile: true, isFamily: true },
  { id: 'c-tio', nombre: 'Tío Viajero', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop', glasses: false, longHair: false, hat: true, smile: true, isFamily: true },
  { id: 'c-primo', nombre: 'Primo Músico', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop', glasses: true, longHair: false, hat: false, smile: true, isFamily: true },
  { id: 'c-sobrina', nombre: 'Sobrina Artista', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop', glasses: false, longHair: true, hat: false, smile: true, isFamily: true },
  { id: 'c-vecino', nombre: 'Don Pepe (Vecino)', avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop', glasses: true, longHair: false, hat: true, smile: false, isFamily: false },
  { id: 'c-michi', nombre: 'Michi Familiar', avatar_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&h=150&fit=crop', glasses: false, longHair: false, hat: false, smile: true, isFamily: true },
  { id: 'c-doctora', nombre: 'Dra. María', avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop', glasses: true, longHair: true, hat: false, smile: true, isFamily: false },
  { id: 'c-chef', nombre: 'Chef Bruno', avatar_url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&h=150&fit=crop', glasses: false, longHair: false, hat: true, smile: true, isFamily: false },
];

export interface QuestionDef {
  id: string;
  label: string;
  traitKey: keyof Omit<CharacterCard, 'id' | 'nombre' | 'avatar_url'>;
}

const QUESTIONS: QuestionDef[] = [
  { id: 'glasses', label: '¿Tiene lentes o gafas?', traitKey: 'glasses' },
  { id: 'longHair', label: '¿Tiene el cabello largo?', traitKey: 'longHair' },
  { id: 'hat', label: '¿Lleva un sombrero, gorra o accesorio?', traitKey: 'hat' },
  { id: 'smile', label: '¿Está sonriendo alegremente?', traitKey: 'smile' },
  { id: 'isFamily', label: '¿Es un integrante directo del hogar?', traitKey: 'isFamily' },
];

export default function GuessWhoVsAiGame({ currentUser, usuarios = [], desbloqueosUsuarios = [], onExit, onAwardPoints, onSaveProgress }: GuessWhoVsAiGameProps) {
  const [selectedBot, setSelectedBot] = useState<BotPersonality>(BOTS[0]);

  // Board Cards
  const [cards, setCards] = useState<CharacterCard[]>([]);

  // Secret characters
  const [userSecret, setUserSecret] = useState<CharacterCard | null>(null);
  const [botSecret, setBotSecret] = useState<CharacterCard | null>(null);

  // User state
  const [userEliminated, setUserEliminated] = useState<string[]>([]);
  const [showSecretPanel, setShowSecretPanel] = useState<boolean>(true);

  // Bot AI mental candidates list & asked questions
  const [botCandidates, setBotCandidates] = useState<CharacterCard[]>([]);
  const [botAskedQuestions, setBotAskedQuestions] = useState<string[]>([]);

  // Turn management & state
  const [isUserTurn, setIsUserTurn] = useState<boolean>(true);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);

  // Bot Message
  const [botMessage, setBotMessage] = useState<string>(BOTS[0].dialogs.welcome);
  const [botEmotion, setBotEmotion] = useState<'normal' | 'thinking' | 'happy' | 'surprised' | 'victory' | 'defeat'>('normal');

  // Winner
  const [winner, setWinner] = useState<'user' | 'bot' | null>(null);
  const [guessTargetCard, setGuessTargetCard] = useState<CharacterCard | null>(null);

  // Initialize board & secrets
  const startNewGame = (bot: BotPersonality = selectedBot) => {
    setSelectedBot(bot);

    // Build 12 cards
    const familyCards: CharacterCard[] = usuarios.map(u => ({
      id: u.uid,
      nombre: u.nombre,
      avatar_url: u.avatar_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop",
      glasses: false,
      longHair: u.nombre.toLowerCase().includes('a') || u.nombre.toLowerCase().includes('ía'),
      hat: false,
      smile: true,
      isFamily: true
    }));

    let combined = [...familyCards];
    let extraIndex = 0;
    while (combined.length < 12 && extraIndex < PRESET_EXTRA_CHARACTERS.length) {
      combined.push(PRESET_EXTRA_CHARACTERS[extraIndex]);
      extraIndex++;
    }

    setCards(combined);

    // Pick User Secret & Bot Secret
    const randUserIdx = Math.floor(Math.random() * combined.length);
    let randBotIdx = Math.floor(Math.random() * combined.length);
    while (randBotIdx === randUserIdx && combined.length > 1) {
      randBotIdx = Math.floor(Math.random() * combined.length);
    }

    setUserSecret(combined[randUserIdx]);
    setBotSecret(combined[randBotIdx]);

    setUserEliminated([]);
    setBotCandidates([...combined]);
    setBotAskedQuestions([]);
    setIsUserTurn(true);
    setIsBotThinking(false);
    setWinner(null);
    setGuessTargetCard(null);
    setBotEmotion('normal');
    setBotMessage(bot.dialogs.welcome);
  };

  useEffect(() => {
    startNewGame();
  }, []);

  // User asks a question
  const handleUserAskQuestion = (question: QuestionDef) => {
    if (!isUserTurn || !botSecret || winner || isBotThinking) return;

    const traitVal = botSecret[question.traitKey];
    const answerStr = traitVal ? '¡SÍ!' : '¡NO!';

    if (traitVal) {
      setBotEmotion('surprised');
      setBotMessage(`Respuesta: ${answerStr} Mi personaje secreto SI ${question.label.toLowerCase().replace('¿', '').replace('?', '')}.`);
    } else {
      setBotEmotion('normal');
      setBotMessage(`Respuesta: ${answerStr} Mi personaje secreto NO ${question.label.toLowerCase().replace('¿', '').replace('?', '')}.`);
    }

    // Switch turn to Bot
    setIsUserTurn(false);
  };

  // User guesses a specific card
  const handleUserGuessCard = (card: CharacterCard) => {
    if (!isUserTurn || !botSecret || winner || isBotThinking) return;

    if (card.id === botSecret.id) {
      // User Wins!
      setWinner('user');
      setBotEmotion('defeat');
      setBotMessage(selectedBot.dialogs.userWin);

      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      onAwardPoints(selectedBot.pointsReward);
      if (onSaveProgress) onSaveProgress('guesswho_ai', selectedBot.pointsReward);
    } else {
      // Wrong guess
      setUserEliminated(prev => [...prev, card.id]);
      setBotEmotion('happy');
      setBotMessage(`¡Incorrecto! Tu sospechoso ${card.nombre} no es mi personaje secreto.`);
      setIsUserTurn(false);
    }
  };

  // Bot Turn Logic
  useEffect(() => {
    if (!isUserTurn && !winner && botSecret && userSecret) {
      setIsBotThinking(true);
      setBotEmotion('thinking');

      const timer = setTimeout(() => {
        makeBotDecision();
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [isUserTurn, winner, botSecret, userSecret]);

  // Execute Bot AI turn
  const makeBotDecision = () => {
    if (!userSecret) return;

    // 1. Should Bot guess user secret directly? (When 2 or fewer candidates left)
    if (botCandidates.length <= 2) {
      const targetCandidate = botCandidates[Math.floor(Math.random() * botCandidates.length)];

      if (targetCandidate.id === userSecret.id) {
        // Bot Wins!
        setWinner('bot');
        setBotEmotion('victory');
        setBotMessage(`¡Adiviné! Tu personaje secreto es ${targetCandidate.nombre}. ${selectedBot.dialogs.botWin}`);
        setIsBotThinking(false);
        return;
      } else {
        // Bot wrong guess -> eliminate that candidate
        const newCandidates = botCandidates.filter(c => c.id !== targetCandidate.id);
        setBotCandidates(newCandidates);
        setBotMessage(`Arriesgué con ${targetCandidate.nombre} y fallé. ¡Tu turno!`);
        setIsBotThinking(false);
        setIsUserTurn(true);
        return;
      }
    }

    // 2. Select Question
    const unasked = QUESTIONS.filter(q => !botAskedQuestions.includes(q.id));
    let chosenQuestion: QuestionDef;

    const isStrategicBot = selectedBot.id === 'bea' || selectedBot.id === 'vikram' || selectedBot.id === 'lin';

    if (isStrategicBot && unasked.length > 0) {
      // Evaluate each unasked question against botCandidates to find closest to 50/50 split
      let bestQ = unasked[0];
      let minDiff = Infinity;

      unasked.forEach(q => {
        let yesCount = 0;
        botCandidates.forEach(c => {
          if (c[q.traitKey]) yesCount++;
        });
        const noCount = botCandidates.length - yesCount;
        const diff = Math.abs(yesCount - noCount);

        if (diff < minDiff) {
          minDiff = diff;
          bestQ = q;
        }
      });

      chosenQuestion = bestQ;
    } else {
      // Easy Random Question (Oscar)
      chosenQuestion = unasked.length > 0
        ? unasked[Math.floor(Math.random() * unasked.length)]
        : QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    }

    setBotAskedQuestions(prev => [...prev, chosenQuestion.id]);

    // Check user secret answer to this question
    const userHasTrait = userSecret[chosenQuestion.traitKey];

    // Filter Bot candidate list based on userHasTrait answer
    const nextCandidates = botCandidates.filter(c => c[chosenQuestion.traitKey] === userHasTrait);
    setBotCandidates(nextCandidates);

    setBotEmotion(userHasTrait ? 'happy' : 'normal');
    setBotMessage(`Pregunta para ti: "${chosenQuestion.label}" (${nextCandidates.length} sospechosos me quedan).`);

    setIsBotThinking(false);
    setIsUserTurn(true);
  };

  // Toggle card flipped state manually by user
  const toggleCardElimination = (id: string) => {
    setUserEliminated(prev =>
      prev.includes(id) ? prev.filter(cardId => cardId !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-sans animate-fade-in pb-12">
      
      {/* Top Bar */}
      <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} className="text-purple-600" /> Adivina Quién IA
              </span>
              <span className="text-xs text-gray-400 font-bold">Modo 1 Jugador</span>
            </div>
            <h2 className="font-sans text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
              Adivinanza Familiar contra la Máquina
            </h2>
          </div>
        </div>

        {/* Bot Personality Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto max-w-full">
          {BOTS.map((bot) => {
            const unlocked = isBotUnlocked(bot.id, desbloqueosUsuarios, currentUser?.uid);
            return (
              <button
                key={bot.id}
                onClick={() => {
                  if (!unlocked) {
                    alert(`🔒 Cumple una meta semanal para desbloquear a ${bot.name}`);
                    return;
                  }
                  startNewGame(bot);
                }}
                title={unlocked ? bot.description : `Cumple una meta semanal para desbloquear a ${bot.name}`}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  selectedBot.id === bot.id
                    ? `${bot.badgeColor} shadow-md scale-105`
                    : unlocked
                      ? 'bg-white text-gray-600 hover:bg-slate-200'
                      : 'bg-gray-200 text-gray-400 border border-gray-300'
                }`}
              >
                <span>{bot.name}</span>
                {!unlocked && <span className="text-xs">🔒</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Game Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Bot Mascot, User Secret Card, Questions */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Bot Card */}
          <div className="bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-5 text-white shadow-xl space-y-4 border border-purple-500/20 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <img 
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                src={selectedBot.avatar} 
                alt={selectedBot.name} 
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-white">{selectedBot.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${selectedBot.badgeColor}`}>
                    Nivel {selectedBot.level}
                  </span>
                </div>
                <p className="text-xs text-purple-200 font-medium">{selectedBot.role}</p>
              </div>
            </div>

            {/* Talk Bubble */}
            <div className="relative bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-xs text-purple-100 font-medium leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0">{isBotThinking ? '🧠' : '💬'}</span>
                <div>
                  {isBotThinking ? (
                    <span className="animate-pulse text-purple-300 font-bold">
                      Analizando rasgos y descarte probabilístico...
                    </span>
                  ) : (
                    <span>"{botMessage}"</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* My Secret Character Card */}
          {userSecret && (
            <div className="bg-white rounded-3xl p-4 border border-purple-100 shadow-md space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={16} className="text-purple-600" /> Tu Personaje Secreto
                </span>
                <button
                  onClick={() => setShowSecretPanel(!showSecretPanel)}
                  className="text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
                >
                  {showSecretPanel ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {showSecretPanel ? (
                <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-2xl border border-purple-100">
                  <img src={userSecret.avatar_url} className="w-12 h-12 rounded-xl object-cover border-2 border-purple-300" alt="" />
                  <div>
                    <h4 className="font-bold text-sm text-purple-950">{userSecret.nombre}</h4>
                    <p className="text-[10px] text-purple-700">
                      {userSecret.glasses ? '👓 Lentes ' : ''}
                      {userSecret.hat ? '🎩 Sombrero ' : ''}
                      {userSecret.longHair ? '💇‍♀️ Cabello largo' : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100 p-3 rounded-2xl text-center text-xs text-gray-500 font-medium italic">
                  Personaje Oculto (Haz clic para ver)
                </div>
              )}
            </div>
          )}

          {/* Questions Menu */}
          <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-md space-y-3">
            <h4 className="font-sans text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle size={16} className="text-purple-600" />
              Hacer Pregunta de Descarte
            </h4>

            <div className="space-y-2">
              {QUESTIONS.map(q => (
                <button
                  key={q.id}
                  onClick={() => handleUserAskQuestion(q)}
                  disabled={!isUserTurn || isBotThinking || !!winner}
                  className="w-full text-left p-3 rounded-2xl bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-100 text-slate-800 font-bold text-xs transition-all cursor-pointer disabled:opacity-40 flex items-center justify-between"
                >
                  <span>{q.label}</span>
                  <span className="text-purple-600">➔</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Character Board Grid */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-[32px] p-6 border-2 border-purple-100 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-extrabold text-purple-600 uppercase tracking-wider block">
                  Tablero de Sospechosos (12)
                </span>
                <p className="text-xs text-gray-500">
                  Haz clic en las cartas para descartarlas o adivinar directamente.
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1 bg-purple-100 text-purple-900 rounded-full">
                {12 - userEliminated.length} Restantes
              </span>
            </div>

            {/* Grid 12 Characters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {cards.map((card) => {
                const isEliminated = userEliminated.includes(card.id);

                return (
                  <div
                    key={card.id}
                    className={`relative rounded-2xl border-2 p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
                      isEliminated
                        ? 'bg-slate-100 border-slate-200 opacity-30 grayscale scale-95'
                        : 'bg-gradient-to-b from-white to-purple-50/50 border-purple-200 hover:shadow-lg hover:border-purple-400'
                    }`}
                  >
                    <img 
                      src={card.avatar_url} 
                      alt={card.nombre} 
                      className="w-16 h-16 rounded-2xl object-cover shadow-sm mb-2"
                    />
                    <h5 className="font-bold text-xs text-gray-900 line-clamp-1">{card.nombre}</h5>

                    {/* Action buttons */}
                    <div className="flex gap-1 mt-2.5 w-full">
                      <button
                        onClick={() => toggleCardElimination(card.id)}
                        className={`flex-1 py-1 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${
                          isEliminated 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {isEliminated ? 'Restaurar' : 'Descartar'}
                      </button>

                      {!isEliminated && (
                        <button
                          onClick={() => handleUserGuessCard(card)}
                          disabled={!isUserTurn || isBotThinking || !!winner}
                          className="px-2 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-[10px] font-black cursor-pointer transition-all disabled:opacity-40"
                          title="¿Es este tu personaje secreto?"
                        >
                          🎯
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Winner Overlay Modal */}
      {winner && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-2 border-purple-500 rounded-3xl p-6 text-center text-white max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto text-3xl">
              {winner === 'user' ? '🏆' : '🎭'}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">
                {winner === 'user' ? '¡ADIVINASTE CORRECTAMENTE!' : '¡EL BOT ADIVINÓ PRIMERO!'}
              </h3>
              <p className="text-xs text-purple-200">
                {winner === 'user'
                  ? `¡Descubriste al personaje de ${selectedBot.name} (${botSecret?.nombre}) y ganaste +${selectedBot.pointsReward} Pts!`
                  : `${selectedBot.name} adivinó tu personaje (${userSecret?.nombre}).`}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => startNewGame()}
                className="flex-1 py-3 rounded-full bg-purple-400 hover:bg-purple-500 text-slate-950 font-black text-xs transition-all cursor-pointer"
              >
                Jugar Otra Vez
              </button>
              <button
                onClick={onExit}
                className="flex-1 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
