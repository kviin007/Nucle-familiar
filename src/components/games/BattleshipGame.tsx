import React, { useState, useEffect } from 'react';
import { Usuario } from '../../types';
import { doc, updateDoc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Trophy, ArrowLeft, RotateCw, UserCheck, CheckCircle, Crosshair, Anchor, Flame, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ShipSvg, ExplosionEffect, SplashEffect } from './BattleshipShipIcons';

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

  // Synchronize main partida document
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

  // Synchronize private document for my fleet
  useEffect(() => {
    if (!firestore || !partidaId || !currentUser.uid) return;
    const unsub = onSnapshot(doc(firestore, "partidas", partidaId, "privado", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.flota) {
          setPlacedShips(data.flota);
          setPlacementReady(true);
        }
      }
    });
    return () => unsub();
  }, [partidaId, currentUser.uid]);

  const players = localPartida?.jugadores || [];
  const p1Uid = players[0];
  const p2Uid = players[1];

  const isP1 = currentUser.uid === p1Uid;

  const myShotsKey = isP1 ? 'p1_disparos' : 'p2_disparos';
  const enemyShotsKey = isP1 ? 'p2_disparos' : 'p1_disparos';

  const myShots: Record<string, 'agua' | 'tocado'> = localPartida?.[myShotsKey] || {};
  const enemyShotsReceived: Record<string, 'agua' | 'tocado'> = localPartida?.[enemyShotsKey] || {};

  const isMyTurn = localPartida?.turno_actual === currentUser.uid;
  const isPhaseCombat = localPartida?.estado === 'en_curso';

  // Automatic Resolution of Pending Enemy Shots against my private fleet
  useEffect(() => {
    if (!firestore || !isPhaseCombat || !localPartida?.pending_shot) return;

    const pendingShot = localPartida.pending_shot;
    // Only resolve if the shot was fired by my rival at me
    if (pendingShot.shooter_uid !== currentUser.uid) {
      const shotCoord = pendingShot.coord;
      const isHit = !!placedShips[shotCoord];
      const result = isHit ? 'tocado' : 'agua';

      const shooterShotsKey = isP1 ? 'p2_disparos' : 'p1_disparos';
      const currentShooterShots = localPartida[shooterShotsKey] || {};
      const updatedShooterShots = { ...currentShooterShots, [shotCoord]: result };

      // Count my remaining unhit ship tiles
      const totalMyShipTiles = Object.keys(placedShips).length;
      let totalHitsOnMe = 0;
      Object.keys(placedShips).forEach(k => {
        if (updatedShooterShots[k] === 'tocado') {
          totalHitsOnMe++;
        }
      });

      const isDefeated = totalMyShipTiles > 0 && totalHitsOnMe >= totalMyShipTiles;

      updateDoc(doc(firestore, "partidas", partidaId), {
        [shooterShotsKey]: updatedShooterShots,
        turno_actual: currentUser.uid, // turn passes to me
        pending_shot: null,
        estado: isDefeated ? 'finalizada' : 'en_curso',
        ganador_uid: isDefeated ? pendingShot.shooter_uid : null,
        ultima_actualizacion: serverTimestamp()
      }).catch(err => console.error("Error resolving pending shot:", err));
    }
  }, [localPartida?.pending_shot, placedShips, isPhaseCombat, currentUser.uid]);

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

  // Confirm fleet placement to Private Firestore Subcollection
  const handleConfirmPlacement = async () => {
    if (!placementReady || !firestore) return;

    // Save fleet privately so rival CANNOT read it
    await setDoc(doc(firestore, "partidas", partidaId, "privado", currentUser.uid), {
      flota: placedShips,
      actualizado_en: serverTimestamp()
    });

    const otherReady = isP1 ? localPartida?.p2_ready : localPartida?.p1_ready;
    const updatePayload: any = {
      [`${isP1 ? 'p1' : 'p2'}_ready`]: true,
      ultima_actualizacion: serverTimestamp()
    };

    if (otherReady) {
      updatePayload.estado = 'en_curso';
    }

    await updateDoc(doc(firestore, "partidas", partidaId), updatePayload);
  };

  // Combat Shot Handler (sends pending shot coordinate)
  const handleFireShot = async (r: number, c: number) => {
    if (!isMyTurn || !isPhaseCombat || localPartida?.estado === 'finalizada' || localPartida?.pending_shot) return;

    const key = `${r},${c}`;
    if (myShots[key]) return; // already shot here

    if (firestore) {
      await updateDoc(doc(firestore, "partidas", partidaId), {
        pending_shot: {
          shooter_uid: currentUser.uid,
          coord: key
        },
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
        <div className="bg-slate-900 p-5 rounded-[32px] border-2 border-slate-800 shadow-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-extrabold text-sm text-cyan-300 flex items-center gap-2">
              <Crosshair size={16} className="text-rose-400 animate-spin" />
              <span>Mapa Náutico de Ataque (Rival)</span>
            </h3>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 font-extrabold px-2.5 py-1 rounded-full border border-rose-500/30 uppercase tracking-wider">
              Disparos: {Object.keys(myShots).length}
            </span>
          </div>

          {/* Grid with A-J and 1-10 labels */}
          <div className="flex flex-col gap-1">
            {/* Column Labels A-J */}
            <div className="grid grid-cols-11 gap-1 text-center font-mono text-[10px] font-bold text-cyan-500/80">
              <div />
              {['A','B','C','D','E','F','G','H','I','J'].map(col => (
                <div key={col}>{col}</div>
              ))}
            </div>

            {/* 10 Rows */}
            {Array(10).fill(null).map((_, r) => (
              <div key={r} className="grid grid-cols-11 gap-1 items-center">
                {/* Row Label 1-10 */}
                <div className="font-mono text-[10px] font-bold text-cyan-500/80 text-center">
                  {r + 1}
                </div>

                {Array(10).fill(null).map((_, c) => {
                  const key = `${r},${c}`;
                  const shotState = myShots[key];

                  return (
                    <button
                      key={key}
                      onClick={() => handleFireShot(r, c)}
                      disabled={!isMyTurn || !isPhaseCombat}
                      className={`aspect-square rounded-md text-xs font-black flex items-center justify-center transition-all relative overflow-hidden ${
                        shotState === 'tocado'
                          ? 'bg-rose-950/80 border border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                          : shotState === 'agua'
                          ? 'bg-cyan-950/80 border border-cyan-800/60'
                          : 'bg-slate-950/70 hover:bg-cyan-950/90 border border-cyan-900/40 hover:border-cyan-400/60 cursor-pointer'
                      }`}
                    >
                      {shotState === 'tocado' ? (
                        <ExplosionEffect className="w-5 h-5" />
                      ) : shotState === 'agua' ? (
                        <SplashEffect className="w-4 h-4" />
                      ) : (
                        <div className="w-1 h-1 rounded-full bg-cyan-500/20" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Own Fleet Board */}
        <div className="bg-slate-900 p-5 rounded-[32px] border-2 border-slate-800 shadow-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-extrabold text-sm text-cyan-300 flex items-center gap-2">
              <Anchor size={16} className="text-cyan-400" />
              <span>Tu Flota y Radar de Defensa</span>
            </h3>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-extrabold px-2.5 py-1 rounded-full border border-cyan-500/30 uppercase tracking-wider">
              {placementReady ? 'Estatus: Desplegado' : 'En Posicionamiento'}
            </span>
          </div>

          {/* Grid with A-J and 1-10 labels */}
          <div className="flex flex-col gap-1">
            {/* Column Labels A-J */}
            <div className="grid grid-cols-11 gap-1 text-center font-mono text-[10px] font-bold text-cyan-500/80">
              <div />
              {['A','B','C','D','E','F','G','H','I','J'].map(col => (
                <div key={col}>{col}</div>
              ))}
            </div>

            {/* 10 Rows */}
            {Array(10).fill(null).map((_, r) => (
              <div key={r} className="grid grid-cols-11 gap-1 items-center">
                {/* Row Label 1-10 */}
                <div className="font-mono text-[10px] font-bold text-cyan-500/80 text-center">
                  {r + 1}
                </div>

                {Array(10).fill(null).map((_, c) => {
                  const key = `${r},${c}`;
                  const hasShip = !!placedShips[key];
                  const receivedShot = enemyShotsReceived[key];

                  return (
                    <button
                      key={key}
                      onClick={() => handleCellClickPlacement(r, c)}
                      disabled={isPhaseCombat}
                      className={`aspect-square rounded-md text-xs font-black flex items-center justify-center transition-all relative overflow-hidden ${
                        receivedShot === 'tocado'
                          ? 'bg-rose-950/90 border border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                          : receivedShot === 'agua'
                          ? 'bg-cyan-950/90 border border-cyan-800/60'
                          : hasShip
                          ? 'bg-indigo-900/90 border border-indigo-400/80 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                          : 'bg-slate-950/70 border border-cyan-900/30 hover:bg-slate-800 cursor-pointer'
                      }`}
                    >
                      {receivedShot === 'tocado' ? (
                        <ExplosionEffect className="w-5 h-5" />
                      ) : receivedShot === 'agua' ? (
                        <SplashEffect className="w-4 h-4" />
                      ) : hasShip ? (
                        <div className="w-2.5 h-2.5 rounded-sm bg-cyan-300 border border-white shadow-xs" />
                      ) : (
                        <div className="w-1 h-1 rounded-full bg-cyan-500/20" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
