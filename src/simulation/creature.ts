import { World } from './world';
import { SpatialHash } from './spatial-hash';
import { BlobType, Genome } from '../types';
import { randomGenome, mutateGenome, crossoverGenome } from './genome';
import {
  BASE_BLOB_RADIUS, CORE_RADIUS_MULT, BLOB_MASS_BASE,
  SHIELD_MASS_MULT, FAT_MASS_MULT, STAR_REST_DISTANCE, RING_REST_DISTANCE,
  MOTOR_FORCE, SENSOR_RANGE, BASIC_FOOD_SENSE_RANGE, FOOD_TARGET_LOCK_TICKS, FOOD_TARGET_DEADBAND,
  WEAPON_DAMAGE, WEAPON_ENERGY_COST,
  MOUTH_EFFICIENCY, PHOTO_ENERGY_PER_TICK, FAT_ENERGY_BONUS,
  ADHESION_FORCE, ADHESION_RANGE, METABOLISM_COST_PER_BLOB, METABOLISM_SCALING_EXPONENT,
  CREATURE_BASE_ENERGY, WORLD_SIZE, BOUNDARY_PADDING, FOOD_ENERGY, FOOD_RADIUS,
  REPRODUCE_ENERGY_THRESHOLD, REPRODUCE_COOLDOWN, REPRODUCE_ENERGY_SPLIT,
  MUTATION_RATE, STRUCTURAL_MUTATION_RATE, MAX_BLOBS, MAX_FOOD, CREATURE_CAP,
  MATE_RANGE, MATE_MIN_SIMILARITY, SEXUAL_REPRODUCE_ENERGY_SPLIT, ASEXUAL_FALLBACK_TICKS,
  FLOCK_RANGE, FLOCK_FORCE, FLOCK_MIN_SIMILARITY, MAX_CREATURES,
  ADHESION_FLOCK_MULT, FLOCK_SENSE_BLEND, KIN_METABOLISM_DISCOUNT,
  FLOCK_LEADER_MIN_SIMILARITY, FLOCK_LEADER_REASSIGN_TICKS, FLOCK_LEADER_TARGET_REASSIGN_TICKS,
  FLOCK_LEADER_INFLUENCE, FLOCK_LEADER_TARGET_RADIUS, FLOCK_LEADER_FOLLOW_RANGE,
  FLOCK_LEADER_SPLIT_DISTANCE, FLOCK_LEADER_WANDER_JITTER, FLOCK_LEADER_EDGE_MARGIN,
  COLLISION_RADIUS_MULT,
  PREDATION_STEAL_FRACTION, PREDATION_KIN_THRESHOLD,
  CARRION_DROP_DIVISOR, CARRION_SCATTER_RADIUS,
  FEAR_DURATION, FEAR_SPEED_MULT,
  LUNGE_SPEED_MULT, LUNGE_RANGE, STEALTH_DETECTION_MULT, KILL_BOUNTY_FRACTION,
  LATCH_DURATION, LATCH_DAMAGE_MULT, LATCH_MAX,
  WEAPON_FORWARD_PULL, WEAPON_FORWARD_PULL_IDLE,
  EAT_FULL_STOP_FRACTION, EAT_RESUME_FRACTION, EAT_COOLDOWN_TICKS, EAT_MAX_ITEMS_PER_SUBSTEP,
  PREDATOR_FLOCK_DETECT_RANGE, PREDATOR_FLOCK_CLUSTER_RADIUS, PREDATOR_FLOCK_DENSITY_WEIGHT,
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

    mass *= size;
    world.blobRadius[bi] = radius;
    world.blobType[bi] = type;
    world.blobCreature[bi] = ci;
    world.blobMass[bi] = mass;
    world.blobSize[bi] = size;
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
  world.creatureLastAttacker[ci] = -1;
  // Random initial cooldown so creatures don't all reproduce in sync
  world.creatureReproCooldown[ci] = Math.floor(Math.random() * REPRODUCE_COOLDOWN);

  // Calculate max energy (fat bonus scales with blob size)
  let fatEnergyBonus = 0;
  for (let i = 0; i < g.blobTypes.length; i++) {
    if (g.blobTypes[i] === BlobType.FAT) fatEnergyBonus += FAT_ENERGY_BONUS * g.blobSizes[i];
  }
  world.creatureMaxEnergy[ci] = g.maxEnergy + fatEnergyBonus;
  world.creatureEnergy[ci] = CREATURE_BASE_ENERGY;
  _eatCooldown[ci] = 0;
  _isSatiated[ci] = 0;
  _foodTargetTimer[ci] = 0;
  _wantsFood[ci] = 1;
  _leaderId[ci] = -1;
  _leaderTimer[ci] = 0;
  _leaderTargetX[ci] = x;
  _leaderTargetY[ci] = y;
  _leaderTargetTimer[ci] = 0;
  _isLeader[ci] = 0;

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

export function updateCreatureLocomotion(world: World, motorForce = MOTOR_FORCE, lungeSpeedMult = LUNGE_SPEED_MULT) {
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;

    const genome = world.creatureGenome[ci]!;
    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    const heading = world.creatureHeading[ci];

    // Sum motor blob sizes (bigger motors contribute more force)
    let motorSizeSum = 0;
    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] === BlobType.MOTOR) motorSizeSum += world.blobSize[bi];
    }

    if (motorSizeSum === 0) continue;

    // Apply force to core blob in heading direction
    const lungeMult = _nearPrey[ci] ? lungeSpeedMult : 1.0;
    const fearMult = (!_hasWeapon[ci] && _fearTimer[ci] > 0) ? FEAR_SPEED_MULT : 1.0;
    const force = motorForce * Math.sqrt(motorSizeSum) / Math.sqrt(count) * lungeMult * fearMult;
    const coreIdx = world.creatureBlobs[start]; // first blob is core
    const fx = Math.cos(heading) * force;
    const fy = Math.sin(heading) * force;

    world.blobX[coreIdx] += fx;
    world.blobY[coreIdx] += fy;

    // Weapon forward orbit: nudge weapon blobs toward the heading-aligned point
    // on their orbit circle. This preserves star constraint distance while rotating
    // weapons to the front of the creature.
    if (_hasWeapon[ci]) {
      const pull = _nearPrey[ci] ? WEAPON_FORWARD_PULL : WEAPON_FORWARD_PULL_IDLE;
      const coreX = world.blobX[coreIdx];
      const coreY = world.blobY[coreIdx];
      // Target point: front of creature on the star orbit circle
      const targetX = coreX + Math.cos(heading) * STAR_REST_DISTANCE;
      const targetY = coreY + Math.sin(heading) * STAR_REST_DISTANCE;

      for (let i = 0; i < count; i++) {
        const bi = world.creatureBlobs[start + i];
        if (world.blobType[bi] !== BlobType.WEAPON) continue;

        const dx = targetX - world.blobX[bi];
        const dy = targetY - world.blobY[bi];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1.0) continue; // dead zone to prevent jitter

        // Symmetry breaking: when weapon is nearly directly behind core,
        // add a perpendicular kick to start it orbiting consistently
        const fromCoreX = world.blobX[bi] - coreX;
        const fromCoreY = world.blobY[bi] - coreY;
        const dot = fromCoreX * Math.cos(heading) + fromCoreY * Math.sin(heading);
        if (dot < -0.7 * STAR_REST_DISTANCE) {
          // Perpendicular to heading (always kick clockwise for consistency)
          world.blobX[bi] += -Math.sin(heading) * 0.5;
          world.blobY[bi] += Math.cos(heading) * 0.5;
        }

        const nudge = Math.min(dist, pull);
        world.blobX[bi] += (dx / dist) * nudge;
        world.blobY[bi] += (dy / dist) * nudge;
      }
    }

    // Slow random heading drift
    world.creatureHeading[ci] += (Math.random() - 0.5) * genome.turnRate * 0.1;
  }
}

