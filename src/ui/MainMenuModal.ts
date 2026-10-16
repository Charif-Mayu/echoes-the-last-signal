import { saveManager } from '../persistence/SaveManager';
import { audioManager } from '../engine/AudioManager';

export class MainMenuModal {
  private container: HTMLElement;
  private rootEl: HTMLElement | null = null;
  private isVisible: boolean = false;
  private onStartCallback: (() => void) | null = null;
  private showingGuide: boolean = false;

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
    wrapper.id = 'main-menu-root';
    wrapper.style.cssText = `
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(14, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%);
      backdrop-filter: blur(14px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 80;
      pointer-events: auto;
      padding: 20px;
      box-sizing: border-box;
    `;

    this.container.appendChild(wrapper);
    this.rootEl = wrapper;
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (this.isVisible && e.key === 'Escape') {
        if (this.showingGuide) {
          e.preventDefault();
          this.showingGuide = false;
          this.render();
        }
      }
    });

    window.addEventListener('ui:open_main_menu', () => {
      this.open();
    });
  }

  public open(onStart?: () => void): void {
    this.onStartCallback = onStart || null;
    this.isVisible = true;
    this.showingGuide = false;
    if (this.rootEl) {
      this.rootEl.style.display = 'flex';
    }
    audioManager.playSynthesizedSFX('blip');
    window.dispatchEvent(new CustomEvent('game:input_lock', { detail: { locked: true } }));
    this.render();
  }

  public close(): void {
    if (!this.rootEl) return;
    this.rootEl.style.display = 'none';
    this.isVisible = false;
    audioManager.playSynthesizedSFX('click');
    window.dispatchEvent(new CustomEvent('game:input_lock', { detail: { locked: false } }));

    if (this.onStartCallback) {
      this.onStartCallback();
      this.onStartCallback = null;
    }
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  private render(): void {
    if (!this.rootEl) return;

    if (this.showingGuide) {
      this.renderGuide();
      return;
    }

    const save = saveManager.load();
    const hasProgress = save.completedObjectiveIds.length > 0 ||
      save.collectedEvidenceIds.length > 0 ||
      save.checkpoint.checkpointId !== 'station_awakening';

    this.rootEl.innerHTML = `
      <div style="width: min(580px, 94vw); background: rgba(13, 20, 32, 0.98); border: 1.5px solid rgba(56, 189, 248, 0.5); border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,0.9), 0 0 45px rgba(56, 189, 248, 0.2); display: flex; flex-direction: column; overflow: hidden; text-align: center;">
        
        <!-- Header Banner -->
        <div style="padding: 32px 24px 20px 24px; background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(13, 20, 32, 0.95) 100%); border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.24em; color: #38bdf8; text-transform: uppercase;">
            CYBERNETIC NARRATIVE INVESTIGATION
          </div>
          <h1 style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 800; color: #f8fafc; letter-spacing: 0.12em; margin: 8px 0 4px 0; text-shadow: 0 0 20px rgba(56, 189, 248, 0.6);">
            ECHOES
          </h1>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #94a3b8; letter-spacing: 0.2em; text-transform: uppercase;">
            THE LAST SIGNAL
          </div>
          <div style="display: inline-block; margin-top: 12px; padding: 4px 12px; background: rgba(14, 116, 144, 0.3); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 20px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #38bdf8;">
            CHAPTER 1: THE LAST STATION // CEFR A1–A2
          </div>
        </div>

        <!-- Menu Action Buttons -->
        <div style="padding: 28px 36px; display: flex; flex-direction: column; gap: 14px;">
          <!-- Continue Button -->
          <button id="menu-btn-continue" class="interactive-element" style="
            background: ${hasProgress ? 'linear-gradient(135deg, #0284c7, #0d9488)' : 'rgba(30, 41, 59, 0.4)'};
            border: 1px solid ${hasProgress ? '#38bdf8' : 'rgba(148, 163, 184, 0.2)'};
            color: ${hasProgress ? '#ffffff' : '#64748b'};
            cursor: ${hasProgress ? 'pointer' : 'not-allowed'};
            padding: 14px 20px;
            border-radius: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.08em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.2s;
            box-shadow: ${hasProgress ? '0 0 20px rgba(56, 189, 248, 0.3)' : 'none'};
          " ${hasProgress ? '' : 'disabled'}>
            <span>▶</span>
            <span>CONTINUE INVESTIGATION</span>
          </button>

          <!-- New Game Button -->
          <button id="menu-btn-new-game" class="interactive-element" style="
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(56, 189, 248, 0.4);
            color: #f8fafc;
            cursor: pointer;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.08em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.2s;
          ">
            <span>⟳</span>
            <span>NEW GAME (START CHAPTER 1)</span>
          </button>

          <!-- Learning Objectives & Guide Button -->
          <button id="menu-btn-guide" class="interactive-element" style="
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(148, 163, 184, 0.3);
            color: #f8fafc;
            cursor: pointer;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.08em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.2s;
          ">
            <span>📖</span>
            <span>LEARNING OBJECTIVES & BRIEFING</span>
          </button>

          <!-- Settings Button -->
          <button id="menu-btn-settings" class="interactive-element" style="
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(148, 163, 184, 0.3);
            color: #cbd5e1;
            cursor: pointer;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.08em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.2s;
          ">
            <span>⚙</span>
            <span>SYSTEM SETTINGS</span>
          </button>
        </div>

        <!-- Footer / Version Info -->
        <div style="padding: 14px 24px; background: rgba(15, 23, 42, 0.9); border-top: 1px solid rgba(148, 163, 184, 0.2); font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
          <span>VER 0.1.0 // STANDALONE PROTOTYPE</span>
          <span>AETHER CITY ARCHIVES</span>
        </div>
      </div>
    `;

    // Button event bindings
    const continueBtn = document.getElementById('menu-btn-continue');
    continueBtn?.addEventListener('click', () => {
      if (hasProgress) {
        this.close();
      }
    });

    const newGameBtn = document.getElementById('menu-btn-new-game');
    newGameBtn?.addEventListener('click', () => {
      if (hasProgress) {
        if (confirm('Start a new game? Current Chapter 1 clues and puzzle attempts will be reset.')) {
          saveManager.resetChapter(1);
          window.location.reload();
        }
      } else {
        this.close();
      }
    });

    const guideBtn = document.getElementById('menu-btn-guide');
    guideBtn?.addEventListener('click', () => {
      audioManager.playSynthesizedSFX('blip');
      this.showingGuide = true;
      this.render();
    });

    const settingsBtn = document.getElementById('menu-btn-settings');
    settingsBtn?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ui:open_settings'));
    });
  }

  private renderGuide(): void {
    if (!this.rootEl) return;

    this.rootEl.innerHTML = `
      <div style="width: min(600px, 94vw); background: rgba(13, 20, 32, 0.98); border: 1.5px solid rgba(56, 189, 248, 0.5); border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,0.9); display: flex; flex-direction: column; overflow: hidden; text-align: left;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 22px; background: rgba(15, 23, 42, 0.9); border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 8px;">
            <span>📖</span>
            <span>MISSION BRIEFING & PEDAGOGICAL TARGETS</span>
          </div>
          <button id="guide-btn-back" class="interactive-element" style="background: transparent; border: none; color: #94a3b8; font-size: 18px; font-weight: bold; cursor: pointer; padding: 2px 6px;">
            ✕
          </button>
        </div>

        <!-- Body -->
        <div style="padding: 22px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; max-height: 70vh;">
          <div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.08em; margin-bottom: 4px;">
              STORY SYNOPSIS
            </div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 13px; line-height: 1.6; color: #cbd5e1;">
              Year 2149. You wake up in the abandoned underground depths of Station 7 beneath Aether City. The central AI, ECHO, has suffered a catastrophic data collapse. To escape, you must investigate clues, communicate with Mira, and solve English language puzzles embedded in station terminals.
            </div>
          </div>

          <div style="height: 1px; background: rgba(148, 163, 184, 0.15);"></div>

          <div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.08em; margin-bottom: 8px;">
              CHAPTER 1 ENGLISH LEARNING TARGETS (CEFR A1–A2)
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px; padding: 10px 14px;">
                <div style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: #f8fafc;">1. Spatial Prepositions of Place</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Learn and apply <code style="color: #38bdf8;">between</code>, <code style="color: #38bdf8;">opposite</code>, and <code style="color: #38bdf8;">inside</code> when interpreting navigational signage.</div>
              </div>
              <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px; padding: 10px 14px;">
                <div style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: #f8fafc;">2. There is / There are (Existence)</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Differentiate between singular/uncountable nouns (<code style="color: #38bdf8;">There is power</code>) and plural nouns (<code style="color: #38bdf8;">There are circuits</code>).</div>
              </div>
              <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px; padding: 10px 14px;">
                <div style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: #f8fafc;">3. Present Simple Agreement</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Form 3rd-person singular verbs correctly (<code style="color: #38bdf8;">The generator supplies energy</code>) to override the blast gate.</div>
              </div>
            </div>
          </div>

          <div style="height: 1px; background: rgba(148, 163, 184, 0.15);"></div>

          <div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.08em; margin-bottom: 4px;">
              CONTROLS & SHORTCUTS
            </div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #94a3b8; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div>[A / D] or [← / →] : Move</div>
              <div>[E] or [Space] : Interact</div>
              <div>[J] : Open Field Journal</div>
              <div>[Esc] : Close Active Modal</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 14px 22px; background: rgba(15, 23, 42, 0.9); border-top: 1px solid rgba(148, 163, 184, 0.2); display: flex; justify-content: flex-end;">
          <button id="guide-btn-close-bottom" class="interactive-element" style="background: linear-gradient(135deg, #0284c7, #0d9488); border: 1px solid #38bdf8; color: #ffffff; border-radius: 6px; padding: 8px 18px; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer;">
            BACK TO MENU
          </button>
        </div>
      </div>
    `;

    document.getElementById('guide-btn-back')?.addEventListener('click', () => {
      this.showingGuide = false;
      this.render();
    });

    document.getElementById('guide-btn-close-bottom')?.addEventListener('click', () => {
      this.showingGuide = false;
      this.render();
    });
  }
}
