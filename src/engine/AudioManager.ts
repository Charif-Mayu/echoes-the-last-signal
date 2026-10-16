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

  public playSynthesizedSFX(type: 'click' | 'blip' | 'success' | 'error' | 'static' | 'radio_on'): void {
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
      }
    } catch (e) {
      console.warn('[AudioManager] Sound playback error:', e);
    }
  }
}

export const audioManager = new AudioManager();