// Per-creature sensed food target — written by updateSensors, read by updateFlocking
const _sensedFoodX = new Float32Array(MAX_CREATURES);
const _sensedFoodY = new Float32Array(MAX_CREATURES);
const _hasSensedFood = new Uint8Array(MAX_CREATURES);
const _foodTargetX = new Float32Array(MAX_CREATURES);
const _foodTargetY = new Float32Array(MAX_CREATURES);
const _foodTargetTimer = new Int32Array(MAX_CREATURES);
const _wantsFood = new Uint8Array(MAX_CREATURES);

// Per-creature sensed threat target — written by updateSensors, read by updateFlocking
const _sensedThreatX = new Float32Array(MAX_CREATURES);
const _sensedThreatY = new Float32Array(MAX_CREATURES);
const _hasSensedThreat = new Uint8Array(MAX_CREATURES);

// Fear cooldown — persists across ticks so creatures keep fleeing after threat leaves range
const _fearTimer = new Int32Array(MAX_CREATURES);
const _fearThreatX = new Float32Array(MAX_CREATURES);
const _fearThreatY = new Float32Array(MAX_CREATURES);

// Per-creature weapon flag — precomputed each tick by updateSensors
const _hasWeapon = new Uint8Array(MAX_CREATURES);

// Per-creature prey target — written by updateSensors, read by updateCreatureLocomotion
const _nearPrey = new Uint8Array(MAX_CREATURES);
const _preyTargetX = new Float32Array(MAX_CREATURES);
const _preyTargetY = new Float32Array(MAX_CREATURES);
const _hasHuntTarget = new Uint8Array(MAX_CREATURES);
const _huntTargetX = new Float32Array(MAX_CREATURES);
const _huntTargetY = new Float32Array(MAX_CREATURES);
const _localCrowd = new Uint16Array(MAX_CREATURES);
const _aliveCreatures = new Int32Array(MAX_CREATURES);
const _sensorVisited = new Uint16Array(MAX_CREATURES);
let _sensorVisitedGen = 1;

// Per-creature kin score — written by updateFlocking, read by updateMetabolism
export const _kinScore = new Float32Array(MAX_CREATURES);
const _eatCooldown = new Int32Array(MAX_CREATURES);
const _isSatiated = new Uint8Array(MAX_CREATURES);
const _leaderId = new Int32Array(MAX_CREATURES).fill(-1);
const _leaderTimer = new Int32Array(MAX_CREATURES);
const _leaderTargetX = new Float32Array(MAX_CREATURES);
const _leaderTargetY = new Float32Array(MAX_CREATURES);
const _leaderTargetTimer = new Int32Array(MAX_CREATURES);
const _isLeader = new Uint8Array(MAX_CREATURES);

