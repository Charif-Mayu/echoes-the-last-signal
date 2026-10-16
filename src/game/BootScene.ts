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

  private generateCanvasTexture(
    key: string,
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  ): void {
    if (this.textures.exists(key)) return;
    const canvasTex = this.textures.createCanvas(key, width, height);
    if (!canvasTex) return;
    const ctx = canvasTex.getContext();
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    drawFn(ctx, width, height);
    ctx.restore();
    canvasTex.refresh();
  }

  private createCohesiveProceduralTextures(): void {
    // -----------------------------------------------------------------
    // 1. INVESTIGATOR SPRITE FRAMES (Smooth Curved Paths & Squash/Stretch)
    // -----------------------------------------------------------------
    const charW = 36;
    const charH = 68;

    interface InvestigatorPose {
      squashX: number;     // Horizontal squash/stretch factor (1.0 = normal)
      stretchY: number;    // Vertical stretch factor (1.0 = normal)
      hipDropY: number;    // Pelvic weight drop in px
      chestBreath: number; // Chest expansion offset (-1 to +1.5)
      legL: { x: number; liftY: number; kneeBend: number; footAngle: number };
      legR: { x: number; liftY: number; kneeBend: number; footAngle: number };
      coatWave: number;    // S-curve cloth sway (-3 to +3)
      coatFlare: number;   // Coat hem spread
      armSwing: number;    // Forearm swing offset (-4 to +4)
      headTilt: number;    // Subtle head pitch in radians
    }

    const drawCurvedInvestigator = (ctx: CanvasRenderingContext2D, pose: InvestigatorPose) => {
      const cx = 18;
      const groundY = 65;

      // 1) Soft Radial Contact Shadow beneath feet
      const shadowGrad = ctx.createRadialGradient(cx, groundY, 1, cx, groundY, 14);
      shadowGrad.addColorStop(0, 'rgba(2, 6, 23, 0.65)');
      shadowGrad.addColorStop(0.6, 'rgba(2, 6, 23, 0.3)');
      shadowGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(cx, groundY, 13 * pose.squashX, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Apply Squash & Stretch anchored near ground contact
      ctx.save();
      ctx.translate(cx, groundY - 3);
      ctx.scale(pose.squashX, pose.stretchY);
      ctx.translate(-cx, -(groundY - 3) + pose.hipDropY);

      // 2) Back Flowing Trenchcoat Tail (Fluid S-Curve Cloth Shadow Layer)
      const backCoatGrad = ctx.createLinearGradient(cx, 26, cx, 56);
      backCoatGrad.addColorStop(0, '#042f2e');
      backCoatGrad.addColorStop(0.6, '#083344');
      backCoatGrad.addColorStop(1, '#021720');
      ctx.fillStyle = backCoatGrad;
      ctx.beginPath();
      ctx.moveTo(10, 26);
      ctx.bezierCurveTo(
        7 - pose.coatFlare, 36,
        8 + pose.coatWave * 1.3, 46,
        6 + pose.coatWave - pose.coatFlare, 54
      );
      ctx.quadraticCurveTo(cx + pose.coatWave * 0.6, 58, 29 + pose.coatWave + pose.coatFlare, 53);
      ctx.bezierCurveTo(
        28 + pose.coatWave * 0.8, 44,
        28 + pose.coatFlare * 0.5, 34,
        26, 26
      );
      ctx.closePath();
      ctx.fill();

      // Helper to draw articulated leg & curved cyber-boot
      const drawArticulatedLeg = (
        hipX: number,
        leg: { x: number; liftY: number; kneeBend: number; footAngle: number },
        isBackLeg: boolean
      ) => {
        const hipY = 43;
        const ankleX = hipX + leg.x;
        const ankleY = 60 - leg.liftY;
        const kneeX = (hipX + ankleX) * 0.5 + leg.kneeBend;
        const kneeY = (hipY + ankleY) * 0.5 - leg.liftY * 0.35;

        // Curved thigh & calf trousers
        ctx.strokeStyle = isBackLeg ? '#090f1d' : '#1e293b';
        ctx.lineWidth = 5.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.quadraticCurveTo(kneeX, kneeY, ankleX, ankleY);
        ctx.stroke();

        // Subtle knee pad highlight on front leg
        if (!isBackLeg) {
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(kneeX + 0.8, kneeY, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Contoured Boots with angled sole & curved toe cap
        ctx.save();
        ctx.translate(ankleX, ankleY);
        ctx.rotate(leg.footAngle);

        const bootGrad = ctx.createLinearGradient(-3, -2, 6, 4);
        bootGrad.addColorStop(0, isBackLeg ? '#020617' : '#0f172a');
        bootGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bootGrad;

        ctx.beginPath();
        ctx.moveTo(-2.8, -2);
        ctx.quadraticCurveTo(1.5, -2.5, 4.8, 0.5);
        ctx.quadraticCurveTo(6.5, 2.2, 5.2, 3.8);
        ctx.lineTo(-3.2, 3.8);
        ctx.quadraticCurveTo(-4, 1, -2.8, -2);
        ctx.closePath();
        ctx.fill();

        // Boot sole rim highlight
        ctx.strokeStyle = isBackLeg ? 'rgba(51, 65, 85, 0.5)' : 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-3, 3.6);
        ctx.lineTo(5, 3.6);
        ctx.stroke();

        ctx.restore();
      };

      // 3) Draw Back Leg then Front Leg
      drawArticulatedLeg(14.5, pose.legL, true);
      drawArticulatedLeg(21.5, pose.legR, false);

      // 4) Upper Armored Torso & Fluid S-Curve Investigator Trenchcoat
      const coatGrad = ctx.createLinearGradient(8, 18, 28, 52);
      coatGrad.addColorStop(0, '#164e63');
      coatGrad.addColorStop(0.45, '#0e7490');
      coatGrad.addColorStop(1, '#083344');
      ctx.fillStyle = coatGrad;

      const breathW = pose.chestBreath * 0.9;
      ctx.beginPath();
      // Left shoulder curve
      ctx.moveTo(11, 19);
      ctx.quadraticCurveTo(7.5 - breathW * 0.5, 21, 8.5 - breathW * 0.4, 28);
      // Left S-Curve waist & flowing coat tail
      ctx.bezierCurveTo(
        9.5, 34,
        7 - pose.coatFlare + pose.coatWave * 0.7, 42,
        7.5 - pose.coatFlare + pose.coatWave, 50
      );
      // Curved bottom coat hem with dynamic dip
      ctx.bezierCurveTo(
        13 + pose.coatWave, 53.5,
        22 + pose.coatWave, 52.5,
        28.5 + pose.coatFlare + pose.coatWave, 49.5
      );
      // Right S-Curve coat edge up to chest
      ctx.bezierCurveTo(
        28 + pose.coatFlare * 0.6 + pose.coatWave * 0.5, 41,
        26.5 + breathW, 33,
        27.5 + breathW, 26
      );
      // Right shoulder curve
      ctx.quadraticCurveTo(28.2 + breathW * 0.5, 20, 24.5, 19);
      ctx.closePath();
      ctx.fill();

      // Subtle Cyan Edge Rim-Light along front coat & chest curve
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24.5, 19.5);
      ctx.quadraticCurveTo(27.8 + breathW, 25, 26.8 + breathW * 0.6, 34);
      ctx.quadraticCurveTo(27.5 + pose.coatWave * 0.6, 42, 28 + pose.coatFlare + pose.coatWave, 49);
      ctx.stroke();

      // Inner Armor Chest Plate & Contoured Lapels
      const lapelGrad = ctx.createLinearGradient(12, 19, 24, 42);
      lapelGrad.addColorStop(0, '#1e293b');
      lapelGrad.addColorStop(0.5, '#155e75');
      lapelGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = lapelGrad;
      ctx.beginPath();
      ctx.moveTo(13, 19);
      ctx.quadraticCurveTo(18, 29, 20, 48);
      ctx.lineTo(23.5, 47.5);
      ctx.quadraticCurveTo(24.5 + breathW * 0.6, 31, 23.5, 19);
      ctx.closePath();
      ctx.fill();

      // Tactical Utility Belt with Curved Holster Strap & Glowing Amber Buckle
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(9.5, 35.5);
      ctx.quadraticCurveTo(18, 37.5, 26.8, 35.2);
      ctx.lineTo(26.6, 38.2);
      ctx.quadraticCurveTo(18, 40.2, 9.5, 38.2);
      ctx.closePath();
      ctx.fill();

      // Glowing Amber Belt Core
      const buckleGlow = ctx.createRadialGradient(20, 37, 0.5, 20, 37, 5);
      buckleGlow.addColorStop(0, '#fef3c7');
      buckleGlow.addColorStop(0.45, '#f59e0b');
      buckleGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = buckleGlow;
      ctx.beginPath();
      ctx.arc(20, 37, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // 5) Articulated Curved Arm & Wrist Omni-Link
      ctx.save();
      const shoulderX = 15.5;
      const shoulderY = 22.5;
      const handX = 16.5 + pose.armSwing;
      const handY = 37 - Math.abs(pose.armSwing) * 0.25;
      const elbowX = 13.5 + pose.armSwing * 0.4;
      const elbowY = 30.5;

      // Curved sleeve
      ctx.strokeStyle = '#0e7490';
      ctx.lineWidth = 4.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.quadraticCurveTo(elbowX, elbowY, handX, handY);
      ctx.stroke();

      // Shoulder pauldron highlight
      ctx.fillStyle = '#155e75';
      ctx.beginPath();
      ctx.ellipse(shoulderX, shoulderY, 3.2, 4, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // Gloved hand & glowing cyan wrist cuff
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(handX, handY + 1, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(handX - 0.5, handY - 0.8, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 6) High Aerodynamic Collar, Contoured Helmet/Head & Soft Cyan Radial Visor
      ctx.save();
      ctx.translate(cx, 15 - pose.chestBreath * 0.35);
      ctx.rotate(pose.headTilt);
      ctx.translate(-cx, -(15 - pose.chestBreath * 0.35));

      const headY = 12 - pose.chestBreath * 0.35;

      // Flared High Collar (behind and wrapping jaw)
      const collarGrad = ctx.createLinearGradient(10, headY + 2, 25, headY + 10);
      collarGrad.addColorStop(0, '#1e293b');
      collarGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = collarGrad;
      ctx.beginPath();
      ctx.moveTo(10.5, headY + 8);
      ctx.quadraticCurveTo(9.5, headY + 2, 13.5, headY + 1);
      ctx.lineTo(22.5, headY + 2);
      ctx.quadraticCurveTo(25.5, headY + 5, 24.5, headY + 8.5);
      ctx.quadraticCurveTo(18, headY + 10.5, 10.5, headY + 8);
      ctx.closePath();
      ctx.fill();

      // Contoured Cranial / Helmet Silhouette (Smooth Bezier Dome)
      const helmGrad = ctx.createRadialGradient(cx - 2, headY - 3, 1, cx, headY, 9);
      helmGrad.addColorStop(0, '#f8fafc');
      helmGrad.addColorStop(0.55, '#cbd5e1');
      helmGrad.addColorStop(1, '#334155');
      ctx.fillStyle = helmGrad;
      ctx.beginPath();
      ctx.moveTo(11.5, headY + 2);
      ctx.bezierCurveTo(10.5, headY - 6.5, 24.5, headY - 7, 25.2, headY - 0.5);
      ctx.bezierCurveTo(25.6, headY + 3.5, 22.5, headY + 6.2, 18.5, headY + 6);
      ctx.quadraticCurveTo(12.5, headY + 5.8, 11.5, headY + 2);
      ctx.closePath();
      ctx.fill();

      // Soft Cyan Radial Glow Aura around the Aerodynamic Visor (100% -> 0% fade)
      const visorGlowX = 21.5;
      const visorGlowY = headY - 0.3;
      const visorAura = ctx.createRadialGradient(
        visorGlowX,
        visorGlowY,
        0.5,
        visorGlowX,
        visorGlowY,
        10.5
      );
      visorAura.addColorStop(0, 'rgba(186, 230, 253, 0.95)');
      visorAura.addColorStop(0.3, 'rgba(56, 189, 248, 0.65)');
      visorAura.addColorStop(0.65, 'rgba(14, 165, 233, 0.22)');
      visorAura.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = visorAura;
      ctx.beginPath();
      ctx.arc(visorGlowX, visorGlowY, 10.5, 0, Math.PI * 2);
      ctx.fill();

      // Sleek Curved Aerodynamic Visor Lens
      const visorLensGrad = ctx.createLinearGradient(15, headY - 2, 26, headY + 1.5);
      visorLensGrad.addColorStop(0, '#0284c7');
      visorLensGrad.addColorStop(0.5, '#38bdf8');
      visorLensGrad.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = visorLensGrad;
      ctx.beginPath();
      ctx.moveTo(15.2, headY - 1.2);
      ctx.quadraticCurveTo(21.2, headY - 2.8, 25.8, headY - 0.6);
      ctx.quadraticCurveTo(25.6, headY + 1.8, 20.5, headY + 1.6);
      ctx.quadraticCurveTo(16.2, headY + 1.2, 15.2, headY - 1.2);
      ctx.closePath();
      ctx.fill();

      // Crisp Visor Specular Glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.beginPath();
      ctx.ellipse(21.5, headY - 0.9, 2.6, 0.75, -0.08, 0, Math.PI * 2);
      ctx.fill();

      // Ear Comm-Link Node
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(14.2, headY + 0.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(14.2, headY + 0.5, 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.restore();
    };

    // Sine-wave Idle Frames (4 frames for continuous organic breathing & cloth sway)
    const idlePoses: InvestigatorPose[] = [
      {
        squashX: 1.0,
        stretchY: 1.0,
        hipDropY: 0,
        chestBreath: 0,
        legL: { x: -1.2, liftY: 0, kneeBend: 0.4, footAngle: 0 },
        legR: { x: 1.2, liftY: 0, kneeBend: 0.6, footAngle: 0 },
        coatWave: 0,
        coatFlare: 0.4,
        armSwing: 0,
        headTilt: 0
      },
      {
        squashX: 0.985,
        stretchY: 1.018,
        hipDropY: -0.4,
        chestBreath: 0.8,
        legL: { x: -1.2, liftY: 0, kneeBend: 0.3, footAngle: 0 },
        legR: { x: 1.2, liftY: 0, kneeBend: 0.5, footAngle: 0 },
        coatWave: 0.9,
        coatFlare: 0.8,
        armSwing: 0.4,
        headTilt: -0.02
      },
      {
        squashX: 0.975,
        stretchY: 1.028,
        hipDropY: -0.7,
        chestBreath: 1.3,
        legL: { x: -1.2, liftY: 0, kneeBend: 0.2, footAngle: 0 },
        legR: { x: 1.2, liftY: 0, kneeBend: 0.4, footAngle: 0 },
        coatWave: 1.5,
        coatFlare: 1.1,
        armSwing: 0.7,
        headTilt: -0.03
      },
      {
        squashX: 0.99,
        stretchY: 1.012,
        hipDropY: -0.3,
        chestBreath: 0.5,
        legL: { x: -1.2, liftY: 0, kneeBend: 0.35, footAngle: 0 },
        legR: { x: 1.2, liftY: 0, kneeBend: 0.55, footAngle: 0 },
        coatWave: 0.5,
        coatFlare: 0.6,
        armSwing: 0.2,
        headTilt: -0.01
      }
    ];

    idlePoses.forEach((pose, idx) => {
      this.generateCanvasTexture(`inv_idle_${idx}`, charW, charH, (ctx) => {
        drawCurvedInvestigator(ctx, pose);
      });
    });

    // Dynamic Squash & Stretch Walk Cycle (4 frames with weight shift & curved foot flex)
    const walkPoses: InvestigatorPose[] = [
      // Frame 0: Contact Stride (Left leg back toe-off, Right leg forward heel-strike, slight squash)
      {
        squashX: 1.03,
        stretchY: 0.975,
        hipDropY: 1.2,
        chestBreath: 0.6,
        legL: { x: -4.8, liftY: 1.8, kneeBend: 1.8, footAngle: 0.32 },
        legR: { x: 4.5, liftY: 0.5, kneeBend: 1.2, footAngle: -0.22 },
        coatWave: -2.2,
        coatFlare: 2.2,
        armSwing: -3.2,
        headTilt: 0.03
      },
      // Frame 1: Passing Rise (Body stretches upward, left knee swings forward lifted)
      {
        squashX: 0.975,
        stretchY: 1.025,
        hipDropY: -1.0,
        chestBreath: 0.9,
        legL: { x: 0.8, liftY: 3.6, kneeBend: 2.8, footAngle: 0.18 },
        legR: { x: -0.5, liftY: 0, kneeBend: 0.5, footAngle: 0 },
        coatWave: -0.8,
        coatFlare: 1.0,
        armSwing: 0.5,
        headTilt: -0.01
      },
      // Frame 2: Opposite Contact Stride (Left leg forward heel-strike, Right leg back toe-off, squash)
      {
        squashX: 1.03,
        stretchY: 0.975,
        hipDropY: 1.2,
        chestBreath: 0.6,
        legL: { x: 4.5, liftY: 0.5, kneeBend: 1.2, footAngle: -0.22 },
        legR: { x: -4.8, liftY: 1.8, kneeBend: 1.8, footAngle: 0.32 },
        coatWave: -2.5,
        coatFlare: 2.4,
        armSwing: 3.2,
        headTilt: 0.03
      },
      // Frame 3: Opposite Passing Rise (Right knee swings forward lifted)
      {
        squashX: 0.975,
        stretchY: 1.025,
        hipDropY: -1.0,
        chestBreath: 0.9,
        legL: { x: -0.5, liftY: 0, kneeBend: 0.5, footAngle: 0 },
        legR: { x: 0.8, liftY: 3.6, kneeBend: 2.8, footAngle: 0.18 },
        coatWave: -1.0,
        coatFlare: 1.1,
        armSwing: -0.5,
        headTilt: -0.01
      }
    ];

    walkPoses.forEach((pose, idx) => {
      this.generateCanvasTexture(`inv_walk_${idx}`, charW, charH, (ctx) => {
        drawCurvedInvestigator(ctx, pose);
      });
    });

    // -----------------------------------------------------------------
    // 2. CURVED INDUSTRIAL STATION ARCH & PILLARS (tex_arch)
    // -----------------------------------------------------------------
    this.generateCanvasTexture('tex_arch', 64, 560, (ctx, w, h) => {
      // Curved Structural Pylon Body with Beveled Fillets
      const pylonGrad = ctx.createLinearGradient(0, 0, w, 0);
      pylonGrad.addColorStop(0, '#09101a');
      pylonGrad.addColorStop(0.2, '#162436');
      pylonGrad.addColorStop(0.5, '#1e3048');
      pylonGrad.addColorStop(0.8, '#142030');
      pylonGrad.addColorStop(1, '#070c14');
      ctx.fillStyle = pylonGrad;

      // Bowed industrial column with flared top arch & base pedestal
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(w - 2, 0);
      ctx.bezierCurveTo(w - 2, 70, w - 10, 90, w - 10, 150);
      ctx.lineTo(w - 10, h - 70);
      ctx.quadraticCurveTo(w - 10, h - 25, w - 3, h);
      ctx.lineTo(3, h);
      ctx.quadraticCurveTo(10, h - 25, 10, h - 70);
      ctx.lineTo(10, 150);
      ctx.bezierCurveTo(10, 90, 2, 70, 2, 0);
      ctx.closePath();
      ctx.fill();

      // Inner Beveled Armor Plates with Rounded Corners
      for (let y = 24; y < h - 40; y += 88) {
        const plateGrad = ctx.createLinearGradient(13, y, w - 13, y + 68);
        plateGrad.addColorStop(0, 'rgba(30, 41, 59, 0.7)');
        plateGrad.addColorStop(1, 'rgba(9, 14, 23, 0.8)');
        ctx.fillStyle = plateGrad;
        ctx.beginPath();
        ctx.roundRect(13, y, w - 26, 68, 6);
        ctx.fill();

        // Bevel rim highlight
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Curved Collar Clamp Ring between plates
        const clampGrad = ctx.createLinearGradient(8, y + 72, w - 8, y + 72);
        clampGrad.addColorStop(0, '#090f1a');
        clampGrad.addColorStop(0.5, '#334155');
        clampGrad.addColorStop(1, '#090f1a');
        ctx.fillStyle = clampGrad;
        ctx.beginPath();
        ctx.roundRect(8, y + 72, w - 16, 10, 4);
        ctx.fill();
      }

      // Recessed Neon Conduit Groove along Pillar Spine
      ctx.fillStyle = '#030712';
      ctx.beginPath();
      ctx.roundRect(w / 2 - 4, 16, 8, h - 32, 4);
      ctx.fill();

      const neonSpineGrad = ctx.createLinearGradient(w / 2 - 6, 0, w / 2 + 6, 0);
      neonSpineGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      neonSpineGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.85)');
      neonSpineGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = neonSpineGrad;
      ctx.fillRect(w / 2 - 6, 20, 12, h - 40);

      // Crisp Core Neon Filament
      ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
      ctx.fillRect(w / 2 - 1, 20, 2, h - 40);

      // Glowing Status Beacon Housing (at y = 190)
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.roundRect(w / 2 - 11, 178, 22, 26, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      const nodeGlow = ctx.createRadialGradient(w / 2, 191, 1, w / 2, 191, 14);
      nodeGlow.addColorStop(0, '#ffffff');
      nodeGlow.addColorStop(0.35, 'rgba(56, 189, 248, 0.9)');
      nodeGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = nodeGlow;
      ctx.beginPath();
      ctx.arc(w / 2, 191, 14, 0, Math.PI * 2);
      ctx.fill();

      // Top & Base Ambient Occlusion (AO) Shadow Gradients
      const topAO = ctx.createLinearGradient(0, 0, 0, 65);
      topAO.addColorStop(0, 'rgba(2, 6, 23, 0.88)');
      topAO.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = topAO;
      ctx.fillRect(0, 0, w, 65);

      const baseAO = ctx.createLinearGradient(0, h - 90, 0, h);
      baseAO.addColorStop(0, 'rgba(2, 6, 23, 0)');
      baseAO.addColorStop(0.7, 'rgba(2, 6, 23, 0.65)');
      baseAO.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
      ctx.fillStyle = baseAO;
      ctx.fillRect(0, h - 90, w, 90);
    });

    // -----------------------------------------------------------------
    // 3. PLATFORM WITH ROUNDED HAZARD STRIPES & SPECULAR SHEEN
    // -----------------------------------------------------------------
    this.generateCanvasTexture('tex_platform_slice', 120, 160, (ctx, w, h) => {
      // Deep Metallic Deck Base with Vertical Depth Gradient
      const deckGrad = ctx.createLinearGradient(0, 0, 0, h);
      deckGrad.addColorStop(0, '#1e293b');
      deckGrad.addColorStop(0.08, '#0f172a');
      deckGrad.addColorStop(0.45, '#090f1d');
      deckGrad.addColorStop(1, '#020617');
      ctx.fillStyle = deckGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle Ground Specular Reflection Sheen along top surface
      const specGrad = ctx.createRadialGradient(w * 0.5, 4, 2, w * 0.5, 16, w * 0.65);
      specGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
      specGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.07)');
      specGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = specGrad;
      ctx.fillRect(0, 0, w, 36);

      // Rounded Hazard Safety Strip Channel (Clipped Rounded Bar)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(2, 2, w - 4, 13, 4);
      ctx.clip();

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, 16);

      for (let x = -20; x < w + 24; x += 24) {
        const hazGrad = ctx.createLinearGradient(x, 2, x + 12, 15);
        hazGrad.addColorStop(0, '#fbbf24');
        hazGrad.addColorStop(1, '#d97706');
        ctx.fillStyle = hazGrad;

        ctx.beginPath();
        ctx.moveTo(x + 2, 2);
        ctx.lineTo(x + 13, 2);
        ctx.quadraticCurveTo(x + 14, 2, x + 12, 5);
        ctx.lineTo(x + 6, 15);
        ctx.lineTo(x - 5, 15);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Top Specular Lip Bevel Highlight
      const lipGrad = ctx.createLinearGradient(0, 0, w, 0);
      lipGrad.addColorStop(0, 'rgba(148, 163, 184, 0.25)');
      lipGrad.addColorStop(0.5, 'rgba(226, 232, 240, 0.55)');
      lipGrad.addColorStop(1, 'rgba(148, 163, 184, 0.25)');
      ctx.fillStyle = lipGrad;
      ctx.fillRect(0, 0, w, 2);

      // Recessed Sub-Platform Structural Arch Cutouts
      ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
      ctx.beginPath();
      ctx.roundRect(8, 26, 46, 56, 8);
      ctx.roundRect(66, 26, 46, 56, 8);
      ctx.fill();

      ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Subtle glowing under-edge conduit line
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 19);
      ctx.lineTo(w, 19);
      ctx.stroke();
    });

    // -----------------------------------------------------------------
    // 4. ATMOSPHERIC VOLUMETRIC CONE LIGHT SHAFT & RADIAL LIGHT DISCS
    // -----------------------------------------------------------------
    this.generateCanvasTexture('tex_light_cone', 240, 480, (ctx, w, h) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(w / 2 - 18, 0);
      ctx.lineTo(w / 2 + 18, 0);
      ctx.quadraticCurveTo(w / 2 + 65, h * 0.5, w / 2 + 115, h);
      ctx.lineTo(w / 2 - 115, h);
      ctx.quadraticCurveTo(w / 2 - 65, h * 0.5, w / 2 - 18, 0);
      ctx.closePath();
      ctx.clip();

      const vGrad = ctx.createLinearGradient(0, 0, 0, h);
      vGrad.addColorStop(0, 'rgba(186, 230, 253, 0.32)');
      vGrad.addColorStop(0.25, 'rgba(56, 189, 248, 0.16)');
      vGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.06)');
      vGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, w, h);

      // Soft horizontal falloff mask
      const hGrad = ctx.createRadialGradient(w / 2, h * 0.3, 8, w / 2, h * 0.5, w * 0.52);
      hGrad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
      hGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.05)');
      hGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = hGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    });

    // Soft Radial Light Discs for Phase 2 Additive Bloom
    const createRadialDisc = (key: string, innerRGB: string, size = 160) => {
      this.generateCanvasTexture(key, size, size, (ctx, w, h) => {
        const cx = w / 2;
        const cy = h / 2;
        const r = w / 2;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        grad.addColorStop(0.3, `rgba(${innerRGB}, 0.6)`);
        grad.addColorStop(0.65, `rgba(${innerRGB}, 0.18)`);
        grad.addColorStop(1, `rgba(${innerRGB}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    createRadialDisc('fx_light_disc_cyan', '56, 189, 248', 180);
    createRadialDisc('fx_light_disc_amber', '245, 158, 11', 180);
    createRadialDisc('fx_light_disc_emerald', '16, 185, 129', 160);

    // -----------------------------------------------------------------
    // 5. HOLOGRAPHIC RING RETICLE (fx_reticle)
    // -----------------------------------------------------------------
    this.generateCanvasTexture('fx_reticle', 44, 44, (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;

      // Soft outer radial aura
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 20);
      glow.addColorStop(0, 'rgba(186, 230, 253, 0.75)');
      glow.addColorStop(0.45, 'rgba(56, 189, 248, 0.35)');
      glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();

      // Dashed Holographic Outer Orbit Ring
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Sleek Inner Curved Brackets
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const startAngle = i * (Math.PI / 2) + 0.25;
        const endAngle = startAngle + 0.9;
        ctx.beginPath();
        ctx.arc(cx, cy, 10.5, startAngle, endAngle);
        ctx.stroke();
      }

      // Luminous Center Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // -----------------------------------------------------------------
    // 6. SOFT AMBIENT MOTES / VOLUMETRIC MIST PARTICLE
    // -----------------------------------------------------------------
    this.generateCanvasTexture('fx_mist_particle', 32, 32, (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      const r = w / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(224, 242, 254, 0.85)');
      grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.45)');
      grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.12)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // -----------------------------------------------------------------
    // 7. HIGH-FIDELITY CURVED PROPS & TERMINALS
    // -----------------------------------------------------------------

    // 7A. Emergency Field Radio with Curved Chassis & Radial Beacon (44x40)
    this.generateCanvasTexture('prop_radio_detailed', 44, 40, (ctx, w, h) => {
      // Soft AO Shadow
      const ao = ctx.createRadialGradient(w / 2, h - 4, 2, w / 2, h - 4, 18);
      ao.addColorStop(0, 'rgba(2, 6, 23, 0.75)');
      ao.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = ao;
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 4, 17, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Whip Antenna with curved base & glowing red beacon
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(32, 14);
      ctx.quadraticCurveTo(33, 6, 31, 3);
      ctx.stroke();

      const tipGlow = ctx.createRadialGradient(31, 3, 0.5, 31, 3, 6);
      tipGlow.addColorStop(0, '#fecaca');
      tipGlow.addColorStop(0.4, '#ef4444');
      tipGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = tipGlow;
      ctx.beginPath();
      ctx.arc(31, 3, 6, 0, Math.PI * 2);
      ctx.fill();

      // Contoured Rugged Amber-Slate Radio Body
      const bodyGrad = ctx.createLinearGradient(6, 12, 38, 36);
      bodyGrad.addColorStop(0, '#d97706');
      bodyGrad.addColorStop(0.5, '#b45309');
      bodyGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(7, 13, 30, 22, 6);
      ctx.fill();

      // Top Bevel Highlight & Protective Bumpers
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Curved Rotary Tuning Dials
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(11, 9, 6, 5, 2.5);
      ctx.roundRect(19, 10, 5, 4, 2);
      ctx.fill();

      // Glowing Curved OLED Frequency Display
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.roundRect(10, 17, 16, 10, 3);
      ctx.fill();

      const lcdGlow = ctx.createRadialGradient(18, 22, 1, 18, 22, 11);
      lcdGlow.addColorStop(0, 'rgba(186, 230, 253, 0.95)');
      lcdGlow.addColorStop(0.5, 'rgba(56, 189, 248, 0.5)');
      lcdGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = lcdGlow;
      ctx.beginPath();
      ctx.roundRect(9, 16, 18, 12, 4);
      ctx.fill();

      // Sine-wave signal line inside LCD
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(12, 22);
      ctx.bezierCurveTo(15, 18, 17, 26, 20, 21);
      ctx.quadraticCurveTo(22, 19, 24, 22);
      ctx.stroke();

      // Circular Speaker Grille
      ctx.fillStyle = '#271206';
      ctx.beginPath();
      ctx.arc(31, 23, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 7B. Curved Holographic Transit Signpost (88x100)
    this.generateCanvasTexture('prop_signpost_detailed', 88, 100, (ctx, w, h) => {
      // Base AO Shadow
      const ao = ctx.createRadialGradient(w / 2, h - 4, 2, w / 2, h - 4, 22);
      ao.addColorStop(0, 'rgba(2, 6, 23, 0.8)');
      ao.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = ao;
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 4, 20, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sleek Tapered Pylon Post
      const postGrad = ctx.createLinearGradient(w / 2 - 5, 30, w / 2 + 5, 30);
      postGrad.addColorStop(0, '#0f172a');
      postGrad.addColorStop(0.5, '#475569');
      postGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = postGrad;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 4, 32, 8, 62, 3);
      ctx.fill();

      // Curved Base Flange
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(w / 2 - 14, h - 4);
      ctx.quadraticCurveTo(w / 2, h - 14, w / 2 + 14, h - 4);
      ctx.closePath();
      ctx.fill();

      // Rounded Glassmorphic Sign Housing
      const boardGrad = ctx.createLinearGradient(4, 2, w - 4, 36);
      boardGrad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
      boardGrad.addColorStop(1, 'rgba(3, 7, 18, 0.98)');
      ctx.fillStyle = boardGrad;
      ctx.beginPath();
      ctx.roundRect(4, 2, w - 8, 34, 10);
      ctx.fill();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Inner Soft Cyan Screen Glow
      const screenGlow = ctx.createRadialGradient(w / 2, 19, 4, w / 2, 19, 40);
      screenGlow.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      screenGlow.addColorStop(1, 'rgba(56, 189, 248, 0.04)');
      ctx.fillStyle = screenGlow;
      ctx.beginPath();
      ctx.roundRect(8, 6, w - 16, 26, 7);
      ctx.fill();

      // Symbolic Holographic Bars & Curved Chevron Arrow
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.roundRect(14, 11, 42, 4, 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(14, 19, 32, 3.5, 1.8);
      ctx.fill();

      // Smooth Curved Direction Chevron
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(64, 12);
      ctx.lineTo(72, 19);
      ctx.lineTo(64, 26);
      ctx.stroke();
    });

    // 7C. Mainframe Console (Curved Terminal Display + Keyboard Glow)
    // Registered as both `prop_terminal_detailed` and `tex_console`
    const drawCurvedConsole = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      // Floor AO Shadow
      const ao = ctx.createRadialGradient(w / 2, h - 5, 4, w / 2, h - 5, 32);
      ao.addColorStop(0, 'rgba(2, 6, 23, 0.85)');
      ao.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = ao;
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 5, 28, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Curved Ergonomic Pedestal Neck
      const pedGrad = ctx.createLinearGradient(16, 46, w - 16, h - 4);
      pedGrad.addColorStop(0, '#0f172a');
      pedGrad.addColorStop(0.5, '#334155');
      pedGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = pedGrad;
      ctx.beginPath();
      ctx.moveTo(22, 48);
      ctx.bezierCurveTo(20, 62, 14, 72, 14, h - 5);
      ctx.quadraticCurveTo(w / 2, h - 1, w - 14, h - 5);
      ctx.bezierCurveTo(w - 14, 72, w - 20, 62, w - 22, 48);
      ctx.closePath();
      ctx.fill();

      // Curved Power Conduits snaking across floor
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w - 20, 68);
      ctx.bezierCurveTo(w - 10, 72, w - 8, 82, w - 2, 84);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.beginPath();
      ctx.moveTo(w - 22, 72);
      ctx.bezierCurveTo(w - 14, 77, w - 12, 85, w - 5, 86);
      ctx.stroke();

      // Contoured Upper Console Shell (Rounded Bevel Housing)
      const shellGrad = ctx.createLinearGradient(8, 8, w - 8, 54);
      shellGrad.addColorStop(0, '#334155');
      shellGrad.addColorStop(0.45, '#1e293b');
      shellGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = shellGrad;
      ctx.beginPath();
      ctx.roundRect(8, 8, w - 16, 44, 11);
      ctx.fill();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Tilted Curved Display Screen with Emerald-Cyan Bevel
      const screenGrad = ctx.createLinearGradient(13, 12, w - 13, 38);
      screenGrad.addColorStop(0, '#022c22');
      screenGrad.addColorStop(0.6, '#064e3b');
      screenGrad.addColorStop(1, '#022c22');
      ctx.fillStyle = screenGrad;
      ctx.beginPath();
      ctx.moveTo(15, 13);
      ctx.quadraticCurveTo(w / 2, 10.5, w - 15, 13);
      ctx.quadraticCurveTo(w - 11, 25, w - 14, 37);
      ctx.quadraticCurveTo(w / 2, 39.5, 14, 37);
      ctx.quadraticCurveTo(11, 25, 15, 13);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Smooth Telemetry Waveforms inside Curved Screen
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(18, 23);
      ctx.bezierCurveTo(26, 15, 32, 31, 40, 21);
      ctx.bezierCurveTo(46, 14, 50, 29, w - 18, 22);
      ctx.stroke();

      ctx.fillStyle = 'rgba(167, 243, 208, 0.85)';
      ctx.beginPath();
      ctx.roundRect(18, 30, 22, 2.5, 1.2);
      ctx.roundRect(44, 30, 8, 2.5, 1.2);
      ctx.fill();

      // Angled Curved Keyboard Deck
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(11, 41, w - 22, 11, 5);
      ctx.fill();

      // Screen Light Cast downward onto the Keyboard Deck!
      const screenCast = ctx.createRadialGradient(w / 2, 38, 2, w / 2, 46, 28);
      screenCast.addColorStop(0, 'rgba(110, 231, 183, 0.55)');
      screenCast.addColorStop(0.55, 'rgba(16, 185, 129, 0.25)');
      screenCast.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = screenCast;
      ctx.beginPath();
      ctx.roundRect(10, 36, w - 20, 18, 6);
      ctx.fill();

      // Illuminated Tactile Keycaps
      ctx.fillStyle = 'rgba(167, 243, 208, 0.7)';
      for (let kx = 16; kx < w - 18; kx += 6) {
        ctx.beginPath();
        ctx.roundRect(kx, 44.5, 4, 3.5, 1);
        ctx.fill();
      }
    };

    this.generateCanvasTexture('prop_terminal_detailed', 72, 88, drawCurvedConsole);
    this.generateCanvasTexture('tex_console', 72, 88, drawCurvedConsole);

    // 7D. Chamfered Octagonal Airlock Vault Door with Curved Hydraulic Rails
    // Registered as both `prop_gate_detailed` and `tex_door`
    const drawChamferedVaultDoor = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const cut = 26; // Octagonal chamfer radius

      // Outer Reinforced Octagonal Vault Frame
      const frameGrad = ctx.createLinearGradient(0, 0, w, h);
      frameGrad.addColorStop(0, '#1e293b');
      frameGrad.addColorStop(0.5, '#0f172a');
      frameGrad.addColorStop(1, '#030712');
      ctx.fillStyle = frameGrad;

      ctx.beginPath();
      ctx.moveTo(cut, 2);
      ctx.lineTo(w - cut, 2);
      ctx.quadraticCurveTo(w - 2, 2, w - 2, cut);
      ctx.lineTo(w - 2, h - 4);
      ctx.lineTo(2, h - 4);
      ctx.lineTo(2, cut);
      ctx.quadraticCurveTo(2, 2, cut, 2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner Recessed Door Cavity
      ctx.fillStyle = '#050811';
      ctx.beginPath();
      ctx.roundRect(12, 14, w - 24, h - 18, 16);
      ctx.fill();

      // Left & Right Interlocking Blast Door Leaves
      const leafGradL = ctx.createLinearGradient(14, 0, w / 2, 0);
      leafGradL.addColorStop(0, '#0f172a');
      leafGradL.addColorStop(0.7, '#1e293b');
      leafGradL.addColorStop(1, '#090d16');
      ctx.fillStyle = leafGradL;
      ctx.beginPath();
      ctx.roundRect(15, 18, w / 2 - 16, h - 24, [14, 3, 3, 6]);
      ctx.fill();

      const leafGradR = ctx.createLinearGradient(w / 2, 0, w - 14, 0);
      leafGradR.addColorStop(0, '#090d16');
      leafGradR.addColorStop(0.3, '#1e293b');
      leafGradR.addColorStop(1, '#0f172a');
      ctx.fillStyle = leafGradR;
      ctx.beginPath();
      ctx.roundRect(w / 2 + 1, 18, w / 2 - 16, h - 24, [3, 14, 6, 3]);
      ctx.fill();

      // Curved Hydraulic Compression Cylinders & Rails on Left/Right Sides
      const drawHydraulicRail = (rx: number, dir: number) => {
        // Curved hydraulic tubing
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rx, 46);
        ctx.bezierCurveTo(rx + dir * 6, 75, rx + dir * 6, 145, rx, 178);
        ctx.stroke();

        // Chrome piston rod highlight
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rx + dir * 2, 68);
        ctx.bezierCurveTo(rx + dir * 5, 95, rx + dir * 5, 125, rx + dir * 2, 156);
        ctx.stroke();
      };

      drawHydraulicRail(9, 1);
      drawHydraulicRail(w - 9, -1);

      // Rounded Hazard Chevrons across Blast Door Midsection
      for (let y = 98; y <= 134; y += 16) {
        const hazGrad = ctx.createLinearGradient(22, y, w - 22, y + 8);
        hazGrad.addColorStop(0, '#d97706');
        hazGrad.addColorStop(0.5, '#fbbf24');
        hazGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = hazGrad;
        ctx.beginPath();
        ctx.roundRect(22, y, w / 2 - 32, 7, 3.5);
        ctx.roundRect(w / 2 + 10, y, w / 2 - 32, 7, 3.5);
        ctx.fill();
      }

      // Central Chamfered Biometric Lock Wheel Housing
      ctx.fillStyle = '#030712';
      ctx.beginPath();
      ctx.arc(w / 2, 118, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Radial Red/Amber Security Lock Glow
      const lockGlow = ctx.createRadialGradient(w / 2, 118, 1, w / 2, 118, 20);
      lockGlow.addColorStop(0, '#fef2f2');
      lockGlow.addColorStop(0.3, '#ef4444');
      lockGlow.addColorStop(0.7, 'rgba(239, 68, 68, 0.35)');
      lockGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = lockGlow;
      ctx.beginPath();
      ctx.arc(w / 2, 118, 20, 0, Math.PI * 2);
      ctx.fill();

      // Overhead Illuminated Sector Header Bar
      const hdrGlow = ctx.createLinearGradient(w / 2 - 30, 26, w / 2 + 30, 26);
      hdrGlow.addColorStop(0, 'rgba(56, 189, 248, 0.2)');
      hdrGlow.addColorStop(0.5, 'rgba(186, 230, 253, 0.95)');
      hdrGlow.addColorStop(1, 'rgba(56, 189, 248, 0.2)');
      ctx.fillStyle = hdrGlow;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 30, 24, 60, 6, 3);
      ctx.fill();
    };

    this.generateCanvasTexture('prop_gate_detailed', 128, 240, drawChamferedVaultDoor);
    this.generateCanvasTexture('tex_door', 128, 240, drawChamferedVaultDoor);

    // 7E. Core Reactor (`tex_generator`): Glowing Glass Cylinder with Cyan-Amber Swirling Plasma
    this.generateCanvasTexture('tex_generator', 96, 180, (ctx, w, h) => {
      const cx = w / 2;

      // External Curved Coolant Pipes
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(20, 28);
      ctx.bezierCurveTo(4, 55, 4, 125, 20, 152);
      ctx.moveTo(w - 20, 28);
      ctx.bezierCurveTo(w - 4, 55, w - 4, 125, w - 20, 152);
      ctx.stroke();

      // Cylindrical Glass Containment Tube
      const glassGrad = ctx.createLinearGradient(22, 24, w - 22, 24);
      glassGrad.addColorStop(0, 'rgba(14, 116, 144, 0.45)');
      glassGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.18)');
      glassGrad.addColorStop(1, 'rgba(14, 116, 144, 0.45)');
      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.roundRect(22, 24, w - 44, h - 52, 16);
      ctx.fill();

      // Internal Swirling Cyan-Amber Plasma Core
      const coreCyan = ctx.createRadialGradient(cx - 4, h * 0.42, 2, cx, h * 0.45, 34);
      coreCyan.addColorStop(0, '#ffffff');
      coreCyan.addColorStop(0.35, 'rgba(56, 189, 248, 0.85)');
      coreCyan.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = coreCyan;
      ctx.beginPath();
      ctx.arc(cx, h * 0.45, 34, 0, Math.PI * 2);
      ctx.fill();

      const coreAmber = ctx.createRadialGradient(cx + 5, h * 0.58, 2, cx, h * 0.56, 30);
      coreAmber.addColorStop(0, '#fef3c7');
      coreAmber.addColorStop(0.4, 'rgba(245, 158, 11, 0.8)');
      coreAmber.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = coreAmber;
      ctx.beginPath();
      ctx.arc(cx, h * 0.56, 30, 0, Math.PI * 2);
      ctx.fill();

      // Swirling S-Curve Plasma Helices inside Chamber
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 10, 36);
      ctx.bezierCurveTo(cx + 18, 65, cx - 18, 110, cx + 8, 142);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(253, 230, 138, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 10, 36);
      ctx.bezierCurveTo(cx - 18, 65, cx + 18, 110, cx - 8, 142);
      ctx.stroke();

      // Upper & Lower Curved Containment Caps
      const capGrad = ctx.createLinearGradient(16, 0, w - 16, 0);
      capGrad.addColorStop(0, '#0f172a');
      capGrad.addColorStop(0.5, '#475569');
      capGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.roundRect(16, 12, w - 32, 18, 8);
      ctx.roundRect(14, h - 34, w - 28, 24, 8);
      ctx.fill();

      // Glass Specular Vertical Reflection Highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(28, 34);
      ctx.lineTo(28, h - 42);
      ctx.stroke();
    });
  }

  private createCharacterAnimations(): void {
    if (!this.anims.exists('anim_investigator_idle')) {
      this.anims.create({
        key: 'anim_investigator_idle',
        frames: [
          { key: 'inv_idle_0' },
          { key: 'inv_idle_1' },
          { key: 'inv_idle_2' },
          { key: 'inv_idle_3' }
        ],
        frameRate: 4,
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
        frameRate: 9,
        repeat: -1
      });
    }
  }
}
