import { describe, it, expect, beforeEach } from 'vitest';
import { EvidenceManager } from '../src/systems/EvidenceManager';
import { saveManager } from '../src/persistence/SaveManager';

describe('Evidence & Clues Collection Suite', () => {
  let manager: EvidenceManager;

  beforeEach(() => {
    saveManager.resetChapter(1);
    manager = new EvidenceManager();
  });

  it('loads all defined chapter 1 clues into catalog', () => {
    const allClues = manager.getAllClues();
    expect(allClues.length).toBeGreaterThanOrEqual(3);

    const pocketWatch = manager.getClue('clue_broken_pocket_watch');
    expect(pocketWatch).toBeDefined();
    expect(pocketWatch?.category).toBe('artifact');
  });

  it('discovers a new clue and prevents duplicate discovery', () => {
    expect(manager.hasClue('clue_broken_pocket_watch')).toBe(false);

    // First discovery -> true
    const firstAttempt = manager.discoverClue('clue_broken_pocket_watch');
    expect(firstAttempt).toBe(true);
    expect(manager.hasClue('clue_broken_pocket_watch')).toBe(true);

    // Second discovery attempt -> false (no duplicate rewards)
    const duplicateAttempt = manager.discoverClue('clue_broken_pocket_watch');
    expect(duplicateAttempt).toBe(false);

    const progress = manager.getProgress();
    expect(progress.discovered).toBe(1);
  });

  it('retrieves full metadata for discovered clues', () => {
    manager.discoverClue('clue_mira_frequency');
    const discovered = manager.getDiscoveredClues();

    expect(discovered).toHaveLength(1);
    expect(discovered[0].id).toBe('clue_mira_frequency');
    expect(discovered[0].titleEn).toBe('Emergency Radio Protocol Memo');
    expect(discovered[0].titleTh).toBe('บันทึกคลื่นวิทยุฉุกเฉิน');
  });
});
