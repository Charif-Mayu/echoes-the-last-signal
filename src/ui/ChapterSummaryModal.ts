import { saveManager } from '../persistence/SaveManager';
import { audioManager } from '../engine/AudioManager';
import { ChapterSummaryCalculator, ChapterSummaryData } from '../learning/ChapterSummaryCalculator';
import { uiStateManager } from '../systems/UIStateManager';

export class ChapterSummaryModal {
  private container: HTMLElement;
  private rootEl: HTMLElement | null = null;
  private isVisible: boolean = false;
  private onContinueCallback: (() => void) | null = null;

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
    wrapper.id = 'chapter-summary-modal-root';
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-modal', 'true');
    wrapper.setAttribute('aria-label', 'Chapter 1 Completion Summary');
    wrapper.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(4, 9, 18, 0.92);
      backdrop-filter: blur(14px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 75;
      pointer-events: auto;
      padding: 16px;
      box-sizing: border-box;
    `;

    this.container.appendChild(wrapper);
    this.rootEl = wrapper;
  }

  private bindEvents(): void {
    window.addEventListener('chapter:completed', (e: Event) => {
      const customEvent = e as CustomEvent<{ chapter: number }>;
      if (customEvent.detail.chapter === 1) {
        this.open();
      }
    });
  }

  public open(onContinue?: () => void): void {
    this.onContinueCallback = onContinue || null;
    this.isVisible = true;
    if (this.rootEl) {
      this.rootEl.style.display = 'flex';
    }

    audioManager.playSynthesizedSFX('success');
    uiStateManager.registerOpen('summary');
    this.render();
  }

  public close(): void {
    if (!this.rootEl) return;
    this.rootEl.style.display = 'none';
    this.isVisible = false;
    audioManager.playSynthesizedSFX('click');
    uiStateManager.registerClose('summary');

    if (this.onContinueCallback) {
      this.onContinueCallback();
      this.onContinueCallback = null;
    }
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  private render(): void {
    if (!this.rootEl) return;
    const saveState = saveManager.load();
    const summary: ChapterSummaryData = ChapterSummaryCalculator.calculateChapter1Summary(saveState);

    const masteredChips = summary.masteredVocabulary.map((v) => `
      <div style="background: rgba(14, 116, 144, 0.25); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 6px; padding: 4px 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
        <span style="color: #38bdf8; font-weight: 600;">${v.word}</span>
        <span style="color: #94a3b8; font-size: 10px;">(${v.meaningTh})</span>
      </div>
    `).join('');

    const grammarRows = summary.grammarTopicsPracticed.map((topic) => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 6px; padding: 8px 12px;">
        <div>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; color: #f8fafc;">${topic.titleEn}</div>
          <div style="font-size: 11px; color: #94a3b8;">${topic.titleTh}</div>
        </div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: ${topic.solvedFirstTry ? '#34d399' : '#38bdf8'}; font-weight: 600;">
          ${topic.solvedFirstTry ? '★ 1ST TRY' : '✔ MASTERED'}
        </div>
      </div>
    `).join('');

    const reviewSection = summary.reviewRecommendations.length > 0 ? `
      <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 8px; padding: 12px 14px;">
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: #f59e0b; font-weight: 700; letter-spacing: 0.08em; margin-bottom: 6px;">
          RECOMMENDED REVIEW (ข้อแนะนำการทบทวน)
        </div>
        ${summary.reviewRecommendations.map((rec) => `
          <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 4px;">
            • <strong style="color: #f8fafc;">${rec.titleEn}:</strong> ${rec.suggestionTh}
          </div>
        `).join('')}
      </div>
    ` : `
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 8px; padding: 10px 14px; font-family: 'Outfit', sans-serif; font-size: 12px; color: #6ee7b7;">
        ★ Outstanding Performance! All Chapter 1 contextual English challenges solved with exceptional precision.
      </div>
    `;

