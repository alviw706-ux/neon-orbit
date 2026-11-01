import { useEffect, useState } from 'react';

export type GameSettings = {
  sound: boolean;
  volume: number;
  particles: 'high' | 'low';
};

export type OfflineRun = {
  score: number;
  durationSeconds: number;
  coins: number;
  gems: number;
  maxCombo: number;
  playedAt: string;
};

const SETTINGS_KEY = 'neon-orbit:settings';
const OFFLINE_KEY = 'neon-orbit:offline-runs';
const MAX_OFFLINE_RUNS = 25;
const SETTINGS_EVENT = 'neon-orbit:settings-changed';
const OFFLINE_EVENT = 'neon-orbit:offline-changed';

export const DEFAULT_SETTINGS: GameSettings = { sound: true, volume: 0.6, particles: 'high' };

export function loadSettings(): GameSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : DEFAULT_SETTINGS.sound,
      volume:
        typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1
          ? parsed.volume
          : DEFAULT_SETTINGS.volume,
      particles: parsed.particles === 'low' ? 'low' : 'high',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function useGameSettings(): GameSettings {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  useEffect(() => {
    const onChange = () => setSettings(loadSettings());
    window.addEventListener(SETTINGS_EVENT, onChange);
    return () => window.removeEventListener(SETTINGS_EVENT, onChange);
  }, []);
  return settings;
}

export function loadOfflineRuns(): OfflineRun[] {
  try {
    const raw = window.localStorage.getItem(OFFLINE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as OfflineRun[]) : [];
  } catch {
    return [];
  }
}

export function appendOfflineRun(run: OfflineRun) {
  const runs = [run, ...loadOfflineRuns()].slice(0, MAX_OFFLINE_RUNS);
  window.localStorage.setItem(OFFLINE_KEY, JSON.stringify(runs));
  window.dispatchEvent(new Event(OFFLINE_EVENT));
}

export function clearOfflineRuns() {
  window.localStorage.removeItem(OFFLINE_KEY);
  window.dispatchEvent(new Event(OFFLINE_EVENT));
}

export function useOfflineRuns(): OfflineRun[] {
  const [runs, setRuns] = useState<OfflineRun[]>(loadOfflineRuns);
  useEffect(() => {
    const onChange = () => setRuns(loadOfflineRuns());
    window.addEventListener(OFFLINE_EVENT, onChange);
    return () => window.removeEventListener(OFFLINE_EVENT, onChange);
  }, []);
  return runs;
}
