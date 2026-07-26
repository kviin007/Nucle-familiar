import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Sparkles, Smile, Bot, User, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { Usuario } from '../../types';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { firestore, isFirebaseEnabled } from '../../lib/firebase';

export interface ChatMessage {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  avatar_url?: string;
  texto: string;
  timestamp: number;
  es_sistema?: boolean;
  es_ia?: boolean;
}

interface InGameChatProps {
  partidaId?: string;
  currentUser: Usuario | null;
  opponentName?: string;
  isVsAi?: boolean;
  gameTitle?: string;
  onSendSystemMessage?: (msg: string) => void;
}

const QUICK_EMOJIS = ['👍', '🔥', '🎯', '👏', '💥', '👑', '🤖', '🏆', '💬', '⚡', '😂', '🎲'];

const QUICK_PHRASES = [
  '¡Buena jugada! 👏',
  '¡Tu turno! 🎲',
  '¡Suerte en esta! 🍀',
  '¡Casi me ganas! 💥',
  '¡Excelente movimiento! 🎯',
  '¡Gracias por la partida! 🏆',
  '¡Esa estuvo muy cerca! 🔥'
];

const AI_GAME_RESPONSES = [
  '¡Buen intento! Pero la Inteligencia Artificial analiza cada ángulo. 🤖',
  '¡Interesante movimiento! Estoy calculando mi respuesta... ⚡',
  '¡Bien jugado! Esta partida está muy reñida. 🔥',
  '¡Me estás haciendo pensar mucho! 🎯',
  '¡Jaja! ¡Que gane el mejor estratega! 👑',
  '¡Excelente! A ver qué opinas de mi siguiente jugada... ♟️',
  '¡Increíble jugada! Tienes grandes habilidades. 🏆'
];