    this.rootEl.innerHTML = `
      <div style="width: min(640px, 94vw); max-height: 90vh; background: rgba(13, 20, 32, 0.98); border: 1.5px solid rgba(56, 189, 248, 0.5); border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,0.9), 0 0 40px rgba(56, 189, 248, 0.2); display: flex; flex-direction: column; overflow: hidden;">
        
        <!-- Header -->
        <div style="padding: 24px 24px 16px 24px; background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(13, 20, 32, 0.95) 100%); border-bottom: 1px solid rgba(148, 163, 184, 0.2); text-align: center;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.2em; color: #34d399; text-transform: uppercase;">
            ✔ CHAPTER CONCLUDED // ESCAPE SUCCESSFUL
          </div>
          <h2 style="font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 800; color: #f8fafc; margin: 6px 0 2px 0;">
            CHAPTER 1: THE LAST STATION
          </h2>
          <div style="font-family: 'Outfit', sans-serif; font-size: 13px; color: #94a3b8;">
            สถานีสุดท้าย // CEFR A1–A2 English Foundations
          </div>
        </div>

        <!-- Body / Scrollable Content -->
        <div style="padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto;">
          <!-- Narrative Synopsis -->
          <div style="font-family: 'Outfit', sans-serif; font-size: 13px; color: #cbd5e1; line-height: 1.6; background: rgba(15, 23, 42, 0.6); border-left: 3px solid #38bdf8; padding: 10px 14px; border-radius: 0 6px 6px 0;">
            The pneumatic seals of Sector B hiss open into the cool subterranean air. Mira's transmission guides your path as the abandoned platforms of Station 7 recede into darkness. You have survived the awakening and secured vital evidence.
          </div>

          <!-- Stats Grid -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700; color: #38bdf8;">
                ${summary.evidenceRatioText}
              </div>
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-top: 2px;">Clues Found</div>
            </div>

            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700; color: #38bdf8;">
                ${summary.completedPuzzlesCount} / ${summary.totalPuzzles}
              </div>
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-top: 2px;">Puzzles Solved</div>
            </div>

            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700; color: ${summary.accuracyRate >= 80 ? '#34d399' : '#f59e0b'};">
                ${summary.accuracyRate}%
              </div>
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-top: 2px;">Accuracy</div>
            </div>

            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700; color: #f8fafc;">
                ${summary.totalHintsRequested}
              </div>
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-top: 2px;">Hints Used</div>
            </div>
          </div>

          <!-- Grammar Mastery -->
          <div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.08em; margin-bottom: 8px;">
              GRAMMAR CONCEPTS PRACTICED
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${grammarRows}
            </div>
          </div>

          <!-- Vocabulary Mastered -->
          <div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.08em; margin-bottom: 8px;">
              VOCABULARY MASTERED (${summary.masteredVocabulary.length})
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${masteredChips.length > 0 ? masteredChips : '<span style="font-size: 12px; color: #64748b;">No vocabulary records</span>'}
            </div>
          </div>

          <!-- Recommendations or Commendation -->
          ${reviewSection}
        </div>

        <!-- Footer / Action Buttons -->
        <div style="padding: 16px 24px; background: rgba(15, 23, 42, 0.9); border-top: 1px solid rgba(148, 163, 184, 0.2); display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <button id="summary-btn-replay" class="interactive-element" style="background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(148, 163, 184, 0.3); color: #f8fafc; border-radius: 6px; padding: 10px 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.2s;">
            ⟳ REPLAY CHAPTER 1
          </button>

          <button id="summary-btn-title" class="interactive-element" style="background: linear-gradient(135deg, #0284c7, #0d9488); border: 1px solid #38bdf8; color: #ffffff; border-radius: 6px; padding: 10px 22px; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 16px rgba(56, 189, 248, 0.3);">
            RETURN TO TITLE MENU
          </button>
        </div>
      </div>
    `;

    document.getElementById('summary-btn-replay')?.addEventListener('click', () => {
      saveManager.resetChapter(1);
      window.location.reload();
    });

    document.getElementById('summary-btn-title')?.addEventListener('click', () => {
      this.close();
      window.dispatchEvent(new CustomEvent('ui:open_main_menu'));
    });
  }
}
