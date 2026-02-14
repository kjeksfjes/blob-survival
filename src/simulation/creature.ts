import { World } from './world';
import { SpatialHash } from './spatial-hash';
import { BlobType, Genome } from '../types';
import { randomGenome, mutateGenome } from './genome';
import {
  BASE_BLOB_RADIUS, CORE_RADIUS_MULT, BLOB_MASS_BASE,
  SHIELD_MASS_MULT, FAT_MASS_MULT, STAR_REST_DISTANCE, RING_REST_DISTANCE,
  MOTOR_FORCE, SENSOR_RANGE, BASIC_FOOD_SENSE_RANGE,
  WEAPON_DAMAGE, WEAPON_ENERGY_COST,
  MOUTH_EFFICIENCY, PHOTO_ENERGY_PER_TICK, FAT_ENERGY_BONUS,
  ADHESION_FORCE, ADHESION_RANGE, METABOLISM_COST_PER_BLOB,
  CREATURE_BASE_ENERGY, WORLD_SIZE, FOOD_ENERGY, FOOD_RADIUS,
  REPRODUCE_ENERGY_THRESHOLD, REPRODUCE_COOLDOWN, REPRODUCE_ENERGY_SPLIT,
  MUTATION_RATE, STRUCTURAL_MUTATION_RATE, MAX_BLOBS, MAX_FOOD, CREATURE_CAP,
  FLOCK_RANGE, FLOCK_FORCE, FLOCK_MIN_SIMILARITY, MAX_CREATURES,
  ADHESION_FLOCK_MULT, FLOCK_SENSE_BLEND, KIN_METABOLISM_DISCOUNT,
  PREDATION_STEAL_FRACTION, PREDATION_KIN_THRESHOLD,
  CARRION_DROP_DIVISOR, CARRION_SCATTER_RADIUS,
} from '../constants';
import { BLOB_TYPE_COUNT } from '../types';

export function spawnCreature(
  world: World,
  x: number,
  y: number,
  genome?: Genome,
): number {
  const g = genome ?? randomGenome();
  const ci = world.allocCreature();
  if (ci < 0) return -1;

  const blobCount = g.blobTypes.length;
  const blobIndices: number[] = [];

  for (let i = 0; i < blobCount; i++) {
    const bi = world.allocBlob();
    if (bi < 0) {
      // Rollback
      for (const idx of blobIndices) world.freeBlob(idx);
      world.creatureAlive[ci] = 0;
      world.creatureCount--;
      return -1;
    }

    const type = g.blobTypes[i];
    const angle = g.blobOffsets[i];
    const size = g.blobSizes[i];
    const dist = i === 0 ? 0 : STAR_REST_DISTANCE * size;

    world.blobX[bi] = x + Math.cos(angle) * dist;
    world.blobY[bi] = y + Math.sin(angle) * dist;
    world.blobPrevX[bi] = world.blobX[bi];
    world.blobPrevY[bi] = world.blobY[bi];

    let radius = BASE_BLOB_RADIUS * size;
    let mass = BLOB_MASS_BASE;
    if (type === BlobType.CORE) {
      radius *= CORE_RADIUS_MULT;
      mass *= 1.5;
    } else if (type === BlobType.SHIELD) {
      mass *= SHIELD_MASS_MULT;
    } else if (type === BlobType.FAT) {
      radius *= 1.3;
      mass *= FAT_MASS_MULT;
    }

    world.blobRadius[bi] = radius;
    world.blobType[bi] = type;
    world.blobCreature[bi] = ci;
    world.blobMass[bi] = mass;
    blobIndices.push(bi);
  }

  // Store blob indices in creature's blob list
  const blobStart = ci * 12;
  for (let i = 0; i < blobIndices.length; i++) {
    world.creatureBlobs[blobStart + i] = blobIndices[i];
  }
  world.creatureBlobStart[ci] = blobStart;
  world.creatureBlobCount[ci] = blobCount;
  world.creatureGenome[ci] = g;
  world.creatureHeading[ci] = Math.random() * Math.PI * 2;
  world.creatureAge[ci] = 0;
  // Random initial cooldown so creatures don't all reproduce in sync
  world.creatureReproCooldown[ci] = Math.floor(Math.random() * REPRODUCE_COOLDOWN);

  // Calculate max energy
  let fatCount = 0;
  for (const t of g.blobTypes) {
    if (t === BlobType.FAT) fatCount++;
  }
  world.creatureMaxEnergy[ci] = g.maxEnergy + fatCount * FAT_ENERGY_BONUS;
  world.creatureEnergy[ci] = CREATURE_BASE_ENERGY;

  // Build constraints: star (all to core) + ring (adjacent)
  buildConstraints(world, ci, blobIndices);

  world.totalBirths++;
  return ci;
}

