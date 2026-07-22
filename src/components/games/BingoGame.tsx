import React, { useState, useEffect } from 'react';
import { Usuario } from '../../types';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Trophy, ArrowLeft, Sparkles, Volume2, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface BingoGameProps {
  partidaId: string;
  currentUser: Usuario;
  usuarios: Usuario[];
  partidaData: any;
  onExit: () => void;
  onAwardPoints: (points: number) => void;
}

export default function BingoGame({ partidaId, currentUser, usuarios, partidaData, onExit, onAwardPoints }: BingoGameProps) {
  const [localPartida, setLocalPartida] = useState<any>(partidaData);
  const [myCard, setMyCard] = useState<number[][]>([]);
  const [markedCells, setMarkedCells] = useState<boolean[][]>([]);

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

  // Generate unique 5x5 card for player on initial mount
  useEffect(() => {
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

    setMyCard(card);

    const initialMarked = Array(5).fill(null).map((_, r) =>
      Array(5).fill(null).map((_, c) => (r === 2 && c === 2))
    );
    setMarkedCells(initialMarked);
  }, []);

  const calledNumbers: number[] = localPartida?.numeros_cantados || [];
  const lastCalledNumber = calledNumbers[calledNumbers.length - 1];

  const players = localPartida?.jugadores || [];
  const isHost = players[0] === currentUser.uid;

  // Host calls next number
  const handleCallNextNumber = async () => {
    if (localPartida?.estado === 'finalizada') return;

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
  const toggleCellMark = (r: number, c: number) => {
    const num = myCard[r][c];
    if (num === 0) return; // free center

    // Check if called
    if (!calledNumbers.includes(num)) return;

    setMarkedCells(prev => {
      const copy = prev.map(row => [...row]);
      copy[r][c] = !copy[r][c];
      return copy;
    });
  };

  // Check BINGO condition
  const handleCheckBingo = async () => {
    if (localPartida?.estado === 'finalizada') return;

    // Verify row, col, or diagonal
    let hasBingo = false;

    // Check rows
    for (let r = 0; r < 5; r++) {
      if (markedCells[r].every(val => val)) hasBingo = true;
    }

    // Check cols
    for (let c = 0; c < 5; c++) {
      if (markedCells.every(row => row[c])) hasBingo = true;
    }

    // Check diagonals
    if ([0,1,2,3,4].every(i => markedCells[i][i])) hasBingo = true;
    if ([0,1,2,3,4].every(i => markedCells[i][4 - i])) hasBingo = true;

    if (hasBingo) {
      onAwardPoints(150);
      if (firestore) {
        await updateDoc(doc(firestore, "partidas", partidaId), {
          estado: 'finalizada',
          ganador_uid: currentUser.uid,
          ultima_actualizacion: serverTimestamp()
        });
      }
    } else {
      alert("¡Aún no completas una línea o diagonal válida de números cantados!");
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
              🎱 Bingo Familiar (75 Números)
            </h2>
            <p className="text-xs text-gray-500">Sincronizado para 2 a 6 jugadores de la familia</p>
          </div>
        </div>

        {/* Turn Status */}
        <div className="flex items-center gap-2">
          {localPartida?.estado === 'finalizada' ? (
            <span className="px-4 py-2 rounded-2xl bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow">
              <Trophy size={16} />
              {localPartida.ganador_uid === currentUser.uid ? '¡CANTAS BINGO! (+150 Pts)' : 'Partida Finalizada'}
            </span>
          ) : (
            <span className="px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-900 font-extrabold text-xs flex items-center gap-1.5 shadow">
              <UserCheck size={16} />
              {players.length} Jugadores Conectados
            </span>
          )}
        </div>
      </div>

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

        <div className="flex gap-2">
          {isHost && localPartida?.estado !== 'finalizada' && (
            <button
              onClick={handleCallNextNumber}
              className="px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs rounded-2xl shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Volume2 size={16} />
              Cantar Siguiente Balota
            </button>
          )}

          <button
            onClick={handleCheckBingo}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Sparkles size={16} />
            ¡Cantar BINGO!
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
          {myCard.map((row, r) =>
            row.map((val, c) => {
              const isCenter = r === 2 && c === 2;
              const isMarked = markedCells[r]?.[c];
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
