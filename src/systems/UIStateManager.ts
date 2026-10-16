export type ModalId =
  | 'dialogue'
  | 'journal'
  | 'puzzle'
  | 'summary'
  | 'main-menu'
  | 'settings';

/**
 * Priority order from highest z-index to lowest z-index:
 * - settings (z-index: 90)
 * - main-menu (z-index: 80)
 * - summary (z-index: 75)
 * - puzzle (z-index: 65)
 * - journal (z-index: 60)
 * - dialogue (z-index: 50)
 */
const MODAL_PRIORITY: ModalId[] = [
  'settings',
  'main-menu',
  'summary',
  'puzzle',
  'journal',
  'dialogue'
];

export class UIStateManager {
  private openModals: Set<ModalId> = new Set();
  private hasGameStarted: boolean = false;

  public markGameStarted(): void {
    this.hasGameStarted = true;
  }

  public isGameStarted(): boolean {
    return this.hasGameStarted;
  }

  public registerOpen(modalId: ModalId): void {
    this.openModals.add(modalId);
    this.notifyLockState();
  }

  public registerClose(modalId: ModalId): void {
    this.openModals.delete(modalId);
    this.notifyLockState();
  }

  public isModalOpen(modalId: ModalId): boolean {
    return this.openModals.has(modalId);
  }

  public isAnyModalOpen(): boolean {
    return this.openModals.size > 0;
  }

  public getOpenModals(): ModalId[] {
    return Array.from(this.openModals);
  }

  /**
   * Returns the highest-priority (topmost z-index) modal currently open,
   * or null if no modals are open.
   */
  public getTopModal(): ModalId | null {
    for (const id of MODAL_PRIORITY) {
      if (this.openModals.has(id)) {
        return id;
      }
    }
    return null;
  }

  public reset(): void {
    this.openModals.clear();
    this.notifyLockState();
  }

  private notifyLockState(): void {
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('game:input_lock', {
          detail: {
            locked: this.isAnyModalOpen(),
            activeModals: this.getOpenModals(),
            topModal: this.getTopModal()
          }
        })
      );
    }
  }
}

export const uiStateManager = new UIStateManager();
