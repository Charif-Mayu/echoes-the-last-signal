import { SaveState, CURRENT_SAVE_VERSION } from '../types/save';

/**
 * Migration registry to seamlessly upgrade older save files to current schema.
 */
export const migrations: Record<number, (oldData: any) => any> = {
  // Example for future migrations:
  // 1: (v1Data) => ({ ...v1Data, version: 2, newField: 'defaultValue' })
};

function sanitizeStringArray(val: unknown, fallback: string[]): string[] {
  if (!Array.isArray(val)) return [...fallback];
  return val.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.min(max, Math.max(min, val));
}

function isPlainObject(val: unknown): val is Record<string, any> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function migrateSaveData(data: any, defaultState: SaveState): SaveState {
  if (!isPlainObject(data)) {
    return defaultState;
  }

  let current: Record<string, any> = { ...data };
  const startingVersion = typeof current.version === 'number' && Number.isFinite(current.version)
    ? current.version
    : 0;

  for (let v = startingVersion; v < CURRENT_SAVE_VERSION; v++) {
    if (migrations[v]) {
      current = migrations[v](current);
    }
  }

  const rawCheckpoint = isPlainObject(current.checkpoint) ? current.checkpoint : {};
  const rawLearning = isPlainObject(current.learningProgress) ? current.learningProgress : {};
  const rawSettings = isPlainObject(current.settings) ? current.settings : {};
  const rawAudio = isPlainObject(rawSettings.audio) ? rawSettings.audio : {};
  const rawSubtitles = isPlainObject(rawSettings.subtitles) ? rawSettings.subtitles : {};

  // Sanitize puzzleAttempts map
  const safePuzzleAttempts: SaveState['learningProgress']['puzzleAttempts'] = {};
  if (isPlainObject(rawLearning.puzzleAttempts)) {
    for (const [puzzleId, rec] of Object.entries(rawLearning.puzzleAttempts)) {
      if (isPlainObject(rec)) {
        safePuzzleAttempts[puzzleId] = {
          attempts: clampNumber(rec.attempts, 0, 999, 0),
          firstTryCorrect: Boolean(rec.firstTryCorrect),
          hintCount: clampNumber(rec.hintCount, 0, 999, 0),
          completed: rec.completed !== undefined ? Boolean(rec.completed) : undefined
        };
      }
    }
  }

  // Ensure mandatory fields exist and all nested properties are type-safe and clamped
  return {
    version: CURRENT_SAVE_VERSION,
    lastUpdated: Date.now(),
    checkpoint: {
      chapter: clampNumber(rawCheckpoint.chapter, 1, 8, defaultState.checkpoint.chapter),
      checkpointId:
        typeof rawCheckpoint.checkpointId === 'string' && rawCheckpoint.checkpointId.trim().length > 0
          ? rawCheckpoint.checkpointId
          : defaultState.checkpoint.checkpointId,
      playerX: clampNumber(rawCheckpoint.playerX, 40, 2360, defaultState.checkpoint.playerX),
      playerY: clampNumber(rawCheckpoint.playerY, 100, 640, defaultState.checkpoint.playerY),
      facing: rawCheckpoint.facing === 'left' || rawCheckpoint.facing === 'right'
        ? rawCheckpoint.facing
        : defaultState.checkpoint.facing
    },
    activeObjectiveId:
      typeof current.activeObjectiveId === 'string' && current.activeObjectiveId.trim().length > 0
        ? current.activeObjectiveId
        : defaultState.activeObjectiveId,
    completedObjectiveIds: sanitizeStringArray(
      current.completedObjectiveIds,
      defaultState.completedObjectiveIds
    ),
    collectedEvidenceIds: sanitizeStringArray(
      current.collectedEvidenceIds,
      defaultState.collectedEvidenceIds
    ),
    dialogueFlags: isPlainObject(current.dialogueFlags) ? current.dialogueFlags : {},
    learningProgress: {
      encounteredVocabIds: sanitizeStringArray(
        rawLearning.encounteredVocabIds,
        defaultState.learningProgress.encounteredVocabIds
      ),
      masteredVocabIds: sanitizeStringArray(
        rawLearning.masteredVocabIds,
        defaultState.learningProgress.masteredVocabIds
      ),
      completedPuzzleIds: sanitizeStringArray(
        rawLearning.completedPuzzleIds,
        defaultState.learningProgress.completedPuzzleIds
      ),
      puzzleAttempts: safePuzzleAttempts
    },
    settings: {
      audio: {
        masterVolume: clampNumber(rawAudio.masterVolume, 0, 1, defaultState.settings.audio.masterVolume),
        musicVolume: clampNumber(rawAudio.musicVolume, 0, 1, defaultState.settings.audio.musicVolume),
        sfxVolume: clampNumber(rawAudio.sfxVolume, 0, 1, defaultState.settings.audio.sfxVolume),
        voiceVolume: clampNumber(rawAudio.voiceVolume, 0, 1, defaultState.settings.audio.voiceVolume),
        muted: typeof rawAudio.muted === 'boolean' ? rawAudio.muted : defaultState.settings.audio.muted
      },
      subtitles: {
        enabled:
          typeof rawSubtitles.enabled === 'boolean'
            ? rawSubtitles.enabled
            : defaultState.settings.subtitles.enabled,
        showThaiTranslations:
          typeof rawSubtitles.showThaiTranslations === 'boolean'
            ? rawSubtitles.showThaiTranslations
            : defaultState.settings.subtitles.showThaiTranslations,
        textSize:
          rawSubtitles.textSize === 'small' || rawSubtitles.textSize === 'medium' || rawSubtitles.textSize === 'large'
            ? rawSubtitles.textSize
            : defaultState.settings.subtitles.textSize,
        textSpeedMs: clampNumber(rawSubtitles.textSpeedMs, 5, 100, defaultState.settings.subtitles.textSpeedMs)
      }
    }
  };
}
