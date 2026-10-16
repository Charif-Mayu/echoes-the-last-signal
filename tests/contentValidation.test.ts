import { describe, it, expect } from 'vitest';
import grammarRules from '../content/learning/grammar_rules.json';
import vocabulary from '../content/learning/vocabulary.json';
import puzzles from '../content/learning/puzzles.json';
import chapter1 from '../content/chapters/chapter1.json';
import clues from '../content/evidence/chapter1_clues.json';

describe('Content Validation Suite', () => {
  it('validates Chapter 1 metadata and objectives', () => {
    expect(chapter1.number).toBe(1);
    expect(chapter1.titleEn).toBe('The Last Station');
    expect(chapter1.objectives.length).toBeGreaterThanOrEqual(4);

    chapter1.objectives.forEach((obj) => {
      expect(obj.id).toBeTruthy();
      expect(obj.titleEn).toBeTruthy();
      expect(obj.descriptionEn).toBeTruthy();
    });
  });

  it('validates every puzzle has exactly one correct answer and non-empty distractors', () => {
    puzzles.forEach((puzzle: any) => {
      expect(puzzle.id).toBeTruthy();
      expect(puzzle.options.length).toBeGreaterThanOrEqual(2);

      const correctOptions = puzzle.options.filter((opt: any) => opt.isCorrect);
      expect(correctOptions.length, `Puzzle ${puzzle.id} must have exactly 1 correct answer`).toBe(1);

      puzzle.options.forEach((opt: any) => {
        expect(opt.id).toBeTruthy();
        expect(opt.textEn).toBeTruthy();
        expect(opt.distractorReasonEn).toBeTruthy();
      });

      expect(puzzle.hintsEn.length).toBeGreaterThan(0);
      expect(puzzle.hintsTh.length).toBeGreaterThan(0);
    });
  });

  it('validates all vocabulary entries have words, meanings, and examples', () => {
    expect(vocabulary.length).toBeGreaterThanOrEqual(5);
    vocabulary.forEach((item: any) => {
      expect(item.id).toBeTruthy();
      expect(item.word).toBeTruthy();
      expect(item.meaningEn).toBeTruthy();
      expect(item.meaningTh).toBeTruthy();
      expect(item.exampleSentenceEn).toBeTruthy();
      expect(item.chapter).toBe(1);
    });
  });

  it('validates all grammar rules have explanations and formulas', () => {
    expect(grammarRules.length).toBeGreaterThanOrEqual(2);
    grammarRules.forEach((rule: any) => {
      expect(rule.id).toBeTruthy();
      expect(rule.topic).toBeTruthy();
      expect(rule.formula).toBeTruthy();
      expect(rule.examples.length).toBeGreaterThan(0);
    });
  });

  it('validates all Chapter 1 clues have non-empty locations and descriptions', () => {
    expect(clues.length).toBeGreaterThanOrEqual(3);
    clues.forEach((clue: any) => {
      expect(clue.id).toBeTruthy();
      expect(clue.titleEn).toBeTruthy();
      expect(clue.descriptionEn).toBeTruthy();
      expect(clue.locationEn).toBeTruthy();
    });
  });
});
