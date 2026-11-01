import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { clearOfflineRuns, loadSettings, saveSettings, type GameSettings } from '@/lib/localSettings';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const { showToast } = useToast();

  const update = (patch: Partial<GameSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  return (
    <Modal open={open} title="Settings" onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-white">Sound effects</p>
            <p className="text-sm text-slate-400">Synthesized arcade tones made for NEON ORBIT.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.sound}
            onClick={() => update({ sound: !settings.sound })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition duration-300 ${
              settings.sound ? 'bg-neon-cyan shadow-glow-cyan' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition duration-300 ${
                settings.sound ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="volume" className="font-semibold text-white">
              Volume
            </label>
            <span className="text-sm tabular-nums text-neon-cyan">{Math.round(settings.volume * 100)}%</span>
          </div>
          <input
            id="volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.volume * 100)}
            disabled={!settings.sound}
            onChange={(event) => update({ volume: Number(event.target.value) / 100 })}
            className="w-full accent-cyan-300 disabled:opacity-40"
          />
        </div>

        <div>
          <p className="mb-2 font-semibold text-white">Particle detail</p>
          <div className="grid grid-cols-2 gap-2">
            {(['high', 'low'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => update({ particles: level })}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold capitalize transition ${
                  settings.particles === level
                    ? 'border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'
                }`}
              >
                {level === 'high' ? 'Full effects' : 'Lite effects'}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-5">
          <p className="font-semibold text-white">Offline practice</p>
          <p className="mb-3 text-sm text-slate-400">Runs played without an account are stored only on this device.</p>
          <button
            type="button"
            onClick={() => {
              clearOfflineRuns();
              showToast('Offline practice history cleared.');
            }}
            className="btn-secondary w-full text-neon-rose"
          >
            <Trash2 className="h-4 w-4" /> Clear offline practice history
          </button>
        </div>
      </div>
    </Modal>
  );
}