function buildConstraints(world: World, ci: number, blobIndices: number[]) {
  const n = blobIndices.length;
  if (n < 2) return;

  const coreIdx = blobIndices[0];

  for (let i = 1; i < n; i++) {
    // Star: connect to core
    addConstraint(world, coreIdx, blobIndices[i], STAR_REST_DISTANCE);

    // Ring: connect adjacent non-core blobs
    if (i > 1) {
      addConstraint(world, blobIndices[i - 1], blobIndices[i], RING_REST_DISTANCE);
    }
  }
  // Close the ring
  if (n > 2) {
    addConstraint(world, blobIndices[n - 1], blobIndices[1], RING_REST_DISTANCE);
  }
}

function addConstraint(world: World, a: number, b: number, dist: number) {
  const c = world.constraintCount;
  world.constraintA[c] = a;
  world.constraintB[c] = b;
  world.constraintDist[c] = dist;
  world.constraintCount++;
}

export function updateCreatureLocomotion(world: World, motorForce = MOTOR_FORCE) {
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;

    const genome = world.creatureGenome[ci]!;
    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    const heading = world.creatureHeading[ci];

    // Count motors and compute force
    let motorCount = 0;
    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] === BlobType.MOTOR) motorCount++;
    }

    if (motorCount === 0) continue;

    // Apply force to core blob in heading direction
    const force = motorForce * Math.sqrt(motorCount) / Math.sqrt(count); // diminishing returns, heavier creatures slower
    const coreIdx = world.creatureBlobs[start]; // first blob is core
    const fx = Math.cos(heading) * force;
    const fy = Math.sin(heading) * force;

    world.blobX[coreIdx] += fx;
    world.blobY[coreIdx] += fy;

    // Slow random heading drift
    world.creatureHeading[ci] += (Math.random() - 0.5) * genome.turnRate * 0.1;
  }
}

// Per-creature sensed food target — written by updateSensors, read by updateFlocking
const _sensedFoodX = new Float32Array(MAX_CREATURES);
const _sensedFoodY = new Float32Array(MAX_CREATURES);
const _hasSensedFood = new Uint8Array(MAX_CREATURES);

// Per-creature weapon flag — precomputed each tick by updateSensors
const _hasWeapon = new Uint8Array(MAX_CREATURES);

// Per-creature kin score — written by updateFlocking, read by updateMetabolism
export const _kinScore = new Float32Array(MAX_CREATURES);

