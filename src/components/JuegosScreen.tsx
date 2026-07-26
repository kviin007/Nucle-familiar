import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  ArrowLeft, 
  Sparkles, 
  HelpCircle, 
  Footprints, 
  Layers, 
  CheckCircle, 
  Play, 
  RotateCcw,
  Clock,
  Users,
  X
} from 'lucide-react';
import { Usuario, DesbloqueoUsuario } from '../types';
import { triviaQuestions } from '../data/triviaQuestions';

// Import New Multiplayer & Vs AI Games
import GameLobby from './games/GameLobby';
import ChessGame from './games/ChessGame';
import ChessVsAiGame from './games/ChessVsAiGame';
import GuessWhoGame from './games/GuessWhoGame';
import GuessWhoVsAiGame from './games/GuessWhoVsAiGame';
import BingoGame from './games/BingoGame';
import BingoVsAiGame from './games/BingoVsAiGame';
import BattleshipGame from './games/BattleshipGame';
import BattleshipVsAiGame from './games/BattleshipVsAiGame';
import TriviaCoopGame from './games/TriviaCoopGame';
import InGameChat from './games/InGameChat';

interface JuegosScreenProps {
  currentUser: Usuario | null;
  usuarios: Usuario[];
  desbloqueosUsuarios?: DesbloqueoUsuario[];
  onStateUpdate: () => void;
}

type GameType = 
  | 'trivia' 
  | 'pasos' 
  | 'memoria' 
  | 'chess' 
  | 'chess_ai' 
  | 'guesswho' 
  | 'guesswho_ai' 
  | 'bingo' 
  | 'bingo_ai' 
  | 'battleship' 
  | 'battleship_ai' 
  | null;

