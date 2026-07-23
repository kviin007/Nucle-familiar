import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  ArrowLeft, 
  RotateCcw, 
  Lightbulb, 
  Sparkles, 
  Bot, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  Award, 
  HelpCircle,
  Zap,
  Flame
} from 'lucide-react';
import { Usuario, DesbloqueoUsuario } from '../../types';
import { BOTS, BotPersonality, isBotUnlocked } from '../../data/gameBots';

interface ChessVsAiGameProps {
  currentUser: Usuario;
  desbloqueosUsuarios?: DesbloqueoUsuario[];
  onExit: () => void;
  onAwardPoints: (points: number) => void;
  onSaveProgress?: (game: string, score: number) => void;
}

const PIECE_SYMBOLS: Record<string, string> = {
  wP: '♙', wN: '♘', wB: '♗', wR: '♖', wQ: '♕', wK: '♔',
  bP: '♟', bN: '♞', bB: '♝', bR: '♜', bQ: '♛', bK: '♚'
};

const PIECE_VALUES: Record<string, number> = {
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 900
};

const KIDS_EXPLANATIONS: Record<string, { name: string; desc: string }> = {
  p: { name: 'Peón', desc: 'Avanza 1 casilla hacia adelante (o 2 al inicio). Captura en diagonal.' },
  n: { name: 'Caballo', desc: 'Se mueve en forma de "L" (2 casillas y 1 giro). ¡Salta sobre otras piezas!' },
  b: { name: 'Alfil', desc: 'Se mueve en diagonal todas las casillas que quiera en su color.' },
  r: { name: 'Torre', desc: 'Se mueve en línea recta horizontal o verticalmente.' },
  q: { name: 'Reina', desc: '¡La pieza más poderosa! Se mueve como Torre y Alfil combinados.' },
  k: { name: 'Rey', desc: 'Se mueve 1 casilla en cualquier dirección. Protégelo del Jaque Mate.' },
};