export function updateSensors(
  world: World,
  spatialHash: SpatialHash,
  kinThreshold = PREDATION_KIN_THRESHOLD,
  stealthDetectionMult = STEALTH_DETECTION_MULT,
  lungeRange = LUNGE_RANGE,
) {
  let aliveCount = 0;
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (world.creatureAlive[ci]) _aliveCreatures[aliveCount++] = ci;
  }

  // Precompute which creatures have weapons (for threat detection)
  for (let ai = 0; ai < aliveCount; ai++) {
    const ci = _aliveCreatures[ai];
    _hasWeapon[ci] = 0;
    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    for (let i = 0; i < count; i++) {
      if (world.blobType[world.creatureBlobs[start + i]] === BlobType.WEAPON) {
        _hasWeapon[ci] = 1;
        break;
      }
    }
  }

  // Precompute local crowd density around each creature core (used by predators for far flock targeting)
  const crowdRadius2 = PREDATOR_FLOCK_CLUSTER_RADIUS * PREDATOR_FLOCK_CLUSTER_RADIUS;
  for (let ai = 0; ai < aliveCount; ai++) {
    const ci = _aliveCreatures[ai];
    _localCrowd[ci] = 0;
    const coreIdx = world.creatureBlobs[world.creatureBlobStart[ci]];
    const cx = world.blobX[coreIdx];
    const cy = world.blobY[coreIdx];
    let crowd = 0;
    _sensorVisitedGen++;
    if (_sensorVisitedGen === 0) {
      _sensorVisited.fill(0);
      _sensorVisitedGen = 1;
    }
    const visitedGen = _sensorVisitedGen;
    spatialHash.query(cx, cy, PREDATOR_FLOCK_CLUSTER_RADIUS, (blobIdx) => {
      const oci = world.blobCreature[blobIdx];
      if (oci < 0 || oci === ci || _sensorVisited[oci] === visitedGen) return;
      _sensorVisited[oci] = visitedGen;
      const otherCoreIdx = world.creatureBlobs[world.creatureBlobStart[oci]];
      if (otherCoreIdx !== blobIdx) return; // count each creature once using core blob
      const dx = world.blobX[otherCoreIdx] - cx;
      const dy = world.blobY[otherCoreIdx] - cy;
      if (dx * dx + dy * dy < crowdRadius2) crowd++;
    });
    _localCrowd[ci] = crowd;
  }

  for (let ai = 0; ai < aliveCount; ai++) {
    const ci = _aliveCreatures[ai];

    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    const genome = world.creatureGenome[ci]!;

    // Use core position as reference
    const coreIdx = world.creatureBlobs[start];
    const cx = world.blobX[coreIdx];
    const cy = world.blobY[coreIdx];

    // Find largest sensor blob (bigger sensors extend range further)
    let maxSensorSize = 0;
    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] === BlobType.SENSOR) {
        maxSensorSize = Math.max(maxSensorSize, world.blobSize[bi]);
      }
    }
    const hasSensor = maxSensorSize > 0;

    // Sense range scales with sensor blob size
    const range = hasSensor ? SENSOR_RANGE * maxSensorSize : BASIC_FOOD_SENSE_RANGE;
    const range2 = range * range;

    // Keep satiety in sync for steering logic (avoid full creatures orbiting food patches).
    const maxEnergy = world.creatureMaxEnergy[ci];
    if (_isSatiated[ci]) {
      if (world.creatureEnergy[ci] <= maxEnergy * EAT_RESUME_FRACTION) _isSatiated[ci] = 0;
    } else if (world.creatureEnergy[ci] >= maxEnergy * EAT_FULL_STOP_FRACTION) {
      _isSatiated[ci] = 1;
    }
    const wantsFood = _isSatiated[ci] ? 0 : 1;
    _wantsFood[ci] = wantsFood;

    // --- Food detection with target stickiness ---
    let nearestFoodDist2 = range2;
    let nearestX = 0, nearestY = 0;
    let found = false;

    if (wantsFood) {
      const lockX = _foodTargetX[ci];
      const lockY = _foodTargetY[ci];
      const lockRadius2 = FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND;
      let lockFound = false;
      let lockBestDist2 = lockRadius2;

      if (_foodTargetTimer[ci] > 0) _foodTargetTimer[ci]--;

      spatialHash.queryFood(
        cx, cy, range,
        world.foodX, world.foodY, world.foodAlive,
        (fi) => {
          const fx = world.foodX[fi];
          const fy = world.foodY[fi];
          const dx = fx - cx;
          const dy = fy - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 < nearestFoodDist2) {
            nearestFoodDist2 = d2;
            nearestX = fx;
            nearestY = fy;
            found = true;
          }

          if (_foodTargetTimer[ci] > 0) {
            const ldx = fx - lockX;
            const ldy = fy - lockY;
            const ld2 = ldx * ldx + ldy * ldy;
            if (ld2 < lockBestDist2) {
              lockBestDist2 = ld2;
              lockFound = true;
            }
          }
        },
      );

      if (_foodTargetTimer[ci] > 0 && lockFound) {
        nearestX = lockX;
        nearestY = lockY;
        found = true;
      } else if (found) {
        _foodTargetX[ci] = nearestX;
        _foodTargetY[ci] = nearestY;
        _foodTargetTimer[ci] = FOOD_TARGET_LOCK_TICKS;
      } else {
        _foodTargetTimer[ci] = 0;
      }
    } else {
      _foodTargetTimer[ci] = 0;
    }

    // Store for flock shared sensing
    _hasSensedFood[ci] = found ? 1 : 0;
    _sensedFoodX[ci] = nearestX;
    _sensedFoodY[ci] = nearestY;

    // --- Threat detection (stealth: predators detected at reduced range) ---
    const stealthRange = range * stealthDetectionMult;
    const stealthRange2 = stealthRange * stealthRange;
    let nearestThreatDist2 = stealthRange2;
    let threatX = 0, threatY = 0;
    let foundThreat = false;

    for (let oi = 0; oi < aliveCount; oi++) {
      const oci = _aliveCreatures[oi];
      if (oci === ci || !_hasWeapon[oci]) continue;

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

    // Store threat sensing for alarm signaling in updateFlocking
    _hasSensedThreat[ci] = foundThreat ? 1 : 0;
    _sensedThreatX[ci] = threatX;
    _sensedThreatY[ci] = threatY;

    // --- Prey detection (weapon-bearers scan for non-kin to chase) ---
    _nearPrey[ci] = 0;
    _hasHuntTarget[ci] = 0;
    if (_hasWeapon[ci]) {
      const lungeRange2 = lungeRange * lungeRange;
      const huntRange2 = PREDATOR_FLOCK_DETECT_RANGE * PREDATOR_FLOCK_DETECT_RANGE;
      let nearestPreyDist2 = lungeRange2;
      let preyX = 0, preyY = 0;
      let foundPrey = false;
      let bestHuntScore = -Infinity;
      let huntX = 0, huntY = 0;
      let foundHunt = false;

      for (let oi = 0; oi < aliveCount; oi++) {
        const oci = _aliveCreatures[oi];
        if (oci === ci) continue;

        const otherGenome = world.creatureGenome[oci];
        if (otherGenome && geneticSimilarity(genome, otherGenome) >= kinThreshold) continue;

        const otherCoreIdx = world.creatureBlobs[world.creatureBlobStart[oci]];
        const pdx = world.blobX[otherCoreIdx] - cx;
        const pdy = world.blobY[otherCoreIdx] - cy;
        const pd2 = pdx * pdx + pdy * pdy;
        if (pd2 < nearestPreyDist2) {
          nearestPreyDist2 = pd2;
          preyX = world.blobX[otherCoreIdx];
          preyY = world.blobY[otherCoreIdx];
          foundPrey = true;
        }
        if (pd2 < huntRange2) {
          const distNorm = Math.sqrt(pd2) / PREDATOR_FLOCK_DETECT_RANGE; // 0..1
          const score = _localCrowd[oci] * PREDATOR_FLOCK_DENSITY_WEIGHT - distNorm;
          if (score > bestHuntScore) {
            bestHuntScore = score;
            huntX = world.blobX[otherCoreIdx];
            huntY = world.blobY[otherCoreIdx];
            foundHunt = true;
          }
        }
      }

      if (foundPrey) {
        _nearPrey[ci] = 1;
        _preyTargetX[ci] = preyX;
        _preyTargetY[ci] = preyY;
      } else if (foundHunt) {
        _hasHuntTarget[ci] = 1;
        _huntTargetX[ci] = huntX;
        _huntTargetY[ci] = huntY;
      }
    }

    // --- Steering decision ---
    if (_hasWeapon[ci]) {
      // Weapon-bearers: close chase > far flock hunt > seek food (predators don't flee)
      if (_nearPrey[ci]) {
        const pdx = _preyTargetX[ci] - cx;
        const pdy = _preyTargetY[ci] - cy;
        const chaseHeading = Math.atan2(pdy, pdx);

        if (hasSensor) {
          world.creatureHeading[ci] = chaseHeading;
        } else {
          let diff = chaseHeading - world.creatureHeading[ci];
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          world.creatureHeading[ci] += diff * 0.3;
        }
      } else if (_hasHuntTarget[ci]) {
        const pdx = _huntTargetX[ci] - cx;
        const pdy = _huntTargetY[ci] - cy;
        const huntHeading = Math.atan2(pdy, pdx);

        if (hasSensor) {
          world.creatureHeading[ci] = huntHeading;
        } else {
          let diff = huntHeading - world.creatureHeading[ci];
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          world.creatureHeading[ci] += diff * 0.2;
        }
      } else if (wantsFood && found) {
        const dx = nearestX - cx;
        const dy = nearestY - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND) {
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
    } else {
      // Non-weapon: flee threat > fear timer > seek food (unchanged)
      if (foundThreat) {
        _fearTimer[ci] = FEAR_DURATION;
        _fearThreatX[ci] = threatX;
        _fearThreatY[ci] = threatY;

        const tdx = threatX - cx;
        const tdy = threatY - cy;
        const fleeHeading = Math.atan2(-tdy, -tdx);

        if (hasSensor) {
          world.creatureHeading[ci] = fleeHeading;
        } else {
          let diff = fleeHeading - world.creatureHeading[ci];
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          world.creatureHeading[ci] += diff * 0.25;
        }
      } else if (_fearTimer[ci] > 0) {
        _fearTimer[ci]--;
        const tdx = _fearThreatX[ci] - cx;
        const tdy = _fearThreatY[ci] - cy;
        const fleeHeading = Math.atan2(-tdy, -tdx);

        if (hasSensor) {
          world.creatureHeading[ci] = fleeHeading;
        } else {
          let diff = fleeHeading - world.creatureHeading[ci];
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          world.creatureHeading[ci] += diff * 0.2;
        }
      } else if (wantsFood && found) {
        const dx = nearestX - cx;
        const dy = nearestY - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND) {
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
  }
}

export function updateMetabolism(world: World, metabolismCost = METABOLISM_COST_PER_BLOB, metabolismExponent = METABOLISM_SCALING_EXPONENT) {
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;

    const count = world.creatureBlobCount[ci];
    const start = world.creatureBlobStart[ci];
    const genome = world.creatureGenome[ci]!;

    // Kin proximity discount: up to KIN_METABOLISM_DISCOUNT reduction
    const kinDiscount = 1 - KIN_METABOLISM_DISCOUNT * Math.min(_kinScore[ci] / 2, 1);

    // Metabolism cost (sub-linear: count^exponent * cost)
    world.creatureEnergy[ci] -= Math.pow(count, metabolismExponent) * metabolismCost * kinDiscount;

    // Photosynthesis
    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] === BlobType.PHOTOSYNTHESIZER) {
        world.creatureEnergy[ci] += PHOTO_ENERGY_PER_TICK * genome.photoEfficiency * world.blobSize[bi];
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

export function eatFood(
  world: World,
  spatialHash: SpatialHash,
  eatFullStopFraction = EAT_FULL_STOP_FRACTION,
  eatResumeFraction = EAT_RESUME_FRACTION,
  eatCooldownTicks = EAT_COOLDOWN_TICKS,
  eatMaxItemsPerSubstep = EAT_MAX_ITEMS_PER_SUBSTEP,
) {
  if (eatMaxItemsPerSubstep <= 0) return;
  const stopFraction = Math.min(1, Math.max(0, eatFullStopFraction));
  const resumeFraction = Math.min(stopFraction, Math.max(0, eatResumeFraction));

  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    if (_eatCooldown[ci] > 0) _eatCooldown[ci]--;

    const maxEnergy = world.creatureMaxEnergy[ci];
    const fullEnergy = maxEnergy * stopFraction;
    const resumeEnergy = maxEnergy * resumeFraction;

    if (_isSatiated[ci]) {
      if (world.creatureEnergy[ci] <= resumeEnergy) {
        _isSatiated[ci] = 0;
      } else {
        continue;
      }
    } else if (world.creatureEnergy[ci] >= fullEnergy) {
      _isSatiated[ci] = 1;
      continue;
    }

    if (_eatCooldown[ci] > 0) continue;

    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    let eaten = 0;
    let stopEating = false;

    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] !== BlobType.MOUTH) continue;

      const mx = world.blobX[bi];
      const my = world.blobY[bi];
      const mr = world.blobRadius[bi];
      const eatRange = mr + FOOD_RADIUS;

      spatialHash.queryFood(
        mx, my, eatRange,
        world.foodX, world.foodY, world.foodAlive,
        (fi) => {
          if (stopEating || !world.foodAlive[fi]) return;
          const dx = world.foodX[fi] - mx;
          const dy = world.foodY[fi] - my;
          if (dx * dx + dy * dy < eatRange * eatRange) {
          world.creatureEnergy[ci] = Math.min(
            maxEnergy,
            world.creatureEnergy[ci] + FOOD_ENERGY * MOUTH_EFFICIENCY * world.blobSize[bi],
          );
          world.freeFood(fi);
          eaten++;

          if (eatCooldownTicks > 0) {
            _eatCooldown[ci] = eatCooldownTicks;
            stopEating = true;
          }
          if (world.creatureEnergy[ci] >= fullEnergy) {
            _isSatiated[ci] = 1;
            stopEating = true;
          }
          if (eaten >= eatMaxItemsPerSubstep) {
            stopEating = true;
          }
          }
        },
      );
      if (stopEating) break;
    }
  }
}