export default function InGameChat({
  partidaId,
  currentUser,
  opponentName = 'Rival',
  isVsAi = false,
  gameTitle = 'Partida',
}: InGameChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Web Audio Pop Sound
  const playPopSound = (type: 'send' | 'receive') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      
      if (type === 'send') {
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      } else {
        osc.frequency.setValueAtTime(780, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);
      }

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // AudioContext not allowed or not supported
    }
  };

  // Initial welcome message
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: 'welcome_1',
      usuario_id: 'system',
      usuario_nombre: 'Chat Plato de Partida',
      texto: `¡Bienvenidos a la sala de chat de ${gameTitle}! 🎮 Escribe un mensaje o envía una reacción.`,
      timestamp: Date.now(),
      es_sistema: true
    };
    setMessages([welcomeMsg]);
  }, [gameTitle]);

  // Sync with Firestore if partidaId exists
  useEffect(() => {
    if (!partidaId || !firestore || !isFirebaseEnabled) return;

    try {
      const q = query(
        collection(firestore, 'partidas', partidaId, 'mensajes_chat'),
        orderBy('timestamp', 'asc'),
        limit(50)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const loadedMsgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          loadedMsgs.push({
            id: docSnap.id,
            usuario_id: d.usuario_id,
            usuario_nombre: d.usuario_nombre,
            avatar_url: d.avatar_url,
            texto: d.texto,
            timestamp: d.timestamp?.toMillis ? d.timestamp.toMillis() : (d.timestamp || Date.now()),
            es_sistema: d.es_sistema,
            es_ia: d.es_ia
          });
        });

        if (loadedMsgs.length > 0) {
          setMessages(loadedMsgs);
          if (!isOpen) {
            setUnreadCount(prev => prev + 1);
            playPopSound('receive');
          }
        }
      }, (err) => {
        console.warn("Error listening to in-game chat:", err);
      });

      return () => unsub();
    } catch (err) {
      console.warn("Firestore chat error:", err);
    }
  }, [partidaId, isOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Reset unread count when opening chat
  const toggleChat = () => {
    if (!isOpen) {
      setUnreadCount(0);
    }
    setIsOpen(!isOpen);
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !currentUser) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      usuario_id: currentUser.uid,
      usuario_nombre: currentUser.nombre,
      avatar_url: currentUser.avatar_url,
      texto: text,
      timestamp: Date.now()
    };

    // If Firestore is available and partidaId exists, save to subcollection
    if (partidaId && firestore && isFirebaseEnabled) {
      try {
        await addDoc(collection(firestore, 'partidas', partidaId, 'mensajes_chat'), {
          usuario_id: currentUser.uid,
          usuario_nombre: currentUser.nombre,
          avatar_url: currentUser.avatar_url || '',
          texto: text,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.warn("Error saving msg to Firestore:", err);
      }
    } else {
      // Local fallback
      setMessages(prev => [...prev, newMsg]);
    }

    setInputText('');
    playPopSound('send');

    // If vs AI, simulate AI witty response after 1.2s
    if (isVsAi) {
      setTimeout(() => {
        const randomAiText = AI_GAME_RESPONSES[Math.floor(Math.random() * AI_GAME_RESPONSES.length)];
        const aiMsg: ChatMessage = {
          id: `msg_ai_${Date.now()}`,
          usuario_id: 'ai_bot',
          usuario_nombre: opponentName || 'Rival IA 🤖',
          texto: randomAiText,
          timestamp: Date.now(),
          es_ia: true
        };
        setMessages(prev => [...prev, aiMsg]);
        playPopSound('receive');
        if (!isOpen) setUnreadCount(prev => prev + 1);
      }, 1200);
    }
  };

  return (
    <>
      {/* FLOATING PLATO 3D CHAT TRIGGER BUTTON */}
      <button
        type="button"
        onClick={toggleChat}
        className="relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-3.5 py-2.5 rounded-2xl border-b-4 border-indigo-900 shadow-[0_5px_0_#312e81] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 font-black text-xs cursor-pointer z-40 select-none group"
        title="Abrir Chat Interservidor Plato"
      >
        <div className="relative">
          <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-md border border-white">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="hidden sm:inline uppercase tracking-wider">Chat Plato</span>
      </button>

      {/* PLATO IN-GAME CHAT DRAWER OVERLAY */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 right-4 z-50 w-[92vw] sm:w-[380px] h-[520px] max-h-[85vh] bg-slate-950/95 border-2 border-indigo-500/40 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col overflow-hidden font-sans select-none"
          >
            {/* Header */}
            <div className="p-3.5 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-indigo-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md font-black">
                  💬
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    Chat Plato en Vivo
                    <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/40 font-extrabold animate-pulse">
                      EN LÍNEA
                    </span>
                  </h4>
                  <p className="text-[10px] text-indigo-300 font-semibold truncate max-w-[180px]">
                    {isVsAi ? `Jugando contra ${opponentName}` : `Partida: ${gameTitle}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
                  title={soundEnabled ? 'Silenciar sonidos del chat' : 'Activar sonidos'}
                >
                  {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>

                <button
                  type="button"
                  onClick={toggleChat}
                  className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Quick Emoji Reaction Ribbon */}
            <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest shrink-0 mr-1">
                Reaccionar:
              </span>
              {QUICK_EMOJIS.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(emoji)}
                  className="px-2 py-1 bg-slate-800/80 hover:bg-indigo-600 text-sm rounded-xl border border-slate-700 transition-all active:scale-90 cursor-pointer shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Message History Area */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-950/60">
              {messages.map((msg) => {
                const isMe = msg.usuario_id === currentUser?.uid;
                const isSys = msg.es_sistema;
                const isAi = msg.es_ia;

                if (isSys) {
                  return (
                    <div key={msg.id} className="text-center my-1">
                      <span className="bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-[10px] font-bold px-3 py-1 rounded-full inline-block shadow-xs">
                        {msg.texto}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center text-xs font-bold text-white">
                      {isAi ? (
                        <Bot size={16} className="text-purple-400" />
                      ) : msg.avatar_url ? (
                        <img src={msg.avatar_url} alt={msg.usuario_nombre} className="w-full h-full object-cover" />
                      ) : (
                        <User size={14} className="text-indigo-300" />
                      )}
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs shadow-md ${
                      isMe 
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-xs border border-indigo-400/30' 
                        : isAi 
                          ? 'bg-purple-950/90 border border-purple-700/60 text-purple-100 rounded-bl-xs' 
                          : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-xs'
                    }`}>
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-[9px] font-extrabold uppercase ${isMe ? 'text-indigo-200' : isAi ? 'text-purple-300' : 'text-indigo-400'}`}>
                          {msg.usuario_nombre}
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="font-medium leading-relaxed whitespace-pre-wrap break-words">
                        {msg.texto}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Preset Phrase Suggestions */}
            <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {QUICK_PHRASES.map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(phrase)}
                  className="px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-200 text-[10px] font-bold rounded-xl border border-indigo-800/50 transition-all shrink-0 cursor-pointer active:scale-95"
                >
                  {phrase}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe un mensaje en el juego..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-9 h-9 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white flex items-center justify-center shadow-md border-b-2 border-indigo-900 transition-all cursor-pointer active:scale-90"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
