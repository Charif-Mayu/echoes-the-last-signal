import { EvidenceItem } from '../types/narrative';
import { saveManager } from '../persistence/SaveManager';
import cluesData from '../../content/evidence/chapter1_clues.json';

export class EvidenceManager {
  private clues: Map<string, EvidenceItem> = new Map();

  constructor() {
    this.loadClues();
  }

  private loadClues(): void {
    (cluesData as EvidenceItem[]).forEach((clue) => {
      this.clues.set(clue.id, clue);
    });
  }

  public getClue(clueId: string): EvidenceItem | undefined {
    return this.clues.get(clueId);
  }

  public getAllClues(): EvidenceItem[] {
    return Array.from(this.clues.values());
  }

  public hasClue(clueId: string): boolean {
    const save = saveManager.load();
    return save.collectedEvidenceIds.includes(clueId);
  }

  public discoverClue(clueId: string): boolean {
    const clue = this.clues.get(clueId);
    if (!clue) {
      console.warn(`[EvidenceManager] Unknown clue ID: ${clueId}`);
      return false;
    }

    const save = saveManager.load();
    if (save.collectedEvidenceIds.includes(clueId)) {
      return false; // Already collected, prevent duplicate rewards
    }

    save.collectedEvidenceIds.push(clueId);
    saveManager.save(save);

    // Dispatch global evidence discovery event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('evidence:discovered', {
        detail: { clue }
      }));
    }

    return true;
  }

  public getDiscoveredClues(): EvidenceItem[] {
    const save = saveManager.load();
    const result: EvidenceItem[] = [];

    save.collectedEvidenceIds.forEach((id) => {
      const clue = this.clues.get(id);
      if (clue) {
        result.push(clue);
      }
    });

    return result;
  }

  public getProgress(): { discovered: number; total: number } {
    const save = saveManager.load();
    return {
      discovered: save.collectedEvidenceIds.length,
      total: this.clues.size
    };
  }
}

export const evidenceManager = new EvidenceManager();
