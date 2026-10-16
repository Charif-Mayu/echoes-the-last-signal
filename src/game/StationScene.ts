import Phaser from 'phaser';
import { SceneKey, InteractionTarget } from '../types/game';
import { InputManager } from '../engine/InputManager';
import { saveManager } from '../persistence/SaveManager';
import { audioManager } from '../engine/AudioManager';

export const SCENE_WORLD_WIDTH = 2400;
export const SCENE_WORLD_HEIGHT = 720;
export const GROUND_Y = 560;

export class StationScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private inputManager!: InputManager;
  private interactiveTargets: InteractionTarget[] = [];
  private activeTarget: InteractionTarget | null = null;
  private promptText!: Phaser.GameObjects.Text;
  private promptBg!: Phaser.GameObjects.Rectangle;
  private promptContainer!: Phaser.GameObjects.Container;

  constructor() {
    super(SceneKey.Station);
  }

  create(): void {
    const saveState = saveManager.load();

    // 1. World Bounds & Camera
    this.physics.world.setBounds(0, 0, SCENE_WORLD_WIDTH, SCENE_WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, SCENE_WORLD_WIDTH, SCENE_WORLD_HEIGHT);

    // 2. Parallax Backdrop Layers
    this.createAtmosphericLayers();

    // 3. Ground & Platforms
    this.platforms = this.physics.add.staticGroup();
    const ground = this.add.rectangle(SCENE_WORLD_WIDTH / 2, GROUND_Y + 80, SCENE_WORLD_WIDTH, 160, 0x0f172a);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    // Platform edge indicator line
    const edgeLine = this.add.rectangle(SCENE_WORLD_WIDTH / 2, GROUND_Y, SCENE_WORLD_WIDTH, 4, 0xf59e0b);
    edgeLine.setDepth(2);

    // 4. Props & Interactive Targets
    this.setupStationProps();

    // 5. Player Setup
    const spawnX = saveState.checkpoint.playerX || 200;
    const spawnY = saveState.checkpoint.playerY || (GROUND_Y - 40);

    this.player = this.physics.add.sprite(spawnX, spawnY, 'investigator_idle');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0);
    this.player.setDepth(10);
    this.physics.add.collider(this.player, this.platforms);

    // Camera follow
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // 6. Input Manager
    this.inputManager = new InputManager(this);

    // 7. Interaction Prompt HUD element
    this.createInteractionPromptHUD();

    // Listen for window resize
    this.scale.on('resize', this.handleResize, this);
  }

  private createAtmosphericLayers(): void {
    // Distant background wall
    this.add.rectangle(SCENE_WORLD_WIDTH / 2, SCENE_WORLD_HEIGHT / 2, SCENE_WORLD_WIDTH, SCENE_WORLD_HEIGHT, 0x070b10)
      .setScrollFactor(0.2)
      .setDepth(0);

    // Distant tunnel ceiling cables and arches
    for (let x = 100; x < SCENE_WORLD_WIDTH; x += 300) {
      // Station pillars
      this.add.rectangle(x, 260, 28, 520, 0x131f2e)
        .setScrollFactor(0.6)
        .setDepth(1);
      
      // Faint blue accent lights on pillars
      this.add.circle(x, 180, 5, 0x0284c7, 0.4)
        .setScrollFactor(0.6)
        .setDepth(1);
    }

    // Lower railway track pit
    this.add.rectangle(SCENE_WORLD_WIDTH / 2, GROUND_Y + 70, SCENE_WORLD_WIDTH, 40, 0x030712)
      .setDepth(1);
  }

  private setupStationProps(): void {
    // 1. Damaged Emergency Radio
    this.add.sprite(280, GROUND_Y - 12, 'prop_radio').setDepth(5);
    this.interactiveTargets.push({
      id: 'target_radio',
      name: 'Emergency Radio',
      prompt: '[E] Inspect Emergency Radio',
      x: 280,
      y: GROUND_Y - 20,
      radius: 60,
      type: 'radio',
      active: true
    });

    // 2. Navigation Signpost
    this.add.sprite(750, GROUND_Y - 40, 'prop_signpost').setDepth(5);
    this.interactiveTargets.push({
      id: 'target_signpost',
      name: 'Transit Signpost',
      prompt: '[E] Read Sector B Sign',
      x: 750,
      y: GROUND_Y - 40,
      radius: 70,
      type: 'sign',
      active: true
    });

    // 3. Substation Terminal
    this.add.sprite(1300, GROUND_Y - 32, 'prop_terminal').setDepth(5);
    this.interactiveTargets.push({
      id: 'target_terminal',
      name: 'Auxiliary Terminal',
      prompt: '[E] Access Terminal Diagnostics',
      x: 1300,
      y: GROUND_Y - 40,
      radius: 75,
      type: 'terminal',
      active: true
    });

    // 4. Sector B Heavy Blast Gate
    this.add.rectangle(2100, GROUND_Y - 90, 80, 180, 0x1e293b).setDepth(4);
    this.add.rectangle(2100, GROUND_Y - 90, 60, 160, 0x0f172a).setDepth(4);
    this.interactiveTargets.push({
      id: 'target_gate',
      name: 'Sector B Gate',
      prompt: '[E] Approach Sector B Gate',
      x: 2100,
      y: GROUND_Y - 40,
      radius: 90,
      type: 'door',
      active: true
    });
  }

  private createInteractionPromptHUD(): void {
    this.promptContainer = this.add.container(0, 0);
    this.promptContainer.setDepth(100);
    this.promptContainer.setVisible(false);

    this.promptBg = this.add.rectangle(0, 0, 220, 32, 0x0f172a, 0.9);
    this.promptBg.setStrokeStyle(1, 0x38bdf8, 0.8);

    this.promptText = this.add.text(0, 0, '', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      color: '#f8fafc',
      fontStyle: '500'
    }).setOrigin(0.5);

    this.promptContainer.add([this.promptBg, this.promptText]);
  }

  update(): void {
    if (!this.player || !this.inputManager) return;

    const input = this.inputManager.getState();
    const speed = 240;

    // Horizontal Movement
    if (input.left) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
    } else if (input.right) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    // Check interaction targets
    this.checkInteractions(input.interact);
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
      this.promptContainer.setVisible(true);
      this.promptContainer.setPosition(closestTarget.x, closestTarget.y - 65);
      this.promptText.setText(closestTarget.prompt);
      this.promptBg.width = this.promptText.width + 32;

      if (interactTriggered) {
        this.triggerInteraction(closestTarget);
      }
    } else {
      this.promptContainer.setVisible(false);
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

  private handleResize(): void {
    this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height);
  }
}
