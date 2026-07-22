import React, { useState, useEffect } from 'react';
import { Usuario } from '../../types';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Trophy, ArrowLeft, RotateCw, UserCheck, CheckCircle } from 'lucide-react';

interface BattleshipGameProps {
  partidaId: string;
  currentUser: Usuario;
  usuarios: Usuario[];
  partidaData: any;
  onExit: () => void;
  onAwardPoints: (points: number) => void;
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

export default function BattleshipGame({ partidaId, currentUser, usuarios, partidaData, onExit, onAwardPoints }: BattleshipGameProps) {
  const [localPartida, setLocalPartida] = useState<any>(partidaData);

  // Fleet placement state
  const [placedShips, setPlacedShips] = useState<Record<string, boolean>>({}); // "r,c" -> true
  const [currentShipIndex, setCurrentShipIndex] = useState<number>(0);
  const [isHorizontal, setIsHorizontal] = useState<boolean>(true);
  const [placementReady, setPlacementReady] = useState<boolean>(false);

  // Firestore sync
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

  const players = localPartida?.jugadores || [];
  const p1Uid = players[0];
  const p2Uid = players[1];

  const isP1 = currentUser.uid === p1Uid;

  const myShotsKey = isP1 ? 'p1_disparos' : 'p2_disparos';
  const enemyShotsKey = isP1 ? 'p2_disparos' : 'p1_disparos';
  const myBoardKey = isP1 ? 'p1_flota' : 'p2_flota';
  const enemyBoardKey = isP1 ? 'p2_flota' : 'p1_flota';

  const myShots: Record<string, 'agua' | 'tocado'> = localPartida?.[myShotsKey] || {};
  const enemyShotsReceived: Record<string, 'agua' | 'tocado'> = localPartida?.[enemyShotsKey] || {};
  const enemyBoardFleet: Record<string, boolean> = localPartida?.[enemyBoardKey] || {};

  const isMyTurn = localPartida?.turno_actual === currentUser.uid;
  const isPhaseCombat = localPartida?.estado === 'en_curso';

  // Ship Placement Handler
  const handleCellClickPlacement = (r: number, c: number) => {
    if (placementReady || currentShipIndex >= SHIPS.length) return;

    const ship = SHIPS[currentShipIndex];
    const newTiles: string[] = [];

    for (let i = 0; i < ship.size; i++) {
      const nr = isHorizontal ? r : r + i;
      const nc = isHorizontal ? c + i : c;

      if (nr >= 10 || nc >= 10) return; // out of bounds
      const key = `${nr},${nc}`;
      if (placedShips[key]) return; // overlap
      newTiles.push(key);
    }

    const updated = { ...placedShips };
    newTiles.forEach(k => { updated[k] = true; });

    setPlacedShips(updated);
    if (currentShipIndex + 1 >= SHIPS.length) {
      setPlacementReady(true);
    } else {
      setCurrentShipIndex(prev => prev + 1);
    }
  };

  // Confirm fleet placement to Firestore
  const handleConfirmPlacement = async () => {
    if (!placementReady) return;

    const updatePayload: any = {
      [myBoardKey]: placedShips,
      [`${isP1 ? 'p1' : 'p2'}_ready`]: true,
      ultima_actualizacion: serverTimestamp()
    };

    // Check if both ready
    const otherReady = isP1 ? localPartida?.p2_ready : localPartida?.p1_ready;
    if (otherReady) {
      updatePayload.estado = 'en_curso';
    }

    if (firestore) {
      await updateDoc(doc(firestore, "partidas", partidaId), updatePayload);
    }
  };

  // Combat Shot Handler
  const handleFireShot = async (r: number, c: number) => {
    if (!isMyTurn || !isPhaseCombat || localPartida?.estado === 'finalizada') return;

    const key = `${r},${c}`;
    if (myShots[key]) return; // already shot here

    const isHit = !!enemyBoardFleet[key];
    const updatedShots = { ...myShots, [key]: isHit ? ('tocado' as const) : ('agua' as const) };

    // Check if all enemy tiles hit
    const enemyFleetKeys = Object.keys(enemyBoardFleet);
    const totalEnemyTiles = enemyFleetKeys.length;
    const totalHits = enemyFleetKeys.filter(k => updatedShots[k] === 'tocado').length;

    const isVictory = totalEnemyTiles > 0 && totalHits >= totalEnemyTiles;
    const nextTurnUid = isP1 ? p2Uid : p1Uid;

    if (isVictory) {
      onAwardPoints(150);
    }

    if (firestore) {
      await updateDoc(doc(firestore, "partidas", partidaId), {
        [myShotsKey]: updatedShots,
        turno_actual: nextTurnUid,
        estado: isVictory ? 'finalizada' : 'en_curso',
        ganador_uid: isVictory ? currentUser.uid : null,
        ultima_actualizacion: serverTimestamp()
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 font-sans animate-fade-in">
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
              🚢 Batalla Naval Familiar (10x10)
            </h2>
            <p className="text-xs text-gray-500">Estrategia y disparos navales en tiempo real</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {localPartida?.estado === 'finalizada' ? (
            <span className="px-4 py-2 rounded-2xl bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow">
              <Trophy size={16} />
              {localPartida.ganador_uid === currentUser.uid ? '¡HUNDISTE TODA LA FLOTA RIVAL! (+150 Pts)' : 'Partida Finalizada'}
            </span>
          ) : isPhaseCombat ? (
            <span className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow ${
              isMyTurn ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-100 text-slate-700'
            }`}>
              <UserCheck size={16} />
              {isMyTurn ? '¡Es TU Turno de Disparar!' : 'Esperando disparo enemigo...'}
            </span>
          ) : (
            <span className="px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-900 font-extrabold text-xs">
              Fase de Colocación de Barcos
            </span>
          )}
        </div>
      </div>

      {/* Placement Controls Banner */}
      {!isPhaseCombat && localPartida?.estado !== 'finalizada' && (
        <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left space-y-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              {placementReady ? '¡Flota Lista!' : `Colocando: ${SHIPS[currentShipIndex]?.name} (${SHIPS[currentShipIndex]?.size} casillas)`}
            </span>
            <p className="text-xs text-slate-300">
              {placementReady ? 'Haz clic en "Confirmar Flota" para esperar a tu rival.' : 'Haz clic en las casillas del tablero para posicionar tu navío.'}
            </p>
          </div>

          <div className="flex gap-2">
            {!placementReady && (
              <button
                onClick={() => setIsHorizontal(!isHorizontal)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw size={14} />
                {isHorizontal ? 'Horizontal ➔' : 'Vertical ⬇'}
              </button>
            )}

            {placementReady && !(isP1 ? localPartida?.p1_ready : localPartida?.p2_ready) && (
              <button
                onClick={handleConfirmPlacement}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle size={16} />
                Confirmar Flota y Esperar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Boards Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Enemy Target Board */}
        <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-xl space-y-3">
          <h3 className="font-extrabold text-sm text-gray-900 flex items-center justify-between">
            <span>Tablero de Disparos (Rival)</span>
            <span className="text-xs text-rose-500 font-bold">🎯 Blanco</span>
          </h3>

          <div className="grid grid-cols-10 gap-1 aspect-square bg-slate-900 p-2 rounded-2xl">
            {Array(10).fill(null).map((_, r) =>
              Array(10).fill(null).map((_, c) => {
                const key = `${r},${c}`;
                const shotState = myShots[key];

                return (
                  <button
                    key={key}
                    onClick={() => handleFireShot(r, c)}
                    disabled={!isMyTurn || !isPhaseCombat}
                    className={`aspect-square rounded-lg text-xs font-black flex items-center justify-center transition-all ${
                      shotState === 'tocado'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : shotState === 'agua'
                        ? 'bg-cyan-900/60 text-cyan-300'
                        : 'bg-slate-800 hover:bg-indigo-900/60 border border-slate-700/50 cursor-pointer'
                    }`}
                  >
                    {shotState === 'tocado' ? '💥' : shotState === 'agua' ? '💧' : ''}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Own Fleet Board */}
        <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-xl space-y-3">
          <h3 className="font-extrabold text-sm text-gray-900 flex items-center justify-between">
            <span>Tu Flota y Radar Propio</span>
            <span className="text-xs text-indigo-600 font-bold">🛡️ Defensa</span>
          </h3>

          <div className="grid grid-cols-10 gap-1 aspect-square bg-slate-900 p-2 rounded-2xl">
            {Array(10).fill(null).map((_, r) =>
              Array(10).fill(null).map((_, c) => {
                const key = `${r},${c}`;
                const hasShip = placedShips[key] || (isP1 ? localPartida?.p1_flota?.[key] : localPartida?.p2_flota?.[key]);
                const receivedShot = enemyShotsReceived[key];

                return (
                  <button
                    key={key}
                    onClick={() => handleCellClickPlacement(r, c)}
                    disabled={isPhaseCombat}
                    className={`aspect-square rounded-lg text-xs font-black flex items-center justify-center transition-all ${
                      receivedShot === 'tocado'
                        ? 'bg-rose-600 text-white'
                        : receivedShot === 'agua'
                        ? 'bg-cyan-950 text-cyan-400'
                        : hasShip
                        ? 'bg-indigo-600 text-white border border-indigo-400'
                        : 'bg-slate-800 border border-slate-700/50 hover:bg-slate-700 cursor-pointer'
                    }`}
                  >
                    {receivedShot === 'tocado' ? '💥' : receivedShot === 'agua' ? '💧' : hasShip ? '🚢' : ''}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
