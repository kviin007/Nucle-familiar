import React, { useState, useEffect } from 'react';
import { Usuario } from '../../types';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Trophy, HelpCircle, ArrowLeft, Eye, EyeOff, UserCheck, X } from 'lucide-react';
import { motion } from 'motion/react';

interface GuessWhoGameProps {
  partidaId: string;
  currentUser: Usuario;
  usuarios: Usuario[];
  partidaData: any;
  onExit: () => void;
  onAwardPoints: (points: number) => void;
}

interface CharacterCard {
  id: string;
  nombre: string;
  avatar_url: string;
  glasses?: boolean;
  longHair?: boolean;
  hat?: boolean;
  smile?: boolean;
  role?: string;
}

const PRESET_EXTRA_CHARACTERS: CharacterCard[] = [
  { id: 'c-abuela', nombre: 'Abuela Sabia', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop', glasses: true, smile: true },
  { id: 'c-tio', nombre: 'Tío Viajero', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop', hat: true, smile: true },
  { id: 'c-primo', nombre: 'Primo Músico', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop', glasses: false, smile: true },
  { id: 'c-sobrina', nombre: 'Sobrina Artista', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop', longHair: true, smile: true },
  { id: 'c-vecino', nombre: 'Don Pepe (Vecino)', avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop', glasses: true, hat: true },
  { id: 'c-gatito', nombre: 'Michi Familiar', avatar_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&h=150&fit=crop', smile: true },
];

const PREDEFINED_QUESTIONS = [
  "¿Tiene lentes o gafas?",
  "¿Tiene el cabello largo?",
  "¿Lleva un sombrero o accesorio?",
  "¿Se está sonriendo ampliamente?",
  "¿Es un integrante oficial del hogar?",
];

export default function GuessWhoGame({ partidaId, currentUser, usuarios, partidaData, onExit, onAwardPoints }: GuessWhoGameProps) {
  const [localPartida, setLocalPartida] = useState<any>(partidaData);
  const [boardCards, setBoardCards] = useState<CharacterCard[]>([]);
  const [eliminatedCards, setEliminatedCards] = useState<string[]>([]);
  const [showSecretCharacter, setShowSecretCharacter] = useState<boolean>(true);
  const [guessingTargetId, setGuessingTargetId] = useState<string | null>(null);

  // Synchronize Firestore partida document in real time
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

  // Construct board of 12-16 cards
  useEffect(() => {
    const familyCards: CharacterCard[] = usuarios.map(u => ({
      id: u.uid,
      nombre: u.nombre,
      avatar_url: u.avatar_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop",
      glasses: false,
      longHair: u.nombre.toLowerCase().includes('a') || u.nombre.toLowerCase().includes('ía'),
      smile: true
    }));

    let combined = [...familyCards];
    let extraIndex = 0;
    while (combined.length < 12 && extraIndex < PRESET_EXTRA_CHARACTERS.length) {
      combined.push(PRESET_EXTRA_CHARACTERS[extraIndex]);
      extraIndex++;
    }

    setBoardCards(combined);
  }, [usuarios]);

  const players = localPartida?.jugadores || [];
  const p1Uid = players[0];
  const p2Uid = players[1];

  const isP1 = currentUser.uid === p1Uid;

  // Secret targets
  const mySecretCardId = isP1 ? localPartida?.p1_secret_id : localPartida?.p2_secret_id;
  const rivalSecretCardId = isP1 ? localPartida?.p2_secret_id : localPartida?.p1_secret_id;

  const mySecretCard = boardCards.find(c => c.id === mySecretCardId);

  const isMyTurn = localPartida?.turno_actual === currentUser.uid;

  // Toggle card elimination
  const toggleEliminate = (cardId: string) => {
    if (eliminatedCards.includes(cardId)) {
      setEliminatedCards(prev => prev.filter(id => id !== cardId));
    } else {
      setEliminatedCards(prev => [...prev, cardId]);
    }
  };

  // Attempt guess
  const handleAttemptGuess = async (card: CharacterCard) => {
    if (!isMyTurn || localPartida?.estado === 'finalizada') return;

    const isCorrect = card.id === rivalSecretCardId;
    let winnerUid = isCorrect ? currentUser.uid : (isP1 ? p2Uid : p1Uid);

    if (isCorrect) {
      onAwardPoints(100);
    }

    if (firestore) {
      await updateDoc(doc(firestore, "partidas", partidaId), {
        estado: 'finalizada',
        ganador_uid: winnerUid,
        intentos_guess: (localPartida?.intentos_guess || 0) + 1,
        ultima_actualizacion: serverTimestamp()
      });
    }
    setGuessingTargetId(null);
  };

  // Pass turn
  const handlePassTurn = async () => {
    if (!isMyTurn) return;
    const nextTurnUid = isP1 ? p2Uid : p1Uid;
    if (firestore) {
      await updateDoc(doc(firestore, "partidas", partidaId), {
        turno_actual: nextTurnUid,
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
              🎭 Adivina Quién Familiar
            </h2>
            <p className="text-xs text-gray-500">¿Podrás adivinar qué integrante tiene asignado tu rival?</p>
          </div>
        </div>

        {/* Turn Status */}
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
              {isMyTurn ? '¡Es TU Turno de Preguntar o Adivinar!' : 'Esperando turno de tu rival...'}
            </span>
          )}
        </div>
      </div>

      {/* Secret Card Tray */}
      <div className="bg-indigo-900 text-white p-4 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={mySecretCard?.avatar_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop"}
              alt="Tu Personaje"
              className={`w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 ${showSecretCharacter ? '' : 'blur-md'}`}
            />
            <button
              onClick={() => setShowSecretCharacter(!showSecretCharacter)}
              className="absolute -bottom-1 -right-1 p-1 bg-amber-400 text-slate-900 rounded-full shadow cursor-pointer"
            >
              {showSecretCharacter ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <div className="text-left">
            <span className="text-[10px] uppercase font-black text-amber-300 tracking-wider block">Tu Personaje Secreto</span>
            <span className="text-sm font-bold">{mySecretCard?.nombre || 'Generando secreto...'}</span>
          </div>
        </div>

        {isMyTurn && localPartida?.estado !== 'finalizada' && (
          <button
            onClick={handlePassTurn}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
          >
            Pasar Turno a Rival ➔
          </button>
        )}
      </div>

      {/* Suggested Questions */}
      <div className="bg-white p-4 rounded-2xl border border-indigo-50 shadow-sm text-left">
        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">Preguntas Sugeridas para hacer a tu rival:</span>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_QUESTIONS.map((q, idx) => (
            <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full font-medium">
              {q}
            </span>
          ))}
        </div>
      </div>

      {/* Character Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {boardCards.map((card) => {
          const isEliminated = eliminatedCards.includes(card.id);

          return (
            <div
              key={card.id}
              className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between relative overflow-hidden shadow-sm ${
                isEliminated ? 'opacity-30 border-slate-200 grayscale scale-95' : 'border-indigo-100 hover:shadow-md'
              }`}
            >
              <div className="relative mb-3">
                <img
                  src={card.avatar_url}
                  alt={card.nombre}
                  className="w-20 h-20 rounded-2xl mx-auto object-cover border border-slate-100"
                />
                {isEliminated && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 rounded-2xl text-rose-500">
                    <X size={36} className="font-extrabold stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="text-center mb-3">
                <span className="text-xs font-bold text-gray-900 block truncate">{card.nombre}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleEliminate(card.id)}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer ${
                    isEliminated ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isEliminated ? 'Restaurar' : 'Tachar'}
                </button>

                {isMyTurn && !isEliminated && localPartida?.estado !== 'finalizada' && (
                  <button
                    onClick={() => handleAttemptGuess(card)}
                    className="flex-1 py-1.5 text-[10px] font-bold rounded-xl bg-brand-primary text-white hover:bg-brand-dark shadow cursor-pointer transition-all active:scale-95"
                  >
                    ¡Adivinar!
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
