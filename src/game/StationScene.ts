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

export class StationScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private inputManager!: InputManager;
  private interactiveTargets: InteractionTarget[] = [];
  private activeTarget: InteractionTarget | null = null;

  // Floating Reticle & Prompt Container
  private reticleContainer!: Phaser.GameObjects.Container;
  private reticleSprite!: Phaser.GameObjects.Sprite;
  private promptText!: Phaser.GameObjects.Text;
  private promptBg!: Phaser.GameObjects.Rectangle;

  // Audio rhythm timing
  private lastFootstepTime: number = 0;
  private footstepIntervalMs: number = 300;

  // Ambient particles
  private mistParticles?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super(SceneKey.Station);
  }

  create(): void {
    const saveState = saveManager.load();

    // 1. World Bounds & Physics Setup
    this.physics.world.setBounds(0, 0, SCENE_WORLD_WIDTH, SCENE_WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, SCENE_WORLD_WIDTH, SCENE_WORLD_HEIGHT);

    // 2. Parallax Backdrop Layers
    this.createParallaxAtmosphere();

    // 3. Ground Platform & Rail Pit
    this.createStationPlatform();

    // 4. Props & Interactive Targets
    this.setupStationProps();

    // 5. Volumetric Particle Mist
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
    this.physics.add.collider(this.player, this.platforms);

    this.player.play('anim_investigator_idle');

    // Smooth cinematic camera follow with horizontal damping
    this.cameras.main.startFollow(this.player, true, 0.06, 0.06);
    this.cameras.main.setDeadzone(100, 50);

    // 7. Input Manager
    this.inputManager = new InputManager(this);

    // 8. Interaction Reticle HUD
    this.createFloatingReticleHUD();

    // Listen for resize
    this.scale.on('resize', this.handleResize, this);
  }

  private createParallaxAtmosphere(): void {
    // -----------------------------------------------------------------
    // LAYER 0: Distant Cavern Sky / Tunnel Wall (scrollFactor: 0.1)
    // -----------------------------------------------------------------
    this.add.rectangle(
      SCENE_WORLD_WIDTH / 2,
      SCENE_WORLD_HEIGHT / 2,
      SCENE_WORLD_WIDTH,
      SCENE_WORLD_HEIGHT,
      0x05090f
    ).setScrollFactor(0.1).setDepth(0);

    // Distant glowing conduits & city skyline silhouette
    const farG = this.make.graphics({ x: 0, y: 0 });
    farG.fillStyle(0x0a131f, 1);
    for (let x = 0; x < SCENE_WORLD_WIDTH; x += 120) {
      const h = 200 + ((x * 37) % 220);
      farG.fillRect(x, 480 - h, 90, h);
    }
    // Neon conduits
    farG.fillStyle(0x0369a1, 0.4);
    farG.fillRect(0, 160, SCENE_WORLD_WIDTH, 3);
    farG.fillRect(0, 240, SCENE_WORLD_WIDTH, 2);
    farG.fillStyle(0xd97706, 0.3);
    farG.fillRect(0, 310, SCENE_WORLD_WIDTH, 2);
    farG.generateTexture('tex_far_skyline', SCENE_WORLD_WIDTH, 480);
    farG.destroy();

    this.add.image(SCENE_WORLD_WIDTH / 2, 240, 'tex_far_skyline')
      .setScrollFactor(0.12)
      .setDepth(1);

    // -----------------------------------------------------------------
    // LAYER 1: Midground Tunnel Archways & Pillars (scrollFactor: 0.45)
    // -----------------------------------------------------------------
    for (let x = 80; x < SCENE_WORLD_WIDTH; x += 280) {
      // Steel arch pillar
      this.add.image(x, 280, 'tex_arch')
        .setScrollFactor(0.45)
        .setDepth(2);

      // Horizontal ceiling cable tray
      this.add.rectangle(x + 140, 60, 280, 8, 0x0f172a)
        .setScrollFactor(0.45)
        .setDepth(2);
    }

    // Overhead station signage: "AETHER CENTRAL TRANSIT // STATION 7"
    this.add.text(480, 90, 'AETHER TRANSIT // LINE 4 // SUB-LEVEL 3', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '13px',
      color: '#38bdf8',
      letterSpacing: 2
    }).setScrollFactor(0.5).setDepth(3).setAlpha(0.65);

    this.add.text(1600, 90, 'STATION 7 // SECTOR B PASSAGE', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '13px',
      color: '#f59e0b',
      letterSpacing: 2
    }).setScrollFactor(0.5).setDepth(3).setAlpha(0.65);
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

    // Platform Slice Graphic with Hazard Warning Stripes
    for (let x = 60; x < SCENE_WORLD_WIDTH; x += 120) {
      this.add.image(x, GROUND_Y + 80, 'tex_platform_slice').setDepth(8);
    }
  }

  private setupStationProps(): void {
    this.interactiveTargets = INITIAL_STATION_TARGETS.map(t => ({ ...t }));

    // -----------------------------------------------------------------
    // SPOT 1: Emergency Field Radio (x: 280)
    // -----------------------------------------------------------------
    // Overhead light cone
    this.add.image(280, 260, 'tex_light_cone').setDepth(6).setAlpha(0.65);

    // Radio Sprite
    this.add.sprite(280, GROUND_Y - 18, 'prop_radio_detailed').setDepth(15);

    // Soft amber ground pool light
    const radioGlow = this.add.circle(280, GROUND_Y, 32, 0xf59e0b, 0.15).setDepth(9);
    this.tweens.add({
      targets: radioGlow,
      alpha: 0.35,
      scaleX: 1.2,
      duration: 1600,
      yoyo: true,
      repeat: -1
    });

    // -----------------------------------------------------------------
    // SPOT 2: Sector B Navigation Signpost (x: 820)
    // -----------------------------------------------------------------
    this.add.image(820, 260, 'tex_light_cone').setDepth(6).setAlpha(0.5);
    this.add.sprite(820, GROUND_Y - 48, 'prop_signpost_detailed').setDepth(15);

    // -----------------------------------------------------------------
    // SPOT 3: Auxiliary Substation Terminal (x: 1420)
    // -----------------------------------------------------------------
    this.add.image(1420, 260, 'tex_light_cone').setDepth(6).setAlpha(0.7);
    this.add.sprite(1420, GROUND_Y - 40, 'prop_terminal_detailed').setDepth(15);

    // Green terminal screen glow
    const terminalGlow = this.add.circle(1420, GROUND_Y - 30, 48, 0x10b981, 0.12).setDepth(9);
    this.tweens.add({
      targets: terminalGlow,
      alpha: 0.28,
      duration: 1200,
      yoyo: true,
      repeat: -1
    });

    // -----------------------------------------------------------------
    // SPOT 4: Heavy Sector B Blast Gate (x: 2200)
    // -----------------------------------------------------------------
    // Powerful amber floodlight beam
    this.add.image(2200, 260, 'tex_light_cone').setDepth(6).setAlpha(0.8).setTint(0xfbbf24);
    this.add.sprite(2200, GROUND_Y - 120, 'prop_gate_detailed').setDepth(14);
  }

  private createVolumetricMist(): void {
    // Drifting floor mist across the tracks and platform
    this.mistParticles = this.add.particles(0, GROUND_Y + 10, 'fx_mist_particle', {
      x: { min: 0, max: SCENE_WORLD_WIDTH },
      y: { min: GROUND_Y - 20, max: GROUND_Y + 40 },
      speedX: { min: 8, max: 24 },
      speedY: { min: -2, max: 2 },
      scale: { start: 1.2, end: 2.5 },
      alpha: { start: 0.25, end: 0 },
      lifespan: 6000,
      frequency: 250,
      maxParticles: 45
    });
    this.mistParticles.setDepth(22);
  }

  private createFloatingReticleHUD(): void {
    this.reticleContainer = this.add.container(0, 0);
    this.reticleContainer.setDepth(150);
    this.reticleContainer.setVisible(false);

    // Glowing Reticle Diamond Sprite
    this.reticleSprite = this.add.sprite(0, 0, 'fx_reticle');

    // Smooth hover tween on the reticle
    this.tweens.add({
      targets: this.reticleSprite,
      y: -8,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Background pill frame
    this.promptBg = this.add.rectangle(0, -32, 240, 32, 0x090d16, 0.92);
    this.promptBg.setStrokeStyle(1.5, 0x38bdf8, 0.9);

    // Prompt Text
    this.promptText = this.add.text(0, -32, '', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      color: '#f8fafc',
      fontStyle: '600'
    }).setOrigin(0.5);

    this.reticleContainer.add([this.reticleSprite, this.promptBg, this.promptText]);
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
      this.promptText.setText(closestTarget.prompt);
      this.promptBg.width = this.promptText.width + 36;

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
