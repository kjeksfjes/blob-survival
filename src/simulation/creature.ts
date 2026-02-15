import { World } from './world';
import { SpatialHash } from './spatial-hash';
import { BLOB_TYPE_COUNT, BlobType, FoodKind, Genome } from '../types';
import { randomGenome, mutateGenome, crossoverGenome } from './genome';
import {
  BASE_BLOB_RADIUS, CORE_RADIUS_MULT, BLOB_MASS_BASE,
  SHIELD_MASS_MULT, FAT_MASS_MULT, STAR_REST_DISTANCE, RING_REST_DISTANCE,
  MOTOR_FORCE, SENSOR_RANGE, BASIC_FOOD_SENSE_RANGE, HUNGRY_FOOD_SENSE_MIN_RANGE, FOOD_TARGET_LOCK_TICKS, FOOD_TARGET_DEADBAND, FOOD_TARGET_NEAREST_SWITCH_DISTANCE,
  WEAPON_DAMAGE, WEAPON_ENERGY_COST, WEAPON_UPKEEP_PER_BLOB,
  MOUTH_EFFICIENCY, PHOTO_ENERGY_PER_TICK, FAT_ENERGY_BONUS,
  PHOTO_CROWD_PENALTY_NEIGHBORS_FULL, PHOTO_CROWD_PENALTY_MAX, PHOTO_IDLE_SPEED_SOFT_START, PHOTO_IDLE_SPEED_SOFT_FULL, PHOTO_IDLE_PENALTY_MIN_MULT,
  PHOTO_MAINTENANCE_COST_PER_BLOB, PHOTO_MAINTENANCE_SIZE_MULT,
  ADHESION_FORCE, ADHESION_RANGE, METABOLISM_COST_PER_BLOB, METABOLISM_SCALING_EXPONENT,
  CREATURE_BASE_ENERGY, WORLD_SIZE, BOUNDARY_PADDING, FOOD_ENERGY, FOOD_RADIUS, FOOD_STALE_TICKS,
  FOOD_GROWTH_MIN_MULT, FOOD_GROWTH_PEAK_MULT, FOOD_GROWTH_STALE_MULT, FOOD_GROWTH_PEAK_AGE_FRAC,
  MEAT_DECAY_MIN_MULT, MEAT_PREDATOR_EAT_EFFICIENCY_MULT, MEAT_STALE_TICKS,
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
  PACK_OFFSHOOT_CHANCE_ASEXUAL, PACK_OFFSHOOT_CHANCE_SEXUAL_SAME_PACK,
  PACK_JOIN_LOCK_TICKS, PACK_LEAVE_ISOLATION_TICKS, PACK_SEEK_WEIGHT, PACK_SEEK_MIN_DISTANCE,
  PACK_PERSISTENT_COHESION_WEIGHT, PACK_PERSISTENT_ALIGNMENT_WEIGHT,
  PACK_MERGE_CONTACT_TICKS, PACK_MERGE_DISTANCE, PACK_MERGE_CONTACT_MIN_NEIGHBORS, PACK_MERGE_COOLDOWN_TICKS, PACK_MERGE_MAX_SIZE_RATIO, PACK_MERGE_SMALL_PACK_MAX, PACK_MERGE_MAX_POP_FRACTION, PACK_PREDATOR_MERGE_MIN_SIMILARITY,
  PACK_HERD_PRIORITY_MULT, PACK_REJOIN_FORCE, PACK_REJOIN_MAX_DIST, PACK_REJOIN_HUNGER_GATE, PACK_CONTACT_RECOVERY_TICKS,
  FORAGE_SCATTER_MIN_NEIGHBORS, FORAGE_SCATTER_WEIGHT,
  BOID_SEPARATION_RADIUS, BOID_ALIGNMENT_RADIUS, BOID_COHESION_RADIUS,
  BOID_SEPARATION_WEIGHT, BOID_ALIGNMENT_WEIGHT, BOID_COHESION_WEIGHT, BOID_SEPARATION_HARD_WEIGHT, BOID_SEPARATION_HARD_TRIGGER_RATIO, BOID_SEPARATION_SOFT_WEIGHT,
  BOID_MAX_FORCE, BOID_MIN_NEIGHBORS_ALIGN, BOID_MIN_NEIGHBORS_COHESION, BOID_PACK_NEIGHBOR_MULT,
  FOOD_SIGNAL_RADIUS, FOOD_SIGNAL_DECAY_TICKS, FOOD_SIGNAL_MIN_STRENGTH, FOOD_SIGNAL_SHARE_WEIGHT, FOOD_SIGNAL_BLEND_WEIGHT,
  FOOD_SIGNAL_RELAY_ATTENUATION, FOOD_SIGNAL_MAX_HOPS, FOOD_SIGNAL_RELAY_AGE_FACTOR,
  FOOD_SIGNAL_HUNGRY_MULT, FOOD_SIGNAL_SCOUT_MULT,
  INTENT_HUNGER_FORAGE_ON, INTENT_HUNGER_FORAGE_OFF, INTENT_MATE_ENERGY_THRESHOLD, INTENT_HUNT_TARGET_LOCK_TICKS,
  ROLE_FRONT_SENSOR_STRENGTH, ROLE_FRONT_WEAPON_STRENGTH, ROLE_FRONT_REPRO_STRENGTH, ROLE_FRONT_DEADZONE,
  PACK_ANTI_MILL_TANGENTIAL_DAMP, PACK_ANTI_MILL_RADIAL_PULL, PACK_ANTI_MILL_MIN_RADIUS, PACK_ANTI_MILL_MAX_RADIUS,
  PACK_ANTI_MILL_ACTIVATION_NEIGHBORS, PACK_ANTI_MILL_RECOVERY_TICKS, PACK_FORWARD_DRIFT_WEIGHT,
  PACK_CENTROID_DAMP_WHEN_CROWDED, PACK_ANTI_MILL_VELOCITY_DAMP, PACK_ANTI_MILL_FORCE_TANGENTIAL_SPEED, PACK_ANTI_MILL_FORCE_FORWARD_BIAS,
  COLLISION_RADIUS_MULT,
  PREDATION_STEAL_FRACTION, PREDATION_KIN_THRESHOLD,
  PREDATION_VERY_HUNGRY_FRACTION, PREDATION_HUNGRY_KIN_THRESHOLD_MULT, PREDATOR_URGENT_FORAGE_FRACTION, PREDATOR_METABOLISM_MULT,
  CARRION_DROP_DIVISOR, RENDER_RADIUS_BY_TYPE, RENDER_RADIUS_MULT,
  FEAR_DURATION, FEAR_SPEED_MULT,
  LUNGE_SPEED_MULT, LUNGE_RANGE, STEALTH_DETECTION_MULT, KILL_BOUNTY_FRACTION,
  LATCH_DURATION, LATCH_DAMAGE_MULT, LATCH_MAX, LATCH_TOUCH_PADDING, LATCH_REFRESH_RANGE_MULT,
  WEAPON_FORWARD_PULL, WEAPON_FORWARD_PULL_IDLE,
  EAT_FULL_STOP_FRACTION, EAT_RESUME_FRACTION, EAT_COOLDOWN_TICKS, EAT_MAX_ITEMS_PER_SUBSTEP, FOOD_INTERACTION_RADIUS_MAX_SCALE, FOOD_EAT_CONTACT_MULT,
  NON_PREDATOR_EAT_EFFICIENCY, PREDATOR_PLANT_EAT_EFFICIENCY,
  CREATURE_MAX_AGE_TICKS,
  PREDATOR_FLOCK_DETECT_RANGE, PREDATOR_FLOCK_CLUSTER_RADIUS, PREDATOR_FLOCK_DENSITY_WEIGHT,
} from '../constants';

interface SpawnCreatureOptions {
  clanId?: number;
  packId?: number;
  parentA?: number;
  parentB?: number;
}

const INTENT_SCOUT = 0;
const INTENT_FORAGE = 1;
const INTENT_HUNT = 2;
const INTENT_MATE = 3;
const INTENT_FLEE = 4;

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
  world.creatureMaxAge[ci] = Math.max(
    Math.floor(CREATURE_MAX_AGE_TICKS * 0.6),
    Math.floor(CREATURE_MAX_AGE_TICKS * (0.75 + Math.random() * 0.5)),
  );
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
  _antiMillRecoveryTimer[ci] = 0;
  _intentMode[ci] = INTENT_SCOUT;
  _foodSignalX[ci] = 0;
  _foodSignalY[ci] = 0;
  _foodSignalStrength[ci] = 0;
  _foodSignalAge[ci] = 0;
  _foodSignalHop[ci] = 0;
  _foodSignalDirect[ci] = 0;
  _huntTargetTimer[ci] = 0;
  _hasMateTarget[ci] = 0;
  _mateTargetId[ci] = -1;

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
  const samePackParents = hasParentA && hasParentB && world.creaturePackId[parentA] >= 0 && world.creaturePackId[parentA] === world.creaturePackId[parentB];
  if (samePackParents && Math.random() < PACK_OFFSHOOT_CHANCE_SEXUAL_SAME_PACK) {
    return world.allocPackId();
  }
  if ((hasParentA !== hasParentB) && Math.random() < PACK_OFFSHOOT_CHANCE_ASEXUAL) {
    return world.allocPackId();
  }

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

