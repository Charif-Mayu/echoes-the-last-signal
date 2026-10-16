import { DialogueLine, DialogueChoice } from '../types/narrative';
import { dialogueRunner } from '../systems/DialogueRunner';
import { audioManager } from '../engine/AudioManager';
import { saveManager } from '../persistence/SaveManager';
import { uiStateManager } from '../systems/UIStateManager';

export class DialogueModal {
  private container: HTMLElement;
  private rootEl: HTMLElement | null = null;
  private isVisible: boolean = false;
  private currentLine: DialogueLine | null = null;
  private typewriterTimer: number | null = null;

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
    wrapper.id = 'dialogue-modal-root';
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-modal', 'true');
    wrapper.setAttribute('aria-label', 'Radio Transmission Dialogue');
    wrapper.style.cssText = `
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      width: min(860px, 94vw);
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(3, 7, 18, 0.90) 100%);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 24px;
      padding: 22px 26px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: none;
      flex-direction: column;
      gap: 14px;
      z-index: 50;
      pointer-events: auto;
      box-sizing: border-box;
    `;

    wrapper.innerHTML = `
      <!-- Header / Speaker info -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid rgba(56, 189, 248, 0.18); padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 10px #38bdf8; animation: pulse 1.5s infinite;"></span>
          <span id="dlg-speaker-name" style="font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: #38bdf8; letter-spacing: 0.1em; text-transform: uppercase;">
            MIRA // EMERGENCY FREQUENCY
          </span>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button id="dlg-btn-tts" title="Listen to pronunciation" class="interactive-element" style="background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 999px; color: #38bdf8; padding: 5px 14px; font-size: 11px; font-family: 'Outfit', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);">
            🔊 Listen
          </button>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #94a3b8;">[Space / E to advance]</span>
        </div>
      </div>

      <!-- Main Body: Rounded Character Portrait Frame + Dialogue Text -->
      <div style="display: flex; align-items: center; gap: 18px;">
        <!-- Rounded Silhouette Avatar Frame -->
        <div id="dlg-portrait-frame" style="flex-shrink: 0; width: 74px; height: 74px; border-radius: 20px; background: radial-gradient(circle at 50% 35%, rgba(56, 189, 248, 0.25) 0%, rgba(15, 23, 42, 0.85) 75%); border: 1px solid rgba(56, 189, 248, 0.35); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
        </div>

        <!-- Dialogue Text Body -->
        <div style="flex: 1; min-height: 54px; display: flex; flex-direction: column; justify-content: center; gap: 6px;">
          <!-- English Line (Primary) -->
          <p id="dlg-text-en" style="font-family: 'Outfit', sans-serif; font-size: 16.5px; font-weight: 500; line-height: 1.55; color: #f8fafc; margin: 0;"></p>
          <!-- Thai Translation (Subordinate) -->
          <p id="dlg-text-th" style="font-family: 'Outfit', 'Chakra Petch', sans-serif; font-size: 13.5px; line-height: 1.45; color: #94a3b8; margin: 0;"></p>
        </div>
      </div>

      <!-- Dialogue Choices Container -->
      <div id="dlg-choices-container" style="display: none; flex-direction: column; gap: 8px; margin-top: 4px;"></div>
    `;

