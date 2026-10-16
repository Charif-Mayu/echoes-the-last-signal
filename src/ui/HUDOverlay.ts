import { audioManager } from '../engine/AudioManager';
import { saveManager } from '../persistence/SaveManager';
import { objectiveTracker } from '../systems/ObjectiveTracker';
import { EvidenceItem, Objective } from '../types/narrative';

export class HUDOverlay {
  private container: HTMLElement;
  private objectiveTextEl!: HTMLElement;
  private messageBannerEl!: HTMLElement;
  private toastTimer: number | null = null;

  constructor(containerId: string = 'ui-container') {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`UI container element #${containerId} not found in DOM.`);
    }
    this.container = el;
    this.render();
  }

  private render(): void {
    const activeObj = objectiveTracker.getCurrentObjective();
    const isMuted = audioManager.getSettings().muted;

    this.container.innerHTML = `
      <div id="hud-root" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 14px; box-sizing: border-box; pointer-events: none;">
        <!-- Top Header Bar -->
        <header style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; pointer-events: auto;">
          <!-- Objective Card -->
          <div role="status" aria-live="polite" style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 10px; padding: 10px 16px; backdrop-filter: blur(10px); max-width: min(460px, 92vw); box-shadow: 0 8px 24px rgba(0,0,0,0.6);">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.08em; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #38bdf8; animation: pulse 1.8s infinite;"></span>
              MISSION OBJECTIVE // CH.1
            </div>
            <div id="hud-objective-text" style="font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #f8fafc; margin-top: 4px;">
              ${activeObj.titleEn}
            </div>
            <div id="hud-objective-desc" style="font-size: 12px; color: #94a3b8; margin-top: 2px;">
              ${activeObj.descriptionEn}
            </div>
          </div>

          <!-- Utility Controls -->
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <button id="btn-open-journal" class="interactive-element" style="background: rgba(14, 116, 144, 0.35); border: 1px solid #38bdf8; color: #f8fafc; border-radius: 6px; padding: 8px 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              📁 JOURNAL [J]
            </button>
            <button id="btn-open-settings" class="interactive-element" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(148, 163, 184, 0.25); color: #cbd5e1; border-radius: 6px; padding: 8px 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.2s;">
              ⚙ SETTINGS
            </button>
            <button id="btn-open-menu" class="interactive-element" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(148, 163, 184, 0.25); color: #cbd5e1; border-radius: 6px; padding: 8px 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.2s;">
              ☰ MENU
            </button>
            <button id="btn-audio-toggle" class="interactive-element" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(148, 163, 184, 0.25); color: ${isMuted ? '#ef4444' : '#38bdf8'}; border-radius: 6px; padding: 8px 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.2s;">
              ${isMuted ? 'AUDIO: OFF' : 'AUDIO: ON'}
            </button>
          </div>
        </header>

        <!-- Dynamic Message / Notification Toast -->
        <div id="hud-message-banner" role="alert" aria-live="assertive" style="align-self: center; max-width: 92vw; text-align: center; background: rgba(8, 14, 24, 0.94); border: 1.5px solid #38bdf8; border-radius: 8px; padding: 12px 24px; color: #f8fafc; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; display: none; box-shadow: 0 0 35px rgba(56, 189, 248, 0.3); pointer-events: auto;">
        </div>

        <!-- Bottom Controls / Mobile Touch Bar -->
        <footer style="display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; pointer-events: none;">
          <!-- Controls Legend for Desktop -->
          <div class="desktop-controls-legend" style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 6px; padding: 8px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #94a3b8;">
            [A/D or ←/→] Move &nbsp;|&nbsp; [E / Space] Interact &nbsp;|&nbsp; [J] Journal &nbsp;|&nbsp; [Esc] Menu
          </div>

          <!-- Virtual Touch Buttons for Mobile -->
          <div id="virtual-controls" style="display: flex; gap: 8px; pointer-events: auto; margin-left: auto;">
            <button id="vbtn-left" aria-label="Move Left" class="interactive-element" style="width: 52px; height: 52px; border-radius: 12px; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(56, 189, 248, 0.4); color: #f8fafc; font-size: 20px; display: flex; align-items: center; justify-content: center; touch-action: manipulation; cursor: pointer;">
              ◀
            </button>
            <button id="vbtn-right" aria-label="Move Right" class="interactive-element" style="width: 52px; height: 52px; border-radius: 12px; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(56, 189, 248, 0.4); color: #f8fafc; font-size: 20px; display: flex; align-items: center; justify-content: center; touch-action: manipulation; cursor: pointer;">
              ▶
            </button>
            <button id="vbtn-interact" aria-label="Interact with object" class="interactive-element" style="height: 52px; padding: 0 18px; border-radius: 12px; background: rgba(14, 116, 144, 0.85); border: 1px solid #38bdf8; color: #f8fafc; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: center; touch-action: manipulation; cursor: pointer;">
              INTERACT [E]
            </button>
            <button id="vbtn-journal" aria-label="Open Field Log Journal" class="interactive-element" style="width: 52px; height: 52px; border-radius: 12px; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(148, 163, 184, 0.4); color: #f8fafc; font-size: 18px; display: flex; align-items: center; justify-content: center; touch-action: manipulation; cursor: pointer;">
              📁
            </button>
          </div>
        </footer>
      </div>
    `;

    this.objectiveTextEl = document.getElementById('hud-objective-text')!;
    this.messageBannerEl = document.getElementById('hud-message-banner')!;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Journal button
    const journalBtn = document.getElementById('btn-open-journal');
    journalBtn?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ui:open_journal'));
    });

    const vJournalBtn = document.getElementById('vbtn-journal');
    vJournalBtn?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ui:open_journal'));
    });

    // Settings button
    const settingsBtn = document.getElementById('btn-open-settings');
    settingsBtn?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ui:open_settings'));
    });

    // Menu button
    const menuBtn = document.getElementById('btn-open-menu');
    menuBtn?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ui:open_main_menu'));
    });

    // Audio toggle & cross-modal sync
    const audioBtn = document.getElementById('btn-audio-toggle');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const settings = audioManager.getSettings();
        const nextMuted = !settings.muted;
        audioManager.updateSettings({ muted: nextMuted });
        const currentSave = saveManager.load();
        currentSave.settings.audio.muted = nextMuted;
        saveManager.save(currentSave);
        audioManager.playSynthesizedSFX('click');
      });

      window.addEventListener('audio:settings_changed', (e: Event) => {
        const customEvent = e as CustomEvent<{ settings: { muted: boolean } }>;
        const muted = customEvent.detail.settings.muted;
        audioBtn.textContent = muted ? 'AUDIO: OFF' : 'AUDIO: ON';
        audioBtn.style.color = muted ? '#ef4444' : '#38bdf8';
      });
    }

    // Connect virtual buttons
    const bindVirtualButton = (btnId: string, control: 'left' | 'right' | 'interact') => {
      const btn = document.getElementById(btnId);
      if (!btn) return;

      const trigger = (pressed: boolean) => {
        window.dispatchEvent(new CustomEvent('virtual-input', {
          detail: { control, pressed }
        }));
      };

      btn.addEventListener('touchstart', (e) => { e.preventDefault(); trigger(true); });
      btn.addEventListener('touchend', (e) => { e.preventDefault(); trigger(false); });
      btn.addEventListener('touchcancel', (e) => { e.preventDefault(); trigger(false); });
      btn.addEventListener('mousedown', () => trigger(true));
      btn.addEventListener('mouseup', () => trigger(false));
      btn.addEventListener('mouseleave', () => trigger(false));
    };

    bindVirtualButton('vbtn-left', 'left');
    bindVirtualButton('vbtn-right', 'right');
    bindVirtualButton('vbtn-interact', 'interact');

    // Listen for objective updates
    window.addEventListener('objective:updated', (e: Event) => {
      const customEvent = e as CustomEvent<{ completedId: string; activeObjective: Objective }>;
      const obj = customEvent.detail.activeObjective;
      this.updateObjective(obj);
      this.showToast(`[OBJECTIVE UPDATED] ${obj.titleEn}`, 3500);
    });

    // Listen for evidence discoveries
    window.addEventListener('evidence:discovered', (e: Event) => {
      const customEvent = e as CustomEvent<{ clue: EvidenceItem }>;
      const clue = customEvent.detail.clue;
      this.showToast(`[EVIDENCE ACQUIRED] ${clue.titleEn}`, 3500);
    });
  }

  public showToast(text: string, durationMs: number = 2800): void {
    if (!this.messageBannerEl) return;

    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }

    this.messageBannerEl.textContent = text;
    this.messageBannerEl.style.display = 'block';

    this.toastTimer = window.setTimeout(() => {
      this.messageBannerEl.style.display = 'none';
      this.toastTimer = null;
    }, durationMs);
  }

  public updateObjective(obj: Objective): void {
    if (this.objectiveTextEl) {
      this.objectiveTextEl.textContent = obj.titleEn;
    }
    const descEl = document.getElementById('hud-objective-desc');
    if (descEl) {
      descEl.textContent = obj.descriptionEn;
    }
  }
}
