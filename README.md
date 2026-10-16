# ECHOES: THE LAST SIGNAL

> **Standalone 2.5D Cinematic Narrative Adventure Game for Contextual English Learning**  
> *Chapter 1: The Last Station (CEFR A1–A2)*

---

## 1. Overview & Story Premise

**ECHOES: THE LAST SIGNAL** is a standalone, browser-based narrative adventure game set in **Aether City in the year 2149**. Following a catastrophic collapse of the city's central AI, ECHO, memories, records, and transit networks are failing.

You awaken on the cold, deserted platform of **Station 7** beneath the city with a broken pocket watch and no memory of how you arrived. A crackling emergency radio frequency connects you with **Mira**, a survivor guiding you from the surface. To escape the underground and reach Sector B before automated life support systems shut down, you must inspect signs, diagnose terminals, communicate in English, and override locked blast gates.

English learning is deeply embedded into the narrative and environment rather than appearing as disconnected quiz popups.

---

## 2. English Learning Objectives (Chapter 1: A1–A2)

Chapter 1 introduces and reinforces foundational English grammar and vocabulary through environmental storytelling:

| Pedagogical Domain | Grammar / Lexical Focus | Gameplay Context |
| :--- | :--- | :--- |
| **Spatial Prepositions** | `between`, `opposite`, `inside` | Decoding transit navigation signs to locate the auxiliary power substation |
| **Existential Structures** | `There is` vs `There are` (Countable vs Uncountable) | Analyzing terminal diagnostic logs (e.g., *There is power*, *There are active circuits*) |
| **Present Simple** | Subject-Verb Agreement (3rd Person Singular `-s` / `-ies`) | Selecting the correct operational sequence to override the Sector B blast gate |
| **Station & Tech Vocabulary** | `platform`, `terminal`, `track`, `power`, `signal`, `emergency` | Field log vocabulary bank with Thai translations and audio pronunciation |
| **Reading & Listening** | Direct instructions, status reports, radio dialogues | Mira's emergency transmission with dual English/Thai scaffolding |

---

## 3. Architecture & Technical Design

The game is designed with a **strict architectural boundary** as an independent project:

- **100% Standalone:** Has its own repository, package management, build pipeline, and deployment configuration. It does **not** rely on the main GrammarMaster web application session.
- **Zero Paid / External AI Dependencies:** All pedagogical evaluation, progressive hint scaffolding, vocabulary tracking, and dialogue trees are deterministic, local, and free of runtime network costs.
- **Hybrid Rendering Pipeline:**
  - **Phaser 3 Engine (`z-index: 1`):** 4-layer parallax backgrounds, volumetric atmospheric fog particles, dynamic lighting shafts, Investigator character physics and animations, and hovering reticle prompts.
  - **High-Resolution DOM UI Layer (`z-index: 10–90`):** Native typography with Google Fonts (`JetBrains Mono`, `Outfit`, `Chakra Petch`) ensuring crisp, sub-pixel rendering of Thai vowel stacking and English subtitles across all display scales.
- **Centralized UI State & Input Coordinator (`UIStateManager`):** Enforces modal stacking priority (`Settings` > `Main Menu` > `Summary` > `Puzzle` > `Journal` > `Dialogue`), preventing input lock race conditions and keystroke bleeding.
- **Versioned Local Save System (`SaveManager`):** Automatic migration and schema sanitization guarding against data corruption and out-of-bounds coordinates.

---

## 4. Project Structure

```text
Web Game/
├── content/                     # Pure pedagogical and narrative content
│   ├── chapters/                # Chapter 1 milestones and metadata
│   ├── dialogues/               # Branching dialogue trees (Mira's radio)
│   ├── evidence/                # Collectible clues & journal inspection items
│   └── learning/                # Grammar rules, vocabulary bank, and puzzles
├── dist/                        # Optimized production bundle
├── src/
│   ├── engine/                  # Phaser configuration, Audio, and Input managers
│   ├── game/                    # Phaser Scenes (BootScene, PreloadScene, StationScene)
│   ├── learning/                # Pedagogical validation, HintSystem, and ChapterSummaryCalculator
│   ├── persistence/             # LocalStorage wrapper, schema validator, and migrations
│   ├── systems/                 # DialogueRunner, EvidenceManager, ObjectiveTracker, UIStateManager
│   ├── types/                   # Shared TypeScript definitions (game, narrative, learning, save)
│   ├── ui/                      # HUDOverlay, DialogueModal, JournalModal, PuzzleModal,
│   │                            # SettingsModal, MainMenuModal, ChapterSummaryModal
│   └── main.ts                  # Application entry point and event orchestration
├── tests/                       # Automated Vitest test suites (40 tests across 9 suites)
├── index.html                   # HTML shell with responsive viewport & WCAG 2.1 AA a11y
├── package.json                 # Scripts and dependencies (Phaser, Vite, Vitest, TypeScript)
├── tsconfig.json                # Strict TypeScript configuration
├── vercel.json                  # Standalone Vercel deployment configuration
└── vite.config.ts               # Vite configuration with chunk splitting
```

