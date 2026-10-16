export enum SceneKey {
  Boot = 'BootScene',
  Preload = 'PreloadScene',
  Station = 'StationScene',
  Cutscene = 'CutsceneScene'
}

export interface AudioSettings {
  masterVolume: number; // 0.0 to 1.0
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  muted: boolean;
}

export interface SubtitleSettings {
  enabled: boolean;
  showThaiTranslations: boolean;
  textSize: 'small' | 'medium' | 'large';
  textSpeedMs: number; // milliseconds per character
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  interact: boolean; // E key or tap
  journal: boolean;  // J key or journal button
  pause: boolean;    // ESC
}

export interface InteractionTarget {
  id: string;
  name: string;
  prompt: string;
  x: number;
  y: number;
  radius: number;
  type: 'terminal' | 'radio' | 'sign' | 'door' | 'evidence' | 'character';
  active: boolean;
}
