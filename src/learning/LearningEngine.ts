import { GrammarRule, PuzzleItem, PuzzleEvaluationResult } from '../types/learning';
import { HintSystem } from './HintSystem';
import grammarRulesData from '../../content/learning/grammar_rules.json';
import puzzlesData from '../../content/learning/puzzles.json';

export class LearningEngine {
  private grammarRules: Map<string, GrammarRule> = new Map();
  private puzzles: Map<string, PuzzleItem> = new Map();

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
  }

  public getRule(ruleId: string): GrammarRule | undefined {
    return this.grammarRules.get(ruleId);
  }

  public getPuzzle(puzzleId: string): PuzzleItem | undefined {
    return this.puzzles.get(puzzleId);
  }

  public getAllPuzzles(): PuzzleItem[] {
    return Array.from(this.puzzles.values());
  }

  public evaluateAnswer(
    puzzleId: string,
    selectedOptionId: string,
    currentAttempts: number = 0,
    showThai: boolean = true
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

    if (canRetry) {
      const hint = HintSystem.getHint(puzzle, attemptsUsed, showThai);
      nextHintEn = hint.textEn;
      nextHintTh = hint.textTh;
    }

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
      nextHintTh
    };
  }
}

export const learningEngine = new LearningEngine();