function resolveFrontRoleForIntent(intent: number): BlobType {
  if (intent === INTENT_HUNT) return BlobType.WEAPON;
  if (intent === INTENT_MATE) return BlobType.REPRODUCER;
  return BlobType.SENSOR;
}

function steerBlobTypeToFront(
  world: World,
  ci: number,
  targetType: BlobType,
  strength: number,
  deadZone: number,
) {
  const start = world.creatureBlobStart[ci];
  const count = world.creatureBlobCount[ci];
  const coreIdx = world.creatureBlobs[start];
  const heading = world.creatureHeading[ci];
  const targetX = world.blobX[coreIdx] + Math.cos(heading) * STAR_REST_DISTANCE;
  const targetY = world.blobY[coreIdx] + Math.sin(heading) * STAR_REST_DISTANCE;

  let found = false;
  for (let i = 0; i < count; i++) {
    const bi = world.creatureBlobs[start + i];
    if (world.blobType[bi] !== targetType) continue;
    const dx = targetX - world.blobX[bi];
    const dy = targetY - world.blobY[bi];
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= deadZone) continue;
    const pull = Math.min(strength, dist * 0.25);
    world.blobX[bi] += (dx / dist) * pull;
    world.blobY[bi] += (dy / dist) * pull;
    found = true;
  }

  if (!found && targetType !== BlobType.SENSOR) {
    steerBlobTypeToFront(world, ci, BlobType.SENSOR, strength * 0.8, deadZone);
  }
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

    // Intent-driven front-role orientation (soft bias).
    const intent = _intentMode[ci];
    const frontRole = resolveFrontRoleForIntent(intent);
    let frontStrength = ROLE_FRONT_SENSOR_STRENGTH;
    if (frontRole === BlobType.WEAPON) frontStrength = ROLE_FRONT_WEAPON_STRENGTH;
    else if (frontRole === BlobType.REPRODUCER) frontStrength = ROLE_FRONT_REPRO_STRENGTH;
    steerBlobTypeToFront(world, ci, frontRole, frontStrength, ROLE_FRONT_DEADZONE);

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
const _huntTargetTimer = new Int32Array(MAX_CREATURES);
const _hasMateTarget = new Uint8Array(MAX_CREATURES);
const _mateTargetX = new Float32Array(MAX_CREATURES);
const _mateTargetY = new Float32Array(MAX_CREATURES);
const _mateTargetId = new Int32Array(MAX_CREATURES).fill(-1);
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
const _antiMillRecoveryTimer = new Int32Array(MAX_CREATURES);
const _intentMode = new Uint8Array(MAX_CREATURES);
const _foodSignalX = new Float32Array(MAX_CREATURES);
const _foodSignalY = new Float32Array(MAX_CREATURES);
const _foodSignalStrength = new Float32Array(MAX_CREATURES);
const _foodSignalAge = new Int32Array(MAX_CREATURES);
const _foodSignalHop = new Uint8Array(MAX_CREATURES);
const _foodSignalDirect = new Uint8Array(MAX_CREATURES);

type PackStats = {
  size: number;
  sumX: number;
  sumY: number;
  clanId: number;
  predatorCount: number;
  representativePredator: number;
};
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

function foodEnergyMultiplierByAge(kind: FoodKind, ageTicks: number, maxAgeTicks: number): number {
  if (maxAgeTicks <= 0) return 1;
  const ageNorm = Math.max(0, Math.min(1, ageTicks / maxAgeTicks));
  if (kind === FoodKind.MEAT) {
    return 1 + (MEAT_DECAY_MIN_MULT - 1) * ageNorm;
  }
  const peakFrac = Math.max(0.05, Math.min(0.95, FOOD_GROWTH_PEAK_AGE_FRAC));
  if (ageNorm <= peakFrac) {
    const t = ageNorm / peakFrac;
    return FOOD_GROWTH_MIN_MULT + (FOOD_GROWTH_PEAK_MULT - FOOD_GROWTH_MIN_MULT) * t;
  }
  const t = (ageNorm - peakFrac) / (1 - peakFrac);
  return FOOD_GROWTH_PEAK_MULT + (FOOD_GROWTH_STALE_MULT - FOOD_GROWTH_PEAK_MULT) * t;
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
  _packContactRecoveryTimer[ci] = PACK_CONTACT_RECOVERY_TICKS;
  _packContactRecoveryTimer[cj] = PACK_CONTACT_RECOVERY_TICKS;
}

export function isIntentionalContactPair(world: World, ci: number, cj: number): boolean {
  if (ci < 0 || cj < 0 || ci === cj) return false;
  if (!world.creatureAlive[ci] || !world.creatureAlive[cj]) return false;
  if (_intentMode[ci] === INTENT_MATE && _intentMode[cj] === INTENT_MATE) {
    return _mateTargetId[ci] === cj || _mateTargetId[cj] === ci;
  }
  // Predator-prey commitment allows tighter contact envelopes.
  if (_intentMode[ci] === INTENT_HUNT && _nearPrey[ci]) return true;
  if (_intentMode[cj] === INTENT_HUNT && _nearPrey[cj]) return true;
  return false;
}

