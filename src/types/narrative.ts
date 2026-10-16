export type CharacterSpeaker = 'investigator' | 'mira' | 'elias' | 'echo' | 'system';

export interface DialogueChoice {
  id: string;
  textEn: string;
  textTh?: string;
  nextDialogueId: string;
  requiredEvidenceId?: string;
}

export interface DialogueLine {
  id: string;
  speaker: CharacterSpeaker;
  speakerDisplayName: string;
  textEn: string;
  textTh?: string;
  audioKey?: string;
  choices?: DialogueChoice[];
  nextDialogueId?: string;
  triggerEvent?: string; // e.g. 'unlock_objective_2', 'give_radio'
}

export interface DialogueTree {
  id: string;
  startId: string;
  lines: Record<string, DialogueLine>;
}

export interface EvidenceItem {
  id: string;
  titleEn: string;
  titleTh: string;
  descriptionEn: string;
  descriptionTh: string;
  locationEn: string;
  locationTh: string;
  category: 'document' | 'audio' | 'artifact' | 'system_log';
  iconKey: string;
  discoveredAt?: number; // timestamp
  relatedGrammarTopic?: string;
}

export interface Objective {
  id: string;
  chapter: number;
  order: number;
  titleEn: string;
  titleTh: string;
  descriptionEn: string;
  descriptionTh: string;
  completed: boolean;
}
