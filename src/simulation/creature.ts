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
  MAX_CREATURES,
  KIN_METABOLISM_DISCOUNT,
  CLAN_HERD_RANGE, CLAN_HERD_ENTER_QUORUM, CLAN_HERD_EXIT_QUORUM, CLAN_HERD_LOCK_TICKS,
  CLAN_BOND_TICKS, CLAN_COHESION_WEIGHT, CLAN_ALIGNMENT_WEIGHT, CLAN_LEADER_WEIGHT,
  CLAN_FOOD_WEIGHT_CALM, CLAN_FOOD_WEIGHT_HUNGRY, CLAN_HUNGER_OVERRIDE_THRESHOLD,
  CLAN_BOND_COHESION_MULT, CLAN_BOND_ALIGNMENT_MULT, CLAN_BOND_LEADER_MULT, CLAN_BOND_FOOD_MULT,
  CLAN_LEADER_REASSIGN_TICKS, CLAN_LEADER_TARGET_REASSIGN_TICKS, CLAN_LEADER_TARGET_RADIUS,
  CLAN_LEADER_FOLLOW_RANGE, CLAN_LEADER_SPLIT_DISTANCE, CLAN_LEADER_WANDER_JITTER,
  CLAN_LEADER_EDGE_MARGIN, CLAN_LEADER_DENSITY_WEIGHT,
  PACK_JOIN_LOCK_TICKS, PACK_LEAVE_ISOLATION_TICKS, PACK_SEEK_WEIGHT, PACK_SEEK_MIN_DISTANCE,
  PACK_PERSISTENT_COHESION_WEIGHT, PACK_PERSISTENT_ALIGNMENT_WEIGHT,
  PACK_MERGE_CONTACT_TICKS, PACK_MERGE_DISTANCE, PACK_MERGE_CONTACT_MIN_NEIGHBORS, PACK_MERGE_COOLDOWN_TICKS,
  PACK_HERD_PRIORITY_MULT, PACK_REJOIN_FORCE, PACK_REJOIN_MAX_DIST, PACK_REJOIN_HUNGER_GATE, PACK_CONTACT_RECOVERY_TICKS,
  PACK_ANTI_MILL_TANGENTIAL_DAMP, PACK_ANTI_MILL_RADIAL_PULL, PACK_ANTI_MILL_MIN_RADIUS, PACK_ANTI_MILL_MAX_RADIUS,
  PACK_ANTI_MILL_ACTIVATION_NEIGHBORS, PACK_ANTI_MILL_RECOVERY_TICKS, PACK_FORWARD_DRIFT_WEIGHT, PACK_CENTROID_DAMP_WHEN_CROWDED,
  PACK_ANTI_MILL_VELOCITY_DAMP, PACK_ANTI_MILL_FORCE_TANGENTIAL_SPEED, PACK_ANTI_MILL_FORCE_FORWARD_BIAS,
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

interface SpawnCreatureOptions {
  clanId?: number;
  packId?: number;
  parentA?: number;
  parentB?: number;
}

export function spawnCreature(
  world: World,
  x: number,
  y: number,
  genome?: Genome,
  opts?: SpawnCreatureOptions,
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
  world.creatureClanId[ci] = resolveChildClan(world, x, y, opts);
  world.creatureClanBornTick[ci] = world.tick;
  world.creaturePackId[ci] = resolveChildPack(world, x, y, opts);

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
  _herdMode[ci] = 0;
  _herdTimer[ci] = 0;
  _herdBondTimer[ci] = 0;
  _packJoinLockTimer[ci] = PACK_JOIN_LOCK_TICKS;
  _packIsolationTimer[ci] = 0;
  _packSeekTimer[ci] = 0;
  _packMergeCandidate[ci] = -1;
  _packMergeContactTicks[ci] = 0;
  _packMergeCooldown[ci] = 0;
  _packContactRecoveryTimer[ci] = 0;
  _packAntiMillTimer[ci] = 0;

  // Build constraints: star (all to core) + ring (adjacent)
  buildConstraints(world, ci, blobIndices);

  world.totalBirths++;
  return ci;
}

function resolveChildClan(world: World, x: number, y: number, opts?: SpawnCreatureOptions): number {
  if (opts?.clanId !== undefined && opts.clanId >= 0) return opts.clanId;

  const parentA = opts?.parentA ?? -1;
  const parentB = opts?.parentB ?? -1;
  const hasParentA = parentA >= 0 && world.creatureAlive[parentA];
  const hasParentB = parentB >= 0 && world.creatureAlive[parentB];

  if (hasParentA && hasParentB) {
    const aCore = world.creatureBlobs[world.creatureBlobStart[parentA]];
    const bCore = world.creatureBlobs[world.creatureBlobStart[parentB]];
    const adx = world.blobX[aCore] - x;
    const ady = world.blobY[aCore] - y;
    const bdx = world.blobX[bCore] - x;
    const bdy = world.blobY[bCore] - y;
    const pick = (adx * adx + ady * ady) <= (bdx * bdx + bdy * bdy) ? parentA : parentB;
    const clan = world.creatureClanId[pick];
    if (clan >= 0) return clan;
  }

  if (hasParentA) {
    const clan = world.creatureClanId[parentA];
    if (clan >= 0) return clan;
  }

  if (hasParentB) {
    const clan = world.creatureClanId[parentB];
    if (clan >= 0) return clan;
  }

  return world.allocClanId();
}

