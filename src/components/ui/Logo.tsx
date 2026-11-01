import { Orbit } from 'lucide-react';
import { navigate } from '@/lib/router';

type LogoProps = {
  compact?: boolean;
  linkTo?: string;
};

export function Logo({ compact = false, linkTo = '/' }: LogoProps) {
  return (
    <button
      type="button"
      onClick={() => navigate(linkTo)}
      className="group flex items-center gap-3 rounded-xl text-left"
      aria-label="NEON ORBIT home"
    >
      <span className="relative flex h-10 w-10 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-neon-cyan/20 blur-md transition group-hover:bg-neon-cyan/40" />
        <Orbit className="relative h-7 w-7 text-neon-cyan drop-shadow-[0_0_8px_rgba(56,241,255,0.8)] transition group-hover:rotate-45" />
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-[0.2em] text-white">
          NEON<span className="text-neon-cyan"> ORBIT</span>
        </span>
      )}
    </button>
  );
}
