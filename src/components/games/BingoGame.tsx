import React, { useState, useEffect } from 'react';
import { Usuario } from '../../types';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Trophy, ArrowLeft, Sparkles, Volume2, UserCheck, Users, Clock, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BingoGameProps {
  partidaId: string;
  currentUser: Usuario;
  usuarios: Usuario[];
  partidaData: any;
  onExit: () => void;
  onAwardPoints: (points: number) => void;
}

export default function BingoGame({
  partidaId,
  currentUser,
  usuarios,
  partidaData,
  onExit,
  onAwardPoints
}: BingoGameProps) {
  const [localPartida, setLocalPartida] = useState<any>(partidaData);
  const [myCard, setMyCard] = useState<number[][]>([]);
  const [markedCells, setMarkedCells] = useState<boolean[][]>([]);
  const [pointsAwarded, setPointsAwarded] = useState<boolean>(false);

  const isCoopMode = localPartida?.modo === 'cooperativo';
  const COOP_LIMIT = 40;

  // Real-time Firestore sync
  useEffect(() => {
    if (!firestore || !partidaId) return;
    const unsub = onSnapshot(doc(firestore, "partidas", partidaId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLocalPartida(data);
      }
    });
    return () => unsub();
  }, [partidaId]);

  const players: string[] = localPartida?.jugadores || [];
  const isHost = players[0] === currentUser.uid;

  // Generate 5x5 card
  const generateNewCardMatrix = (): number[][] => {
    const card: number[][] = [];
    const ranges = [
      [1, 15],   // B
      [16, 30],  // I
      [31, 45],  // N
      [46, 60],  // G
      [61, 75]   // O
    ];

    for (let row = 0; row < 5; row++) {
      const rowArr: number[] = [];
      for (let col = 0; col < 5; col++) {
        if (row === 2 && col === 2) {
          rowArr.push(0); // Free space
        } else {
          const [min, max] = ranges[col];
          let num = Math.floor(Math.random() * (max - min + 1)) + min;
          while (rowArr.includes(num)) {
            num = Math.floor(Math.random() * (max - min + 1)) + min;
          }
          rowArr.push(num);
        }
      }
      card.push(rowArr);
    }
    return card;
  };

  // Initialization logic for Competitive vs Cooperative
  useEffect(() => {
    if (isCoopMode) {
      // In Coop Mode: Use shared card from Firestore, or host generates & initializes it
      if (!localPartida?.carton_compartido && isHost && firestore) {
        const newSharedCard = generateNewCardMatrix();
        const initialMarked = Array(5).fill(null).map((_, r) =>
          Array(5).fill(null).map((_, c) => (r === 2 && c === 2))
        );
        updateDoc(doc(firestore, "partidas", partidaId), {
          carton_compartido: newSharedCard,
          celdas_marcadas: initialMarked,
          ultima_actualizacion: serverTimestamp()
        });
      }
    } else {
      // In Competitive Mode: Generate local card for current player
      const card = generateNewCardMatrix();
      setMyCard(card);
      const initialMarked = Array(5).fill(null).map((_, r) =>
        Array(5).fill(null).map((_, c) => (r === 2 && c === 2))
      );
      setMarkedCells(initialMarked);
    }
  }, [isCoopMode, isHost, partidaId, localPartida?.carton_compartido]);

  // Derive displayed card & marked matrix
  const activeCard: number[][] = isCoopMode
    ? (localPartida?.carton_compartido || Array(5).fill(Array(5).fill(0)))
    : myCard;

  const activeMarked: boolean[][] = isCoopMode
    ? (localPartida?.celdas_marcadas || Array(5).fill(Array(5).fill(false)))
    : markedCells;

  const calledNumbers: number[] = localPartida?.numeros_cantados || [];
  const lastCalledNumber = calledNumbers[calledNumbers.length - 1];

  // Inactive host helper
  const getLastUpdateMillis = (partida: any) => {
    const ts = partida?.ultima_actualizacion || partida?.creado_en;
    if (!ts) return null;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    if (typeof ts === 'number') return ts;
    if (ts instanceof Date) return ts.getTime();
    return null;
  };

  const [secondsInactive, setSecondsInactive] = useState<number>(0);

  useEffect(() => {
    const updateInactiveTime = () => {
      const lastTs = getLastUpdateMillis(localPartida);
      if (lastTs) {
        const elapsed = Math.floor((Date.now() - lastTs) / 1000);
        setSecondsInactive(Math.max(0, elapsed));
      } else {
        setSecondsInactive(0);
      }
    };

    updateInactiveTime();
    const interval = setInterval(updateInactiveTime, 1000);
    return () => clearInterval(interval);
  }, [localPartida]);

  const TIMEOUT_SECONDS = 20;
  const isHostInactive = secondsInactive >= TIMEOUT_SECONDS;
  const canCallNextNumber = isHost || isHostInactive;

  // Host (or active player) calls next number
  const handleCallNextNumber = async () => {
    if (localPartida?.estado === 'finalizada' || !canCallNextNumber) return;

    let availableNums: number[] = [];
    for (let i = 1; i <= 75; i++) {
      if (!calledNumbers.includes(i)) {
        availableNums.push(i);
      }
    }

    if (availableNums.length === 0) return;

    const randomIndex = Math.floor(Math.random() * availableNums.length);
    const nextNum = availableNums[randomIndex];

    if (firestore) {
      await updateDoc(doc(firestore, "partidas", partidaId), {
        numeros_cantados: [...calledNumbers, nextNum],
        ultima_actualizacion: serverTimestamp()
      });
    }
  };

  // Toggle cell mark
  const toggleCellMark = async (r: number, c: number) => {
    const num = activeCard[r][c];
    if (num === 0) return; // Free center space

    // Must be called to mark
    if (!calledNumbers.includes(num)) return;

    if (isCoopMode) {
      // In Coop mode, sync cell toggle to Firestore so everyone sees it!
      if (!firestore) return;
      const currentMarked = localPartida?.celdas_marcadas || Array(5).fill(Array(5).fill(false));
      const newMarked = currentMarked.map((rowArr: boolean[], rowIdx: number) =>
        rowArr.map((val: boolean, colIdx: number) => {
          if (rowIdx === r && colIdx === c) return !val;
          return val;
        })
      );

      await updateDoc(doc(firestore, "partidas", partidaId), {
        celdas_marcadas: newMarked,
        ultima_actualizacion: serverTimestamp()
      });
    } else {
      // In Competitive mode, update local state
      setMarkedCells(prev => {
        const copy = prev.map(row => [...row]);
        copy[r][c] = !copy[r][c];
        return copy;
      });
    }
  };

  // Check BINGO condition
  const handleCheckBingo = async () => {
    if (localPartida?.estado === 'finalizada') return;

    let hasBingo = false;

    // Check rows
    for (let r = 0; r < 5; r++) {
      if (activeMarked[r]?.every(val => val)) hasBingo = true;
    }

    // Check cols
    for (let c = 0; c < 5; c++) {
      if (activeMarked.every(row => row[c])) hasBingo = true;
    }

    // Check diagonals
    if ([0,1,2,3,4].every(i => activeMarked[i]?.[i])) hasBingo = true;
    if ([0,1,2,3,4].every(i => activeMarked[i]?.[4 - i])) hasBingo = true;

    if (hasBingo) {
      if (isCoopMode) {
        if (calledNumbers.length > COOP_LIMIT) {
          alert(`¡Completaste el Bingo pero superaron el límite de ${COOP_LIMIT} balotas cantadas! Intenten de nuevo.`);
          return;
        }

        if (firestore) {
          await updateDoc(doc(firestore, "partidas", partidaId), {
            estado: 'finalizada',
            resultado_cooperativo: 'victoria',
            ganador_uid: currentUser.uid,
            ultima_actualizacion: serverTimestamp()
          });
        }
      } else {
        onAwardPoints(150);
        if (firestore) {
          await updateDoc(doc(firestore, "partidas", partidaId), {
            estado: 'finalizada',
            ganador_uid: currentUser.uid,
            ultima_actualizacion: serverTimestamp()
          });
        }
      }
    } else {
      alert("¡Aún no completas una línea o diagonal válida con los números cantados!");
    }
  };

  // Trigger Victory Points in Coop Mode
  useEffect(() => {
    if (isCoopMode && localPartida?.resultado_cooperativo === 'victoria' && !pointsAwarded) {
      setPointsAwarded(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
      onAwardPoints(150);
    }
  }, [isCoopMode, localPartida?.resultado_cooperativo, pointsAwarded, onAwardPoints]);

  const getLetterForNumber = (num: number) => {
    if (num <= 15) return 'B';
    if (num <= 30) return 'I';
    if (num <= 45) return 'N';
    if (num <= 60) return 'G';
    return 'O';
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 font-sans animate-fade-in pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 border border-indigo-50 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 ${
                isCoopMode ? 'bg-emerald-100 text-emerald-900' : 'bg-indigo-100 text-indigo-900'
              }`}>
                {isCoopMode ? '🤝 Modo Cooperativo' : '⚔️ Modo Competitivo'}
              </span>
            </div>
            <h2 className="font-sans text-xl font-extrabold text-gray-900 tracking-tight">
              🎱 Bingo Familiar (75 Números)
            </h2>
          </div>
        </div>

        {/* Turn Status */}
        <div className="flex items-center gap-2">
          {localPartida?.estado === 'finalizada' ? (
            <span className="px-4 py-2 rounded-2xl bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow">
              <Trophy size={16} />
              {isCoopMode ? '¡VICTORIA EN EQUIPO! (+150 Pts)' : (localPartida.ganador_uid === currentUser.uid ? '¡CANTAS BINGO! (+150 Pts)' : 'Partida Finalizada')}
            </span>
          ) : (
            <span className="px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-900 font-extrabold text-xs flex items-center gap-1.5 shadow">
              <UserCheck size={16} />
              {players.length} Jugadores Conectados
            </span>
          )}
        </div>
      </div>

      {/* Coop Challenge Banner */}
      {isCoopMode && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-950 font-bold text-xs">
          <div className="flex items-center gap-2">
            <Users className="text-emerald-600 shrink-0" size={20} />
            <div>
              <span className="font-extrabold block">Cartón Único Compartido Familiar</span>
              <span className="text-[11px] text-emerald-800 font-medium">
                Cualquier integrante puede marcar las casillas cantadas.
              </span>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-200/80 text-emerald-950 font-black text-xs whitespace-nowrap">
            Meta: Completar antes de Balota {calledNumbers.length} / {COOP_LIMIT}
          </div>
        </div>
      )}

      {/* Number Caller Banner */}
      <div className="bg-gradient-to-r from-brand-primary to-indigo-900 text-white rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-amber-400 text-slate-950 font-black text-3xl rounded-3xl flex items-center justify-center shadow-lg animate-bounce">
            {lastCalledNumber ? `${getLetterForNumber(lastCalledNumber)}-${lastCalledNumber}` : '—'}
          </div>
          <div className="text-left">
            <span className="text-[10px] uppercase tracking-wider text-amber-300 font-extrabold block">Último Número Cantado</span>
            <span className="text-sm font-bold text-slate-100">
              {calledNumbers.length > 0 ? `Total balotas cantadas: ${calledNumbers.length}` : 'Esperando primera balota'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {localPartida?.estado !== 'finalizada' && (
            canCallNextNumber ? (
              <button
                onClick={handleCallNextNumber}
                className={`px-5 py-3 font-extrabold text-xs rounded-2xl shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 ${
                  isHost
                    ? 'bg-amber-400 hover:bg-amber-500 text-slate-950'
                    : 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                }`}
              >
                <Volume2 size={16} />
                {isHost ? 'Cantar Siguiente Balota' : 'Cantar Balota (Anfitrión Inactivo >20s)'}
              </button>
            ) : (
              <span className="px-4 py-2.5 bg-indigo-950/80 text-amber-300 font-bold text-[11px] rounded-2xl border border-indigo-800/80 shadow-sm">
                Esperando anfitrión... ({Math.max(0, 20 - secondsInactive)}s)
              </span>
            )
          )}

          <button
            onClick={handleCheckBingo}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Sparkles size={16} />
            {isCoopMode ? '¡Cantar BINGO Cooperativo!' : '¡Cantar BINGO!'}
          </button>
        </div>
      </div>

      {/* 5x5 Bingo Card */}
      <div className="bg-white rounded-3xl border border-indigo-100 p-6 shadow-xl max-w-md mx-auto">
        <div className="grid grid-cols-5 gap-2 mb-3 text-center font-black text-lg text-brand-primary">
          <div>B</div>
          <div>I</div>
          <div>N</div>
          <div>G</div>
          <div>O</div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {activeCard.map((row, r) =>
            row.map((val, c) => {
              const isCenter = r === 2 && c === 2;
              const isMarked = activeMarked[r]?.[c];
              const isCalled = calledNumbers.includes(val);

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => toggleCellMark(r, c)}
                  className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center font-black text-sm transition-all cursor-pointer ${
                    isCenter
                      ? 'bg-amber-400 text-slate-900 border-amber-500 shadow-md'
                      : isMarked
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow'
                      : isCalled
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 hover:bg-indigo-100'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {isCenter ? '★ LIBRE' : val}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
