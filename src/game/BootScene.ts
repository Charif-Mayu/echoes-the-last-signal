import Phaser from 'phaser';
import { SceneKey } from '../types/game';
import { audioManager } from '../engine/AudioManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  preload(): void {
    this.createCohesiveProceduralTextures();
  }

  create(): void {
    // Register character animations
    this.createCharacterAnimations();

    // Unlock audio context on first user click or keypress
    const unlockAudio = () => {
      audioManager.unlock();
      audioManager.startAmbientDrone();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    this.scene.start(SceneKey.Preload);
  }

  private createCohesiveProceduralTextures(): void {
    // -----------------------------------------------------------------
    // 1. INVESTIGATOR SPRITE FRAMES (Idle: 2 frames, Walk: 4 frames)
    // -----------------------------------------------------------------
    const w = 36;
    const h = 68;

    // Helper to draw common investigator features
    const drawInvestigatorBase = (g: Phaser.GameObjects.Graphics, legOffsetL: number, legOffsetR: number, coatSway: number, bobY: number) => {
      // Shadow beneath feet
      g.fillStyle(0x000000, 0.4);
      g.fillEllipse(18, 65, 24, 6);

      // Back coat tails
      g.fillStyle(0x083344, 1); // Dark teal coat shadow
      g.fillRect(8 + coatSway, 28 + bobY, 20, 24);

      // Legs / Pants
      g.fillStyle(0x0f172a, 1); // Charcoal boots/pants
      g.fillRect(10 + legOffsetL, 46 + bobY, 6, 18);
      g.fillRect(20 + legOffsetR, 46 + bobY, 6, 18);

      // Boots
      g.fillStyle(0x020617, 1);
      g.fillRect(9 + legOffsetL, 60 + bobY, 8, 5);
      g.fillRect(19 + legOffsetR, 60 + bobY, 8, 5);

      // Front Trenchcoat / Jacket
      g.fillStyle(0x0e7490, 1); // Deep cyan/teal trenchcoat
      g.fillRect(8, 20 + bobY, 20, 28);

      // Lapels & Belt
      g.fillStyle(0x155e75, 1);
      g.fillRect(11, 20 + bobY, 4, 28);
      g.fillRect(21, 20 + bobY, 4, 28);
      g.fillStyle(0xd97706, 1); // Restrained amber belt buckle
      g.fillRect(16, 36 + bobY, 4, 3);

      // Head / Collar
      g.fillStyle(0x334155, 1); // High coat collar
      g.fillRect(11, 14 + bobY, 14, 8);
      g.fillStyle(0xf1f5f9, 1); // Face skin tone/silhouette
      g.fillCircle(18, 12 + bobY, 7);

      // Sleek Sci-Fi Visor / Eye Augment
      g.fillStyle(0x38bdf8, 1); // Cyan neon visor
      g.fillRect(16, 10 + bobY, 8, 3);
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(18, 10 + bobY, 3, 2); // Visor glint
    };

    // Idle Frame 0
    if (!this.textures.exists('inv_idle_0')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      drawInvestigatorBase(g, 0, 0, 0, 0);
      g.generateTexture('inv_idle_0', w, h);
      g.destroy();
    }

    // Idle Frame 1 (subtle breathing rise)
    if (!this.textures.exists('inv_idle_1')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      drawInvestigatorBase(g, 0, 0, 1, -1);
      g.generateTexture('inv_idle_1', w, h);
      g.destroy();
    }

    // Walk Frame 0 (Left foot forward, right back)
    if (!this.textures.exists('inv_walk_0')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      drawInvestigatorBase(g, -3, 3, -2, -1);
      g.generateTexture('inv_walk_0', w, h);
      g.destroy();
    }

    // Walk Frame 1 (Passing step)
    if (!this.textures.exists('inv_walk_1')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      drawInvestigatorBase(g, 0, 0, 0, 0);
      g.generateTexture('inv_walk_1', w, h);
      g.destroy();
    }

    // Walk Frame 2 (Right foot forward, left back)
    if (!this.textures.exists('inv_walk_2')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      drawInvestigatorBase(g, 3, -3, 2, -1);
      g.generateTexture('inv_walk_2', w, h);
      g.destroy();
    }

    // Walk Frame 3 (Passing step)
    if (!this.textures.exists('inv_walk_3')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      drawInvestigatorBase(g, 0, 0, 0, 0);
      g.generateTexture('inv_walk_3', w, h);
      g.destroy();
    }

    // -----------------------------------------------------------------
    // 2. INDUSTRIAL STATION ARCH & PILLARS
    // -----------------------------------------------------------------
    if (!this.textures.exists('tex_arch')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Pillar Column
      g.fillStyle(0x111c2a, 1);
      g.fillRect(0, 0, 48, 560);
      g.fillStyle(0x192738, 1);
      g.fillRect(4, 0, 40, 560);

      // Support brackets & Rivets
      for (let y = 40; y < 560; y += 80) {
        g.fillStyle(0x0a121c, 1);
        g.fillRect(0, y, 48, 8);
        g.fillStyle(0x475569, 1);
        g.fillRect(6, y + 2, 4, 4);
        g.fillRect(38, y + 2, 4, 4);
      }

      // Vertical blue status conduit
      g.fillStyle(0x0284c7, 0.7);
      g.fillRect(22, 0, 4, 560);

      // Emergency status LED light box
      g.fillStyle(0x0f172a, 1);
      g.fillRect(14, 180, 20, 20);
      g.fillStyle(0x38bdf8, 1);
      g.fillCircle(24, 190, 5);

      g.generateTexture('tex_arch', 48, 560);
      g.destroy();
    }

    // -----------------------------------------------------------------
    // 3. PLATFORM WITH SAFETY HAZARD STRIPES
    // -----------------------------------------------------------------
    if (!this.textures.exists('tex_platform_slice')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      const sliceW = 120;
      const sliceH = 160;

      // Concrete Body
      g.fillStyle(0x0f172a, 1);
      g.fillRect(0, 0, sliceW, sliceH);

      // Subtle concrete tile joints
      g.fillStyle(0x1e293b, 1);
      g.fillRect(0, 0, sliceW, 2);
      g.fillRect(0, 0, 2, sliceH);
      g.fillRect(60, 0, 2, sliceH);

      // Top Hazard Safety Stripes (Yellow/Black angled stripes)
      for (let x = -20; x < sliceW + 20; x += 24) {
        g.fillStyle(0xf59e0b, 0.9); // Amber
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + 12, 0);
        g.lineTo(x + 4, 14);
        g.lineTo(x - 8, 14);
        g.closePath();
        g.fillPath();

        g.fillStyle(0x020617, 0.9); // Black
        g.beginPath();
        g.moveTo(x + 12, 0);
        g.lineTo(x + 24, 0);
        g.lineTo(x + 16, 14);
        g.lineTo(x + 4, 14);
        g.closePath();
        g.fillPath();
      }

      g.generateTexture('tex_platform_slice', sliceW, sliceH);
      g.destroy();
    }

    // -----------------------------------------------------------------
    // 4. ATMOSPHERIC CONE LIGHT SHAFT
    // -----------------------------------------------------------------
    if (!this.textures.exists('tex_light_cone')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      const coneW = 220;
      const coneH = 460;

      // Gradient cone simulating overhead floodlight beam
      for (let i = 0; i < 20; i++) {
        const alpha = (1 - (i / 20)) * 0.08;
        const widthTop = 16 + (i * 2);
        const widthBottom = 60 + (i * 8);
        g.fillStyle(0x38bdf8, alpha);
        g.beginPath();
        g.moveTo(coneW / 2 - widthTop / 2, 0);
        g.lineTo(coneW / 2 + widthTop / 2, 0);
        g.lineTo(coneW / 2 + widthBottom / 2, coneH);
        g.lineTo(coneW / 2 - widthBottom / 2, coneH);
        g.closePath();
        g.fillPath();
      }

      g.generateTexture('tex_light_cone', coneW, coneH);
      g.destroy();
    }

    // -----------------------------------------------------------------
    // 5. INTERACTION RETICLE (Pulsing Diamond HUD)
    // -----------------------------------------------------------------
    if (!this.textures.exists('fx_reticle')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      const size = 32;
      g.lineStyle(2, 0x38bdf8, 1);
      g.strokeCircle(size / 2, size / 2, 12);
      g.lineStyle(2, 0xffffff, 1);
      g.beginPath();
      g.moveTo(size / 2, 4);
      g.lineTo(size - 4, size / 2);
      g.lineTo(size / 2, size - 4);
      g.lineTo(4, size / 2);
      g.closePath();
      g.strokePath();

      g.fillStyle(0x38bdf8, 0.8);
      g.fillCircle(size / 2, size / 2, 3);

      g.generateTexture('fx_reticle', size, size);
      g.destroy();
    }

    // -----------------------------------------------------------------
    // 6. VOLUMETRIC MIST / DUST PARTICLE
    // -----------------------------------------------------------------
    if (!this.textures.exists('fx_mist_particle')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      const rad = 24;
      for (let r = rad; r > 0; r -= 3) {
        const alpha = ((rad - r) / rad) * 0.12;
        g.fillStyle(0x38bdf8, alpha);
        g.fillCircle(rad, rad, r);
      }
      g.generateTexture('fx_mist_particle', rad * 2, rad * 2);
      g.destroy();
    }

    // -----------------------------------------------------------------
    // 7. HIGH-FIDELITY PROPS
    // -----------------------------------------------------------------

    // Emergency Radio with glowing LCD & antenna (40x36)
    if (!this.textures.exists('prop_radio_detailed')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Drop Shadow
      g.fillStyle(0x000000, 0.4);
      g.fillEllipse(20, 34, 30, 6);

      // Chassis (Ruggedized industrial orange/amber)
      g.fillStyle(0xb45309, 1);
      g.fillRoundedRect(6, 10, 28, 22, 3);
      g.fillStyle(0x78350f, 1);
      g.fillRect(8, 12, 24, 2);

      // LCD Frequency Screen
      g.fillStyle(0x0f172a, 1);
      g.fillRect(10, 16, 14, 8);
      g.fillStyle(0x38bdf8, 1);
      g.fillRect(12, 18, 10, 4); // "142.8"

      // Speaker Grill
      g.fillStyle(0x451a03, 1);
      g.fillRect(26, 16, 6, 8);

      // Knobs & Knurled Dials
      g.fillStyle(0x1e293b, 1);
      g.fillRect(8, 6, 4, 4);
      g.fillRect(14, 6, 4, 4);

      // Antenna with red signal tip
      g.lineStyle(2, 0x94a3b8, 1);
      g.lineBetween(30, 10, 30, 0);
      g.fillStyle(0xef4444, 1);
      g.fillCircle(30, 0, 2);

      g.generateTexture('prop_radio_detailed', 40, 36);
      g.destroy();
    }

    // Transit Signpost: "SECTOR B GATE" (80x96)
    if (!this.textures.exists('prop_signpost_detailed')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Steel post
      g.fillStyle(0x334155, 1);
      g.fillRect(37, 32, 6, 64);
      g.fillStyle(0x1e293b, 1);
      g.fillRect(39, 32, 2, 64);
      // Floor bracket
      g.fillStyle(0x0f172a, 1);
      g.fillRect(32, 90, 16, 6);

      // Overhead Sign Box
      g.fillStyle(0x090d16, 1);
      g.fillRoundedRect(0, 0, 80, 32, 4);
      g.lineStyle(1.5, 0x0284c7, 0.9);
      g.strokeRoundedRect(0, 0, 80, 32, 4);

      // Inner Illuminated Sign Screen
      g.fillStyle(0x0369a1, 0.3);
      g.fillRect(4, 4, 72, 24);

      // Sign Graphics (Symbolic text & arrow)
      g.fillStyle(0x38bdf8, 1);
      g.fillRect(8, 8, 44, 4); // "SECTOR B"
      g.fillRect(8, 15, 36, 3); // "TRANSIT"
      // Arrow Right
      g.beginPath();
      g.moveTo(58, 10);
      g.lineTo(68, 15);
      g.lineTo(58, 20);
      g.closePath();
      g.fillPath();

      g.generateTexture('prop_signpost_detailed', 80, 96);
      g.destroy();
    }

    // Auxiliary Power Terminal (64x80)
    if (!this.textures.exists('prop_terminal_detailed')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Base Pedestal
      g.fillStyle(0x0f172a, 1);
      g.fillRect(16, 50, 32, 30);
      g.lineStyle(1, 0x334155, 1);
      g.strokeRect(16, 50, 32, 30);

      // Main Console Body
      g.fillStyle(0x1e293b, 1);
      g.fillRoundedRect(6, 12, 52, 42, 4);

      // Angled CRT Screen
      g.fillStyle(0x022c22, 1); // Dark matrix green
      g.fillRoundedRect(10, 16, 44, 26, 2);
      g.lineStyle(1, 0x10b981, 0.8);
      g.strokeRoundedRect(10, 16, 44, 26, 2);

      // CRT Scanlines & Diagnostic waveform
      g.fillStyle(0x34d399, 1);
      g.fillRect(14, 22, 20, 2);
      g.fillRect(14, 26, 32, 2);
      g.fillRect(14, 30, 16, 2);
      // Blinking cursor
      g.fillRect(32, 30, 4, 2);

      // Angled Keyboard Deck
      g.fillStyle(0x334155, 1);
      g.fillRect(10, 44, 44, 8);
      g.fillStyle(0x64748b, 1);
      for (let k = 14; k < 50; k += 6) {
        g.fillRect(k, 46, 4, 4);
      }

      // Cable conduit on the floor
      g.lineStyle(2, 0xd97706, 0.8);
      g.lineBetween(48, 60, 64, 78);
      g.lineStyle(2, 0x0284c7, 0.8);
      g.lineBetween(44, 62, 58, 80);

      g.generateTexture('prop_terminal_detailed', 64, 80);
      g.destroy();
    }

    // Heavy Sector B Blast Gate (120x240)
    if (!this.textures.exists('prop_gate_detailed')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Outer Reinforced Steel Bulkhead Frame
      g.fillStyle(0x0b1320, 1);
      g.fillRect(0, 0, 120, 240);
      g.fillStyle(0x19273c, 1);
      g.fillRect(8, 8, 104, 232);

      // Massive Center Sliding Blast Doors
      g.fillStyle(0x0f172a, 1);
      g.fillRect(16, 16, 42, 224); // Left door
      g.fillRect(62, 16, 42, 224); // Right door

      // Hydraulic Pneumatic Cylinders
      g.fillStyle(0x475569, 1);
      g.fillRect(4, 40, 8, 80);
      g.fillRect(108, 40, 8, 80);
      g.fillStyle(0x94a3b8, 1);
      g.fillRect(6, 60, 4, 40);
      g.fillRect(110, 60, 4, 40);

      // Warning Chevron Stripes on door midsection
      for (let y = 100; y < 140; y += 12) {
        g.fillStyle(0xf59e0b, 0.9);
        g.fillRect(20, y, 34, 6);
        g.fillRect(66, y, 34, 6);
      }

      // Electronic Gate Lock Terminal
      g.fillStyle(0x030712, 1);
      g.fillRect(52, 105, 16, 30);
      // Status Lock Indicator (Red glow by default)
      g.fillStyle(0xef4444, 1);
      g.fillCircle(60, 115, 4);

      // Overhead Sector Header Plaque
      g.fillStyle(0x0284c7, 1);
      g.fillRect(30, 20, 60, 8);

      g.generateTexture('prop_gate_detailed', 120, 240);
      g.destroy();
    }
  }

  private createCharacterAnimations(): void {
    if (!this.anims.exists('anim_investigator_idle')) {
      this.anims.create({
        key: 'anim_investigator_idle',
        frames: [
          { key: 'inv_idle_0' },
          { key: 'inv_idle_1' }
        ],
        frameRate: 2,
        repeat: -1
      });
    }

    if (!this.anims.exists('anim_investigator_walk')) {
      this.anims.create({
        key: 'anim_investigator_walk',
        frames: [
          { key: 'inv_walk_0' },
          { key: 'inv_walk_1' },
          { key: 'inv_walk_2' },
          { key: 'inv_walk_3' }
        ],
        frameRate: 8,
        repeat: -1
      });
    }
  }
}