---

## 5. Development & Verification Commands

All development dependencies and commands are standardized:

```bash
# 1. Install dependencies
npm install

# 2. Start local development server (Vite on port 3000)
npm run dev

# 3. Run full automated test suite (Vitest)
npm test

# 4. Build for production (TypeScript compile + Vite Rollup bundling)
npm run build

# 5. Preview production build locally
npm run preview
```

### Automated Test Coverage
The project includes **40 automated tests across 9 test suites**:
1. `tests/contentValidation.test.ts` — Validates JSON schema integrity, rule links, and puzzle option IDs.
2. `tests/interactiveScene.test.ts` — Tests scene boundaries, platform geometry, and spawn coordinates.
3. `tests/dialogueSystem.test.ts` — Verifies branching dialogues, choice resolution, and event triggers.
4. `tests/evidenceSystem.test.ts` — Verifies clue discovery, inventory management, and persistence.
5. `tests/objectiveSystem.test.ts` — Validates sequential quest progression and completion states.
6. `tests/learningEngine.test.ts` — Tests deterministic puzzle grading, distractor rationales, and hint progression.
7. `tests/summarySystem.test.ts` — Tests accuracy rate computation, review recommendations, and vocabulary counts.
8. `tests/saveSystem.test.ts` — Tests localStorage saving, version migration, and fallback defaults.
9. `tests/qaEdgeCases.test.ts` — Deep QA suite testing stacked modal priority, corrupted save sanitization, audio clamping, and end-to-end Chapter 1 playthrough.

---

## 6. Standalone Deployment Guide

The game is ready for standalone deployment to hosting providers like **Vercel**, **Netlify**, or **Cloudflare Pages**.

### Vercel Deployment (Recommended)
The repository contains [`vercel.json`](file:///d:/AntiGravity%20Project/Web%20Game/vercel.json) pre-configured with:
- **Immutable Asset Caching:** `/assets/*` cached for 1 year (`max-age=31536000, immutable`).
- **Dynamic HTML Revalidation:** `/index.html` revalidated on release (`max-age=0, must-revalidate`).
- **Security Headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **SPA Rewrites:** Routing all incoming paths to `/index.html`.

#### Steps to Deploy:
1. Connect this standalone repository (`Web Game`) to Vercel as a new project.
2. Set Build Command: `npm run build`
3. Set Output Directory: `dist`
4. Set Install Command: `npm install`
5. (Optional) Assign a custom subdomain in Vercel DNS settings (e.g., `echoes.<your-domain>.com`).

---

## 7. Controls & Accessibility (WCAG 2.1 AA)

### Desktop Keyboard Controls
- **Movement:** `[A]` / `[D]` or `[←]` / `[→]`
- **Interaction:** `[E]` or `[Space]`
- **Field Journal:** `[J]`
- **Main Menu / Pause:** `[Esc]`
- **Dialogue / Puzzle Choices:** `[1]`, `[2]`, `[3]`, `[4]`
- **Request Progressive Hint:** `[H]` (inside puzzle modal)
- **Keyboard Focus:** Full `Tab` / `Shift+Tab` accessibility with glowing `:focus-visible` rings.

### Mobile & Touch Controls
- Dedicated on-screen virtual buttons (`◀`, `▶`, `INTERACT [E]`, `📁`) with minimum 48×48px tap targets.
- Responsive layout adapting to small phone screens (`viewport-fit=cover`, flexbox wrapping, and touch-cancel safety).
- Reduced motion support honoring `prefers-reduced-motion: reduce`.
