import type { GameEvent } from '@/game/types';

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private volume = 0.6;

  configure(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = volume;
    if (this.master) this.master.gain.value = volume * 0.5;
  }

  unlock() {
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume * 0.5;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  handle(events: GameEvent[]) {
    for (const event of events) this.play(event);
  }

  dispose() {
    void this.context?.close();
    this.context = null;
    this.master = null;
  }

  private play(event: GameEvent) {
    if (!this.enabled || !this.context || !this.master) return;
    const now = this.context.currentTime;
    switch (event.type) {
      case 'switch':
        this.sweep(now, 420, 880, 0.12, 'sine', 0.18);
        break;
      case 'coin':
        this.note(now, 988, 0.07, 'triangle', 0.22);
        this.note(now + 0.06, 1319, 0.09, 'triangle', 0.2);
        break;
      case 'gem':
        this.note(now, 1319, 0.08, 'sine', 0.22);
        this.note(now + 0.07, 1760, 0.1, 'sine', 0.2);
        this.note(now + 0.14, 2349, 0.14, 'sine', 0.14);
        break;
      case 'powerup':
        [523, 659, 784, 1046].forEach((freq, index) => this.note(now + index * 0.06, freq, 0.09, 'square', 0.08));
        break;
      case 'shield-break':
        this.sweep(now, 300, 1100, 0.35, 'sine', 0.22);
        break;
      case 'laser-warn':
        this.note(now, 1400, 0.05, 'square', 0.04);
        break;
      case 'laser-fire':
        this.sweep(now, 1200, 180, 0.28, 'sawtooth', 0.14);
        break;
      case 'chain-tier':
        this.sweep(now, 880, 1320, 0.12, 'triangle', 0.16);
        break;
      case 'hit':
        this.noise(now, 0.45, 0.35);
        this.sweep(now, 220, 35, 0.7, 'sawtooth', 0.3);
        break;
    }
  }

  private note(when: number, frequency: number, duration: number, type: OscillatorType, gain: number) {
    if (!this.context || !this.master) return;
    const osc = this.context.createOscillator();
    const amp = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, when);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(gain, when + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(amp).connect(this.master);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  private sweep(when: number, from: number, to: number, duration: number, type: OscillatorType, gain: number) {
    if (!this.context || !this.master) return;
    const osc = this.context.createOscillator();
    const amp = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, when);
    osc.frequency.exponentialRampToValueAtTime(to, when + duration);
    amp.gain.setValueAtTime(gain, when);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(amp).connect(this.master);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  private noise(when: number, duration: number, gain: number) {
    if (!this.context || !this.master) return;
    const length = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    const amp = this.context.createGain();
    amp.gain.value = gain;
    source.buffer = buffer;
    source.connect(amp).connect(this.master);
    source.start(when);
  }
}
