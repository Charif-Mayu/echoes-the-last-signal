import { SaveState, CURRENT_SAVE_VERSION } from '../types/save';

/**
 * Migration registry to seamlessly upgrade older save files to current schema.
 */
export const migrations: Record<number, (oldData: any) => any> = {
  // Example for future migrations:
  // 1: (v1Data) => ({ ...v1Data, version: 2, newField: 'defaultValue' })
};

export function migrateSaveData(data: any, defaultState: SaveState): SaveState {
  if (!data || typeof data !== 'object') {
    return defaultState;
  }

  let current = { ...data };
  const startingVersion = typeof current.version === 'number' ? current.version : 0;

  for (let v = startingVersion; v < CURRENT_SAVE_VERSION; v++) {
    if (migrations[v]) {
      current = migrations[v](current);
    }
  }

  // Ensure mandatory fields exist
  return {
    ...defaultState,
    ...current,
    version: CURRENT_SAVE_VERSION,
    lastUpdated: Date.now(),
    checkpoint: {
      ...defaultState.checkpoint,
      ...(current.checkpoint || {})
    },
    learningProgress: {
      ...defaultState.learningProgress,
      ...(current.learningProgress || {})
    },
    settings: {
      audio: {
        ...defaultState.settings.audio,
        ...(current.settings?.audio || {})
      },
      subtitles: {
        ...defaultState.settings.subtitles,
        ...(current.settings?.subtitles || {})
      }
    }
  };
}
