import Phaser from 'phaser';
import { InputState } from '../types/game';

export class InputManager {
  private scene: Phaser.Scene;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW?: Phaser.Input.Keyboard.Key;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyS?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keyE?: Phaser.Input.Keyboard.Key;
  private keyJ?: Phaser.Input.Keyboard.Key;
  private keyEsc?: Phaser.Input.Keyboard.Key;

  private virtualLeft: boolean = false;
  private virtualRight: boolean = false;
  private virtualInteract: boolean = false;
  private virtualJournal: boolean = false;
  private enabled: boolean = true;
  private unlockCooldownUntil: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initKeyboard();
  }

  private initKeyboard(): void {
    if (!this.scene.input.keyboard) return;

    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.keyW = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyJ = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyEsc = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  public setEnabled(enabled: boolean): void {
    const wasDisabled = !this.enabled;
    this.enabled = enabled;
    this.resetInputs();

    if (enabled && wasDisabled) {
      // Prevent modal-closing keystrokes (E / Space / Esc / J) from triggering in-world actions on the same frame
      this.unlockCooldownUntil = Date.now() + 180;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public resetInputs(): void {
    this.virtualLeft = false;
    this.virtualRight = false;
    this.virtualInteract = false;
    this.virtualJournal = false;

    // Clear Phaser JustDown state on action keys
    if (this.keyE) Phaser.Input.Keyboard.JustDown(this.keyE);
    if (this.keyJ) Phaser.Input.Keyboard.JustDown(this.keyJ);
    if (this.keyEsc) Phaser.Input.Keyboard.JustDown(this.keyEsc);
    if (this.cursors?.space) Phaser.Input.Keyboard.JustDown(this.cursors.space);
  }

  public setVirtualInput(control: 'left' | 'right' | 'interact' | 'journal', pressed: boolean): void {
    if (!this.enabled) return;
    switch (control) {
      case 'left': this.virtualLeft = pressed; break;
      case 'right': this.virtualRight = pressed; break;
      case 'interact': this.virtualInteract = pressed; break;
      case 'journal': this.virtualJournal = pressed; break;
    }
  }

  public getState(): InputState {
    if (!this.enabled) {
      return {
        left: false,
        right: false,
        up: false,
        down: false,
        interact: false,
        journal: false,
        pause: false
      };
    }

    const inCooldown = Date.now() < this.unlockCooldownUntil;

    const kbLeft = Boolean(this.cursors?.left.isDown || this.keyA?.isDown);
    const kbRight = Boolean(this.cursors?.right.isDown || this.keyD?.isDown);
    const kbUp = Boolean(this.cursors?.up.isDown || this.keyW?.isDown);
    const kbDown = Boolean(this.cursors?.down.isDown || this.keyS?.isDown);

    // Consume JustDown states even during cooldown so they don't stay queued
    const rawInteract = Boolean(
      (this.keyE && Phaser.Input.Keyboard.JustDown(this.keyE)) ||
      (this.cursors?.space && Phaser.Input.Keyboard.JustDown(this.cursors.space))
    );
    const rawJournal = Boolean(this.keyJ && Phaser.Input.Keyboard.JustDown(this.keyJ));
    const rawPause = Boolean(this.keyEsc && Phaser.Input.Keyboard.JustDown(this.keyEsc));

    const interact = !inCooldown && (rawInteract || this.virtualInteract);
    const journal = !inCooldown && (rawJournal || this.virtualJournal);
    const pause = !inCooldown && rawPause;

    // Reset single-pulse virtual triggers
    if (this.virtualInteract) this.virtualInteract = false;
    if (this.virtualJournal) this.virtualJournal = false;

    return {
      left: kbLeft || this.virtualLeft,
      right: kbRight || this.virtualRight,
      up: kbUp,
      down: kbDown,
      interact,
      journal,
      pause
    };
  }
}