export function updateSensors(world: World, kinThreshold = PREDATION_KIN_THRESHOLD) {
  // Precompute which creatures have weapons (for threat detection)
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    _hasWeapon[ci] = 0;
    if (!world.creatureAlive[ci]) continue;
    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    for (let i = 0; i < count; i++) {
      if (world.blobType[world.creatureBlobs[start + i]] === BlobType.WEAPON) {
        _hasWeapon[ci] = 1;
        break;
      }
    }
  }

  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;

    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    const genome = world.creatureGenome[ci]!;

    // Use core position as reference
    const coreIdx = world.creatureBlobs[start];
    const cx = world.blobX[coreIdx];
    const cy = world.blobY[coreIdx];

    // Check if creature has a sensor blob (extends range)
    let hasSensor = false;
    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] === BlobType.SENSOR) {
        hasSensor = true;
        break;
      }
    }

    // Sense range (used for both food and threats)
    const range = hasSensor ? SENSOR_RANGE : BASIC_FOOD_SENSE_RANGE;
    const range2 = range * range;

    // --- Food detection ---
    let nearestFoodDist2 = range2;
    let nearestX = 0, nearestY = 0;
    let found = false;

    for (let fi = 0; fi < MAX_FOOD; fi++) {
      if (!world.foodAlive[fi]) continue;
      const dx = world.foodX[fi] - cx;
      const dy = world.foodY[fi] - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearestFoodDist2) {
        nearestFoodDist2 = d2;
        nearestX = world.foodX[fi];
        nearestY = world.foodY[fi];
        found = true;
      }
    }

    // Store for flock shared sensing
    _hasSensedFood[ci] = found ? 1 : 0;
    _sensedFoodX[ci] = nearestX;
    _sensedFoodY[ci] = nearestY;

    // --- Threat detection ---
    // Scan for nearest weapon-bearing non-kin creature
    let nearestThreatDist2 = range2;
    let threatX = 0, threatY = 0;
    let foundThreat = false;

    for (let oci = 0; oci < world.creatureAlive.length; oci++) {
      if (oci === ci || !world.creatureAlive[oci] || !_hasWeapon[oci]) continue;

      const otherGenome = world.creatureGenome[oci];
      if (otherGenome && geneticSimilarity(genome, otherGenome) >= kinThreshold) continue;

      const otherCoreIdx = world.creatureBlobs[world.creatureBlobStart[oci]];
      const tdx = world.blobX[otherCoreIdx] - cx;
      const tdy = world.blobY[otherCoreIdx] - cy;
      const td2 = tdx * tdx + tdy * tdy;
      if (td2 < nearestThreatDist2) {
        nearestThreatDist2 = td2;
        threatX = world.blobX[otherCoreIdx];
        threatY = world.blobY[otherCoreIdx];
        foundThreat = true;
      }
    }

    // --- Steering decision: threat overrides food ---
    if (foundThreat) {
      // Flee: steer away from threat
      const tdx = threatX - cx;
      const tdy = threatY - cy;
      const fleeHeading = Math.atan2(-tdy, -tdx);

      if (hasSensor) {
        world.creatureHeading[ci] = fleeHeading;
      } else {
        let diff = fleeHeading - world.creatureHeading[ci];
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        world.creatureHeading[ci] += diff * 0.25; // flee is more urgent than food-seek
      }
    } else if (found) {
      // Steer toward food
      const dx = nearestX - cx;
      const dy = nearestY - cy;
      const targetHeading = Math.atan2(dy, dx);

      if (hasSensor) {
        world.creatureHeading[ci] = targetHeading;
      } else {
        let diff = targetHeading - world.creatureHeading[ci];
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        world.creatureHeading[ci] += diff * 0.15;
      }
    }
  }
}

export function updateMetabolism(world: World, metabolismCost = METABOLISM_COST_PER_BLOB) {
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;

    const count = world.creatureBlobCount[ci];
    const start = world.creatureBlobStart[ci];
    const genome = world.creatureGenome[ci]!;

    // Kin proximity discount: up to KIN_METABOLISM_DISCOUNT reduction
    const kinDiscount = 1 - KIN_METABOLISM_DISCOUNT * Math.min(_kinScore[ci] / 2, 1);

    // Metabolism cost
    world.creatureEnergy[ci] -= count * metabolismCost * kinDiscount;

    // Photosynthesis
    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] === BlobType.PHOTOSYNTHESIZER) {
        world.creatureEnergy[ci] += PHOTO_ENERGY_PER_TICK * genome.photoEfficiency;
      }
    }

    // Clamp energy
    world.creatureEnergy[ci] = Math.min(
      world.creatureEnergy[ci],
      world.creatureMaxEnergy[ci],
    );

    world.creatureAge[ci]++;
    if (world.creatureReproCooldown[ci] > 0) {
      world.creatureReproCooldown[ci]--;
    }
  }
}