/** Check if a weapon blob already has an active latch. */
function isWeaponLatched(world: World, weaponBlobIdx: number): boolean {
  for (let li = 0; li < world.latchCount; li++) {
    if (world.latchWeaponBlob[li] === weaponBlobIdx) return true;
  }
  return false;
}

/** Create a new latch between a weapon blob and a target blob. */
function createLatch(
  world: World,
  weaponBlob: number, targetBlob: number,
  weaponCreature: number, targetCreature: number,
): boolean {
  if (world.latchCount >= LATCH_MAX) return false;
  const li = world.latchCount++;
  world.latchWeaponBlob[li] = weaponBlob;
  world.latchTargetBlob[li] = targetBlob;
  world.latchWeaponCreature[li] = weaponCreature;
  world.latchTargetCreature[li] = targetCreature;
  world.latchTimer[li] = LATCH_DURATION;
  return true;
}

export function handleWeapons(
  world: World,
  spatialHash: SpatialHash,
  stealFraction = PREDATION_STEAL_FRACTION,
  kinThreshold = PREDATION_KIN_THRESHOLD,
) {
  const weaponQueryPad = 40;
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;

    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    const genome = world.creatureGenome[ci]!;

    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] !== BlobType.WEAPON) continue;

      // Skip if this weapon already has an active latch
      if (isWeaponLatched(world, bi)) continue;

      const wx = world.blobX[bi];
      const wy = world.blobY[bi];
      const wr = world.blobRadius[bi] * COLLISION_RADIUS_MULT;
      const queryRadius = wr + weaponQueryPad;
      let hit = false;

      // Check collision with blobs of other creatures
      spatialHash.query(wx, wy, queryRadius, (j) => {
        if (hit || !world.blobAlive[j]) return;
        const otherCreature = world.blobCreature[j];
        if (otherCreature === ci || otherCreature < 0 || !world.creatureAlive[otherCreature]) return;

        // Kin protection: don't attack genetically similar creatures
        const otherGenome = world.creatureGenome[otherCreature];
        if (otherGenome && geneticSimilarity(genome, otherGenome) >= kinThreshold) return;

        const dx = world.blobX[j] - wx;
        const dy = world.blobY[j] - wy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < wr + world.blobRadius[j] * COLLISION_RADIUS_MULT) {
          // Initial contact hit (small burst) + create latch for sustained damage
          let shieldReduction = 1.0;
          if (world.blobType[j] === BlobType.SHIELD) {
            shieldReduction = Math.max(0.25, 1.0 - 0.5 * world.blobSize[j]);
          }
          const damageDealt = WEAPON_DAMAGE * world.blobSize[bi] * shieldReduction;
          world.creatureEnergy[otherCreature] -= damageDealt;
          world.creatureEnergy[ci] -= WEAPON_ENERGY_COST;
          world.creatureEnergy[ci] += damageDealt * stealFraction;
          world.creatureLastAttacker[otherCreature] = ci;

          // Create latch — weapon stays attached for sustained damage
          createLatch(world, bi, j, ci, otherCreature);
          hit = true; // one latch per weapon per tick
        }
      });
    }
  }
}

