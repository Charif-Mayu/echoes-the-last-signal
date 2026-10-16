import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager, MemoryStorageAdapter, SAVE_STORAGE_KEY } from '../src/persistence/SaveManager';
import { CURRENT_SAVE_VERSION, SaveState } from '../src/types/save';

describe('SaveManager & Migration Suite', () => {
  let memoryStorage: MemoryStorageAdapter;
  let saveManager: SaveManager;

  beforeEach(() => {
    memoryStorage = new MemoryStorageAdapter();
    saveManager = new SaveManager(memoryStorage);
  });

  it('provides a valid default state when storage is empty', () => {
    const state = saveManager.load();
    expect(state).toBeDefined();
    expect(state.version).toBe(CURRENT_SAVE_VERSION);
    expect(state.checkpoint.chapter).toBe(1);
    expect(state.activeObjectiveId).toBe('obj_wake_up');
    expect(state.settings.audio.masterVolume).toBeGreaterThan(0);
    expect(state.settings.subtitles.enabled).toBe(true);
  });

  it('persists and loads updated game state accurately', () => {
    const customState: SaveState = {
      ...saveManager.getDefaultState(),
      checkpoint: {
        chapter: 1,
        checkpointId: 'sector_b_junction',
        playerX: 750,
        playerY: 480,
        facing: 'right'
      },
      collectedEvidenceIds: ['clue_broken_pocket_watch'],
      completedObjectiveIds: ['obj_wake_up', 'obj_answer_mira']
    };

    const saved = saveManager.save(customState);
    expect(saved).toBe(true);

    const loaded = saveManager.load();
    expect(loaded.checkpoint.checkpointId).toBe('sector_b_junction');
    expect(loaded.checkpoint.playerX).toBe(750);
    expect(loaded.collectedEvidenceIds).toContain('clue_broken_pocket_watch');
    expect(loaded.completedObjectiveIds).toHaveLength(2);
  });

  it('gracefully recovers to default state on corrupted or malformed save JSON', () => {
    memoryStorage.setItem(SAVE_STORAGE_KEY, '{invalid_json_###');
    const recovered = saveManager.load();
    expect(recovered).toBeDefined();
    expect(recovered.version).toBe(CURRENT_SAVE_VERSION);
    expect(recovered.checkpoint.chapter).toBe(1);
  });

  it('resets chapter progress while preserving user settings', () => {
    const initial = saveManager.getDefaultState();
    initial.settings.audio.masterVolume = 0.42;
    initial.settings.subtitles.showThaiTranslations = false;
    initial.completedObjectiveIds = ['obj_wake_up'];
    saveManager.save(initial);

    const resetState = saveManager.resetChapter(1);
    expect(resetState.completedObjectiveIds).toHaveLength(0);
    expect(resetState.settings.audio.masterVolume).toBe(0.42);
    expect(resetState.settings.subtitles.showThaiTranslations).toBe(false);
  });
});
