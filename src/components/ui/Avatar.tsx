import { useId } from 'react';
import { AVATAR_KEYS, type AvatarKey } from '@/types/database';

type AvatarStyle = {
  from: string;
  to: string;
  glow: string;
  tilt: number;
  orbitX: number;
  orbitY: number;
  planet: boolean;
};

export const AVATAR_STYLES: Record<AvatarKey, AvatarStyle & { label: string }> = {
  nova: { label: 'Nova', from: '#38f1ff', to: '#3d7bff', glow: '#38f1ff', tilt: -18, orbitX: 46, orbitY: 26, planet: true },
  pulse: { label: 'Pulse', from: '#52ffb0', to: '#0ea5a4', glow: '#52ffb0', tilt: 12, orbitX: 42, orbitY: 30, planet: true },
  comet: { label: 'Comet', from: '#ffc857', to: '#ff5c8a', glow: '#ffc857', tilt: -8, orbitX: 48, orbitY: 22, planet: false },
  helix: { label: 'Helix', from: '#b26bff', to: '#3d7bff', glow: '#d7b5ff', tilt: 24, orbitX: 44, orbitY: 28, planet: true },
  quasar: { label: 'Quasar', from: '#ff5c8a', to: '#b26bff', glow: '#ff9bbd', tilt: -30, orbitX: 40, orbitY: 34, planet: false },
  drift: { label: 'Drift', from: '#7dd3fc', to: '#1e3a8a', glow: '#bae6fd', tilt: 36, orbitX: 46, orbitY: 20, planet: true },
  ion: { label: 'Ion', from: '#a7f3d0', to: '#38f1ff', glow: '#a7f3d0', tilt: -42, orbitX: 38, orbitY: 36, planet: false },
  vega: { label: 'Vega', from: '#fde68a', to: '#fb7185', glow: '#fff1c2', tilt: 4, orbitX: 50, orbitY: 18, planet: true },
};

export const AVATAR_CHOICES = AVATAR_KEYS.map((key) => ({ key, label: AVATAR_STYLES[key].label }));

type AvatarProps = {
  avatarKey: AvatarKey;
  size?: number;
  className?: string;
  ring?: boolean;
};

export function Avatar({ avatarKey, size = 48, className = '', ring = false }: AvatarProps) {
  const id = useId().replace(/:/g, '');
  const style = AVATAR_STYLES[avatarKey] ?? AVATAR_STYLES.nova;
  const ringClass = ring ? 'ring-2 ring-white/20 ring-offset-2 ring-offset-void-900' : '';

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={`${style.label} avatar`}
      className={`shrink-0 rounded-2xl ${ringClass} ${className}`}
    >
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={style.from} stopOpacity="0.9" />
          <stop offset="100%" stopColor={style.to} />
        </linearGradient>
        <radialGradient id={`pl-${id}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="60%" stopColor={style.to} stopOpacity="0.85" />
          <stop offset="100%" stopColor="#03040a" />
        </radialGradient>
        <filter id={`gl-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#bg-${id})`} />
      <circle cx="10" cy="12" r="1.2" fill="#fff" opacity="0.7" />
      <circle cx="54" cy="50" r="1" fill="#fff" opacity="0.6" />
      <circle cx="50" cy="10" r="0.8" fill="#fff" opacity="0.5" />
      <g transform={`rotate(${style.tilt} 32 32)`}>
        <ellipse
          cx="32"
          cy="32"
          rx={style.orbitX / 2 + 8}
          ry={style.orbitY / 2 + 2}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.55"
          strokeWidth="1.4"
        />
      </g>
      {style.planet ? (
        <circle cx="32" cy="32" r="14" fill={`url(#pl-${id})`} />
      ) : (
        <circle cx="32" cy="32" r="7" fill="#03040a" opacity="0.35" />
      )}
      <g transform={`rotate(${style.tilt} 32 32)`}>
        <circle
          cx={32 + style.orbitX / 2 + 8}
          cy="32"
          r="4"
          fill={style.glow}
          filter={`url(#gl-${id})`}
        />
      </g>
    </svg>
  );
}