export function updateSensors(
  world: World,
  spatialHash: SpatialHash,
  kinThreshold = PREDATION_KIN_THRESHOLD,
  stealthDetectionMult = STEALTH_DETECTION_MULT,
  eatFullStopFraction = EAT_FULL_STOP_FRACTION,
  eatResumeFraction = EAT_RESUME_FRACTION,
  foodSignalDecayTicks = FOOD_SIGNAL_DECAY_TICKS,
  foodSignalMinStrength = FOOD_SIGNAL_MIN_STRENGTH,
  lungeRange = LUNGE_RANGE,
) {
  world.foodSignalDirectEmits = 0;
  world.foodSignalRelayAdopts = 0;
  world.foodSignalSteerApplies = 0;
  world.foodSignalExpiredClears = 0;
  world.foodSignalAvgStrength = 0;
  world.foodSignalAvgHop = 0;
  world.foodWantsCount = 0;
  world.foodSatiatedCount = 0;
  world.foodHungryCount = 0;
  world.foodEatenPlant = 0;
  world.foodEatenMeat = 0;
  world.predatorCount = 0;
  world.avgEnergyFrac = 0;
  world.intentScoutCount = 0;
  world.intentForageCount = 0;
  world.intentHuntCount = 0;
  world.intentMateCount = 0;
  world.intentFleeCount = 0;
  let aliveCount = 0;
  let energyFracSum = 0;
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
        world.predatorCount++;
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
    const sensorFoodSteerMult = hasSensor ? Math.min(1.6, 0.9 + maxSensorSize * 0.35) : 0.75;

    // Keep satiety in sync for steering logic (avoid full creatures orbiting food patches).
    const maxEnergy = world.creatureMaxEnergy[ci];
    if (_isSatiated[ci]) {
      if (world.creatureEnergy[ci] <= maxEnergy * eatResumeFraction) _isSatiated[ci] = 0;
    } else if (world.creatureEnergy[ci] >= maxEnergy * eatFullStopFraction) {
      _isSatiated[ci] = 1;
    }
    const wantsFood = _isSatiated[ci] ? 0 : 1;
    const energyFrac = world.creatureEnergy[ci] / Math.max(1, maxEnergy);
    const hungryForFood = energyFrac <= CLAN_HUNGER_OVERRIDE_THRESHOLD;
    // Sense range scales with sensor blob size and expands when hungry to prevent starvation lock.
    let range = hasSensor ? SENSOR_RANGE * maxSensorSize : BASIC_FOOD_SENSE_RANGE;
    if (hungryForFood) range *= hasSensor ? 1.25 : 1.6;
    range = Math.max(range, hungryForFood ? HUNGRY_FOOD_SENSE_MIN_RANGE : BASIC_FOOD_SENSE_RANGE);
    const range2 = range * range;
    energyFracSum += energyFrac;
    _wantsFood[ci] = wantsFood;
    if (wantsFood) world.foodWantsCount++;
    else world.foodSatiatedCount++;
    if (hungryForFood) world.foodHungryCount++;
    if (_fearTimer[ci] > 0) _fearTimer[ci]--;
    if (_foodSignalAge[ci] > 0) _foodSignalAge[ci]--;
    if (_foodSignalAge[ci] <= 0) {
      _foodSignalStrength[ci] *= 0.92;
      if (_foodSignalStrength[ci] < foodSignalMinStrength) {
        _foodSignalStrength[ci] = 0;
        _foodSignalX[ci] = 0;
        _foodSignalY[ci] = 0;
        _foodSignalHop[ci] = 0;
        _foodSignalDirect[ci] = 0;
        world.foodSignalExpiredClears++;
      }
    }

    // --- Food detection with target stickiness ---
    let nearestFoodDist2 = range2;
    let nearestFoodX = 0, nearestFoodY = 0;
    let targetFoodX = 0, targetFoodY = 0;
    let foodSumX = 0, foodSumY = 0, foodCountSeen = 0;
    let found = false;

    const lockX = _foodTargetX[ci];
    const lockY = _foodTargetY[ci];
    const lockRadius2 = FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND;
    let lockFound = false;
    let lockBestDist2 = lockRadius2;

    if (_foodTargetTimer[ci] > 0) _foodTargetTimer[ci]--;

    // Always sense nearby food for social communication; hunger gates pursuit, not perception.
    spatialHash.queryFood(
      cx, cy, range,
      world.foodX, world.foodY, world.foodAlive,
      world.activeFoodIds,
      world.foodCount,
      (fi) => {
        const fx = world.foodX[fi];
        const fy = world.foodY[fi];
        const dx = fx - cx;
        const dy = fy - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < nearestFoodDist2) {
          nearestFoodDist2 = d2;
          nearestFoodX = fx;
          nearestFoodY = fy;
          found = true;
        }
        foodSumX += fx;
        foodSumY += fy;
        foodCountSeen++;

        if (wantsFood && _foodTargetTimer[ci] > 0) {
          const ldx = fx - lockX;
          const ldy = fy - lockY;
          const ld2 = ldx * ldx + ldy * ldy;
          if (ld2 < lockBestDist2) {
            lockBestDist2 = ld2;
            lockFound = true;
          }
        }
      },
      () => { world.perfFoodOverflowFallbacks++; },
    );

    if (wantsFood) {
      const useNearest = nearestFoodDist2 <= FOOD_TARGET_NEAREST_SWITCH_DISTANCE * FOOD_TARGET_NEAREST_SWITCH_DISTANCE;
      if (_foodTargetTimer[ci] > 0 && lockFound && !useNearest) {
        targetFoodX = lockX;
        targetFoodY = lockY;
        found = true;
      } else if (found) {
        // Far away, steer toward patch centroid; near food, switch to nearest pellet so bites can land.
        if (!useNearest && foodCountSeen >= 3) {
          targetFoodX = foodSumX / foodCountSeen;
          targetFoodY = foodSumY / foodCountSeen;
        } else {
          targetFoodX = nearestFoodX;
          targetFoodY = nearestFoodY;
        }
        _foodTargetX[ci] = targetFoodX;
        _foodTargetY[ci] = targetFoodY;
        _foodTargetTimer[ci] = FOOD_TARGET_LOCK_TICKS;
      } else {
        _foodTargetTimer[ci] = 0;
      }
    } else {
      _foodTargetTimer[ci] = 0;
    }

    // Store for flock shared sensing
    _hasSensedFood[ci] = found ? 1 : 0;
    _sensedFoodX[ci] = nearestFoodX;
    _sensedFoodY[ci] = nearestFoodY;
    const canBroadcastDirect =
      wantsFood === 1 ||
      hungryForFood ||
      (foodCountSeen >= 6 && ((world.tick + ci) % 90 === 0));
    if (found && canBroadcastDirect) {
      _foodSignalX[ci] = _sensedFoodX[ci];
      _foodSignalY[ci] = _sensedFoodY[ci];
      const directStrength = wantsFood
        ? Math.min(1.0, 0.35 + foodCountSeen * 0.08)
        : Math.min(0.22, 0.05 + foodCountSeen * 0.025);
      _foodSignalStrength[ci] = Math.max(_foodSignalStrength[ci], directStrength);
      _foodSignalAge[ci] = wantsFood
        ? foodSignalDecayTicks
        : Math.max(8, Math.floor(foodSignalDecayTicks * 0.35));
      _foodSignalHop[ci] = 0;
      _foodSignalDirect[ci] = 1;
      world.foodSignalDirectEmits++;
    } else {
      _foodSignalDirect[ci] = 0;
    }

    // --- Threat detection (stealth: predators detected at reduced range) ---
    const stealthRange = range * stealthDetectionMult;
    const stealthRange2 = stealthRange * stealthRange;
    let nearestThreatDist2 = stealthRange2;
    let threatX = 0, threatY = 0;
    let foundThreat = false;

    _sensorVisitedGen++;
    if (_sensorVisitedGen === 0) {
      _sensorVisited.fill(0);
      _sensorVisitedGen = 1;
    }
    const threatVisitedGen = _sensorVisitedGen;
    spatialHash.query(cx, cy, stealthRange, (blobIdx) => {
      const oci = world.blobCreature[blobIdx];
      if (oci < 0 || oci === ci || _sensorVisited[oci] === threatVisitedGen) return;
      _sensorVisited[oci] = threatVisitedGen;
      if (!_hasWeapon[oci]) return;
      const otherGenome = world.creatureGenome[oci];
      if (otherGenome && geneticSimilarity(genome, otherGenome) >= kinThreshold) return;
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
    });

    // Store threat sensing for alarm signaling in updateFlocking
    _hasSensedThreat[ci] = foundThreat ? 1 : 0;
    _sensedThreatX[ci] = threatX;
    _sensedThreatY[ci] = threatY;

    // --- Prey detection (weapon-bearers scan for non-kin to chase) ---
    _nearPrey[ci] = 0;
    _hasHuntTarget[ci] = 0;
    if (_huntTargetTimer[ci] > 0) _huntTargetTimer[ci]--;
    if (_hasWeapon[ci]) {
      const predatorKinThreshold = energyFrac <= PREDATION_VERY_HUNGRY_FRACTION
        ? kinThreshold * PREDATION_HUNGRY_KIN_THRESHOLD_MULT
        : kinThreshold;
      const lungeRange2 = lungeRange * lungeRange;
      const huntRange2 = PREDATOR_FLOCK_DETECT_RANGE * PREDATOR_FLOCK_DETECT_RANGE;
      let nearestPreyDist2 = lungeRange2;
      let preyX = 0, preyY = 0;
      let foundPrey = false;
      let bestHuntScore = -Infinity;
      let huntX = 0, huntY = 0;
      let foundHunt = false;

      _sensorVisitedGen++;
      if (_sensorVisitedGen === 0) {
        _sensorVisited.fill(0);
        _sensorVisitedGen = 1;
      }
      const preyVisitedGen = _sensorVisitedGen;
      spatialHash.query(cx, cy, PREDATOR_FLOCK_DETECT_RANGE, (blobIdx) => {
        const oci = world.blobCreature[blobIdx];
        if (oci < 0 || oci === ci || _sensorVisited[oci] === preyVisitedGen) return;
        _sensorVisited[oci] = preyVisitedGen;
        const otherGenome = world.creatureGenome[oci];
        if (otherGenome && geneticSimilarity(genome, otherGenome) >= predatorKinThreshold) return;
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
      });

      if (foundPrey) {
        _nearPrey[ci] = 1;
        _preyTargetX[ci] = preyX;
        _preyTargetY[ci] = preyY;
        _huntTargetTimer[ci] = INTENT_HUNT_TARGET_LOCK_TICKS;
      } else if (foundHunt) {
        _hasHuntTarget[ci] = 1;
        _huntTargetX[ci] = huntX;
        _huntTargetY[ci] = huntY;
        _huntTargetTimer[ci] = Math.max(_huntTargetTimer[ci], Math.floor(INTENT_HUNT_TARGET_LOCK_TICKS * 0.6));
      }
    }

    // --- Mate detection (non-allocating coarse target) ---
    _hasMateTarget[ci] = 0;
    _mateTargetId[ci] = -1;
    const readyToMate = world.creatureReproCooldown[ci] <= 0 && (world.creatureEnergy[ci] / Math.max(1, world.creatureMaxEnergy[ci])) >= INTENT_MATE_ENERGY_THRESHOLD;
    if (readyToMate) {
      let bestMate = -1;
      let bestMateDist2 = Infinity;
      const genomeA = world.creatureGenome[ci];
      if (genomeA) {
        _sensorVisitedGen++;
        if (_sensorVisitedGen === 0) {
          _sensorVisited.fill(0);
          _sensorVisitedGen = 1;
        }
        const mateVisitedGen = _sensorVisitedGen;
        spatialHash.query(cx, cy, MATE_RANGE, (blobIdx) => {
          const otherCi = world.blobCreature[blobIdx];
          if (otherCi < 0 || otherCi === ci || _sensorVisited[otherCi] === mateVisitedGen) return;
          _sensorVisited[otherCi] = mateVisitedGen;
          if (!world.creatureAlive[otherCi]) return;
          if (world.creatureReproCooldown[otherCi] > 0) return;
          const otherEnergyFrac = world.creatureEnergy[otherCi] / Math.max(1, world.creatureMaxEnergy[otherCi]);
          if (otherEnergyFrac < INTENT_MATE_ENERGY_THRESHOLD) return;
          const genomeB = world.creatureGenome[otherCi];
          if (!genomeB || geneticSimilarity(genomeA, genomeB) < MATE_MIN_SIMILARITY) return;
          const otherCoreIdx = world.creatureBlobs[world.creatureBlobStart[otherCi]];
          const mdx = world.blobX[otherCoreIdx] - cx;
          const mdy = world.blobY[otherCoreIdx] - cy;
          const md2 = mdx * mdx + mdy * mdy;
          if (md2 < bestMateDist2 && md2 <= MATE_RANGE * MATE_RANGE) {
            bestMate = otherCi;
            bestMateDist2 = md2;
          }
        });
      }
      if (bestMate >= 0) {
        const otherCoreIdx = world.creatureBlobs[world.creatureBlobStart[bestMate]];
        _hasMateTarget[ci] = 1;
        _mateTargetX[ci] = world.blobX[otherCoreIdx];
        _mateTargetY[ci] = world.blobY[otherCoreIdx];
        _mateTargetId[ci] = bestMate;
      }
    }

    // --- Steering intent emission (resolved once in applySteering) ---
    const urgentPredatorForage =
      _hasWeapon[ci] === 1 &&
      wantsFood === 1 &&
      energyFrac <= PREDATOR_URGENT_FORAGE_FRACTION &&
      _nearPrey[ci] === 0 &&
      _hasHuntTarget[ci] === 0;
    const hardFoodLock = wantsFood === 1 && found && energyFrac <= INTENT_HUNGER_FORAGE_ON;
    if (_hasWeapon[ci]) {
      // Weapon-bearers: prey pursuit always wins over forage unless no prey signal exists.
      if (_nearPrey[ci]) {
        addSteer(ci, _preyTargetX[ci] - cx, _preyTargetY[ci] - cy, hasSensor ? 1.0 : 0.7);
      } else if (_hasHuntTarget[ci]) {
        addSteer(ci, _huntTargetX[ci] - cx, _huntTargetY[ci] - cy, hasSensor ? 0.7 : 0.5);
      } else if (urgentPredatorForage && found) {
        const dx = _sensedFoodX[ci] - cx;
        const dy = _sensedFoodY[ci] - cy;
        forceSteer(ci, dx, dy, hasSensor ? 1.15 : 1.0);
      } else if (_hasMateTarget[ci]) {
        addSteer(ci, _mateTargetX[ci] - cx, _mateTargetY[ci] - cy, 0.26);
      } else if (wantsFood && found) {
        const dx = _foodTargetX[ci] - cx;
        const dy = _foodTargetY[ci] - cy;
        const d2 = dx * dx + dy * dy;
        if (hardFoodLock) {
          forceSteer(ci, dx, dy, hasSensor ? 1.05 : 0.9);
        } else if (d2 > FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND) {
          addSteer(ci, dx, dy, (hungryForFood ? 0.60 : 0.24) * sensorFoodSteerMult);
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
        forceSteer(ci, cx - _fearThreatX[ci], cy - _fearThreatY[ci], hasSensor ? 0.9 : 0.75);
      } else if (_hasMateTarget[ci]) {
        addSteer(ci, _mateTargetX[ci] - cx, _mateTargetY[ci] - cy, 0.32);
      } else if (wantsFood && found) {
        const dx = _foodTargetX[ci] - cx;
        const dy = _foodTargetY[ci] - cy;
        const d2 = dx * dx + dy * dy;
        if (hardFoodLock) {
          forceSteer(ci, dx, dy, hasSensor ? 1.05 : 0.95);
        } else if (d2 > FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND) {
          addSteer(ci, dx, dy, (hungryForFood ? 0.50 : 0.18) * sensorFoodSteerMult);
        }
      }
    }

    if (_fearTimer[ci] > 0 || foundThreat) _intentMode[ci] = INTENT_FLEE;
    else if ((_nearPrey[ci] || _hasHuntTarget[ci] || _huntTargetTimer[ci] > 0) && _hasWeapon[ci]) _intentMode[ci] = INTENT_HUNT;
    else if (urgentPredatorForage && found) _intentMode[ci] = INTENT_FORAGE;
    else if (_hasMateTarget[ci]) _intentMode[ci] = INTENT_MATE;
    else if (energyFrac <= INTENT_HUNGER_FORAGE_ON || (wantsFood && energyFrac <= INTENT_HUNGER_FORAGE_OFF)) _intentMode[ci] = INTENT_FORAGE;
    else _intentMode[ci] = INTENT_SCOUT;

    if (_intentMode[ci] === INTENT_SCOUT) world.intentScoutCount++;
    else if (_intentMode[ci] === INTENT_FORAGE) world.intentForageCount++;
    else if (_intentMode[ci] === INTENT_HUNT) world.intentHuntCount++;
    else if (_intentMode[ci] === INTENT_MATE) world.intentMateCount++;
    else if (_intentMode[ci] === INTENT_FLEE) world.intentFleeCount++;
  }

  world.avgEnergyFrac = aliveCount > 0 ? (energyFracSum / aliveCount) : 0;
}