function resolveChildPack(world: World, x: number, y: number, opts?: SpawnCreatureOptions): number {
  if (opts?.packId !== undefined && opts.packId >= 0) return opts.packId;

  const parentA = opts?.parentA ?? -1;
  const parentB = opts?.parentB ?? -1;
  const hasParentA = parentA >= 0 && world.creatureAlive[parentA];
  const hasParentB = parentB >= 0 && world.creatureAlive[parentB];

  if (hasParentA && hasParentB) {
    const aCore = world.creatureBlobs[world.creatureBlobStart[parentA]];
    const bCore = world.creatureBlobs[world.creatureBlobStart[parentB]];
    const adx = world.blobX[aCore] - x;
    const ady = world.blobY[aCore] - y;
    const bdx = world.blobX[bCore] - x;
    const bdy = world.blobY[bCore] - y;
    const pick = (adx * adx + ady * ady) <= (bdx * bdx + bdy * bdy) ? parentA : parentB;
    const pack = world.creaturePackId[pick];
    if (pack >= 0) return pack;
  }

  if (hasParentA) {
    const pack = world.creaturePackId[parentA];
    if (pack >= 0) return pack;
  }

  if (hasParentB) {
    const pack = world.creaturePackId[parentB];
    if (pack >= 0) return pack;
  }

  return world.allocPackId();
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
const _steerX = new Float32Array(MAX_CREATURES);
const _steerY = new Float32Array(MAX_CREATURES);
const _steerForce = new Uint8Array(MAX_CREATURES);
const _herdMode = new Uint8Array(MAX_CREATURES);
const _herdTimer = new Int32Array(MAX_CREATURES);
const _herdBondTimer = new Int32Array(MAX_CREATURES);
const _packJoinLockTimer = new Int32Array(MAX_CREATURES);
const _packIsolationTimer = new Int32Array(MAX_CREATURES);
const _packSeekTimer = new Int32Array(MAX_CREATURES);
const _packMergeCandidate = new Int32Array(MAX_CREATURES).fill(-1);
const _packMergeContactTicks = new Int32Array(MAX_CREATURES);
const _packMergeCooldown = new Int32Array(MAX_CREATURES);
const _packContactRecoveryTimer = new Int32Array(MAX_CREATURES);
const _packAntiMillTimer = new Int32Array(MAX_CREATURES);

type PackStats = { size: number; sumX: number; sumY: number; clanId: number };
const _packStats = new Map<number, PackStats>();

export function clearSteering(world: World) {
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    _steerX[ci] = 0;
    _steerY[ci] = 0;
    _steerForce[ci] = 0;
  }
}

function addSteer(ci: number, dx: number, dy: number, weight: number) {
  if (_steerForce[ci]) return;
  _steerX[ci] += dx * weight;
  _steerY[ci] += dy * weight;
}

function forceSteer(ci: number, dx: number, dy: number, weight = 1.0) {
  _steerX[ci] = dx * weight;
  _steerY[ci] = dy * weight;
  _steerForce[ci] = 1;
}

export function applySteering(world: World) {
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    const sx = _steerX[ci];
    const sy = _steerY[ci];
    const mag2 = sx * sx + sy * sy;
    if (mag2 < 1e-6) continue;
    world.creatureHeading[ci] = Math.atan2(sy, sx);
  }
}

export function isBondedHerdPair(world: World, ci: number, cj: number): boolean {
  if (ci < 0 || cj < 0 || ci === cj) return false;
  if (!world.creatureAlive[ci] || !world.creatureAlive[cj]) return false;
  const clanA = world.creatureClanId[ci];
  const clanB = world.creatureClanId[cj];
  if (clanA < 0 || clanA !== clanB) return false;
  const packA = world.creaturePackId[ci];
  const packB = world.creaturePackId[cj];
  if (packA < 0 || packA !== packB) return false;
  if (_fearTimer[ci] > 0 || _fearTimer[cj] > 0) return false;
  return true;
}

