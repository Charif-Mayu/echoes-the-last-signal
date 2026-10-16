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

export const SCENE_WORLD_WIDTH = 2600;
export const SCENE_WORLD_HEIGHT = 720;
export const GROUND_Y = 560;

export const INITIAL_STATION_TARGETS: InteractionTarget[] = [
  {
    id: 'target_radio',
    name: 'Emergency Radio',
    prompt: '[E] Inspect Emergency Radio (Frequency 142.8 MHz)',
    x: 280,
    y: GROUND_Y - 20,
    radius: 70,
    type: 'radio',
    active: true
  },
  {
    id: 'target_signpost',
    name: 'Transit Signpost',
    prompt: '[E] Read Sector B Navigation Sign',
    x: 820,
    y: GROUND_Y - 48,
    radius: 80,
    type: 'sign',
    active: true
  },
  {
    id: 'target_terminal',
    name: 'Auxiliary Sub-Terminal',
    prompt: '[E] Access Terminal Diagnostics & Power',
    x: 1420,
    y: GROUND_Y - 40,
    radius: 85,
    type: 'terminal',
    active: true
  },
  {
    id: 'target_gate',
    name: 'Sector B Gate',
    prompt: '[E] Check Sector B Gate Lock Status',
    x: 2200,
    y: GROUND_Y - 40,
    radius: 100,
    type: 'door',
    active: true
  }
];
