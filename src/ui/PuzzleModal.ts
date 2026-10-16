import { PuzzleItem, PuzzleEvaluationResult } from '../types/learning';
import { learningEngine } from '../learning/LearningEngine';
import { audioManager } from '../engine/AudioManager';
import { saveManager } from '../persistence/SaveManager';
import { uiStateManager } from '../systems/UIStateManager';

export type PuzzleCompleteCallback = (puzzleId: string, result: PuzzleEvaluationResult) => void;

export class PuzzleModal {
  private container: HTMLElement;
  private rootEl: HTMLElement | null = null;
  private isVisible: boolean = false;

  private activePuzzle: PuzzleItem | null = null;
  private currentAttempts: number = 0;
  private triedOptionIds: Set<string> = new Set();
  private isSolved: boolean = false;
  private lastResult: PuzzleEvaluationResult | null = null;
  private activeHint: { textEn: string; textTh: string; level: number } | null = null;
  private showThaiScaffolding: boolean = true;
  private immersionModeActive: boolean = false;
  private onCompleteCallback: PuzzleCompleteCallback | null = null;

  constructor(containerId: string = 'ui-container') {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`UI container #${containerId} not found.`);
    }
    this.container = el;
    this.createDOM();
    this.bindGlobalKeys();
  }

  private createDOM(): void {
    const wrapper = document.createElement('div');
    wrapper.id = 'puzzle-modal-root';
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-modal', 'true');
    wrapper.setAttribute('aria-label', 'Language Diagnostic Terminal');
    wrapper.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(4, 9, 18, 0.84);
      backdrop-filter: blur(12px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 65;
      pointer-events: auto;
      padding: 16px;
      box-sizing: border-box;
    `;

    this.container.appendChild(wrapper);
    this.rootEl = wrapper;
  }

  private bindGlobalKeys(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.isVisible || !this.activePuzzle || uiStateManager.getTopModal() !== 'puzzle') return;

      if (e.key === 'Escape' && !this.isSolved) {
        e.preventDefault();
        this.close();
        return;
      }

      if (this.isSolved && (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'e')) {
        e.preventDefault();
        this.finishSolvedPuzzle();
        return;
      }

      if (!this.isSolved && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const opt = this.activePuzzle.options[idx];
        if (opt && !this.triedOptionIds.has(opt.id)) {
          e.preventDefault();
          this.handleSelectOption(opt.id);
        }
      } else if (!this.isSolved && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        this.handleRequestHint();
      }
    });
  }

  public openPuzzle(puzzleId: string, onComplete?: PuzzleCompleteCallback): void {
    const puzzle = learningEngine.getPuzzle(puzzleId);
    if (!puzzle) {
      console.error(`[PuzzleModal] Puzzle "${puzzleId}" not found.`);
      return;
    }

    this.activePuzzle = puzzle;
    this.currentAttempts = 0;
    this.triedOptionIds.clear();
    this.isSolved = false;
    this.lastResult = null;
    this.activeHint = null;
    this.onCompleteCallback = onComplete || null;

    // Register vocabulary encounter
    learningEngine.registerPuzzleEncounter(puzzleId);

    // Check adaptive scaffolding reduction after repeated first-try successes
    const settings = saveManager.load().settings;
    const reduceHints = learningEngine.shouldReduceInitialHints();
    this.immersionModeActive = reduceHints;
    this.showThaiScaffolding = settings.subtitles.showThaiTranslations && !reduceHints;

    this.isVisible = true;
    if (this.rootEl) {
      this.rootEl.style.display = 'flex';
    }

    audioManager.playSynthesizedSFX('blip');
    uiStateManager.registerOpen('puzzle');

    this.render();
  }

  public close(): void {
    if (!this.rootEl) return;
    this.rootEl.style.display = 'none';
    this.isVisible = false;
    this.activePuzzle = null;

    audioManager.playSynthesizedSFX('click');
    uiStateManager.registerClose('puzzle');
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  private handleSelectOption(optionId: string): void {
    if (!this.activePuzzle || this.isSolved) return;

    const result = learningEngine.evaluateAnswer(
      this.activePuzzle.id,
      optionId,
      this.currentAttempts,
      true,
      true
    );

    this.currentAttempts = result.attemptsUsed;
    this.lastResult = result;

    if (result.isCorrect) {
      this.isSolved = true;
      audioManager.playSynthesizedSFX('success');
    } else {
      this.triedOptionIds.add(optionId);
      // Automatically expand Thai scaffolding & progressive hint when struggling
      this.showThaiScaffolding = true;
      this.immersionModeActive = false;
      if (result.nextHintEn) {
        this.activeHint = {
          textEn: result.nextHintEn,
          textTh: result.nextHintTh || '',
          level: Math.min(this.currentAttempts, 2)
        };
      }
      audioManager.playSynthesizedSFX('error');
    }

    this.render();
  }

  private handleRequestHint(): void {
    if (!this.activePuzzle || this.isSolved) return;
    audioManager.playSynthesizedSFX('blip');
    this.showThaiScaffolding = true;
    this.immersionModeActive = false;
    this.activeHint = learningEngine.requestHint(this.activePuzzle.id, true);
    this.render();
  }

  private toggleThaiScaffolding(): void {
    audioManager.playSynthesizedSFX('click');
    this.showThaiScaffolding = !this.showThaiScaffolding;
    this.render();
  }

  private finishSolvedPuzzle(): void {
    if (!this.activePuzzle || !this.lastResult) return;
    const completedPuzzleId = this.activePuzzle.id;
    const finalResult = this.lastResult;
    const cb = this.onCompleteCallback;

    this.close();

    if (cb) {
      cb(completedPuzzleId, finalResult);
    }

    window.dispatchEvent(new CustomEvent('puzzle:completed', {
      detail: { puzzleId: completedPuzzleId, result: finalResult }
    }));
  }

  private render(): void {
    if (!this.rootEl || !this.activePuzzle) return;

    const p = this.activePuzzle;
    const rule = learningEngine.getRule(p.targetRuleId);

    const badgeColor = p.type === 'directions' ? '#38bdf8' : (p.type === 'grammar_in_context' ? '#10b981' : '#f59e0b');
    const typeLabel = p.type === 'directions'
      ? 'SIGNPOST NAVIGATION DECODE'
      : (p.type === 'grammar_in_context' ? 'AUXILIARY TERMINAL DIAGNOSTICS' : 'SECURITY PROTOCOL OVERRIDE');

    let optionsHtml = '';
    p.options.forEach((opt, idx) => {
      const isTriedWrong = this.triedOptionIds.has(opt.id);
      const isSelectedCorrect = this.isSolved && this.lastResult?.selectedOptionId === opt.id;

      let borderCol = 'rgba(56, 189, 248, 0.35)';
      let bgCol = 'rgba(15, 23, 42, 0.85)';
      let statusBadge = `<span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #38bdf8; font-weight: 700;">[${idx + 1}]</span>`;

      if (isSelectedCorrect) {
        borderCol = '#22c55e';
        bgCol = 'rgba(20, 83, 45, 0.45)';
        statusBadge = `<span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #4ade80; font-weight: 700;">✔ VERIFIED</span>`;
      } else if (isTriedWrong) {
        borderCol = 'rgba(239, 68, 68, 0.5)';
        bgCol = 'rgba(69, 10, 10, 0.3)';
        statusBadge = `<span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #f87171;">✗ INCORRECT</span>`;
      }

      const disabledAttr = (this.isSolved || isTriedWrong) ? 'disabled' : '';
      const cursorStyle = (this.isSolved || isTriedWrong) ? 'default' : 'pointer';
      const opacityStyle = (this.isSolved && !isSelectedCorrect) ? '0.5' : (isTriedWrong ? '0.65' : '1');

      optionsHtml += `
        <button
          data-opt-id="${opt.id}"
          class="puzzle-opt-btn interactive-element"
          ${disabledAttr}
          style="width: 100%; background: ${bgCol}; border: 1px solid ${borderCol}; border-radius: 16px; padding: 14px 18px; text-align: left; cursor: ${cursorStyle}; opacity: ${opacityStyle}; display: flex; flex-direction: column; gap: 4px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08); transition: all 0.2s;"
        >
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <span style="font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 600; color: #f8fafc;">
              ${opt.textEn}
            </span>
            ${statusBadge}
          </div>
          ${this.showThaiScaffolding && opt.textTh && opt.textTh !== opt.textEn ? `
            <div style="font-size: 12.5px; color: #94a3b8;">
              ${opt.textTh}
            </div>
          ` : ''}
        </button>
      `;
    });

    // Feedback & Rule Reference HTML
    let feedbackHtml = '';
    if (this.lastResult) {
      const res = this.lastResult;
      const fbBorder = res.isCorrect ? 'rgba(34, 197, 94, 0.45)' : 'rgba(245, 158, 11, 0.45)';
      const fbBg = res.isCorrect ? 'rgba(20, 83, 45, 0.35)' : 'rgba(120, 53, 15, 0.3)';
      const fbHeader = res.isCorrect
        ? '✔ ANALYSIS VERIFIED — CORRECT INTERPRETATION'
        : `⚠ DIAGNOSTIC MISMATCH (Attempt ${res.attemptsUsed}) — TRY ANOTHER OPTION`;
      const fbHeaderCol = res.isCorrect ? '#4ade80' : '#fbbf24';

      // Mastered vocab badges on success
      let vocabBadgesHtml = '';
      if (res.isCorrect && p.relatedVocabIds && p.relatedVocabIds.length > 0) {
        const words = p.relatedVocabIds
          .map((id) => learningEngine.getVocabularyItem(id))
          .filter(Boolean)
          .map((v) => `<span style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 3px 10px; border-radius: 999px;">+${v!.word} (${v!.meaningTh})</span>`)
          .join(' ');

        vocabBadgesHtml = `
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(74, 222, 128, 0.2); display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
            <span style="font-size: 11px; color: #86efac; font-family: 'JetBrains Mono', monospace;">VOCABULARY LOGGED:</span>
            ${words}
          </div>
        `;
      }

      feedbackHtml = `
        <div style="background: ${fbBg}; border: 1px solid ${fbBorder}; border-radius: 16px; padding: 14px 18px; display: flex; flex-direction: column; gap: 6px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; color: ${fbHeaderCol}; letter-spacing: 0.05em;">
            ${fbHeader}
          </div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 14px; color: #f8fafc; line-height: 1.45;">
            ${res.explanationEn}
          </div>
          <div style="font-size: 13px; color: #cbd5e1; line-height: 1.4;">
            💡 คำอธิบาย: ${res.explanationTh}
          </div>
          ${!res.isCorrect && rule ? `
            <div style="margin-top: 6px; padding: 10px 14px; background: rgba(15, 23, 42, 0.72); border-left: 3px solid #38bdf8; border-radius: 10px; font-size: 12px; color: #e2e8f0;">
              <strong style="color: #38bdf8;">Grammar Rule (${rule.titleEn}):</strong> <code>${rule.formula}</code>
              <div style="color: #94a3b8; margin-top: 2px;">${rule.explanationTh}</div>
            </div>
          ` : ''}
          ${vocabBadgesHtml}
        </div>
      `;
    }

    // Hint Banner HTML
    let hintHtml = '';
    if (this.activeHint && !this.isSolved) {
      hintHtml = `
        <div style="background: rgba(14, 116, 144, 0.22); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 14px; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #38bdf8; font-weight: 700;">
            💡 ADAPTIVE HINT (LEVEL ${this.activeHint.level})
          </div>
          <div style="font-size: 13px; color: #f1f5f9;">
            ${this.activeHint.textEn}
          </div>
          ${this.activeHint.textTh ? `<div style="font-size: 12px; color: #94a3b8;">${this.activeHint.textTh}</div>` : ''}
        </div>
      `;
    }

    this.rootEl.innerHTML = `
      <div style="width: min(860px, 95vw); max-height: 92vh; background: linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(3, 7, 18, 0.90) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 24px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1); display: flex; flex-direction: column; overflow: hidden;">
        <!-- Top Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: rgba(15, 23, 42, 0.55); border-bottom: 1px solid rgba(56, 189, 248, 0.15); flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: #020617; background: ${badgeColor}; padding: 4px 10px; border-radius: 999px;">
              ${typeLabel}
            </span>
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); padding: 3px 10px; border-radius: 999px;">
              CEFR ${p.difficulty || 'A1–A2'}
            </span>
            <span style="font-size: 12px; color: #94a3b8;">
              ${p.grammarConcept || rule?.topic || ''}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            ${!this.isSolved ? `
              <button id="puzzle-btn-hint" class="interactive-element" style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.45); color: #fbbf24; border-radius: 999px; padding: 5px 12px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 11.5px; cursor: pointer;">
                💡 Hint [H]
              </button>
            ` : ''}
            <button id="puzzle-btn-thai" class="interactive-element" style="background: rgba(30, 41, 59, 0.65); border: 1px solid rgba(148, 163, 184, 0.25); color: ${this.showThaiScaffolding ? '#38bdf8' : '#94a3b8'}; border-radius: 999px; padding: 5px 12px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 11.5px; cursor: pointer;">
              🇹🇭 แปลไทย: ${this.showThaiScaffolding ? 'ON' : 'OFF'}
            </button>
            ${!this.isSolved ? `
              <button id="puzzle-btn-close" class="interactive-element" title="Close [Esc]" style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 50%; width: 30px; height: 30px; color: #94a3b8; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                ✕
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Scrollable Content Area -->
        <div style="padding: 22px 26px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px;">
          <!-- Title & Immersion Notice -->
          <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 8px;">
            <div>
              <h2 style="font-family: 'Outfit', sans-serif; font-size: 21px; font-weight: 700; color: #f8fafc; margin: 0;">
                ${p.titleEn}
              </h2>
              ${this.showThaiScaffolding ? `<div style="font-size: 13px; color: #94a3b8; margin-top: 2px;">${p.titleTh}</div>` : ''}
            </div>
            ${this.immersionModeActive && !this.showThaiScaffolding ? `
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #34d399; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 10px; border-radius: 999px;">
                ⚡ Immersion Streak: Auto-hints reduced
              </span>
            ` : ''}
          </div>

          <!-- Environmental Context Box -->
          <div style="background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(56, 189, 248, 0.18); border-left: 4px solid ${badgeColor}; border-radius: 16px; padding: 14px 18px; display: flex; flex-direction: column; gap: 6px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #64748b; text-transform: uppercase;">
              ENVIRONMENTAL LOG // STATION 7
            </div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 15px; color: #e2e8f0; line-height: 1.55;">
              ${p.contextEn}
            </div>
            ${this.showThaiScaffolding ? `
              <div style="font-size: 13px; color: #94a3b8; line-height: 1.4;">
                ${p.contextTh}
              </div>
            ` : ''}
          </div>

          <!-- Question Prompt -->
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; color: #38bdf8;">
              ❓ ${p.instructionEn}
            </div>
            ${this.showThaiScaffolding ? `
              <div style="font-size: 13px; color: #94a3b8;">
                ${p.instructionTh}
              </div>
            ` : ''}
          </div>

          <!-- Adaptive Hint Box -->
          ${hintHtml}

          <!-- Options List -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${optionsHtml}
          </div>

          <!-- Evaluation Feedback Box -->
          ${feedbackHtml}

          <!-- Proceed Button when Solved -->
          ${this.isSolved ? `
            <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
              <button id="puzzle-btn-proceed" class="interactive-element" style="background: linear-gradient(135deg, #0284c7, #0d9488); border: 1px solid rgba(186, 230, 253, 0.5); color: #ffffff; border-radius: 999px; padding: 12px 26px; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 25px rgba(56, 189, 248, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25);">
                CONFIRM & PROCEED [Enter / Space] ➔
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Bind interactive buttons inside the rendered template
    const closeBtn = document.getElementById('puzzle-btn-close');
    closeBtn?.addEventListener('click', () => this.close());

    const hintBtn = document.getElementById('puzzle-btn-hint');
    hintBtn?.addEventListener('click', () => this.handleRequestHint());

    const thaiBtn = document.getElementById('puzzle-btn-thai');
    thaiBtn?.addEventListener('click', () => this.toggleThaiScaffolding());

    const proceedBtn = document.getElementById('puzzle-btn-proceed');
    proceedBtn?.addEventListener('click', () => this.finishSolvedPuzzle());

    const optButtons = this.rootEl.querySelectorAll('.puzzle-opt-btn');
    optButtons.forEach((btn) => {
      const el = btn as HTMLButtonElement;
      const optId = el.getAttribute('data-opt-id');
      if (!optId || el.disabled) return;

      el.addEventListener('mouseenter', () => {
        el.style.borderColor = '#38bdf8';
        el.style.background = 'rgba(14, 116, 144, 0.3)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.borderColor = 'rgba(56, 189, 248, 0.35)';
        el.style.background = 'rgba(15, 23, 42, 0.85)';
      });
      el.addEventListener('click', () => {
        this.handleSelectOption(optId);
      });
    });
  }
}
