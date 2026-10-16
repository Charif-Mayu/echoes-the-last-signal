import { describe, it, expect } from 'vitest';
import { SCENE_WORLD_WIDTH, GROUND_Y, INITIAL_STATION_TARGETS } from '../src/types/game';

describe('Station 7 Scene Geometry & Proximity Targets', () => {
  const targets = INITIAL_STATION_TARGETS;

  it('ensures scene world width accommodates the full exploration path', () => {
    expect(SCENE_WORLD_WIDTH).toBeGreaterThanOrEqual(2400);
    expect(GROUND_Y).toBe(560);
  });

  it('ensures all interactive targets are located within world bounds', () => {
    targets.forEach((t) => {
      expect(t.x).toBeGreaterThan(0);
      expect(t.x).toBeLessThan(SCENE_WORLD_WIDTH);
      expect(t.radius).toBeGreaterThanOrEqual(50);
    });
  });

  it('verifies interaction zones do NOT overlap to avoid conflicting trigger states', () => {
    for (let i = 0; i < targets.length - 1; i++) {
      const current = targets[i];
      const next = targets[i + 1];

      const distance = Math.abs(next.x - current.x);
      const combinedRadii = current.radius + next.radius;

      expect(
        distance,
        `Distance between ${current.name} and ${next.name} (${distance}px) must exceed sum of their interaction radii (${combinedRadii}px)`
      ).toBeGreaterThan(combinedRadii);
    }
  });
});
