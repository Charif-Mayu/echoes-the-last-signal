import { DialogueLine, DialogueChoice } from '../types/narrative';
import { dialogueRunner } from '../systems/DialogueRunner';
import { audioManager } from '../engine/AudioManager';
import { saveManager } from '../persistence/SaveManager';

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
    wrapper.style.cssText = `
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      width: min(840px, 94vw);
      background: rgba(8, 14, 24, 0.94);
      border: 1.5px solid rgba(56, 189, 248, 0.5);
      border-radius: 12px;
      padding: 20px 24px;
      box-shadow: 0 16px 50px rgba(0, 0, 0, 0.8), 0 0 24px rgba(56, 189, 248, 0.15);
      backdrop-filter: blur(12px);
      display: none;
      flex-direction: column;
      gap: 12px;
      z-index: 50;
      pointer-events: auto;
      box-sizing: border-box;
    `;

    wrapper.innerHTML = `
      <!-- Header / Speaker info -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(56, 189, 248, 0.2); padding-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; animation: pulse 1.5s infinite;"></span>
          <span id="dlg-speaker-name" style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; color: #38bdf8; letter-spacing: 0.08em; text-transform: uppercase;">
            MIRA // EMERGENCY FREQUENCY
          </span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="dlg-btn-tts" title="Listen to pronunciation" style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 6px; color: #38bdf8; padding: 4px 10px; font-size: 11px; font-family: 'JetBrains Mono', monospace; cursor: pointer; transition: all 0.2s;">
            🔊 Listen
          </button>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #64748b;">[Space / E to advance]</span>
        </div>
      </div>

      <!-- Dialogue Text Body -->
      <div style="min-height: 48px; display: flex; flex-direction: column; gap: 6px;">
        <!-- English Line (Primary) -->
        <p id="dlg-text-en" style="font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 500; line-height: 1.5; color: #f8fafc; margin: 0;"></p>
        <!-- Thai Translation (Subordinate) -->
        <p id="dlg-text-th" style="font-family: 'Outfit', 'Chakra Petch', sans-serif; font-size: 13px; line-height: 1.4; color: #94a3b8; margin: 0;"></p>
      </div>

      <!-- Dialogue Choices Container -->
      <div id="dlg-choices-container" style="display: none; flex-direction: column; gap: 8px; margin-top: 4px;"></div>
    `;

    this.container.appendChild(wrapper);
    this.rootEl = wrapper;
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
      if (!this.isVisible) return;

      if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'e') {
        // If choices are visible, don't advance blindly
        if (this.currentLine?.choices && this.currentLine.choices.length > 0) return;
        e.preventDefault();
        this.handleAdvance();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        if (this.currentLine?.choices && this.currentLine.choices[index]) {
          e.preventDefault();
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

    // Dispatch event to lock game input
    window.dispatchEvent(new CustomEvent('game:input_lock', { detail: { locked: true } }));
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

    // Unlock game input
    window.dispatchEvent(new CustomEvent('game:input_lock', { detail: { locked: false } }));
  }

  private displayLine(line: DialogueLine): void {
    this.currentLine = line;
    this.show();

    const speakerEl = document.getElementById('dlg-speaker-name');
    const enEl = document.getElementById('dlg-text-en');
    const thEl = document.getElementById('dlg-text-th');
    const choicesEl = document.getElementById('dlg-choices-container');

    if (speakerEl) {
      speakerEl.textContent = line.speakerDisplayName || line.speaker.toUpperCase();
    }

    const settings = saveManager.load().settings;

    // Typewriter effect on English text
    if (enEl) {
      if (this.typewriterTimer) clearInterval(this.typewriterTimer);

      enEl.textContent = '';
      const fullText = line.textEn;
      let charIndex = 0;
      const speed = Math.max(12, settings.subtitles.textSpeedMs || 20);

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
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(56, 189, 248, 0.35);
        border-radius: 8px;
        padding: 10px 14px;
        color: #f8fafc;
        font-family: 'Outfit', sans-serif;
        font-size: 14px;
        text-align: left;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
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
        btn.style.background = 'rgba(14, 116, 144, 0.4)';
        btn.style.borderColor = '#38bdf8';
        audioManager.playSynthesizedSFX('click');
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(15, 23, 42, 0.8)';
        btn.style.borderColor = 'rgba(56, 189, 248, 0.35)';
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
