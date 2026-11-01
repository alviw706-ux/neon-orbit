import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { GameAudio } from '@/game/audio';
import { OrbitEngine } from '@/game/engine';
import { createStars, renderScene, type Star } from '@/game/renderer';
import type { GameSettings } from '@/lib/localSettings';
import type { GamePhase, HudSnapshot, RunSummary } from '@/game/types';

export type GameStageHandle = {
  pause: () => void;
  resume: () => void;
};

type GameStageProps = {
  settings: GameSettings;
  onSnapshot: (snapshot: HudSnapshot) => void;
  onStatusChange: (phase: GamePhase) => void;
  onFinish: (summary: RunSummary) => void;
};

const SNAPSHOT_INTERVAL_SECONDS = 0.1;
const MAX_FRAME_SECONDS = 0.05;
const STAR_COUNT = 140;

export const GameStage = forwardRef<GameStageHandle, GameStageProps>(function GameStage(
  { settings, onSnapshot, onStatusChange, onFinish },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine] = useState(() => new OrbitEngine(settings.particles === 'high' ? 1 : 0.4));
  const [audio] = useState(() => new GameAudio());
  const [stars] = useState<Star[]>(() => createStars(STAR_COUNT));
  const latest = useRef({ onSnapshot, onStatusChange, onFinish });
  const reportedOver = useRef(false);

  useEffect(() => {
    latest.current = { onSnapshot, onStatusChange, onFinish };
  });

  useEffect(() => {
    audio.configure(settings.sound, settings.volume);
    engine.particles.density = settings.particles === 'high' ? 1 : 0.4;
  }, [audio, engine, settings]);

  useEffect(() => {
    latest.current.onStatusChange('ready');
    return () => audio.dispose();
  }, [audio]);

  const pause = useCallback(() => {
    if (engine.phase !== 'playing') return;
    engine.pause();
    latest.current.onStatusChange('paused');
  }, [engine]);

  const resume = useCallback(() => {
    if (engine.phase !== 'paused') return;
    engine.resume();
    latest.current.onStatusChange('playing');
  }, [engine]);

  useImperativeHandle(ref, () => ({ pause, resume }), [pause, resume]);

  const tap = useCallback(() => {
    audio.unlock();
    if (engine.phase === 'ready') {
      engine.start();
      latest.current.onStatusChange('playing');
      return;
    }
    engine.switchLane();
  }, [audio, engine]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (!event.repeat) tap();
      } else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
        if (engine.phase === 'playing') pause();
        else if (engine.phase === 'paused') resume();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine, pause, resume, tap]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let frame = 0;
    let last = performance.now();
    let snapshotClock = 0;
    let lastPhase: GamePhase = engine.phase;

    const loop = (now: number) => {
      const dt = Math.min(MAX_FRAME_SECONDS, (now - last) / 1000);
      last = now;

      engine.step(dt);
      audio.handle(engine.drainEvents());

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderScene(ctx, engine, stars, {
        width: canvas.width / dpr,
        height: canvas.height / dpr,
        time: now / 1000,
      });

      snapshotClock += dt;
      if (snapshotClock >= SNAPSHOT_INTERVAL_SECONDS || engine.phase !== lastPhase) {
        snapshotClock = 0;
        latest.current.onSnapshot(engine.snapshot());
      }

      if (engine.phase !== lastPhase) {
        lastPhase = engine.phase;
        if (engine.phase === 'over' && !reportedOver.current) {
          reportedOver.current = true;
          latest.current.onStatusChange('over');
          latest.current.onFinish(engine.summary());
        }
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [audio, engine, stars]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none select-none"
      onPointerDown={(event) => {
        if (event.button !== 0 && event.pointerType === 'mouse') return;
        tap();
      }}
      role="application"
      aria-label="NEON ORBIT game field. Tap or press space to switch orbit."
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
});
