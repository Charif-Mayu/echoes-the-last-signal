import { SaveState } from '../types/save';
import { VocabularyItem } from '../types/learning';
import { learningEngine } from './LearningEngine';
import chapter1Clues from '../../content/evidence/chapter1_clues.json';

export interface ChapterSummaryData {
  chapter: number;
  chapterTitleEn: string;
  chapterTitleTh: string;
  totalPuzzles: number;
  completedPuzzlesCount: number;
  totalAttempts: number;
  firstTryCorrectCount: number;
  accuracyRate: number; // Percentage 0 - 100
  totalHintsRequested: number;
  evidenceCollected: number;
  totalEvidence: number;
  evidenceRatioText: string;
  masteredVocabulary: VocabularyItem[];
  grammarTopicsPracticed: Array<{
    id: string;
    titleEn: string;
    titleTh: string;
    level: string;
    solvedFirstTry: boolean;
  }>;
  reviewRecommendations: Array<{
    ruleId: string;
    titleEn: string;
    titleTh: string;
    suggestionEn: string;
    suggestionTh: string;
  }>;
}

export class ChapterSummaryCalculator {
  public static calculateChapter1Summary(saveState: SaveState): ChapterSummaryData {
    const chapter1PuzzleIds = [
      'puzzle_station_sign_nav',
      'puzzle_terminal_diagnostics',
      'puzzle_gate_override'
    ];

    const attemptsMap = saveState.learningProgress.puzzleAttempts || {};
    let totalAttempts = 0;
    let firstTryCount = 0;
    let totalHints = 0;
    let completedPuzzlesCount = 0;

    const reviewRecommendations: ChapterSummaryData['reviewRecommendations'] = [];
    const grammarTopicsPracticed: ChapterSummaryData['grammarTopicsPracticed'] = [];

    chapter1PuzzleIds.forEach((puzzleId) => {
      const puzzle = learningEngine.getPuzzle(puzzleId);
      const attemptRecord = attemptsMap[puzzleId];
      const isCompleted = saveState.learningProgress.completedPuzzleIds.includes(puzzleId);

      if (isCompleted) {
        completedPuzzlesCount++;
      }

      if (attemptRecord) {
        totalAttempts += attemptRecord.attempts || 0;
        totalHints += attemptRecord.hintCount || 0;
        if (attemptRecord.firstTryCorrect) {
          firstTryCount++;
        }
      }

      if (puzzle) {
        const rule = learningEngine.getRule(puzzle.targetRuleId);
        const solvedFirstTry = !!(attemptRecord && attemptRecord.firstTryCorrect);

        grammarTopicsPracticed.push({
          id: puzzle.targetRuleId,
          titleEn: rule?.titleEn || puzzle.titleEn,
          titleTh: rule?.titleTh || puzzle.titleTh,
          level: rule?.level || 'A1',
          solvedFirstTry
        });

        // If player required multiple attempts or hints, recommend for review
        if (attemptRecord && (!attemptRecord.firstTryCorrect || attemptRecord.hintCount > 0)) {
          reviewRecommendations.push({
            ruleId: puzzle.targetRuleId,
            titleEn: rule?.titleEn || puzzle.titleEn,
            titleTh: rule?.titleTh || puzzle.titleTh,
            suggestionEn: `Review ${rule?.titleEn || 'this grammar structure'} to reinforce subject-verb agreement and spatial prepositions.`,
            suggestionTh: `แนะนำให้ทบทวนเรื่อง ${rule?.titleTh || 'ไวยากรณ์นี้'} เพื่อความแม่นยำในการใช้งานจริง`
          });
        }
      }
    });

    // Accuracy rate: If 3 puzzles and 3 attempts = 100%, if 3 puzzles with 5 attempts = (3/5)*100 = 60%
    const totalPuzzles = chapter1PuzzleIds.length;
    let accuracyRate = 100;
    if (totalAttempts > 0) {
      accuracyRate = Math.min(100, Math.round((completedPuzzlesCount / totalAttempts) * 100));
    }

    // Evidence
    const totalEvidence = (chapter1Clues as unknown[]).length;
    const evidenceCollected = saveState.collectedEvidenceIds.length;

    // Vocabulary
    const masteredVocabulary: VocabularyItem[] = [];
    saveState.learningProgress.masteredVocabIds.forEach((vocabId) => {
      const item = learningEngine.getVocabularyItem(vocabId);
      if (item) {
        masteredVocabulary.push(item);
      }
    });

    return {
      chapter: 1,
      chapterTitleEn: 'The Last Station',
      chapterTitleTh: 'สถานีสุดท้าย',
      totalPuzzles,
      completedPuzzlesCount,
      totalAttempts: Math.max(totalAttempts, completedPuzzlesCount),
      firstTryCorrectCount: firstTryCount,
      accuracyRate,
      totalHintsRequested: totalHints,
      evidenceCollected,
      totalEvidence,
      evidenceRatioText: `${evidenceCollected} / ${totalEvidence}`,
      masteredVocabulary,
      grammarTopicsPracticed,
      reviewRecommendations
    };
  }
}
