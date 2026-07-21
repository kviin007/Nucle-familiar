import React, { useState } from 'react';
import { DiarioEntrada, Usuario } from '../types';

interface DiarioScreenProps {
  diario: DiarioEntrada[];
  usuarios: Usuario[];
  onAddEntry: (texto: string, emocion: DiarioEntrada['emocion'], visible_familia: boolean) => void;
}

export default function DiarioScreen({ diario, usuarios, onAddEntry }: DiarioScreenProps) {
  const [mood, setMood] = useState<DiarioEntrada['emocion']>('Great');
  const [text, setText] = useState<string>('');
  const [visible, setVisible] = useState<boolean>(true);
  const [recording, setRecording] = useState<boolean>(false);

  const moods: { label: string; icon: string; value: DiarioEntrada['emocion']; color: string }[] = [
    { label: 'Triste', icon: '😢', value: 'Sad', color: 'bg-blue-50 text-blue-800' },
    { label: 'Enojado', icon: '😠', value: 'Angry', color: 'bg-red-50 text-red-800' },
    { label: 'Regular', icon: '😐', value: 'Okay', color: 'bg-gray-100 text-gray-800' },
    { label: 'Bien', icon: '🙂', value: 'Good', color: 'bg-emerald-50 text-emerald-800' },
    { label: 'Excelente', icon: '😁', value: 'Great', color: 'bg-amber-50 text-amber-800' },
  ];

  const handleSave = () => {
    if (text.trim()) {
      onAddEntry(text.trim(), mood, visible);
      setText('');
    }
  };

  const toggleRecording = () => {
    setRecording(!recording);
    if (!recording) {
      // Simulate speech-to-text
      setTimeout(() => {
        setText((prev) => (prev ? prev + ' ' : '') + 'Compartimos un gran momento riendo en familia hoy.');
        setRecording(false);
      }, 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Diario</h2>
        <p className="font-sans text-sm text-gray-500">¿Cómo te sientes hoy?</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entry Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Emotion Selector */}
          <div className="bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20">
            <h3 className="font-sans text-sm font-bold text-gray-700 mb-4">Estado de ánimo</h3>
            <div className="flex justify-between items-center px-1">
              {moods.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  className={`flex flex-col items-center gap-1.5 transition-all ${
                    mood === m.value ? 'scale-110' : 'opacity-50 hover:opacity-100'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm ${
                    mood === m.value ? 'border-4 border-brand-primary bg-white ring-2 ring-indigo-100' : 'bg-slate-50 border border-slate-150'
                  }`}>
                    {m.icon}
                  </div>
                  <span className={`font-sans text-[10px] font-extrabold ${mood === m.value ? 'text-brand-dark' : 'text-gray-400'}`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Textarea Container */}
          <div className="bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 relative">
            <textarea
              className="w-full h-48 bg-slate-50 rounded-2xl p-4 font-sans text-sm text-gray-900 border-none resize-none focus:ring-2 focus:ring-brand-primary outline-none"
              placeholder="Escribe tus pensamientos del día..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {/* Mic Button */}
            <button
              onClick={toggleRecording}
              className={`absolute bottom-8 right-8 w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all ${
                recording ? 'bg-rose-500 text-white animate-bounce' : 'bg-brand-primary text-white hover:bg-brand-dark'
              }`}
            >
              <span className="material-symbols-outlined text-xl">
                {recording ? 'graphic_eq' : 'mic'}
              </span>
            </button>
          </div>

          {/* Controls & Save */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Privacy Toggle */}
            <div className="flex bg-slate-100/80 p-1 rounded-full border border-indigo-50 w-full sm:w-auto">
              <button
                onClick={() => setVisible(false)}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-full font-sans text-xs font-bold transition-all ${
                  !visible ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Solo yo
              </button>
              <button
                onClick={() => setVisible(true)}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-full font-sans text-xs font-bold transition-all ${
                  visible ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Visible para la familia
              </button>
            </div>

            <button
              onClick={handleSave}
              className="w-full sm:w-auto px-6 py-3 bg-brand-primary hover:bg-brand-dark text-white rounded-full font-sans text-sm font-bold shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-lg">save</span>
              Guardar Entrada
            </button>
          </div>
        </div>

        {/* Sidebar Decor / Memories list */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-brand-light/30 border border-indigo-100/50 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <span className="font-serif absolute -top-3 -left-3 text-7xl text-brand-dark/5 select-none font-bold">“</span>
            <p className="font-sans text-sm text-brand-dark font-medium italic leading-relaxed">
              "La familia es el primer núcleo donde se aprende a amar, a perdonar y a vivir juntos."
            </p>
            <p className="font-sans text-[10px] text-brand-primary font-extrabold text-right mt-3">- Papa Francisco</p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-indigo-50/60 shadow-xl shadow-indigo-100/20 space-y-4">
            <h3 className="font-sans text-sm font-bold text-gray-700">Recuerdos Recientes</h3>
            <div className="grid grid-cols-2 gap-3">
              {diario.map((entry) => (
                <div key={entry.entrada_id} className="aspect-square rounded-2xl bg-gray-50 border border-slate-150 relative overflow-hidden group shadow-inner">
                  <div className="absolute inset-0 bg-cover bg-center p-3 flex flex-col justify-end bg-gradient-to-t from-gray-900/80 to-transparent">
                    <span className="text-[16px] absolute top-2 right-2">
                      {entry.emocion === 'Great' ? '😁' : entry.emocion === 'Good' ? '🙂' : entry.emocion === 'Okay' ? '😐' : entry.emocion === 'Angry' ? '😠' : '😢'}
                    </span>
                    <p className="font-sans text-[10px] text-white line-clamp-2 leading-relaxed">{entry.texto}</p>
                    <p className="font-sans text-[8px] text-gray-300 mt-1">{entry.fecha}</p>
                  </div>
                </div>
              ))}
              {/* Fallback image memories */}
              <div className="aspect-square rounded-2xl bg-gray-100 overflow-hidden relative group">
                <img
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiQmsZgkvj1QGuPwyTQDFAIBnPkoHFymeIL6pTEsukp_eRd5bC6RG65uKuCNvbv6OfZlAE9mqnXgQOGK6GgGxoB6btFYwCC0kclBVmnmK2v7sIUx7pASFjUk7C_t34BDk_QyVKbCfndiZ6BTdHxlVQeWgyG_N6r03tXrHWGrHLB7mHJFyEOrOdl6SiYFH9gep1UcvPwXb0igTGTx0Nm01-gWnklqeqzdhZRxmu8sMZUR-2e1PLtPZqNcnwr7pQBGvSlpf_C3qmSi8"
                  alt="Picnic"
                />
                <span className="absolute bottom-1.5 left-2 bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-bold text-gray-800">12/08</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