export function eatFood(world: World) {
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;

    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];

    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] !== BlobType.MOUTH) continue;

      const mx = world.blobX[bi];
      const my = world.blobY[bi];
      const mr = world.blobRadius[bi];

      for (let fi = 0; fi < MAX_FOOD; fi++) {
        if (!world.foodAlive[fi]) continue;
        const dx = world.foodX[fi] - mx;
        const dy = world.foodY[fi] - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mr + FOOD_RADIUS) {
          world.creatureEnergy[ci] += FOOD_ENERGY * MOUTH_EFFICIENCY;
          world.freeFood(fi);
        }
      }
    }
  }
}

export function handleWeapons(
  world: World,
  stealFraction = PREDATION_STEAL_FRACTION,
  kinThreshold = PREDATION_KIN_THRESHOLD,
) {
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;

    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    const genome = world.creatureGenome[ci]!;

    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] !== BlobType.WEAPON) continue;

      const wx = world.blobX[bi];
      const wy = world.blobY[bi];
      const wr = world.blobRadius[bi];

      // Check collision with blobs of other creatures
      for (let j = 0; j < MAX_BLOBS; j++) {
        if (!world.blobAlive[j]) continue;
        const otherCreature = world.blobCreature[j];
        if (otherCreature === ci || otherCreature < 0) continue;
        if (!world.creatureAlive[otherCreature]) continue;

        // Kin protection: don't attack genetically similar creatures
        const otherGenome = world.creatureGenome[otherCreature];
        if (otherGenome && geneticSimilarity(genome, otherGenome) >= kinThreshold) continue;

        const dx = world.blobX[j] - wx;
        const dy = world.blobY[j] - wy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < wr + world.blobRadius[j]) {
          // Damage the other creature
          let shieldReduction = 1.0;
          if (world.blobType[j] === BlobType.SHIELD) {
            shieldReduction = 0.3;
          }
          const damageDealt = WEAPON_DAMAGE * shieldReduction;
          world.creatureEnergy[otherCreature] -= damageDealt;
          world.creatureEnergy[ci] -= WEAPON_ENERGY_COST;
          // Predation: steal energy from damage dealt
          world.creatureEnergy[ci] += damageDealt * stealFraction;
        }
      }
    }
  }
}

export function killDead(world: World, carrionDivisor = CARRION_DROP_DIVISOR) {
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    if (world.creatureEnergy[ci] <= 0) {
      // Drop carrion food at death site
      const start = world.creatureBlobStart[ci];
      const count = world.creatureBlobCount[ci];
      const coreIdx = world.creatureBlobs[start];
      const cx = world.blobX[coreIdx];
      const cy = world.blobY[coreIdx];
      const dropCount = Math.floor(count / carrionDivisor);
      for (let d = 0; d < dropCount; d++) {
        const fi = world.allocFood();
        if (fi < 0) break;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * CARRION_SCATTER_RADIUS;
        world.foodX[fi] = Math.max(0, Math.min(WORLD_SIZE, cx + Math.cos(angle) * r));
        world.foodY[fi] = Math.max(0, Math.min(WORLD_SIZE, cy + Math.sin(angle) * r));
      }

      // Remove constraints associated with this creature
      removeCreatureConstraints(world, ci);
      world.freeCreature(ci);
    }
  }
}

function removeCreatureConstraints(world: World, ci: number) {
  const start = world.creatureBlobStart[ci];
  const count = world.creatureBlobCount[ci];
  const blobSet = new Set<number>();
  for (let i = 0; i < count; i++) {
    blobSet.add(world.creatureBlobs[start + i]);
  }

  // Compact constraints by removing those referencing this creature's blobs
  let write = 0;
  for (let r = 0; r < world.constraintCount; r++) {
    if (blobSet.has(world.constraintA[r]) || blobSet.has(world.constraintB[r])) {
      continue;
    }
    if (write !== r) {
      world.constraintA[write] = world.constraintA[r];
      world.constraintB[write] = world.constraintB[r];
      world.constraintDist[write] = world.constraintDist[r];
    }
    write++;
  }
  world.constraintCount = write;
}

