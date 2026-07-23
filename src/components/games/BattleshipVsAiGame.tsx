import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  ArrowLeft, 
  RotateCcw, 
  Crosshair, 
  Sparkles, 
  RotateCw, 
  CheckCircle2, 
  ShieldAlert, 
  Anchor,
  Flame,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Usuario, DesbloqueoUsuario } from '../../types';
import { BOTS, BotPersonality, isBotUnlocked } from '../../data/gameBots';

interface BattleshipVsAiGameProps {
  currentUser: Usuario;
  desbloqueosUsuarios?: DesbloqueoUsuario[];
  onExit: () => void;
  onAwardPoints: (points: number) => void;
  onSaveProgress?: (game: string, score: number) => void;
}

interface ShipConfig {
  name: string;
  size: number;
}

const SHIPS: ShipConfig[] = [
  { name: 'Portaaviones', size: 5 },
  { name: 'Acorazado', size: 4 },
  { name: 'Crucero', size: 3 },
  { name: 'Submarino', size: 3 },
  { name: 'Destructor', size: 2 },
];

const GRID_SIZE = 10;
const TOTAL_SHIP_CELLS = 17; // 5 + 4 + 3 + 3 + 2

export default function BattleshipVsAiGame({ currentUser, desbloqueosUsuarios = [], onExit, onAwardPoints, onSaveProgress }: BattleshipVsAiGameProps) {
  const [selectedBot, setSelectedBot] = useState<BotPersonality>(BOTS[0]);
  
  // Game Phases: 'setup' | 'playing' | 'gameover'
  const [phase, setPhase] = useState<'setup' | 'playing' | 'gameover'>('setup');
  
  // Player Fleet Placement
  const [userFleet, setUserFleet] = useState<Record<string, boolean>>({}); // "r,c" -> true
  const [currentShipIndex, setCurrentShipIndex] = useState<number>(0);
  const [isHorizontal, setIsHorizontal] = useState<boolean>(true);

  // Bot Fleet Placement
  const [botFleet, setBotFleet] = useState<Record<string, boolean>>({}); // "r,c" -> true

  // Shots tracking
  const [userShots, setUserShots] = useState<Record<string, 'agua' | 'tocado'>>({});
  const [botShots, setBotShots] = useState<Record<string, 'agua' | 'tocado'>>({});
  
  // Bot Hunt Mode State for High Difficulties (Vikram & Lin)
  const [botHuntQueue, setBotHuntQueue] = useState<string[]>([]);

  // Turn management
  const [isUserTurn, setIsUserTurn] = useState<boolean>(true);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  
  // Bot Dialogs & Emotion
  const [botMessage, setBotMessage] = useState<string>(BOTS[0].dialogs.welcome);
  const [botEmotion, setBotEmotion] = useState<'normal' | 'happy' | 'surprised' | 'thinking' | 'victory' | 'defeat'>('normal');

  // Winner
  const [winner, setWinner] = useState<'user' | 'bot' | null>(null);

  // Generate random fleet for Bot or Auto-colocar for User
  const generateRandomFleet = (): Record<string, boolean> => {
    const fleet: Record<string, boolean> = {};

    SHIPS.forEach(ship => {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 500) {
        attempts++;
        const isHoriz = Math.random() < 0.5;
        const r = Math.floor(Math.random() * (isHoriz ? GRID_SIZE : GRID_SIZE - ship.size + 1));
        const c = Math.floor(Math.random() * (isHoriz ? GRID_SIZE - ship.size + 1 : GRID_SIZE));

        // Check collision
        let collision = false;
        const coordsToOccupy: string[] = [];

        for (let i = 0; i < ship.size; i++) {
          const currR = isHoriz ? r : r + i;
          const currC = isHoriz ? c + i : c;
          const key = `${currR},${currC}`;
          if (fleet[key]) {
            collision = true;
            break;
          }
          coordsToOccupy.push(key);
        }

        if (!collision) {
          coordsToOccupy.forEach(k => {
            fleet[k] = true;
          });
          placed = true;
        }
      }
    });

    return fleet;
  };

  // Reset / Start game setup
  const startNewSetup = (bot: BotPersonality = selectedBot) => {
    setSelectedBot(bot);
    setPhase('setup');
    setUserFleet({});
    setCurrentShipIndex(0);
    setIsHorizontal(true);
    setBotFleet(generateRandomFleet());
    setUserShots({});
    setBotShots({});
    setBotHuntQueue([]);
    setIsUserTurn(true);
    setIsBotThinking(false);
    setWinner(null);
    setBotEmotion('normal');
    setBotMessage(bot.dialogs.welcome);
  };

  useEffect(() => {
    setBotFleet(generateRandomFleet());
  }, []);

  // Handle Placing Ship on User Grid during Setup
  const handlePlaceShip = (r: number, c: number) => {
    if (currentShipIndex >= SHIPS.length) return;
    const ship = SHIPS[currentShipIndex];

    // Check validity
    if (isHorizontal && c + ship.size > GRID_SIZE) return;
    if (!isHorizontal && r + ship.size > GRID_SIZE) return;

    const coordsToOccupy: string[] = [];
    for (let i = 0; i < ship.size; i++) {
      const currR = isHorizontal ? r : r + i;
      const currC = isHorizontal ? c + i : c;
      const key = `${currR},${currC}`;
      if (userFleet[key]) return; // Collision
      coordsToOccupy.push(key);
    }

    const newFleet = { ...userFleet };
    coordsToOccupy.forEach(k => {
      newFleet[k] = true;
    });

    setUserFleet(newFleet);
    setCurrentShipIndex(prev => prev + 1);
  };

  // Auto Place User Fleet
  const handleAutoPlaceUserFleet = () => {
    const autoFleet = generateRandomFleet();
    setUserFleet(autoFleet);
    setCurrentShipIndex(SHIPS.length);
  };

  // Start Playing Phase
  const handleConfirmFleet = () => {
    if (Object.keys(userFleet).length < TOTAL_SHIP_CELLS) return;
    setPhase('playing');
    setBotMessage(`¡Tus barcos están desplegados! Haz clic en mi cuadrícula para disparar.`);
  };

  // User Fires Shot at Bot Grid
  const handleUserFire = (r: number, c: number) => {
    if (phase !== 'playing' || !isUserTurn || isBotThinking) return;

    const key = `${r},${c}`;
    if (userShots[key]) return; // Already shot here

    const isHit = !!botFleet[key];
    const newShots = { ...userShots, [key]: (isHit ? 'tocado' : 'agua') as 'tocado' | 'agua' };
    setUserShots(newShots);

    // Dialog & Emotion
    if (isHit) {
      setBotEmotion('surprised');
      const hitMsgs = selectedBot.dialogs.hitTarget || selectedBot.dialogs.goodMove;
      setBotMessage(hitMsgs[Math.floor(Math.random() * hitMsgs.length)]);
    } else {
      setBotEmotion('happy');
      const missMsgs = selectedBot.dialogs.missTarget || ['¡Agua! Tu misil cayó al mar.'];
      setBotMessage(missMsgs[Math.floor(Math.random() * missMsgs.length)]);
    }

    // Check Victory for User
    const totalUserHits = Object.values(newShots).filter(v => v === 'tocado').length;
    if (totalUserHits >= TOTAL_SHIP_CELLS) {
      setPhase('gameover');
      setWinner('user');
      setBotEmotion('defeat');
      setBotMessage(selectedBot.dialogs.userWin);

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      onAwardPoints(selectedBot.pointsReward);
      if (onSaveProgress) onSaveProgress('battleship_ai', selectedBot.pointsReward);
      return;
    }

    // Switch turn to Bot
    setIsUserTurn(false);
  };

  // Bot Turn Logic
  useEffect(() => {
    if (phase === 'playing' && !isUserTurn) {
      setIsBotThinking(true);
      setBotEmotion('thinking');

      const timer = setTimeout(() => {
        makeBotShot();
      }, Math.floor(Math.random() * 400) + 700);

      return () => clearTimeout(timer);
    }
  }, [phase, isUserTurn]);

  // Bot Shot Execution with Hunt Mode for Vikram & Lin
  const makeBotShot = () => {
    let targetKey = '';
    const isAdvancedBot = selectedBot.id === 'vikram' || selectedBot.id === 'lin';

    if (isAdvancedBot && botHuntQueue.length > 0) {
      // Pick next candidate from Hunt Queue
      const candidate = botHuntQueue[0];
      const restQueue = botHuntQueue.slice(1);
      setBotHuntQueue(restQueue);

      if (!botShots[candidate]) {
        targetKey = candidate;
      }
    }

    // Fallback: Pick random unshot coordinate
    if (!targetKey) {
      const unshot: string[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const k = `${r},${c}`;
          if (!botShots[k]) unshot.push(k);
        }
      }
      if (unshot.length === 0) return;
      targetKey = unshot[Math.floor(Math.random() * unshot.length)];
    }

    const [tr, tc] = targetKey.split(',').map(Number);
    const isHit = !!userFleet[targetKey];
    const newBotShots = { ...botShots, [targetKey]: (isHit ? 'tocado' : 'agua') as 'tocado' | 'agua' };
    setBotShots(newBotShots);

    // If Hit on Advanced Bot -> Add adjacent cells to Hunt Queue
    if (isHit && isAdvancedBot) {
      const neighbors: string[] = [];
      const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      deltas.forEach(([dr, dc]) => {
        const nr = tr + dr;
        const nc = tc + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          const nk = `${nr},${nc}`;
          if (!newBotShots[nk] && !botHuntQueue.includes(nk)) {
            neighbors.push(nk);
          }
        }
      });
      setBotHuntQueue(prev => [...neighbors, ...prev]);
    }

    // Check Bot Win
    const totalBotHits = Object.values(newBotShots).filter(v => v === 'tocado').length;
    if (totalBotHits >= TOTAL_SHIP_CELLS) {
      setPhase('gameover');
      setWinner('bot');
      setBotEmotion('victory');
      setBotMessage(selectedBot.dialogs.botWin);
      setIsBotThinking(false);
      return;
    }

    if (isHit) {
      setBotEmotion('happy');
      setBotMessage(`¡Tocado! Impacté en tus barcos en la casilla ${String.fromCharCode(65 + tc)}${tr + 1}.`);
    } else {
      setBotEmotion('normal');
      setBotMessage(`¡Agua! Mi disparo en ${String.fromCharCode(65 + tc)}${tr + 1} se hundió en el mar.`);
    }

    setIsBotThinking(false);
    setIsUserTurn(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-sans animate-fade-in pb-12">
      
      {/* Header Bar */}
      <div className="bg-white rounded-3xl p-5 border border-cyan-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Anchor size={12} className="text-cyan-600" /> Batalla Naval IA
              </span>
              <span className="text-xs text-gray-400 font-bold">Modo 1 Jugador</span>
            </div>
            <h2 className="font-sans text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
              Flota Naval contra la Máquina
            </h2>
          </div>
        </div>

        {/* Bot Selector */}
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
                  startNewSetup(bot);
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

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Bot Mascot Card & Talk Bubble */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-gradient-to-br from-cyan-950 via-slate-900 to-indigo-950 rounded-3xl p-5 text-white shadow-xl space-y-4 border border-cyan-500/20 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                  src={selectedBot.avatar} 
                  alt={selectedBot.name} 
                />
                <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-black ${
                  botEmotion === 'victory' ? 'bg-amber-400 text-slate-950' 
                  : botEmotion === 'defeat' ? 'bg-rose-500 text-white' 
                  : botEmotion === 'surprised' ? 'bg-purple-400 text-slate-950'
                  : 'bg-cyan-400 text-slate-950'
                }`}>
                  {botEmotion === 'victory' ? '🏆' : botEmotion === 'defeat' ? '😵' : botEmotion === 'surprised' ? '😲' : '⚓'}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-white">{selectedBot.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${selectedBot.badgeColor}`}>
                    Nivel {selectedBot.level}
                  </span>
                </div>
                <p className="text-xs text-cyan-200 font-medium">{selectedBot.role}</p>
              </div>
            </div>

            {/* Talk Bubble */}
            <div className="relative bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-xs text-cyan-100 font-medium leading-relaxed">
              <div className="absolute -top-2 left-6 w-3 h-3 bg-white/10 rotate-45 border-l border-t border-white/10" />
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0">{isBotThinking ? '🧠' : '💬'}</span>
                <div>
                  {isBotThinking ? (
                    <span className="animate-pulse text-cyan-300 font-bold">
                      Calculando coordenadas de tiro...
                    </span>
                  ) : (
                    <span>"{botMessage}"</span>
                  )}
                </div>
              </div>
            </div>

            {/* Reward */}
            <div className="flex justify-between items-center text-xs pt-1 border-t border-white/10 text-cyan-200">
              <span>Recompensa de Victoria:</span>
              <span className="font-black text-amber-400 flex items-center gap-1">
                <Trophy size={14} /> +{selectedBot.pointsReward} Pts
              </span>
            </div>
          </div>

          {/* Setup Controls Side Box */}
          {phase === 'setup' && (
            <div className="bg-white rounded-3xl p-5 border border-cyan-100 shadow-md space-y-4">
              <h4 className="font-sans text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Anchor size={16} className="text-cyan-600" />
                Despliegue de tu Flota
              </h4>

              {currentShipIndex < SHIPS.length ? (
                <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-cyan-950">
                    <span>Barco actual: {SHIPS[currentShipIndex].name}</span>
                    <span className="bg-cyan-200 px-2 py-0.5 rounded-md font-black">{SHIPS[currentShipIndex].size} Casillas</span>
                  </div>
                  <p className="text-gray-600">
                    Haz clic en tu cuadrícula para colocarlo o usa Auto-Colocar.
                  </p>
                  
                  <button
                    onClick={() => setIsHorizontal(!isHorizontal)}
                    className="w-full py-2 bg-white border border-cyan-300 rounded-xl font-bold text-cyan-900 flex items-center justify-center gap-2 hover:bg-cyan-100 transition-all cursor-pointer"
                  >
                    <RotateCw size={14} />
                    Orientación: {isHorizontal ? 'Horizontal ➔' : 'Vertical ⬇'}
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    ¡Todos los barcos están posicionados!
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleAutoPlaceUserFleet}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                >
                  🎲 Auto-Colocar Flota Aleatoria
                </button>

                <button
                  onClick={handleConfirmFleet}
                  disabled={Object.keys(userFleet).length < TOTAL_SHIP_CELLS}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Crosshair size={16} />
                  ¡Comenzar Batalla Naval!
                </button>
              </div>
            </div>
          )}

          {/* Playing Status Side Box */}
          {phase === 'playing' && (
            <div className="bg-white rounded-3xl p-4 border border-cyan-100 shadow-md space-y-3">
              <h4 className="font-sans text-xs font-bold text-gray-500 uppercase tracking-wider">
                Estado del Combate
              </h4>
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold">
                <div className="bg-cyan-50 p-2.5 rounded-2xl border border-cyan-100">
                  <span className="text-cyan-900 block text-[10px] text-gray-500 font-normal">Tus Impactos:</span>
                  <span className="text-lg font-black text-cyan-700">
                    {Object.values(userShots).filter(v => v === 'tocado').length}/{TOTAL_SHIP_CELLS}
                  </span>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-2xl border border-rose-100">
                  <span className="text-rose-900 block text-[10px] text-gray-500 font-normal">Impactos IA:</span>
                  <span className="text-lg font-black text-rose-700">
                    {Object.values(botShots).filter(v => v === 'tocado').length}/{TOTAL_SHIP_CELLS}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Grids */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* User Board */}
            <div className="bg-slate-900 p-4 rounded-[28px] border-2 border-slate-800 shadow-xl space-y-2">
              <div className="flex justify-between items-center text-white text-xs font-bold px-1">
                <span className="text-cyan-300 flex items-center gap-1">
                  🛡️ Tu Cuadrícula (Flota)
                </span>
                <span className="text-slate-400 text-[10px]">
                  {Object.keys(userFleet).length}/{TOTAL_SHIP_CELLS} Barcos
                </span>
              </div>

              <div className="grid grid-cols-10 grid-rows-10 gap-0.5 w-full aspect-square bg-slate-950 p-1 rounded-xl">
                {Array.from({ length: GRID_SIZE }).map((_, r) =>
                  Array.from({ length: GRID_SIZE }).map((_, c) => {
                    const key = `${r},${c}`;
                    const hasShip = userFleet[key];
                    const shotStatus = botShots[key];

                    let cellBg = 'bg-slate-800 hover:bg-slate-700';
                    if (shotStatus === 'tocado') cellBg = 'bg-rose-600 animate-pulse';
                    else if (shotStatus === 'agua') cellBg = 'bg-cyan-900/60';
                    else if (hasShip) cellBg = 'bg-cyan-500 border border-cyan-300';

                    return (
                      <div
                        key={key}
                        onClick={() => phase === 'setup' && handlePlaceShip(r, c)}
                        className={`flex items-center justify-center rounded-xs text-[10px] font-black cursor-pointer transition-all ${cellBg}`}
                      >
                        {shotStatus === 'tocado' && '💥'}
                        {shotStatus === 'agua' && '🌊'}
                        {!shotStatus && hasShip && '🚢'}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bot Enemy Board */}
            <div className="bg-slate-900 p-4 rounded-[28px] border-2 border-cyan-900 shadow-xl space-y-2">
              <div className="flex justify-between items-center text-white text-xs font-bold px-1">
                <span className="text-amber-300 flex items-center gap-1">
                  🎯 Flota Enemiga ({selectedBot.name})
                </span>
                <span className="text-slate-400 text-[10px]">
                  {isUserTurn && phase === 'playing' ? '¡Tu Turno de Disparo!' : 'Esperando...'}
                </span>
              </div>

              <div className="grid grid-cols-10 grid-rows-10 gap-0.5 w-full aspect-square bg-slate-950 p-1 rounded-xl">
                {Array.from({ length: GRID_SIZE }).map((_, r) =>
                  Array.from({ length: GRID_SIZE }).map((_, c) => {
                    const key = `${r},${c}`;
                    const shotStatus = userShots[key];

                    let cellBg = 'bg-slate-800 hover:bg-slate-700 cursor-pointer';
                    if (shotStatus === 'tocado') cellBg = 'bg-rose-600';
                    else if (shotStatus === 'agua') cellBg = 'bg-cyan-950';

                    return (
                      <div
                        key={key}
                        onClick={() => handleUserFire(r, c)}
                        className={`flex items-center justify-center rounded-xs text-[10px] font-black transition-all ${cellBg}`}
                      >
                        {shotStatus === 'tocado' && '💥'}
                        {shotStatus === 'agua' && '🌊'}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Game Over Modal */}
      {phase === 'gameover' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-2 border-cyan-500 rounded-3xl p-6 text-center text-white max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto text-3xl">
              {winner === 'user' ? '🏆' : '⚓'}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">
                {winner === 'user' ? '¡FLOTA ENEMIGA HUNDIDA!' : '¡Tu Flota ha sido Hundida!'}
              </h3>
              <p className="text-xs text-cyan-200">
                {winner === 'user' 
                  ? `¡Derrotaste a ${selectedBot.name} y ganaste +${selectedBot.pointsReward} Pts de motivación!`
                  : `La táctica naval de ${selectedBot.name} prevaleció esta vez.`}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => startNewSetup()}
                className="flex-1 py-3 rounded-full bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-black text-xs transition-all cursor-pointer"
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
