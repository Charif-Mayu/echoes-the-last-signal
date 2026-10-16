import { AudioSettings } from '../types/game';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = {
    masterVolume: 0.8,
    musicVolume: 0.7,
    sfxVolume: 0.85,
    voiceVolume: 0.9,
    muted: false
  };
  private isUnlocked: boolean = false;

  constructor(initialSettings?: Partial<AudioSettings>) {
    if (initialSettings) {
      this.settings = { ...this.settings, ...initialSettings };
    }
  }

  public init(): void {
    if (typeof window === 'undefined') return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass && !this.ctx) {
      this.ctx = new AudioContextClass();
    }
  }

  public unlock(): void {
    if (!this.ctx) {
      this.init();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isUnlocked = true;
      }).catch((e) => {
        console.warn('[AudioManager] Failed to resume audio context:', e);
      });
    } else if (this.ctx) {
      this.isUnlocked = true;
    }
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public playSynthesizedSFX(type: 'click' | 'blip' | 'success' | 'error' | 'static' | 'radio_on' | 'footstep'): void {
    if (this.settings.muted || !this.ctx || this.ctx.state !== 'running') return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const masterVol = this.settings.masterVolume * this.settings.sfxVolume;

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      switch (type) {
        case 'click':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
          gain.gain.setValueAtTime(0.2 * masterVol, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.04);
          osc.start(now);
          osc.stop(now + 0.04);
          break;

        case 'blip':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.setValueAtTime(1800, now + 0.05);
          gain.gain.setValueAtTime(0.25 * masterVol, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.09);
          osc.start(now);
          osc.stop(now + 0.09);
          break;

        case 'success':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
          osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
          osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
          gain.gain.setValueAtTime(0.3 * masterVol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
          break;

        case 'error':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.setValueAtTime(174.61, now + 0.12);
          gain.gain.setValueAtTime(0.25 * masterVol, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
          break;

        case 'static':
          // White noise buffer
          const bufferSize = this.ctx.sampleRate * 0.15;
          const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }
          const whiteNoise = this.ctx.createBufferSource();
          whiteNoise.buffer = noiseBuffer;
          gain.gain.setValueAtTime(0.12 * masterVol, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
          whiteNoise.connect(gain);
          whiteNoise.start(now);
          whiteNoise.stop(now + 0.15);
          break;

        case 'radio_on':
          osc.type = 'square';
          osc.frequency.setValueAtTime(350, now);
          osc.frequency.setValueAtTime(950, now + 0.06);
          gain.gain.setValueAtTime(0.2 * masterVol, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
          break;

        case 'footstep':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(110, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.05);
          gain.gain.setValueAtTime(0.08 * masterVol, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
      }
    } catch (e) {
      console.warn('[AudioManager] Sound playback error:', e);
    }
  }

  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  public startAmbientDrone(): void {
    if (this.settings.muted || !this.ctx || this.ambientGain) return;
    try {
      const now = this.ctx.currentTime;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, now);

      this.ambientGain = this.ctx.createGain();
      const vol = this.settings.masterVolume * this.settings.musicVolume * 0.07;
      this.ambientGain.gain.setValueAtTime(0.001, now);
      this.ambientGain.gain.linearRampToValueAtTime(vol, now + 2.0);

      this.ambientOsc1 = this.ctx.createOscillator();
      this.ambientOsc1.type = 'sawtooth';
      this.ambientOsc1.frequency.setValueAtTime(55, now); // A1 note

      this.ambientOsc2 = this.ctx.createOscillator();
      this.ambientOsc2.type = 'sine';
      this.ambientOsc2.frequency.setValueAtTime(55.6, now); // subtle detune beat

      this.ambientOsc1.connect(filter);
      this.ambientOsc2.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);

      this.ambientOsc1.start();
      this.ambientOsc2.start();
    } catch (e) {
      console.warn('[AudioManager] Failed to start ambient drone:', e);
    }
  }

  public stopAmbientDrone(): void {
    if (this.ambientGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.ambientGain.gain.linearRampToValueAtTime(0.001, now + 0.8);
        setTimeout(() => {
          this.ambientOsc1?.stop();
          this.ambientOsc2?.stop();
          this.ambientOsc1?.disconnect();
          this.ambientOsc2?.disconnect();
          this.ambientGain?.disconnect();
          this.ambientOsc1 = null;
          this.ambientOsc2 = null;
          this.ambientGain = null;
        }, 900);
      } catch {
        // Safe cleanup
      }
    }
  }
}

export const audioManager = new AudioManager();
