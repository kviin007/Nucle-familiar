import React, { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { Usuario } from '../../types';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Trophy, HelpCircle, RotateCcw, ArrowLeft, Sparkles, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface ChessGameProps {
  partidaId: string;
  currentUser: Usuario;
  usuarios: Usuario[];
  partidaData: any;
  onExit: () => void;
  onAwardPoints: (points: number) => void;
}

const PIECE_SYMBOLS: Record<string, string> = {
  wP: '♙', wN: '♘', wB: '♗', wR: '♖', wQ: '♕', wK: '♔',
  bP: '♟', bN: '♞', bB: '♝', bR: '♜', bQ: '♛', bK: '♚'
};

const KIDS_PIECE_EXPLANATIONS: Record<string, { name: string; desc: string }> = {
  p: { name: 'Peón', desc: 'Avanza 1 casilla hacia adelante (o 2 al inicio). Captura en diagonal.' },
  n: { name: 'Caballo', desc: 'Se mueve en forma de "L" (2 casillas y gira 1). ¡Es la única pieza que puede saltar sobre otras!' },
  b: { name: 'Alfil', desc: 'Se mueve en diagonal tantas casillas como desee, siempre en su mismo color.' },
  r: { name: 'Torre', desc: 'Se mueve en línea recta horizontal o vertical tantas casillas como esté libre.' },
  q: { name: 'Reina', desc: '¡La pieza más poderosa! Se mueve como Torre y Alfil combinados.' },
  k: { name: 'Rey', desc: 'Se mueve 1 casilla en cualquier dirección. ¡Protégelo siempre!' },
};

export default function ChessGame({ partidaId, currentUser, usuarios, partidaData, onExit, onAwardPoints }: ChessGameProps) {
  const [game, setGame] = useState<Chess>(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [showKidsHelp, setShowKidsHelp] = useState<boolean>(true);
  const [selectedPieceInfo, setSelectedPieceInfo] = useState<{ name: string; desc: string } | null>(null);
  const [localPartida, setLocalPartida] = useState<any>(partidaData);

  // Sync game state from Firestore
  useEffect(() => {
    if (!firestore || !partidaId) return;
    const unsub = onSnapshot(doc(firestore, "partidas", partidaId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLocalPartida(data);
        if (data.fen) {
          const newGame = new Chess(data.fen);
          setGame(newGame);
        }
      }
    });
    return () => unsub();
  }, [partidaId]);

  const players = localPartida?.jugadores || [];
  const whitePlayerUid = players[0];
  const blackPlayerUid = players[1];

  const whitePlayer = usuarios.find(u => u.uid === whitePlayerUid) || { nombre: 'Jugador 1 (Blancas)', avatar_url: '' };
  const blackPlayer = usuarios.find(u => u.uid === blackPlayerUid) || { nombre: 'Jugador 2 (Negras)', avatar_url: '' };

  const isWhite = currentUser.uid === whitePlayerUid;
  const isBlack = currentUser.uid === blackPlayerUid;

  const currentTurnUid = localPartida?.turno_actual;
  const isMyTurn = currentTurnUid === currentUser.uid;

  // Handle Square click
  const handleSquareClick = async (square: Square) => {
    if (!isMyTurn || localPartida?.estado === 'finalizada') return;

    // Is current player attempting to move white or black pieces?
    const activeColor = game.turn(); // 'w' or 'b'
    if ((activeColor === 'w' && !isWhite) || (activeColor === 'b' && !isBlack)) {
      return; // Not your piece color
    }

    // If square selected, try move
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
          promotion: 'q', // auto promote to queen for simplicity
        });

        if (move) {
          // Valid move!
          const nextFen = gameCopy.fen();
          const nextTurnUid = isWhite ? blackPlayerUid : whitePlayerUid;
          let isOver = gameCopy.isGameOver();
          let winnerUid = null;

          if (gameCopy.isCheckmate()) {
            winnerUid = currentUser.uid;
            onAwardPoints(100);
          }

          if (firestore) {
            await updateDoc(doc(firestore, "partidas", partidaId), {
              fen: nextFen,
              turno_actual: nextTurnUid,
              estado: isOver ? 'finalizada' : 'en_curso',
              ganador_uid: winnerUid,
              ultima_actualizacion: serverTimestamp()
            });
          }

          setGame(gameCopy);
          setSelectedSquare(null);
          setPossibleMoves([]);
          setSelectedPieceInfo(null);
          return;
        }
      } catch (e) {
        // Invalid move attempt, re-select
      }
    }

    // Select piece
    const piece = game.get(square);
    if (piece && ((piece.color === 'w' && isWhite) || (piece.color === 'b' && isBlack))) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true });
      setPossibleMoves(moves.map(m => m.to as Square));

      const info = KIDS_PIECE_EXPLANATIONS[piece.type];
      if (info) {
        setSelectedPieceInfo(info);
      }
    } else {
      setSelectedSquare(null);
      setPossibleMoves([]);
      setSelectedPieceInfo(null);
    }
  };

  const board = game.board(); // 8x8 array

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 font-sans animate-fade-in">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 border border-indigo-50 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="font-sans text-xl font-extrabold text-gray-900 flex items-center gap-2">
              ♟️ Ajedrez Familiar
            </h2>
            <p className="text-xs text-gray-500">Partida multijugador sincronizada en tiempo real</p>
          </div>
        </div>

        {/* Turn Status Badge */}
        <div className="flex items-center gap-2">
          {localPartida?.estado === 'finalizada' ? (
            <span className="px-4 py-2 rounded-2xl bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow">
              <Trophy size={16} />
              {localPartida.ganador_uid === currentUser.uid ? '¡Ganaste la partida! (+100 Pts)' : 'Partida Finalizada'}
            </span>
          ) : (
            <span className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow ${
              isMyTurn ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-100 text-slate-700'
            }`}>
              <UserCheck size={16} />
              {isMyTurn ? '¡Es TU Turno!' : `Esperando turno de ${isWhite ? blackPlayer.nombre : whitePlayer.nombre}`}
            </span>
          )}
        </div>
      </div>

      {/* Players Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
          game.turn() === 'w' ? 'border-amber-400 bg-amber-50/50 shadow-md' : 'border-slate-100 bg-white'
        }`}>
          <img className="w-10 h-10 rounded-full object-cover border border-slate-200" src={whitePlayer.avatar_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop"} alt="Blancas" />
          <div className="text-left overflow-hidden">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Blancas ♔</span>
            <span className="text-xs font-bold text-gray-900 truncate block">{whitePlayer.nombre}</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
          game.turn() === 'b' ? 'border-amber-400 bg-amber-50/50 shadow-md' : 'border-slate-100 bg-white'
        }`}>
          <img className="w-10 h-10 rounded-full object-cover border border-slate-200" src={blackPlayer.avatar_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop"} alt="Negras" />
          <div className="text-left overflow-hidden">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Negras ♚</span>
            <span className="text-xs font-bold text-gray-900 truncate block">{blackPlayer.nombre}</span>
          </div>
        </div>
      </div>

      {/* Kids Explanation Banner */}
      <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 rounded-2xl p-3 px-4">
        <div className="flex items-center gap-2 text-xs text-indigo-900 font-bold">
          <HelpCircle size={16} className="text-brand-primary" />
          <span>Modo Explicación para Niños</span>
        </div>
        <button
          onClick={() => setShowKidsHelp(!showKidsHelp)}
          className="text-xs font-bold text-brand-primary underline cursor-pointer"
        >
          {showKidsHelp ? 'Ocultar' : 'Activar'}
        </button>
      </div>

      {showKidsHelp && selectedPieceInfo && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs font-medium text-left"
        >
          <span className="font-extrabold uppercase text-amber-800 mr-2">💡 Como se mueve {selectedPieceInfo.name}:</span>
          {selectedPieceInfo.desc}
        </motion.div>
      )}

      {/* Chess Board */}
      <div className="bg-slate-800 p-3 md:p-4 rounded-3xl shadow-2xl max-w-md mx-auto aspect-square flex flex-col justify-between">
        <div className="grid grid-cols-8 gap-0 border-2 border-slate-700 rounded-2xl overflow-hidden h-full">
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const file = String.fromCharCode(97 + colIndex);
              const rank = String(8 - rowIndex);
              const square = `${file}${rank}` as Square;

              const isLight = (rowIndex + colIndex) % 2 === 0;
              const isSelected = selectedSquare === square;
              const isPossible = possibleMoves.includes(square);

              const pieceKey = piece ? `${piece.color}${piece.type.toUpperCase()}` : null;
              const pieceSymbol = pieceKey ? PIECE_SYMBOLS[pieceKey] : '';

              return (
                <button
                  key={square}
                  onClick={() => handleSquareClick(square)}
                  className={`flex items-center justify-center text-3xl md:text-4xl select-none transition-all relative cursor-pointer ${
                    isLight ? 'bg-[#EEEED2]' : 'bg-[#769656]'
                  } ${isSelected ? 'ring-4 ring-amber-400 ring-inset z-10' : ''}`}
                >
                  {pieceSymbol && (
                    <span className={`drop-shadow-sm transition-transform ${piece?.color === 'w' ? 'text-slate-100 font-extrabold' : 'text-slate-900 font-black'}`}>
                      {pieceSymbol}
                    </span>
                  )}

                  {isPossible && (
                    <div className="absolute w-3.5 h-3.5 bg-amber-400 rounded-full opacity-80 animate-ping" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