export function reproduce(world: World, mutationRate = MUTATION_RATE, structuralMutationRate = STRUCTURAL_MUTATION_RATE, creatureCap = CREATURE_CAP) {
  // Population cap: don't reproduce if near capacity
  if (world.creatureCount >= creatureCap) return;

  // Collect indices first to avoid mutation during iteration
  const toReproduce: number[] = [];
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    if (world.creatureReproCooldown[ci] > 0) continue;

    const energy = world.creatureEnergy[ci];
    const maxEnergy = world.creatureMaxEnergy[ci];
    if (energy < maxEnergy * REPRODUCE_ENERGY_THRESHOLD) continue;

    // Check for REPRODUCER blob
    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    let hasReproducer = false;
    for (let i = 0; i < count; i++) {
      if (world.blobType[world.creatureBlobs[start + i]] === BlobType.REPRODUCER) {
        hasReproducer = true;
        break;
      }
    }
    if (!hasReproducer) continue;

    toReproduce.push(ci);
  }

  for (const ci of toReproduce) {
    if (!world.creatureAlive[ci]) continue;
    if (world.creatureCount >= creatureCap) break;

    const genome = world.creatureGenome[ci]!;
    const childGenome = mutateGenome(genome, mutationRate, structuralMutationRate);

    // Spawn right next to parent (like cell division)
    const coreIdx = world.creatureBlobs[world.creatureBlobStart[ci]];
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 15; // close to parent
    const cx = world.blobX[coreIdx] + Math.cos(angle) * dist;
    const cy = world.blobY[coreIdx] + Math.sin(angle) * dist;

    const childCi = spawnCreature(world, cx, cy, childGenome);
    if (childCi >= 0) {
      const energySplit = world.creatureEnergy[ci] * REPRODUCE_ENERGY_SPLIT;
      world.creatureEnergy[ci] -= energySplit;
      world.creatureEnergy[childCi] = energySplit;
      // Randomize cooldown slightly to prevent synchronization
      world.creatureReproCooldown[ci] = REPRODUCE_COOLDOWN + Math.floor(Math.random() * 100 - 50);
    }
  }
}

// --- Kin-based flocking ---

/** Compute genetic similarity [0, 1] between two genomes. */
export function geneticSimilarity(a: Genome, b: Genome): number {
  // Hue distance (wrapping on [0,1]) → similarity (weight 0.7)
  const hueDist = Math.abs(a.baseHue - b.baseHue);
  const wrappedHueDist = Math.min(hueDist, 1 - hueDist); // [0, 0.5]
  const hueSim = Math.max(0, 1 - wrappedHueDist * 4); // same hue→1, diff>0.25→0

  // Blob-type composition overlap (weight 0.3)
  const countsA = new Uint8Array(BLOB_TYPE_COUNT);
  const countsB = new Uint8Array(BLOB_TYPE_COUNT);
  for (const t of a.blobTypes) countsA[t]++;
  for (const t of b.blobTypes) countsB[t]++;
  let overlap = 0;
  let total = Math.max(a.blobTypes.length, b.blobTypes.length);
  for (let i = 0; i < BLOB_TYPE_COUNT; i++) {
    overlap += Math.min(countsA[i], countsB[i]);
  }
  const typeSim = total > 0 ? overlap / total : 0;

  return hueSim * 0.7 + typeSim * 0.3;
}

// Reusable visited array — avoids GC pressure
const _visited = new Uint8Array(MAX_CREATURES);
let _visitedGeneration = 1; // bump instead of clearing the whole array

