export interface CountdownInfo {
  level: 'normal' | 'yellow' | 'orange_red' | 'imminent' | 'past';
  diffMinutes: number;
  label: string;
  badgeClass: string;
  icon: string;
}

export function getCountdownInfo(horaProgramada?: string): CountdownInfo | null {
  if (!horaProgramada) return null;

  const [hStr, mStr] = horaProgramada.split(':');
  const h = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);

  const now = new Date();
  const currentTotalMin = now.getHours() * 60 + now.getMinutes();
  const taskTotalMin = h * 60 + m;

  const diffMinutes = taskTotalMin - currentTotalMin;

  if (diffMinutes < 0) {
    return {
      level: 'past',
      diffMinutes,
      label: `Excedido (${Math.abs(diffMinutes)} min)`,
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      icon: 'schedule'
    };
  }

  if (diffMinutes <= 1) {
    return {
      level: 'imminent',
      diffMinutes,
      label: '⚡ ¡Prepárate! Empieza ya',
      badgeClass: 'bg-rose-600 text-white border-rose-500 font-black animate-pulse shadow-md',
      icon: 'electric_bolt'
    };
  }

  if (diffMinutes <= 10) {
    return {
      level: 'orange_red',
      diffMinutes,
      label: `🚨 Empieza en ${diffMinutes} min`,
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-black animate-pulse',
      icon: 'warning'
    };
  }

  if (diffMinutes <= 30) {
    return {
      level: 'yellow',
      diffMinutes,
      label: `⚠️ Empieza en ${diffMinutes} min`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold',
      icon: 'notifications_active'
    };
  }

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  const timeText = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  return {
    level: 'normal',
    diffMinutes,
    label: `Empieza en ${timeText}`,
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold',
    icon: 'hourglass_bottom'
  };
}
