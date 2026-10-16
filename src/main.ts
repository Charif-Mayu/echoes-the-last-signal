import Phaser from 'phaser';
import { gameConfig } from './engine/config';
import { BootScene } from './game/BootScene';
import { PreloadScene } from './game/PreloadScene';
import { StationScene } from './game/StationScene';
import { HUDOverlay } from './ui/HUDOverlay';
import { DialogueModal } from './ui/DialogueModal';
import { JournalModal } from './ui/JournalModal';
import { PuzzleModal } from './ui/PuzzleModal';
import { SettingsModal } from './ui/SettingsModal';
import { MainMenuModal } from './ui/MainMenuModal';
import { ChapterSummaryModal } from './ui/ChapterSummaryModal';
import { audioManager } from './engine/AudioManager';
import { saveManager } from './persistence/SaveManager';
import { dialogueRunner } from './systems/DialogueRunner';
import { evidenceManager } from './systems/EvidenceManager';
import { objectiveTracker } from './systems/ObjectiveTracker';
import { uiStateManager } from './systems/UIStateManager';
import { learningEngine } from './learning/LearningEngine';
import { DialogueTree } from './types/narrative';
import miraRadioData from '../content/dialogues/mira_radio.json';

console.log(
  '%c ECHOES: THE LAST SIGNAL %c Checkpoint 6 Deep QA, Accessibility & Edge Cases Verified ',
  'background: #0e7490; color: #fff; font-weight: bold;',
  'background: #0f172a; color: #38bdf8;'
);

// 0. Sync persisted audio settings before UI renders
const persistedSave = saveManager.load();
audioManager.updateSettings(persistedSave.settings.audio);

// 1. Initialize DOM UI Layer
let hud: HUDOverlay | null = null;
let dialogueModal: DialogueModal | null = null;
let journalModal: JournalModal | null = null;
let puzzleModal: PuzzleModal | null = null;
let settingsModal: SettingsModal | null = null;
let mainMenuModal: MainMenuModal | null = null;
let chapterSummaryModal: ChapterSummaryModal | null = null;

try {
  hud = new HUDOverlay('ui-container');
  dialogueModal = new DialogueModal('ui-container');
  journalModal = new JournalModal('ui-container');
  puzzleModal = new PuzzleModal('ui-container');
  settingsModal = new SettingsModal('ui-container');
  mainMenuModal = new MainMenuModal('ui-container');
  chapterSummaryModal = new ChapterSummaryModal('ui-container');
} catch (e) {
  console.warn('[main] DOM UI overlay initialization warning:', e);
}

// 2. Initialize Phaser Game
const config: Phaser.Types.Core.GameConfig = {
  ...gameConfig,
  scene: [BootScene, PreloadScene, StationScene]
};

const game = new Phaser.Game(config);

// 3. Show Title Menu on initial load and trigger Awakening sequence only when player enters game
if (mainMenuModal) {
  mainMenuModal.open(() => {
    // Discover initial pocket watch clue once the player enters Station 7
    if (!evidenceManager.hasClue('clue_broken_pocket_watch')) {
      setTimeout(() => {
        evidenceManager.discoverClue('clue_broken_pocket_watch');
      }, 600);
    }

    if (objectiveTracker.getCurrentObjective().id === 'obj_wake_up') {
      setTimeout(() => {
        hud?.showToast('Awakening: Use [A/D] or [←/→] to move, [E / Space] to interact with station equipment.', 5000);
      }, 1500);
    }
  });
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

  // Prevent overlapping modal triggers via centralized UIStateManager
  if (uiStateManager.isAnyModalOpen()) {
    return;
  }

  switch (targetId) {
    case 'target_radio':
      if (!objectiveTracker.isObjectiveCompleted('obj_answer_mira')) {
        dialogueRunner.startDialogue(miraRadioData as unknown as DialogueTree);
      } else {
        audioManager.playSynthesizedSFX('radio_on');
        const activeObj = objectiveTracker.getCurrentObjective();
        hud?.showToast(`Mira (Radio): "Stay focused. Next step: ${activeObj.titleEn}."`, 3600);
      }
      break;

    case 'target_signpost':
      puzzleModal?.openPuzzle('puzzle_station_sign_nav', () => {
        objectiveTracker.completeObjective('obj_wake_up');
        objectiveTracker.completeObjective('obj_read_sign');
        hud?.showToast('Transit Route Verified: Proceed to the Auxiliary Sub-Terminal.', 3800);
      });
      break;

    case 'target_terminal':
      puzzleModal?.openPuzzle('puzzle_terminal_diagnostics', () => {
        objectiveTracker.completeObjective('obj_wake_up');
        objectiveTracker.completeObjective('obj_override_terminal');
        evidenceManager.discoverClue('clue_transit_log');
        hud?.showToast('Auxiliary Power Restored! Sector B Blast Gate is ready for override.', 4000);
      });
      break;

    case 'target_gate':
      if (!objectiveTracker.isObjectiveCompleted('obj_override_terminal')) {
        audioManager.playSynthesizedSFX('error');
        hud?.showToast('Sector B Gate: [POWER OFFLINE] Restore auxiliary power at the Sub-Terminal first.', 3800);
      } else {
        puzzleModal?.openPuzzle('puzzle_gate_override', () => {
          objectiveTracker.completeObjective('obj_escape_station');
          hud?.showToast('✔ Sector B Blast Gate Unlocked! Exiting Station 7...', 4500);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('chapter:completed', { detail: { chapter: 1 } }));
          }, 800);
        });
      }
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
  learningEngine,
  uiStateManager,
  hud,
  dialogueModal,
  journalModal,
  puzzleModal,
  settingsModal,
  mainMenuModal,
  chapterSummaryModal
};
