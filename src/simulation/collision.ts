import { World } from './world';
import { SpatialHash } from './spatial-hash';
import { MAX_BLOBS, COLLISION_RADIUS_MULT } from '../constants';

/**
 * Circle-circle narrow-phase collision response between blobs
 * of different creatures (intra-creature handled by constraints).
 *
 * Uses COLLISION_RADIUS_MULT to extend the effective collision radius
 * so creatures visually bounce off each other (render radius is larger
 * than physics radius for metaball effect).
 */
/** Check if blob pair (a, b) is involved in an active latch (order-independent). */
function isLatchedPair(world: World, a: number, b: number): boolean {
  for (let li = 0; li < world.latchCount; li++) {
    const w = world.latchWeaponBlob[li];
    const t = world.latchTargetBlob[li];
    if ((w === a && t === b) || (w === b && t === a)) return true;
  }
  return false;
}

export function resolveCollisions(world: World, spatialHash: SpatialHash) {
  const { blobX, blobY, blobRadius, blobAlive, blobCreature, blobMass } = world;
  const cMult = COLLISION_RADIUS_MULT;

  for (let i = 0; i < MAX_BLOBS; i++) {
    if (!blobAlive[i]) continue;
    const xi = blobX[i];
    const yi = blobY[i];
    const ri = blobRadius[i] * cMult;
    const ci = blobCreature[i];

    spatialHash.query(xi, yi, ri * 2, (j) => {
      if (j <= i) return;
      if (!blobAlive[j]) return;
      if (blobCreature[j] === ci) return;

      // Skip separation for latched weapon-target pairs
      if (world.latchCount > 0 && isLatchedPair(world, i, j)) return;

      const rj = blobRadius[j] * cMult;
      const dx = blobX[j] - xi;
      const dy = blobY[j] - yi;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = ri + rj;

      if (dist < minDist && dist > 0.001) {
        const overlap = (minDist - dist) * 0.5;
        const nx = dx / dist;
        const ny = dy / dist;

        const totalMass = blobMass[i] + blobMass[j];
        const ratioI = blobMass[j] / totalMass;
        const ratioJ = blobMass[i] / totalMass;

        blobX[i] -= nx * overlap * ratioI;
        blobY[i] -= ny * overlap * ratioI;
        blobX[j] += nx * overlap * ratioJ;
        blobY[j] += ny * overlap * ratioJ;
      }
    });
  }
}
