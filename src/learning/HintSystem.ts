import { PuzzleItem } from '../types/learning';

export class HintSystem {
  /**
   * Retrieves an adaptive hint based on the number of attempts already made.
   * Attempt 1 -> Subtle contextual clue.
   * Attempt 2+ -> Stronger grammatical formula / direct Thai scaffold.
   */
  public static getHint(puzzle: PuzzleItem, attemptsUsed: number, preferThai: boolean = true): { textEn: string; textTh: string } {
    const enHints = puzzle.hintsEn || [];
    const thHints = puzzle.hintsTh || [];

    const index = Math.min(attemptsUsed, Math.max(0, enHints.length - 1));

    const textEn = enHints[index] || 'Read the prompt carefully and check the noun forms.';
    const textTh = thHints[index] || 'อ่านบริบทให้ละเอียดและสังเกตโครงสร้างคำนาม';

    return {
      textEn,
      textTh: preferThai ? textTh : ''
    };
  }
}
