import { World } from './world';
import { SpatialHash } from './spatial-hash';
import { COLLISION_RADIUS_MULT, PACK_MEMBER_COLLISION_SOFTEN, PACK_MEMBER_BOUNCE_DAMP } from '../constants';
import { isBondedHerdPair, isIntentionalContactPair, notePackMemberCollision } from './creature';

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
  return world.blobWeaponLatchedTarget[a] === b || world.blobWeaponLatchedTarget[b] === a;
}

export function resolveCollisions(world: World, spatialHash: SpatialHash) {
  const { blobX, blobY, blobRadius, blobAlive, blobCreature, blobMass, activeBlobIds } = world;
  const cMult = COLLISION_RADIUS_MULT;
  world.perfCollisionPairsTested = 0;
  world.perfCollisionPairsResolved = 0;

  for (let si = 0; si < world.blobCount; si++) {
    const i = activeBlobIds[si];
    const xi = blobX[i];
    const yi = blobY[i];
    const ri = blobRadius[i] * cMult;
    const ci = blobCreature[i];

    spatialHash.query(xi, yi, ri * 2, (j) => {
      world.perfCollisionPairsTested++;
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

      if (dist < minDist) {
        world.perfCollisionPairsResolved++;
        // Prevent "pass-through" when two blobs land at the same position.
        // Fall back to a deterministic pseudo-normal instead of skipping resolution.
        const eps = 1e-6;
        const distSafe = Math.max(dist, eps);
        let nx = dx / distSafe;
        let ny = dy / distSafe;
        if (dist <= eps) {
          const angle = ((i * 73856093) ^ (j * 19349663)) * 0.000001;
          nx = Math.cos(angle);
          ny = Math.sin(angle);
        }

        const baseOverlap = (minDist - distSafe) * 0.5;
        const bonded = isBondedHerdPair(world, ci, blobCreature[j]);
        const intentional = !bonded && isIntentionalContactPair(world, ci, blobCreature[j]);

        let overlapScale = 1.0;
        let bounceDamp = 1.0;

        if (intentional) {
          overlapScale = 0.4;
          bounceDamp = 0.65;
        }
        if (bonded) {
          overlapScale = PACK_MEMBER_COLLISION_SOFTEN;
          bounceDamp = PACK_MEMBER_BOUNCE_DAMP;
          notePackMemberCollision(world, ci, blobCreature[j]);
        }

        // Keep some minimum pushback even for softened contacts.
        const overlap = Math.max(baseOverlap * overlapScale, baseOverlap * 0.16);

        const totalMass = blobMass[i] + blobMass[j];
        const ratioI = blobMass[j] / totalMass;
        const ratioJ = blobMass[i] / totalMass;

        blobX[i] -= nx * overlap * ratioI * bounceDamp;
        blobY[i] -= ny * overlap * ratioI * bounceDamp;
        blobX[j] += nx * overlap * ratioJ * bounceDamp;
        blobY[j] += ny * overlap * ratioJ * bounceDamp;
      }
    });
  }
}