/** Process active latches: deal sustained damage, enforce contact constraint, expire timers. */
export function processLatches(
  world: World,
  stealFraction = PREDATION_STEAL_FRACTION,
) {
  let write = 0;
  for (let li = 0; li < world.latchCount; li++) {
    const wbi = world.latchWeaponBlob[li];
    const tbi = world.latchTargetBlob[li];
    const wci = world.latchWeaponCreature[li];
    const tci = world.latchTargetCreature[li];

    // Remove latch if either creature is dead or blobs are freed
    if (!world.creatureAlive[wci] || !world.creatureAlive[tci] ||
        !world.blobAlive[wbi] || !world.blobAlive[tbi]) {
      continue; // skip = remove
    }

    // Decrement timer
    world.latchTimer[li]--;
    if (world.latchTimer[li] <= 0) continue; // expired

    // --- Sustained damage ---
    let shieldReduction = 1.0;
    if (world.blobType[tbi] === BlobType.SHIELD) {
      shieldReduction = Math.max(0.25, 1.0 - 0.5 * world.blobSize[tbi]);
    }
    const damage = WEAPON_DAMAGE * LATCH_DAMAGE_MULT * world.blobSize[wbi] * shieldReduction;
    world.creatureEnergy[tci] -= damage;
    world.creatureEnergy[wci] += damage * stealFraction;
    world.creatureLastAttacker[tci] = wci;

    // --- Distance constraint: keep weapon blob in contact with target blob ---
    const dx = world.blobX[tbi] - world.blobX[wbi];
    const dy = world.blobY[tbi] - world.blobY[wbi];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const restDist = world.blobRadius[wbi] + world.blobRadius[tbi];

    if (dist > restDist && dist > 0.01) {
      const overlap = dist - restDist;
      const nx = dx / dist;
      const ny = dy / dist;
      // Mass-weighted: both move, predator pulls toward prey and prey drags
      const totalMass = world.blobMass[wbi] + world.blobMass[tbi];
      const wFrac = world.blobMass[tbi] / totalMass; // weapon moves more if lighter
      const tFrac = world.blobMass[wbi] / totalMass;
      world.blobX[wbi] += nx * overlap * wFrac * 0.5;
      world.blobY[wbi] += ny * overlap * wFrac * 0.5;
      world.blobX[tbi] -= nx * overlap * tFrac * 0.5;
      world.blobY[tbi] -= ny * overlap * tFrac * 0.5;
    }

    // Keep this latch (compact)
    if (write !== li) {
      world.latchWeaponBlob[write] = wbi;
      world.latchTargetBlob[write] = tbi;
      world.latchWeaponCreature[write] = wci;
      world.latchTargetCreature[write] = tci;
      world.latchTimer[write] = world.latchTimer[li];
    }
    write++;
  }
  world.latchCount = write;
}

