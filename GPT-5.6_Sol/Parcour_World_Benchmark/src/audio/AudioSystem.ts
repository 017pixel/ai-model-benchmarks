import type { PlayerEvent } from '../player/PlayerController';

export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private windGain: GainNode | null = null;
  private slideGain: GainNode | null = null;
  private grindGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  async unlock(): Promise<void> {
    if (!this.context) this.createGraph();
    if (this.context?.state === 'suspended') await this.context.resume();
  }

  private createGraph(): void {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.42;
    this.master.connect(this.context.destination);
    this.noiseBuffer = this.createNoiseBuffer(2);

    const wind = this.createNoiseSource(true);
    const windFilter = this.context.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 520;
    windFilter.Q.value = 0.35;
    this.windGain = this.context.createGain();
    this.windGain.gain.value = 0.025;
    wind.connect(windFilter).connect(this.windGain).connect(this.master);
    wind.start();

    const slide = this.createNoiseSource(true);
    const slideFilter = this.context.createBiquadFilter();
    slideFilter.type = 'bandpass';
    slideFilter.frequency.value = 680;
    slideFilter.Q.value = 0.8;
    this.slideGain = this.context.createGain();
    this.slideGain.gain.value = 0;
    slide.connect(slideFilter).connect(this.slideGain).connect(this.master);
    slide.start();

    const grind = this.context.createOscillator();
    grind.type = 'sawtooth';
    grind.frequency.value = 92;
    const grindFilter = this.context.createBiquadFilter();
    grindFilter.type = 'bandpass';
    grindFilter.frequency.value = 950;
    grindFilter.Q.value = 0.65;
    this.grindGain = this.context.createGain();
    this.grindGain.gain.value = 0;
    grind.connect(grindFilter).connect(this.grindGain).connect(this.master);
    grind.start();
  }

  private createNoiseBuffer(seconds: number): AudioBuffer {
    if (!this.context) throw new Error('Audio context not initialized');
    const buffer = this.context.createBuffer(1, this.context.sampleRate * seconds, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private createNoiseSource(loop: boolean): AudioBufferSourceNode {
    if (!this.context || !this.noiseBuffer) throw new Error('Audio context not initialized');
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = loop;
    return source;
  }

  update(speed: number): void {
    if (!this.context || !this.windGain) return;
    const target = 0.018 + Math.min(0.15, speed * 0.008);
    this.windGain.gain.setTargetAtTime(target, this.context.currentTime, 0.18);
  }

  handle(event: PlayerEvent): void {
    if (!this.context || !this.master) return;
    if (event.type === 'step') this.footstep(event.surface, event.intensity);
    else if (event.type === 'jump') this.jump(event.intensity);
    else if (event.type === 'land') this.land(event.intensity);
    else if (event.type === 'slide' && this.slideGain) {
      this.slideGain.gain.setTargetAtTime(event.active ? 0.13 : 0, this.context.currentTime, 0.055);
    } else if (event.type === 'grind' && this.grindGain) {
      this.grindGain.gain.setTargetAtTime(event.active ? 0.095 : 0, this.context.currentTime, 0.035);
    }
  }

  private footstep(surface: string, intensity: number): void {
    if (!this.context || !this.master) return;
    const source = this.createNoiseSource(false);
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = surface === 'metal' ? 1800 : surface === 'wood' ? 720 : 430;
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    gain.gain.setValueAtTime(0.11 + intensity * 0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now, Math.random(), 0.09);
  }

  private jump(intensity: number): void {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(115, now);
    oscillator.frequency.exponentialRampToValueAtTime(190 + intensity * 35, now + 0.1);
    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.14);
  }

  private land(intensity: number): void {
    if (!this.context || !this.master || intensity <= 0.02) return;
    const source = this.createNoiseSource(false);
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 170 + intensity * 280;
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    gain.gain.setValueAtTime(0.08 + intensity * 0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now, Math.random(), 0.2);
  }
}
