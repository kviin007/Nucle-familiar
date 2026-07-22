import React, { useState, useEffect } from 'react';
import { Usuario } from '../../types';
import { doc, updateDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Trophy, ArrowLeft, Eye, EyeOff, UserCheck, X, HelpCircle, MessageSquare, Check, AlertCircle } from 'lucide-react';
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
  const [mySecretCardId, setMySecretCardId] = useState<string | null>(null);

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

  // Synchronize private document for my secret character
  useEffect(() => {
    if (!firestore || !partidaId || !currentUser.uid) return;
    const unsub = onSnapshot(doc(firestore, "partidas", partidaId, "privado", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.secret_id) {
          setMySecretCardId(data.secret_id);
        }
      }
    });
    return () => unsub();
  }, [partidaId, currentUser.uid]);

  // Construct board of 12 cards
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

  // Assign private secret character if not assigned yet
  useEffect(() => {
    if (!mySecretCardId && boardCards.length > 0 && firestore && partidaId && currentUser.uid) {
      const randomCard = boardCards[Math.floor(Math.random() * boardCards.length)];
      setDoc(doc(firestore, "partidas", partidaId, "privado", currentUser.uid), {
        secret_id: randomCard.id,
        actualizado_en: serverTimestamp()
      }).catch(e => console.error("Error setting private secret character:", e));
    }
  }, [mySecretCardId, boardCards, partidaId, currentUser.uid]);

  const players = localPartida?.jugadores || [];
  const p1Uid = players[0];
  const p2Uid = players[1];

  const isP1 = currentUser.uid === p1Uid;
  const rivalUid = isP1 ? p2Uid : p1Uid;

  const mySecretCard = boardCards.find(c => c.id === mySecretCardId);
  const isMyTurn = localPartida?.turno_actual === currentUser.uid;

  const questionHistory: any[] = localPartida?.historial_preguntas || [];
  const pendingQuestion = questionHistory.find((q: any) => q.respuesta === null && q.jugador_uid !== currentUser.uid);

  // Auto-verify pending guess against my secret card when rival guesses
  useEffect(() => {
    if (!firestore || !localPartida?.pending_guess || !mySecretCardId) return;

    const pendingGuess = localPartida.pending_guess;
    if (pendingGuess.guesser_uid !== currentUser.uid) {
      const isCorrect = pendingGuess.target_card_id === mySecretCardId;
      const winnerUid = isCorrect ? pendingGuess.guesser_uid : currentUser.uid;

      updateDoc(doc(firestore, "partidas", partidaId), {
        estado: 'finalizada',
        ganador_uid: winnerUid,
        pending_guess: null,
        ultima_actualizacion: serverTimestamp()
      }).catch(e => console.error("Error resolving pending guess:", e));
    }
  }, [localPartida?.pending_guess, mySecretCardId, currentUser.uid, partidaId]);

  // Toggle card elimination
  const toggleEliminate = (cardId: string) => {
    if (eliminatedCards.includes(cardId)) {
      setEliminatedCards(prev => prev.filter(id => id !== cardId));
    } else {
      setEliminatedCards(prev => [...prev, cardId]);
    }
  };

  // Ask predefined question
  const handleAskQuestion = async (qText: string) => {
    if (!isMyTurn || localPartida?.estado === 'finalizada' || pendingQuestion) return;

    const newQuestionItem = {
      id: Date.now().toString(),
      jugador_uid: currentUser.uid,
      jugador_nombre: currentUser.nombre,
      pregunta: qText,
      respuesta: null
    };

    if (firestore) {
      await updateDoc(doc(firestore, "partidas", partidaId), {
        historial_preguntas: [...questionHistory, newQuestionItem],
        ultima_actualizacion: serverTimestamp()
      });
    }
  };

  // Answer rival's question (Yes / No)
  const handleAnswerQuestion = async (qId: string, answer: 'Sí' | 'No') => {
    if (!firestore || localPartida?.estado === 'finalizada') return;

    const updatedHistory = questionHistory.map((q: any) => {
      if (q.id === qId) {
        return { ...q, respuesta: answer };
      }
      return q;
    });

    const nextTurnUid = isP1 ? p2Uid : p1Uid;

    await updateDoc(doc(firestore, "partidas", partidaId), {
      historial_preguntas: updatedHistory,
      turno_actual: nextTurnUid, // Pass turn to rival after answering
      ultima_actualizacion: serverTimestamp()
    });
  };

  // Attempt guess
  const handleAttemptGuess = async (card: CharacterCard) => {
    if (!isMyTurn || localPartida?.estado === 'finalizada' || localPartida?.pending_guess) return;

    if (firestore) {
      await updateDoc(doc(firestore, "partidas", partidaId), {
        pending_guess: {
          guesser_uid: currentUser.uid,
          target_card_id: card.id,
          target_card_nombre: card.nombre
        },
        ultima_actualizacion: serverTimestamp()
      });
    }
  };

  // Pass turn manually
  const handlePassTurn = async () => {
    if (!isMyTurn || localPartida?.estado === 'finalizada') return;
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

      {/* Pending Question Response Card (Shown to rival when a question is asked) */}
      {pendingQuestion && localPartida?.estado !== 'finalizada' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-500 text-slate-950 p-5 rounded-3xl shadow-xl text-left space-y-3 border-2 border-amber-400"
        >
          <div className="flex items-center gap-2 font-black text-sm">
            <MessageSquare size={18} />
            <span>¡Tu rival te hace una pregunta!</span>
          </div>
          <p className="text-xs font-bold text-slate-900 leading-relaxed">
            "{pendingQuestion.pregunta}"
          </p>
          <p className="text-[11px] text-slate-800 font-semibold">
            Revisa tu personaje secreto (<span className="font-extrabold underline">{mySecretCard?.nombre || 'tu personaje'}</span>) y responde a tu rival:
          </p>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => handleAnswerQuestion(pendingQuestion.id, 'Sí')}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Check size={16} />
              ¡SÍ!
            </button>
            <button
              onClick={() => handleAnswerQuestion(pendingQuestion.id, 'No')}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <X size={16} />
              ¡NO!
            </button>
          </div>
        </motion.div>
      )}

      {/* Interactive Question Panel */}
      <div className="bg-white p-5 rounded-3xl border border-indigo-50 shadow-xl text-left space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-extrabold text-gray-800 flex items-center gap-1.5">
            <HelpCircle size={16} className="text-brand-primary" />
            Hacer Pregunta a tu Rival (Haz clic para preguntar):
          </span>
          {!isMyTurn && (
            <span className="text-[10px] font-bold text-gray-400 italic">Espera tu turno para preguntar</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {PREDEFINED_QUESTIONS.map((qText, idx) => (
            <button
              key={idx}
              onClick={() => handleAskQuestion(qText)}
              disabled={!isMyTurn || localPartida?.estado === 'finalizada' || !!pendingQuestion}
              className={`text-xs px-3.5 py-2 rounded-2xl font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                isMyTurn && !pendingQuestion && localPartida?.estado !== 'finalizada'
                  ? 'bg-brand-light hover:bg-brand-primary hover:text-white text-brand-dark cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <MessageSquare size={13} />
              <span>{qText}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Questions & Answers History Log */}
      {questionHistory.length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-indigo-50 shadow-xl text-left space-y-3">
          <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="text-indigo-600" size={16} />
            Historial de Preguntas y Respuestas ({questionHistory.length}):
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {questionHistory.slice().reverse().map((item: any) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-extrabold text-gray-900 block">{item.jugador_nombre} preguntó:</span>
                  <span className="text-gray-700 italic">"{item.pregunta}"</span>
                </div>
                <div className="shrink-0">
                  {item.respuesta ? (
                    <span className={`px-3 py-1 rounded-xl font-extrabold text-xs shadow-sm ${
                      item.respuesta === 'Sí' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      Respuesta: {item.respuesta.toUpperCase()}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-xl font-bold text-[10px] animate-pulse">
                      Esperando respuesta...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