export function updateMetabolism(
  world: World,
  metabolismCost = METABOLISM_COST_PER_BLOB,
  metabolismExponent = METABOLISM_SCALING_EXPONENT,
  photoEnergyPerTick = PHOTO_ENERGY_PER_TICK,
  photoCrowdPenaltyMax = PHOTO_CROWD_PENALTY_MAX,
  photoIdlePenaltyMinMult = PHOTO_IDLE_PENALTY_MIN_MULT,
  photoMaintenanceCostPerBlob = PHOTO_MAINTENANCE_COST_PER_BLOB,
  photoMaintenanceSizeMult = PHOTO_MAINTENANCE_SIZE_MULT,
) {
  world.photoEnergyGross = 0;
  world.photoEnergyNet = 0;
  world.photoPenaltyAvgMult = 0;
  let photoBlobSamples = 0;
  let photoMultSum = 0;
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;

    const count = world.creatureBlobCount[ci];
    const start = world.creatureBlobStart[ci];
    const genome = world.creatureGenome[ci]!;

    // Kin proximity discount: up to KIN_METABOLISM_DISCOUNT reduction
    const kinDiscount = 1 - KIN_METABOLISM_DISCOUNT * Math.min(_kinScore[ci] / 2, 1);

    // Metabolism cost (sub-linear: count^exponent * cost)
    const predatorMetabMult = _hasWeapon[ci] ? PREDATOR_METABOLISM_MULT : 1.0;
    world.creatureEnergy[ci] -= Math.pow(count, metabolismExponent) * metabolismCost * kinDiscount * predatorMetabMult;

    // Photosynthesis with crowding and low-movement penalties, plus maintenance tax.
    const coreIdx = world.creatureBlobs[start];
    const vx = world.blobX[coreIdx] - world.blobPrevX[coreIdx];
    const vy = world.blobY[coreIdx] - world.blobPrevY[coreIdx];
    const speed = Math.sqrt(vx * vx + vy * vy);
    const idleDen = Math.max(1e-6, PHOTO_IDLE_SPEED_SOFT_FULL - PHOTO_IDLE_SPEED_SOFT_START);
    const moveT = Math.max(0, Math.min(1, (speed - PHOTO_IDLE_SPEED_SOFT_START) / idleDen));
    const movementMult = photoIdlePenaltyMinMult + (1 - photoIdlePenaltyMinMult) * moveT;
    const crowdFrac = Math.max(0, Math.min(1, _localCrowd[ci] / Math.max(1, PHOTO_CROWD_PENALTY_NEIGHBORS_FULL)));
    const crowdMult = 1 - photoCrowdPenaltyMax * crowdFrac;
    const photoMult = Math.max(0, crowdMult * movementMult);
    let photoGross = 0;
    let photoNet = 0;
    let photoMaintenance = 0;
    let weaponCount = 0;
    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] === BlobType.PHOTOSYNTHESIZER) {
        const blobSize = world.blobSize[bi];
        const baseGain = photoEnergyPerTick * genome.photoEfficiency * blobSize;
        const adjustedGain = baseGain * photoMult;
        photoGross += baseGain;
        photoNet += adjustedGain;
        photoMaintenance += photoMaintenanceCostPerBlob + photoMaintenanceSizeMult * blobSize;
        photoBlobSamples++;
        photoMultSum += photoMult;
      }
      if (world.blobType[bi] === BlobType.WEAPON) weaponCount++;
    }
    world.creatureEnergy[ci] += photoNet;
    world.creatureEnergy[ci] -= photoMaintenance;
    world.creatureEnergy[ci] -= weaponCount * WEAPON_UPKEEP_PER_BLOB;
    world.photoEnergyGross += photoGross;
    world.photoEnergyNet += Math.max(0, photoNet - photoMaintenance);

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
  world.photoPenaltyAvgMult = photoBlobSamples > 0 ? (photoMultSum / photoBlobSamples) : 1;
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
    let hasWeapon = false;
    for (let i = 0; i < count; i++) {
      if (world.blobType[world.creatureBlobs[start + i]] === BlobType.WEAPON) {
        hasWeapon = true;
        break;
      }
    }
    let eaten = 0;
    let stopEating = false;

    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] !== BlobType.MOUTH) continue;

      const mx = world.blobX[bi];
      const my = world.blobY[bi];
      const mr = world.blobRadius[bi];
      const eatRange = mr + FOOD_RADIUS * FOOD_INTERACTION_RADIUS_MAX_SCALE;

      spatialHash.queryFood(
        mx, my, eatRange,
        world.foodX, world.foodY, world.foodAlive,
        world.activeFoodIds,
        world.foodCount,
        (fi) => {
          if (stopEating || !world.foodAlive[fi]) return;
          const dx = world.foodX[fi] - mx;
          const dy = world.foodY[fi] - my;
          const foodKind = world.foodKind[fi] as FoodKind;
          const foodRadius = FOOD_RADIUS * Math.max(0.1, world.foodRadiusScale[fi] || 1);
          const eatContact = (mr + foodRadius) * FOOD_EAT_CONTACT_MULT;
          if (dx * dx + dy * dy < eatContact * eatContact) {
            const defaultMaxAge = foodKind === FoodKind.MEAT ? MEAT_STALE_TICKS : FOOD_STALE_TICKS;
            const foodMaxAge = world.foodMaxAge[fi] > 0 ? world.foodMaxAge[fi] : defaultMaxAge;
            const ageMult = foodEnergyMultiplierByAge(foodKind, world.foodAge[fi], foodMaxAge);
            const scale = Math.max(0.1, world.foodEnergyScale[fi] || 1);
            const meatBonus = (foodKind === FoodKind.MEAT && hasWeapon) ? MEAT_PREDATOR_EAT_EFFICIENCY_MULT : 1.0;
            const eatEfficiency = hasWeapon
              ? (foodKind === FoodKind.PLANT ? PREDATOR_PLANT_EAT_EFFICIENCY : 1.0)
              : NON_PREDATOR_EAT_EFFICIENCY;
            const foodEnergy = FOOD_ENERGY * scale * ageMult;
            world.creatureEnergy[ci] = Math.min(
              maxEnergy,
              world.creatureEnergy[ci] + foodEnergy * MOUTH_EFFICIENCY * eatEfficiency * meatBonus * world.blobSize[bi],
            );
            if (foodKind === FoodKind.MEAT) {
              world.foodEatenMeat++;
              world.foodEatenMeatTotal++;
            } else {
              world.foodEatenPlant++;
              world.foodEatenPlantTotal++;
            }
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
        () => { world.perfFoodOverflowFallbacks++; },
      );
      if (stopEating) break;
    }
  }
}

