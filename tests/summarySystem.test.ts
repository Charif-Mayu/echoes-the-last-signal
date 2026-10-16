import { describe, it, expect, beforeEach } from 'vitest';
import { ChapterSummaryCalculator } from '../src/learning/ChapterSummaryCalculator';
import { SaveManager, MemoryStorageAdapter } from '../src/persistence/SaveManager';
import { SaveState } from '../src/types/save';

describe('ChapterSummaryCalculator & Completion Flow', () => {
  let memoryStorage: MemoryStorageAdapter;
  let saveMgr: SaveManager;

  beforeEach(() => {
    memoryStorage = new MemoryStorageAdapter();
    saveMgr = new SaveManager(memoryStorage);
  });

  it('calculates baseline summary for fresh uncompleted save state', () => {
    const defaultState = saveMgr.getDefaultState();
    const summary = ChapterSummaryCalculator.calculateChapter1Summary(defaultState);

    expect(summary.chapter).toBe(1);
    expect(summary.chapterTitleEn).toBe('The Last Station');
    expect(summary.totalPuzzles).toBe(3);
    expect(summary.completedPuzzlesCount).toBe(0);
    expect(summary.evidenceCollected).toBe(0);
    expect(summary.masteredVocabulary.length).toBe(0);
  });

  it('calculates 100% accuracy and clean report for flawless first-try completion', () => {
    const state: SaveState = {
      ...saveMgr.getDefaultState(),
      collectedEvidenceIds: ['clue_broken_pocket_watch', 'clue_mira_frequency', 'clue_transit_log'],
      learningProgress: {
        encounteredVocabIds: ['vocab_platform', 'vocab_terminal', 'vocab_power'],
        masteredVocabIds: ['vocab_platform', 'vocab_terminal', 'vocab_power'],
        completedPuzzleIds: [
          'puzzle_station_sign_nav',
          'puzzle_terminal_diagnostics',
          'puzzle_gate_override'
        ],
        puzzleAttempts: {
          puzzle_station_sign_nav: { attempts: 1, firstTryCorrect: true, hintCount: 0, completed: true },
          puzzle_terminal_diagnostics: { attempts: 1, firstTryCorrect: true, hintCount: 0, completed: true },
          puzzle_gate_override: { attempts: 1, firstTryCorrect: true, hintCount: 0, completed: true }
        }
      }
    };

    const summary = ChapterSummaryCalculator.calculateChapter1Summary(state);

    expect(summary.completedPuzzlesCount).toBe(3);
    expect(summary.firstTryCorrectCount).toBe(3);
    expect(summary.accuracyRate).toBe(100);
    expect(summary.totalHintsRequested).toBe(0);
    expect(summary.evidenceCollected).toBe(3);
    expect(summary.evidenceRatioText).toBe('3 / 3');
    expect(summary.reviewRecommendations.length).toBe(0);
    expect(summary.masteredVocabulary.length).toBe(3);
    expect(summary.grammarTopicsPracticed.length).toBe(3);
  });

  it('correctly produces review recommendations and lower accuracy when retries or hints occur', () => {
    const state: SaveState = {
      ...saveMgr.getDefaultState(),
      collectedEvidenceIds: ['clue_broken_pocket_watch'],
      learningProgress: {
        encounteredVocabIds: ['vocab_platform'],
        masteredVocabIds: ['vocab_platform'],
        completedPuzzleIds: [
          'puzzle_station_sign_nav',
          'puzzle_terminal_diagnostics'
        ],
        puzzleAttempts: {
          puzzle_station_sign_nav: { attempts: 1, firstTryCorrect: true, hintCount: 0, completed: true },
          puzzle_terminal_diagnostics: { attempts: 3, firstTryCorrect: false, hintCount: 2, completed: true }
        }
      }
    };

    const summary = ChapterSummaryCalculator.calculateChapter1Summary(state);

    expect(summary.completedPuzzlesCount).toBe(2);
    expect(summary.firstTryCorrectCount).toBe(1);
    expect(summary.totalAttempts).toBe(4); // 1 + 3
    expect(summary.accuracyRate).toBe(50); // 2 completed / 4 attempts = 50%
    expect(summary.totalHintsRequested).toBe(2);
    expect(summary.reviewRecommendations.length).toBe(1);
    expect(summary.reviewRecommendations[0].ruleId).toBe('rule_there_is_are');
  });
});
