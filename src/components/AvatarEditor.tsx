import React, { useState, useMemo } from 'react';
import { Sparkles, Check, RefreshCw, Palette, Shield, Crown } from 'lucide-react';

interface AvatarEditorProps {
  onSelectSvgDataUrl: (dataUrl: string) => void;
  initialAvatarUrl?: string;
}

const SKIN_TONES = [
  { id: 'porcelain', label: 'Porcelana', color: '#FCE7F3' },
  { id: 'warm', label: 'Cálido', color: '#FDE68A' },
  { id: 'caramel', label: 'Caramelo', color: '#D97706' },
  { id: 'espresso', label: 'Ébano', color: '#78350F' },
  { id: 'cyber_cyan', label: 'Cyber Cyan', color: '#06B6D4' },
  { id: 'emerald_zen', label: 'Esmeralda', color: '#10B981' },
];

const HAIR_STYLES = [
  { id: 'short', label: 'Corto Moderno' },
  { id: 'spike', label: 'Anime Spiky' },
  { id: 'waves', label: 'Ondas Largas' },
  { id: 'afro', label: 'Afro Puff' },
  { id: 'cap', label: 'Gorra Gamer' },
  { id: 'sleek', label: 'Liso Zen' },
];

const HAIR_COLORS = [
  { id: 'black', label: 'Negro', color: '#1E293B' },
  { id: 'blonde', label: 'Rubio', color: '#F59E0B' },
  { id: 'ruby', label: 'Rojo Rubí', color: '#E11D48' },
  { id: 'cyan', label: 'Azul Neón', color: '#0EA5E9' },
  { id: 'purple', label: 'Violeta', color: '#9333EA' },
  { id: 'silver', label: 'Plata', color: '#94A3B8' },
];

const EYE_STYLES = [
  { id: 'happy', label: 'Alegre ✨' },
  { id: 'cool', label: 'Gafas de Sol 😎' },
  { id: 'anime', label: 'Anime Brillo 👁️' },
  { id: 'visor', label: 'Visor Cyber 🥽' },
];

const ACCESSORIES = [
  { id: 'none', label: 'Sin Accesorio' },
  { id: 'headphones', label: 'Audífonos Gamer 🎧' },
  { id: 'crown', label: 'Corona Real 👑' },
  { id: 'glasses', label: 'Lentes Intelectuales 👓' },
  { id: 'star_aura', label: 'Aura Estelar ⭐' },
];

const CLOTHING_COLORS = [
  { id: 'indigo', label: 'Indigo', color: '#4F46E5' },
  { id: 'emerald', label: 'Esmeralda', color: '#059669' },
  { id: 'crimson', label: 'Carmesí', color: '#DC2626' },
  { id: 'amber', label: 'Oro', color: '#D97706' },
  { id: 'obsidian', label: 'Obsidiana', color: '#0F172A' },
];

const BACKGROUND_COLORS = [
  { id: 'twilight', label: 'Atardecer', start: '#1E1B4B', end: '#4338CA' },
  { id: 'cyber', label: 'Cyber Neón', start: '#082F49', end: '#06B6D4' },
  { id: 'sunset', label: 'Fuego', start: '#451A03', end: '#DC2626' },
  { id: 'emerald', label: 'Bosque', start: '#064E3B', end: '#10B981' },
  { id: 'rose', label: 'Pastel', start: '#831843', end: '#F43F5E' },
];

