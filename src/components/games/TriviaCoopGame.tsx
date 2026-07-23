import React, { useState, useEffect, useRef } from 'react';
import { Usuario } from '../../types';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { triviaQuestions } from '../../data/triviaQuestions';
import { Trophy, ArrowLeft, Heart, Clock, Sparkles, Users, CheckCircle2, XCircle, ShieldAlert, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TriviaCoopGameProps {
  partidaId: string;
  currentUser: Usuario;
  usuarios: Usuario[];
  partidaData: any;
  onExit: () => void;
  onAwardPoints: (points: number) => void;
}

export default function TriviaCoopGame({
  partidaId,
  currentUser,
  usuarios,
  partidaData,
  onExit,
  onAwardPoints
}: TriviaCoopGameProps) {
  const [localPartida, setLocalPartida] = useState<any>(partidaData);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [pointsAwarded, setPointsAwarded] = useState<boolean>(false);

  const players: string[] = localPartida?.jugadores || [];
  const isHost = players[0] === currentUser.uid;

  // Real-time Firestore Sync
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

  // Current state values
  const currentQIndex = localPartida?.pregunta_actual || 0;
  const currentQuestion = triviaQuestions[currentQIndex % triviaQuestions.length];
  const vidasRestantes = localPartida?.vidas_restantes ?? 3;
  const respuestasCorrectas = localPartida?.respuestas_correctas ?? 0;
  const puntosEquipo = localPartida?.puntos_equipo ?? 0;
  const estado = localPartida?.estado || 'en_curso';
  const ultimaRespuesta = localPartida?.ultima_respuesta;

  const TARGET_CORRECT = 8;
  const MAX_QUESTIONS = 10;
  const QUESTION_TIMER_SEC = 20;

  // Shared Countdown Timer
  useEffect(() => {
    if (estado !== 'en_curso') return;

    const inicioTs = localPartida?.pregunta_inicio_ts || Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - inicioTs) / 1000);
      const remaining = Math.max(0, QUESTION_TIMER_SEC - elapsed);
      setTimeLeft(remaining);

      // If timer hits 0 and isHost, register timeout and advance
      if (remaining <= 0 && isHost) {
        handleTimeout();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [localPartida?.pregunta_inicio_ts, estado, isHost, currentQIndex]);

  // Handle Timeout when timer reaches 0
  const handleTimeout = async () => {
    if (!firestore || estado !== 'en_curso') return;

    const newVidas = vidasRestantes - 1;
    const nextIndex = currentQIndex + 1;
    const isGameOver = newVidas <= 0;
    const isWin = respuestasCorrectas >= TARGET_CORRECT;

    await updateDoc(doc(firestore, "partidas", partidaId), {
      vidas_restantes: Math.max(0, newVidas),
      pregunta_actual: nextIndex,
      pregunta_inicio_ts: Date.now(),
      estado: isGameOver ? 'derrota' : (isWin ? 'victoria' : 'en_curso'),
      ultima_respuesta: {
        usuario_nombre: 'Reloj de Tiempo',
        es_correcta: false,
        opcion_texto: 'Tiempo Agotado ⏱️'
      },
      ultima_actualizacion: serverTimestamp()
    });
  };

  // User submits an answer
  const handleAnswerQuestion = async (optionIdx: number) => {
    if (!firestore || estado !== 'en_curso') return;

    const isCorrect = optionIdx === currentQuestion.correctIndex;
    const optText = currentQuestion.options[optionIdx];

    const newCorrectCount = isCorrect ? respuestasCorrectas + 1 : respuestasCorrectas;
    const newPoints = isCorrect ? puntosEquipo + 15 : puntosEquipo;
    const newVidas = isCorrect ? vidasRestantes : vidasRestantes - 1;

    const isWin = newCorrectCount >= TARGET_CORRECT;
    const isGameOver = newVidas <= 0 || (currentQIndex + 1 >= MAX_QUESTIONS && !isWin);

    const nextState = isWin ? 'victoria' : (isGameOver ? 'derrota' : 'en_curso');

    await updateDoc(doc(firestore, "partidas", partidaId), {
      respuestas_correctas: newCorrectCount,
      puntos_equipo: newPoints,
      vidas_restantes: Math.max(0, newVidas),
      pregunta_actual: currentQIndex + 1,
      pregunta_inicio_ts: Date.now(),
      estado: nextState,
      ultima_respuesta: {
        usuario_nombre: currentUser.nombre,
        es_correcta: isCorrect,
        opcion_texto: optText
      },
      ultima_actualizacion: serverTimestamp()
    });
  };

  // Handle Victory Points & Celebration
  useEffect(() => {
    if (estado === 'victoria' && !pointsAwarded) {
      setPointsAwarded(true);
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
      onAwardPoints(120);
    }
  }, [estado, pointsAwarded, onAwardPoints]);

  const familyName = usuarios.find(u => u.uid === currentUser.uid)?.familia_id ? 'Nuestra Familia' : 'Equipo Familiar';

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 font-sans animate-fade-in pb-12">
      {/* Top Navigation */}
      <div className="bg-white rounded-3xl p-5 border border-indigo-50 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-left">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
              <Users size={12} className="text-emerald-600" /> Trivia Cooperativa Familiar
            </span>
            <h2 className="font-sans text-xl font-extrabold text-gray-900 tracking-tight">
              Todos Unidos contra el Desafío
            </h2>
          </div>
        </div>

        {/* Family Score & Lives */}
        <div className="flex items-center gap-3">
          {/* Shared Lives */}
          <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-2xl">
            <span className="text-xs font-black text-rose-800 mr-1">Vidas:</span>
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                size={16}
                className={i < vidasRestantes ? "fill-rose-500 text-rose-500" : "text-gray-300"}
              />
            ))}
          </div>

          {/* Shared Target Counter */}
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-2xl text-xs font-black text-emerald-900 flex items-center gap-1.5">
            <Trophy size={16} className="text-emerald-600" />
            <span>{respuestasCorrectas} / {TARGET_CORRECT} Aciertos</span>
          </div>
        </div>
      </div>

      {/* Main Game Card */}
      {estado === 'en_curso' && (
        <div className="bg-white rounded-[32px] p-6 border border-indigo-100 shadow-xl space-y-6 text-left relative overflow-hidden">
          
          {/* Header Bar: Connected Members + Countdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                Pregunta {currentQIndex + 1} de {MAX_QUESTIONS}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <Users size={14} className="text-indigo-600" />
                <span className="text-xs font-bold text-gray-700">
                  {players.length} Miembros colaborando en vivo
                </span>
              </div>
            </div>

            {/* Timer Ring */}
            <div className={`px-4 py-2 rounded-2xl font-black text-sm flex items-center gap-2 border transition-all ${
              timeLeft <= 5 
                ? 'bg-rose-500 text-white border-rose-600 animate-pulse' 
                : 'bg-indigo-50 text-indigo-950 border-indigo-200'
            }`}>
              <Clock size={16} />
              <span>{timeLeft}s Restantes</span>
            </div>
          </div>

          {/* Last Answer Notification Bubble */}
          {ultimaRespuesta && (
            <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${
              ultimaRespuesta.es_correcta
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {ultimaRespuesta.es_correcta ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <XCircle size={18} className="text-rose-600 shrink-0" />
              )}
              <div>
                <span className="font-extrabold">{ultimaRespuesta.usuario_nombre}:</span>{' '}
                <span>"{ultimaRespuesta.opcion_texto}"</span>{' '}
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full ml-1 bg-white/60">
                  {ultimaRespuesta.es_correcta ? '+15 Pts Colectivos' : 'Racha perdida -1 Vida'}
                </span>
              </div>
            </div>
          )}

          {/* Question Text */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white space-y-2 shadow-inner">
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-extrabold block">
              Desafío Colectivo de Conocimiento Familiar
            </span>
            <h3 className="font-extrabold text-lg md:text-xl leading-snug">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswerQuestion(idx)}
                className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-800 font-bold text-sm transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
              >
                <span>{option}</span>
                <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-600 flex items-center justify-center text-xs font-black transition-all">
                  ➔
                </span>
              </button>
            ))}
          </div>

        </div>
      )}

      {/* VICTORY OVERLAY */}
      {estado === 'victoria' && (
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 border-2 border-emerald-400 rounded-[32px] p-8 text-center text-white space-y-6 shadow-2xl animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-4xl shadow-lg border border-emerald-400/30">
            🏆
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider">
              ¡VICTORIA EN EQUIPO ALCANZADA!
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-white">
              ¡El Equipo {familyName} es Invencible!
            </h3>
            <p className="text-sm text-emerald-200 max-w-md mx-auto leading-relaxed">
              Completaron el desafío respondiendo <strong className="text-white">{respuestasCorrectas} de 10</strong> preguntas correctamente. 
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 max-w-sm mx-auto border border-white/10 flex items-center justify-around">
            <div>
              <span className="text-2xl font-black text-amber-300 block">+{puntosEquipo}</span>
              <span className="text-[10px] text-emerald-200 uppercase font-bold">Puntos Colectivos</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <span className="text-2xl font-black text-emerald-300 block">+120 Pts</span>
              <span className="text-[10px] text-emerald-200 uppercase font-bold">A Cada Integrante</span>
            </div>
          </div>

          <button
            onClick={onExit}
            className="px-8 py-3.5 bg-emerald-400 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition-all cursor-pointer"
          >
            Regresar al Menú de Juegos
          </button>
        </div>
      )}

      {/* DEFEAT OVERLAY */}
      {estado === 'derrota' && (
        <div className="bg-slate-900 border-2 border-rose-500/40 rounded-[32px] p-8 text-center text-white space-y-6 shadow-2xl animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-4xl shadow-lg border border-rose-400/30">
            💔
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white">
              ¡Se Agotaron las Vidas Compartidas!
            </h3>
            <p className="text-xs text-rose-200 max-w-md mx-auto leading-relaxed">
              El equipo logró <strong className="text-white">{respuestasCorrectas} aciertos</strong> antes de quedarse sin vidas. ¡La clave es el trabajo en equipo y la comunicación!
            </p>
          </div>

          <button
            onClick={onExit}
            className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer"
          >
            Volver al Menú
          </button>
        </div>
      )}

    </div>
  );
}
