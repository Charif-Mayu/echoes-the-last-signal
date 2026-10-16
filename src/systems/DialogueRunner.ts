import { DialogueLine, DialogueTree } from '../types/narrative';

export type DialogueEventListener = (eventName: string, line: DialogueLine) => void;
export type DialogueLineListener = (line: DialogueLine) => void;
export type DialogueEndListener = () => void;

export class DialogueRunner {
  private currentTree: DialogueTree | null = null;
  private currentLine: DialogueLine | null = null;
  private onLineChangeListeners: DialogueLineListener[] = [];
  private onEventListenerListeners: DialogueEventListener[] = [];
  private onEndListeners: DialogueEndListener[] = [];

  public startDialogue(tree: DialogueTree, startId?: string): DialogueLine {
    this.currentTree = tree;
    const initialId = startId || tree.startId;
    const line = tree.lines[initialId];

    if (!line) {
      throw new Error(`Starting line "${initialId}" not found in dialogue tree "${tree.id}".`);
    }

    this.setCurrentLine(line);
    return line;
  }

  public getCurrentLine(): DialogueLine | null {
    return this.currentLine;
  }

  public isDialogueActive(): boolean {
    return this.currentLine !== null;
  }

  public advance(): DialogueLine | null {
    if (!this.currentLine || !this.currentTree) return null;

    // If current line has choices, player must pick a choice instead of generic advance
    if (this.currentLine.choices && this.currentLine.choices.length > 0) {
      return this.currentLine;
    }

    if (this.currentLine.nextDialogueId) {
      const nextLine = this.currentTree.lines[this.currentLine.nextDialogueId];
      if (nextLine) {
        this.setCurrentLine(nextLine);
        return nextLine;
      }
    }

    // Dialogue finished
    this.endDialogue();
    return null;
  }

  public selectChoice(choiceId: string): DialogueLine | null {
    if (!this.currentLine || !this.currentTree || !this.currentLine.choices) return null;

    const choice = this.currentLine.choices.find((c) => c.id === choiceId);
    if (!choice) {
      console.warn(`[DialogueRunner] Choice "${choiceId}" not found in current line choices.`);
      return this.currentLine;
    }

    const nextLine = this.currentTree.lines[choice.nextDialogueId];
    if (nextLine) {
      this.setCurrentLine(nextLine);
      return nextLine;
    }

    this.endDialogue();
    return null;
  }

  private setCurrentLine(line: DialogueLine): void {
    this.currentLine = line;

    // Dispatch trigger events if specified
    if (line.triggerEvent) {
      this.onEventListenerListeners.forEach((fn) => fn(line.triggerEvent!, line));
    }

    this.onLineChangeListeners.forEach((fn) => fn(line));
  }

  public endDialogue(): void {
    this.currentLine = null;
    this.currentTree = null;
    this.onEndListeners.forEach((fn) => fn());
  }

  public onLineChange(listener: DialogueLineListener): () => void {
    this.onLineChangeListeners.push(listener);
    return () => {
      this.onLineChangeListeners = this.onLineChangeListeners.filter((fn) => fn !== listener);
    };
  }

  public onEvent(listener: DialogueEventListener): () => void {
    this.onEventListenerListeners.push(listener);
    return () => {
      this.onEventListenerListeners = this.onEventListenerListeners.filter((fn) => fn !== listener);
    };
  }

  public onEnd(listener: DialogueEndListener): () => void {
    this.onEndListeners.push(listener);
    return () => {
      this.onEndListeners = this.onEndListeners.filter((fn) => fn !== listener);
    };
  }
}

export const dialogueRunner = new DialogueRunner();
