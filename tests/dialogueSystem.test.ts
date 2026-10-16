import { describe, it, expect } from 'vitest';
import { DialogueRunner } from '../src/systems/DialogueRunner';
import { DialogueTree } from '../src/types/narrative';
import miraRadioData from '../content/dialogues/mira_radio.json';

describe('Dialogue System & Branching Runner', () => {
  it('starts dialogue at initial root line', () => {
    const runner = new DialogueRunner();
    const tree = miraRadioData as unknown as DialogueTree;

    const initialLine = runner.startDialogue(tree);
    expect(initialLine.id).toBe('mira_01');
    expect(initialLine.speaker).toBe('mira');
    expect(runner.isDialogueActive()).toBe(true);
    expect(initialLine.choices?.length).toBe(2);
  });

  it('selects choices and branches correctly', () => {
    const runner = new DialogueRunner();
    const tree = miraRadioData as unknown as DialogueTree;
    runner.startDialogue(tree);

    // Select choice 1
    const nextLine = runner.selectChoice('c1_hear_you');
    expect(nextLine).toBeDefined();
    expect(nextLine?.id).toBe('mira_02');
    expect(nextLine?.textEn).toContain('My name is Mira');
  });

  it('advances linear dialogue lines sequentially', () => {
    const runner = new DialogueRunner();
    const tree = miraRadioData as unknown as DialogueTree;
    runner.startDialogue(tree, 'mira_02');

    const line3 = runner.advance();
    expect(line3?.id).toBe('mira_03');

    const line4 = runner.advance();
    expect(line4?.id).toBe('mira_04');
  });

  it('fires trigger events when reaching event lines', () => {
    const runner = new DialogueRunner();
    const tree = miraRadioData as unknown as DialogueTree;
    let firedEvent: string | null = null;

    runner.onEvent((evtName) => {
      firedEvent = evtName;
    });

    runner.startDialogue(tree, 'mira_04');
    expect(firedEvent).toBe('objective_completed_obj_answer_mira');
  });

  it('ends dialogue cleanly after the final line', () => {
    const runner = new DialogueRunner();
    const tree = miraRadioData as unknown as DialogueTree;
    let hasEnded = false;

    runner.onEnd(() => {
      hasEnded = true;
    });

    runner.startDialogue(tree, 'mira_04');
    const finalAdvance = runner.advance();

    expect(finalAdvance).toBeNull();
    expect(runner.isDialogueActive()).toBe(false);
    expect(hasEnded).toBe(true);
  });
});
