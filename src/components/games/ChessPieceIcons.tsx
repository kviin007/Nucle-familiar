import React from 'react';

interface ChessPieceProps {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
  className?: string;
  style?: React.CSSProperties;
}

export function ChessPieceSvg({ type, color, className = '', style }: ChessPieceProps) {
  const isWhite = color === 'w';

  // Base gradients and colors
  const primaryGradientId = isWhite ? 'whitePieceGradient' : 'blackPieceGradient';
  const strokeColor = isWhite ? '#1E293B' : '#FCD34D';
  const shadowFilterId = isWhite ? 'whiteDropShadow' : 'blackDropShadow';

  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full drop-shadow-md select-none ${className}`}
      style={style}
    >
      <defs>
        {/* White piece gradient: Ivory/pearl with top highlight */}
        <linearGradient id="whitePieceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* Black piece gradient: Dark obsidian with metallic blue/slate */}
        <linearGradient id="blackPieceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="50%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Gold accent for black pieces */}
        <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        {/* Subtle drop shadow for piece base */}
        <filter id="pieceShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter="url(#pieceShadow)">
        {/* Base pedestal common to all pieces */}
        <path
          d="M 22 84 Q 50 78 78 84 L 82 92 Q 50 96 18 92 Z"
          fill={isWhite ? '#CBD5E1' : '#020617'}
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <rect
          x="20"
          y="78"
          width="60"
          height="8"
          rx="4"
          fill={`url(#${primaryGradientId})`}
          stroke={strokeColor}
          strokeWidth="2.5"
        />

        {/* PAWN (p) */}
        {type === 'p' && (
          <g>
            <path
              d="M 32 78 C 34 60, 38 48, 42 42 C 38 38, 38 32, 50 32 C 62 32, 62 38, 58 42 C 62 48, 66 60, 68 78 Z"
              fill={`url(#${primaryGradientId})`}
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Ball Head */}
            <circle
              cx="50"
              cy="24"
              r="14"
              fill={`url(#${primaryGradientId})`}
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            {/* Highlight Shine */}
            <circle cx="45" cy="20" r="4" fill={isWhite ? '#FFFFFF' : 'url(#goldAccent)'} opacity="0.6" />
          </g>
        )}

        {/* ROOK (r) */}
        {type === 'r' && (
          <g>
            {/* Main Body */}
            <path
              d="M 28 78 L 32 42 L 26 42 L 26 24 L 38 24 L 38 32 L 46 32 L 46 24 L 54 24 L 54 32 L 62 32 L 62 24 L 74 24 L 74 42 L 68 42 L 72 78 Z"
              fill={`url(#${primaryGradientId})`}
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Wall Line Accent */}
            <line x1="32" y1="46" x2="68" y2="46" stroke={strokeColor} strokeWidth="2.5" />
          </g>
        )}

        {/* KNIGHT (n) */}
        {type === 'n' && (
          <g>
            {/* Horse Mane and Head */}
            <path
              d="M 30 78 C 30 60, 24 45, 34 26 C 42 22, 58 18, 68 28 C 76 36, 72 48, 62 52 C 54 54, 48 48, 46 48 C 42 58, 48 70, 70 78 Z"
              fill={`url(#${primaryGradientId})`}
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Eye */}
            <circle cx="56" cy="32" r="3.5" fill={isWhite ? '#1E293B' : '#FCD34D'} />
            {/* Mane details */}
            <path d="M 32 38 C 26 30, 28 20, 36 24" fill="none" stroke={strokeColor} strokeWidth="2" />
          </g>
        )}

        {/* BISHOP (b) */}
        {type === 'b' && (
          <g>
            {/* Body */}
            <path
              d="M 32 78 C 34 58, 38 46, 36 38 C 34 28, 44 20, 50 20 C 56 20, 66 28, 64 38 C 62 46, 66 58, 68 78 Z"
              fill={`url(#${primaryGradientId})`}
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Top Ball */}
            <circle cx="50" cy="14" r="5" fill={`url(#${primaryGradientId})`} stroke={strokeColor} strokeWidth="2" />
            {/* Diagonal Slash Cutout */}
            <line x1="42" y1="36" x2="56" y2="28" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="48" r="4" fill={isWhite ? '#1E293B' : 'url(#goldAccent)'} />
          </g>
        )}

        {/* QUEEN (q) */}
        {type === 'q' && (
          <g>
            {/* Crown Spikes Body */}
            <path
              d="M 28 78 L 32 48 L 22 28 L 36 38 L 50 20 L 64 38 L 78 28 L 68 48 L 72 78 Z"
              fill={`url(#${primaryGradientId})`}
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Jewels on crown points */}
            <circle cx="22" cy="26" r="3.5" fill={isWhite ? '#38BDF8' : '#F43F5E'} stroke={strokeColor} strokeWidth="1.5" />
            <circle cx="50" cy="18" r="4.5" fill={isWhite ? '#F59E0B' : '#FCD34D'} stroke={strokeColor} strokeWidth="1.5" />
            <circle cx="78" cy="26" r="3.5" fill={isWhite ? '#38BDF8' : '#F43F5E'} stroke={strokeColor} strokeWidth="1.5" />
            {/* Royal band */}
            <rect x="33" y="60" width="34" height="6" rx="3" fill={isWhite ? '#E2E8F0' : 'url(#goldAccent)'} stroke={strokeColor} strokeWidth="1.5" />
          </g>
        )}

        {/* KING (k) */}
        {type === 'k' && (
          <g>
            {/* Body */}
            <path
              d="M 28 78 L 32 46 C 28 38, 28 32, 50 30 C 72 32, 72 38, 68 46 L 72 78 Z"
              fill={`url(#${primaryGradientId})`}
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Top Cross */}
            <path
              d="M 50 10 L 50 24 M 43 17 L 57 17"
              stroke={isWhite ? '#1E293B' : '#FCD34D'}
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Royal Crown Arch */}
            <path
              d="M 32 32 Q 50 24 68 32"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            {/* Royal band */}
            <rect x="32" y="58" width="36" height="7" rx="3.5" fill={isWhite ? '#FCD34D' : 'url(#goldAccent)'} stroke={strokeColor} strokeWidth="1.5" />
          </g>
        )}
      </g>
    </svg>
  );
}