export default function ChessVsAiGame({ currentUser, desbloqueosUsuarios = [], onExit, onAwardPoints, onSaveProgress }: ChessVsAiGameProps) {
  const [selectedBot, setSelectedBot] = useState<BotPersonality>(BOTS[0]);
  const [game, setGame] = useState<Chess>(new Chess());
  const [history, setHistory] = useState<string[]>([]);
  
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [hintMove, setHintMove] = useState<{ from: Square; to: Square; explanation: string } | null>(null);
  const [selectedPieceInfo, setSelectedPieceInfo] = useState<{ name: string; desc: string } | null>(null);

  const [botMessage, setBotMessage] = useState<string>(BOTS[0].dialogs.welcome);
  const [botEmotion, setBotEmotion] = useState<'normal' | 'happy' | 'surprised' | 'thinking' | 'victory' | 'defeat'>('normal');
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  
  const [capturedByWhite, setCapturedByWhite] = useState<string[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<string[]>([]);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<'playing' | 'checkmate' | 'draw' | 'resigned'>('playing');
  const [winner, setWinner] = useState<'user' | 'bot' | 'draw' | null>(null);

  // Initialize game when bot changes or reset
  const startNewGame = (bot: BotPersonality = selectedBot) => {
    const newG = new Chess();
    setGame(newG);
    setSelectedBot(bot);
    setHistory([]);
    setSelectedSquare(null);
    setPossibleMoves([]);
    setHintMove(null);
    setSelectedPieceInfo(null);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setMoveCount(0);
    setGameStatus('playing');
    setWinner(null);
    setIsBotThinking(false);
    setBotEmotion('normal');
    setBotMessage(bot.dialogs.welcome);
  };

  // Bot AI logic execution when turn is 'b' (Black)
  useEffect(() => {
    if (game.turn() === 'b' && gameStatus === 'playing' && !game.isGameOver()) {
      setIsBotThinking(true);
      setBotEmotion('thinking');
      const timer = setTimeout(() => {
        makeBotMove();
      }, Math.floor(Math.random() * 400) + 600); // 600-1000ms delay for natural feel
      return () => clearTimeout(timer);
    }
  }, [game, gameStatus]);

  // Make Bot Move based on selectedBot difficulty
  const makeBotMove = () => {
    if (game.isGameOver()) return;

    const gameCopy = new Chess(game.fen());
    const legalMoves = gameCopy.moves({ verbose: true });
    if (legalMoves.length === 0) return;

    let chosenMove: Move = legalMoves[0];

    if (selectedBot.id === 'oscar') {
      // 70% random, 30% prefers captures/checks
      const captures = legalMoves.filter(m => m.captured || m.san.includes('+'));
      if (captures.length > 0 && Math.random() < 0.4) {
        chosenMove = captures[Math.floor(Math.random() * captures.length)];
      } else {
        chosenMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      }
    } else if (selectedBot.id === 'bea') {
      // Evaluates immediate captures and checks
      const scoredMoves = legalMoves.map(m => {
        let score = 0;
        if (m.captured) score += (PIECE_VALUES[m.captured] || 10) * 2;
        if (m.san.includes('+')) score += 15;
        if (m.to === 'd5' || m.to === 'e5' || m.to === 'd4' || m.to === 'e4') score += 5;
        score += Math.random() * 5;
        return { move: m, score };
      });
      scoredMoves.sort((a, b) => b.score - a.score);
      chosenMove = scoredMoves[0].move;
    } else if (selectedBot.id === 'vikram' || selectedBot.id === 'lin') {
      // Minimax 1-2 lookahead evaluating material balance + center control
      let bestScore = -99999;
      let bestMoves: Move[] = [];

      for (const move of legalMoves) {
        const testG = new Chess(gameCopy.fen());
        testG.move(move);

        let score = 0;
        if (move.captured) score += (PIECE_VALUES[move.captured] || 10) * 10;
        if (testG.inCheck()) score += 25;
        if (testG.isCheckmate()) score += 10000;

        // Center control
        if (['d4', 'd5', 'e4', 'e5'].includes(move.to)) score += 8;

        // Penalty if target square is attacked by white
        const whiteResponses = testG.moves({ verbose: true });
        const canBeRecaptured = whiteResponses.some(wm => wm.to === move.to);
        if (canBeRecaptured) {
          const pieceVal = PIECE_VALUES[move.piece] || 10;
          score -= pieceVal * 8;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (score === bestScore) {
          bestMoves.push(move);
        }
      }

      chosenMove = bestMoves.length > 0 ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : legalMoves[0];
    }

    // Execute Bot Move
    const moveResult = gameCopy.move(chosenMove);
    if (moveResult) {
      if (moveResult.captured) {
        setCapturedByBlack(prev => [...prev, moveResult.captured!]);
      }

      // Check game over
      if (gameCopy.isCheckmate()) {
        setGameStatus('checkmate');
        setWinner('bot');
        setBotEmotion('victory');
        setBotMessage(selectedBot.dialogs.botWin);
      } else if (gameCopy.isDraw() || gameCopy.isStalemate()) {
        setGameStatus('draw');
        setWinner('draw');
        setBotMessage('¡Tablas! Ha sido un empate muy ajustado.');
      } else if (gameCopy.inCheck()) {
        setBotEmotion('happy');
        const randMsg = selectedBot.dialogs.checkUser[Math.floor(Math.random() * selectedBot.dialogs.checkUser.length)];
        setBotMessage(randMsg);
      } else if (moveResult.captured) {
        setBotEmotion('happy');
        const randMsg = selectedBot.dialogs.captureUser[Math.floor(Math.random() * selectedBot.dialogs.captureUser.length)];
        setBotMessage(randMsg);
      } else {
        setBotEmotion('normal');
      }

      setGame(gameCopy);
      setIsBotThinking(false);
      setMoveCount(prev => prev + 1);
      setHistory(prev => [...prev, moveResult.san]);
    }
  };

  // User click on board square
  const handleSquareClick = (square: Square) => {
    if (game.turn() !== 'w' || gameStatus !== 'playing' || isBotThinking) return;

    // If square already selected, try to move there
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        setSelectedPieceInfo(null);
        return;
      }

      try {
        const gameCopy = new Chess(game.fen());
        const move = gameCopy.move({
          from: selectedSquare,
          to: square,
          promotion: 'q'
        });

        if (move) {
          // Valid move made by User!
          if (move.captured) {
            setCapturedByWhite(prev => [...prev, move.captured!]);
            setBotEmotion('surprised');
            const randMsg = selectedBot.dialogs.userCapture[Math.floor(Math.random() * selectedBot.dialogs.userCapture.length)];
            setBotMessage(randMsg);
          } else if (gameCopy.inCheck()) {
            setBotEmotion('surprised');
            const randMsg = selectedBot.dialogs.userCheck[Math.floor(Math.random() * selectedBot.dialogs.userCheck.length)];
            setBotMessage(randMsg);
          } else {
            const randMsg = selectedBot.dialogs.goodMove[Math.floor(Math.random() * selectedBot.dialogs.goodMove.length)];
            setBotMessage(randMsg);
          }

          // Check for user checkmate
          if (gameCopy.isCheckmate()) {
            setGameStatus('checkmate');
            setWinner('user');
            setBotEmotion('defeat');
            setBotMessage(selectedBot.dialogs.userWin);

            // Award points & celebration
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            onAwardPoints(selectedBot.pointsReward);
            if (onSaveProgress) {
              onSaveProgress('chess_ai', selectedBot.pointsReward);
            }
          }

          setGame(gameCopy);
          setSelectedSquare(null);
          setPossibleMoves([]);
          setHintMove(null);
          setSelectedPieceInfo(null);
          setHistory(prev => [...prev, move.san]);
          return;
        }
      } catch (e) {
        // Invalid move attempt
      }
    }

    // Select White piece
    const piece = game.get(square);
    if (piece && piece.color === 'w') {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true });
      setPossibleMoves(moves.map(m => m.to as Square));

      const info = KIDS_EXPLANATIONS[piece.type];
      if (info) setSelectedPieceInfo(info);
    } else {
      setSelectedSquare(null);
      setPossibleMoves([]);
      setSelectedPieceInfo(null);
    }
  };

  // Duolingo Hint ("Pista Duolingo")
  const handleGetHint = () => {
    if (game.turn() !== 'w' || gameStatus !== 'playing') return;

    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return;

    // Find best move for white
    const scored = moves.map(m => {
      let val = 0;
      if (m.captured) val += (PIECE_VALUES[m.captured] || 10) * 10;
      if (m.san.includes('+')) val += 20;
      if (['d4', 'e4', 'd5', 'e5'].includes(m.to)) val += 10;
      return { move: m, val };
    });
    scored.sort((a, b) => b.val - a.val);

    const best = scored[0].move;
    let exp = `Prueba mover tu ${KIDS_EXPLANATIONS[best.piece]?.name || 'pieza'} de ${best.from} a ${best.to}.`;
    if (best.captured) exp += ` ¡Capturarás el ${KIDS_EXPLANATIONS[best.captured]?.name || 'pieza'} de la máquina!`;
    else if (best.san.includes('+')) exp += ' ¡Pondrás a su Rey en Jaque!';
    else if (['d4', 'e4', 'd5', 'e5'].includes(best.to)) exp += ' Te dará un gran control del centro del tablero.';

    setHintMove({
      from: best.from,
      to: best.to,
      explanation: exp
    });
    setSelectedSquare(best.from);
    setPossibleMoves([best.to]);
  };

  // Undo Last Move Pair
  const handleUndo = () => {
    if (history.length < 2 || isBotThinking || gameStatus !== 'playing') return;
    const gameCopy = new Chess(game.fen());
    gameCopy.undo(); // Undo Bot move
    gameCopy.undo(); // Undo User move
    setGame(gameCopy);
    setHistory(prev => prev.slice(0, prev.length - 2));
    setSelectedSquare(null);
    setPossibleMoves([]);
    setHintMove(null);
    setBotMessage('¡Entendido! Retrocedimos un turno para que pruebes otra estrategia.');
  };

  const board = game.board();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 font-sans animate-fade-in pb-12">
      
      {/* Top Header & Navigation */}
      <div className="bg-white rounded-3xl p-5 border border-indigo-50 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} className="text-amber-600" /> Modo Duolingo IA
              </span>
              <span className="text-xs text-gray-400 font-bold">vs La Máquina</span>
            </div>
            <h2 className="font-sans text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
              Ajedrez Dinámico contra la IA
            </h2>
          </div>
        </div>

        {/* Bot Level Selector Pills */}
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

      {/* Main Game Interface: Bot Mascot Header + Chessboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Bot Avatar & Talk Bubble + Game Stats */}
        <div className="lg:col-span-4 space-y-4">
          {/* Bot Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 rounded-3xl p-5 text-white shadow-xl space-y-4 border border-indigo-500/20 relative overflow-hidden">
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
                  : 'bg-emerald-400 text-slate-950'
                }`}>
                  {botEmotion === 'victory' ? '🏆' : botEmotion === 'defeat' ? '😵' : botEmotion === 'surprised' ? '😲' : '😊'}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-white">{selectedBot.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${selectedBot.badgeColor}`}>
                    Nivel {selectedBot.level}
                  </span>
                </div>
                <p className="text-xs text-indigo-200 font-medium">{selectedBot.role}</p>
              </div>
            </div>

            {/* Dynamic Bot Talk Bubble */}
            <div className="relative bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-xs text-amber-100 font-medium leading-relaxed">
              <div className="absolute -top-2 left-6 w-3 h-3 bg-white/10 rotate-45 border-l border-t border-white/10" />
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0">
                  {isBotThinking ? '🧠' : '💬'}
                </span>
                <div>
                  {isBotThinking ? (
                    <span className="animate-pulse text-amber-300 font-bold">
                      Calculando siguiente jugada...
                    </span>
                  ) : (
                    <span>"{botMessage}"</span>
                  )}
                </div>
              </div>
            </div>

            {/* Reward Points Badge */}
            <div className="flex justify-between items-center text-xs pt-1 border-t border-white/10 text-indigo-200">
              <span>Recompensa de Victoria:</span>
              <span className="font-black text-amber-400 flex items-center gap-1">
                <Trophy size={14} /> +{selectedBot.pointsReward} Pts
              </span>
            </div>
          </div>

          {/* Action Helper Tools (Duolingo Style Buttons) */}
          <div className="bg-white rounded-3xl p-4 border border-indigo-50 shadow-md space-y-3">
            <h4 className="font-sans text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              Herramientas de Aprendizaje
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleGetHint}
                disabled={game.turn() !== 'w' || gameStatus !== 'playing' || isBotThinking}
                className="p-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
              >
                <Lightbulb size={20} className="text-amber-600" />
                <span>Pista Duolingo</span>
              </button>

              <button
                onClick={handleUndo}
                disabled={history.length < 2 || isBotThinking || gameStatus !== 'playing'}
                className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
              >
                <RotateCcw size={20} className="text-indigo-600" />
                <span>Deshacer Jugada</span>
              </button>
            </div>

            {/* Hint Box Explanation */}
            <AnimatePresence>
              {hintMove && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="bg-amber-100/80 border border-amber-300 rounded-2xl p-3 text-xs text-amber-950 space-y-1"
                >
                  <div className="flex items-center gap-1 font-bold text-amber-900">
                    <Sparkles size={14} className="text-amber-600" />
                    <span>Sugerencia del Búho Tutor:</span>
                  </div>
                  <p className="leading-snug">{hintMove.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected Piece Kids Info */}
            {selectedPieceInfo && (
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3 text-xs text-indigo-950 space-y-1 animate-fade-in">
                <span className="font-extrabold text-indigo-900 block">💡 {selectedPieceInfo.name}</span>
                <p className="text-[11px] text-indigo-800 leading-snug">{selectedPieceInfo.desc}</p>
              </div>
            )}
          </div>

          {/* Captures & Move Log */}
          <div className="bg-white rounded-3xl p-4 border border-indigo-50 shadow-md space-y-2">
            <h4 className="font-sans text-xs font-bold text-gray-500 uppercase tracking-wider">
              Piezas Capturadas
            </h4>
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-2xl text-lg">
              <div className="flex flex-wrap gap-1">
                <span className="text-xs font-bold text-gray-400 mr-1">Tú:</span>
                {capturedByWhite.map((p, idx) => (
                  <span key={idx} className="text-slate-900">{PIECE_SYMBOLS['b' + p.toUpperCase()]}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs font-bold text-gray-400 mr-1">{selectedBot.name}:</span>
                {capturedByBlack.map((p, idx) => (
                  <span key={idx} className="text-slate-900">{PIECE_SYMBOLS['w' + p.toUpperCase()]}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 8x8 Chessboard */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center">
          <div className="bg-slate-900 p-3 sm:p-5 rounded-[36px] shadow-2xl border-4 border-slate-800 w-full max-w-[500px] relative">
            
            {/* Top Bar inside Board Frame */}
            <div className="flex justify-between items-center text-white text-xs font-bold px-2 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Tu Turno (Blancas ♔)</span>
              </div>
              <span className="text-slate-400 text-[11px]">Movimientos: {moveCount}</span>
            </div>

            {/* Board 8x8 Grid */}
            <div className="grid grid-cols-8 grid-rows-8 w-full aspect-square border-2 border-amber-900/60 rounded-2xl overflow-hidden shadow-inner">
              {board.map((row, rowIndex) =>
                row.map((square, colIndex) => {
                  const squareName = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}` as Square;
                  const isLight = (rowIndex + colIndex) % 2 === 0;
                  const isSelected = selectedSquare === squareName;
                  const isPossible = possibleMoves.includes(squareName);
                  const isHintTarget = hintMove?.to === squareName || hintMove?.from === squareName;

                  let bgColor = isLight ? 'bg-[#eeeed2]' : 'bg-[#769656]';
                  if (isSelected) bgColor = 'bg-amber-300 ring-4 ring-amber-400 inset-0 z-10';
                  else if (isHintTarget) bgColor = 'bg-amber-400 animate-pulse';

                  return (
                    <div
                      key={squareName}
                      onClick={() => handleSquareClick(squareName)}
                      className={`relative flex items-center justify-center cursor-pointer transition-all select-none ${bgColor}`}
                    >
                      {/* Square Coordinate Labels */}
                      {colIndex === 0 && (
                        <span className={`absolute top-0.5 left-1 text-[9px] font-black ${isLight ? 'text-[#769656]' : 'text-[#eeeed2]'}`}>
                          {8 - rowIndex}
                        </span>
                      )}
                      {rowIndex === 7 && (
                        <span className={`absolute bottom-0.5 right-1 text-[9px] font-black ${isLight ? 'text-[#769656]' : 'text-[#eeeed2]'}`}>
                          {String.fromCharCode(97 + colIndex)}
                        </span>
                      )}

                      {/* Possible Move Indicator Dot */}
                      {isPossible && !square && (
                        <div className="w-3.5 h-3.5 rounded-full bg-amber-600/60 shadow-xs" />
                      )}
                      {isPossible && square && (
                        <div className="absolute inset-0 border-4 border-rose-500 rounded-full animate-ping opacity-75" />
                      )}

                      {/* Chess Piece Symbol */}
                      {square && (
                        <span
                          className={`text-3xl sm:text-4xl drop-shadow-md transition-transform ${
                            square.color === 'w' ? 'text-white' : 'text-slate-950'
                          } ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
                        >
                          {PIECE_SYMBOLS[square.color + square.type.toUpperCase()]}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Game Over Modal Overlay */}
            {gameStatus !== 'playing' && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs rounded-[32px] flex flex-col items-center justify-center p-6 text-center text-white space-y-4 animate-fade-in z-30">
                <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center mx-auto text-3xl">
                  {winner === 'user' ? '🏆' : '👑'}
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white">
                    {winner === 'user' ? '¡VICTORIA ESPECTACULAR!' : winner === 'bot' ? 'Gana la Máquina' : '¡Empate en el Tablero!'}
                  </h3>
                  <p className="text-xs text-indigo-200">
                    {winner === 'user' 
                      ? `¡Derrotaste a ${selectedBot.name} y ganaste +${selectedBot.pointsReward} Pts de motivación!`
                      : `Buen esfuerzo compitiendo contra ${selectedBot.name}. ¡Sigue practicando!`}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => startNewGame()}
                    className="px-6 py-3 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition-all shadow-lg cursor-pointer"
                  >
                    Volver a Jugar
                  </button>
                  <button
                    onClick={onExit}
                    className="px-6 py-3 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Salir al Hub
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
