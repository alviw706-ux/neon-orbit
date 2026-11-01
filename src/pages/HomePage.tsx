import { Coins, Gem, Shield, Trophy, Zap, Orbit, ArrowRight } from 'lucide-react';
import { navigate } from '@/lib/router';

const FEATURES = [
  {
    icon: Orbit,
    title: 'Two orbits, one orb',
    description: 'Flip between the inner and outer lane with a single tap to slip past lasers and barriers.',
  },
  {
    icon: Coins,
    title: 'Chain for multipliers',
    description: 'Collect pickups without missing to climb a chain multiplier worth up to five times your points.',
  },
  {
    icon: Shield,
    title: 'Power-ups that matter',
    description: 'Raise a shield, slow the hazards, magnetize coins or double your score for a short burst.',
  },
  {
    icon: Trophy,
    title: 'Daily and weekly ranks',
    description: 'Every verified run earns XP and coins, levels you up and places you on the global leaderboard.',
  },
];

export function HomePage() {
  return (
    <div className="space-y-20 pb-8 md:space-y-28">
      <section className="grid items-center gap-12 pt-4 md:grid-cols-[1.1fr_1fr] md:pt-10">
        <div className="animate-fade-up">
          <p className="label-eyebrow">Endless orbit survival</p>
          <h1 className="heading-display mt-4 text-4xl leading-[1.1] text-white sm:text-5xl lg:text-6xl">
            Ride the <span className="text-gradient-neon">neon orbit</span> and survive as long as you can.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            NEON ORBIT is a one-touch arcade game. Dodge lasers and barriers around a glowing planet, gather coins and gems,
            and build chains that multiply every point you earn.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => navigate('play')} className="btn-primary px-6 py-3.5">
              Start playing <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => navigate('leaderboard')} className="btn-secondary px-6 py-3.5">
              View leaderboard
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-500">No account needed to practice. Sign in to save runs and climb the ranks.</p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[420px]" aria-hidden="true">
          <div className="absolute inset-[12%] rounded-full border border-neon-cyan/25" />
          <div className="absolute inset-[2%] animate-spin rounded-full border border-dashed border-neon-violet/40 [animation-duration:30s]" />
          <div className="absolute inset-[8%] animate-spin rounded-full border-2 border-transparent border-t-neon-cyan/80 [animation-duration:6s]" />
          <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-neon-cyan/60 via-neon-blue/60 to-void-900 shadow-glow-cyan" />
          <div className="absolute left-1/2 top-[-2%] h-6 w-6 -translate-x-1/2 rounded-full bg-neon-cyan shadow-glow-cyan animate-float-slow" />
          <div className="absolute bottom-[10%] left-[8%] h-4 w-4 rounded-full bg-neon-mint shadow-[0_0_18px_rgba(82,255,176,0.6)]" />
          <div className="absolute right-[6%] top-[38%] h-5 w-5 rotate-45 bg-neon-mint/90" />
          <div className="absolute inset-x-[-6%] top-[47%] h-1 rounded-full bg-gradient-to-r from-transparent via-neon-rose to-transparent" />
        </div>
      </section>

      <section aria-labelledby="features-title">
        <div className="mb-10 max-w-2xl">
          <p className="label-eyebrow">Why pilots return</p>
          <h2 id="features-title" className="heading-display mt-3 text-2xl text-white sm:text-3xl">
            Simple to learn. Hard to leave.
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="panel group p-6 transition duration-300 hover:-translate-y-1 hover:border-neon-cyan/30"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-neon-cyan/25 bg-neon-cyan/10 text-neon-cyan transition group-hover:shadow-glow-cyan">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center sm:p-10">
        <div>
          <h2 className="heading-display text-2xl text-white">Ready for launch?</h2>
          <p className="mt-2 text-slate-400">Tap once to start. Tap again to switch orbit.</p>
        </div>
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-neon-amber" aria-hidden="true" />
          <Gem className="h-5 w-5 text-neon-mint" aria-hidden="true" />
          <button type="button" onClick={() => navigate('play')} className="btn-primary px-6 py-3">
            Play now
          </button>
        </div>
      </section>
    </div>
  );
}