export function notePackMemberCollision(world: World, ci: number, cj: number): void {
  if (ci < 0 || cj < 0 || ci === cj) return;
  if (!world.creatureAlive[ci] || !world.creatureAlive[cj]) return;
  if (world.creaturePackId[ci] < 0 || world.creaturePackId[ci] !== world.creaturePackId[cj]) return;
  if (world.creatureClanId[ci] < 0 || world.creatureClanId[ci] !== world.creatureClanId[cj]) return;
  _packContactRecoveryTimer[ci] = PACK_CONTACT_RECOVERY_TICKS;
  _packContactRecoveryTimer[cj] = PACK_CONTACT_RECOVERY_TICKS;
  _packAntiMillTimer[ci] = PACK_ANTI_MILL_RECOVERY_TICKS;
  _packAntiMillTimer[cj] = PACK_ANTI_MILL_RECOVERY_TICKS;
}

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
    const energyFrac = world.creatureEnergy[ci] / Math.max(1, maxEnergy);
    const hungryForFood = energyFrac <= CLAN_HUNGER_OVERRIDE_THRESHOLD;
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

    // --- Steering intent emission (resolved once in applySteering) ---
    if (_hasWeapon[ci]) {
      // Weapon-bearers: close chase > far flock hunt > seek food
      if (_nearPrey[ci]) {
        addSteer(ci, _preyTargetX[ci] - cx, _preyTargetY[ci] - cy, hasSensor ? 1.0 : 0.7);
      } else if (_hasHuntTarget[ci]) {
        addSteer(ci, _huntTargetX[ci] - cx, _huntTargetY[ci] - cy, hasSensor ? 0.7 : 0.5);
      } else if (wantsFood && found) {
        const dx = nearestX - cx;
        const dy = nearestY - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND) {
          addSteer(ci, dx, dy, hungryForFood ? 0.35 : 0.12);
        }
      }
    } else {
      // Non-weapon: fear/flee is hard override, then food intent
      if (foundThreat) {
        _fearTimer[ci] = FEAR_DURATION;
        _fearThreatX[ci] = threatX;
        _fearThreatY[ci] = threatY;
        forceSteer(ci, cx - threatX, cy - threatY, hasSensor ? 1.0 : 0.85);
      } else if (_fearTimer[ci] > 0) {
        _fearTimer[ci]--;
        forceSteer(ci, cx - _fearThreatX[ci], cy - _fearThreatY[ci], hasSensor ? 0.9 : 0.75);
      } else if (wantsFood && found) {
        const dx = nearestX - cx;
        const dy = nearestY - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND) {
          addSteer(ci, dx, dy, hungryForFood ? 0.28 : 0.08);
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

      const childCi = spawnCreature(world, spawnX, spawnY, childGenome, { parentA: ci, parentB: bestMate });
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

        const childCi = spawnCreature(world, cx, cy, childGenome, { parentA: ci });
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

// --- Clan-based flocking ---

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

function rebuildPackStats(world: World): void {
  _packStats.clear();
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    const packId = world.creaturePackId[ci];
    if (packId < 0) continue;
    const coreIdx = world.creatureBlobs[world.creatureBlobStart[ci]];
    const x = world.blobX[coreIdx];
    const y = world.blobY[coreIdx];
    let stats = _packStats.get(packId);
    if (!stats) {
      stats = { size: 0, sumX: 0, sumY: 0, clanId: world.creatureClanId[ci] };
      _packStats.set(packId, stats);
    }
    stats.size++;
    stats.sumX += x;
    stats.sumY += y;
  }
}

function joinPack(world: World, ci: number, packId: number): void {
  if (!world.creatureAlive[ci]) return;
  if (packId < 0) return;
  world.creaturePackId[ci] = packId;
  _packJoinLockTimer[ci] = PACK_JOIN_LOCK_TICKS;
  _packIsolationTimer[ci] = 0;
  _packSeekTimer[ci] = 0;
  _packMergeCandidate[ci] = -1;
  _packMergeContactTicks[ci] = 0;
  _packContactRecoveryTimer[ci] = 0;
  _packAntiMillTimer[ci] = 0;
}

function mergePacks(world: World, fromPack: number, toPack: number): void {
  if (fromPack < 0 || toPack < 0 || fromPack === toPack) return;
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    if (world.creaturePackId[ci] !== fromPack) continue;
    world.creaturePackId[ci] = toPack;
    _packJoinLockTimer[ci] = PACK_JOIN_LOCK_TICKS;
    _packIsolationTimer[ci] = 0;
    _packMergeCooldown[ci] = PACK_MERGE_COOLDOWN_TICKS;
    _packMergeCandidate[ci] = -1;
    _packMergeContactTicks[ci] = 0;
    _packContactRecoveryTimer[ci] = PACK_CONTACT_RECOVERY_TICKS;
    _packAntiMillTimer[ci] = PACK_ANTI_MILL_RECOVERY_TICKS;
  }
}

