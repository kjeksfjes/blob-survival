import { World } from './world';
import {
  VERLET_DAMPING, CONSTRAINT_ITERATIONS, CONSTRAINT_STIFFNESS,
  WORLD_SIZE, BOUNDARY_PADDING, MAX_BLOBS, WALL_BOUNCE_DAMPING,
} from '../constants';

/**
 * Verlet integration + constraint solver + boundary enforcement.
 */
export function verletIntegrate(world: World, dt: number) {
  const { blobX, blobY, blobPrevX, blobPrevY, blobAlive, blobMass } = world;
  const damping = VERLET_DAMPING;

  for (let i = 0; i < MAX_BLOBS; i++) {
    if (!blobAlive[i]) continue;

    const vx = (blobX[i] - blobPrevX[i]) * damping;
    const vy = (blobY[i] - blobPrevY[i]) * damping;

    blobPrevX[i] = blobX[i];
    blobPrevY[i] = blobY[i];

    blobX[i] += vx;
    blobY[i] += vy;
  }
}

export function solveConstraints(world: World) {
  const { constraintA, constraintB, constraintDist, constraintCount } = world;
  const { blobX, blobY, blobAlive, blobMass } = world;

  for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
    for (let c = 0; c < constraintCount; c++) {
      const a = constraintA[c];
      const b = constraintB[c];
      if (!blobAlive[a] || !blobAlive[b]) continue;

      const dx = blobX[b] - blobX[a];
      const dy = blobY[b] - blobY[a];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.001) continue;

      const restDist = constraintDist[c];
      const diff = (dist - restDist) / dist;
      const correction = diff * CONSTRAINT_STIFFNESS;

      const totalMass = blobMass[a] + blobMass[b];
      const ratioA = blobMass[b] / totalMass;
      const ratioB = blobMass[a] / totalMass;

      blobX[a] += dx * correction * ratioA;
      blobY[a] += dy * correction * ratioA;
      blobX[b] -= dx * correction * ratioB;
      blobY[b] -= dy * correction * ratioB;
    }
  }
}

export function enforceBoundaries(world: World) {
  const { blobX, blobY, blobPrevX, blobPrevY, blobRadius, blobAlive } = world;
  const min = BOUNDARY_PADDING;
  const max = WORLD_SIZE - BOUNDARY_PADDING;

  for (let i = 0; i < MAX_BLOBS; i++) {
    if (!blobAlive[i]) continue;
    const vx = blobX[i] - blobPrevX[i];
    const vy = blobY[i] - blobPrevY[i];
    const r = blobRadius[i];
    if (blobX[i] - r < min) {
      blobX[i] = min + r;
      blobPrevX[i] = blobX[i] + vx * WALL_BOUNCE_DAMPING;
    } else if (blobX[i] + r > max) {
      blobX[i] = max - r;
      blobPrevX[i] = blobX[i] + vx * WALL_BOUNCE_DAMPING;
    }
    if (blobY[i] - r < min) {
      blobY[i] = min + r;
      blobPrevY[i] = blobY[i] + vy * WALL_BOUNCE_DAMPING;
    } else if (blobY[i] + r > max) {
      blobY[i] = max - r;
      blobPrevY[i] = blobY[i] + vy * WALL_BOUNCE_DAMPING;
    }
  }
}
