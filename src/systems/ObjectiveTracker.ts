import { Objective } from '../types/narrative';
import { saveManager } from '../persistence/SaveManager';
import { audioManager } from '../engine/AudioManager';
import chapterData from '../../content/chapters/chapter1.json';

export class ObjectiveTracker {
  private objectives: Objective[] = [];

  constructor() {
    this.loadObjectives();
  }

  private loadObjectives(): void {
    this.objectives = (chapterData.objectives as Objective[]).sort((a, b) => a.order - b.order);
  }

  public getAllObjectives(): Objective[] {
    const save = saveManager.load();
    return this.objectives.map((obj) => ({
      ...obj,
      completed: save.completedObjectiveIds.includes(obj.id)
    }));
  }

  public getCurrentObjective(): Objective {
    const save = saveManager.load();
    const active = this.objectives.find((obj) => obj.id === save.activeObjectiveId);
    if (active) {
      return {
        ...active,
        completed: save.completedObjectiveIds.includes(active.id)
      };
    }

    // Fallback: First uncompleted objective
    const uncompleted = this.objectives.find((obj) => !save.completedObjectiveIds.includes(obj.id));
    return uncompleted ? { ...uncompleted, completed: false } : { ...this.objectives[0], completed: false };
  }

  public completeObjective(objectiveId: string): boolean {
    const save = saveManager.load();

    if (save.completedObjectiveIds.includes(objectiveId)) {
      return false; // Already completed
    }

    save.completedObjectiveIds.push(objectiveId);

    // Find next uncompleted objective in chronological order
    const nextObj = this.objectives.find((obj) => !save.completedObjectiveIds.includes(obj.id));
    if (nextObj) {
      save.activeObjectiveId = nextObj.id;
    }

    saveManager.save(save);
    audioManager.playSynthesizedSFX('success');

    const updatedObjective = nextObj || this.objectives[this.objectives.length - 1];

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('objective:updated', {
        detail: {
          completedId: objectiveId,
          activeObjective: updatedObjective
        }
      }));
    }

    return true;
  }

  public isObjectiveCompleted(objectiveId: string): boolean {
    const save = saveManager.load();
    return save.completedObjectiveIds.includes(objectiveId);
  }

  public isChapterCompleted(): boolean {
    const save = saveManager.load();
    return this.objectives.every((obj) => save.completedObjectiveIds.includes(obj.id));
  }
}

export const objectiveTracker = new ObjectiveTracker();
