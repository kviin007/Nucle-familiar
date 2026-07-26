import React from 'react';

export interface ShipSvgProps {
  type: 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  isSunk?: boolean;
}

export const ShipSvg: React.FC<ShipSvgProps> = ({ type, orientation = 'horizontal', className = '', isSunk = false }) => {
  const isVert = orientation === 'vertical';

  const getColor = () => {
    if (isSunk) return 'text-rose-500 fill-rose-500/20 stroke-rose-400';
    return 'text-cyan-400 fill-cyan-500/30 stroke-cyan-300';
  };

  const transformClass = isVert ? 'rotate-90' : '';

  switch (type) {
    case 'carrier':
      return (
        <svg viewBox="0 0 100 24" className={`${getColor()} ${transformClass} ${className} transition-all duration-300 drop-shadow-md`}>
          {/* Aircraft Carrier hull */}
          <path d="M 5 18 L 15 5 L 85 5 L 95 18 L 85 22 L 15 22 Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="2" />
          {/* Flight deck lines */}
          <line x1="20" y1="12" x2="80" y2="12" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
          {/* Command tower */}
          <rect x="55" y="2" width="12" height="6" rx="1" fill="currentColor" stroke="currentColor" strokeWidth="1" />
          {/* Landing runway diagonal */}
          <line x1="18" y1="6" x2="45" y2="18" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
        </svg>
      );

    case 'battleship':
      return (
        <svg viewBox="0 0 80 24" className={`${getColor()} ${transformClass} ${className} transition-all duration-300 drop-shadow-md`}>
          {/* Battleship sleek hull */}
          <path d="M 4 15 L 15 6 L 68 6 L 76 15 L 68 21 L 15 21 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" />
          {/* Heavy Gun Turrets */}
          <circle cx="28" cy="13.5" r="3.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
          <line x1="28" y1="13.5" x2="36" y2="13.5" stroke="currentColor" strokeWidth="2" />
          <circle cx="52" cy="13.5" r="3.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
          <line x1="52" y1="13.5" x2="60" y2="13.5" stroke="currentColor" strokeWidth="2" />
          {/* Center bridge */}
          <rect x="36" y="8" width="10" height="11" rx="1" fill="currentColor" />
        </svg>
      );

    case 'cruiser':
      return (
        <svg viewBox="0 0 60 24" className={`${getColor()} ${transformClass} ${className} transition-all duration-300 drop-shadow-md`}>
          {/* Cruiser hull */}
          <path d="M 4 14 L 12 7 L 50 7 L 56 14 L 50 20 L 12 20 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" />
          {/* Single front cannon */}
          <circle cx="22" cy="13.5" r="3" fill="currentColor" />
          <line x1="22" y1="13.5" x2="28" y2="13.5" stroke="currentColor" strokeWidth="2" />
          {/* Bridge */}
          <rect x="30" y="9" width="8" height="9" rx="1" fill="currentColor" />
        </svg>
      );

    case 'submarine':
      return (
        <svg viewBox="0 0 60 24" className={`${getColor()} ${transformClass} ${className} transition-all duration-300 drop-shadow-md`}>
          {/* Submarine rounded hull */}
          <rect x="6" y="7" width="48" height="13" rx="6.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="2" />
          {/* Conning tower */}
          <path d="M 26 7 L 30 2 L 36 2 L 38 7 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
          {/* Periscope */}
          <line x1="33" y1="2" x2="33" y2="-1" stroke="currentColor" strokeWidth="1.5" />
          <line x1="33" y1="-1" x2="36" y2="-1" stroke="currentColor" strokeWidth="1.5" />
          {/* Propeller rear */}
          <line x1="4" y1="10" x2="4" y2="17" stroke="currentColor" strokeWidth="2" />
        </svg>
      );

    case 'destroyer':
    default:
      return (
        <svg viewBox="0 0 40 24" className={`${getColor()} ${transformClass} ${className} transition-all duration-300 drop-shadow-md`}>
          {/* Fast Destroyer hull */}
          <path d="M 4 13.5 L 10 8 L 32 8 L 36 13.5 L 32 19 L 10 19 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" />
          {/* Radar mast */}
          <line x1="20" y1="8" x2="20" y2="3" stroke="currentColor" strokeWidth="1.5" />
          <line x1="17" y1="4" x2="23" y2="4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
  }
};

export const ExplosionEffect: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <div className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping" />
    <svg viewBox="0 0 36 36" className="w-full h-full text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-bounce">
      <path
        d="M 18 2 L 21 11 L 30 6 L 24 15 L 34 18 L 24 21 L 30 30 L 21 25 L 18 34 L 15 25 L 6 30 L 12 21 L 2 18 L 12 15 L 6 6 L 15 11 Z"
        fill="url(#fireGradient)"
        stroke="#f43f5e"
        strokeWidth="1.5"
      />
      <defs>
        <linearGradient id="fireGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

export const SplashEffect: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <div className="absolute inset-0 rounded-full border-2 border-sky-400 animate-ping opacity-75" />
    <svg viewBox="0 0 32 32" className="w-full h-full text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]">
      <circle cx="16" cy="16" r="6" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="2" />
      <path d="M 16 4 Q 18 10 16 12 Q 14 10 16 4 Z" fill="#38bdf8" />
      <path d="M 28 16 Q 22 18 20 16 Q 22 14 28 16 Z" fill="#38bdf8" />
      <path d="M 16 28 Q 14 22 16 20 Q 18 22 16 28 Z" fill="#38bdf8" />
      <path d="M 4 16 Q 10 14 12 16 Q 10 18 4 16 Z" fill="#38bdf8" />
    </svg>
  </div>
);
