import { GrammarRule, PuzzleItem, PuzzleEvaluationResult, VocabularyItem } from '../types/learning';
import { HintSystem } from './HintSystem';
import { saveManager } from '../persistence/SaveManager';
import grammarRulesData from '../../content/learning/grammar_rules.json';
import puzzlesData from '../../content/learning/puzzles.json';
import vocabularyData from '../../content/learning/vocabulary.json';

export class LearningEngine {
  private grammarRules: Map<string, GrammarRule> = new Map();
  private puzzles: Map<string, PuzzleItem> = new Map();
  private vocabulary: Map<string, VocabularyItem> = new Map();

  constructor() {
    this.loadContent();
  }

  private loadContent(): void {
    (grammarRulesData as GrammarRule[]).forEach((rule) => {
      this.grammarRules.set(rule.id, rule);
    });

    (puzzlesData as unknown as PuzzleItem[]).forEach((puzzle) => {
      this.puzzles.set(puzzle.id, puzzle);
    });

    (vocabularyData as VocabularyItem[]).forEach((vocab) => {
      this.vocabulary.set(vocab.id, vocab);
    });
  }

  public getRule(ruleId: string): GrammarRule | undefined {
    return this.grammarRules.get(ruleId);
  }

  public getAllRules(): GrammarRule[] {
    return Array.from(this.grammarRules.values());
  }

  public getPuzzle(puzzleId: string): PuzzleItem | undefined {
    return this.puzzles.get(puzzleId);
  }

  public getAllPuzzles(): PuzzleItem[] {
    return Array.from(this.puzzles.values());
  }

  public getVocabularyItem(vocabId: string): VocabularyItem | undefined {
    return this.vocabulary.get(vocabId);
  }

  public getAllVocabulary(): VocabularyItem[] {
    return Array.from(this.vocabulary.values());
  }

  public isPuzzleCompleted(puzzleId: string): boolean {
    const save = saveManager.load();
    return save.learningProgress.completedPuzzleIds.includes(puzzleId);
  }

  /**
   * Calculates how many puzzles have been solved on the first try without hints.
   * Used to gradually reduce unnecessary pre-emptive scaffolding after repeated success.
   */
  public getFirstTryMasteryCount(): number {
    const save = saveManager.load();
    const attemptsMap = save.learningProgress.puzzleAttempts || {};
    let count = 0;

    for (const key of Object.keys(attemptsMap)) {
      const record = attemptsMap[key];
      if (record && record.firstTryCorrect && record.hintCount === 0) {
        count++;
      }
    }
    return count;
  }

  public shouldReduceInitialHints(): boolean {
    return this.getFirstTryMasteryCount() >= 1;
  }

  /**
   * Marks a puzzle's associated vocabulary as encountered when the player opens the puzzle.
   */
  public registerPuzzleEncounter(puzzleId: string): void {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle || !puzzle.relatedVocabIds) return;

    const save = saveManager.load();
    let changed = false;

    puzzle.relatedVocabIds.forEach((vocabId) => {
      if (!save.learningProgress.encounteredVocabIds.includes(vocabId)) {
        save.learningProgress.encounteredVocabIds.push(vocabId);
        changed = true;
      }
    });

    if (changed) {
      saveManager.save(save);
    }
  }

  /**
   * Records a manual hint request and returns the corresponding adaptive hint.
   */
  public requestHint(puzzleId: string, showThai: boolean = true): { textEn: string; textTh: string; level: number } {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle) {
      throw new Error(`Puzzle with ID "${puzzleId}" not found.`);
    }

    const save = saveManager.load();
    const existing = save.learningProgress.puzzleAttempts[puzzleId] || {
      attempts: 0,
      firstTryCorrect: false,
      hintCount: 0
    };

    existing.hintCount += 1;
    save.learningProgress.puzzleAttempts[puzzleId] = existing;
    saveManager.save(save);

    const effectiveStep = Math.max(existing.hintCount, existing.attempts);
    return HintSystem.getHint(puzzle, effectiveStep, showThai);
  }

  /**
   * Deterministically evaluates a player's selected option, updates local learning progress,
   * and returns structured pedagogical feedback and progressive hints.
   */
  public evaluateAnswer(
    puzzleId: string,
    selectedOptionId: string,
    currentAttempts: number = 0,
    showThai: boolean = true,
    persist: boolean = true
  ): PuzzleEvaluationResult {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle) {
      throw new Error(`Puzzle with ID "${puzzleId}" not found in learning content bank.`);
    }

    const selectedOption = puzzle.options.find((opt) => opt.id === selectedOptionId);
    if (!selectedOption) {
      throw new Error(`Option "${selectedOptionId}" does not exist for puzzle "${puzzleId}".`);
    }

    const isCorrect = selectedOption.isCorrect;
    const rule = this.grammarRules.get(puzzle.targetRuleId);
    const attemptsUsed = currentAttempts + 1;
    const canRetry = !isCorrect && attemptsUsed < puzzle.maxRetries;

    let nextHintEn: string | undefined;
    let nextHintTh: string | undefined;

    if (!isCorrect) {
      // Always provide a helpful hint on any wrong answer so the learner can recover
      const hint = HintSystem.getHint(puzzle, attemptsUsed, showThai);
      nextHintEn = hint.textEn;
      nextHintTh = hint.textTh;
    }

    if (persist) {
      this.persistAttempt(puzzle, isCorrect, attemptsUsed);
    }

    const reduceScaffolding = isCorrect && attemptsUsed === 1 && this.shouldReduceInitialHints();

    return {
      puzzleId,
      selectedOptionId,
      isCorrect,
      explanationEn: selectedOption.distractorReasonEn || (isCorrect ? 'Correct!' : 'Incorrect option chosen.'),
      explanationTh: selectedOption.distractorReasonTh || (isCorrect ? 'ถูกต้อง!' : 'คำตอบไม่ถูกต้อง'),
      ruleReference: rule,
      canRetry,
      attemptsUsed,
      nextHintEn,
      nextHintTh,
      reduceScaffolding
    };
  }

  private persistAttempt(puzzle: PuzzleItem, isCorrect: boolean, attemptsUsed: number): void {
    const save = saveManager.load();
    const existing = save.learningProgress.puzzleAttempts[puzzle.id] || {
      attempts: 0,
      firstTryCorrect: false,
      hintCount: 0,
      completed: false
    };

    const totalAttempts = Math.max(existing.attempts + 1, attemptsUsed);
    const isFirstTrySuccess = isCorrect && totalAttempts === 1 && existing.hintCount === 0;

    save.learningProgress.puzzleAttempts[puzzle.id] = {
      attempts: totalAttempts,
      firstTryCorrect: existing.completed ? existing.firstTryCorrect : isFirstTrySuccess,
      hintCount: existing.hintCount,
      completed: existing.completed || isCorrect
    };

    // Track vocabulary encounter
    if (puzzle.relatedVocabIds) {
      puzzle.relatedVocabIds.forEach((vocabId) => {
        if (!save.learningProgress.encounteredVocabIds.includes(vocabId)) {
          save.learningProgress.encounteredVocabIds.push(vocabId);
        }
        if (isCorrect && !save.learningProgress.masteredVocabIds.includes(vocabId)) {
          save.learningProgress.masteredVocabIds.push(vocabId);
        }
      });
    }

    if (isCorrect && !save.learningProgress.completedPuzzleIds.includes(puzzle.id)) {
      save.learningProgress.completedPuzzleIds.push(puzzle.id);
    }

    saveManager.save(save);
  }
}

export const learningEngine = new LearningEngine();
