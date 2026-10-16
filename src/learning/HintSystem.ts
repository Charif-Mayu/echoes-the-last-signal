import { PuzzleItem } from '../types/learning';

export class HintSystem {
  /**
   * Retrieves an adaptive hint based on the number of attempts already made or hints requested.
   * Attempt 1 (or Hint 1) -> Subtle contextual clue (hints[0]).
   * Attempt 2+ (or Hint 2+) -> Stronger grammatical formula / direct Thai scaffold (hints[1]).
   */
  public static getHint(
    puzzle: PuzzleItem,
    attemptsOrHintLevel: number,
    preferThai: boolean = true
  ): { textEn: string; textTh: string; level: number } {
    const enHints = puzzle.hintsEn || [];
    const thHints = puzzle.hintsTh || [];

    // 1st wrong attempt / hint request maps to index 0; 2nd+ maps to index 1+
    const normalizedStep = Math.max(0, attemptsOrHintLevel - 1);
    const index = Math.min(normalizedStep, Math.max(0, enHints.length - 1));

    const textEn = enHints[index] || 'Read the prompt carefully and check the subject and verb forms.';
    const textTh = thHints[index] || 'อ่านบริบทให้ละเอียดและสังเกตโครงสร้างประธานและคำกริยา';

    return {
      textEn,
      textTh: preferThai ? textTh : '',
      level: index + 1
    };
  }
}
