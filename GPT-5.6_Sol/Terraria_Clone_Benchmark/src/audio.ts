export class AudioSystem {
  private context?: AudioContext;

  private getContext(): AudioContext | undefined {
    if (!this.context) {
      const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor) this.context = new AudioCtor();
    }
    return this.context;
  }

  play(type: 'mine' | 'place' | 'hit' | 'jump' | 'pickup' | 'boss'): void {
    const context = this.getContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const settings = {
      mine: [110, 0.035, 'square'],
      place: [165, 0.045, 'triangle'],
      hit: [72, 0.09, 'sawtooth'],
      jump: [210, 0.06, 'square'],
      pickup: [520, 0.08, 'sine'],
      boss: [48, 0.5, 'sawtooth'],
    } as const;
    const [frequency, duration, wave] = settings[type];
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.65), now + duration);
    gain.gain.setValueAtTime(type === 'boss' ? 0.08 : 0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}
