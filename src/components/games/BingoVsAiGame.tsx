import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Volume2, 
  CheckCircle2, 
  Users,
  Award,
  Star
} from 'lucide-react';
import { Usuario, DesbloqueoUsuario } from '../../types';
import { BOTS, BotPersonality, isBotUnlocked } from '../../data/gameBots';

interface BingoVsAiGameProps {
  currentUser: Usuario;
  desbloqueosUsuarios?: DesbloqueoUsuario[];
  onExit: () => void;
  onAwardPoints: (points: number) => void;
  onSaveProgress?: (game: string, score: number) => void;
}

interface BotCardState {
  bot: BotPersonality;
  card: number[][];
  marked: boolean[][];
  hasBingo: boolean;
}

const COLUMN_CONFIG = [
  { letter: 'B', headerBg: 'bg-gradient-to-b from-rose-500 to-orange-500', circleBg: 'bg-gradient-to-br from-rose-500 to-orange-600 border-rose-300' },
  { letter: 'I', headerBg: 'bg-gradient-to-b from-sky-400 to-cyan-500', circleBg: 'bg-gradient-to-br from-sky-400 to-cyan-600 border-sky-300' },
  { letter: 'N', headerBg: 'bg-gradient-to-b from-emerald-500 to-teal-500', circleBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-300' },
  { letter: 'G', headerBg: 'bg-gradient-to-b from-blue-500 to-indigo-600', circleBg: 'bg-gradient-to-br from-blue-500 to-indigo-700 border-blue-300' },
  { letter: 'O', headerBg: 'bg-gradient-to-b from-purple-500 to-fuchsia-600', circleBg: 'bg-gradient-to-br from-purple-500 to-fuchsia-700 border-purple-300' },
];

const RANGES = [
  [1, 15],   // B
  [16, 30],  // I
  [31, 45],  // N
  [46, 60],  // G
  [61, 75]   // O
];

const generateBingoCard = (): number[][] => {
  const card: number[][] = [];
  for (let r = 0; r < 5; r++) {
    card.push([0, 0, 0, 0, 0]);
  }

  for (let col = 0; col < 5; col++) {
    const [min, max] = RANGES[col];
    const availableNumbers: number[] = [];
    for (let n = min; n <= max; n++) availableNumbers.push(n);

    for (let row = 0; row < 5; row++) {
      if (row === 2 && col === 2) {
        card[row][col] = 0; // Free space
      } else {
        const randIdx = Math.floor(Math.random() * availableNumbers.length);
        card[row][col] = availableNumbers[randIdx];
        availableNumbers.splice(randIdx, 1);
      }
    }
  }
  return card;
};

const checkBingo = (marked: boolean[][]): boolean => {
  // Check rows
  for (let r = 0; r < 5; r++) {
    if (marked[r].every(val => val)) return true;
  }
  // Check columns
  for (let c = 0; c < 5; c++) {
    let colFull = true;
    for (let r = 0; r < 5; r++) {
      if (!marked[r][c]) {
        colFull = false;
        break;
      }
    }
    if (colFull) return true;
  }
  // Check main diagonal
  let diag1 = true;
  for (let i = 0; i < 5; i++) {
    if (!marked[i][i]) {
      diag1 = false;
      break;
    }
  }
  if (diag1) return true;

  // Check anti diagonal
  let diag2 = true;
  for (let i = 0; i < 5; i++) {
    if (!marked[i][4 - i]) {
      diag2 = false;
      break;
    }
  }
  if (diag2) return true;

  return false;
};

export default function BingoVsAiGame({ currentUser, desbloqueosUsuarios = [], onExit, onAwardPoints, onSaveProgress }: BingoVsAiGameProps) {
  const [selectedMainBot, setSelectedMainBot] = useState<BotPersonality>(BOTS[0]);
  
  // Game state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [animBall, setAnimBall] = useState<number | null>(null);

  const lastCalledNumber = calledNumbers[calledNumbers.length - 1];

  useEffect(() => {
    if (lastCalledNumber) {
      setAnimBall(lastCalledNumber);
      const timer = setTimeout(() => setAnimBall(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [lastCalledNumber]);

  // User card state
  const [userCard, setUserCard] = useState<number[][]>([]);
  const [userMarked, setUserMarked] = useState<boolean[][]>([]);

  // Bot players cards state
  const [botPlayers, setBotPlayers] = useState<BotCardState[]>([]);

  // Initialize or Restart game
  const startNewGame = (mainBot: BotPersonality = selectedMainBot) => {
    setSelectedMainBot(mainBot);
    setIsPlaying(false);
    setCalledNumbers([]);
    setWinner(null);

    // User card
    const uCard = generateBingoCard();
    setUserCard(uCard);
    const uMarked = Array(5).fill(null).map((_, r) =>
      Array(5).fill(null).map((_, c) => (r === 2 && c === 2))
    );
    setUserMarked(uMarked);

    // Generate cards for 3 bots
    const participatingBots = BOTS.filter(b => b.id !== mainBot.id).slice(0, 3);
    participatingBots.unshift(mainBot); // Include main selected bot

    const botsState: BotCardState[] = participatingBots.map(bot => {
      const bCard = generateBingoCard();
      const bMarked = Array(5).fill(null).map((_, r) =>
        Array(5).fill(null).map((_, c) => (r === 2 && c === 2))
      );
      return {
        bot,
        card: bCard,
        marked: bMarked,
        hasBingo: false
      };
    });

    setBotPlayers(botsState);
  };

  useEffect(() => {
    startNewGame();
  }, []);

  // Automatic Ball Caller Loop (every 2.5s)
  useEffect(() => {
    if (!isPlaying || winner) return;

    const interval = setInterval(() => {
      // Pick next random uncalled number
      const uncalled: number[] = [];
      for (let i = 1; i <= 75; i++) {
        if (!calledNumbers.includes(i)) uncalled.push(i);
      }

      if (uncalled.length === 0) {
        setIsPlaying(false);
        return;
      }

      const nextNum = uncalled[Math.floor(Math.random() * uncalled.length)];
      const updatedCalled = [...calledNumbers, nextNum];
      setCalledNumbers(updatedCalled);

      // Auto mark for bots & check if any bot gets Bingo
      let botWinnerName: string | null = null;

      const updatedBots = botPlayers.map(bp => {
        const newMarked = bp.marked.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            if (bp.card[rIdx][cIdx] === nextNum) return true;
            return cell;
          })
        );

        const isBotBingo = checkBingo(newMarked);
        if (isBotBingo && !botWinnerName) {
          botWinnerName = bp.bot.name;
        }

        return {
          ...bp,
          marked: newMarked,
          hasBingo: isBotBingo
        };
      });

      setBotPlayers(updatedBots);

      if (botWinnerName) {
        setWinner(botWinnerName);
        setIsPlaying(false);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isPlaying, calledNumbers, winner, botPlayers]);

  // Handle User Cell Click
  const handleUserCellClick = (r: number, c: number) => {
    if (winner) return;
    const num = userCard[r][c];

    // Free space or must be a called number
    if (num !== 0 && !calledNumbers.includes(num)) return;

    const newMarked = userMarked.map((row, rIdx) =>
      row.map((val, cIdx) => (rIdx === r && cIdx === c ? !val : val))
    );
    setUserMarked(newMarked);
  };

  // User Canta Bingo!
  const handleUserCallBingo = () => {
    if (winner) return;

    const isUserBingo = checkBingo(userMarked);

    if (isUserBingo) {
      setWinner(currentUser.nombre || 'Tú');
      setIsPlaying(false);

      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      onAwardPoints(selectedMainBot.pointsReward);
      if (onSaveProgress) onSaveProgress('bingo_ai', selectedMainBot.pointsReward);
    } else {
      alert('¡Aún no completas una línea o columna válida! Sigue atento a las balotas.');
    }
  };

  const getLetterForNumber = (num: number) => {
    if (num <= 15) return 'B';
    if (num <= 30) return 'I';
    if (num <= 45) return 'N';
    if (num <= 60) return 'G';
    return 'O';
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-sans animate-fade-in pb-12">
      
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} className="text-emerald-600" /> Bingo IA
              </span>
              <span className="text-xs text-gray-400 font-bold">Modo 1 Jugador + 3 Bots</span>
            </div>
            <h2 className="font-sans text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
              Bingo Familiar Automático
            </h2>
          </div>
        </div>

        {/* Bot Level Selector */}
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
                  selectedMainBot.id === bot.id
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

      {/* Falling Ball Animation Overlay */}
      <AnimatePresence>
        {animBall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs pointer-events-none"
          >
            <motion.div
              initial={{ y: -200, scale: 0.2, rotate: -180, opacity: 0 }}
              animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.2, opacity: 0, transition: { duration: 0.3 } }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="flex flex-col items-center justify-center gap-2"
            >
              <div className="w-36 h-36 md:w-44 md:h-44 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border-4 border-white shadow-[0_0_50px_rgba(251,191,36,0.8)] flex flex-col items-center justify-center text-slate-950 font-black relative overflow-hidden">
                <div className="absolute inset-2 rounded-full border-2 border-white/50 pointer-events-none" />
                <span className="text-xl md:text-2xl tracking-widest text-slate-900/80 uppercase font-black">
                  {getLetterForNumber(animBall)}
                </span>
                <span className="text-5xl md:text-6xl font-black drop-shadow">
                  {animBall}
                </span>
              </div>
              <span className="text-white font-extrabold text-base tracking-wider bg-slate-900/80 px-4 py-1.5 rounded-full border border-white/20 shadow">
                ¡NUEVA BALOTA CANTADA!
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Ball Announcer + User Card + Bots Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Ball Announcer & Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 rounded-3xl p-6 text-white shadow-xl space-y-5 border border-emerald-500/20 text-center relative overflow-hidden">
            <span className="font-extrabold text-xs text-emerald-300 uppercase tracking-widest block">
              Cantador Automático
            </span>

            {/* Current Ball Display */}
            <div className="relative inline-flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-500 via-emerald-400 to-teal-300 p-1 shadow-2xl animate-pulse">
                <div className="w-full h-full bg-slate-950 rounded-full flex flex-col items-center justify-center border-4 border-white/20">
                  {lastCalledNumber ? (
                    <>
                      <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
                        {getLetterForNumber(lastCalledNumber)}
                      </span>
                      <span className="text-4xl font-black text-white tracking-tighter">
                        {lastCalledNumber}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-black text-emerald-400">🎱</span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-emerald-200 font-medium">
              {lastCalledNumber 
                ? `Última balota cantada: ${getLetterForNumber(lastCalledNumber)}-${lastCalledNumber}` 
                : 'Presiona "Iniciar Cantada" para comenzar la extracción de balotas.'}
            </p>

            {/* Game Controls */}
            <div className="flex gap-2 pt-2">
              {!isPlaying ? (
                <button
                  onClick={() => setIsPlaying(true)}
                  disabled={!!winner}
                  className="flex-1 py-3 bg-emerald-400 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play size={16} /> Iniciar Cantada
                </button>
              ) : (
                <button
                  onClick={() => setIsPlaying(false)}
                  className="flex-1 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Pause size={16} /> Pausar
                </button>
              )}

              <button
                onClick={() => startNewGame()}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all cursor-pointer"
                title="Nuevo Cartón"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {/* Bot Competitors Status */}
          <div className="bg-white rounded-3xl p-4 border border-emerald-100 shadow-md space-y-3">
            <h4 className="font-sans text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} className="text-emerald-600" />
              Rivalidad en la Mesa ({botPlayers.length} Bots)
            </h4>

            <div className="space-y-2">
              {botPlayers.map((bp) => {
                const markedCount = bp.marked.flat().filter(Boolean).length;
                return (
                  <div key={bp.bot.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <img src={bp.bot.avatar} className="w-8 h-8 rounded-xl object-cover border" alt="" />
                      <div>
                        <span className="font-bold text-xs text-gray-900 block">{bp.bot.name}</span>
                        <span className="text-[10px] text-gray-400">{bp.bot.role}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-xs text-emerald-600 block">{markedCount}/25</span>
                      <span className="text-[9px] text-gray-400">Casillas</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: User 5x5 Bingo Card */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-[32px] p-6 border-2 border-emerald-100 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider block">
                  Tu Cartón Oficial
                </span>
                <h3 className="font-sans text-xl font-extrabold text-gray-900">
                  {currentUser.nombre || 'Jugador'}
                </h3>
              </div>

              <button
                onClick={handleUserCallBingo}
                className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-full shadow-lg transition-all animate-bounce flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trophy size={16} /> ¡CANTAR BINGO!
              </button>
            </div>

            {/* 5x5 Grid Table */}
            <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
              {COLUMN_CONFIG.map((col, idx) => (
                <div key={col.letter} className={`${col.headerBg} text-white font-black text-base py-2.5 rounded-xl text-center shadow-xs tracking-wider`}>
                  {col.letter}
                </div>
              ))}

              {userCard.map((row, rIdx) =>
                row.map((val, cIdx) => {
                  const isFree = rIdx === 2 && cIdx === 2;
                  const isMarked = userMarked[rIdx]?.[cIdx];
                  const isCalled = calledNumbers.includes(val);
                  const colCfg = COLUMN_CONFIG[cIdx];

                  return (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      onClick={() => handleUserCellClick(rIdx, cIdx)}
                      className={`aspect-square rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer font-extrabold text-sm sm:text-base relative overflow-hidden ${
                        isFree
                          ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm'
                          : isMarked
                          ? 'bg-slate-900 border-slate-800 shadow-md scale-95'
                          : isCalled
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-extrabold animate-pulse'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {isFree ? (
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <Star size={18} className="text-amber-500 fill-amber-400 drop-shadow-xs" />
                          <span className="text-[9px] font-black text-amber-800 tracking-tighter">LIBRE</span>
                        </div>
                      ) : isMarked ? (
                        <motion.div
                          initial={{ scale: 0.3 }}
                          animate={{ scale: 1 }}
                          className={`w-full h-full rounded-xl ${colCfg.circleBg} text-white font-black text-sm sm:text-base flex items-center justify-center shadow-inner border`}
                        >
                          {val}
                        </motion.div>
                      ) : (
                        <span>{val}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <p className="text-center text-xs text-gray-400 font-medium pt-2">
              Haz clic en tus números llamados para marcarlos. ¡Completa una línea para ganar!
            </p>
          </div>
        </div>

      </div>

      {/* Winner Overlay Modal */}
      {winner && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 text-center text-white max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-3xl">
              🏆
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">
                ¡BINGO CANTA {winner.toUpperCase()}!
              </h3>
              <p className="text-xs text-emerald-200">
                {winner === (currentUser.nombre || 'Tú')
                  ? `¡Felicidades! Completaste tu cartón primero y ganaste +${selectedMainBot.pointsReward} Pts.`
                  : `${winner} ha cantado Bingo primero en esta ronda.`}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => startNewGame()}
                className="flex-1 py-3 rounded-full bg-emerald-400 hover:bg-emerald-500 text-slate-950 font-black text-xs transition-all cursor-pointer"
              >
                Otro Cartón
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
