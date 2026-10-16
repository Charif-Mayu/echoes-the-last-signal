import { describe, it, expect, beforeEach } from 'vitest';
import { UIStateManager } from '../src/systems/UIStateManager';
import { SaveManager, MemoryStorageAdapter, SAVE_STORAGE_KEY, saveManager } from '../src/persistence/SaveManager';
import { AudioManager } from '../src/engine/AudioManager';
import { DialogueRunner } from '../src/systems/DialogueRunner';
import { EvidenceManager } from '../src/systems/EvidenceManager';
import { ObjectiveTracker } from '../src/systems/ObjectiveTracker';
import { LearningEngine } from '../src/learning/LearningEngine';
import { ChapterSummaryCalculator } from '../src/learning/ChapterSummaryCalculator';
import { DialogueTree } from '../src/types/narrative';
import miraRadioData from '../content/dialogues/mira_radio.json';

describe('Checkpoint 6: Deep QA, Edge Cases & End-to-End Playthrough Suite', () => {
  describe('1. UIStateManager Modal Stacking & Input Lock Race Prevention', () => {
    let uiState: UIStateManager;

    beforeEach(() => {
      uiState = new UIStateManager();
    });

    it('keeps input locked when closing a child modal (Settings) while parent modal (Main Menu) remains open', () => {
      expect(uiState.isAnyModalOpen()).toBe(false);
      expect(uiState.getTopModal()).toBeNull();

      // Open Main Menu (z-index 80)
      uiState.registerOpen('main-menu');
      expect(uiState.isAnyModalOpen()).toBe(true);
      expect(uiState.getTopModal()).toBe('main-menu');

      // Open Settings on top of Main Menu (z-index 90)
      uiState.registerOpen('settings');
      expect(uiState.isAnyModalOpen()).toBe(true);
      expect(uiState.getTopModal()).toBe('settings');

      // Close Settings -> Main Menu is still open, so input MUST remain locked!
      uiState.registerClose('settings');
      expect(uiState.isAnyModalOpen()).toBe(true);
      expect(uiState.getTopModal()).toBe('main-menu');

      // Close Main Menu -> All modals closed, input unlocks
      uiState.registerClose('main-menu');
      expect(uiState.isAnyModalOpen()).toBe(false);
      expect(uiState.getTopModal()).toBeNull();
    });

    it('enforces strict z-index priority ordering across all 6 modals', () => {
      uiState.registerOpen('dialogue');
      uiState.registerOpen('journal');
      expect(uiState.getTopModal()).toBe('journal');

      uiState.registerOpen('puzzle');
      expect(uiState.getTopModal()).toBe('puzzle');

      uiState.registerOpen('summary');
      expect(uiState.getTopModal()).toBe('summary');

      uiState.registerOpen('main-menu');
      expect(uiState.getTopModal()).toBe('main-menu');

      uiState.registerOpen('settings');
      expect(uiState.getTopModal()).toBe('settings');

      uiState.reset();
      expect(uiState.isAnyModalOpen()).toBe(false);
    });
  });

  describe('2. Deep Save State Corruption & Schema Sanitization', () => {
    let storage: MemoryStorageAdapter;
    let saveMgr: SaveManager;

    beforeEach(() => {
      storage = new MemoryStorageAdapter();
      saveMgr = new SaveManager(storage);
    });

    it('recovers when localStorage contains a JSON array or primitive instead of an object', () => {
      storage.setItem(SAVE_STORAGE_KEY, JSON.stringify([1, 2, 3]));
      const loadedFromArray = saveMgr.load();
      expect(loadedFromArray.checkpoint.chapter).toBe(1);
      expect(Array.isArray(loadedFromArray.completedObjectiveIds)).toBe(true);

      storage.setItem(SAVE_STORAGE_KEY, JSON.stringify('corrupted_primitive'));
      const loadedFromString = saveMgr.load();
      expect(loadedFromString.activeObjectiveId).toBe('obj_wake_up');
    });

    it('sanitizes corrupted nested arrays, out-of-bounds coordinates, and extreme audio values', () => {
      const deeplyCorrupted = {
        version: 1,
        checkpoint: {
          chapter: -5,
          checkpointId: '',
          playerX: -999999,
          playerY: 888888,
          facing: 'upside_down'
        },
        activeObjectiveId: null,
        completedObjectiveIds: 'not_an_array',
        collectedEvidenceIds: [null, 42, '', 'clue_mira_frequency'],
        dialogueFlags: ['invalid_array_for_flags'],
        learningProgress: {
          encounteredVocabIds: null,
          masteredVocabIds: undefined,
          completedPuzzleIds: [true, 'puzzle_station_sign_nav'],
          puzzleAttempts: ['not_a_map']
        },
        settings: {
          audio: {
            masterVolume: 999,
            musicVolume: -50,
            sfxVolume: NaN,
            voiceVolume: 0.5,
            muted: 'yes'
          },
          subtitles: {
            textSpeedMs: 99999,
            textSize: 'gigantic'
          }
        }
      };

      storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(deeplyCorrupted));
      const sanitized = saveMgr.load();

      // Coordinates clamped safely to station world bounds
      expect(sanitized.checkpoint.chapter).toBe(1);
      expect(sanitized.checkpoint.checkpointId).toBe('station_awakening');
      expect(sanitized.checkpoint.playerX).toBe(40);
      expect(sanitized.checkpoint.playerY).toBe(640);
      expect(sanitized.checkpoint.facing).toBe('right');

      // Arrays safely sanitized so .includes() never throws
      expect(sanitized.completedObjectiveIds).toEqual([]);
      expect(sanitized.collectedEvidenceIds).toEqual(['clue_mira_frequency']);
      expect(sanitized.learningProgress.encounteredVocabIds).toEqual([]);
      expect(sanitized.learningProgress.completedPuzzleIds).toEqual(['puzzle_station_sign_nav']);
      expect(sanitized.learningProgress.puzzleAttempts).toEqual({});

      // Audio and subtitle settings clamped
      expect(sanitized.settings.audio.masterVolume).toBe(1);
      expect(sanitized.settings.audio.musicVolume).toBe(0);
      expect(sanitized.settings.audio.sfxVolume).toBe(0.85);
      expect(sanitized.settings.audio.muted).toBe(false);
      expect(sanitized.settings.subtitles.textSpeedMs).toBe(100);
      expect(sanitized.settings.subtitles.textSize).toBe('medium');
    });
  });

  describe('3. AudioManager Parameter Clamping & Headless Safety', () => {
    it('clamps out-of-range volume settings and safely handles headless SFX calls', () => {
      const audio = new AudioManager();
      audio.updateSettings({
        masterVolume: 5.0,
        musicVolume: -2.0,
        sfxVolume: 0.4,
        muted: true
      });

      const current = audio.getSettings();
      expect(current.masterVolume).toBe(1);
      expect(current.musicVolume).toBe(0);
      expect(current.sfxVolume).toBe(0.4);
      expect(current.muted).toBe(true);

      // Should not throw in headless Node environment
      expect(() => audio.playSynthesizedSFX('click')).not.toThrow();
      expect(() => audio.startAmbientDrone()).not.toThrow();
      expect(() => audio.stopAmbientDrone()).not.toThrow();
    });
  });

  describe('4. Full Chapter 1 End-to-End Playthrough Simulation', () => {
    it('completes the entire Chapter 1 narrative, clue, and puzzle loop from awakening to station escape', () => {
      const evidenceMgr = new EvidenceManager();
      const objTracker = new ObjectiveTracker();
      const dlgRunner = new DialogueRunner();
      const engine = new LearningEngine();

      // Reset to clean Chapter 1 start
      saveManager.resetChapter(1);
      expect(objTracker.getCurrentObjective().id).toBe('obj_wake_up');

      // Step 1: Awakening & Pocket Watch Clue
      const watchDiscovered = evidenceMgr.discoverClue('clue_broken_pocket_watch');
      expect(watchDiscovered).toBe(true);
      expect(evidenceMgr.hasClue('clue_broken_pocket_watch')).toBe(true);

      // Step 2: Mira's Radio Transmission
      let miraCompletedEventFired = false;
      dlgRunner.onEvent((evt) => {
        if (evt === 'objective_completed_obj_answer_mira') {
          miraCompletedEventFired = true;
          objTracker.completeObjective('obj_wake_up');
          objTracker.completeObjective('obj_answer_mira');
          evidenceMgr.discoverClue('clue_mira_frequency');
        }
      });

      dlgRunner.startDialogue(miraRadioData as unknown as DialogueTree);
      // Select Choice 1 on mira_01 ("I hear you. Who are you? Where am I?") -> moves to mira_02
      dlgRunner.selectChoice('c1_hear_you');
      // Advance through mira_02 -> mira_03 -> mira_04 -> end
      dlgRunner.advance();
      dlgRunner.advance();
      dlgRunner.advance();

      expect(miraCompletedEventFired).toBe(true);
      expect(objTracker.isObjectiveCompleted('obj_answer_mira')).toBe(true);
      expect(evidenceMgr.hasClue('clue_mira_frequency')).toBe(true);
      expect(objTracker.getCurrentObjective().id).toBe('obj_read_sign');

      // Step 3: Solve Puzzle 1 (Station Sign Navigation - Prepositions of Place)
      const p1Result = engine.evaluateAnswer('puzzle_station_sign_nav', 'opt_a', 0, true, true);
      expect(p1Result.isCorrect).toBe(true);
      objTracker.completeObjective('obj_read_sign');
      expect(objTracker.getCurrentObjective().id).toBe('obj_override_terminal');

      // Step 4: Solve Puzzle 2 (Auxiliary Terminal - There is / There are)
      const p2Result = engine.evaluateAnswer('puzzle_terminal_diagnostics', 'opt_t2', 0, true, true);
      expect(p2Result.isCorrect).toBe(true);
      objTracker.completeObjective('obj_override_terminal');
      evidenceMgr.discoverClue('clue_transit_log');
      expect(objTracker.getCurrentObjective().id).toBe('obj_escape_station');

      // Step 5: Solve Puzzle 3 (Sector B Gate Override - Present Simple)
      const p3Result = engine.evaluateAnswer('puzzle_gate_override', 'opt_g2', 0, true, true);
      expect(p3Result.isCorrect).toBe(true);
      objTracker.completeObjective('obj_escape_station');

      // Step 6: Verify Chapter 1 Summary Metrics via persisted SaveState
      const summary = ChapterSummaryCalculator.calculateChapter1Summary(saveManager.load());
      expect(summary.completedPuzzlesCount).toBe(3);
      expect(summary.evidenceCollected).toBe(3);
      expect(summary.accuracyRate).toBe(100);
      expect(objTracker.isObjectiveCompleted('obj_escape_station')).toBe(true);
      expect(objTracker.isChapterCompleted()).toBe(true);
      expect(evidenceMgr.getDiscoveredClues().length).toBe(3);
      expect(engine.isPuzzleCompleted('puzzle_station_sign_nav')).toBe(true);
      expect(engine.isPuzzleCompleted('puzzle_terminal_diagnostics')).toBe(true);
      expect(engine.isPuzzleCompleted('puzzle_gate_override')).toBe(true);
    });
  });
});