/** Apply clan-based flocking, shared sensing, and compute kin scores. */
export function updateFlocking(world: World, spatialHash: SpatialHash): void {
  rebuildPackStats(world);

  // Bump generation; wrap to avoid overflow (Uint8 max 255)
  _visitedGeneration++;
  if (_visitedGeneration > 250) {
    _visited.fill(0);
    _visitedGeneration = 1;
  }
  const gen = _visitedGeneration;
  const followRange2 = CLAN_LEADER_FOLLOW_RANGE * CLAN_LEADER_FOLLOW_RANGE;
  const splitDist2 = CLAN_LEADER_SPLIT_DISTANCE * CLAN_LEADER_SPLIT_DISTANCE;
  const targetReach2 = Math.pow(CLAN_LEADER_TARGET_RADIUS * 0.25, 2);
  const minTarget = CLAN_LEADER_TARGET_RADIUS * 0.4;
  const maxTarget = CLAN_LEADER_TARGET_RADIUS;
  const edgeMin = BOUNDARY_PADDING + CLAN_LEADER_EDGE_MARGIN;
  const edgeMax = WORLD_SIZE - BOUNDARY_PADDING - CLAN_LEADER_EDGE_MARGIN;
  const edgeEscapeBand = BOUNDARY_PADDING + CLAN_LEADER_EDGE_MARGIN * 0.65;
  const edgeEscapeMax = WORLD_SIZE - edgeEscapeBand;
  const centerX = WORLD_SIZE * 0.5;
  const centerY = WORLD_SIZE * 0.5;
  const packSeekMinDist2 = PACK_SEEK_MIN_DISTANCE * PACK_SEEK_MIN_DISTANCE;
  const packRejoinMaxDist2 = PACK_REJOIN_MAX_DIST * PACK_REJOIN_MAX_DIST;
  const packMergeDist2 = PACK_MERGE_DISTANCE * PACK_MERGE_DISTANCE;
  const antiMillMinRadius2 = PACK_ANTI_MILL_MIN_RADIUS * PACK_ANTI_MILL_MIN_RADIUS;
  const antiMillMaxRadius2 = PACK_ANTI_MILL_MAX_RADIUS * PACK_ANTI_MILL_MAX_RADIUS;

  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    _isLeader[ci] = 0;
    _kinScore[ci] = 0;
  }

  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;

    const genome = world.creatureGenome[ci]!;

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
    const clanId = world.creatureClanId[ci];
    if (clanId < 0) continue;
    let packId = world.creaturePackId[ci];
    if (packId < 0) {
      packId = world.allocPackId();
      joinPack(world, ci, packId);
    }

    if (_packJoinLockTimer[ci] > 0) _packJoinLockTimer[ci]--;
    if (_packSeekTimer[ci] > 0) _packSeekTimer[ci]--;
    if (_packMergeCooldown[ci] > 0) _packMergeCooldown[ci]--;
    if (_packContactRecoveryTimer[ci] > 0) _packContactRecoveryTimer[ci]--;
    if (_packAntiMillTimer[ci] > 0) _packAntiMillTimer[ci]--;

    // Accumulate center-of-mass + alignment + best food/threat from same pack
    let comX = 0;
    let comY = 0;
    let samePackCount = 0;
    let alignX = Math.cos(world.creatureHeading[ci]);
    let alignY = Math.sin(world.creatureHeading[ci]);
    let alignWeight = 1;
    let bestFoodX = 0, bestFoodY = 0, bestFoodDist2 = Infinity;
    let alarmThreatX = 0, alarmThreatY = 0, alarmThreatDist2 = Infinity;
    let bestOtherPack = -1;
    let bestOtherPackDist2 = Infinity;
    let otherPackContactNeighbors = 0;
    const selfWantsFood = _wantsFood[ci] === 1;
    const selfFoundFood = selfWantsFood ? _hasSensedFood[ci] : 1;
    const selfFoundThreat = _hasSensedThreat[ci] || _fearTimer[ci] > 0;
    const energyFrac = world.creatureEnergy[ci] / Math.max(1, world.creatureMaxEnergy[ci]);
    const hungryForFood = energyFrac <= CLAN_HUNGER_OVERRIDE_THRESHOLD;
    const hardHungry = energyFrac <= PACK_REJOIN_HUNGER_GATE;
    const recoveryBoost = _packContactRecoveryTimer[ci] > 0 ? 1.45 : 1.0;
    const packPriority = PACK_HERD_PRIORITY_MULT * recoveryBoost;
    let bestLeader = ci;
    let bestLeaderScore = genome.adhesionStrength + energyFrac + Math.min(_localCrowd[ci], 12) * CLAN_LEADER_DENSITY_WEIGHT;

    // Mark self as visited
    _visited[ci] = gen;

    // Query spatial hash for nearby blobs
    spatialHash.query(cx, cy, CLAN_HERD_RANGE, (blobIdx) => {
      const otherCi = world.blobCreature[blobIdx];
      if (otherCi < 0 || _visited[otherCi] === gen) return;
      _visited[otherCi] = gen;
      if (!world.creatureAlive[otherCi]) return;
      if (world.creatureClanId[otherCi] !== clanId) return;
      const otherPack = world.creaturePackId[otherCi];
      if (otherPack < 0) return;

      // Use other creature's core position
      const otherCoreIdx = world.creatureBlobs[world.creatureBlobStart[otherCi]];
      const ox = world.blobX[otherCoreIdx];
      const oy = world.blobY[otherCoreIdx];
      const cdx = ox - cx;
      const cdy = oy - cy;
      const cd2 = cdx * cdx + cdy * cdy;

      if (otherPack === packId) {
        comX += ox;
        comY += oy;
        samePackCount++;
        alignX += Math.cos(world.creatureHeading[otherCi]);
        alignY += Math.sin(world.creatureHeading[otherCi]);
        alignWeight++;

        const otherGenome = world.creatureGenome[otherCi];
        if (otherGenome) {
          const otherEnergyFrac = world.creatureEnergy[otherCi] / Math.max(1, world.creatureMaxEnergy[otherCi]);
          const otherScore = otherGenome.adhesionStrength + otherEnergyFrac + Math.min(_localCrowd[otherCi], 12) * CLAN_LEADER_DENSITY_WEIGHT;
          if (otherScore > bestLeaderScore || (otherScore === bestLeaderScore && otherCi < bestLeader)) {
            bestLeader = otherCi;
            bestLeaderScore = otherScore;
          }
        }

        // Shared food sensing
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
      } else {
        if (cd2 < bestOtherPackDist2) {
          bestOtherPackDist2 = cd2;
          bestOtherPack = otherPack;
        }
        if (cd2 <= packMergeDist2) {
          otherPackContactNeighbors++;
        }
      }

      // Alarm signaling: if this creature hasn't detected a threat, pick up clanmate threat
      if (!selfFoundThreat && (_hasSensedThreat[otherCi] || _fearTimer[otherCi] > 0)) {
        const tx = _hasSensedThreat[otherCi] ? _sensedThreatX[otherCi] : _fearThreatX[otherCi];
        const ty = _hasSensedThreat[otherCi] ? _sensedThreatY[otherCi] : _fearThreatY[otherCi];
        const tdx = tx - cx;
        const tdy = ty - cy;
        const td2 = tdx * tdx + tdy * tdy;
        if (td2 < alarmThreatDist2) {
          alarmThreatDist2 = td2;
          alarmThreatX = tx;
          alarmThreatY = ty;
        }
      }
    });

    // Write kin score for metabolism discount
    _kinScore[ci] = Math.min(2, samePackCount * 0.33);
    if (_herdBondTimer[ci] > 0) _herdBondTimer[ci]--;
    if (_herdTimer[ci] > 0) _herdTimer[ci]--;

    if (samePackCount === 0) _packIsolationTimer[ci]++;
    else _packIsolationTimer[ci] = 0;

    // Pack switching: only after sustained isolation (or singleton pack) and not during join lock.
    const currentPackStats = _packStats.get(packId);
    const currentPackSize = currentPackStats?.size ?? 1;
    if (
      bestOtherPack >= 0 &&
      bestOtherPack !== packId &&
      _packJoinLockTimer[ci] <= 0 &&
      _packContactRecoveryTimer[ci] <= 0 &&
      (_packIsolationTimer[ci] >= PACK_LEAVE_ISOLATION_TICKS || currentPackSize <= 1)
    ) {
      joinPack(world, ci, bestOtherPack);
      packId = bestOtherPack;
      bestLeader = ci;
      samePackCount = 0;
    }

    // --- Herd mode hysteresis ---
    if (_herdMode[ci]) {
      if (samePackCount <= CLAN_HERD_EXIT_QUORUM && _herdTimer[ci] <= 0) {
        _herdMode[ci] = 0;
      }
    } else if (samePackCount >= CLAN_HERD_ENTER_QUORUM) {
      _herdMode[ci] = 1;
      _herdTimer[ci] = CLAN_HERD_LOCK_TICKS;
      _herdBondTimer[ci] = CLAN_BOND_TICKS;
    }

    // --- Leader assignment / maintenance ---
    if (_leaderTimer[ci] > 0) _leaderTimer[ci]--;
    const currentLeader = _leaderId[ci];
    let needReassign = _leaderTimer[ci] <= 0 || currentLeader < 0 || !world.creatureAlive[currentLeader];
    if (!needReassign && currentLeader !== ci) {
      if (world.creatureClanId[currentLeader] !== clanId) {
        needReassign = true;
      }
      if (world.creaturePackId[currentLeader] !== packId) {
        needReassign = true;
      }
      const leaderCoreIdx = world.creatureBlobs[world.creatureBlobStart[currentLeader]];
      const ldx = world.blobX[leaderCoreIdx] - cx;
      const ldy = world.blobY[leaderCoreIdx] - cy;
      const ld2 = ldx * ldx + ldy * ldy;
      if (ld2 > splitDist2) needReassign = true;
    }

    if (needReassign) {
      _leaderId[ci] = samePackCount > 0 ? bestLeader : ci;
      _leaderTimer[ci] = _herdMode[ci] ? Math.floor(CLAN_LEADER_REASSIGN_TICKS * 1.2) : CLAN_LEADER_REASSIGN_TICKS;
    }

    const leader = _leaderId[ci];
    if (
      leader >= 0 &&
      world.creatureAlive[leader] &&
      world.creatureClanId[leader] === clanId &&
      world.creaturePackId[leader] === packId
    ) {
      _isLeader[leader] = 1;
    }

    // Alarm signaling: clanmate detected threat -> trigger fear and flee
    if (!selfFoundThreat && alarmThreatDist2 < Infinity) {
      _fearTimer[ci] = FEAR_DURATION;
      _fearThreatX[ci] = alarmThreatX;
      _fearThreatY[ci] = alarmThreatY;
      forceSteer(ci, cx - alarmThreatX, cy - alarmThreatY, 0.95);
    }
    if (_fearTimer[ci] > 0) continue;

    // Keep herds from settling into corners by applying inward steering near boundaries.
    let edgePushX = 0;
    let edgePushY = 0;
    if (cx < edgeEscapeBand) edgePushX += (edgeEscapeBand - cx) / Math.max(1, edgeEscapeBand - BOUNDARY_PADDING);
    else if (cx > edgeEscapeMax) edgePushX -= (cx - edgeEscapeMax) / Math.max(1, (WORLD_SIZE - BOUNDARY_PADDING) - edgeEscapeMax);
    if (cy < edgeEscapeBand) edgePushY += (edgeEscapeBand - cy) / Math.max(1, edgeEscapeBand - BOUNDARY_PADDING);
    else if (cy > edgeEscapeMax) edgePushY -= (cy - edgeEscapeMax) / Math.max(1, (WORLD_SIZE - BOUNDARY_PADDING) - edgeEscapeMax);
    const edgePushMag2 = edgePushX * edgePushX + edgePushY * edgePushY;
    if (edgePushMag2 > 1e-6) {
      const edgePushMag = Math.sqrt(edgePushMag2);
      addSteer(ci, edgePushX / edgePushMag, edgePushY / edgePushMag, 1.25 + (_herdMode[ci] ? 0.25 : 0));
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
        const heading = world.creatureHeading[ci] + (Math.random() - 0.5) * 2 * CLAN_LEADER_WANDER_JITTER;
        const dist = minTarget + Math.random() * (maxTarget - minTarget);
        let dirX = Math.cos(heading);
        let dirY = Math.sin(heading);

        // When near boundaries, bias leader targets toward map interior.
        if (cx < edgeMin || cx > edgeMax || cy < edgeMin || cy > edgeMax) {
          const toCenterX = centerX - cx;
          const toCenterY = centerY - cy;
          const toCenterMag = Math.hypot(toCenterX, toCenterY);
          if (toCenterMag > 1e-6) {
            dirX = dirX * 0.25 + (toCenterX / toCenterMag) * 0.75;
            dirY = dirY * 0.25 + (toCenterY / toCenterMag) * 0.75;
          }
        }
        const dirMag = Math.hypot(dirX, dirY);
        if (dirMag > 1e-6) {
          dirX /= dirMag;
          dirY /= dirMag;
        }

        const ntx = cx + dirX * dist;
        const nty = cy + dirY * dist;
        _leaderTargetX[ci] = Math.max(edgeMin, Math.min(edgeMax, ntx));
        _leaderTargetY[ci] = Math.max(edgeMin, Math.min(edgeMax, nty));
        _leaderTargetTimer[ci] = _herdMode[ci] ? Math.floor(CLAN_LEADER_TARGET_REASSIGN_TICKS * 1.25) : CLAN_LEADER_TARGET_REASSIGN_TICKS;
      }
    }

    // --- Leader-follow roaming ---
    if (
      leader >= 0 &&
      world.creatureAlive[leader] &&
      world.creatureClanId[leader] === clanId &&
      world.creaturePackId[leader] === packId
    ) {
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
        const herdMult = _herdMode[ci] ? 1.2 : 1.0;
        const bondMult = _herdBondTimer[ci] > 0 ? CLAN_BOND_LEADER_MULT : 1.0;
        const hungerLeaderMult = hardHungry ? 0.55 : 1.0;
        addSteer(ci, ldx, ldy, CLAN_LEADER_WEIGHT * packPriority * herdMult * bondMult * hungerLeaderMult);
      }
    }

    let antiMillActive = false;
    if (samePackCount >= PACK_ANTI_MILL_ACTIVATION_NEIGHBORS) {
      const packStats = _packStats.get(packId);
      if (packStats && packStats.size > 1) {
        // Use centroid as anti-mill anchor to collapse ring structures.
        const anchorX = packStats.sumX / packStats.size;
        const anchorY = packStats.sumY / packStats.size;

        const ax = anchorX - cx;
        const ay = anchorY - cy;
        const ar2 = ax * ax + ay * ay;
        if (ar2 >= antiMillMinRadius2 && ar2 <= antiMillMaxRadius2) {
          _packAntiMillTimer[ci] = PACK_ANTI_MILL_RECOVERY_TICKS;
        }

        antiMillActive = _packAntiMillTimer[ci] > 0;
        if (antiMillActive && ar2 > 1e-6) {
          const ar = Math.sqrt(ar2);
          const rx = ax / ar;
          const ry = ay / ar;
          const tx = -ry;
          const ty = rx;

          const hx = Math.cos(world.creatureHeading[ci]);
          const hy = Math.sin(world.creatureHeading[ci]);
          const tangentComp = hx * tx + hy * ty;
          addSteer(ci, -tx * tangentComp, -ty * tangentComp, PACK_ANTI_MILL_TANGENTIAL_DAMP * packPriority);

          // Remove actual tangential Verlet velocity so rings collapse rapidly.
          const vx = world.blobX[coreIdx] - world.blobPrevX[coreIdx];
          const vy = world.blobY[coreIdx] - world.blobPrevY[coreIdx];
          const tanVel = vx * tx + vy * ty;
          if (Math.abs(tanVel) > 1e-4) {
            const damp = tanVel * PACK_ANTI_MILL_VELOCITY_DAMP;
            const nvx = vx - tx * damp;
            const nvy = vy - ty * damp;
            world.blobPrevX[coreIdx] = world.blobX[coreIdx] - nvx;
            world.blobPrevY[coreIdx] = world.blobY[coreIdx] - nvy;
          }

          // If orbit speed is strong, hard-override steering to break ring lock.
          if (Math.abs(tanVel) >= PACK_ANTI_MILL_FORCE_TANGENTIAL_SPEED) {
            let fdx = hx;
            let fdy = hy;
            if (
              leader >= 0 &&
              world.creatureAlive[leader] &&
              world.creatureClanId[leader] === clanId &&
              world.creaturePackId[leader] === packId
            ) {
              const leaderCoreIdx = world.creatureBlobs[world.creatureBlobStart[leader]];
              fdx = _leaderTargetX[leader] - world.blobX[leaderCoreIdx];
              fdy = _leaderTargetY[leader] - world.blobY[leaderCoreIdx];
              const fm2 = fdx * fdx + fdy * fdy;
              if (fm2 > 1e-6) {
                const fm = Math.sqrt(fm2);
                fdx /= fm;
                fdy /= fm;
              } else {
                fdx = hx;
                fdy = hy;
              }
            }

            // inward + anti-tangent + small forward bias
            const antiTX = -tx * Math.sign(tanVel);
            let dirX = rx + antiTX + fdx * PACK_ANTI_MILL_FORCE_FORWARD_BIAS;
            let dirY = ry + (-ty * Math.sign(tanVel)) + fdy * PACK_ANTI_MILL_FORCE_FORWARD_BIAS;
            const dm2 = dirX * dirX + dirY * dirY;
            if (dm2 > 1e-6) {
              const dm = Math.sqrt(dm2);
              dirX /= dm;
              dirY /= dm;
              forceSteer(ci, dirX, dirY, 1.0);
            }
          }

          const crowdFactor = Math.min(1, samePackCount / 12);
          const radialWeight = PACK_ANTI_MILL_RADIAL_PULL * Math.max(0.2, 1 - PACK_CENTROID_DAMP_WHEN_CROWDED * crowdFactor);
          addSteer(ci, rx, ry, radialWeight * packPriority);

          let fdx = 0;
          let fdy = 0;
          if (
            leader >= 0 &&
            world.creatureAlive[leader] &&
            world.creatureClanId[leader] === clanId &&
            world.creaturePackId[leader] === packId
          ) {
            const leaderCoreIdx = world.creatureBlobs[world.creatureBlobStart[leader]];
            fdx = _leaderTargetX[leader] - world.blobX[leaderCoreIdx];
            fdy = _leaderTargetY[leader] - world.blobY[leaderCoreIdx];
          } else {
            fdx = hx;
            fdy = hy;
          }
          const fm2 = fdx * fdx + fdy * fdy;
          if (fm2 > 1e-6) {
            const fm = Math.sqrt(fm2);
            addSteer(ci, fdx / fm, fdy / fm, PACK_FORWARD_DRIFT_WEIGHT * packPriority);
          }
        }
      }
    }

    // Long-range regroup: isolated members seek their pack centroid across the map.
    if (samePackCount === 0 && !hardHungry) {
      const stats = _packStats.get(packId);
      if (stats && stats.size > 1) {
        const anchorX = stats.sumX / stats.size;
        const anchorY = stats.sumY / stats.size;
        const pdx = anchorX - cx;
        const pdy = anchorY - cy;
        const pd2 = pdx * pdx + pdy * pdy;
        if (pd2 >= packSeekMinDist2 && pd2 <= packRejoinMaxDist2) {
          const packSizeMult = Math.min(1.4, 1 + Math.max(0, stats.size - 3) * 0.03);
          addSteer(ci, pdx, pdy, PACK_REJOIN_FORCE * packPriority * packSizeMult);
        }
      }
    }

    // Shared food sensing
    if (
      !selfFoundFood &&
      _packContactRecoveryTimer[ci] <= 0 &&
      !antiMillActive &&
      (hardHungry || samePackCount > 0) &&
      bestFoodDist2 > FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND &&
      bestFoodDist2 < Infinity
    ) {
      const fdx = bestFoodX - cx;
      const fdy = bestFoodY - cy;
      const bondFoodMult = _herdBondTimer[ci] > 0 ? CLAN_BOND_FOOD_MULT : 1.0;
      addSteer(ci, fdx, fdy, (hungryForFood ? CLAN_FOOD_WEIGHT_HUNGRY : CLAN_FOOD_WEIGHT_CALM) * bondFoodMult);
    }

    if (samePackCount === 0) continue;

    comX /= samePackCount;
    comY /= samePackCount;

    // Heading alignment is critical for non-dispersing flock motion.
    const avgAlignX = alignX / alignWeight;
    const avgAlignY = alignY / alignWeight;
    const alignMag2 = avgAlignX * avgAlignX + avgAlignY * avgAlignY;
    if (alignMag2 > 1e-6) {
      const herdMult = _herdMode[ci] ? 1.25 : 1.0;
      const bondMult = _herdBondTimer[ci] > 0 ? CLAN_BOND_ALIGNMENT_MULT : 1.0;
      addSteer(ci, avgAlignX, avgAlignY, (CLAN_ALIGNMENT_WEIGHT + PACK_PERSISTENT_ALIGNMENT_WEIGHT) * packPriority * herdMult * bondMult);
    }

    const dx = comX - cx;
    const dy = comY - cy;
    const dist2 = dx * dx + dy * dy;
    if (dist2 > 1) {
      const dist = Math.sqrt(dist2);
      const adhesionTrait = hasAdhesion ? (1 + genome.adhesionStrength) : (0.6 + genome.adhesionStrength * 0.4);
      const herdMult = _herdMode[ci] ? 1.25 : 1.0;
      const bondMult = _herdBondTimer[ci] > 0 ? CLAN_BOND_COHESION_MULT : 1.0;
      const cohesionWeight = (CLAN_COHESION_WEIGHT + PACK_PERSISTENT_COHESION_WEIGHT) * packPriority * adhesionTrait * herdMult * bondMult * Math.min(dist / CLAN_HERD_RANGE, 1.0);
      addSteer(ci, dx / dist, dy / dist, cohesionWeight);
    }

    // Sustained same-clan inter-pack contact triggers pack merge (smaller into larger).
    if (otherPackContactNeighbors >= PACK_MERGE_CONTACT_MIN_NEIGHBORS && bestOtherPack >= 0 && bestOtherPack !== packId) {
      if (_packMergeCandidate[ci] === bestOtherPack) _packMergeContactTicks[ci]++;
      else {
        _packMergeCandidate[ci] = bestOtherPack;
        _packMergeContactTicks[ci] = 1;
      }
    } else {
      _packMergeCandidate[ci] = -1;
      _packMergeContactTicks[ci] = 0;
    }

    if (
      _packMergeCandidate[ci] >= 0 &&
      _packMergeContactTicks[ci] >= PACK_MERGE_CONTACT_TICKS &&
      _packMergeCooldown[ci] <= 0 &&
      leader === ci
    ) {
      const otherPack = _packMergeCandidate[ci];
      const thisStats = _packStats.get(packId);
      const otherStats = _packStats.get(otherPack);
      if (thisStats && otherStats && thisStats.clanId === otherStats.clanId) {
        const mergeFrom = thisStats.size <= otherStats.size ? packId : otherPack;
        const mergeTo = mergeFrom === packId ? otherPack : packId;
        mergePacks(world, mergeFrom, mergeTo);
        rebuildPackStats(world);
      }
      _packMergeCandidate[ci] = -1;
      _packMergeContactTicks[ci] = 0;
      _packMergeCooldown[ci] = PACK_MERGE_COOLDOWN_TICKS;
    }
  }
}
