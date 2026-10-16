import { saveManager } from '../persistence/SaveManager';
import { audioManager } from '../engine/AudioManager';
import { uiStateManager } from '../systems/UIStateManager';

export class SettingsModal {
  private container: HTMLElement;
  private rootEl: HTMLElement | null = null;
  private isVisible: boolean = false;
  private onSaveCallback: (() => void) | null = null;

  constructor(containerId: string = 'ui-container') {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`UI container #${containerId} not found.`);
    }
    this.container = el;
    this.createDOM();
    this.bindEvents();
  }

  private createDOM(): void {
    const wrapper = document.createElement('div');
    wrapper.id = 'settings-modal-root';
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-modal', 'true');
    wrapper.setAttribute('aria-label', 'System Configuration');
    wrapper.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(4, 9, 18, 0.88);
      backdrop-filter: blur(12px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 90;
      pointer-events: auto;
      padding: 16px;
      box-sizing: border-box;
    `;

    this.container.appendChild(wrapper);
    this.rootEl = wrapper;
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (this.isVisible && uiStateManager.getTopModal() === 'settings' && e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });

    window.addEventListener('ui:open_settings', () => {
      this.open();
    });
  }

  public open(onSave?: () => void): void {
    this.onSaveCallback = onSave || null;
    this.isVisible = true;
    if (this.rootEl) {
      this.rootEl.style.display = 'flex';
    }
    audioManager.playSynthesizedSFX('blip');
    uiStateManager.registerOpen('settings');
    this.render();
  }

  public close(): void {
    if (!this.rootEl) return;
    this.rootEl.style.display = 'none';
    this.isVisible = false;
    audioManager.playSynthesizedSFX('click');
    uiStateManager.registerClose('settings');

    if (this.onSaveCallback) {
      this.onSaveCallback();
    }
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  private render(): void {
    if (!this.rootEl) return;
    const save = saveManager.load();
    const { audio, subtitles } = save.settings;

    this.rootEl.innerHTML = `
      <div style="width: min(540px, 94vw); background: rgba(13, 20, 32, 0.98); border: 1.5px solid rgba(56, 189, 248, 0.45); border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,0.9), 0 0 35px rgba(56, 189, 248, 0.15); display: flex; flex-direction: column; overflow: hidden;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 22px; background: rgba(15, 23, 42, 0.9); border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 700; color: #38bdf8; letter-spacing: 0.08em; display: flex; align-items: center; gap: 8px;">
            <span>⚙</span>
            <span>SYSTEM CONFIGURATION</span>
          </div>
          <button id="settings-btn-close" class="interactive-element" style="background: transparent; border: none; color: #94a3b8; font-size: 18px; font-weight: bold; cursor: pointer; padding: 2px 6px;">
            ✕
          </button>
        </div>

        <!-- Settings Options Body -->
        <div style="padding: 22px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto;">
          <!-- Audio Section -->
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.08em;">
              AUDIO SETTINGS
            </div>
            <!-- Master Volume -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-family: 'Outfit', sans-serif; font-size: 14px; color: #f8fafc; font-weight: 500;">Master Volume</div>
                <div style="font-size: 11px; color: #94a3b8;">Controls overall sound effects and ambiance</div>
              </div>
              <input id="set-vol-master" type="range" min="0" max="100" value="${Math.round(audio.masterVolume * 100)}" class="interactive-element" style="width: 140px; cursor: pointer;" />
            </div>

            <!-- Mute Toggle -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-family: 'Outfit', sans-serif; font-size: 14px; color: #f8fafc; font-weight: 500;">Mute All Audio</div>
                <div style="font-size: 11px; color: #94a3b8;">Disable all SFX and background drone</div>
              </div>
              <button id="set-btn-mute" class="interactive-element" style="background: ${audio.muted ? '#ef4444' : 'rgba(30, 41, 59, 0.8)'}; border: 1px solid rgba(148, 163, 184, 0.3); color: #f8fafc; border-radius: 6px; padding: 6px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; cursor: pointer;">
                ${audio.muted ? 'MUTED' : 'UNMUTED'}
              </button>
            </div>
          </div>

          <div style="height: 1px; background: rgba(148, 163, 184, 0.15);"></div>

          <!-- Subtitle & Language Section -->
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.08em;">
              SUBTITLES & PEDAGOGICAL SCAFFOLDING
            </div>
            <!-- Thai Translation Toggle -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-family: 'Outfit', sans-serif; font-size: 14px; color: #f8fafc; font-weight: 500;">Thai Translations (แปลไทย)</div>
                <div style="font-size: 11px; color: #94a3b8;">Show Thai explanations alongside English text</div>
              </div>
              <button id="set-btn-thai" class="interactive-element" style="background: ${subtitles.showThaiTranslations ? '#0284c7' : 'rgba(30, 41, 59, 0.8)'}; border: 1px solid rgba(148, 163, 184, 0.3); color: #f8fafc; border-radius: 6px; padding: 6px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; cursor: pointer;">
                ${subtitles.showThaiTranslations ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <!-- Text Speed -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-family: 'Outfit', sans-serif; font-size: 14px; color: #f8fafc; font-weight: 500;">Text Typewriter Speed</div>
                <div style="font-size: 11px; color: #94a3b8;">Subtitle dialogue reveal rate</div>
              </div>
              <select id="set-sel-speed" class="interactive-element" style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.4); color: #f8fafc; border-radius: 6px; padding: 6px 10px; font-family: 'Outfit', sans-serif; font-size: 12px; cursor: pointer;">
                <option value="40" ${subtitles.textSpeedMs >= 35 ? 'selected' : ''}>Slow (40ms)</option>
                <option value="20" ${subtitles.textSpeedMs >= 15 && subtitles.textSpeedMs < 35 ? 'selected' : ''}>Normal (20ms)</option>
                <option value="8" ${subtitles.textSpeedMs < 15 ? 'selected' : ''}>Instant / Fast (8ms)</option>
              </select>
            </div>
          </div>

          <div style="height: 1px; background: rgba(148, 163, 184, 0.15);"></div>

          <!-- Danger Zone Section -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: #f87171; letter-spacing: 0.08em;">
              PROGRESS MANAGEMENT
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-family: 'Outfit', sans-serif; font-size: 13px; color: #e2e8f0;">Reset Chapter 1 Progress</div>
                <div style="font-size: 11px; color: #94a3b8;">Clear clues and restart from the platform awakening</div>
              </div>
              <button id="set-btn-reset-save" class="interactive-element" style="background: rgba(127, 29, 29, 0.5); border: 1px solid #ef4444; color: #fca5a5; border-radius: 6px; padding: 6px 12px; font-family: 'JetBrains Mono', monospace; font-size: 11px; cursor: pointer;">
                RESET PROGRESS
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 14px 22px; background: rgba(15, 23, 42, 0.9); border-top: 1px solid rgba(148, 163, 184, 0.2); display: flex; justify-content: flex-end;">
          <button id="settings-btn-done" class="interactive-element" style="background: linear-gradient(135deg, #0284c7, #0d9488); border: 1px solid #38bdf8; color: #ffffff; border-radius: 6px; padding: 8px 20px; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer;">
            APPLY & CLOSE
          </button>
        </div>
      </div>
    `;

    // Bind Controls
    const closeBtn = document.getElementById('settings-btn-close');
    closeBtn?.addEventListener('click', () => this.close());

    const doneBtn = document.getElementById('settings-btn-done');
    doneBtn?.addEventListener('click', () => this.close());

    // Volume Slider
    const volSlider = document.getElementById('set-vol-master') as HTMLInputElement | null;
    volSlider?.addEventListener('input', () => {
      const vol = parseInt(volSlider.value, 10) / 100;
      audioManager.updateSettings({ masterVolume: vol });
      const current = saveManager.load();
      current.settings.audio.masterVolume = vol;
      saveManager.save(current);
    });

    // Mute Button
    const muteBtn = document.getElementById('set-btn-mute');
    muteBtn?.addEventListener('click', () => {
      const current = saveManager.load();
      const nextMuted = !current.settings.audio.muted;
      audioManager.updateSettings({ muted: nextMuted });
      current.settings.audio.muted = nextMuted;
      saveManager.save(current);
      audioManager.playSynthesizedSFX('click');
      this.render();
    });

    // Thai Subtitle Toggle
    const thaiBtn = document.getElementById('set-btn-thai');
    thaiBtn?.addEventListener('click', () => {
      const current = saveManager.load();
      const nextVal = !current.settings.subtitles.showThaiTranslations;
      current.settings.subtitles.showThaiTranslations = nextVal;
      saveManager.save(current);
      audioManager.playSynthesizedSFX('click');
      this.render();
    });

    // Speed Select
    const speedSelect = document.getElementById('set-sel-speed') as HTMLSelectElement | null;
    speedSelect?.addEventListener('change', () => {
      const current = saveManager.load();
      current.settings.subtitles.textSpeedMs = parseInt(speedSelect.value, 10);
      saveManager.save(current);
      audioManager.playSynthesizedSFX('click');
    });

    // Reset Save Button
    const resetBtn = document.getElementById('set-btn-reset-save');
    resetBtn?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset Chapter 1? All discovered clues and completed puzzles will be reset.')) {
        saveManager.resetChapter(1);
        window.location.reload();
      }
    });
  }
}
