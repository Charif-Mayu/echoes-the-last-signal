import Phaser from 'phaser';
import { gameConfig } from './engine/config';
import { BootScene } from './game/BootScene';
import { PreloadScene } from './game/PreloadScene';
import { StationScene } from './game/StationScene';
import { HUDOverlay } from './ui/HUDOverlay';
import { DialogueModal } from './ui/DialogueModal';
import { JournalModal } from './ui/JournalModal';
import { audioManager } from './engine/AudioManager';
import { saveManager } from './persistence/SaveManager';
import { dialogueRunner } from './systems/DialogueRunner';
import { evidenceManager } from './systems/EvidenceManager';
import { objectiveTracker } from './systems/ObjectiveTracker';
import { DialogueTree } from './types/narrative';
import miraRadioData from '../content/dialogues/mira_radio.json';

console.log(
  '%c ECHOES: THE LAST SIGNAL %c Checkpoint 3 Narrative & Evidence Engine Active ',
  'background: #0e7490; color: #fff; font-weight: bold;',
  'background: #0f172a; color: #38bdf8;'
);

// 1. Initialize DOM UI Layer
let hud: HUDOverlay | null = null;
let dialogueModal: DialogueModal | null = null;
let journalModal: JournalModal | null = null;

try {
  hud = new HUDOverlay('ui-container');
  dialogueModal = new DialogueModal('ui-container');
  journalModal = new JournalModal('ui-container');
} catch (e) {
  console.warn('[main] DOM UI overlay initialization warning:', e);
}

// 2. Initialize Phaser Game
const config: Phaser.Types.Core.GameConfig = {
  ...gameConfig,
  scene: [BootScene, PreloadScene, StationScene]
};

const game = new Phaser.Game(config);

// 3. Initial Awakening Clue Discovery
if (!evidenceManager.hasClue('clue_broken_pocket_watch')) {
  setTimeout(() => {
    evidenceManager.discoverClue('clue_broken_pocket_watch');
  }, 1200);
}

// 4. Bridge Virtual Touch Inputs from HUD to StationScene
window.addEventListener('virtual-input', (e: Event) => {
  const customEvent = e as CustomEvent<{ control: 'left' | 'right' | 'interact' | 'journal'; pressed: boolean }>;
  const stationScene = game.scene.getScene('StationScene') as StationScene | undefined;
  if (stationScene && stationScene.getInputManager()) {
    stationScene.getInputManager().setVirtualInput(customEvent.detail.control, customEvent.detail.pressed);
  }
});

// 5. Input Locking between UI Modals and Phaser Game
window.addEventListener('game:input_lock', (e: Event) => {
  const customEvent = e as CustomEvent<{ locked: boolean }>;
  const stationScene = game.scene.getScene('StationScene') as StationScene | undefined;
  if (stationScene && stationScene.getInputManager()) {
    stationScene.getInputManager().setEnabled(!customEvent.detail.locked);
  }
});

// 6. Dialogue Runner Event Hooks
dialogueRunner.onEvent((eventName) => {
  if (eventName === 'objective_completed_obj_answer_mira') {
    objectiveTracker.completeObjective('obj_wake_up');
    objectiveTracker.completeObjective('obj_answer_mira');
    evidenceManager.discoverClue('clue_mira_frequency');
  }
});

// 7. Interactive Target Dispatcher
window.addEventListener('game:interaction', (e: Event) => {
  const customEvent = e as CustomEvent<{ target: { id: string; name: string } }>;
  const targetId = customEvent.detail.target.id;

  switch (targetId) {
    case 'target_radio':
      if (!objectiveTracker.isObjectiveCompleted('obj_answer_mira')) {
        dialogueRunner.startDialogue(miraRadioData as unknown as DialogueTree);
      } else {
        audioManager.playSynthesizedSFX('radio_on');
        hud?.showToast('Mira: "I copy you. Check the station signs and find Sector B Gate."', 3600);
      }
      break;

    case 'target_signpost':
      if (objectiveTracker.isObjectiveCompleted('obj_answer_mira')) {
        hud?.showToast('Sign reads: "SECTOR B GATE: Located directly between Platform 1 and Maintenance Booth."', 4000);
      } else {
        hud?.showToast('The electronic signpost flickers with transit instructions.', 3000);
      }
      break;

    case 'target_terminal':
      hud?.showToast('Auxiliary Sub-Terminal: Auxiliary power routing ready for diagnostic check.', 3500);
      break;

    case 'target_gate':
      hud?.showToast('Sector B Blast Gate: [LOCKED] Auxiliary power offline.', 3500);
      break;
  }
});

// 8. Global Error Boundary
window.addEventListener('error', (event) => {
  console.error('[ECHOES Engine Error Boundary]', event.error);
});

// Export references for testing & debug
(window as any).__ECHOES__ = {
  game,
  saveManager,
  audioManager,
  evidenceManager,
  objectiveTracker,
  dialogueRunner,
  hud,
  dialogueModal,
  journalModal
};
