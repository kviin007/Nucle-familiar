import React, { useState, useEffect } from 'react';
import { Usuario } from '../../types';
import { 
  collection, 
  addDoc, 
  setDoc,
  onSnapshot, 
  query, 
  where, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { firestore, isFirebaseEnabled } from '../../lib/firebase';
import { Users, Plus, ArrowLeft, Play, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';

interface GameLobbyProps {
  gameType: 'chess' | 'guesswho' | 'bingo' | 'battleship';
  gameTitle: string;
  maxPlayers: number;
  currentUser: Usuario;
  usuarios: Usuario[];
  onStartGame: (partidaId: string, partidaData: any) => void;
  onBack: () => void;
}

export default function GameLobby({ 
  gameType, 
  gameTitle, 
  maxPlayers, 
  currentUser, 
  usuarios, 
  onStartGame, 
  onBack 
}: GameLobbyProps) {
  const [activePartidas, setActivePartidas] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [invitedMembers, setInvitedMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState<boolean>(false);
  const [indexErrorUrl, setIndexErrorUrl] = useState<string | null>(null);

  const familyMembers = usuarios.filter(u => u.familia_id === currentUser.familia_id && u.uid !== currentUser.uid);

  // Fetch active partidas for this family and gameType
  useEffect(() => {
    if (!firestore || !isFirebaseEnabled || !currentUser.familia_id) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, "partidas"),
      where("familia_id", "==", currentUser.familia_id),
      where("game_type", "==", gameType)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setActivePartidas(list);
      setLoading(false);
      setIndexErrorUrl(null);
    }, (err: any) => {
      console.error("Error fetching partidas lobby:", err);
      setLoading(false);
      if (err?.message) {
        const urlMatch = err.message.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          setIndexErrorUrl(urlMatch[0]);
        }
      }
    });

    return () => unsub();
  }, [gameType, currentUser.familia_id]);

  // Toggle member invite
  const toggleInviteMember = (uid: string) => {
    if (invitedMembers.includes(uid)) {
      setInvitedMembers(prev => prev.filter(id => id !== uid));
    } else {
      if (invitedMembers.length + 1 >= maxPlayers) return; // limit reached
      setInvitedMembers(prev => [...prev, uid]);
    }
  };

  // Create game
  const handleCreateGame = async () => {
    if (!firestore || !isFirebaseEnabled || creating) return;
    setCreating(true);

    try {
      const players = [currentUser.uid, ...invitedMembers];

      // Pick secret IDs if Guess Who
      let p1_secret = null;
      let p2_secret = null;
      if (gameType === 'guesswho') {
        const uList = usuarios.length >= 2 ? usuarios : [...usuarios, ...familyMembers];
        p1_secret = uList[Math.floor(Math.random() * uList.length)]?.uid || currentUser.uid;
        p2_secret = uList[Math.floor(Math.random() * uList.length)]?.uid || (invitedMembers[0] || currentUser.uid);
      }

      const docRef = await addDoc(collection(firestore, "partidas"), {
        game_type: gameType,
        familia_id: currentUser.familia_id,
        creador_uid: currentUser.uid,
        jugadores: players,
        turno_actual: currentUser.uid,
        estado: players.length >= maxPlayers ? 'en_curso' : 'sala_espera',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Chess initial
        numeros_cantados: [],
        creado_en: serverTimestamp(),
        ultima_actualizacion: serverTimestamp()
      });

      // Save secret character to private subcollections for player security
      if (gameType === 'guesswho' && p1_secret) {
        await setDoc(doc(firestore, "partidas", docRef.id, "privado", currentUser.uid), {
          secret_id: p1_secret
        });
        if (invitedMembers[0] && p2_secret) {
          await setDoc(doc(firestore, "partidas", docRef.id, "privado", invitedMembers[0]), {
            secret_id: p2_secret
          });
        }
      }

      onStartGame(docRef.id, {
        game_type: gameType,
        familia_id: currentUser.familia_id,
        creador_uid: currentUser.uid,
        jugadores: players,
        turno_actual: currentUser.uid,
        estado: players.length >= maxPlayers ? 'en_curso' : 'sala_espera',
        numeros_cantados: []
      });
    } catch (e) {
      console.error("Error creating game:", e);
    } finally {
      setCreating(false);
    }
  };

  // Join existing game
  const handleJoinGame = async (partida: any) => {
    if (!firestore) return;

    const currentPlayers: string[] = partida.jugadores || [];
    if (!currentPlayers.includes(currentUser.uid)) {
      if (currentPlayers.length >= maxPlayers) {
        alert("Esta sala ya está llena.");
        return;
      }
      const newPlayers = [...currentPlayers, currentUser.uid];
      await updateDoc(doc(firestore, "partidas", partida.id), {
        jugadores: newPlayers,
        estado: 'en_curso',
        ultima_actualizacion: serverTimestamp()
      });
      partida.jugadores = newPlayers;
      partida.estado = 'en_curso';
    }

    onStartGame(partida.id, partida);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 font-sans animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-indigo-50 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-left">
            <h2 className="font-extrabold text-xl text-gray-900">{gameTitle}</h2>
            <p className="text-xs text-gray-500">Sala de espera multijugador</p>
          </div>
        </div>

        <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-brand-primary text-xs font-black uppercase">
          Hasta {maxPlayers} Jugadores
        </span>
      </div>

      {/* Create New Match Block */}
      <div className="bg-white rounded-3xl p-6 border border-indigo-50 shadow-xl space-y-5 text-left">
        <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
          <Plus className="text-brand-primary" size={20} />
          Crear Nueva Partida e Invitar
        </h3>

        <div className="space-y-3">
          <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider block">
            Selecciona los integrantes a invitar de tu núcleo:
          </label>

          {familyMembers.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No hay otros integrantes registrados en tu familia aún.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {familyMembers.map(member => {
                const isSelected = invitedMembers.includes(member.uid);

                return (
                  <button
                    key={member.uid}
                    onClick={() => toggleInviteMember(member.uid)}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-primary bg-brand-light/30 shadow-sm'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={member.avatar_url}
                        alt={member.nombre}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <span className="text-xs font-bold text-gray-800">{member.nombre}</span>
                    </div>

                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isSelected ? 'bg-brand-primary text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isSelected ? '✓' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={handleCreateGame}
          disabled={creating}
          className="w-full py-3.5 bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play size={16} />
          {creating ? 'Creando Sala...' : 'Crear Sala y Entrar'}
        </button>
      </div>

      {/* Firebase Disabled Notice */}
      {!isFirebaseEnabled && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-5 text-left space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm">
            <AlertTriangle className="text-rose-600 shrink-0" size={20} />
            <span>Firebase No Configurado</span>
          </div>
          <p className="text-xs text-rose-900/90 leading-relaxed font-medium">
            Los juegos multijugador requieren que configures Firebase en las variables de entorno (<code className="bg-rose-100 font-mono px-1 rounded font-bold text-rose-950">VITE_FIREBASE_*</code>). Sin estas credenciales no se pueden crear salas ni sincronizar movimientos.
          </p>
        </div>
      )}

      {/* Index Creation Link Banner */}
      {indexErrorUrl && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 text-left space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
            <AlertTriangle className="text-amber-600 shrink-0" size={18} />
            <span>Se requiere un Índice Compuesto en Firestore</span>
          </div>
          <p className="text-xs text-amber-900/90 leading-relaxed">
            Firestore necesita un índice compuesto para consultar la colección <code className="font-mono bg-amber-100 px-1 rounded font-bold">partidas</code> por <code className="font-mono bg-amber-100 px-1 rounded font-bold">familia_id</code> y <code className="font-mono bg-amber-100 px-1 rounded font-bold">game_type</code>.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <a
              href={indexErrorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer"
            >
              <ExternalLink size={14} />
              Crear Índice Automático en Console
            </a>
            <span className="text-[10px] text-amber-800 font-mono">
              O usa: <code className="bg-amber-100 px-1 font-bold">firebase deploy --only firestore:indexes</code>
            </span>
          </div>
        </div>
      )}

      {/* Active Open Rooms */}
      <div className="bg-white rounded-3xl p-6 border border-indigo-50 shadow-xl space-y-4 text-left">
        <div className="flex justify-between items-center">
          <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
            <Users className="text-indigo-600" size={20} />
            Partidas Activas en tu Familia
          </h3>
          <RefreshCw size={14} className="text-gray-400 animate-spin" />
        </div>

        {!isFirebaseEnabled ? (
          <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-rose-500 font-bold">
            No se pueden cargar salas activas sin configurar las credenciales de Firebase.
          </div>
        ) : loading ? (
          <div className="py-8 text-center text-xs text-gray-400 font-bold">Cargando salas activas...</div>
        ) : activePartidas.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-gray-400">
            No hay salas activas creadas para este juego actualmente. ¡Crea la primera arriba!
          </div>
        ) : (
          <div className="space-y-3">
            {activePartidas.map(partida => {
              const host = usuarios.find(u => u.uid === partida.creador_uid) || { nombre: 'Miembro', avatar_url: '' };
              const isJoined = (partida.jugadores || []).includes(currentUser.uid);

              return (
                <div
                  key={partida.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={host.avatar_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&h=150&fit=crop"}
                      alt={host.nombre}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <span className="text-xs font-extrabold text-gray-900 block">Sala de {host.nombre}</span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {(partida.jugadores || []).length} / {maxPlayers} Jugadores • Estado: {partida.estado}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoinGame(partida)}
                    className="px-4 py-2 bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-xs rounded-xl shadow transition-all active:scale-95 cursor-pointer"
                  >
                    {isJoined ? 'Continuar' : 'Unirse'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