export default function AvatarEditor({ onSelectSvgDataUrl, initialAvatarUrl }: AvatarEditorProps) {
  const [skin, setSkin] = useState(SKIN_TONES[1]);
  const [hairStyle, setHairStyle] = useState(HAIR_STYLES[0].id);
  const [hairColor, setHairColor] = useState(HAIR_COLORS[0]);
  const [eyeStyle, setEyeStyle] = useState(EYE_STYLES[0].id);
  const [accessory, setAccessory] = useState(ACCESSORIES[0].id);
  const [clothing, setClothing] = useState(CLOTHING_COLORS[0]);
  const [bg, setBg] = useState(BACKGROUND_COLORS[0]);

  // Generate dynamic SVG string
  const svgString = useMemo(() => {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bg.start}" />
          <stop offset="100%" stop-color="${bg.end}" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <!-- Background Circle -->
      <rect width="200" height="200" rx="100" fill="url(#bgGrad)" />

      <!-- Star Aura Accessory -->
      ${accessory === 'star_aura' ? `
        <circle cx="100" cy="100" r="85" fill="none" stroke="#FBBF24" stroke-width="3" stroke-dasharray="8 6" opacity="0.8" />
        <polygon points="100,15 104,25 115,25 106,32 109,42 100,36 91,42 94,32 85,25 96,25" fill="#FBBF24" />
      ` : ''}

      <!-- Torso / Clothing -->
      <path d="M 40 190 Q 100 130 160 190 Z" fill="${clothing.color}" />
      <path d="M 85 150 L 100 170 L 115 150 Z" fill="${skin.color}" opacity="0.9" />

      <!-- Neck -->
      <rect x="88" y="125" width="24" height="25" rx="5" fill="${skin.color}" />

      <!-- Head Base -->
      <ellipse cx="100" cy="90" rx="38" ry="42" fill="${skin.color}" />

      <!-- Ears -->
      <circle cx="60" cy="92" r="8" fill="${skin.color}" />
      <circle cx="140" cy="92" r="8" fill="${skin.color}" />

      <!-- Eyes -->
      ${eyeStyle === 'happy' ? `
        <circle cx="85" cy="88" r="4.5" fill="#0F172A" />
        <circle cx="115" cy="88" r="4.5" fill="#0F172A" />
        <circle cx="87" cy="86" r="1.5" fill="#FFFFFF" />
        <circle cx="117" cy="86" r="1.5" fill="#FFFFFF" />
      ` : eyeStyle === 'cool' ? `
        <rect x="72" y="80" width="56" height="14" rx="4" fill="#0F172A" />
        <line x1="72" y1="84" x2="128" y2="84" stroke="#38BDF8" stroke-width="2" opacity="0.7" />
      ` : eyeStyle === 'anime' ? `
        <ellipse cx="85" cy="88" rx="6" ry="8" fill="#3B82F6" />
        <ellipse cx="115" cy="88" rx="6" ry="8" fill="#3B82F6" />
        <circle cx="87" cy="85" r="2.5" fill="#FFFFFF" />
        <circle cx="117" cy="85" r="2.5" fill="#FFFFFF" />
      ` : `
        <!-- Cyber Visor -->
        <polygon points="70,82 130,82 125,94 75,94" fill="#06B6D4" filter="url(#glow)" />
        <line x1="70" y1="88" x2="130" y2="88" stroke="#FFFFFF" stroke-width="2" />
      `}

      <!-- Mouth / Smile -->
      <path d="M 88 112 Q 100 122 112 112" fill="none" stroke="#713F12" stroke-width="3" stroke-linecap="round" />

      <!-- Hair Styles -->
      ${hairStyle === 'short' ? `
        <path d="M 62 82 Q 100 35 138 82 Q 100 60 62 82 Z" fill="${hairColor.color}" />
      ` : hairStyle === 'spike' ? `
        <path d="M 60 85 L 68 50 L 80 62 L 95 38 L 110 60 L 125 45 L 138 85 Q 100 65 60 85 Z" fill="${hairColor.color}" />
      ` : hairStyle === 'waves' ? `
        <path d="M 58 90 Q 60 40 100 40 Q 140 40 142 90 Q 148 130 138 145 Q 128 100 120 90 Q 100 70 80 90 Q 72 100 62 145 Q 52 130 58 90 Z" fill="${hairColor.color}" />
      ` : hairStyle === 'afro' ? `
        <circle cx="100" cy="72" r="48" fill="${hairColor.color}" />
        <ellipse cx="100" cy="90" rx="38" ry="42" fill="${skin.color}" />
      ` : hairStyle === 'cap' ? `
        <path d="M 60 80 Q 100 45 140 80 Z" fill="${clothing.color}" />
        <path d="M 55 80 L 145 80 L 155 86 L 45 86 Z" fill="${hairColor.color}" />
      ` : `
        <path d="M 62 85 Q 100 48 138 85 Q 100 70 62 85 Z" fill="${hairColor.color}" />
      `}

      <!-- Accessories -->
      ${accessory === 'headphones' ? `
        <path d="M 54 90 Q 100 30 146 90" fill="none" stroke="#0F172A" stroke-width="8" stroke-linecap="round" />
        <rect x="48" y="80" width="12" height="24" rx="6" fill="#F43F5E" />
        <rect x="140" y="80" width="12" height="24" rx="6" fill="#F43F5E" />
      ` : accessory === 'crown' ? `
        <polygon points="75,55 85,30 100,48 115,30 125,55" fill="#FBBF24" stroke="#B45309" stroke-width="2" />
        <circle cx="85" cy="30" r="3" fill="#EF4444" />
        <circle cx="100" cy="48" r="3" fill="#3B82F6" />
        <circle cx="115" cy="30" r="3" fill="#EF4444" />
      ` : accessory === 'glasses' ? `
        <circle cx="85" cy="88" r="12" fill="none" stroke="#0F172A" stroke-width="3" />
        <circle cx="115" cy="88" r="12" fill="none" stroke="#0F172A" stroke-width="3" />
        <line x1="97" y1="88" x2="103" y2="88" stroke="#0F172A" stroke-width="3" />
      ` : ''}
    </svg>`.replace(/\s+/g, ' ').trim();
  }, [skin, hairStyle, hairColor, eyeStyle, accessory, clothing, bg]);

  const svgDataUrl = useMemo(() => {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
  }, [svgString]);

  const handleRandomize = () => {
    setSkin(SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]);
    setHairStyle(HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id);
    setHairColor(HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)]);
    setEyeStyle(EYE_STYLES[Math.floor(Math.random() * EYE_STYLES.length)].id);
    setAccessory(ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)].id);
    setClothing(CLOTHING_COLORS[Math.floor(Math.random() * CLOTHING_COLORS.length)]);
    setBg(BACKGROUND_COLORS[Math.floor(Math.random() * BACKGROUND_COLORS.length)]);
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Sparkles className="text-amber-400" size={20} />
            Creador de Avatar Vectorial SVG 3D
          </h3>
          <p className="text-xs text-slate-400">Personaliza colores, peinados, lentes y accesorios en tiempo real.</p>
        </div>
        <button
          type="button"
          onClick={handleRandomize}
          className="bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Aleatorio</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* SVG Preview Card */}
        <div className="md:col-span-4 flex flex-col items-center justify-center bg-slate-950 p-6 rounded-3xl border border-indigo-900/50 shadow-inner text-center">
          <div className="w-40 h-40 rounded-full overflow-hidden shadow-2xl ring-4 ring-indigo-500/40 my-2">
            <img src={svgDataUrl} alt="SVG Avatar" className="w-full h-full object-cover" />
          </div>
          <p className="text-[11px] font-black text-indigo-300 uppercase tracking-wider mt-3">
            Avatar Vectorial Listo
          </p>
          <button
            type="button"
            onClick={() => onSelectSvgDataUrl(svgDataUrl)}
            className="mt-3 w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check size={16} />
            <span>Usar Este Avatar Vectorial</span>
          </button>
        </div>

        {/* Customization Options Grid */}
        <div className="md:col-span-8 space-y-4 max-h-[380px] overflow-y-auto pr-2 no-scrollbar">
          {/* Tono de Piel */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Tono de Piel</label>
            <div className="flex flex-wrap gap-2">
              {SKIN_TONES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSkin(item)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                    skin.id === item.id ? 'scale-110 border-indigo-400 ring-2 ring-indigo-500' : 'border-slate-700 opacity-80'
                  }`}
                  style={{ backgroundColor: item.color }}
                  title={item.label}
                />
              ))}
            </div>
          </div>

          {/* Estilo de Cabello */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Peinado</label>
            <div className="grid grid-cols-3 gap-2">
              {HAIR_STYLES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setHairStyle(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    hairStyle === item.id
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-xs'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color de Cabello */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Color de Cabello</label>
            <div className="flex flex-wrap gap-2">
              {HAIR_COLORS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setHairColor(item)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    hairColor.id === item.id ? 'scale-110 border-amber-400 ring-2 ring-amber-500' : 'border-slate-700 opacity-80'
                  }`}
                  style={{ backgroundColor: item.color }}
                  title={item.label}
                />
              ))}
            </div>
          </div>

          {/* Ojos / Expresión */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Estilo de Ojos / Lentes</label>
            <div className="grid grid-cols-2 gap-2">
              {EYE_STYLES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setEyeStyle(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    eyeStyle === item.id
                      ? 'bg-purple-600 border-purple-400 text-white shadow-xs'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accesorios */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Accesorio Especial</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACCESSORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAccessory(item.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    accessory === item.id
                      ? 'bg-amber-500 border-amber-300 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color de Ropa & Fondo */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Ropa</label>
              <div className="flex gap-1.5">
                {CLOTHING_COLORS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setClothing(item)}
                    className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                      clothing.id === item.id ? 'scale-110 border-white ring-2 ring-indigo-400' : 'opacity-70'
                    }`}
                    style={{ backgroundColor: item.color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Fondo</label>
              <div className="flex gap-1.5">
                {BACKGROUND_COLORS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setBg(item)}
                    className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                      bg.id === item.id ? 'scale-110 border-white ring-2 ring-purple-400' : 'opacity-70'
                    }`}
                    style={{ background: `linear-gradient(135deg, ${item.start}, ${item.end})` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