/** Apply kin-based flocking, shared food sensing, and compute kin scores. */
export function updateFlocking(world: World, spatialHash: SpatialHash): void {
  // Bump generation; wrap to avoid overflow (Uint8 max 255)
  _visitedGeneration++;
  if (_visitedGeneration > 250) {
    _visited.fill(0);
    _visitedGeneration = 1;
  }
  const gen = _visitedGeneration;

  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    _kinScore[ci] = 0;
    if (!world.creatureAlive[ci]) continue;

    const genome = world.creatureGenome[ci]!;
    if (genome.adhesionStrength <= 0) continue;

    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];

    // ADHESION blob gives a bonus multiplier
    let hasAdhesion = false;
    for (let i = 0; i < count; i++) {
      if (world.blobType[world.creatureBlobs[start + i]] === BlobType.ADHESION) {
        hasAdhesion = true;
        break;
      }
    }

    // Core position
    const coreIdx = world.creatureBlobs[start];
    const cx = world.blobX[coreIdx];
    const cy = world.blobY[coreIdx];

    // Accumulate similarity-weighted center of mass + best food from kin
    let comX = 0, comY = 0, totalWeight = 0, neighborCount = 0;
    let bestFoodX = 0, bestFoodY = 0, bestFoodDist2 = Infinity;
    const selfFoundFood = _hasSensedFood[ci];

    // Mark self as visited
    _visited[ci] = gen;

    // Query spatial hash for nearby blobs
    spatialHash.query(cx, cy, FLOCK_RANGE, (blobIdx) => {
      const otherCi = world.blobCreature[blobIdx];
      if (otherCi < 0 || _visited[otherCi] === gen) return;
      _visited[otherCi] = gen;

      if (!world.creatureAlive[otherCi]) return;

      const otherGenome = world.creatureGenome[otherCi];
      if (!otherGenome) return;

      const sim = geneticSimilarity(genome, otherGenome);
      if (sim < FLOCK_MIN_SIMILARITY) return;

      // Use other creature's core position
      const otherCoreIdx = world.creatureBlobs[world.creatureBlobStart[otherCi]];
      comX += world.blobX[otherCoreIdx] * sim;
      comY += world.blobY[otherCoreIdx] * sim;
      totalWeight += sim;
      neighborCount++;

      // Shared sensing: if this creature hasn't found food, pick up kin's food target
      if (!selfFoundFood && _hasSensedFood[otherCi]) {
        const fdx = _sensedFoodX[otherCi] - cx;
        const fdy = _sensedFoodY[otherCi] - cy;
        const fd2 = fdx * fdx + fdy * fdy;
        if (fd2 < bestFoodDist2) {
          bestFoodDist2 = fd2;
          bestFoodX = _sensedFoodX[otherCi];
          bestFoodY = _sensedFoodY[otherCi];
        }
      }
    });

    // Write kin score for metabolism discount
    _kinScore[ci] = totalWeight;

    // Shared food sensing: nudge heading toward kin's food target
    if (!selfFoundFood && bestFoodDist2 < Infinity) {
      const fdx = bestFoodX - cx;
      const fdy = bestFoodY - cy;
      const targetHeading = Math.atan2(fdy, fdx);
      let diff = targetHeading - world.creatureHeading[ci];
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      world.creatureHeading[ci] += diff * FLOCK_SENSE_BLEND;
    }

    if (neighborCount === 0) continue;

    // Weighted center of mass
    comX /= totalWeight;
    comY /= totalWeight;

    // Direction toward flock center
    const dx = comX - cx;
    const dy = comY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) continue; // already at center

    const avgSim = totalWeight / neighborCount;
    const adhesionMult = hasAdhesion ? ADHESION_FLOCK_MULT : 1.0;
    const strength = FLOCK_FORCE * genome.adhesionStrength * adhesionMult * avgSim;

    // Scale pull by distance — stronger when farther, capped at full strength
    const distFactor = Math.min(dist / FLOCK_RANGE, 1.0);

    // Position displacement (Verlet treats this as implicit velocity)
    world.blobX[coreIdx] += (dx / dist) * strength * distFactor;
    world.blobY[coreIdx] += (dy / dist) * strength * distFactor;
  }
}