/** Check if a weapon blob already has an active latch. */
function isWeaponLatched(world: World, weaponBlobIdx: number): boolean {
  return world.blobWeaponLatchedTarget[weaponBlobIdx] >= 0;
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
  world.blobWeaponLatchedTarget[weaponBlob] = targetBlob;
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
    const attackerEnergyFrac = world.creatureEnergy[ci] / Math.max(1, world.creatureMaxEnergy[ci]);
    const predatorKinThreshold = attackerEnergyFrac <= PREDATION_VERY_HUNGRY_FRACTION
      ? kinThreshold * PREDATION_HUNGRY_KIN_THRESHOLD_MULT
      : kinThreshold;

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
        if (otherGenome && geneticSimilarity(genome, otherGenome) >= predatorKinThreshold) return;

        const dx = world.blobX[j] - wx;
        const dy = world.blobY[j] - wy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const contactDist = wr + world.blobRadius[j] * COLLISION_RADIUS_MULT;
        const latchDist = contactDist + LATCH_TOUCH_PADDING;
        if (dist <= latchDist) {
          // First-touch latch: allow slight near-contact padding so predators don't
          // miss attachments due to tiny positional drift between substep phases.
          const latched = createLatch(world, bi, j, ci, otherCreature);
          if (latched) hit = true; // one latch per weapon per tick

          // Apply burst damage only on true geometric overlap, not padded near-contact.
          if (dist <= contactDist) {
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
            hit = true;
          }
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
      world.blobWeaponLatchedTarget[wbi] = -1;
      continue; // skip = remove
    }

    // Decrement timer
    world.latchTimer[li]--;
    if (world.latchTimer[li] <= 0) {
      world.blobWeaponLatchedTarget[wbi] = -1;
      continue; // expired
    }

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

    // Keep latch alive while predator remains in close pursuit/contact.
    if (dist <= restDist * LATCH_REFRESH_RANGE_MULT) {
      world.latchTimer[li] = Math.max(world.latchTimer[li], Math.floor(LATCH_DURATION * 0.75));
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

export function killDead(
  world: World,
  carrionDivisor = CARRION_DROP_DIVISOR,
  killBountyFraction = KILL_BOUNTY_FRACTION,
  maxAgeTicks = CREATURE_MAX_AGE_TICKS,
) {
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    const creatureMaxAge = world.creatureMaxAge[ci] > 0 ? world.creatureMaxAge[ci] : maxAgeTicks;
    const diedOfAge = world.creatureAge[ci] >= creatureMaxAge;
    if (world.creatureEnergy[ci] <= 0 || diedOfAge) {
      // Award kill bounty to last attacker
      const lastAttacker = world.creatureLastAttacker[ci];
      if (lastAttacker >= 0 && world.creatureAlive[lastAttacker]) {
        const bounty = world.creatureMaxEnergy[ci] * killBountyFraction;
        world.creatureEnergy[lastAttacker] = Math.min(
          world.creatureEnergy[lastAttacker] + bounty,
          world.creatureMaxEnergy[lastAttacker],
        );
      }

      // Convert corpse to meat one-to-one with dead blobs (same layout/shape).
      const start = world.creatureBlobStart[ci];
      const count = world.creatureBlobCount[ci];
      const carrionMult = (lastAttacker >= 0 && world.creatureAlive[lastAttacker]) ? 0.5 : 1.0;
      const totalCarrionScale = Math.max(0, (count * carrionMult) / Math.max(1, carrionDivisor));
      const perBlobEnergyScale = count > 0 ? totalCarrionScale / count : 0;
      for (let i = 0; i < count; i++) {
        const bi = world.creatureBlobs[start + i];
        const fi = world.allocFood(FoodKind.MEAT, MEAT_STALE_TICKS);
        if (fi < 0) break;
        const type = world.blobType[bi] as BlobType;
        const typeMult = RENDER_RADIUS_BY_TYPE[type] ?? 1;
        const targetRenderRadius = world.blobRadius[bi] * typeMult;
        world.foodEnergyScale[fi] = Math.max(0.05, perBlobEnergyScale);
        world.foodRadiusScale[fi] = targetRenderRadius / (FOOD_RADIUS * RENDER_RADIUS_MULT);
        world.foodX[fi] = world.blobX[bi];
        world.foodY[fi] = world.blobY[bi];
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
      world.blobWeaponLatchedTarget[world.latchWeaponBlob[li]] = -1;
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
const _visited = new Uint16Array(MAX_CREATURES);
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
      stats = {
        size: 0,
        sumX: 0,
        sumY: 0,
        clanId: world.creatureClanId[ci],
        predatorCount: 0,
        representativePredator: -1,
      };
      _packStats.set(packId, stats);
    }
    stats.size++;
    stats.sumX += x;
    stats.sumY += y;
    if (_hasWeapon[ci]) {
      stats.predatorCount++;
      if (stats.representativePredator < 0) stats.representativePredator = ci;
    }
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
  }
}

function canCreatureJoinPack(world: World, ci: number, targetStats: PackStats | undefined): boolean {
  if (!targetStats) return false;
  const selfIsPredator = _hasWeapon[ci] === 1;
  const targetHasPredators = targetStats.predatorCount > 0;

  // Keep predator and non-predator packs socially distinct.
  if (selfIsPredator !== targetHasPredators) return false;
  if (!selfIsPredator) return true;

  // Predator joins require genome similarity with target predator pack.
  const rep = targetStats.representativePredator;
  if (rep < 0 || !world.creatureAlive[rep]) return false;
  const selfGenome = world.creatureGenome[ci];
  const repGenome = world.creatureGenome[rep];
  if (!selfGenome || !repGenome) return false;
  return geneticSimilarity(selfGenome, repGenome) >= PACK_PREDATOR_MERGE_MIN_SIMILARITY;
}

/** Apply pack-based flocking, shared sensing, and compute kin scores. */
export function updateFlocking(
  world: World,
  spatialHash: SpatialHash,
  foodSignalRadius = FOOD_SIGNAL_RADIUS,
  foodSignalMinStrength = FOOD_SIGNAL_MIN_STRENGTH,
  foodSignalShareWeight = FOOD_SIGNAL_SHARE_WEIGHT,
  foodSignalBlendWeight = FOOD_SIGNAL_BLEND_WEIGHT,
  foodSignalRelayAttenuation = FOOD_SIGNAL_RELAY_ATTENUATION,
  foodSignalMaxHops = FOOD_SIGNAL_MAX_HOPS,
  foodSignalDecayTicks = FOOD_SIGNAL_DECAY_TICKS,
  foodSignalRelayAgeFactor = FOOD_SIGNAL_RELAY_AGE_FACTOR,
  neighborBudget = 0,
  lodTier = 0,
): void {
  rebuildPackStats(world);
  world.flockFearOverrides = 0;
  world.flockHardSeparationApplies = 0;
  world.flockSoftSeparationApplies = 0;
  world.flockAntiMillApplies = 0;
  world.flockPackSwitches = 0;
  world.flockPackMerges = 0;
  world.flockLeaderReassigns = 0;
  world.flockAvgSamePackNeighbors = 0;
  let samePackNeighborSum = 0;
  let aliveCount = 0;

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
  const herdRange2 = CLAN_HERD_RANGE * CLAN_HERD_RANGE;
  const packSeekMinDist2 = PACK_SEEK_MIN_DISTANCE * PACK_SEEK_MIN_DISTANCE;
  const packRejoinMaxDist2 = PACK_REJOIN_MAX_DIST * PACK_REJOIN_MAX_DIST;
  const packMergeDist2 = PACK_MERGE_DISTANCE * PACK_MERGE_DISTANCE;
  const separationRange2 = BOID_SEPARATION_RADIUS * BOID_SEPARATION_RADIUS;
  const separationHardTriggerDist = BOID_SEPARATION_RADIUS * BOID_SEPARATION_HARD_TRIGGER_RATIO;
  const alignmentRange2 = BOID_ALIGNMENT_RADIUS * BOID_ALIGNMENT_RADIUS;
  const cohesionRange2 = BOID_COHESION_RADIUS * BOID_COHESION_RADIUS;
  const antiMillMinRange2 = PACK_ANTI_MILL_MIN_RADIUS * PACK_ANTI_MILL_MIN_RADIUS;
  const antiMillMaxRange2 = PACK_ANTI_MILL_MAX_RADIUS * PACK_ANTI_MILL_MAX_RADIUS;
  const foodSignalRange2 = foodSignalRadius * foodSignalRadius;
  const foodSignalRelayAgeTicks = Math.max(1, Math.floor(foodSignalDecayTicks * foodSignalRelayAgeFactor));
  const lodRangeScale = lodTier >= 2 ? 0.6 : (lodTier === 1 ? 0.8 : 1.0);
  const queryRange = Math.max(CLAN_HERD_RANGE, BOID_SEPARATION_RADIUS, BOID_ALIGNMENT_RADIUS, BOID_COHESION_RADIUS, PACK_MERGE_DISTANCE, foodSignalRadius) * lodRangeScale;
  const nonPackSeparationMult = 0.25;
  const leaderStickinessBonus = 0.12;

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
    let packId = world.creaturePackId[ci];
    if (packId < 0) {
      packId = world.allocPackId();
      joinPack(world, ci, packId);
    }

    if (_packJoinLockTimer[ci] > 0) _packJoinLockTimer[ci]--;
    if (_packSeekTimer[ci] > 0) _packSeekTimer[ci]--;
    if (_packMergeCooldown[ci] > 0) _packMergeCooldown[ci]--;
    if (_packContactRecoveryTimer[ci] > 0) _packContactRecoveryTimer[ci]--;
    if (_antiMillRecoveryTimer[ci] > 0) _antiMillRecoveryTimer[ci]--;

    // Boids accumulators (Separation / Alignment / Cohesion)
    let sepX = 0, sepY = 0, sepCount = 0;
    let nearestSepDist = Infinity;
    let alignX = 0, alignY = 0, alignWeight = 0, alignCount = 0;
    let cohX = 0, cohY = 0, cohWeight = 0, cohCount = 0;
    let samePackCenterX = 0, samePackCenterY = 0, samePackCenterCount = 0;

    // Pack bookkeeping
    let samePackCount = 0;
    let bestFoodX = 0, bestFoodY = 0, bestFoodDist2 = Infinity;
    let signalFoodX = 0, signalFoodY = 0, signalFoodW = 0;
    let minRelayHop = 255;
    let hasRelayCandidate = false;
    let alarmThreatX = 0, alarmThreatY = 0, alarmThreatDist2 = Infinity;
    let bestOtherPack = -1;
    let bestOtherPackDist2 = Infinity;
    let otherPackContactNeighbors = 0;
    const selfWantsFood = _wantsFood[ci] === 1;
    const selfFoundFood = selfWantsFood ? _hasSensedFood[ci] : 1;
    const selfFoundThreat = _hasSensedThreat[ci] || _fearTimer[ci] > 0;
    const energyFrac = world.creatureEnergy[ci] / Math.max(1, world.creatureMaxEnergy[ci]);
    const hungryForFood = energyFrac <= CLAN_HUNGER_OVERRIDE_THRESHOLD;
    const explorationMode = selfWantsFood && !selfFoundFood && bestFoodDist2 === Infinity && signalFoodW <= 0;
    const hardHungry = energyFrac <= PACK_REJOIN_HUNGER_GATE;
    const recoveryBoost = _packContactRecoveryTimer[ci] > 0 ? 1.45 : 1.0;
    const packPriority = PACK_HERD_PRIORITY_MULT * recoveryBoost;
    const currentLeader = _leaderId[ci];
    let bestLeader = ci;
    let bestLeaderScore = genome.adhesionStrength + energyFrac + Math.min(_localCrowd[ci], 12) * CLAN_LEADER_DENSITY_WEIGHT + (currentLeader === ci ? leaderStickinessBonus : 0);
    aliveCount++;

    // Per-creature query generation: dedupe neighbors within this query only.
    _visitedGeneration++;
    if (_visitedGeneration > 65000) {
      _visited.fill(0);
      _visitedGeneration = 1;
    }
    const gen = _visitedGeneration;
    _visited[ci] = gen;

    // Query spatial hash for nearby blobs
    let processedNeighbors = 0;
    spatialHash.query(cx, cy, queryRange, (blobIdx) => {
      if (neighborBudget > 0 && processedNeighbors >= neighborBudget) return;
      const otherCi = world.blobCreature[blobIdx];
      if (otherCi < 0 || _visited[otherCi] === gen) return;
      _visited[otherCi] = gen;
      if (!world.creatureAlive[otherCi]) return;
      const otherPack = world.creaturePackId[otherCi];
      if (otherPack < 0) return;

      // Use other creature's core position
      const otherCoreIdx = world.creatureBlobs[world.creatureBlobStart[otherCi]];
      const ox = world.blobX[otherCoreIdx];
      const oy = world.blobY[otherCoreIdx];
      const cdx = ox - cx;
      const cdy = oy - cy;
      const cd2 = cdx * cdx + cdy * cdy;
      if (cd2 < 1e-6) return;
      processedNeighbors++;
      const dist = Math.sqrt(cd2);

      // Rule 1 (Separation): closest neighbors always repel.
      if (cd2 <= separationRange2) {
        const inPack = otherPack === packId;
        const neighborMult = inPack ? BOID_PACK_NEIGHBOR_MULT : nonPackSeparationMult;
        const proximity = 1 - Math.min(1, dist / BOID_SEPARATION_RADIUS);
        const sepW = BOID_SEPARATION_WEIGHT * neighborMult * proximity;
        sepX += (-cdx / dist) * sepW;
        sepY += (-cdy / dist) * sepW;
        sepCount++;
        if (dist < nearestSepDist) nearestSepDist = dist;
      }

      if (otherPack === packId) {
        if (cd2 <= herdRange2) samePackCount++;

        const otherGenome = world.creatureGenome[otherCi];
        if (otherGenome) {
          const otherEnergyFrac = world.creatureEnergy[otherCi] / Math.max(1, world.creatureMaxEnergy[otherCi]);
          const otherScore = otherGenome.adhesionStrength + otherEnergyFrac + Math.min(_localCrowd[otherCi], 12) * CLAN_LEADER_DENSITY_WEIGHT + (otherCi === currentLeader ? leaderStickinessBonus : 0);
          if (otherScore > bestLeaderScore || (otherScore === bestLeaderScore && otherCi < bestLeader)) {
            bestLeader = otherCi;
            bestLeaderScore = otherScore;
          }
        }

        if (cd2 <= alignmentRange2) {
          const ovx = world.blobX[otherCoreIdx] - world.blobPrevX[otherCoreIdx];
          const ovy = world.blobY[otherCoreIdx] - world.blobPrevY[otherCoreIdx];
          alignX += ovx * BOID_PACK_NEIGHBOR_MULT;
          alignY += ovy * BOID_PACK_NEIGHBOR_MULT;
          alignWeight += BOID_PACK_NEIGHBOR_MULT;
          alignCount++;
        }
        if (cd2 <= cohesionRange2) {
          cohX += ox * BOID_PACK_NEIGHBOR_MULT;
          cohY += oy * BOID_PACK_NEIGHBOR_MULT;
          cohWeight += BOID_PACK_NEIGHBOR_MULT;
          cohCount++;
          samePackCenterX += ox;
          samePackCenterY += oy;
          samePackCenterCount++;
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
        if (cd2 <= foodSignalRange2 && _foodSignalStrength[otherCi] >= foodSignalMinStrength && _foodSignalHop[otherCi] <= foodSignalMaxHops) {
          const shareRelationMult = 1.0;
          const relayScale = Math.pow(foodSignalRelayAttenuation, _foodSignalHop[otherCi] + 1);
          const effectiveStrength = _foodSignalStrength[otherCi] * foodSignalShareWeight * relayScale * shareRelationMult;
          signalFoodX += _foodSignalX[otherCi] * effectiveStrength;
          signalFoodY += _foodSignalY[otherCi] * effectiveStrength;
          signalFoodW += effectiveStrength;
          hasRelayCandidate = true;
          if (_foodSignalHop[otherCi] < minRelayHop) minRelayHop = _foodSignalHop[otherCi];
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

      // Alarm signaling: only same-pack threat relay.
      if (!selfFoundThreat && otherPack === packId && _hasSensedThreat[otherCi]) {
        const tx = _sensedThreatX[otherCi];
        const ty = _sensedThreatY[otherCi];
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
    samePackNeighborSum += samePackCount;
    if (_herdBondTimer[ci] > 0) _herdBondTimer[ci]--;
    if (_herdTimer[ci] > 0) _herdTimer[ci]--;

    if (samePackCount === 0) _packIsolationTimer[ci]++;
    else _packIsolationTimer[ci] = 0;

    // Pack switching: only after sustained isolation (or singleton pack) and not during join lock.
    const currentPackStats = _packStats.get(packId);
    const targetPackStats = bestOtherPack >= 0 ? _packStats.get(bestOtherPack) : undefined;
    const currentPackSize = currentPackStats?.size ?? 1;
    if (
      bestOtherPack >= 0 &&
      bestOtherPack !== packId &&
      canCreatureJoinPack(world, ci, targetPackStats) &&
      _packJoinLockTimer[ci] <= 0 &&
      _packContactRecoveryTimer[ci] <= 0 &&
      (_packIsolationTimer[ci] >= PACK_LEAVE_ISOLATION_TICKS || currentPackSize <= 1)
    ) {
      joinPack(world, ci, bestOtherPack);
      packId = bestOtherPack;
      bestLeader = ci;
      samePackCount = 0;
      world.flockPackSwitches++;
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
    const assignedLeader = _leaderId[ci];
    let needReassign = _leaderTimer[ci] <= 0 || assignedLeader < 0 || !world.creatureAlive[assignedLeader];
    if (!needReassign && assignedLeader !== ci) {
      if (world.creaturePackId[assignedLeader] !== packId) {
        needReassign = true;
      }
      const leaderCoreIdx = world.creatureBlobs[world.creatureBlobStart[assignedLeader]];
      const ldx = world.blobX[leaderCoreIdx] - cx;
      const ldy = world.blobY[leaderCoreIdx] - cy;
      const ld2 = ldx * ldx + ldy * ldy;
      if (ld2 > splitDist2) needReassign = true;
    }

    if (needReassign) {
      const prevLeader = _leaderId[ci];
      _leaderId[ci] = samePackCount > 0 ? bestLeader : ci;
      _leaderTimer[ci] = _herdMode[ci] ? Math.floor(CLAN_LEADER_REASSIGN_TICKS * 1.2) : CLAN_LEADER_REASSIGN_TICKS;
      if (_leaderId[ci] !== prevLeader) world.flockLeaderReassigns++;
    }

    const leader = _leaderId[ci];
    if (
      leader >= 0 &&
      world.creatureAlive[leader] &&
      world.creaturePackId[leader] === packId
    ) {
      _isLeader[leader] = 1;
    }

    // Alarm signaling: packmate detected threat -> trigger fear and flee
    if (!selfFoundThreat && !_hasWeapon[ci] && alarmThreatDist2 < Infinity) {
      _fearTimer[ci] = FEAR_DURATION;
      _fearThreatX[ci] = alarmThreatX;
      _fearThreatY[ci] = alarmThreatY;
      forceSteer(ci, cx - alarmThreatX, cy - alarmThreatY, 0.95);
    }
    if (_fearTimer[ci] > 0) {
      world.flockFearOverrides++;
      continue;
    }

    // Rule 1 hard-priority: if personal space is breached, separation dominates.
    let separationHard = false;
    const sepMag2 = sepX * sepX + sepY * sepY;
    if (sepCount > 0 && sepMag2 > 1e-6 && nearestSepDist <= separationHardTriggerDist) {
      const sepMag = Math.sqrt(sepMag2);
      forceSteer(ci, sepX / sepMag, sepY / sepMag, Math.min(BOID_SEPARATION_HARD_WEIGHT * packPriority, BOID_MAX_FORCE));
      separationHard = true;
      world.flockHardSeparationApplies++;
    } else if (sepCount > 0 && sepMag2 > 1e-6) {
      const sepMag = Math.sqrt(sepMag2);
      addSteer(ci, sepX / sepMag, sepY / sepMag, Math.min(BOID_SEPARATION_SOFT_WEIGHT * packPriority, BOID_MAX_FORCE));
      world.flockSoftSeparationApplies++;
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

    if (!separationHard) {
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

      // Anti-mill correction: damp orbiting around local pack centroid and bias forward drift.
      if (samePackCenterCount >= PACK_ANTI_MILL_ACTIVATION_NEIGHBORS) {
        const centroidX = samePackCenterX / samePackCenterCount;
        const centroidY = samePackCenterY / samePackCenterCount;
        const toCentroidX = centroidX - cx;
        const toCentroidY = centroidY - cy;
        const radialDist2 = toCentroidX * toCentroidX + toCentroidY * toCentroidY;
        if (radialDist2 >= antiMillMinRange2 && radialDist2 <= antiMillMaxRange2) {
          const radialDist = Math.sqrt(radialDist2);
          const rx = toCentroidX / radialDist;
          const ry = toCentroidY / radialDist;
          const tx = -ry;
          const ty = rx;
          const vx = world.blobX[coreIdx] - world.blobPrevX[coreIdx];
          const vy = world.blobY[coreIdx] - world.blobPrevY[coreIdx];
          const tangential = vx * tx + vy * ty;
          const tangentialSpeed = Math.abs(tangential);
          let antiMillWeight = 0;
          let activated = false;
          if (tangentialSpeed >= PACK_ANTI_MILL_FORCE_TANGENTIAL_SPEED) {
            antiMillWeight = 1.0;
            _antiMillRecoveryTimer[ci] = PACK_ANTI_MILL_RECOVERY_TICKS;
            activated = true;
          } else if (_antiMillRecoveryTimer[ci] > 0) {
            antiMillWeight = PACK_ANTI_MILL_VELOCITY_DAMP;
          }
          if (antiMillWeight > 0) {
            const antiTanX = -tx * Math.sign(tangential || 1);
            const antiTanY = -ty * Math.sign(tangential || 1);
            const forwardX = Math.cos(world.creatureHeading[ci]);
            const forwardY = Math.sin(world.creatureHeading[ci]);
            const crowdDamp = samePackCount >= PACK_ANTI_MILL_ACTIVATION_NEIGHBORS ? PACK_CENTROID_DAMP_WHEN_CROWDED : 1;
            const corrX =
              antiTanX * PACK_ANTI_MILL_TANGENTIAL_DAMP +
              rx * PACK_ANTI_MILL_RADIAL_PULL * crowdDamp +
              forwardX * PACK_FORWARD_DRIFT_WEIGHT * PACK_ANTI_MILL_FORCE_FORWARD_BIAS;
            const corrY =
              antiTanY * PACK_ANTI_MILL_TANGENTIAL_DAMP +
              ry * PACK_ANTI_MILL_RADIAL_PULL * crowdDamp +
              forwardY * PACK_FORWARD_DRIFT_WEIGHT * PACK_ANTI_MILL_FORCE_FORWARD_BIAS;
            const corrMag2 = corrX * corrX + corrY * corrY;
            if (corrMag2 > 1e-6) {
              const corrMag = Math.sqrt(corrMag2);
              addSteer(ci, corrX / corrMag, corrY / corrMag, Math.min(packPriority * antiMillWeight, BOID_MAX_FORCE));
              if (activated) world.flockAntiMillApplies++;
            }
          }
        }
      }

      // Leader-follow roaming
      if (
        leader >= 0 &&
        world.creatureAlive[leader] &&
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
          const hungerLeaderMult = explorationMode ? 0.18 : (hardHungry ? 0.55 : 1.0);
          addSteer(ci, ldx, ldy, CLAN_LEADER_WEIGHT * packPriority * herdMult * bondMult * hungerLeaderMult);
        }
      }

      // Long-range regroup: isolated members seek their pack centroid across the map.
      if (samePackCount === 0 && !hardHungry && !explorationMode) {
        const stats = _packStats.get(packId);
        if (stats && stats.size > 1) {
          const anchorX = stats.sumX / stats.size;
          const anchorY = stats.sumY / stats.size;
          const pdx = anchorX - cx;
          const pdy = anchorY - cy;
          const pd2 = pdx * pdx + pdy * pdy;
          if (pd2 >= packSeekMinDist2 && pd2 <= packRejoinMaxDist2) {
            const packSizeMult = Math.min(1.4, 1 + Math.max(0, stats.size - 3) * 0.03);
            addSteer(ci, pdx, pdy, PACK_REJOIN_FORCE * PACK_SEEK_WEIGHT * packPriority * packSizeMult);
          }
        }
      }

      // Rule 2 (Alignment): match local velocity heading.
      if (alignCount >= BOID_MIN_NEIGHBORS_ALIGN && alignWeight > 0) {
        const avx = alignX / alignWeight;
        const avy = alignY / alignWeight;
        const amag2 = avx * avx + avy * avy;
        if (amag2 > 1e-6) {
          const amag = Math.sqrt(amag2);
          const herdMult = _herdMode[ci] ? 1.2 : 1.0;
          const bondMult = _herdBondTimer[ci] > 0 ? CLAN_BOND_ALIGNMENT_MULT : 1.0;
          const persistentMult = samePackCount > 0 && !_herdMode[ci] ? PACK_PERSISTENT_ALIGNMENT_WEIGHT : 1.0;
          const exploreSuppress = explorationMode ? 0.22 : 1.0;
          addSteer(ci, avx / amag, avy / amag, Math.min(BOID_ALIGNMENT_WEIGHT * CLAN_ALIGNMENT_WEIGHT * persistentMult * packPriority * herdMult * bondMult * exploreSuppress, BOID_MAX_FORCE));
        }
      }

      // Rule 3 (Cohesion): steer toward local center of mass.
      if (cohCount >= BOID_MIN_NEIGHBORS_COHESION && cohWeight > 0) {
        const targetX = cohX / cohWeight;
        const targetY = cohY / cohWeight;
        const dx = targetX - cx;
        const dy = targetY - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) {
          const d = Math.sqrt(d2);
          const adhesionTrait = hasAdhesion ? (1 + genome.adhesionStrength) : (0.75 + genome.adhesionStrength * 0.25);
          const herdMult = _herdMode[ci] ? 1.2 : 1.0;
          const bondMult = _herdBondTimer[ci] > 0 ? CLAN_BOND_COHESION_MULT : 1.0;
          const persistentMult = samePackCount > 0 && !_herdMode[ci] ? PACK_PERSISTENT_COHESION_WEIGHT : 1.0;
          const exploreSuppress = explorationMode ? 0.25 : 1.0;
          addSteer(ci, dx / d, dy / d, Math.min(BOID_COHESION_WEIGHT * CLAN_COHESION_WEIGHT * persistentMult * packPriority * adhesionTrait * herdMult * bondMult * exploreSuppress, BOID_MAX_FORCE));
        }
      }

      // Shared food sensing: lowest calm-state priority.
      if (
        !selfFoundFood &&
        _packContactRecoveryTimer[ci] <= 0 &&
        (hardHungry || samePackCount > 0) &&
        bestFoodDist2 > FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND &&
        bestFoodDist2 < Infinity
      ) {
        const fdx = bestFoodX - cx;
        const fdy = bestFoodY - cy;
        const bondFoodMult = _herdBondTimer[ci] > 0 ? CLAN_BOND_FOOD_MULT : 1.0;
        addSteer(ci, fdx, fdy, (hungryForFood ? CLAN_FOOD_WEIGHT_HUNGRY : CLAN_FOOD_WEIGHT_CALM) * bondFoodMult);
      }

      // Exploration pressure: when foodless and signal-less in dense packs, fan out from local centroid.
      if (explorationMode) {
        let appliedScatter = false;
        if (samePackCenterCount >= 2) {
          const centerX = samePackCenterX / samePackCenterCount;
          const centerY = samePackCenterY / samePackCenterCount;
          const spreadX = cx - centerX;
          const spreadY = cy - centerY;
          const spreadMag2 = spreadX * spreadX + spreadY * spreadY;
          if (spreadMag2 > 1e-6) {
            const spreadMag = Math.sqrt(spreadMag2);
            const densityMult = Math.min(2.2, samePackCenterCount / 3);
            const hungerMult = hungryForFood ? 1.5 : 1.0;
            addSteer(ci, spreadX / spreadMag, spreadY / spreadMag, FORAGE_SCATTER_WEIGHT * densityMult * hungerMult);
            appliedScatter = true;
          }
        }
        if (!appliedScatter) {
          const jitter = Math.sin((world.tick + ci * 17) * 0.09) * 0.9;
          const roamAngle = world.creatureHeading[ci] + jitter;
          addSteer(ci, Math.cos(roamAngle), Math.sin(roamAngle), FORAGE_SCATTER_WEIGHT * (hungryForFood ? 1.4 : 1.0));
        }
      }

      // Local food communication with decay: packs can coordinate convergence.
      if (
        _intentMode[ci] !== INTENT_FLEE &&
        _intentMode[ci] !== INTENT_HUNT &&
        signalFoodW > 0 &&
        (hungryForFood || !selfFoundFood)
      ) {
        const sx = signalFoodX / signalFoodW;
        const sy = signalFoodY / signalFoodW;
        const sdx = sx - cx;
        const sdy = sy - cy;
        const sd2 = sdx * sdx + sdy * sdy;
        if (sd2 > FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND) {
          const intentMult = _intentMode[ci] === INTENT_FORAGE ? 1.0 : 0.72;
          const hungerMult = hungryForFood ? FOOD_SIGNAL_HUNGRY_MULT : 1.0;
          const scoutMult = _intentMode[ci] === INTENT_SCOUT ? FOOD_SIGNAL_SCOUT_MULT : 1.0;
          const selfFoodMult = selfFoundFood && hungryForFood ? 1.15 : 1.0;
          addSteer(ci, sdx, sdy, foodSignalBlendWeight * intentMult * hungerMult * scoutMult * selfFoodMult);
          world.foodSignalSteerApplies++;
          _foodSignalX[ci] = sx;
          _foodSignalY[ci] = sy;
          const relayStrength = Math.min(
            0.95,
            Math.max(_foodSignalStrength[ci], signalFoodW * 0.65, foodSignalMinStrength * 1.25),
          );
          _foodSignalStrength[ci] = relayStrength;
          _foodSignalAge[ci] = Math.max(_foodSignalAge[ci], foodSignalRelayAgeTicks);
          _foodSignalHop[ci] = hasRelayCandidate ? Math.min(255, Math.min(foodSignalMaxHops + 1, minRelayHop + 1)) : _foodSignalHop[ci];
          _foodSignalDirect[ci] = 0;
          world.foodSignalRelayAdopts++;
        }
      }
    }

    // Sustained inter-pack contact triggers pack merge (smaller into larger).
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
      if (thisStats && otherStats) {
        const mergedSize = thisStats.size + otherStats.size;
        const dominantMergeCap = Math.max(2, Math.floor(world.creatureCount * PACK_MERGE_MAX_POP_FRACTION));
        const wouldCreateDominantPack = _packStats.size > 2 && mergedSize > dominantMergeCap;
        const small = Math.min(thisStats.size, otherStats.size);
        const large = Math.max(thisStats.size, otherStats.size);
        const isSmallPackMerge = small > 0 && small <= PACK_MERGE_SMALL_PACK_MAX;
        const predatorsA = thisStats.predatorCount > 0;
        const predatorsB = otherStats.predatorCount > 0;
        let predatorCompatible = true;
        if (predatorsA !== predatorsB) {
          predatorCompatible = false;
        } else if (predatorsA && predatorsB) {
          const pa = thisStats.representativePredator;
          const pb = otherStats.representativePredator;
          predatorCompatible = false;
          if (pa >= 0 && pb >= 0) {
            const ga = world.creatureGenome[pa];
            const gb = world.creatureGenome[pb];
            if (ga && gb && geneticSimilarity(ga, gb) >= PACK_PREDATOR_MERGE_MIN_SIMILARITY) {
              predatorCompatible = true;
            }
          }
        }
        if (!wouldCreateDominantPack && isSmallPackMerge && predatorCompatible && (large / small) <= PACK_MERGE_MAX_SIZE_RATIO) {
          const mergeFrom = thisStats.size <= otherStats.size ? packId : otherPack;
          const mergeTo = mergeFrom === packId ? otherPack : packId;
          mergePacks(world, mergeFrom, mergeTo);
          rebuildPackStats(world);
          world.flockPackMerges++;
        }
      }
      _packMergeCandidate[ci] = -1;
      _packMergeContactTicks[ci] = 0;
      _packMergeCooldown[ci] = PACK_MERGE_COOLDOWN_TICKS;
    }
  }

  world.flockAvgSamePackNeighbors = aliveCount > 0 ? (samePackNeighborSum / aliveCount) : 0;
  if (aliveCount > 0) {
    let signalStrengthSum = 0;
    let signalHopSum = 0;
    for (let ci = 0; ci < world.creatureAlive.length; ci++) {
      if (!world.creatureAlive[ci]) continue;
      signalStrengthSum += _foodSignalStrength[ci];
      signalHopSum += _foodSignalHop[ci];
    }
    world.foodSignalAvgStrength = signalStrengthSum / aliveCount;
    world.foodSignalAvgHop = signalHopSum / aliveCount;
  } else {
    world.foodSignalAvgStrength = 0;
    world.foodSignalAvgHop = 0;
  }
}