    this.container.appendChild(wrapper);
    this.rootEl = wrapper;
  }

  private getPortraitSVG(speaker: string): string {
    const s = speaker.toLowerCase();
    if (s.includes('mira')) {
      // Sleek curved silhouette of Mira with comms headset & glowing cyan signal wave
      return `
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="miraGlow" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.55"/>
              <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="32" cy="28" r="26" fill="url(#miraGlow)"/>
          <!-- Shoulders -->
          <path d="M12 60 C14 47, 22 44, 32 44 C42 44, 50 47, 52 60 Z" fill="#0e7490" stroke="#38bdf8" stroke-width="1.2" stroke-opacity="0.5"/>
          <!-- Head & Flowing Hair Silhouette -->
          <path d="M20 30 C18 17, 25 12, 33 12 C41 12, 46 18, 45 29 C44 36, 38 40, 32 40 C26 40, 21 36, 20 30 Z" fill="#1e293b" stroke="#7dd3fc" stroke-width="1.2"/>
          <!-- Comms Headset Arc & Glowing Ear Node -->
          <path d="M22 26 C22 15, 42 15, 43 26" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
          <circle cx="43" cy="28" r="3.5" fill="#38bdf8"/>
          <path d="M43 29 Q38 34 33 34" stroke="#bae6fd" stroke-width="1.5" stroke-linecap="round"/>
          <!-- Holographic Audio Waveform -->
          <path d="M14 52 Q20 46 26 52 T38 52 T50 52" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.8"/>
        </svg>
      `;
    }
    if (s.includes('system') || s.includes('echo')) {
      return `
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="20" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="5 3" stroke-opacity="0.7"/>
          <circle cx="32" cy="32" r="12" fill="rgba(56,189,248,0.2)" stroke="#7dd3fc" stroke-width="1.5"/>
          <circle cx="32" cy="32" r="4.5" fill="#e0f2fe"/>
        </svg>
      `;
    }
    // Default: Investigator Silhouette with Aerodynamic Curved Visor
    return `
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 60 C13 46, 21 42, 32 42 C43 42, 51 46, 54 60 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2" stroke-opacity="0.45"/>
        <path d="M18 39 L22 28 L42 28 L46 39 Z" fill="#1e293b"/>
        <path d="M19 26 C18 14, 26 10, 33 10 C41 10, 46 15, 46 25 C46 33, 40 38, 32 38 C24 38, 19 33, 19 26 Z" fill="#334155" stroke="#94a3b8" stroke-width="1.2"/>
        <!-- Sleek Glowing Cyan Visor -->
        <path d="M24 22 Q35 19 45 23 Q44 27 34 27 Q25 26 24 22 Z" fill="#38bdf8"/>
        <ellipse cx="36" cy="23.5" rx="4" ry="1" fill="#ffffff" fill-opacity="0.9"/>
      </svg>
    `;
  }

  private bindEvents(): void {
    // Runner line change
    dialogueRunner.onLineChange((line) => {
      this.displayLine(line);
    });

    // Runner end
    dialogueRunner.onEnd(() => {
      this.hide();
    });

    // Advance on click or keyboard
    this.rootEl?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('#dlg-choices-container') || target.closest('#dlg-btn-tts')) return;
      this.handleAdvance();
    });

    // Keyboard Space / Enter / E to advance, or 1/2/3 for choices
    window.addEventListener('keydown', (e) => {
      if (!this.isVisible || uiStateManager.getTopModal() !== 'dialogue') return;

      if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'e') {
        // Allow skipping typewriter even if line has choices; only block if typewriter finished and choices await selection
        if (!this.typewriterTimer && this.currentLine?.choices && this.currentLine.choices.length > 0) {
          return;
        }
        e.preventDefault();
        this.handleAdvance();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        if (this.currentLine?.choices && this.currentLine.choices[index]) {
          e.preventDefault();
          if (this.typewriterTimer) {
            this.handleAdvance();
          }
          this.selectChoice(this.currentLine.choices[index].id);
        }
      }
    });

    // Optional TTS button
    const ttsBtn = document.getElementById('dlg-btn-tts');
    if (ttsBtn) {
      ttsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.speakCurrentLine();
      });
    }
  }

  public show(): void {
    if (!this.rootEl) return;
    this.rootEl.style.display = 'flex';
    this.isVisible = true;
    uiStateManager.registerOpen('dialogue');
  }

  public hide(): void {
    if (!this.rootEl) return;
    this.rootEl.style.display = 'none';
    this.isVisible = false;
    this.currentLine = null;

    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }

    uiStateManager.registerClose('dialogue');
  }

  private displayLine(line: DialogueLine): void {
    this.currentLine = line;
    this.show();

    const speakerEl = document.getElementById('dlg-speaker-name');
    const portraitEl = document.getElementById('dlg-portrait-frame');
    const enEl = document.getElementById('dlg-text-en');
    const thEl = document.getElementById('dlg-text-th');
    const choicesEl = document.getElementById('dlg-choices-container');

    // Clear previous line's choices immediately so stale buttons are never shown during typing
    if (choicesEl) {
      choicesEl.style.display = 'none';
      choicesEl.innerHTML = '';
    }

    if (speakerEl) {
      speakerEl.textContent = line.speakerDisplayName || line.speaker.toUpperCase();
    }

    if (portraitEl) {
      portraitEl.innerHTML = this.getPortraitSVG(line.speaker);
    }

    const settings = saveManager.load().settings;

    // Typewriter effect on English text
    if (enEl) {
      if (this.typewriterTimer) clearInterval(this.typewriterTimer);

      enEl.textContent = '';
      const fullText = line.textEn;
      let charIndex = 0;
      const speed = Math.max(8, settings.subtitles.textSpeedMs || 20);

      this.typewriterTimer = window.setInterval(() => {
        if (charIndex < fullText.length) {
          enEl.textContent += fullText[charIndex];
          charIndex++;
        } else {
          if (this.typewriterTimer) {
            clearInterval(this.typewriterTimer);
            this.typewriterTimer = null;
          }
          // Reveal choices after text finishes
          this.renderChoices(line.choices, choicesEl);
        }
      }, speed);
    }

    // Thai translation
    if (thEl) {
      if (settings.subtitles.showThaiTranslations && line.textTh) {
        thEl.textContent = line.textTh;
        thEl.style.display = 'block';
      } else {
        thEl.style.display = 'none';
      }
    }

    // Play radio or blip audio effect
    if (line.speaker === 'mira') {
      audioManager.playSynthesizedSFX('radio_on');
    } else {
      audioManager.playSynthesizedSFX('blip');
    }
  }

  private renderChoices(choices?: DialogueChoice[], container?: HTMLElement | null): void {
    if (!container) return;

    if (!choices || choices.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.innerHTML = '';
    container.style.display = 'flex';

    choices.forEach((choice, index) => {
      const btn = document.createElement('button');
      btn.className = 'interactive-element';
      btn.style.cssText = `
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.72) 0%, rgba(7, 12, 24, 0.88) 100%);
        border: 1px solid rgba(56, 189, 248, 0.28);
        border-radius: 14px;
        padding: 11px 16px;
        color: #f8fafc;
        font-family: 'Outfit', sans-serif;
        font-size: 14px;
        text-align: left;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        transition: all 0.2s ease;
      `;

      btn.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #38bdf8; font-weight: bold;">[${index + 1}]</span>
          <span>${choice.textEn}</span>
        </div>
        ${choice.textTh ? `<span style="font-size: 12px; color: #94a3b8; margin-left: 12px;">${choice.textTh}</span>` : ''}
      `;

      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'linear-gradient(135deg, rgba(14, 116, 144, 0.45) 0%, rgba(15, 23, 42, 0.9) 100%)';
        btn.style.borderColor = 'rgba(56, 189, 248, 0.75)';
        audioManager.playSynthesizedSFX('click');
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.72) 0%, rgba(7, 12, 24, 0.88) 100%)';
        btn.style.borderColor = 'rgba(56, 189, 248, 0.28)';
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectChoice(choice.id);
      });

      container.appendChild(btn);
    });
  }

  private handleAdvance(): void {
    // If currently typing, finish immediately on first click
    if (this.typewriterTimer && this.currentLine) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
      const enEl = document.getElementById('dlg-text-en');
      if (enEl) enEl.textContent = this.currentLine.textEn;
      const choicesEl = document.getElementById('dlg-choices-container');
      this.renderChoices(this.currentLine.choices, choicesEl);
      return;
    }

    dialogueRunner.advance();
  }

  private selectChoice(choiceId: string): void {
    audioManager.playSynthesizedSFX('click');
    dialogueRunner.selectChoice(choiceId);
  }

  private speakCurrentLine(): void {
    if (!this.currentLine || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(this.currentLine.textEn);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[DialogueModal] SpeechSynthesis error:', e);
    }
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }
}