export function killDead(world: World, carrionDivisor = CARRION_DROP_DIVISOR, killBountyFraction = KILL_BOUNTY_FRACTION) {
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    if (world.creatureEnergy[ci] <= 0) {
      // Award kill bounty to last attacker
      const lastAttacker = world.creatureLastAttacker[ci];
      if (lastAttacker >= 0 && world.creatureAlive[lastAttacker]) {
        const bounty = world.creatureMaxEnergy[ci] * killBountyFraction;
        world.creatureEnergy[lastAttacker] = Math.min(
          world.creatureEnergy[lastAttacker] + bounty,
          world.creatureMaxEnergy[lastAttacker],
        );
      }

      // Drop carrion food at death site (predator kills drop half as much)
      const start = world.creatureBlobStart[ci];
      const count = world.creatureBlobCount[ci];
      const coreIdx = world.creatureBlobs[start];
      const cx = world.blobX[coreIdx];
      const cy = world.blobY[coreIdx];
      const carrionMult = (lastAttacker >= 0 && world.creatureAlive[lastAttacker]) ? 0.5 : 1.0;
      const dropCount = Math.floor(count * carrionMult / carrionDivisor);
      for (let d = 0; d < dropCount; d++) {
        const fi = world.allocFood();
        if (fi < 0) break;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * CARRION_SCATTER_RADIUS;
        const margin = BOUNDARY_PADDING + 10;
        const fx = cx + Math.cos(angle) * r;
        const fy = cy + Math.sin(angle) * r;
        world.foodX[fi] = Math.max(margin, Math.min(WORLD_SIZE - margin, fx));
        world.foodY[fi] = Math.max(margin, Math.min(WORLD_SIZE - margin, fy));
      }

      // Remove latches involving this creature
      removeLatchesForCreature(world, ci);
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

function removeLatchesForCreature(world: World, ci: number) {
  let write = 0;
  for (let li = 0; li < world.latchCount; li++) {
    if (world.latchWeaponCreature[li] === ci || world.latchTargetCreature[li] === ci) {
      continue; // remove
    }
    if (write !== li) {
      world.latchWeaponBlob[write] = world.latchWeaponBlob[li];
      world.latchTargetBlob[write] = world.latchTargetBlob[li];
      world.latchWeaponCreature[write] = world.latchWeaponCreature[li];
      world.latchTargetCreature[write] = world.latchTargetCreature[li];
      world.latchTimer[write] = world.latchTimer[li];
    }
    write++;
  }
  world.latchCount = write;
}

// Module-level typed arrays for reproduction (following existing pattern — zero GC)
const _readyList = new Int32Array(MAX_CREATURES);
const _reproducerBlobIdx = new Int32Array(MAX_CREATURES);
const _reproducerSize = new Float32Array(MAX_CREATURES);
const _matedThisTick = new Uint8Array(MAX_CREATURES);

export function reproduce(
  world: World,
  spatialHash: SpatialHash,
  mutationRate = MUTATION_RATE,
  structuralMutationRate = STRUCTURAL_MUTATION_RATE,
  creatureCap = CREATURE_CAP,
  mateMinSimilarity = MATE_MIN_SIMILARITY,
  asexualFallbackTicks = ASEXUAL_FALLBACK_TICKS,
) {
  // Population cap: don't reproduce if near capacity
  if (world.creatureCount >= creatureCap) return;

  // --- Phase 1: Identify ready creatures ---
  let readyCount = 0;
  _matedThisTick.fill(0);

  for (let ci = 0; ci < MAX_CREATURES; ci++) {
    if (!world.creatureAlive[ci]) continue;
    if (world.creatureReproCooldown[ci] > 0) continue;

    const energy = world.creatureEnergy[ci];
    const maxEnergy = world.creatureMaxEnergy[ci];
    if (energy < maxEnergy * REPRODUCE_ENERGY_THRESHOLD) continue;

    // Find REPRODUCER blob (use largest one)
    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    let bestReprIdx = -1;
    let bestReprSize = 0;
    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] === BlobType.REPRODUCER) {
        const s = world.blobSize[bi];
        if (s > bestReprSize) {
          bestReprSize = s;
          bestReprIdx = bi;
        }
      }
    }
    if (bestReprIdx < 0) continue;

    _readyList[readyCount] = ci;
    _reproducerBlobIdx[ci] = bestReprIdx;
    _reproducerSize[ci] = bestReprSize;
    readyCount++;
  }

  // --- Phase 2: Fisher-Yates shuffle to avoid index-ordering bias ---
  for (let i = readyCount - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = _readyList[i];
    _readyList[i] = _readyList[j];
    _readyList[j] = tmp;
  }

  // --- Phase 3: Mate or fallback ---
  for (let ri = 0; ri < readyCount; ri++) {
    const ci = _readyList[ri];
    if (!world.creatureAlive[ci] || _matedThisTick[ci]) continue;
    if (world.creatureCount >= creatureCap) break;

    const genome = world.creatureGenome[ci]!;
    const reprBlobIdx = _reproducerBlobIdx[ci];
    const reprSize = _reproducerSize[ci];
    const rx = world.blobX[reprBlobIdx];
    const ry = world.blobY[reprBlobIdx];
    const mateRange = MATE_RANGE * reprSize;

    // Search spatial hash for a mate
    let bestMate = -1;
    let bestSimilarity = -1;

    spatialHash.query(rx, ry, mateRange, (blobIdx) => {
      const otherCi = world.blobCreature[blobIdx];
      if (otherCi < 0 || otherCi === ci) return;
      if (!world.creatureAlive[otherCi]) return;
      if (_matedThisTick[otherCi]) return;

      // Must also be ready (check energy + cooldown + has reproducer)
      if (world.creatureReproCooldown[otherCi] > 0) return;
      const otherEnergy = world.creatureEnergy[otherCi];
      const otherMaxEnergy = world.creatureMaxEnergy[otherCi];
      if (otherEnergy < otherMaxEnergy * REPRODUCE_ENERGY_THRESHOLD) return;
      if (_reproducerSize[otherCi] <= 0) return; // not in ready list (no reproducer)

      const otherGenome = world.creatureGenome[otherCi];
      if (!otherGenome) return;
      const sim = geneticSimilarity(genome, otherGenome);
      if (sim < mateMinSimilarity) return;

      // Check actual distance between reproducer blobs
      const otherReprIdx = _reproducerBlobIdx[otherCi];
      const dx = world.blobX[otherReprIdx] - rx;
      const dy = world.blobY[otherReprIdx] - ry;
      const avgRange = (mateRange + MATE_RANGE * _reproducerSize[otherCi]) * 0.5;
      if (dx * dx + dy * dy > avgRange * avgRange) return;

      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestMate = otherCi;
      }
    });

    if (bestMate >= 0) {
      // --- Sexual reproduction ---
      const mateGenome = world.creatureGenome[bestMate]!;
      const childGenome = mutateGenome(
        crossoverGenome(genome, mateGenome),
        mutationRate,
        structuralMutationRate,
      );

      // Spawn at midpoint between the two reproducer blobs
      const mateReprIdx = _reproducerBlobIdx[bestMate];
      const spawnX = (world.blobX[reprBlobIdx] + world.blobX[mateReprIdx]) * 0.5;
      const spawnY = (world.blobY[reprBlobIdx] + world.blobY[mateReprIdx]) * 0.5;

      const childCi = spawnCreature(world, spawnX, spawnY, childGenome);
      if (childCi >= 0) {
        // Both parents contribute 30% of their energy
        const energyA = world.creatureEnergy[ci] * SEXUAL_REPRODUCE_ENERGY_SPLIT;
        const energyB = world.creatureEnergy[bestMate] * SEXUAL_REPRODUCE_ENERGY_SPLIT;
        world.creatureEnergy[ci] -= energyA;
        world.creatureEnergy[bestMate] -= energyB;
        world.creatureEnergy[childCi] = energyA + energyB;

        // Cooldown scaled by reproducer size (larger = shorter cooldown)
        const cooldownA = Math.floor(REPRODUCE_COOLDOWN / reprSize) + Math.floor(Math.random() * 100 - 50);
        const cooldownB = Math.floor(REPRODUCE_COOLDOWN / _reproducerSize[bestMate]) + Math.floor(Math.random() * 100 - 50);
        world.creatureReproCooldown[ci] = Math.max(50, cooldownA);
        world.creatureReproCooldown[bestMate] = Math.max(50, cooldownB);

        _matedThisTick[ci] = 1;
        _matedThisTick[bestMate] = 1;
        world.creatureMateTimer[ci] = 0;
        world.creatureMateTimer[bestMate] = 0;
      }
    } else {
      // No mate found — increment timer and possibly fall back to asexual
      world.creatureMateTimer[ci]++;

      if (world.creatureMateTimer[ci] >= asexualFallbackTicks) {
        // Asexual fallback: clone + mutate (original behavior)
        const childGenome = mutateGenome(genome, mutationRate, structuralMutationRate);
        const coreIdx = world.creatureBlobs[world.creatureBlobStart[ci]];
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 15;
        const cx = world.blobX[coreIdx] + Math.cos(angle) * dist;
        const cy = world.blobY[coreIdx] + Math.sin(angle) * dist;

        const childCi = spawnCreature(world, cx, cy, childGenome);
        if (childCi >= 0) {
          const energySplit = world.creatureEnergy[ci] * REPRODUCE_ENERGY_SPLIT;
          world.creatureEnergy[ci] -= energySplit;
          world.creatureEnergy[childCi] = energySplit;
          world.creatureReproCooldown[ci] = REPRODUCE_COOLDOWN + Math.floor(Math.random() * 100 - 50);
          _matedThisTick[ci] = 1;
          world.creatureMateTimer[ci] = 0;
        }
      }
    }
  }
}

