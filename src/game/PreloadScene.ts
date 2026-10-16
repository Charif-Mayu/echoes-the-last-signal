import Phaser from 'phaser';
import { SceneKey } from '../types/game';
import { GAME_WIDTH, GAME_HEIGHT } from '../engine/config';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Preload);
  }

  preload(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Background backdrop
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x080c12);

    // Title
    this.add.text(cx, cy - 80, 'ECHOES: THE LAST SIGNAL', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '32px',
      color: '#f8fafc',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(cx, cy - 40, 'CHAPTER 1: THE LAST STATION (A1–A2)', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '14px',
      color: '#38bdf8'
    }).setOrigin(0.5);

    // Progress Bar Containers
    const barWidth = 360;
    const barHeight = 6;
    this.add.rectangle(cx, cy + 20, barWidth, barHeight, 0x1e293b).setOrigin(0.5);
    const progressBar = this.add.rectangle(cx - barWidth / 2, cy + 20, 0, barHeight, 0x38bdf8).setOrigin(0, 0.5);

    // Status label
    const statusText = this.add.text(cx, cy + 50, 'INITIALIZING ECHO LINK...', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      color: '#64748b'
    }).setOrigin(0.5);

    // Loader events
    this.load.on('progress', (value: number) => {
      progressBar.width = barWidth * value;
      const pct = Math.floor(value * 100);
      statusText.setText(`CALIBRATING SENSORS... ${pct}%`);
    });

    this.load.on('complete', () => {
      statusText.setText('SYSTEM ONLINE — ENTERING STATION 7');
      this.time.delayedCall(400, () => {
        this.scene.start(SceneKey.Station);
      });
    });

    // Simulate small asset queue for smooth loading demonstration
    for (let i = 1; i <= 5; i++) {
      // Procedural dummy delay loaders if needed
    }
  }

  create(): void {
    // Scene transition handled via complete event
  }
}
