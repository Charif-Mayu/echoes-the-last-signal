import Phaser from 'phaser';
import { 
  SceneKey, 
  InteractionTarget, 
  SCENE_WORLD_WIDTH, 
  SCENE_WORLD_HEIGHT, 
  GROUND_Y, 
  INITIAL_STATION_TARGETS 
} from '../types/game';
import { InputManager } from '../engine/InputManager';
import { saveManager } from '../persistence/SaveManager';
import { audioManager } from '../engine/AudioManager';
import { uiStateManager } from '../systems/UIStateManager';

export class StationScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private inputManager!: InputManager;
  private interactiveTargets: InteractionTarget[] = [];
  private activeTarget: InteractionTarget | null = null;

  // Floating Holographic Reticle & Prompt Container
  private reticleContainer!: Phaser.GameObjects.Container;
  private reticleSprite!: Phaser.GameObjects.Sprite;
  private reticleOuterSprite!: Phaser.GameObjects.Sprite;
  private promptText!: Phaser.GameObjects.Text;
  private promptPillGraphics!: Phaser.GameObjects.Graphics;

  // Audio rhythm timing
  private lastFootstepTime: number = 0;
  private footstepIntervalMs: number = 300;

  // Auto-save checkpoint throttle
  private lastAutoSaveTime: number = 0;

  // Ambient particles
  private mistParticles?: Phaser.GameObjects.Particles.ParticleEmitter;
  private moteParticles?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super(SceneKey.Station);
  }

  create(): void {
    const saveState = saveManager.load();

    // 0. Ensure Soft Radial Light Disc & Ambient Mote Canvas Textures exist
    this.ensureSoftLightTextures();

    // 1. World Bounds & Physics Setup
    this.physics.world.setBounds(0, 0, SCENE_WORLD_WIDTH, SCENE_WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, SCENE_WORLD_WIDTH, SCENE_WORLD_HEIGHT);

    // 2. Parallax Backdrop Layers
    this.createParallaxAtmosphere();

    // 3. Ground Platform & Rail Pit
    this.createStationPlatform();

    // 4. Props, Core Reactor & Interactive Targets with Soft Additive Lighting
    this.setupStationProps();

    // 5. Soft Ambient Motes & Volumetric Mist
    this.createVolumetricMist();

    // 6. Player Setup
    const spawnX = saveState.checkpoint.playerX || 180;
    const spawnY = saveState.checkpoint.playerY || (GROUND_Y - 40);

    this.player = this.physics.add.sprite(spawnX, spawnY, 'inv_idle_0');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0);
    this.player.setSize(24, 60);
    this.player.setOffset(6, 6);
    this.player.setDepth(20);
    this.player.setFlipX(saveState.checkpoint.facing === 'left');
    this.physics.add.collider(this.player, this.platforms);

    this.player.play('anim_investigator_idle');

    // Smooth cinematic camera follow with horizontal damping
    this.cameras.main.startFollow(this.player, true, 0.06, 0.06);
    this.cameras.main.setDeadzone(100, 50);

    // Cinematic Awakening Fade-in
    this.cameras.main.fadeIn(1600, 4, 9, 18);

    // 7. Input Manager (synchronized with any currently open modal)
    this.inputManager = new InputManager(this);
    this.inputManager.setEnabled(!uiStateManager.isAnyModalOpen());

    // 8. Interaction Reticle HUD
    this.createFloatingReticleHUD();

    // Listen for resize
    this.scale.on('resize', this.handleResize, this);
  }

  private ensureSoftLightTextures(): void {
    const createRadialLightDisc = (key: string, rgb: string, size = 180) => {
      if (this.textures.exists(key)) return;
      const canvasTex = this.textures.createCanvas(key, size, size);
      if (!canvasTex) return;
      const ctx = canvasTex.getContext();
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      grad.addColorStop(0.3, `rgba(${rgb}, 0.6)`);
      grad.addColorStop(0.68, `rgba(${rgb}, 0.18)`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      canvasTex.refresh();
    };

    createRadialLightDisc('fx_light_disc_cyan', '56, 189, 248', 180);
    createRadialLightDisc('fx_light_disc_amber', '245, 158, 11', 180);
    createRadialLightDisc('fx_light_disc_emerald', '16, 185, 129', 160);

    // Soft Blurred Circular Mote (rendered at 2–6px via particle scale)
    if (!this.textures.exists('fx_ambient_mote')) {
      const size = 16;
      const canvasTex = this.textures.createCanvas('fx_ambient_mote', size, size);
      if (canvasTex) {
        const ctx = canvasTex.getContext();
        const r = size / 2;
        const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.35, 'rgba(186, 230, 253, 0.65)');
        grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.2)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.fill();
        canvasTex.refresh();
      }
    }
  }

  private createParallaxAtmosphere(): void {
    // -----------------------------------------------------------------
    // LAYER 0: Distant Subterranean Cavern & Curved Skyline (scrollFactor: 0.1)
    // -----------------------------------------------------------------
    this.add.rectangle(
      SCENE_WORLD_WIDTH / 2,
      SCENE_WORLD_HEIGHT / 2,
      SCENE_WORLD_WIDTH,
      SCENE_WORLD_HEIGHT,
      0x040811
    ).setScrollFactor(0.1).setDepth(0);

    if (!this.textures.exists('tex_far_skyline')) {
      const farTex = this.textures.createCanvas('tex_far_skyline', SCENE_WORLD_WIDTH, 480);
      if (farTex) {
        const ctx = farTex.getContext();
        // Smooth atmospheric cavern gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, 480);
        skyGrad.addColorStop(0, '#02050b');
        skyGrad.addColorStop(0.55, '#07101e');
        skyGrad.addColorStop(1, '#0a1628');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, SCENE_WORLD_WIDTH, 480);

        // Curved subterranean megastructure silhouettes
        ctx.fillStyle = '#091322';
        for (let x = 0; x < SCENE_WORLD_WIDTH; x += 140) {
          const h = 190 + ((x * 37) % 210);
          ctx.beginPath();
          ctx.roundRect(x, 480 - h, 104, h + 20, [18, 18, 0, 0]);
          ctx.fill();
        }

        // Soft glowing horizontal transit conduits
        const drawConduitLine = (y: number, rgb: string, alpha: number) => {
          const g = ctx.createLinearGradient(0, y - 6, 0, y + 6);
          g.addColorStop(0, `rgba(${rgb}, 0)`);
          g.addColorStop(0.5, `rgba(${rgb}, ${alpha})`);
          g.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.fillStyle = g;
          ctx.fillRect(0, y - 6, SCENE_WORLD_WIDTH, 12);
        };
        drawConduitLine(160, '56, 189, 248', 0.35);
        drawConduitLine(240, '14, 165, 233', 0.25);
        drawConduitLine(315, '245, 158, 11', 0.22);

        farTex.refresh();
      }
    }

    this.add.image(SCENE_WORLD_WIDTH / 2, 240, 'tex_far_skyline')
      .setScrollFactor(0.12)
      .setDepth(1);

    // -----------------------------------------------------------------
    // LAYER 1: Midground Curved Tunnel Archways & Soft Lamp Bloom (scrollFactor: 0.45)
    // -----------------------------------------------------------------
    for (let x = 80; x < SCENE_WORLD_WIDTH; x += 280) {
      // Curved industrial arch pillar
      this.add.image(x, 280, 'tex_arch')
        .setScrollFactor(0.45)
        .setDepth(2);

      // Soft additive bloom on the pillar's neon beacon node
      this.add.image(x, 191, 'fx_light_disc_cyan')
        .setScrollFactor(0.45)
        .setDepth(3)
        .setScale(0.42)
        .setAlpha(0.55)
        .setBlendMode(Phaser.BlendModes.ADD);

      // Horizontal ceiling conduit beam
      this.add.rectangle(x + 140, 56, 280, 10, 0x0b1322)
        .setScrollFactor(0.45)
        .setDepth(2);

      // Ceiling floodlight fixture + soft radial bloom
      this.add.image(x + 140, 62, 'fx_light_disc_cyan')
        .setScrollFactor(0.45)
        .setDepth(3)
        .setScale(0.65, 0.35)
        .setAlpha(0.45)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    // Overhead station signage: "AETHER CENTRAL TRANSIT // STATION 7"
    this.add.text(480, 90, 'AETHER TRANSIT // LINE 4 // SUB-LEVEL 3', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '13px',
      color: '#38bdf8',
      letterSpacing: 2
    }).setScrollFactor(0.5).setDepth(3).setAlpha(0.7);

    this.add.text(1600, 90, 'STATION 7 // SECTOR B PASSAGE', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '13px',
      color: '#f59e0b',
      letterSpacing: 2
    }).setScrollFactor(0.5).setDepth(3).setAlpha(0.7);
  }

  private createStationPlatform(): void {
    this.platforms = this.physics.add.staticGroup();

    // Lower railway track bed
    const trackPitY = GROUND_Y + 70;
    this.add.rectangle(SCENE_WORLD_WIDTH / 2, trackPitY, SCENE_WORLD_WIDTH, 60, 0x030712).setDepth(4);

    // Parallel metal rails
    this.add.rectangle(SCENE_WORLD_WIDTH / 2, trackPitY - 14, SCENE_WORLD_WIDTH, 4, 0x475569).setDepth(5);
    this.add.rectangle(SCENE_WORLD_WIDTH / 2, trackPitY + 14, SCENE_WORLD_WIDTH, 4, 0x475569).setDepth(5);

    // Rail cross-ties (sleepers)
    for (let x = 20; x < SCENE_WORLD_WIDTH; x += 40) {
      this.add.rectangle(x, trackPitY, 14, 42, 0x1e293b).setDepth(4);
    }

    // Concrete Platform Surface (Static Collider)
    const platformBody = this.add.rectangle(SCENE_WORLD_WIDTH / 2, GROUND_Y + 80, SCENE_WORLD_WIDTH, 160, 0x0f172a);
    this.physics.add.existing(platformBody, true);
    this.platforms.add(platformBody);

    // Platform Slice Graphic with Rounded Hazard Warning Stripes & Specular Sheen
    for (let x = 60; x < SCENE_WORLD_WIDTH; x += 120) {
      this.add.image(x, GROUND_Y + 80, 'tex_platform_slice').setDepth(8);
    }
  }

  private setupStationProps(): void {
    this.interactiveTargets = INITIAL_STATION_TARGETS.map(t => ({ ...t }));

    // Helper for adding a pulsing Soft Radial Light Disc with BlendModes.ADD
    const addSoftLightDisc = (
      x: number,
      y: number,
      textureKey: 'fx_light_disc_cyan' | 'fx_light_disc_amber' | 'fx_light_disc_emerald',
      scaleX: number,
      scaleY: number,
      minAlpha: number,
      maxAlpha: number,
      duration: number,
      depth = 16
    ) => {
      const disc = this.add.image(x, y, textureKey)
        .setDepth(depth)
        .setScale(scaleX, scaleY)
        .setAlpha(minAlpha)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: disc,
        alpha: maxAlpha,
        scaleX: scaleX * 1.12,
        scaleY: scaleY * 1.12,
        duration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      return disc;
    };

    // -----------------------------------------------------------------
    // SPOT 1: Emergency Field Radio (x: 280)
    // -----------------------------------------------------------------
    this.add.image(280, 260, 'tex_light_cone')
      .setDepth(6)
      .setAlpha(0.75)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Overhead ceiling fixture bloom
    addSoftLightDisc(280, 42, 'fx_light_disc_cyan', 0.9, 0.45, 0.45, 0.7, 2200, 7);

    // Radio Sprite
    this.add.sprite(280, GROUND_Y - 19, 'prop_radio_detailed').setDepth(15);

    // Soft Cyan OLED screen glow & Warm Amber ground reflection pool
    addSoftLightDisc(280, GROUND_Y - 20, 'fx_light_disc_cyan', 0.45, 0.45, 0.35, 0.65, 1400, 16);
    addSoftLightDisc(280, GROUND_Y + 4, 'fx_light_disc_amber', 0.75, 0.22, 0.25, 0.5, 1600, 9);

    // -----------------------------------------------------------------
    // SPOT 2: Sector B Navigation Signpost (x: 820)
    // -----------------------------------------------------------------
    this.add.image(820, 260, 'tex_light_cone')
      .setDepth(6)
      .setAlpha(0.6)
      .setBlendMode(Phaser.BlendModes.ADD);

    addSoftLightDisc(820, 42, 'fx_light_disc_cyan', 0.85, 0.4, 0.4, 0.65, 2400, 7);

    this.add.sprite(820, GROUND_Y - 48, 'prop_signpost_detailed').setDepth(15);

    // Holographic Signboard Soft Cyan Bloom & Ground Specular Reflection
    addSoftLightDisc(820, GROUND_Y - 76, 'fx_light_disc_cyan', 0.85, 0.55, 0.4, 0.7, 1900, 16);
    addSoftLightDisc(820, GROUND_Y + 4, 'fx_light_disc_cyan', 0.8, 0.2, 0.2, 0.4, 1900, 9);

    // -----------------------------------------------------------------
    // SPOT 3: Core Reactor (`tex_generator`) & Auxiliary Substation Terminal (x: 1310 & 1420)
    // -----------------------------------------------------------------
    // Cylindrical Glass Core Reactor supplying Substation power
    this.add.sprite(1310, GROUND_Y - 86, 'tex_generator').setDepth(13);
    addSoftLightDisc(1310, GROUND_Y - 92, 'fx_light_disc_cyan', 0.95, 1.15, 0.45, 0.8, 1800, 14);
    addSoftLightDisc(1310, GROUND_Y - 74, 'fx_light_disc_amber', 0.75, 0.85, 0.35, 0.65, 1350, 14);
    addSoftLightDisc(1310, GROUND_Y + 5, 'fx_light_disc_cyan', 0.95, 0.25, 0.25, 0.48, 1800, 9);

    // Mainframe Substation Console
    this.add.image(1420, 260, 'tex_light_cone')
      .setDepth(6)
      .setAlpha(0.75)
      .setBlendMode(Phaser.BlendModes.ADD);

    addSoftLightDisc(1420, 42, 'fx_light_disc_cyan', 0.9, 0.45, 0.45, 0.7, 2100, 7);

    this.add.sprite(1420, GROUND_Y - 42, 'prop_terminal_detailed').setDepth(15);

    // Soft Emerald-Cyan Console Display Bloom & Ground Specular Pool
    addSoftLightDisc(1420, GROUND_Y - 56, 'fx_light_disc_emerald', 0.75, 0.65, 0.4, 0.75, 1250, 16);
    addSoftLightDisc(1420, GROUND_Y + 4, 'fx_light_disc_emerald', 0.85, 0.22, 0.22, 0.45, 1250, 9);

    // -----------------------------------------------------------------
    // SPOT 4: Heavy Sector B Blast Gate / Airlock Vault Door (x: 2200)
    // -----------------------------------------------------------------
    this.add.image(2200, 260, 'tex_light_cone')
      .setDepth(6)
      .setAlpha(0.85)
      .setTint(0xfbbf24)
      .setBlendMode(Phaser.BlendModes.ADD);

    addSoftLightDisc(2200, 42, 'fx_light_disc_amber', 1.1, 0.5, 0.5, 0.8, 2000, 7);

    this.add.sprite(2200, GROUND_Y - 118, 'prop_gate_detailed').setDepth(14);

    // Vault Door Biometric Lock Bloom & Heavy Amber Floor Reflection
    addSoftLightDisc(2200, GROUND_Y - 120, 'fx_light_disc_amber', 0.85, 0.85, 0.4, 0.75, 1100, 16);
    addSoftLightDisc(2200, GROUND_Y - 210, 'fx_light_disc_cyan', 0.75, 0.35, 0.45, 0.75, 1700, 16);
    addSoftLightDisc(2200, GROUND_Y + 6, 'fx_light_disc_amber', 1.3, 0.28, 0.3, 0.58, 1500, 9);
  }

  private createVolumetricMist(): void {
    // 1. Soft Ambient Motes (Blurred 2–6px luminescent circles drifting on gentle wind currents)
    this.moteParticles = this.add.particles(0, 0, 'fx_ambient_mote', {
      x: { min: 0, max: SCENE_WORLD_WIDTH },
      y: { min: 70, max: GROUND_Y + 10 },
      speedX: { min: 6, max: 18 },
      speedY: { min: -9, max: 3 },
      accelerationX: 1.5,
      scale: { min: 0.14, max: 0.42 }, // ~2.2px to 6.7px soft blurred circles
      alpha: { start: 0.65, end: 0 },
      lifespan: { min: 5500, max: 9500 },
      frequency: 140,
      maxParticles: 75,
      blendMode: Phaser.BlendModes.ADD
    });
    this.moteParticles.setDepth(21);

    // 2. Low-lying Volumetric Mist across platform & rails
    this.mistParticles = this.add.particles(0, GROUND_Y + 8, 'fx_mist_particle', {
      x: { min: 0, max: SCENE_WORLD_WIDTH },
      y: { min: GROUND_Y - 24, max: GROUND_Y + 36 },
      speedX: { min: 8, max: 22 },
      speedY: { min: -2, max: 2 },
      scale: { start: 1.3, end: 2.8 },
      alpha: { start: 0.22, end: 0 },
      lifespan: 6500,
      frequency: 260,
      maxParticles: 45,
      blendMode: Phaser.BlendModes.ADD
    });
    this.mistParticles.setDepth(22);
  }

  private createFloatingReticleHUD(): void {
    this.reticleContainer = this.add.container(0, 0);
    this.reticleContainer.setDepth(150);
    this.reticleContainer.setVisible(false);

    // Soft additive aura behind holographic reticle
    const reticleGlow = this.add.image(0, 0, 'fx_light_disc_cyan')
      .setScale(0.38)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Counter-rotating Outer Holographic Ring
    this.reticleOuterSprite = this.add.sprite(0, 0, 'fx_reticle')
      .setScale(1.22)
      .setAlpha(0.45)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: this.reticleOuterSprite,
      angle: -360,
      duration: 11000,
      repeat: -1,
      ease: 'Linear'
    });

    // Primary Rotating Holographic Ring Sprite
    this.reticleSprite = this.add.sprite(0, 0, 'fx_reticle')
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: this.reticleSprite,
      angle: 360,
      duration: 7000,
      repeat: -1,
      ease: 'Linear'
    });

    // Smooth vertical hover tween on the whole reticle group
    this.tweens.add({
      targets: [this.reticleSprite, this.reticleOuterSprite, reticleGlow],
      y: -7,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Rounded Glassmorphic Capsule Frame for Prompt Text
    this.promptPillGraphics = this.add.graphics();

    // Prompt Text
    this.promptText = this.add.text(0, -38, '', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      color: '#f8fafc',
      fontStyle: '600',
      letterSpacing: 0.5
    }).setOrigin(0.5);

    this.reticleContainer.add([
      reticleGlow,
      this.reticleOuterSprite,
      this.reticleSprite,
      this.promptPillGraphics,
      this.promptText
    ]);
  }

  private drawRoundedPromptPill(width: number, height: number = 32): void {
    const g = this.promptPillGraphics;
    g.clear();
    const x = -width / 2;
    const y = -38 - height / 2;
    const radius = 16;

    // Deep translucent slate capsule fill
    g.fillStyle(0x060b16, 0.86);
    g.fillRoundedRect(x, y, width, height, radius);

    // Subtle glowing cyan holographic border
    g.lineStyle(1.2, 0x38bdf8, 0.55);
    g.strokeRoundedRect(x, y, width, height, radius);
  }

  update(time: number): void {
    if (!this.player || !this.inputManager) return;

    const input = this.inputManager.getState();
    const speed = 250;

    // Movement & Animation FSM
    if (input.left) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
      if (this.player.anims.currentAnim?.key !== 'anim_investigator_walk') {
        this.player.play('anim_investigator_walk');
      }
      this.triggerFootstepAudio(time);
    } else if (input.right) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
      if (this.player.anims.currentAnim?.key !== 'anim_investigator_walk') {
        this.player.play('anim_investigator_walk');
      }
      this.triggerFootstepAudio(time);
    } else {
      this.player.setVelocityX(0);
      if (this.player.anims.currentAnim?.key !== 'anim_investigator_idle') {
        this.player.play('anim_investigator_idle');
      }
    }

    // Check interaction targets
    this.checkInteractions(input.interact);

    // Periodic Checkpoint Coordinate Auto-Save (every 3 seconds)
    if (time - this.lastAutoSaveTime > 3000) {
      this.lastAutoSaveTime = time;
      const current = saveManager.load();
      if (Math.abs((current.checkpoint.playerX || 0) - this.player.x) > 30) {
        current.checkpoint.playerX = Math.round(this.player.x);
        current.checkpoint.playerY = Math.round(this.player.y);
        current.checkpoint.facing = this.player.flipX ? 'left' : 'right';
        saveManager.save(current);
      }
    }
  }

  private triggerFootstepAudio(currentTime: number): void {
    if (currentTime - this.lastFootstepTime >= this.footstepIntervalMs) {
      this.lastFootstepTime = currentTime;
      audioManager.playSynthesizedSFX('footstep');
    }
  }

  private checkInteractions(interactTriggered: boolean): void {
    let closestTarget: InteractionTarget | null = null;
    let closestDist = Infinity;

    for (const target of this.interactiveTargets) {
      if (!target.active) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
      if (dist <= target.radius && dist < closestDist) {
        closestDist = dist;
        closestTarget = target;
      }
    }

    this.activeTarget = closestTarget;

    if (closestTarget) {
      this.reticleContainer.setVisible(true);
      this.reticleContainer.setPosition(closestTarget.x, closestTarget.y - 45);
      const formattedPrompt = `✦ ${closestTarget.prompt} ✦`;
      if (this.promptText.text !== formattedPrompt) {
        this.promptText.setText(formattedPrompt);
        this.drawRoundedPromptPill(this.promptText.width + 36, 32);
      }

      if (interactTriggered) {
        this.triggerInteraction(closestTarget);
      }
    } else {
      this.reticleContainer.setVisible(false);
    }
  }

  private triggerInteraction(target: InteractionTarget): void {
    audioManager.playSynthesizedSFX('blip');

    // Dispatch global interaction event for UI overlay handlers
    const event = new CustomEvent('game:interaction', {
      detail: { target }
    });
    window.dispatchEvent(event);
  }

  public getInputManager(): InputManager {
    return this.inputManager;
  }

  public getPlayer(): Phaser.Physics.Arcade.Sprite {
    return this.player;
  }

  public getActiveTarget(): InteractionTarget | null {
    return this.activeTarget;
  }

  public getInteractiveTargets(): InteractionTarget[] {
    return this.interactiveTargets;
  }

  private handleResize(): void {
    this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height);
  }
}
