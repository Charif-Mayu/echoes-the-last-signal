import { evidenceManager } from '../systems/EvidenceManager';
import { objectiveTracker } from '../systems/ObjectiveTracker';
import { audioManager } from '../engine/AudioManager';
import { saveManager } from '../persistence/SaveManager';
import vocabularyData from '../../content/learning/vocabulary.json';
import { VocabularyItem } from '../types/learning';

export class JournalModal {
  private container: HTMLElement;
  private rootEl: HTMLElement | null = null;
  private isVisible: boolean = false;
  private activeTab: 'evidence' | 'vocab' | 'objectives' = 'evidence';

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
    wrapper.id = 'journal-modal-root';
    wrapper.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(3, 7, 18, 0.75);
      backdrop-filter: blur(10px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 60;
      pointer-events: auto;
      padding: 20px;
      box-sizing: border-box;
    `;

    wrapper.innerHTML = `
      <div style="width: min(900px, 94vw); height: min(620px, 88vh); background: rgba(13, 20, 32, 0.95); border: 1.5px solid rgba(56, 189, 248, 0.45); border-radius: 14px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(56, 189, 248, 0.15); display: flex; flex-direction: column; overflow: hidden;">
        <!-- Header with Tabs & Close Button -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid rgba(56, 189, 248, 0.2); background: rgba(15, 23, 42, 0.8);">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 700; color: #38bdf8; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px;">
              <span>📁</span>
              <span>INVESTIGATOR'S FIELD LOG</span>
            </div>
            <!-- Navigation Tabs -->
            <div style="display: flex; gap: 6px;">
              <button id="jtab-btn-evidence" class="interactive-element" style="background: rgba(14, 116, 144, 0.5); border: 1px solid #38bdf8; color: #f8fafc; border-radius: 6px; padding: 6px 14px; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer;">
                Evidence (<span id="jtab-evidence-count">0/3</span>)
              </button>
              <button id="jtab-btn-vocab" class="interactive-element" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); color: #94a3b8; border-radius: 6px; padding: 6px 14px; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer;">
                Vocabulary Bank
              </button>
              <button id="jtab-btn-objectives" class="interactive-element" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); color: #94a3b8; border-radius: 6px; padding: 6px 14px; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer;">
                Missions & Steps
              </button>
            </div>
          </div>
          <!-- Close Button -->
          <button id="journal-btn-close" class="interactive-element" style="background: transparent; border: none; color: #94a3b8; font-size: 20px; font-weight: bold; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all 0.2s;">
            ✕
          </button>
        </div>

        <!-- Scrollable Body Content -->
        <div id="journal-body-content" style="flex: 1; padding: 24px; overflow-y: auto; box-sizing: border-box;">
          <!-- Injected dynamically via renderTabContent -->
        </div>
      </div>
    `;

    this.container.appendChild(wrapper);
    this.rootEl = wrapper;
  }

  private bindEvents(): void {
    const closeBtn = document.getElementById('journal-btn-close');
    closeBtn?.addEventListener('click', () => this.toggle());

    // Tab buttons
    const tabEvidence = document.getElementById('jtab-btn-evidence');
    const tabVocab = document.getElementById('jtab-btn-vocab');
    const tabObjectives = document.getElementById('jtab-btn-objectives');

    tabEvidence?.addEventListener('click', () => this.switchTab('evidence'));
    tabVocab?.addEventListener('click', () => this.switchTab('vocab'));
    tabObjectives?.addEventListener('click', () => this.switchTab('objectives'));

    // Keyboard shortcut [J] to toggle, [Esc] to close
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'j' && !e.repeat) {
        const dlgRoot = document.getElementById('dialogue-modal-root');
        const puzRoot = document.getElementById('puzzle-modal-root');
        if (
          (dlgRoot && dlgRoot.style.display && dlgRoot.style.display !== 'none') ||
          (puzRoot && puzRoot.style.display && puzRoot.style.display !== 'none')
        ) {
          return;
        }
        this.toggle();
      } else if (e.key === 'Escape' && this.isVisible) {
        this.toggle(false);
      }
    });

    // Custom window event to open journal directly from HUD
    window.addEventListener('ui:open_journal', () => {
      this.toggle(true);
    });
  }

  public toggle(forceState?: boolean): void {
    const nextState = forceState !== undefined ? forceState : !this.isVisible;
    if (nextState === this.isVisible) return;

    this.isVisible = nextState;
    if (this.rootEl) {
      this.rootEl.style.display = this.isVisible ? 'flex' : 'none';
    }

    if (this.isVisible) {
      audioManager.playSynthesizedSFX('blip');
      window.dispatchEvent(new CustomEvent('game:input_lock', { detail: { locked: true } }));
      this.renderCurrentTab();
    } else {
      audioManager.playSynthesizedSFX('click');
      window.dispatchEvent(new CustomEvent('game:input_lock', { detail: { locked: false } }));
    }
  }

  private switchTab(tab: 'evidence' | 'vocab' | 'objectives'): void {
    this.activeTab = tab;
    audioManager.playSynthesizedSFX('click');
    this.renderCurrentTab();
  }

  private renderCurrentTab(): void {
    const body = document.getElementById('journal-body-content');
    const countEl = document.getElementById('jtab-evidence-count');
    const tabEvidence = document.getElementById('jtab-btn-evidence');
    const tabVocab = document.getElementById('jtab-btn-vocab');
    const tabObjectives = document.getElementById('jtab-btn-objectives');

    if (!body) return;

    // Update tab button styles
    const setTabStyle = (btn: HTMLElement | null, active: boolean) => {
      if (!btn) return;
      btn.style.background = active ? 'rgba(14, 116, 144, 0.5)' : 'rgba(30, 41, 59, 0.6)';
      btn.style.borderColor = active ? '#38bdf8' : 'rgba(148, 163, 184, 0.2)';
      btn.style.color = active ? '#f8fafc' : '#94a3b8';
    };

    setTabStyle(tabEvidence, this.activeTab === 'evidence');
    setTabStyle(tabVocab, this.activeTab === 'vocab');
    setTabStyle(tabObjectives, this.activeTab === 'objectives');

    const progress = evidenceManager.getProgress();
    if (countEl) countEl.textContent = `${progress.discovered}/${progress.total}`;

    // Render tab contents
    switch (this.activeTab) {
      case 'evidence':
        this.renderEvidenceTab(body);
        break;
      case 'vocab':
        this.renderVocabTab(body);
        break;
      case 'objectives':
        this.renderObjectivesTab(body);
        break;
    }
  }

  private renderEvidenceTab(container: HTMLElement): void {
    const allClues = evidenceManager.getAllClues();

    let html = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">`;

    allClues.forEach((clue) => {
      const isCollected = evidenceManager.hasClue(clue.id);

      if (isCollected) {
        html += `
          <div style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: #38bdf8; padding: 2px 8px; background: rgba(56, 189, 248, 0.15); border-radius: 4px;">
                ${clue.category}
              </span>
              <span style="color: #22c55e; font-size: 14px;">✔ Discovered</span>
            </div>
            <h3 style="font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #f8fafc; margin: 4px 0 0 0;">
              ${clue.titleEn}
            </h3>
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">${clue.titleTh}</p>
            <p style="font-family: 'Outfit', sans-serif; font-size: 13px; color: #cbd5e1; line-height: 1.4; margin: 6px 0;">
              "${clue.descriptionEn}"
            </p>
            <p style="font-size: 12px; color: #64748b; line-height: 1.3; margin: 0;">
              ${clue.descriptionTh}
            </p>
            <div style="margin-top: auto; padding-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.15); font-size: 11px; color: #94a3b8;">
              📍 <span style="color: #e2e8f0;">${clue.locationEn}</span>
            </div>
          </div>
        `;
      } else {
        html += `
          <div style="background: rgba(10, 16, 26, 0.6); border: 1px dashed rgba(148, 163, 184, 0.25); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px; text-align: center; gap: 8px;">
            <span style="font-size: 32px; opacity: 0.3;">🔒</span>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #64748b; letter-spacing: 0.05em;">
              UNDISCOVERED CLUE
            </div>
            <div style="font-size: 11px; color: #475569;">
              Explore the station and investigate suspicious anomalies.
            </div>
          </div>
        `;
      }
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  private renderVocabTab(container: HTMLElement): void {
    const vocabList = vocabularyData as VocabularyItem[];
    const progress = saveManager.load().learningProgress;

    let html = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <p style="font-family: 'Outfit', sans-serif; font-size: 14px; color: #94a3b8; margin: 0 0 8px 0;">
          Essential CEFR A1–A2 words discovered across Station 7 signage, radio messages, and terminals (${progress.masteredVocabIds.length}/${vocabList.length} Mastered):
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 14px;">
    `;

    vocabList.forEach((v) => {
      const isMastered = progress.masteredVocabIds.includes(v.id);
      const isEncountered = progress.encounteredVocabIds.includes(v.id);

      const statusBadge = isMastered
        ? `<span style="color: #4ade80; font-family: 'JetBrains Mono', monospace; font-size: 10px;">✔ Mastered</span>`
        : (isEncountered
          ? `<span style="color: #38bdf8; font-family: 'JetBrains Mono', monospace; font-size: 10px;">👁 Encountered</span>`
          : `<span style="color: #64748b; font-family: 'JetBrains Mono', monospace; font-size: 10px;">📖 Reference</span>`);

      html += `
        <div style="background: rgba(15, 23, 42, 0.85); border: 1.5px solid ${isMastered ? 'rgba(74, 222, 128, 0.35)' : 'rgba(148, 163, 184, 0.2)'}; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <span style="font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #38bdf8;">
              ${v.word}
            </span>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${statusBadge}
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #f59e0b; background: rgba(245, 158, 11, 0.12); padding: 1px 6px; border-radius: 4px;">
                ${v.partOfSpeech}
              </span>
            </div>
          </div>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #64748b;">
            ${v.phonetic || ''}
          </div>
          <div style="font-size: 13px; color: #e2e8f0; font-weight: 500;">
            ${v.meaningEn}
          </div>
          <div style="font-size: 12px; color: #94a3b8;">
            แปล: ${v.meaningTh}
          </div>
          <div style="margin-top: 4px; padding-top: 6px; border-top: 1px solid rgba(148, 163, 184, 0.1); font-size: 12px; color: #cbd5e1; font-style: italic;">
            "${v.exampleSentenceEn}"
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
  }

  private renderObjectivesTab(container: HTMLElement): void {
    const objectives = objectiveTracker.getAllObjectives();

    let html = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <p style="font-family: 'Outfit', sans-serif; font-size: 14px; color: #94a3b8; margin: 0 0 6px 0;">
          Chapter 1: The Last Station — Operational Objectives Checklist
        </p>
    `;

    objectives.forEach((obj, idx) => {
      const isCompleted = obj.completed;
      const isCurrent = objectiveTracker.getCurrentObjective().id === obj.id;

      html += `
        <div style="background: ${isCurrent ? 'rgba(14, 116, 144, 0.25)' : 'rgba(15, 23, 42, 0.8)'}; border: 1.5px solid ${isCurrent ? '#38bdf8' : (isCompleted ? '#22c55e' : 'rgba(148, 163, 184, 0.2)')}; border-radius: 8px; padding: 14px 18px; display: flex; align-items: flex-start; gap: 14px;">
          <div style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; margin-top: 2px; ${isCompleted ? 'background: #22c55e; color: #022c22;' : (isCurrent ? 'background: #38bdf8; color: #082f49;' : 'background: rgba(148, 163, 184, 0.2); color: #94a3b8;')}">
            ${isCompleted ? '✔' : idx + 1}
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
            <div style="font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 600; color: ${isCompleted ? '#86efac' : '#f8fafc'};">
              ${obj.titleEn}
            </div>
            <div style="font-size: 12px; color: #94a3b8;">
              ${obj.titleTh}
            </div>
            <div style="font-size: 13px; color: #cbd5e1; margin-top: 2px;">
              ${obj.descriptionEn}
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }
}
