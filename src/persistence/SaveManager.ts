import { SaveState, CURRENT_SAVE_VERSION } from '../types/save';
import { migrateSaveData } from './saveMigrations';

export const SAVE_STORAGE_KEY = 'echoes_the_last_signal_save';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorageAdapter implements StorageAdapter {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export class SaveManager {
  private storage: StorageAdapter;

  constructor(customStorage?: StorageAdapter) {
    if (customStorage) {
      this.storage = customStorage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = new MemoryStorageAdapter();
    }
  }

  public getDefaultState(): SaveState {
    return {
      version: CURRENT_SAVE_VERSION,
      lastUpdated: Date.now(),
      checkpoint: {
        chapter: 1,
        checkpointId: 'station_awakening',
        playerX: 180,
        playerY: 480,
        facing: 'right'
      },
      activeObjectiveId: 'obj_wake_up',
      completedObjectiveIds: [],
      collectedEvidenceIds: [],
      dialogueFlags: {},
      learningProgress: {
        encounteredVocabIds: [],
        masteredVocabIds: [],
        completedPuzzleIds: [],
        puzzleAttempts: {}
      },
      settings: {
        audio: {
          masterVolume: 0.8,
          musicVolume: 0.7,
          sfxVolume: 0.85,
          voiceVolume: 0.9,
          muted: false
        },
        subtitles: {
          enabled: true,
          showThaiTranslations: true,
          textSize: 'medium',
          textSpeedMs: 25
        }
      }
    };
  }

  public hasSave(): boolean {
    try {
      return this.storage.getItem(SAVE_STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  }

  public save(state: SaveState): boolean {
    try {
      const stateToSave: SaveState = {
        ...state,
        version: CURRENT_SAVE_VERSION,
        lastUpdated: Date.now()
      };
      this.storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(stateToSave));
      return true;
    } catch (e) {
      console.error('[SaveManager] Failed to persist game state:', e);
      return false;
    }
  }

  public load(): SaveState {
    const defaultState = this.getDefaultState();
    try {
      const raw = this.storage.getItem(SAVE_STORAGE_KEY);
      if (!raw) {
        return defaultState;
      }
      const parsed = JSON.parse(raw);
      return migrateSaveData(parsed, defaultState);
    } catch (e) {
      console.warn('[SaveManager] Malformed save data encountered, falling back to default:', e);
      return defaultState;
    }
  }

  public resetChapter(chapter: number = 1): SaveState {
    const current = this.load();
    const defaultState = this.getDefaultState();

    // Preserve player user settings across chapter resets
    const resetState: SaveState = {
      ...defaultState,
      checkpoint: {
        ...defaultState.checkpoint,
        chapter
      },
      settings: current.settings
    };

    this.save(resetState);
    return resetState;
  }

  public clear(): void {
    try {
      this.storage.removeItem(SAVE_STORAGE_KEY);
    } catch (e) {
      console.error('[SaveManager] Failed to clear save data:', e);
    }
  }
}

export const saveManager = new SaveManager();
