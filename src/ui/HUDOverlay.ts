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
      <div id="hud-root" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 16px 20px; box-sizing: border-box; pointer-events: none;">
        <!-- Top Header Bar -->
        <header style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; pointer-events: auto;">
          <!-- Objective Card (Glassmorphism 2.0) -->
          <div role="status" aria-live="polite" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(3, 7, 18, 0.90) 100%); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 24px; padding: 12px 20px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); max-width: min(460px, 92vw); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 8px #38bdf8; animation: pulse 1.8s infinite;"></span>
              MISSION OBJECTIVE // CH.1
            </div>
            <div id="hud-objective-text" style="font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 600; color: #f8fafc; margin-top: 4px;">
              ${activeObj.titleEn}
            </div>
            <div id="hud-objective-desc" style="font-size: 12.5px; color: #94a3b8; margin-top: 2px;">
              ${activeObj.descriptionEn}
            </div>
          </div>

          <!-- Utility Controls (Curved Glass Pills) -->
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <button id="btn-open-journal" class="interactive-element" style="background: linear-gradient(135deg, rgba(14, 116, 144, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%); border: 1px solid rgba(56, 189, 248, 0.45); color: #f8fafc; border-radius: 999px; padding: 8px 16px; font-family: 'Outfit', sans-serif; font-size: 12.5px; font-weight: 600; letter-spacing: 0.04em; backdrop-filter: blur(16px); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.12); cursor: pointer; transition: all 0.2s;">
              📁 JOURNAL [J]
            </button>
            <button id="btn-open-settings" class="interactive-element" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(3, 7, 18, 0.90) 100%); border: 1px solid rgba(56, 189, 248, 0.22); color: #cbd5e1; border-radius: 999px; padding: 8px 16px; font-family: 'Outfit', sans-serif; font-size: 12.5px; font-weight: 500; backdrop-filter: blur(16px); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08); cursor: pointer; transition: all 0.2s;">
              ⚙ SETTINGS
            </button>
            <button id="btn-open-menu" class="interactive-element" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(3, 7, 18, 0.90) 100%); border: 1px solid rgba(56, 189, 248, 0.22); color: #cbd5e1; border-radius: 999px; padding: 8px 16px; font-family: 'Outfit', sans-serif; font-size: 12.5px; font-weight: 500; backdrop-filter: blur(16px); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08); cursor: pointer; transition: all 0.2s;">
              ☰ MENU
            </button>
            <button id="btn-audio-toggle" class="interactive-element" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(3, 7, 18, 0.90) 100%); border: 1px solid rgba(56, 189, 248, 0.22); color: ${isMuted ? '#ef4444' : '#38bdf8'}; border-radius: 999px; padding: 8px 16px; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; font-weight: 600; backdrop-filter: blur(16px); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08); cursor: pointer; transition: all 0.2s;">
              ${isMuted ? 'AUDIO: OFF' : 'AUDIO: ON'}
            </button>
          </div>
        </header>

        <!-- Dynamic Message / Notification Toast -->
        <div id="hud-message-banner" role="alert" aria-live="assertive" style="align-self: center; max-width: 92vw; text-align: center; background: linear-gradient(135deg, rgba(15, 23, 42, 0.82) 0%, rgba(3, 7, 18, 0.94) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(56, 189, 248, 0.45); border-radius: 999px; padding: 12px 28px; color: #f8fafc; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; display: none; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), 0 0 28px rgba(56, 189, 248, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12); pointer-events: auto;">
        </div>

        <!-- Bottom Controls / Mobile Touch Bar -->
        <footer style="display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; pointer-events: none;">
          <!-- Controls Legend for Desktop -->
          <div class="desktop-controls-legend" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.72) 0%, rgba(3, 7, 18, 0.88) 100%); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 999px; padding: 8px 18px; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: #94a3b8; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);">
            [A/D or ←/→] Move &nbsp;|&nbsp; [E / Space] Interact &nbsp;|&nbsp; [J] Journal &nbsp;|&nbsp; [Esc] Menu
          </div>

          <!-- Virtual Touch Buttons for Mobile -->
          <div id="virtual-controls" style="display: flex; gap: 8px; pointer-events: auto; margin-left: auto;">
            <button id="vbtn-left" aria-label="Move Left" class="interactive-element" style="width: 52px; height: 52px; border-radius: 18px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.78) 0%, rgba(3, 7, 18, 0.92) 100%); backdrop-filter: blur(16px); border: 1px solid rgba(56, 189, 248, 0.35); color: #f8fafc; font-size: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1); touch-action: manipulation; cursor: pointer;">
              ◀
            </button>
            <button id="vbtn-right" aria-label="Move Right" class="interactive-element" style="width: 52px; height: 52px; border-radius: 18px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.78) 0%, rgba(3, 7, 18, 0.92) 100%); backdrop-filter: blur(16px); border: 1px solid rgba(56, 189, 248, 0.35); color: #f8fafc; font-size: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1); touch-action: manipulation; cursor: pointer;">
              ▶
            </button>
            <button id="vbtn-interact" aria-label="Interact with object" class="interactive-element" style="height: 52px; padding: 0 20px; border-radius: 18px; background: linear-gradient(135deg, rgba(14, 116, 144, 0.75) 0%, rgba(3, 7, 18, 0.92) 100%); backdrop-filter: blur(16px); border: 1px solid rgba(56, 189, 248, 0.55); color: #f8fafc; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15); touch-action: manipulation; cursor: pointer;">
              INTERACT [E]
            </button>
            <button id="vbtn-journal" aria-label="Open Field Log Journal" class="interactive-element" style="width: 52px; height: 52px; border-radius: 18px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.78) 0%, rgba(3, 7, 18, 0.92) 100%); backdrop-filter: blur(16px); border: 1px solid rgba(148, 163, 184, 0.35); color: #f8fafc; font-size: 18px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1); touch-action: manipulation; cursor: pointer;">
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