export default function JuegosScreen({ currentUser, usuarios = [], desbloqueosUsuarios = [], onStateUpdate }: JuegosScreenProps) {
  const [activeGame, setActiveGame] = useState<GameType>(null);
  const [activeLobbyGame, setActiveLobbyGame] = useState<'chess' | 'guesswho' | 'bingo' | 'battleship' | 'trivia' | null>(null);
  const [modeFilter, setModeFilter] = useState<'all' | 'individual' | 'family'>('all');

  const [selectedPartidaId, setSelectedPartidaId] = useState<string | null>(null);
  const [selectedPartidaData, setSelectedPartidaData] = useState<any>(null);

  // High Scores / Progress state from DB
  const [progress, setProgress] = useState<Record<string, { puntaje: number; mejor_tiempo?: number }>>({});
  const [pointsEarnedMessage, setPointsEarnedMessage] = useState<string | null>(null);

  // Today Date helper
  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Fetch Game Progress
  const fetchProgress = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/games/progress?usuario_id=${currentUser.uid}`);
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      }
    } catch (err) {
      console.error("Error fetching game progress:", err);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [currentUser]);

  // Save game progress
  const saveProgress = async (game: string, score: number, bestTime?: number) => {
    if (!currentUser) return;
    try {
      await fetch('/api/games/progress/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: currentUser.uid,
          game,
          score,
          bestTime
        }),
      });
      await fetchProgress();
    } catch (err) {
      console.error("Error saving game progress:", err);
    }
  };

  // Award Points
  const awardPoints = async (pts: number) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/user/add-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          points: pts
        }),
      });
      if (res.ok) {
        onStateUpdate();
        setPointsEarnedMessage(`¡Sumaste +${pts} puntos a tu perfil real! 🏆`);
        setTimeout(() => {
          setPointsEarnedMessage(null);
        }, 5000);
      }
    } catch (err) {
      console.error("Error awarding points:", err);
    }
  };

  // ==========================================
  // GAME 1: TRIVIA FAMILIAR STATE & DATA
  // ==========================================
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [selectedTriviaOpt, setSelectedTriviaOpt] = useState<number | null>(null);
  const [triviaFeedback, setTriviaFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaFinished, setTriviaFinished] = useState(false);

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
      const prevBest = progress['trivia']?.puntaje || 0;
      if (triviaScore > prevBest) {
        saveProgress('trivia', triviaScore);
      }
      if (triviaScore > 0) {
        awardPoints(triviaScore);
      }
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
  // GAME 2: RETO DE PASOS
  // ==========================================
  const [familySteps, setFamilySteps] = useState<Record<string, number>>({});
  const [selectedMemberForSteps, setSelectedMemberForSteps] = useState<string>('');
  const [stepsInput, setStepsInput] = useState<string>('2000');
  const [stepsLoggedNotification, setStepsLoggedNotification] = useState<string | null>(null);
  const [loadingSteps, setLoadingSteps] = useState(false);

  const fetchFamilySteps = async () => {
    if (!currentUser?.familia_id) return;
    setLoadingSteps(true);
    try {
      const today = getTodayDateString();
      const res = await fetch(`/api/steps?familia_id=${currentUser.familia_id}&fecha=${today}`);
      if (res.ok) {
        const data = await res.json();
        setFamilySteps(data);
      }
    } catch (err) {
      console.error("Error fetching steps:", err);
    } finally {
      setLoadingSteps(false);
    }
  };

  const familyMembers = usuarios.filter(u => u.familia_id === currentUser?.familia_id);

  useEffect(() => {
    if (activeGame === 'pasos') {
      fetchFamilySteps();
      if (familyMembers.length > 0) {
        setSelectedMemberForSteps(familyMembers[0].uid);
      }
    }
  }, [activeGame, currentUser]);

  const stepsGoal = 30000;
  const currentTotalSteps: number = Object.keys(familySteps).reduce((acc, key) => {
    return acc + (Number(familySteps[key]) || 0);
  }, 0);
  const stepsPercentage = Math.min(100, Math.round((currentTotalSteps / stepsGoal) * 100));

  const handleAddSteps = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(stepsInput);
    if (isNaN(parsed) || parsed <= 0 || !selectedMemberForSteps) return;

    try {
      const today = getTodayDateString();
      const currentMemberSteps = familySteps[selectedMemberForSteps] || 0;
      const newStepsValue = currentMemberSteps + parsed;

      const res = await fetch('/api/steps/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: selectedMemberForSteps,
          pasos: newStepsValue,
          fecha: today
        })
      });

      if (res.ok) {
        const walker = familyMembers.find(m => m.uid === selectedMemberForSteps);
        const name = walker?.nombre || 'Miembro de Familia';
        
        setStepsLoggedNotification(`¡Registrado! Se sumaron ${parsed.toLocaleString()} pasos a ${name}.`);
        setStepsInput('2000');
        await fetchFamilySteps();

        const currentBest = progress['pasos']?.puntaje || 0;
        saveProgress('pasos', Math.max(currentBest, currentTotalSteps + parsed));
        await awardPoints(20);

        setTimeout(() => {
          setStepsLoggedNotification(null);
        }, 4000);
      }
    } catch (err) {
      console.error("Error adding steps:", err);
    }
  };

  // ==========================================
  // GAME 3: MEMORY MATCH
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
  const [memSeconds, setMemSeconds] = useState(0);

  const shuffleCards = () => {
    const shuffled = [...initialCards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setSelectedCards([]);
    setMatchesCount(0);
    setMemFinished(false);
    setMemSeconds(0);
  };

  useEffect(() => {
    if (activeGame === 'memoria') {
      shuffleCards();
    }
  }, [activeGame]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeGame === 'memoria' && !memFinished) {
      interval = setInterval(() => {
        setMemSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeGame, memFinished]);

  const handleCardClick = (index: number) => {
    if (selectedCards.length === 2 || cards[index].matched || selectedCards.includes(index)) return;

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      const first = cards[newSelected[0]];
      const second = cards[newSelected[1]];

      if (first.name === second.name) {
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
              const prevBestTime = progress['memoria']?.mejor_tiempo || 9999;
              const isNewBestTime = memSeconds < prevBestTime;
              saveProgress('memoria', (progress['memoria']?.puntaje || 0) + 1, isNewBestTime ? memSeconds : prevBestTime);
              awardPoints(50);
            }
            return next;
          });
          setSelectedCards([]);
        }, 500);
      } else {
        setTimeout(() => {
          setSelectedCards([]);
        }, 1000);
      }
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartLobbyMatch = (partidaId: string, partidaData: any) => {
    setSelectedPartidaId(partidaId);
    setSelectedPartidaData(partidaData);
    setActiveLobbyGame(null);
  };

  const handleExitMatch = () => {
    setSelectedPartidaId(null);
    setSelectedPartidaData(null);
    setActiveGame(null);
    setActiveLobbyGame(null);
  };

  const getActiveGameTitle = () => {
    if (activeGame === 'chess') return '♟️ Ajedrez Familiar';
    if (activeGame === 'chess_ai') return '♟️ Ajedrez vs La Máquina';
    if (activeGame === 'guesswho') return '🎭 Adivina Quién';
    if (activeGame === 'guesswho_ai') return '🎭 Adivina Quién vs IA';
    if (activeGame === 'bingo') return '🎱 Bingo Familiar';
    if (activeGame === 'bingo_ai') return '🎱 Bingo vs IA';
    if (activeGame === 'battleship') return '🚢 Batalla Naval';
    if (activeGame === 'battleship_ai') return '🚢 Batalla Naval vs IA';
    if (activeGame === 'trivia') return '🧠 Trivia Familiar';
    if (activeGame === 'pasos') return '👣 Reto de Pasos';
    if (activeGame === 'memoria') return '🧠 Memoria del Núcleo';
    return '🎮 Juego Familiar';
  };

  const getOpponentName = () => {
    if (activeGame?.endsWith('_ai')) return 'Rival IA 🤖';
    if (selectedPartidaData?.jugadores) {
      const oppUid = selectedPartidaData.jugadores.find((u: string) => u !== currentUser?.uid);
      const opp = usuarios.find(u => u.uid === oppUid);
      if (opp) return opp.nombre;
    }
    return 'Familia / Rival';
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6 font-sans">
      
      {/* FULL-SCREEN 3D IMMERSIVE GAME OVERLAY (ISOLATED FULL-SCREEN VIEWPORT) */}
      {Boolean(activeGame || selectedPartidaId || activeLobbyGame) && (
        <div className="fixed inset-0 z-[100] bg-slate-950 text-slate-100 flex flex-col h-screen w-screen overflow-y-auto font-sans select-none animate-fadeIn">
          {/* Always Visible Floating Exit Button in top corner */}
          <button
            type="button"
            onClick={handleExitMatch}
            className="fixed top-3 left-3 z-[110] bg-rose-600 hover:bg-rose-500 text-white font-black text-xs px-4 py-2.5 rounded-full shadow-2xl border-2 border-rose-300 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 uppercase tracking-wider"
            title="Salir del juego"
          >
            <X size={18} />
            <span>Salir del Juego</span>
          </button>

          {/* Top Immersion Header */}
          <div className="sticky top-0 z-40 pl-36 pr-4 py-3 bg-slate-900/90 border-b border-indigo-900/60 backdrop-blur-xl flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-slate-950/80 border border-indigo-500/30 px-3.5 py-1.5 rounded-full text-xs font-black text-indigo-300 uppercase tracking-wider shadow-inner">
                <Sparkles size={14} className="text-amber-400 animate-pulse" />
                <span>{getActiveGameTitle()}</span>
                <span className="bg-emerald-500 text-slate-950 text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse">
                   MODO AISLADO 3D
                </span>
              </div>
            </div>

            {/* In-Game Plato Chat */}
            <InGameChat
              partidaId={selectedPartidaId || undefined}
              currentUser={currentUser}
              opponentName={getOpponentName()}
              isVsAi={Boolean(activeGame?.endsWith('_ai'))}
              gameTitle={getActiveGameTitle()}
            />
          </div>

          {/* Canvas Container */}
          <div className="flex-1 p-3 sm:p-6 max-w-6xl w-full mx-auto flex flex-col justify-center items-center relative">
            <div className="w-full">
              {/* ACTIVE SINGLE PLAYER / VS AI MATCHES */}
              {activeGame === 'chess_ai' && (
                <ChessVsAiGame
                  currentUser={currentUser}
                  desbloqueosUsuarios={desbloqueosUsuarios}
                  onExit={handleExitMatch}
                  onAwardPoints={awardPoints}
                  onSaveProgress={saveProgress}
                />
              )}

              {activeGame === 'battleship_ai' && (
                <BattleshipVsAiGame
                  currentUser={currentUser}
                  desbloqueosUsuarios={desbloqueosUsuarios}
                  onExit={handleExitMatch}
                  onAwardPoints={awardPoints}
                  onSaveProgress={saveProgress}
                />
              )}

              {activeGame === 'bingo_ai' && (
                <BingoVsAiGame
                  currentUser={currentUser}
                  desbloqueosUsuarios={desbloqueosUsuarios}
                  onExit={handleExitMatch}
                  onAwardPoints={awardPoints}
                  onSaveProgress={saveProgress}
                />
              )}

              {activeGame === 'guesswho_ai' && (
                <GuessWhoVsAiGame
                  currentUser={currentUser}
                  usuarios={usuarios}
                  desbloqueosUsuarios={desbloqueosUsuarios}
                  onExit={handleExitMatch}
                  onAwardPoints={awardPoints}
                  onSaveProgress={saveProgress}
                />
              )}

              {/* ACTIVE MULTIPLAYER MATCHES */}
              {selectedPartidaId && activeGame === 'chess' && (
                <ChessGame
                  partidaId={selectedPartidaId}
                  currentUser={currentUser}
                  usuarios={usuarios}
                  partidaData={selectedPartidaData}
                  onExit={handleExitMatch}
                  onAwardPoints={awardPoints}
                />
              )}

              {selectedPartidaId && activeGame === 'guesswho' && (
                <GuessWhoGame
                  partidaId={selectedPartidaId}
                  currentUser={currentUser}
                  usuarios={usuarios}
                  partidaData={selectedPartidaData}
                  onExit={handleExitMatch}
                  onAwardPoints={awardPoints}
                />
              )}

              {selectedPartidaId && activeGame === 'bingo' && (
                <BingoGame
                  partidaId={selectedPartidaId}
                  currentUser={currentUser}
                  usuarios={usuarios}
                  partidaData={selectedPartidaData}
                  onExit={handleExitMatch}
                  onAwardPoints={awardPoints}
                />
              )}

              {selectedPartidaId && activeGame === 'battleship' && (
                <BattleshipGame
                  partidaId={selectedPartidaId}
                  currentUser={currentUser}
                  usuarios={usuarios}
                  partidaData={selectedPartidaData}
                  onExit={handleExitMatch}
                  onAwardPoints={awardPoints}
                />
              )}

              {selectedPartidaId && activeGame === 'trivia' && (
                <TriviaCoopGame
                  partidaId={selectedPartidaId}
                  currentUser={currentUser}
                  usuarios={usuarios}
                  partidaData={selectedPartidaData}
                  onExit={handleExitMatch}
                  onAwardPoints={awardPoints}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Title Header (Hub Catalog view when no game is active) */}
      {!activeGame && !selectedPartidaId && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
              ¡Juegos Familiares & vs La Máquina! 🎮
            </h2>
            <p className="font-sans text-sm text-gray-500 font-medium">
              Experiencia Inmersiva 3D estilo Plato App: Desafíos individuales, partidas con IA y multijugador en vivo.
            </p>
          </div>

          {/* Global Stats */}
          {!activeLobbyGame && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-left self-start md:self-auto">
              <span className="text-xl">🏆</span>
              <div>
                <span className="text-[10px] text-amber-800 font-black uppercase tracking-wider block">Tu Puntuación Real</span>
                <span className="text-xs font-bold text-amber-950">{currentUser?.puntos || 0} Pts de Motivación</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HUB CATALOG MENU */}
      {!activeGame && !activeLobbyGame && !selectedPartidaId && (
        <div className="space-y-6">
          {/* Mode Selector Navigation Tabs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-2.5 rounded-3xl border border-slate-100 shadow-sm gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setModeFilter('all')}
                className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  modeFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>🌟 Todos los Juegos</span>
              </button>

              <button
                onClick={() => setModeFilter('family')}
                className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  modeFilter === 'family'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users size={16} />
                <span>En Familia (Multijugador)</span>
              </button>

              <button
                onClick={() => setModeFilter('individual')}
                className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  modeFilter === 'individual'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Play size={16} />
                <span>Individual / vs La Máquina</span>
              </button>
            </div>

            <span className="text-[11px] text-gray-400 font-semibold px-2">
              {modeFilter === 'all' ? '8 Modos Disponibles' : modeFilter === 'family' ? 'Multijugador En Vivo' : 'Solitario & IA'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {/* Card 1: Ajedrez */}
            {(modeFilter === 'all' || modeFilter === 'family' || modeFilter === 'individual') && (
              <div className="bg-white rounded-[32px] border border-amber-100 shadow-xl overflow-hidden flex flex-col justify-between h-[360px] relative group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-amber-950 opacity-90" />
                <div className="z-20 p-4 flex justify-between items-start">
                  <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-sans text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                    ♟️ Ajedrez
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/20 text-amber-200 font-sans text-[10px] font-bold uppercase tracking-wider">
                    Familiar / IA
                  </span>
                </div>
                <div className="z-20 p-5 mt-auto text-left space-y-3">
                  <span className="text-4xl block">🤖♟️</span>
                  <h3 className="font-sans text-xl font-extrabold text-white tracking-tight">Ajedrez Familiar</h3>
                  <p className="font-sans text-xs text-amber-100/80 line-clamp-2 leading-relaxed">
                    Estrategia por turnos con explicación de movimientos. Juega con familiares o contra la IA.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button 
                      onClick={() => setActiveLobbyGame('chess')}
                      className="bg-amber-400 hover:bg-amber-500 text-slate-950 py-2.5 rounded-2xl font-sans text-[11px] font-black shadow-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Users size={13} />
                      En Familia
                    </button>
                    <button 
                      onClick={() => setActiveGame('chess_ai')}
                      className="bg-white/20 hover:bg-white/30 text-amber-200 py-2.5 rounded-2xl font-sans text-[11px] font-extrabold shadow-lg flex items-center justify-center gap-1 transition-all cursor-pointer border border-white/20"
                    >
                      <Play size={13} />
                      vs IA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Card 2: Adivina Quién */}
            {(modeFilter === 'all' || modeFilter === 'family' || modeFilter === 'individual') && (
              <div className="bg-white rounded-[32px] border border-purple-100 shadow-xl overflow-hidden flex flex-col justify-between h-[360px] relative group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-950 to-indigo-950 opacity-90" />
                <div className="z-20 p-4 flex justify-between items-start">
                  <span className="px-2.5 py-1 rounded-full bg-purple-400 text-slate-950 font-sans text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                    🎭 Adivinanza
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/20 text-purple-200 font-sans text-[10px] font-bold uppercase tracking-wider">
                    Familiar / IA
                  </span>
                </div>
                <div className="z-20 p-5 mt-auto text-left space-y-3">
                  <span className="text-4xl block">🎭</span>
                  <h3 className="font-sans text-xl font-extrabold text-white tracking-tight">Adivina Quién</h3>
                  <p className="font-sans text-xs text-purple-100/80 line-clamp-2 leading-relaxed">
                    Adivina el personaje misterioso con fotos familiares o descarte inteligente de la IA.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button 
                      onClick={() => setActiveLobbyGame('guesswho')}
                      className="bg-purple-400 hover:bg-purple-500 text-slate-950 py-2.5 rounded-2xl font-sans text-[11px] font-black shadow-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Users size={13} />
                      En Familia
                    </button>
                    <button 
                      onClick={() => setActiveGame('guesswho_ai')}
                      className="bg-white/20 hover:bg-white/30 text-purple-200 py-2.5 rounded-2xl font-sans text-[11px] font-extrabold shadow-lg flex items-center justify-center gap-1 transition-all cursor-pointer border border-white/20"
                    >
                      <Play size={13} />
                      vs IA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Card 3: Bingo */}
            {(modeFilter === 'all' || modeFilter === 'family' || modeFilter === 'individual') && (
              <div className="bg-white rounded-[32px] border border-emerald-100 shadow-xl overflow-hidden flex flex-col justify-between h-[360px] relative group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 to-teal-950 opacity-90" />
                <div className="z-20 p-4 flex justify-between items-start">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-400 text-slate-950 font-sans text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                    🎱 Bingo
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/20 text-emerald-200 font-sans text-[10px] font-bold uppercase tracking-wider">
                    Familiar / IA
                  </span>
                </div>
                <div className="z-20 p-5 mt-auto text-left space-y-3">
                  <span className="text-4xl block">🎱</span>
                  <h3 className="font-sans text-xl font-extrabold text-white tracking-tight">Bingo Familiar</h3>
                  <p className="font-sans text-xs text-emerald-100/80 line-clamp-2 leading-relaxed">
                    Cantada de balotas en vivo para la familia o cantada automática con rivales IA.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button 
                      onClick={() => setActiveLobbyGame('bingo')}
                      className="bg-emerald-400 hover:bg-emerald-500 text-slate-950 py-2.5 rounded-2xl font-sans text-[11px] font-black shadow-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Users size={13} />
                      En Familia
                    </button>
                    <button 
                      onClick={() => setActiveGame('bingo_ai')}
                      className="bg-white/20 hover:bg-white/30 text-emerald-200 py-2.5 rounded-2xl font-sans text-[11px] font-extrabold shadow-lg flex items-center justify-center gap-1 transition-all cursor-pointer border border-white/20"
                    >
                      <Play size={13} />
                      vs IA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Card 4: Batalla Naval */}
            {(modeFilter === 'all' || modeFilter === 'family' || modeFilter === 'individual') && (
              <div className="bg-white rounded-[32px] border border-cyan-100 shadow-xl overflow-hidden flex flex-col justify-between h-[360px] relative group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-950 to-slate-950 opacity-90" />
                <div className="z-20 p-4 flex justify-between items-start">
                  <span className="px-2.5 py-1 rounded-full bg-cyan-400 text-slate-950 font-sans text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                    🚢 Batalla Naval
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/20 text-cyan-200 font-sans text-[10px] font-bold uppercase tracking-wider">
                    Familiar / IA
                  </span>
                </div>
                <div className="z-20 p-5 mt-auto text-left space-y-3">
                  <span className="text-4xl block">🚢</span>
                  <h3 className="font-sans text-xl font-extrabold text-white tracking-tight">Batalla Naval</h3>
                  <p className="font-sans text-xs text-cyan-100/80 line-clamp-2 leading-relaxed">
                    Despliega tu flota e impacta barcos enemigos en vivo o contra el modo caza de la IA.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button 
                      onClick={() => setActiveLobbyGame('battleship')}
                      className="bg-cyan-400 hover:bg-cyan-500 text-slate-950 py-2.5 rounded-2xl font-sans text-[11px] font-black shadow-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Users size={13} />
                      En Familia
                    </button>
                    <button 
                      onClick={() => setActiveGame('battleship_ai')}
                      className="bg-white/20 hover:bg-white/30 text-cyan-200 py-2.5 rounded-2xl font-sans text-[11px] font-extrabold shadow-lg flex items-center justify-center gap-1 transition-all cursor-pointer border border-white/20"
                    >
                      <Play size={13} />
                      vs IA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Card 5: Trivia */}
            {(modeFilter === 'all' || modeFilter === 'individual' || modeFilter === 'family') && (
              <div className="bg-white rounded-[32px] border border-indigo-50/60 shadow-xl overflow-hidden flex flex-col justify-between h-[360px] relative group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 to-slate-900 opacity-90" />
                <div className="z-20 p-4 flex justify-between items-start">
                  {progress['trivia'] ? (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-sans text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                      ★ {progress['trivia'].puntaje} Pts
                    </span>
                  ) : <div />}
                  <span className="px-3 py-1 rounded-full bg-white/20 text-white font-sans text-[10px] font-bold shadow-sm uppercase tracking-wider">
                    Trivia
                  </span>
                </div>
                <div className="z-20 p-5 mt-auto text-left space-y-3">
                  <span className="text-4xl block">🧠</span>
                  <h3 className="font-sans text-xl font-extrabold text-white tracking-tight">Trivia Familiar</h3>
                  <p className="font-sans text-xs text-gray-300 line-clamp-2 leading-relaxed">
                    Desafío de preguntas en equipo en tiempo real o práctica individual.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button 
                      onClick={() => setActiveLobbyGame('trivia')}
                      className="bg-emerald-400 hover:bg-emerald-500 text-slate-950 py-2.5 rounded-2xl font-sans text-[11px] font-black shadow-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Users size={13} />
                      En Equipo
                    </button>
                    <button 
                      onClick={() => {
                        resetTrivia();
                        setActiveGame('trivia');
                      }}
                      className="bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-2xl font-sans text-[11px] font-extrabold shadow-lg flex items-center justify-center gap-1 transition-all cursor-pointer border border-white/20"
                    >
                      <Play size={13} />
                      Individual
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Card 6: Reto de Pasos */}
            {(modeFilter === 'all' || modeFilter === 'family') && (
              <div className="bg-white rounded-[32px] border border-rose-50/60 shadow-xl overflow-hidden flex flex-col justify-between h-[360px] relative group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-950 to-pink-950 opacity-90" />
                <div className="z-20 p-4 flex justify-between items-start">
                  {progress['pasos'] ? (
                    <span className="px-2.5 py-1 rounded-full bg-pink-500 text-white font-sans text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                      👣 {progress['pasos'].puntaje.toLocaleString()} pasos
                    </span>
                  ) : <div />}
                  <span className="px-3 py-1 rounded-full bg-white/20 text-white font-sans text-[10px] font-bold shadow-sm uppercase tracking-wider">
                    Pasos
                  </span>
                </div>
                <div className="z-20 p-5 mt-auto text-left space-y-3">
                  <span className="text-4xl block">👣</span>
                  <h3 className="font-sans text-xl font-extrabold text-white tracking-tight">Reto de Pasos</h3>
                  <p className="font-sans text-xs text-gray-300 line-clamp-2 leading-relaxed">
                    Sincronicen sus podómetros y acumulen pasos juntos hacia la meta.
                  </p>
                  <button 
                    onClick={() => setActiveGame('pasos')}
                    className="w-full bg-brand-primary hover:bg-brand-dark text-white py-3 rounded-full font-sans text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Footprints size={14} />
                    Ver Pasos
                  </button>
                </div>
              </div>
            )}

            {/* Card 7: Memoria */}
            {(modeFilter === 'all' || modeFilter === 'individual') && (
              <div className="bg-white rounded-[32px] border border-purple-50/60 shadow-xl overflow-hidden flex flex-col justify-between h-[360px] relative group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-950 to-slate-900 opacity-90" />
                <div className="z-20 p-4 flex justify-between items-start">
                  {progress['memoria']?.mejor_tiempo ? (
                    <span className="px-2.5 py-1 rounded-full bg-indigo-500 text-white font-sans text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                      ⏱️ {formatTimer(progress['memoria'].mejor_tiempo)}
                    </span>
                  ) : <div />}
                  <span className="px-3 py-1 rounded-full bg-white/20 text-white font-sans text-[10px] font-bold shadow-sm uppercase tracking-wider">
                    Memoria
                  </span>
                </div>
                <div className="z-20 p-5 mt-auto text-left space-y-3">
                  <span className="text-4xl block">🧠</span>
                  <h3 className="font-sans text-xl font-extrabold text-white tracking-tight">Memoria del Núcleo</h3>
                  <p className="font-sans text-xs text-gray-300 line-clamp-2 leading-relaxed">
                    Encuentra pares de iconos representativos del hogar.
                  </p>
                  <button 
                    onClick={() => setActiveGame('memoria')}
                    className="w-full bg-brand-primary hover:bg-brand-dark text-white py-3 rounded-full font-sans text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Layers size={14} />
                    Jugar Memoria
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 1. TRIVIA GAME BOARD (PRACTICA INDIVIDUAL) */}
      {activeGame === 'trivia' && !selectedPartidaId && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="w-full max-w-2xl mx-auto bg-white rounded-3xl border border-indigo-50/60 shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden"
        >
          <div className="flex justify-between items-center border-b border-indigo-50 pb-4">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-[#6366F1] font-bold text-xs uppercase">
              Pregunta {triviaIndex + 1} de {triviaQuestions.length}
            </span>
            <div className="flex items-center gap-1.5 font-bold text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              <Trophy size={16} />
              <span>Puntos: {triviaScore}</span>
            </div>
          </div>

          {!triviaFinished ? (
            <div className="space-y-6 text-left">
              <h3 className="font-sans text-lg md:text-xl font-extrabold text-gray-900 leading-snug">
                {triviaQuestions[triviaIndex].question}
              </h3>

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
                      className={`w-full text-left p-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${style}`}
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
                  <p>{triviaQuestions[triviaIndex].explanation}</p>
                </motion.div>
              )}

              {selectedTriviaOpt !== null && (
                <button
                  onClick={handleTriviaNext}
                  className="w-full py-4 rounded-full bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                >
                  {triviaIndex === triviaQuestions.length - 1 ? 'Terminar Trivia' : 'Siguiente Pregunta'}
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-6 space-y-6">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle size={44} />
              </div>
              <h3 className="text-2xl font-black text-gray-900">¡Reto Completado!</h3>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={resetTrivia}
                  className="px-6 py-3 rounded-full border border-slate-200 hover:bg-slate-50 font-bold text-xs text-gray-600 transition-all cursor-pointer"
                >
                  Reintentar
                </button>
                <button
                  onClick={handleExitMatch}
                  className="px-6 py-3 rounded-full bg-brand-primary hover:bg-brand-dark text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  Salir al Hub
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
          <div className="md:col-span-2 bg-white rounded-3xl border border-indigo-50/60 shadow-xl p-5 md:p-6 space-y-6 flex flex-col justify-between text-left">
            <div>
              <h3 className="font-extrabold text-base text-gray-900 uppercase tracking-wide">
                Meta Colectiva Diaria
              </h3>
              {loadingSteps ? (
                <div className="py-8 text-center text-xs text-gray-400">Actualizando pasos...</div>
              ) : (
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between items-end text-xs font-bold text-gray-600">
                    <span>Avance Acumulado</span>
                    <span className="text-brand-primary font-black text-sm">
                      {currentTotalSteps.toLocaleString()} / {stepsGoal.toLocaleString()} pasos
                    </span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-400 via-pink-500 to-[#6366F1] rounded-full transition-all duration-700"
                      style={{ width: `${stepsPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Desglose por Integrante
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {familyMembers.map((m) => {
                  const steps = familySteps[m.uid] || 0;
                  return (
                    <div key={m.uid} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <img src={m.avatar_url} alt={m.nombre} className="w-6 h-6 rounded-full object-cover border" />
                        <span className="text-xs font-bold text-gray-700 truncate max-w-[80px]">{m.nombre}</span>
                      </div>
                      <span className="font-mono text-xs font-black text-gray-900">{steps.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Logger */}
          <div className="bg-white rounded-3xl border border-indigo-50/60 shadow-xl p-5 md:p-6 space-y-4 text-left">
            <h3 className="font-extrabold text-base text-gray-900">Registrar Caminata</h3>
            <form onSubmit={handleAddSteps} className="space-y-4 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  ¿Quién caminó?
                </label>
                <select
                  value={selectedMemberForSteps}
                  onChange={(e) => setSelectedMemberForSteps(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-gray-700 outline-none"
                  required
                >
                  <option value="" disabled>Selecciona un miembro...</option>
                  {familyMembers.map(m => (
                    <option key={m.uid} value={m.uid}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  Pasos dados
                </label>
                <input
                  type="number"
                  min={50}
                  max={50000}
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-gray-800 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!selectedMemberForSteps}
                className="w-full py-3 rounded-xl bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-xs shadow cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Footprints size={14} />
                Sincronizar Pasos
              </button>
            </form>

            {stepsLoggedNotification && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-semibold text-emerald-800 text-center">
                {stepsLoggedNotification}
              </div>
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
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-brand-primary font-bold text-xs uppercase flex items-center gap-1.5">
              <Clock size={14} className="animate-pulse" />
              Tiempo: {formatTimer(memSeconds)}
            </span>
            <button 
              onClick={shuffleCards}
              className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 cursor-pointer"
            >
              <RotateCcw size={12} />
              Reiniciar
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
                    className={`h-24 sm:h-28 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isFlipped 
                        ? 'border-brand-primary/40 bg-brand-light/30 text-slate-800 shadow-inner' 
                        : 'border-slate-150 bg-gradient-to-tr from-indigo-50 to-white hover:border-[#6366F1] shadow-sm'
                    }`}
                  >
                    {isFlipped ? (
                      <div className="flex flex-col items-center gap-1.5">
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
              <h3 className="text-2xl font-black text-gray-900">¡Memoria Superada en {formatTimer(memSeconds)}!</h3>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={shuffleCards}
                  className="px-6 py-3 rounded-full border border-slate-200 hover:bg-slate-50 font-bold text-xs text-gray-600 cursor-pointer"
                >
                  Jugar de Nuevo
                </button>
                <button
                  onClick={handleExitMatch}
                  className="px-6 py-3 rounded-full bg-brand-primary hover:bg-brand-dark text-white font-bold text-xs cursor-pointer"
                >
                  Volver al Hub
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

    </div>
  );
}
