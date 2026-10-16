export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B1+';

export interface GrammarRule {
  id: string;
  topic: string;
  level: CefrLevel;
  titleEn: string;
  titleTh: string;
  explanationEn: string;
  explanationTh: string;
  formula: string;
  examples: Array<{ en: string; th: string }>;
}

export interface VocabularyItem {
  id: string;
  word: string;
  phonetic?: string;
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'preposition' | 'adverb' | 'phrase';
  meaningEn: string;
  meaningTh: string;
  exampleSentenceEn: string;
  exampleSentenceTh: string;
  chapter: number;
}

export interface PuzzleOption {
  id: string;
  textEn: string;
  textTh?: string;
  isCorrect: boolean;
  distractorReasonEn?: string;
  distractorReasonTh?: string;
}

export type PuzzleType = 'directions' | 'grammar_in_context' | 'terminal_decode';

export interface PuzzleItem {
  id: string;
  chapter: number;
  type: PuzzleType;
  titleEn: string;
  titleTh: string;
  contextEn: string;
  contextTh: string;
  instructionEn: string;
  instructionTh: string;
  targetRuleId: string;
  options: PuzzleOption[];
  hintsEn: string[];
  hintsTh: string[];
  maxRetries: number;
}

export interface PuzzleEvaluationResult {
  puzzleId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  explanationEn: string;
  explanationTh: string;
  ruleReference?: GrammarRule;
  canRetry: boolean;
  attemptsUsed: number;
  nextHintEn?: string;
  nextHintTh?: string;
}

export interface LearningProgress {
  encounteredVocabIds: string[];
  masteredVocabIds: string[];
  completedPuzzleIds: string[];
  puzzleAttempts: Record<string, { attempts: number; firstTryCorrect: boolean; hintCount: number }>;
}
