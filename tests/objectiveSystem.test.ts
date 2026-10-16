import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectiveTracker } from '../src/systems/ObjectiveTracker';
import { saveManager } from '../src/persistence/SaveManager';

describe('Objective Progression Suite', () => {
  let tracker: ObjectiveTracker;

  beforeEach(() => {
    saveManager.resetChapter(1);
    tracker = new ObjectiveTracker();
  });

  it('starts on the first objective upon awakening', () => {
    const current = tracker.getCurrentObjective();
    expect(current.id).toBe('obj_wake_up');
    expect(current.completed).toBe(false);
  });

  it('completes an objective and seamlessly advances to the next', () => {
    const res1 = tracker.completeObjective('obj_wake_up');
    expect(res1).toBe(true);
    expect(tracker.isObjectiveCompleted('obj_wake_up')).toBe(true);

    const nextObj = tracker.getCurrentObjective();
    expect(nextObj.id).toBe('obj_answer_mira');
    expect(nextObj.completed).toBe(false);
  });

  it('handles completion of multiple sequential objectives', () => {
    tracker.completeObjective('obj_wake_up');
    tracker.completeObjective('obj_answer_mira');
    tracker.completeObjective('obj_read_sign');

    const active = tracker.getCurrentObjective();
    expect(active.id).toBe('obj_override_terminal');

    const all = tracker.getAllObjectives();
    const completedCount = all.filter((o) => o.completed).length;
    expect(completedCount).toBe(3);
    expect(tracker.isChapterCompleted()).toBe(false);
  });

  it('detects when the final objective is fulfilled', () => {
    const all = tracker.getAllObjectives();
    all.forEach((o) => {
      tracker.completeObjective(o.id);
    });

    expect(tracker.isChapterCompleted()).toBe(true);
  });
});
