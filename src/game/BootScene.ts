import Phaser from 'phaser';
import { SceneKey } from '../types/game';
import { audioManager } from '../engine/AudioManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  preload(): void {
    // Generate minimal runtime procedural textures for immediate rendering safety
    this.createPlaceholderTextures();
  }

  create(): void {
    // Unlock audio context on first user click anywhere in the window
    const unlockAudio = () => {
      audioManager.unlock();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    this.scene.start(SceneKey.Preload);
  }

  private createPlaceholderTextures(): void {
    // 1. Investigator silhouette sprite texture (32x64)
    if (!this.textures.exists('investigator_idle')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Body (trenchcoat / dark cyan jacket)
      g.fillStyle(0x0e7490, 1);
      g.fillRect(8, 20, 16, 32);
      // Head
      g.fillStyle(0xe2e8f0, 1);
      g.fillCircle(16, 12, 8);
      // Glowing visor / collar
      g.fillStyle(0x38bdf8, 1);
      g.fillRect(14, 10, 8, 3);
      // Legs
      g.fillStyle(0x1e293b, 1);
      g.fillRect(8, 52, 6, 12);
      g.fillRect(18, 52, 6, 12);
      g.generateTexture('investigator_idle', 32, 64);
      g.destroy();
    }

    // 2. Interactive Terminal texture (48x64)
    if (!this.textures.exists('prop_terminal')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x1e293b, 1);
      g.fillRect(4, 16, 40, 48);
      // Screen glow
      g.fillStyle(0x0284c7, 0.9);
      g.fillRect(8, 20, 32, 24);
      // Stand
      g.fillStyle(0x334155, 1);
      g.fillRect(18, 48, 12, 16);
      g.generateTexture('prop_terminal', 48, 64);
      g.destroy();
    }

    // 3. Radio / Clue prop (24x24)
    if (!this.textures.exists('prop_radio')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xd97706, 1);
      g.fillRect(2, 6, 20, 16);
      // Antenna
      g.lineStyle(2, 0x94a3b8, 1);
      g.lineBetween(4, 6, 4, 0);
      // Dial
      g.fillStyle(0x1e293b, 1);
      g.fillCircle(14, 14, 4);
      g.generateTexture('prop_radio', 24, 24);
      g.destroy();
    }

    // 4. Station Signpost (64x80)
    if (!this.textures.exists('prop_signpost')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Pole
      g.fillStyle(0x475569, 1);
      g.fillRect(30, 24, 4, 56);
      // Signboard
      g.fillStyle(0x0f172a, 1);
      g.fillRect(0, 0, 64, 24);
      g.lineStyle(1, 0x38bdf8, 1);
      g.strokeRect(0, 0, 64, 24);
      g.generateTexture('prop_signpost', 64, 80);
      g.destroy();
    }
  }
}
