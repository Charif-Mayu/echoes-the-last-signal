import { describe, it, expect, beforeEach } from 'vitest';
import { LearningEngine } from '../src/learning/LearningEngine';
import { saveManager } from '../src/persistence/SaveManager';

describe('LearningEngine & HintSystem Suite', () => {
  let engine: LearningEngine;

  beforeEach(() => {
    saveManager.resetChapter(1);
    engine = new LearningEngine();
  });

  it('loads all 3 Chapter 1 grammar rules and puzzles from content bank', () => {
    const puzzles = engine.getAllPuzzles();
    expect(puzzles.length).toBe(3);

    const signPuzzle = engine.getPuzzle('puzzle_station_sign_nav');
    expect(signPuzzle).toBeDefined();
    expect(signPuzzle?.type).toBe('directions');

    const terminalPuzzle = engine.getPuzzle('puzzle_terminal_diagnostics');
    expect(terminalPuzzle).toBeDefined();
    expect(terminalPuzzle?.type).toBe('grammar_in_context');

    const gatePuzzle = engine.getPuzzle('puzzle_gate_override');
    expect(gatePuzzle).toBeDefined();
    expect(gatePuzzle?.type).toBe('terminal_decode');
  });

  it('correctly evaluates a valid answer and logs vocabulary mastery', () => {
    const result = engine.evaluateAnswer('puzzle_station_sign_nav', 'opt_a', 0);
    expect(result.isCorrect).toBe(true);
    expect(result.explanationEn).toContain('Between');
    expect(result.canRetry).toBe(false);

    expect(engine.isPuzzleCompleted('puzzle_station_sign_nav')).toBe(true);
    expect(engine.getFirstTryMasteryCount()).toBe(1);
    expect(engine.shouldReduceInitialHints()).toBe(true);

    const save = saveManager.load();
    expect(save.learningProgress.masteredVocabIds).toContain('vocab_between');
    expect(save.learningProgress.masteredVocabIds).toContain('vocab_opposite');
  });

  it('correctly identifies distractor mistakes and steps progressive hints accurately', () => {
    // Attempt 1 with distractor option B (cross active line) -> Hint 1 (index 0)
    const attempt1 = engine.evaluateAnswer('puzzle_station_sign_nav', 'opt_b', 0);
    expect(attempt1.isCorrect).toBe(false);
    expect(attempt1.canRetry).toBe(true);
    expect(attempt1.explanationEn).toContain('Do NOT cross');
    expect(attempt1.nextHintEn).toContain("preposition 'between'");

    // Attempt 2 with distractor option C -> Hint 2 (index 1, stronger formula check)
    const attempt2 = engine.evaluateAnswer('puzzle_station_sign_nav', 'opt_c', 1);
    expect(attempt2.isCorrect).toBe(false);
    expect(attempt2.canRetry).toBe(true);
    expect(attempt2.attemptsUsed).toBe(2);
    expect(attempt2.nextHintEn).toContain('Formula check');
  });

  it('evaluates There is / There are grammar in context correctly', () => {
    // Correct uncountable noun with "There is"
    const correctRes = engine.evaluateAnswer('puzzle_terminal_diagnostics', 'opt_t2', 0);
    expect(correctRes.isCorrect).toBe(true);
    expect(correctRes.explanationEn.toLowerCase()).toContain('power');

    // Incorrect plural with "There is"
    const wrongRes = engine.evaluateAnswer('puzzle_terminal_diagnostics', 'opt_t1', 0);
    expect(wrongRes.isCorrect).toBe(false);
    expect(wrongRes.explanationEn).toContain('There are');
  });

  it('evaluates Present Simple subject-verb agreement in gate override puzzle', () => {
    // Wrong base verb with singular subject
    const wrongBase = engine.evaluateAnswer('puzzle_gate_override', 'opt_g1', 0);
    expect(wrongBase.isCorrect).toBe(false);
    expect(wrongBase.explanationEn).toContain('supplies');

    // Correct singular verb (-ies)
    const correctVerb = engine.evaluateAnswer('puzzle_gate_override', 'opt_g2', 1);
    expect(correctVerb.isCorrect).toBe(true);
    expect(correctVerb.ruleReference?.id).toBe('rule_present_simple');
  });

  it('tracks manual hint requests and prevents false first-try mastery', () => {
    const hint1 = engine.requestHint('puzzle_terminal_diagnostics', true);
    expect(hint1.level).toBe(1);
    expect(hint1.textTh).toBeTruthy();

    // Even if answered on attempt 1 after requesting a hint, firstTryCorrect is false
    engine.evaluateAnswer('puzzle_terminal_diagnostics', 'opt_t2', 0);
    const save = saveManager.load();
    expect(save.learningProgress.puzzleAttempts['puzzle_terminal_diagnostics'].hintCount).toBe(1);
    expect(save.learningProgress.puzzleAttempts['puzzle_terminal_diagnostics'].firstTryCorrect).toBe(false);
  });

  it('attaches the corresponding grammar rule reference to evaluation result', () => {
    const res = engine.evaluateAnswer('puzzle_terminal_diagnostics', 'opt_t2', 0);
    expect(res.ruleReference).toBeDefined();
    expect(res.ruleReference?.id).toBe('rule_there_is_are');
    expect(res.ruleReference?.formula).toBeDefined();
  });
});
