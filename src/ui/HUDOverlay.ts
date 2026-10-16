import { saveManager } from '../persistence/SaveManager';
import { audioManager } from '../engine/AudioManager';

export class HUDOverlay {
  private container: HTMLElement;
  private objectiveTextEl!: HTMLElement;
  private messageBannerEl!: HTMLElement;

  constructor(containerId: string = 'ui-container') {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`UI container element #${containerId} not found in DOM.`);
    }
    this.container = el;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div id="hud-root" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 16px; box-sizing: border-box; pointer-events: none;">
        <!-- Top Header Bar -->
        <header style="display: flex; justify-content: space-between; align-items: flex-start; pointer-events: auto;">
          <!-- Objective Card -->
          <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 8px; padding: 10px 16px; backdrop-filter: blur(8px); max-width: 440px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.08em; display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #38bdf8; animation: pulse 2s infinite;"></span>
              MISSION OBJECTIVE // CH.1
            </div>
            <div id="hud-objective-text" style="font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 500; color: #f8fafc; margin-top: 4px;">
              Recover and survey the station. Inspect the emergency radio.
            </div>
          </div>

          <!-- Utility Controls -->
          <div style="display: flex; gap: 8px;">
            <button id="btn-audio-toggle" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(148, 163, 184, 0.25); color: #94a3b8; border-radius: 6px; padding: 8px 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.2s;" class="interactive-element">
              AUDIO: ON
            </button>
            <button id="btn-restart-ch" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(148, 163, 184, 0.25); color: #94a3b8; border-radius: 6px; padding: 8px 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.2s;" class="interactive-element">
              RESTART CH.1
            </button>
          </div>
        </header>

        <!-- Dynamic Message / Notification Toast -->
        <div id="hud-message-banner" style="align-self: center; background: rgba(8, 12, 18, 0.92); border: 1px solid #38bdf8; border-radius: 6px; padding: 12px 24px; color: #e2e8f0; font-family: 'Outfit', sans-serif; font-size: 14px; display: none; box-shadow: 0 0 25px rgba(56, 189, 248, 0.25); pointer-events: auto;">
        </div>

        <!-- Bottom Controls / Mobile Touch Bar -->
        <footer style="display: flex; justify-content: space-between; align-items: flex-end; pointer-events: none;">
          <!-- Controls Legend for Desktop -->
          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 6px; padding: 6px 12px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #94a3b8;">
            [A/D or ←/→] Walk &nbsp;|&nbsp; [E / Space] Interact &nbsp;|&nbsp; [J] Journal
          </div>

          <!-- Virtual Touch Buttons for Mobile -->
          <div id="virtual-controls" style="display: flex; gap: 12px; pointer-events: auto;">
            <button id="vbtn-left" class="interactive-element" style="width: 54px; height: 54px; border-radius: 12px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(56, 189, 248, 0.4); color: #f8fafc; font-size: 20px; display: flex; align-items: center; justify-content: center; touch-action: manipulation;">
              ◀
            </button>
            <button id="vbtn-right" class="interactive-element" style="width: 54px; height: 54px; border-radius: 12px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(56, 189, 248, 0.4); color: #f8fafc; font-size: 20px; display: flex; align-items: center; justify-content: center; touch-action: manipulation;">
              ▶
            </button>
            <button id="vbtn-interact" class="interactive-element" style="height: 54px; padding: 0 20px; border-radius: 12px; background: rgba(14, 116, 144, 0.85); border: 1px solid #38bdf8; color: #f8fafc; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; touch-action: manipulation;">
              INTERACT [E]
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
    const audioBtn = document.getElementById('btn-audio-toggle');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const settings = audioManager.getSettings();
        const nextMuted = !settings.muted;
        audioManager.updateSettings({ muted: nextMuted });
        audioBtn.textContent = nextMuted ? 'AUDIO: OFF' : 'AUDIO: ON';
        audioBtn.style.color = nextMuted ? '#ef4444' : '#38bdf8';
        audioManager.playSynthesizedSFX('click');
      });
    }

    const restartBtn = document.getElementById('btn-restart-ch');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        if (confirm('Restart Chapter 1 from the beginning? Unsaved progress will be reset.')) {
          saveManager.resetChapter(1);
          window.location.reload();
        }
      });
    }

    // Connect virtual buttons to window events
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
      btn.addEventListener('mousedown', () => trigger(true));
      btn.addEventListener('mouseup', () => trigger(false));
      btn.addEventListener('mouseleave', () => trigger(false));
    };

    bindVirtualButton('vbtn-left', 'left');
    bindVirtualButton('vbtn-right', 'right');
    bindVirtualButton('vbtn-interact', 'interact');
  }

  public showToast(text: string, durationMs: number = 2800): void {
    if (!this.messageBannerEl) return;
    this.messageBannerEl.textContent = text;
    this.messageBannerEl.style.display = 'block';

    setTimeout(() => {
      this.messageBannerEl.style.display = 'none';
    }, durationMs);
  }

  public setObjective(titleEn: string): void {
    if (this.objectiveTextEl) {
      this.objectiveTextEl.textContent = titleEn;
    }
  }
}