// --- Kin-based flocking ---

/** Compute genetic similarity [0, 1] between two genomes. */
const _simCountsA = new Uint8Array(BLOB_TYPE_COUNT);
const _simCountsB = new Uint8Array(BLOB_TYPE_COUNT);
export function geneticSimilarity(a: Genome, b: Genome): number {
  // Hue distance (wrapping on [0,1]) → similarity (weight 0.7)
  const hueDist = Math.abs(a.baseHue - b.baseHue);
  const wrappedHueDist = Math.min(hueDist, 1 - hueDist); // [0, 0.5]
  const hueSim = Math.max(0, 1 - wrappedHueDist * 4); // same hue→1, diff>0.25→0

  // Blob-type composition overlap (weight 0.3)
  _simCountsA.fill(0);
  _simCountsB.fill(0);
  for (const t of a.blobTypes) _simCountsA[t]++;
  for (const t of b.blobTypes) _simCountsB[t]++;
  let overlap = 0;
  let total = Math.max(a.blobTypes.length, b.blobTypes.length);
  for (let i = 0; i < BLOB_TYPE_COUNT; i++) {
    overlap += Math.min(_simCountsA[i], _simCountsB[i]);
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
  const leaderMinSim = Math.max(FLOCK_MIN_SIMILARITY, FLOCK_LEADER_MIN_SIMILARITY);
  const followRange2 = FLOCK_LEADER_FOLLOW_RANGE * FLOCK_LEADER_FOLLOW_RANGE;
  const splitDist2 = FLOCK_LEADER_SPLIT_DISTANCE * FLOCK_LEADER_SPLIT_DISTANCE;
  const targetReach2 = Math.pow(FLOCK_LEADER_TARGET_RADIUS * 0.25, 2);
  const minTarget = FLOCK_LEADER_TARGET_RADIUS * 0.4;
  const maxTarget = FLOCK_LEADER_TARGET_RADIUS;
  const edgeMin = BOUNDARY_PADDING + FLOCK_LEADER_EDGE_MARGIN;
  const edgeMax = WORLD_SIZE - BOUNDARY_PADDING - FLOCK_LEADER_EDGE_MARGIN;

  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    _isLeader[ci] = 0;
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

    // Accumulate similarity-weighted center of mass + best food/threat from kin
    let comX = 0, comY = 0, totalWeight = 0, neighborCount = 0;
    let bestFoodX = 0, bestFoodY = 0, bestFoodDist2 = Infinity;
    let alarmThreatX = 0, alarmThreatY = 0, alarmThreatDist2 = Infinity;
    const selfWantsFood = _wantsFood[ci] === 1;
    const selfFoundFood = selfWantsFood ? _hasSensedFood[ci] : 1;
    const selfFoundThreat = _hasSensedThreat[ci] || _fearTimer[ci] > 0;
    let bestLeader = ci;
    let bestLeaderStrength = genome.adhesionStrength;
    let bestLeaderDist2 = 0;
    let isKinCluster = false;

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
      isKinCluster = true;

      // Use other creature's core position
      const otherCoreIdx = world.creatureBlobs[world.creatureBlobStart[otherCi]];
      const cdx = world.blobX[otherCoreIdx] - cx;
      const cdy = world.blobY[otherCoreIdx] - cy;
      const cd2 = cdx * cdx + cdy * cdy;
      comX += world.blobX[otherCoreIdx] * sim;
      comY += world.blobY[otherCoreIdx] * sim;
      totalWeight += sim;
      neighborCount++;

      // Soft leader election among sufficiently similar kin.
      if (sim >= leaderMinSim) {
        const otherStrength = otherGenome.adhesionStrength;
        if (
          otherStrength > bestLeaderStrength ||
          (otherStrength === bestLeaderStrength && otherCi < bestLeader)
        ) {
          bestLeader = otherCi;
          bestLeaderStrength = otherStrength;
          bestLeaderDist2 = cd2;
        }
      }

      // Shared food sensing: if this creature hasn't found food, pick up kin's food target
      if (!selfFoundFood && _wantsFood[otherCi] === 1 && _hasSensedFood[otherCi]) {
        const fdx = _sensedFoodX[otherCi] - cx;
        const fdy = _sensedFoodY[otherCi] - cy;
        const fd2 = fdx * fdx + fdy * fdy;
        if (fd2 < bestFoodDist2) {
          bestFoodDist2 = fd2;
          bestFoodX = _sensedFoodX[otherCi];
          bestFoodY = _sensedFoodY[otherCi];
        }
      }

      // Alarm signaling: if this creature hasn't detected a threat, pick up kin's threat
      if (!selfFoundThreat && _hasSensedThreat[otherCi]) {
        const tdx = _sensedThreatX[otherCi] - cx;
        const tdy = _sensedThreatY[otherCi] - cy;
        const td2 = tdx * tdx + tdy * tdy;
        if (td2 < alarmThreatDist2) {
          alarmThreatDist2 = td2;
          alarmThreatX = _sensedThreatX[otherCi];
          alarmThreatY = _sensedThreatY[otherCi];
        }
      }
    });

    // Write kin score for metabolism discount
    _kinScore[ci] = totalWeight;

    // --- Leader assignment / maintenance ---
    if (_leaderTimer[ci] > 0) _leaderTimer[ci]--;
    const currentLeader = _leaderId[ci];
    let needReassign = _leaderTimer[ci] <= 0 || currentLeader < 0 || !world.creatureAlive[currentLeader];
    if (!needReassign && currentLeader !== ci) {
      const leaderCoreIdx = world.creatureBlobs[world.creatureBlobStart[currentLeader]];
      const ldx = world.blobX[leaderCoreIdx] - cx;
      const ldy = world.blobY[leaderCoreIdx] - cy;
      const ld2 = ldx * ldx + ldy * ldy;
      if (ld2 > splitDist2) needReassign = true;
    }

    if (needReassign) {
      _leaderId[ci] = bestLeader;
      _leaderTimer[ci] = FLOCK_LEADER_REASSIGN_TICKS;
    }

    const leader = _leaderId[ci];
    if (leader >= 0 && world.creatureAlive[leader]) {
      _isLeader[leader] = 1;
    }

    // Alarm signaling: kin detected threat → trigger fear and flee
    if (!selfFoundThreat && alarmThreatDist2 < Infinity) {
      _fearTimer[ci] = FEAR_DURATION;
      _fearThreatX[ci] = alarmThreatX;
      _fearThreatY[ci] = alarmThreatY;

      const tdx = alarmThreatX - cx;
      const tdy = alarmThreatY - cy;
      const fleeHeading = Math.atan2(-tdy, -tdx);
      let diff = fleeHeading - world.creatureHeading[ci];
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      world.creatureHeading[ci] += diff * 0.5; // strong alarm response — visible stampede
    }

    // --- Leader roam target maintenance (leader only) ---
    if (_isLeader[ci]) {
      if (_leaderTargetTimer[ci] > 0) _leaderTargetTimer[ci]--;
      const tx = _leaderTargetX[ci];
      const ty = _leaderTargetY[ci];
      const tdx = tx - cx;
      const tdy = ty - cy;
      const td2 = tdx * tdx + tdy * tdy;

      if (_leaderTargetTimer[ci] <= 0 || td2 < targetReach2) {
        const heading = world.creatureHeading[ci] + (Math.random() - 0.5) * 2 * FLOCK_LEADER_WANDER_JITTER;
        const dist = minTarget + Math.random() * (maxTarget - minTarget);
        const ntx = cx + Math.cos(heading) * dist;
        const nty = cy + Math.sin(heading) * dist;
        _leaderTargetX[ci] = Math.max(edgeMin, Math.min(edgeMax, ntx));
        _leaderTargetY[ci] = Math.max(edgeMin, Math.min(edgeMax, nty));
        _leaderTargetTimer[ci] = FLOCK_LEADER_TARGET_REASSIGN_TICKS;
      }
    }

    // --- Leader-follow roaming (fear always overrides) ---
    if (_fearTimer[ci] <= 0 && leader >= 0 && world.creatureAlive[leader]) {
      let targetX = _leaderTargetX[leader];
      let targetY = _leaderTargetY[leader];
      if (_leaderTargetTimer[leader] <= 0) {
        const leaderCoreIdx = world.creatureBlobs[world.creatureBlobStart[leader]];
        targetX = world.blobX[leaderCoreIdx];
        targetY = world.blobY[leaderCoreIdx];
      }
      const ldx = targetX - cx;
      const ldy = targetY - cy;
      const ld2 = ldx * ldx + ldy * ldy;
      if (ld2 > FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND && ld2 < followRange2) {
        const leaderHeading = Math.atan2(ldy, ldx);
        let diff = leaderHeading - world.creatureHeading[ci];
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        // For tiny/no-kin groups, reduce influence so lone creatures don't lock too hard.
        const kinMult = isKinCluster ? 1.0 : 0.5;
        world.creatureHeading[ci] += diff * FLOCK_LEADER_INFLUENCE * kinMult;
      }
    }

    // Shared food sensing: nudge heading toward kin's food target (only if not fleeing)
    if (!selfFoundFood && _fearTimer[ci] <= 0 && bestFoodDist2 > FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND && bestFoodDist2 < Infinity) {
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
