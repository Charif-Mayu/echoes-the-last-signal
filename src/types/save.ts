import { AudioSettings, SubtitleSettings } from './game';
import { LearningProgress } from './learning';

export const CURRENT_SAVE_VERSION = 1;

export interface PlayerCheckpoint {
  chapter: number;
  checkpointId: string;
  playerX: number;
  playerY: number;
  facing: 'left' | 'right';
}

export interface SaveState {
  version: number;
  lastUpdated: number; // Unix timestamp
  checkpoint: PlayerCheckpoint;
  activeObjectiveId: string;
  completedObjectiveIds: string[];
  collectedEvidenceIds: string[];
  dialogueFlags: Record<string, boolean | string | number>;
  learningProgress: LearningProgress;
  settings: {
    audio: AudioSettings;
    subtitles: SubtitleSettings;
  };
}

export interface SaveMigrationHandler {
  fromVersion: number;
  toVersion: number;
  migrate: (oldState: any) => SaveState;
}
