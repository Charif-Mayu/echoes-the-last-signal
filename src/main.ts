import Phaser from 'phaser';
import { gameConfig } from './engine/config';
import { BootScene } from './game/BootScene';
import { PreloadScene } from './game/PreloadScene';
import { StationScene } from './game/StationScene';
import { HUDOverlay } from './ui/HUDOverlay';
import { audioManager } from './engine/AudioManager';
import { saveManager } from './persistence/SaveManager';

console.log('%c ECHOES: THE LAST SIGNAL %c Chapter 1 Prototype Initialized ', 'background: #0e7490; color: #fff; font-weight: bold;', 'background: #0f172a; color: #38bdf8;');

// 1. Initialize DOM UI Overlay
let hud: HUDOverlay | null = null;
try {
  hud = new HUDOverlay('ui-container');
} catch (e) {
  console.warn('[main] DOM UI overlay initialization warning:', e);
}

// 2. Initialize Phaser Game
const config: Phaser.Types.Core.GameConfig = {
  ...gameConfig,
  scene: [BootScene, PreloadScene, StationScene]
};

const game = new Phaser.Game(config);

// 3. Bridge Virtual Touch Inputs from HUD to StationScene
window.addEventListener('virtual-input', (e: Event) => {
  const customEvent = e as CustomEvent<{ control: 'left' | 'right' | 'interact' | 'journal'; pressed: boolean }>;
  const stationScene = game.scene.getScene('StationScene') as StationScene | undefined;
  if (stationScene && stationScene.getInputManager()) {
    stationScene.getInputManager().setVirtualInput(customEvent.detail.control, customEvent.detail.pressed);
  }
});

// 4. Handle Interaction Events
window.addEventListener('game:interaction', (e: Event) => {
  const customEvent = e as CustomEvent<{ target: { id: string; name: string } }>;
  const target = customEvent.detail.target;
  if (hud) {
    hud.showToast(`[Interacted] ${target.name} activated`);
  }
});

// 5. Global Error Handling
window.addEventListener('error', (event) => {
  console.error('[ECHOES Engine Error Boundary]', event.error);
});

// Export references for debugging
(window as any).__ECHOES__ = {
  game,
  saveManager,
  audioManager,
  hud
};
