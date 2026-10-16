import { describe, it, expect } from 'vitest';
import { LearningEngine } from '../src/learning/LearningEngine';

describe('LearningEngine & HintSystem Suite', () => {
  const engine = new LearningEngine();

  it('loads all Chapter 1 grammar rules and puzzles from content bank', () => {
    const puzzles = engine.getAllPuzzles();
    expect(puzzles.length).toBeGreaterThanOrEqual(2);

    const signPuzzle = engine.getPuzzle('puzzle_station_sign_nav');
    expect(signPuzzle).toBeDefined();
    expect(signPuzzle?.type).toBe('directions');

    const terminalPuzzle = engine.getPuzzle('puzzle_terminal_diagnostics');
    expect(terminalPuzzle).toBeDefined();
    expect(terminalPuzzle?.type).toBe('grammar_in_context');
  });

  it('correctly evaluates a valid answer and provides explanation', () => {
    const result = engine.evaluateAnswer('puzzle_station_sign_nav', 'opt_a', 0);
    expect(result.isCorrect).toBe(true);
    expect(result.explanationEn).toContain("Between");
    expect(result.canRetry).toBe(false);
  });

  it('correctly identifies distractor mistakes and allows retry with progressive hints', () => {
    // Attempt 1 with distractor option B (cross active line)
    const attempt1 = engine.evaluateAnswer('puzzle_station_sign_nav', 'opt_b', 0);
    expect(attempt1.isCorrect).toBe(false);
    expect(attempt1.canRetry).toBe(true);
    expect(attempt1.explanationEn).toContain('Do NOT cross');
    expect(attempt1.nextHintEn).toBeDefined();

    // Attempt 2
    const attempt2 = engine.evaluateAnswer('puzzle_station_sign_nav', 'opt_c', 1);
    expect(attempt2.isCorrect).toBe(false);
    expect(attempt2.canRetry).toBe(true);
    expect(attempt2.attemptsUsed).toBe(2);
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

  it('attaches the corresponding grammar rule reference to evaluation result', () => {
    const res = engine.evaluateAnswer('puzzle_terminal_diagnostics', 'opt_t2', 0);
    expect(res.ruleReference).toBeDefined();
    expect(res.ruleReference?.id).toBe('rule_there_is_are');
    expect(res.ruleReference?.formula).toBeDefined();
  });
});
