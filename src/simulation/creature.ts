import { World } from './world';
import { SpatialHash } from './spatial-hash';
import { BLOB_TYPE_COUNT, BlobType, FoodKind, Genome } from '../types';
import { randomGenome, mutateGenome, crossoverGenome } from './genome';
import {
  BASE_BLOB_RADIUS, CORE_RADIUS_MULT, BLOB_MASS_BASE,
  SHIELD_MASS_MULT, FAT_MASS_MULT, STAR_REST_DISTANCE, RING_REST_DISTANCE,
  MOTOR_FORCE, SENSOR_RANGE, BASIC_FOOD_SENSE_RANGE, HUNGRY_FOOD_SENSE_MIN_RANGE, FOOD_TARGET_LOCK_TICKS, FOOD_TARGET_DEADBAND, FOOD_TARGET_NEAREST_SWITCH_DISTANCE,
  FOOD_MEMORY_MAX_AGE_TICKS, FOOD_MEMORY_MIN_STRENGTH, FOOD_MEMORY_DECAY_PER_TICK, FOOD_MEMORY_EAT_REINFORCE, FOOD_MEMORY_FAIL_DECAY_MULT,
  WEAPON_DAMAGE, WEAPON_ENERGY_COST, WEAPON_UPKEEP_PER_BLOB,
  MOUTH_EFFICIENCY, PHOTO_ENERGY_PER_TICK, FAT_ENERGY_BONUS,
  PHOTO_CROWD_PENALTY_NEIGHBORS_FULL, PHOTO_CROWD_PENALTY_MAX, PHOTO_IDLE_SPEED_SOFT_START, PHOTO_IDLE_SPEED_SOFT_FULL, PHOTO_IDLE_PENALTY_MIN_MULT,
  PHOTO_MAINTENANCE_COST_PER_BLOB, PHOTO_MAINTENANCE_SIZE_MULT,
  ADHESION_FORCE, ADHESION_RANGE, METABOLISM_COST_PER_BLOB, METABOLISM_SCALING_EXPONENT,
  WORLD_SIZE, BOUNDARY_PADDING, FOOD_ENERGY, FOOD_RADIUS, FOOD_STALE_TICKS,
  FOOD_GROWTH_MIN_MULT, FOOD_GROWTH_PEAK_MULT, FOOD_GROWTH_STALE_MULT, FOOD_GROWTH_PEAK_AGE_FRAC,
  MEAT_DECAY_MIN_MULT, MEAT_PREDATOR_EAT_EFFICIENCY_MULT, MEAT_STALE_TICKS,
  CARRIED_MEAT_CONSUME_PER_TICK_BASE, CARRIED_MEAT_MAX_TICKS, CARRIED_MEAT_STALE_ENERGY_FLOOR_MULT, CARRIED_MEAT_CONSUME_START_DELAY_TICKS, CARRIED_MEAT_ATTACH_BITE_ENERGY, CARRIED_MEAT_ENERGY_MULT, PREDATOR_DIGEST_HUNT_SUPPRESS_TICKS, PREDATOR_DIGEST_HUNT_RESUME_ENERGY_FRAC, CARRIED_MEAT_DROP_ON_UNLATCH,
  PREDATOR_FULL_AFTER_FEED_TICKS, PREDATOR_FULL_RELEASE_ENERGY_FRAC, PREDATOR_FULL_DORMANT_MOTOR_MULT, PREDATOR_FULL_DORMANT_STEER_MULT, PREDATOR_FULL_PREY_AVOID_WEIGHT, PREDATOR_FULL_EDGE_SEEK_WEIGHT,
  REPRODUCE_ENERGY_THRESHOLD, REPRODUCE_COOLDOWN, REPRODUCE_ENERGY_SPLIT,
  MUTATION_RATE, STRUCTURAL_MUTATION_RATE, MAX_BLOBS, MAX_FOOD, CREATURE_CAP,
  MATE_RANGE, MATE_MIN_SIMILARITY, SEXUAL_REPRODUCE_ENERGY_SPLIT, ASEXUAL_FALLBACK_TICKS,
  PREDATOR_REPRO_ENERGY_THRESHOLD_ADD, PREDATOR_REPRO_COOLDOWN_MULT, PREDATOR_REPRO_FALLBACK_MULT,
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
  PACK_HERD_PRIORITY_MULT, PACK_REJOIN_FORCE, PACK_REJOIN_MAX_DIST, PACK_REJOIN_HUNGER_GATE, PACK_MAX_LEADERS_PER_PACK, PACK_CONTACT_RECOVERY_TICKS,
  PACK_POST_FEAR_REJOIN_TICKS, PACK_POST_FEAR_REJOIN_FORCE_MULT,
  PACK_ANCHOR_LEASH_START, PACK_ANCHOR_LEASH_HARD, PACK_ANCHOR_RETURN_FORCE, PACK_ANCHOR_HARD_RETURN_FORCE, PACK_STRAGGLER_ISOLATION_TICKS, PACK_STRAGGLER_RELEASE_NEIGHBORS, PACK_REJOIN_ISOLATION_NEIGHBORS, PACK_REJOIN_URGENT_ISOLATION_TICKS, PACK_REJOIN_URGENT_FORCE_MULT, PACK_REJOIN_URGENT_SOCIAL_MULT,
  PACK_SCOUT_ROLE_MIN_PACK_SIZE, PACK_SCOUT_MIN_REMAINING_AGE_TICKS,
  PACK_SCOUT_HIGH_ENERGY_FRAC, PACK_SCOUT_FOOD_SENSE_MULT, PACK_SCOUT_REPORT_MIN_PLANT_COUNT, PACK_SCOUT_REPORT_INTERVAL_TICKS, PACK_SCOUT_REPORT_HOLD_RADIUS, PACK_SCOUT_REPORT_HOLD_WEIGHT,
  PACK_SCOUT_AWAY_FROM_PACK_WEIGHT, PACK_SCOUT_PATROL_WEIGHT, PACK_SCOUT_PATROL_SEGMENT_TICKS, PACK_SCOUT_PATROL_MARGIN, PACK_SCOUT_PATROL_LANES, PACK_SCOUT_PATROL_DIRECTION_WEIGHT, PACK_SCOUT_METABOLISM_MULT,
  FORAGE_SCATTER_MIN_NEIGHBORS, FORAGE_SCATTER_WEIGHT,
  BOID_SEPARATION_RADIUS, BOID_ALIGNMENT_RADIUS, BOID_COHESION_RADIUS,
  BOID_SEPARATION_WEIGHT, BOID_ALIGNMENT_WEIGHT, BOID_COHESION_WEIGHT, BOID_SEPARATION_HARD_WEIGHT, BOID_SEPARATION_HARD_TRIGGER_RATIO, BOID_SEPARATION_SOFT_WEIGHT,
  BOID_MAX_FORCE, BOID_MIN_NEIGHBORS_ALIGN, BOID_MIN_NEIGHBORS_COHESION, BOID_PACK_NEIGHBOR_MULT,
  FOOD_SIGNAL_RADIUS, FOOD_SIGNAL_DECAY_TICKS, FOOD_SIGNAL_MIN_STRENGTH, FOOD_SIGNAL_SHARE_WEIGHT, FOOD_SIGNAL_BLEND_WEIGHT,
  FOOD_SIGNAL_RELAY_ATTENUATION, FOOD_SIGNAL_MAX_HOPS, FOOD_SIGNAL_RELAY_AGE_FACTOR,
  FOOD_SIGNAL_HUNGRY_MULT, FOOD_SIGNAL_SCOUT_MULT,
  FOOD_SIGNAL_RELAY_HOP_ATTENUATION, FOOD_SIGNAL_RELAY_STALE_START_FRAC, FOOD_SIGNAL_RELAY_STALE_MIN_MULT,
  PACK_HUNGER_RALLY_AVG_ENERGY_ON_FRAC, PACK_HUNGER_RALLY_HUNGRY_FRACTION_ON, PACK_HUNGER_RALLY_MIN_SIGNAL, PACK_HUNGER_RALLY_MIN_PACK_SIZE, PACK_HUNGER_RALLY_STEER_WEIGHT,
  HUNGRY_LOCAL_FOOD_SNAP_FORCE, HUNGRY_LOCAL_FOOD_SNAP_RANGE, HUNGRY_ROAM_DISPLACEMENT_MIN, HUNGRY_ROAM_SCATTER_MULT, HUNGRY_ROAM_FAR_SCATTER_MULT,
  FEEDING_MODE_RANGE, FEEDING_MODE_MIN_NEIGHBORS, FEEDING_MODE_LEADER_MULT, FEEDING_MODE_ALIGNMENT_MULT, FEEDING_MODE_COHESION_MULT, FEEDING_MODE_SEPARATION_MULT,
  INTENT_HUNGER_FORAGE_ON, INTENT_HUNGER_FORAGE_OFF, INTENT_MATE_ENERGY_THRESHOLD, INTENT_HUNT_TARGET_LOCK_TICKS,
  ROLE_FRONT_SENSOR_STRENGTH, ROLE_FRONT_WEAPON_STRENGTH, ROLE_FRONT_REPRO_STRENGTH, ROLE_FRONT_DEADZONE,
  PACK_ANTI_MILL_TANGENTIAL_DAMP, PACK_ANTI_MILL_RADIAL_PULL, PACK_ANTI_MILL_MIN_RADIUS, PACK_ANTI_MILL_MAX_RADIUS,
  PACK_ANTI_MILL_ACTIVATION_NEIGHBORS, PACK_ANTI_MILL_RECOVERY_TICKS, PACK_FORWARD_DRIFT_WEIGHT,
  PACK_CENTROID_DAMP_WHEN_CROWDED, PACK_ANTI_MILL_VELOCITY_DAMP, PACK_ANTI_MILL_FORCE_TANGENTIAL_SPEED, PACK_ANTI_MILL_FORCE_FORWARD_BIAS,
  COLLISION_RADIUS_MULT,
  PREDATION_STEAL_FRACTION, PREDATION_KIN_THRESHOLD,
  PREDATION_VERY_HUNGRY_FRACTION, PREDATION_HUNGRY_KIN_THRESHOLD_MULT, PREDATOR_URGENT_FORAGE_FRACTION, PREDATOR_METABOLISM_MULT, PREDATOR_LATCH_METABOLISM_MULT, PREDATOR_CARRION_METABOLISM_MULT,
  CARRION_DROP_DIVISOR, RENDER_RADIUS_BY_TYPE, RENDER_RADIUS_MULT,
  FEAR_DURATION, FEAR_SPEED_MULT,
  PREDATOR_FEAR_ACTIVE_HOLD_TICKS, PREDATOR_FEAR_KILL_PULSE_TICKS,
  LUNGE_SPEED_MULT, LUNGE_RANGE, STEALTH_DETECTION_MULT, KILL_BOUNTY_FRACTION,
  LATCH_DURATION, LATCH_DAMAGE_MULT, LATCH_MAX, LATCH_TOUCH_PADDING, LATCH_REFRESH_RANGE_MULT,
  LATCH_CONSTRAINT_STRENGTH, LATCH_HUNGRY_DAMAGE_THRESHOLD, LATCH_HUNGRY_DAMAGE_MULT,
  LATCH_BANANAS_MOTOR_MULT, LATCH_BANANAS_TWITCH_ANGLE, LATCH_BANANAS_TWITCH_FREQ, LATCH_BANANAS_WEAPON_PULL_MULT,
  WEAPON_FORWARD_PULL, WEAPON_FORWARD_PULL_IDLE,
  EAT_FULL_STOP_FRACTION, EAT_RESUME_FRACTION, PREDATOR_EAT_FULL_STOP_FRACTION, PREDATOR_EAT_RESUME_FRACTION, EAT_COOLDOWN_TICKS, EAT_MAX_ITEMS_PER_SUBSTEP, FOOD_INTERACTION_RADIUS_MAX_SCALE, FOOD_EAT_CONTACT_MULT, FOOD_EAT_CONTACT_HUNGRY_MULT, FOOD_EAT_CONTACT_CRITICAL_MULT,
  NON_PREDATOR_EAT_EFFICIENCY, PREDATOR_PLANT_EAT_EFFICIENCY,
  CREATURE_MAX_AGE_TICKS,
  CREATURE_SIZE_BIRTH_SCALE, CREATURE_SIZE_BASE_ADULT_SCALE, CREATURE_SIZE_MAX_ADULT_SCALE,
  CREATURE_SIZE_ADULT_AGE_FRAC, CREATURE_SIZE_GROWTH_ENERGY_MIN_FRAC, CREATURE_SIZE_GROWTH_ENERGY_FULL_FRAC,
  CREATURE_SIZE_GROWTH_MAX_PER_TICK, CREATURE_SIZE_OVERGROW_ENERGY_FRAC, CREATURE_SIZE_OVERGROW_RATE,
  CREATURE_SIZE_REPRO_MIN_ADULT_FRAC, CREATURE_SIZE_MASS_EXPONENT, CREATURE_SIZE_METABOLISM_EXPONENT,
  CREATURE_SIZE_ENERGY_CAP_EXPONENT, CREATURE_SIZE_WEAPON_UPKEEP_EXPONENT,
  PREDATOR_FLOCK_DETECT_RANGE, PREDATOR_FLOCK_CLUSTER_RADIUS, PREDATOR_FLOCK_DENSITY_WEIGHT,
  PREDATOR_SIZE_TARGET_SOFT_RATIO, PREDATOR_SIZE_TARGET_HARD_RATIO,
  PREDATOR_SIZE_DAMAGE_EXPONENT, PREDATOR_SIZE_DAMAGE_MIN_MULT, PREDATOR_SIZE_DAMAGE_MAX_MULT,
  PREDATOR_SIZE_LATCH_REFRESH_EXPONENT, PREDATOR_SIZE_LATCH_REFRESH_MIN_MULT, PREDATOR_SIZE_LATCH_REFRESH_MAX_MULT,
  STARVING_FOOD_PRIORITY_ON_FRAC, CRITICAL_FOOD_PRIORITY_ON_FRAC,
  STARVING_PACK_LEADER_MULT, STARVING_PACK_ALIGNMENT_MULT, STARVING_PACK_COHESION_MULT, STARVING_PACK_SEEK_MULT,
  STARVING_ANTI_MILL_MULT, STARVING_FOOD_STEER_MULT, CRITICAL_FOOD_STEER_MULT,
  PREDATOR_PACK_COHESION_MULT, PREDATOR_PACK_ALIGNMENT_MULT, PREDATOR_PACK_LEADER_MULT, PREDATOR_PACK_SEPARATION_MULT,
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
const LEADER_STICKINESS_BONUS = 0.12;

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
  const configuredBirthScale = clamp(world.sizeLifecycleBirthScale, 0.05, CREATURE_SIZE_BASE_ADULT_SCALE);
  const birthScale = world.sizeLifecycleEnabled
    ? configuredBirthScale
    : CREATURE_SIZE_BASE_ADULT_SCALE;

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
    const adultBlobSize = g.blobSizes[i];
    const adultDist = i === 0 ? 0 : STAR_REST_DISTANCE * adultBlobSize;
    const dist = adultDist * birthScale;

    world.blobX[bi] = x + Math.cos(angle) * dist;
    world.blobY[bi] = y + Math.sin(angle) * dist;
    world.blobPrevX[bi] = world.blobX[bi];
    world.blobPrevY[bi] = world.blobY[bi];

    let radius = BASE_BLOB_RADIUS * adultBlobSize;
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

    mass *= adultBlobSize;
    const baseRadius = radius;
    const baseMass = mass;
    const baseSize = adultBlobSize;
    world.blobBaseRadius[bi] = baseRadius;
    world.blobBaseMass[bi] = baseMass;
    world.blobBaseSize[bi] = baseSize;
    world.blobRadius[bi] = baseRadius * birthScale;
    world.blobType[bi] = type;
    world.blobCreature[bi] = ci;
    world.blobMass[bi] = baseMass * Math.pow(birthScale, CREATURE_SIZE_MASS_EXPONENT);
    world.blobSize[bi] = baseSize * birthScale;
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
  const baseMaxEnergy = g.maxEnergy + fatEnergyBonus;
  world.creatureBaseMaxEnergy[ci] = baseMaxEnergy;
  world.creatureAdultScaleGoal[ci] = CREATURE_SIZE_BASE_ADULT_SCALE;
  world.creatureSizeScale[ci] = birthScale;
  world.creatureMaxEnergy[ci] = baseMaxEnergy * Math.pow(birthScale, CREATURE_SIZE_ENERGY_CAP_EXPONENT);
  world.creatureEnergy[ci] = world.creatureMaxEnergy[ci];
  _eatCooldown[ci] = 0;
  _isSatiated[ci] = 0;
  _foodTargetTimer[ci] = 0;
  _foodMemoryX[ci] = x;
  _foodMemoryY[ci] = y;
  _foodMemoryStrength[ci] = 0;
  _foodMemoryAge[ci] = 0;
  _predatorThreatTimer[ci] = 0;
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
  _activeScoutRole[ci] = 0;
  _activeScoutAssignedTick[ci] = 0;
  _foodSignalX[ci] = 0;
  _foodSignalY[ci] = 0;
  _foodSignalStrength[ci] = 0;
  _foodSignalAge[ci] = 0;
  _foodSignalHop[ci] = 0;
  _foodSignalDirect[ci] = 0;
  _sensedFoodKind[ci] = FoodKind.PLANT;
  _scoutPlantClusterSeen[ci] = 0;
  _predatorDigestTimer[ci] = 0;
  _predatorFullTimer[ci] = 0;
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
  world.constraintBaseDist[c] = dist;
  world.constraintDist[c] = dist;
  world.constraintCount++;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function remapClamp(value: number, inMin: number, inMax: number): number {
  if (inMax <= inMin) return value >= inMax ? 1 : 0;
  return clamp01((value - inMin) / (inMax - inMin));
}

function sizeRatioMultiplier(
  attackerBody: number,
  targetBody: number,
  exponent: number,
  minMult: number,
  maxMult: number,
): number {
  const ratio = attackerBody / Math.max(1e-6, targetBody);
  return clamp(Math.pow(Math.max(1e-6, ratio), exponent), minMult, maxMult);
}

export function updateCreatureGrowthAndScaling(
  world: World,
  sizeLifecycleEnabled = true,
  sizeBirthScale = CREATURE_SIZE_BIRTH_SCALE,
  sizeAdultMaxScale = CREATURE_SIZE_MAX_ADULT_SCALE,
  sizeAdultAgeFrac = CREATURE_SIZE_ADULT_AGE_FRAC,
  sizeGrowthEnergyMinFrac = CREATURE_SIZE_GROWTH_ENERGY_MIN_FRAC,
  sizeGrowthEnergyFullFrac = CREATURE_SIZE_GROWTH_ENERGY_FULL_FRAC,
  sizeOvergrowEnergyFrac = CREATURE_SIZE_OVERGROW_ENERGY_FRAC,
  sizeGrowthMaxPerTick = CREATURE_SIZE_GROWTH_MAX_PER_TICK,
  sizeOvergrowRate = CREATURE_SIZE_OVERGROW_RATE,
  sizeMassExponent = CREATURE_SIZE_MASS_EXPONENT,
  sizeEnergyCapExponent = CREATURE_SIZE_ENERGY_CAP_EXPONENT,
): void {
  const birthScale = clamp(sizeBirthScale, 0.05, CREATURE_SIZE_BASE_ADULT_SCALE);
  const minAdultScale = CREATURE_SIZE_BASE_ADULT_SCALE;

  if (!sizeLifecycleEnabled) {
    for (let ci = 0; ci < world.creatureAlive.length; ci++) {
      if (!world.creatureAlive[ci]) continue;
      world.creatureAdultScaleGoal[ci] = minAdultScale;
      world.creatureSizeScale[ci] = minAdultScale;
      const baseMaxEnergy = world.creatureBaseMaxEnergy[ci] > 0
        ? world.creatureBaseMaxEnergy[ci]
        : Math.max(1, world.creatureMaxEnergy[ci]);
      world.creatureBaseMaxEnergy[ci] = baseMaxEnergy;
      world.creatureMaxEnergy[ci] = baseMaxEnergy;
      if (world.creatureEnergy[ci] > world.creatureMaxEnergy[ci]) {
        world.creatureEnergy[ci] = world.creatureMaxEnergy[ci];
      }
    }

    for (let i = 0; i < world.blobCount; i++) {
      const bi = world.activeBlobIds[i];
      if (world.blobCreature[bi] < 0) continue;
      world.blobRadius[bi] = world.blobBaseRadius[bi];
      world.blobMass[bi] = world.blobBaseMass[bi];
      world.blobSize[bi] = world.blobBaseSize[bi];
    }

    for (let c = 0; c < world.constraintCount; c++) {
      world.constraintDist[c] = world.constraintBaseDist[c];
    }
    return;
  }

  const cappedAdultMaxScale = Math.max(minAdultScale, sizeAdultMaxScale);

  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    const creatureMaxAge = world.creatureMaxAge[ci] > 0 ? world.creatureMaxAge[ci] : CREATURE_MAX_AGE_TICKS;
    const ageFrac = clamp01(world.creatureAge[ci] / Math.max(1, creatureMaxAge));
    const maturity = smoothstep(0, Math.max(0.01, sizeAdultAgeFrac), ageFrac);

    let adultScaleGoal = world.creatureAdultScaleGoal[ci];
    if (!(adultScaleGoal > 0)) adultScaleGoal = minAdultScale;
    adultScaleGoal = clamp(adultScaleGoal, minAdultScale, cappedAdultMaxScale);

    const currentMaxEnergy = Math.max(1, world.creatureMaxEnergy[ci]);
    const energyFrac = clamp01(world.creatureEnergy[ci] / currentMaxEnergy);
    if (maturity >= 0.9 && energyFrac >= sizeOvergrowEnergyFrac) {
      const overgrowGate = remapClamp(energyFrac, sizeOvergrowEnergyFrac, 1);
      adultScaleGoal = Math.min(cappedAdultMaxScale, adultScaleGoal + sizeOvergrowRate * overgrowGate);
    }

    const targetScale = lerp(birthScale, adultScaleGoal, maturity);
    let currentScale = world.creatureSizeScale[ci];
    if (!(currentScale > 0)) currentScale = birthScale;
    const growGate = remapClamp(energyFrac, sizeGrowthEnergyMinFrac, sizeGrowthEnergyFullFrac);
    if (targetScale > currentScale && growGate > 0) {
      currentScale += Math.min(targetScale - currentScale, sizeGrowthMaxPerTick * growGate);
    }

    world.creatureSizeScale[ci] = currentScale;
    world.creatureAdultScaleGoal[ci] = adultScaleGoal;
    const baseMaxEnergy = world.creatureBaseMaxEnergy[ci] > 0
      ? world.creatureBaseMaxEnergy[ci]
      : Math.max(1, world.creatureMaxEnergy[ci]);
    world.creatureBaseMaxEnergy[ci] = baseMaxEnergy;
    world.creatureMaxEnergy[ci] = baseMaxEnergy * Math.pow(currentScale, sizeEnergyCapExponent);
    if (world.creatureEnergy[ci] > world.creatureMaxEnergy[ci]) {
      world.creatureEnergy[ci] = world.creatureMaxEnergy[ci];
    }
  }

  for (let i = 0; i < world.blobCount; i++) {
    const bi = world.activeBlobIds[i];
    const ci = world.blobCreature[bi];
    if (ci < 0 || !world.creatureAlive[ci]) continue;
    const scale = Math.max(birthScale, world.creatureSizeScale[ci]);
    world.blobRadius[bi] = world.blobBaseRadius[bi] * scale;
    world.blobMass[bi] = world.blobBaseMass[bi] * Math.pow(scale, sizeMassExponent);
    world.blobSize[bi] = world.blobBaseSize[bi] * scale;
  }

  for (let c = 0; c < world.constraintCount; c++) {
    const a = world.constraintA[c];
    const ci = a >= 0 ? world.blobCreature[a] : -1;
    const scale = (ci >= 0 && world.creatureAlive[ci])
      ? Math.max(birthScale, world.creatureSizeScale[ci])
      : birthScale;
    world.constraintDist[c] = world.constraintBaseDist[c] * scale;
  }
}

function resolveFrontRoleForIntent(intent: number): BlobType {
  if (intent === INTENT_HUNT) return BlobType.WEAPON;
  if (intent === INTENT_MATE) return BlobType.REPRODUCER;
  if (intent === INTENT_FORAGE) return BlobType.MOUTH;
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
  const creatureScale = Math.max(CREATURE_SIZE_BIRTH_SCALE, world.creatureSizeScale[ci] || CREATURE_SIZE_BIRTH_SCALE);
  const scaledStarDist = STAR_REST_DISTANCE * creatureScale;
  const targetX = world.blobX[coreIdx] + Math.cos(heading) * scaledStarDist;
  const targetY = world.blobY[coreIdx] + Math.sin(heading) * scaledStarDist;

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
    const latchBananas = _hasWeapon[ci] === 1 && _hasActiveLatch[ci] === 1;
    const energyFrac = world.creatureEnergy[ci] / Math.max(1, world.creatureMaxEnergy[ci]);
    const predatorFullSuppressed = _hasWeapon[ci] === 1 && _predatorFullTimer[ci] > 0 && energyFrac > PREDATOR_FULL_RELEASE_ENERGY_FRAC;
    const fearMult = (!_hasWeapon[ci] && _fearTimer[ci] > 0) ? FEAR_SPEED_MULT : 1.0;
    const dormantMotorMult = predatorFullSuppressed ? PREDATOR_FULL_DORMANT_MOTOR_MULT : 1.0;
    const frenzyMotorMult = latchBananas ? LATCH_BANANAS_MOTOR_MULT : 1.0;
    const force = motorForce * Math.sqrt(motorSizeSum) / Math.sqrt(count) * lungeMult * fearMult * dormantMotorMult * frenzyMotorMult;
    const coreIdx = world.creatureBlobs[start]; // first blob is core
    let locomotionHeading = heading;
    if (latchBananas) {
      const phase = world.tick * LATCH_BANANAS_TWITCH_FREQ + ci * 0.73;
      const twitch = Math.sin(phase) * 0.7 + Math.cos(phase * 1.9) * 0.3;
      locomotionHeading += twitch * LATCH_BANANAS_TWITCH_ANGLE;
    }
    const fx = Math.cos(locomotionHeading) * force;
    const fy = Math.sin(locomotionHeading) * force;
    const creatureScale = Math.max(CREATURE_SIZE_BIRTH_SCALE, world.creatureSizeScale[ci] || CREATURE_SIZE_BIRTH_SCALE);
    const scaledStarDist = STAR_REST_DISTANCE * creatureScale;

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
      const pullBase = _nearPrey[ci] ? WEAPON_FORWARD_PULL : WEAPON_FORWARD_PULL_IDLE;
      const pull = latchBananas ? pullBase * LATCH_BANANAS_WEAPON_PULL_MULT : pullBase;
      const coreX = world.blobX[coreIdx];
      const coreY = world.blobY[coreIdx];
      // Target point: front of creature on the star orbit circle
      const targetX = coreX + Math.cos(locomotionHeading) * scaledStarDist;
      const targetY = coreY + Math.sin(locomotionHeading) * scaledStarDist;

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
        const dot = fromCoreX * Math.cos(locomotionHeading) + fromCoreY * Math.sin(locomotionHeading);
        if (dot < -0.7 * scaledStarDist) {
          // Perpendicular to heading (always kick clockwise for consistency)
          world.blobX[bi] += -Math.sin(locomotionHeading) * 0.5;
          world.blobY[bi] += Math.cos(locomotionHeading) * 0.5;
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
const _sensedFoodKind = new Uint8Array(MAX_CREATURES);
const _hasSensedFood = new Uint8Array(MAX_CREATURES);
const _scoutPlantClusterSeen = new Uint8Array(MAX_CREATURES);
const _foodTargetX = new Float32Array(MAX_CREATURES);
const _foodTargetY = new Float32Array(MAX_CREATURES);
const _foodTargetTimer = new Int32Array(MAX_CREATURES);
const _wantsFood = new Uint8Array(MAX_CREATURES);
const _foodMemoryX = new Float32Array(MAX_CREATURES);
const _foodMemoryY = new Float32Array(MAX_CREATURES);
const _foodMemoryStrength = new Float32Array(MAX_CREATURES);
const _foodMemoryAge = new Int32Array(MAX_CREATURES);

// Per-creature sensed threat target — written by updateSensors, read by updateFlocking
const _sensedThreatX = new Float32Array(MAX_CREATURES);
const _sensedThreatY = new Float32Array(MAX_CREATURES);
const _hasSensedThreat = new Uint8Array(MAX_CREATURES);

// Fear cooldown — persists across ticks so creatures keep fleeing after threat leaves range
const _fearTimer = new Int32Array(MAX_CREATURES);
const _fearThreatX = new Float32Array(MAX_CREATURES);
const _fearThreatY = new Float32Array(MAX_CREATURES);
const _predatorThreatTimer = new Int32Array(MAX_CREATURES);

// Per-creature weapon flag — precomputed each tick by updateSensors
const _hasWeapon = new Uint8Array(MAX_CREATURES);
const _hasActiveLatch = new Uint8Array(MAX_CREATURES);
const _bodySizeMetric = new Float32Array(MAX_CREATURES);

// Per-creature prey target — written by updateSensors, read by updateCreatureLocomotion
const _nearPrey = new Uint8Array(MAX_CREATURES);
const _preyTargetX = new Float32Array(MAX_CREATURES);
const _preyTargetY = new Float32Array(MAX_CREATURES);
const _hasHuntTarget = new Uint8Array(MAX_CREATURES);
const _hasNonPredPreySignal = new Uint8Array(MAX_CREATURES);
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
const _activeScoutRole = new Uint8Array(MAX_CREATURES);
const _activeScoutAssignedTick = new Int32Array(MAX_CREATURES);
const _foodSignalX = new Float32Array(MAX_CREATURES);
const _foodSignalY = new Float32Array(MAX_CREATURES);
const _foodSignalStrength = new Float32Array(MAX_CREATURES);
const _foodSignalAge = new Int32Array(MAX_CREATURES);
const _foodSignalHop = new Uint8Array(MAX_CREATURES);
const _foodSignalDirect = new Uint8Array(MAX_CREATURES);
const _predatorDigestTimer = new Int32Array(MAX_CREATURES);
const _predatorFullTimer = new Int32Array(MAX_CREATURES);

type PackStats = {
  size: number;
  sumX: number;
  sumY: number;
  anchorCreature: number;
  clanId: number;
  predatorCount: number;
  nonPredatorCount: number;
  representativePredator: number;
  energyFracSum: number;
  hungryCount: number;
  avgEnergyFrac: number;
  hungryFrac: number;
  rallyFoodX: number;
  rallyFoodY: number;
  rallySignalStrength: number;
};
const _packStats = new Map<number, PackStats>();
type PackLeaders = {
  ids: number[];
  scores: number[];
};
const _packLeaders = new Map<number, PackLeaders>();

function leaderElectionScore(world: World, ci: number): number {
  const genome = world.creatureGenome[ci];
  if (!genome) return -Infinity;
  const energyFrac = world.creatureEnergy[ci] / Math.max(1, world.creatureMaxEnergy[ci]);
  const crowdScore = Math.min(_localCrowd[ci], 12) * CLAN_LEADER_DENSITY_WEIGHT;
  const stickiness = _leaderId[ci] === ci ? LEADER_STICKINESS_BONUS : 0;
  return genome.adhesionStrength + energyFrac + crowdScore + stickiness;
}

function rebuildPackLeaders(world: World): void {
  _packLeaders.clear();
  const leaderCap = Math.max(1, Math.floor(PACK_MAX_LEADERS_PER_PACK));

  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    const packId = world.creaturePackId[ci];
    if (packId < 0) continue;

    const score = leaderElectionScore(world, ci);
    let leaders = _packLeaders.get(packId);
    if (!leaders) {
      leaders = { ids: [], scores: [] };
      _packLeaders.set(packId, leaders);
    }

    let insertAt = -1;
    for (let i = 0; i < leaders.ids.length; i++) {
      const otherScore = leaders.scores[i];
      const otherId = leaders.ids[i];
      if (score > otherScore || (score === otherScore && ci < otherId)) {
        insertAt = i;
        break;
      }
    }

    if (insertAt < 0) {
      if (leaders.ids.length < leaderCap) {
        leaders.ids.push(ci);
        leaders.scores.push(score);
      }
      continue;
    }

    leaders.ids.splice(insertAt, 0, ci);
    leaders.scores.splice(insertAt, 0, score);
    if (leaders.ids.length > leaderCap) {
      leaders.ids.pop();
      leaders.scores.pop();
    }
  }

  for (const leaders of _packLeaders.values()) {
    for (let i = 0; i < leaders.ids.length; i++) {
      const leaderCi = leaders.ids[i];
      if (leaderCi >= 0 && leaderCi < MAX_CREATURES && world.creatureAlive[leaderCi]) {
        _isLeader[leaderCi] = 1;
      }
    }
  }
}

function pickPackLeaderForCreature(
  world: World,
  ci: number,
  packId: number,
  cx: number,
  cy: number,
  currentLeader: number,
): number {
  const leaders = _packLeaders.get(packId);
  if (!leaders || leaders.ids.length === 0) return ci;
  if (leaders.ids.length === 1) return leaders.ids[0];

  let bestLeader = -1;
  let bestDistScore = Infinity;
  for (let i = 0; i < leaders.ids.length; i++) {
    const leaderCi = leaders.ids[i];
    if (leaderCi < 0 || !world.creatureAlive[leaderCi] || world.creaturePackId[leaderCi] !== packId) continue;
    const leaderCoreIdx = world.creatureBlobs[world.creatureBlobStart[leaderCi]];
    const dx = world.blobX[leaderCoreIdx] - cx;
    const dy = world.blobY[leaderCoreIdx] - cy;
    // Sticky tie-break toward current leader to reduce jitter when multiple leaders are allowed.
    const distScore = dx * dx + dy * dy - (leaderCi === currentLeader ? 1e-3 : 0);
    if (distScore < bestDistScore || (distScore === bestDistScore && leaderCi < bestLeader)) {
      bestLeader = leaderCi;
      bestDistScore = distScore;
    }
  }
  return bestLeader >= 0 ? bestLeader : ci;
}

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
    const energyFrac = world.creatureEnergy[ci] / Math.max(1, world.creatureMaxEnergy[ci]);
    const predatorFullSuppressed = _hasWeapon[ci] === 1 && _predatorFullTimer[ci] > 0 && energyFrac > PREDATOR_FULL_RELEASE_ENERGY_FRAC;
    if (predatorFullSuppressed) {
      const heading = world.creatureHeading[ci];
      const target = Math.atan2(sy, sx);
      const dx = Math.cos(target) * PREDATOR_FULL_DORMANT_STEER_MULT + Math.cos(heading) * (1 - PREDATOR_FULL_DORMANT_STEER_MULT);
      const dy = Math.sin(target) * PREDATOR_FULL_DORMANT_STEER_MULT + Math.sin(heading) * (1 - PREDATOR_FULL_DORMANT_STEER_MULT);
      world.creatureHeading[ci] = Math.atan2(dy, dx);
      continue;
    }
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
  predatorSizeTargetHardRatio = PREDATOR_SIZE_TARGET_HARD_RATIO,
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
  world.noMouthCreatures = 0;
  world.foodEatenPlant = 0;
  world.foodEatenMeat = 0;
  world.predatorCount = 0;
  world.avgEnergyFrac = 0;
  world.sizeAvgScale = 0;
  world.sizeMaxScale = 0;
  world.sizeAvgPredatorScale = 0;
  world.sizeAvgNonPredScale = 0;
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

  let sizeScaleSum = 0;
  let sizeScaleMax = 0;
  let predatorScaleSum = 0;
  let predatorScaleCount = 0;
  let nonPredScaleSum = 0;
  let nonPredScaleCount = 0;

  // Precompute which creatures have weapons (for threat detection)
  for (let ai = 0; ai < aliveCount; ai++) {
    const ci = _aliveCreatures[ai];
    _hasWeapon[ci] = 0;
    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    let bodySize = 0;
    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      bodySize += world.blobSize[bi];
      if (_hasWeapon[ci] === 0 && world.blobType[bi] === BlobType.WEAPON) {
        _hasWeapon[ci] = 1;
        world.predatorCount++;
      }
    }
    _bodySizeMetric[ci] = Math.max(1e-6, bodySize);
    const sizeScale = Math.max(CREATURE_SIZE_BIRTH_SCALE, world.creatureSizeScale[ci] || CREATURE_SIZE_BIRTH_SCALE);
    sizeScaleSum += sizeScale;
    if (sizeScale > sizeScaleMax) sizeScaleMax = sizeScale;
    if (_hasWeapon[ci] === 1) {
      predatorScaleSum += sizeScale;
      predatorScaleCount++;
    } else {
      nonPredScaleSum += sizeScale;
      nonPredScaleCount++;
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
    let hasMouth = false;
    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] === BlobType.SENSOR) {
        maxSensorSize = Math.max(maxSensorSize, world.blobSize[bi]);
      } else if (world.blobType[bi] === BlobType.MOUTH) {
        hasMouth = true;
      }
    }
    if (!hasMouth) world.noMouthCreatures++;
    const hasSensor = maxSensorSize > 0;
    const sensorFoodSteerMult = hasSensor ? Math.min(1.6, 0.9 + maxSensorSize * 0.35) : 0.75;

    // Keep satiety in sync for steering logic (avoid full creatures orbiting food patches).
    const maxEnergy = world.creatureMaxEnergy[ci];
    if (_isSatiated[ci]) {
      if (world.creatureEnergy[ci] <= maxEnergy * eatResumeFraction) _isSatiated[ci] = 0;
    } else if (world.creatureEnergy[ci] >= maxEnergy * eatFullStopFraction) {
      _isSatiated[ci] = 1;
    }
    const energyFrac = world.creatureEnergy[ci] / Math.max(1, maxEnergy);
    if (_predatorDigestTimer[ci] > 0) _predatorDigestTimer[ci]--;
    if (_predatorFullTimer[ci] > 0) _predatorFullTimer[ci]--;
    const predatorFullSuppressed = _hasWeapon[ci] === 1 && _predatorFullTimer[ci] > 0 && energyFrac > PREDATOR_FULL_RELEASE_ENERGY_FRAC;
    const predatorDigestSuppressed = _hasWeapon[ci] === 1 && _predatorDigestTimer[ci] > 0 && energyFrac > PREDATOR_DIGEST_HUNT_RESUME_ENERGY_FRAC;
    const wantsFood = (_isSatiated[ci] || predatorFullSuppressed) ? 0 : 1;
    const hungryForFood = energyFrac <= CLAN_HUNGER_OVERRIDE_THRESHOLD;
    const activeScout = _activeScoutRole[ci] === 1 && _hasWeapon[ci] === 0;
    // Sense range scales with sensor blob size and expands when hungry to prevent starvation lock.
    let range = hasSensor ? SENSOR_RANGE * maxSensorSize : BASIC_FOOD_SENSE_RANGE;
    if (hungryForFood) range *= hasSensor ? 1.25 : 1.6;
    range = Math.max(range, hungryForFood ? HUNGRY_FOOD_SENSE_MIN_RANGE : BASIC_FOOD_SENSE_RANGE);
    const foodSenseRange = activeScout
      ? Math.min(WORLD_SIZE, range * PACK_SCOUT_FOOD_SENSE_MULT)
      : range;
    const range2 = range * range;
    const foodSenseRange2 = foodSenseRange * foodSenseRange;
    energyFracSum += energyFrac;
    _wantsFood[ci] = wantsFood;
    if (wantsFood) world.foodWantsCount++;
    else world.foodSatiatedCount++;
    if (hungryForFood) world.foodHungryCount++;
    if (_fearTimer[ci] > 0) {
      _fearTimer[ci]--;
      if (_fearTimer[ci] <= 0 && world.creaturePackId[ci] >= 0) {
        // Fear just ended: temporarily force regroup so packs reform before hunger-driven scatter resumes.
        _packSeekTimer[ci] = Math.max(_packSeekTimer[ci], PACK_POST_FEAR_REJOIN_TICKS);
        _packContactRecoveryTimer[ci] = Math.max(_packContactRecoveryTimer[ci], PACK_CONTACT_RECOVERY_TICKS * 2);
      }
    }
    if (_predatorThreatTimer[ci] > 0) _predatorThreatTimer[ci]--;
    if (_hasWeapon[ci] === 1 && _hasActiveLatch[ci]) {
      _predatorThreatTimer[ci] = Math.max(_predatorThreatTimer[ci], PREDATOR_FEAR_ACTIVE_HOLD_TICKS);
    }
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
    if (_foodMemoryAge[ci] > 0) _foodMemoryAge[ci]--;
    if (_foodMemoryAge[ci] <= 0) {
      _foodMemoryStrength[ci] = 0;
    } else {
      _foodMemoryStrength[ci] *= FOOD_MEMORY_DECAY_PER_TICK;
      if (_foodMemoryStrength[ci] < FOOD_MEMORY_MIN_STRENGTH * 0.35) {
        _foodMemoryStrength[ci] = 0;
        _foodMemoryAge[ci] = 0;
      }
    }

    // --- Food detection with target stickiness ---
    let nearestFoodDist2 = foodSenseRange2;
    let nearestFoodX = 0, nearestFoodY = 0;
    let nearestFoodKind = FoodKind.PLANT;
    let nearestMeatDist2 = Infinity;
    let nearestMeatX = 0, nearestMeatY = 0;
    let nearestPlantDist2 = foodSenseRange2;
    let nearestPlantX = 0, nearestPlantY = 0;
    let targetFoodX = 0, targetFoodY = 0;
    let foodSumX = 0, foodSumY = 0, foodCountSeen = 0;
    let plantSumX = 0, plantSumY = 0, plantCountSeen = 0;
    let found = false;
    let liveFoodFound = false;
    let livePlantFound = false;
    let usingFoodMemory = false;

    const lockX = _foodTargetX[ci];
    const lockY = _foodTargetY[ci];
    const lockRadius2 = FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND;
    let lockFound = false;
    let lockBestDist2 = lockRadius2;

    if (_foodTargetTimer[ci] > 0) _foodTargetTimer[ci]--;

    // Always sense nearby food for social communication; hunger gates pursuit, not perception.
    spatialHash.queryFood(
      cx, cy, foodSenseRange,
      world.foodX, world.foodY, world.foodAlive,
      world.activeFoodIds,
      world.foodCount,
      (fi) => {
        const fx = world.foodX[fi];
        const fy = world.foodY[fi];
        const foodKind = world.foodKind[fi] as FoodKind;
        const dx = fx - cx;
        const dy = fy - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < nearestFoodDist2) {
          nearestFoodDist2 = d2;
          nearestFoodX = fx;
          nearestFoodY = fy;
          nearestFoodKind = foodKind;
          found = true;
          liveFoodFound = true;
        }
        if (foodKind === FoodKind.MEAT) {
          if (d2 < nearestMeatDist2) {
            nearestMeatDist2 = d2;
            nearestMeatX = fx;
            nearestMeatY = fy;
          }
        } else {
          livePlantFound = true;
          if (d2 < nearestPlantDist2) {
            nearestPlantDist2 = d2;
            nearestPlantX = fx;
            nearestPlantY = fy;
          }
          plantSumX += fx;
          plantSumY += fy;
          plantCountSeen++;
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
      const preferMeat = _hasWeapon[ci] === 1 && nearestMeatDist2 < Infinity;
      const useNearest = hungryForFood || nearestFoodDist2 <= FOOD_TARGET_NEAREST_SWITCH_DISTANCE * FOOD_TARGET_NEAREST_SWITCH_DISTANCE || preferMeat;
      if (_foodTargetTimer[ci] > 0 && lockFound && !useNearest) {
        targetFoodX = lockX;
        targetFoodY = lockY;
        found = true;
      } else if (found) {
        // Far away, steer toward patch centroid; near food, switch to nearest pellet so bites can land.
        if (preferMeat) {
          targetFoodX = nearestMeatX;
          targetFoodY = nearestMeatY;
        } else if (!useNearest && foodCountSeen >= 3) {
          targetFoodX = foodSumX / foodCountSeen;
          targetFoodY = foodSumY / foodCountSeen;
        } else {
          targetFoodX = nearestFoodX;
          targetFoodY = nearestFoodY;
        }
        _foodTargetX[ci] = targetFoodX;
        _foodTargetY[ci] = targetFoodY;
        _foodTargetTimer[ci] = FOOD_TARGET_LOCK_TICKS;
      } else if (hungryForFood && _foodMemoryAge[ci] > 0 && _foodMemoryStrength[ci] >= FOOD_MEMORY_MIN_STRENGTH) {
        targetFoodX = _foodMemoryX[ci];
        targetFoodY = _foodMemoryY[ci];
        _foodTargetX[ci] = targetFoodX;
        _foodTargetY[ci] = targetFoodY;
        _foodTargetTimer[ci] = Math.max(_foodTargetTimer[ci], Math.floor(FOOD_TARGET_LOCK_TICKS * 1.5));
        found = true;
        usingFoodMemory = true;
      } else {
        _foodTargetTimer[ci] = 0;
      }
    } else {
      _foodTargetTimer[ci] = 0;
    }

    // Store for flock shared sensing
    const hasShareableFood = activeScout ? livePlantFound : found;
    _hasSensedFood[ci] = hasShareableFood ? 1 : 0;
    _scoutPlantClusterSeen[ci] = activeScout && plantCountSeen >= PACK_SCOUT_REPORT_MIN_PLANT_COUNT ? 1 : 0;
    const preferMeatSense = _hasWeapon[ci] === 1 && nearestMeatDist2 < Infinity;
    let sensedFoodX = preferMeatSense ? nearestMeatX : nearestFoodX;
    let sensedFoodY = preferMeatSense ? nearestMeatY : nearestFoodY;
    let sensedFoodKind = preferMeatSense ? FoodKind.MEAT : nearestFoodKind;
    if (activeScout && livePlantFound) {
      sensedFoodX = nearestPlantX;
      sensedFoodY = nearestPlantY;
      sensedFoodKind = FoodKind.PLANT;
    }
    _sensedFoodX[ci] = sensedFoodX;
    _sensedFoodY[ci] = sensedFoodY;
    _sensedFoodKind[ci] = sensedFoodKind;
    if (activeScout) {
      const scoutReportInterval = Math.max(1, PACK_SCOUT_REPORT_INTERVAL_TICKS);
      const scoutClusterSeen = plantCountSeen >= PACK_SCOUT_REPORT_MIN_PLANT_COUNT;
      if (scoutClusterSeen && plantCountSeen > 0) {
        // Keep hotspot coordinates fresh even between direct report pulses.
        _foodSignalX[ci] = plantSumX / plantCountSeen;
        _foodSignalY[ci] = plantSumY / plantCountSeen;
      }
      const canBroadcastScoutDirect =
        scoutClusterSeen &&
        (
          wantsFood === 1 ||
          hungryForFood ||
          ((world.tick + ci) % scoutReportInterval === 0)
        );
      if (canBroadcastScoutDirect && plantCountSeen > 0) {
        const directStrength = Math.min(1.0, 0.5 + plantCountSeen * 0.08);
        _foodSignalStrength[ci] = Math.max(_foodSignalStrength[ci], directStrength);
        _foodSignalAge[ci] = Math.max(foodSignalDecayTicks, Math.floor(foodSignalDecayTicks * 1.1));
        _foodSignalHop[ci] = 0;
        _foodSignalDirect[ci] = 1;
        world.foodSignalDirectEmits++;
      } else {
        _foodSignalDirect[ci] = 0;
      }
    } else {
      const canBroadcastDirect =
        wantsFood === 1 ||
        hungryForFood ||
        (foodCountSeen >= 6 && ((world.tick + ci) % 90 === 0));
      if (liveFoodFound && canBroadcastDirect) {
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
    }
    if (usingFoodMemory && !liveFoodFound) {
      const mdx = _foodMemoryX[ci] - cx;
      const mdy = _foodMemoryY[ci] - cy;
      if (mdx * mdx + mdy * mdy <= HUNGRY_LOCAL_FOOD_SNAP_RANGE * HUNGRY_LOCAL_FOOD_SNAP_RANGE && foodCountSeen === 0) {
        _foodMemoryStrength[ci] *= FOOD_MEMORY_FAIL_DECAY_MULT;
        _foodMemoryAge[ci] = Math.min(_foodMemoryAge[ci], Math.floor(FOOD_TARGET_LOCK_TICKS * 2));
      }
    }

    // --- Threat detection (stealth: predators detected at reduced range) ---
    // Active scouts are fearless and ignore predator threat sensing/flee.
    let foundThreat = false;
    let threatX = 0, threatY = 0;
    if (activeScout) {
      _fearTimer[ci] = 0;
      _hasSensedThreat[ci] = 0;
      _sensedThreatX[ci] = 0;
      _sensedThreatY[ci] = 0;
    } else {
      const stealthRange = range * stealthDetectionMult;
      const stealthRange2 = stealthRange * stealthRange;
      let nearestThreatDist2 = stealthRange2;

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
        // Passive predators should not trigger pack fear/stampede.
        // Only predators actively latched or with recent kill/active-threat pulse are fear sources.
        if (_predatorThreatTimer[oci] <= 0 && !_hasActiveLatch[oci]) return;
        const otherGenome = world.creatureGenome[oci];
        const applyThreatKinFilter = _hasWeapon[ci] === 1 && _hasWeapon[oci] === 1;
        if (applyThreatKinFilter && otherGenome && geneticSimilarity(genome, otherGenome) >= kinThreshold) return;
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
    }

    // --- Prey detection (weapon-bearers scan for non-kin to chase) ---
    _nearPrey[ci] = 0;
    _hasHuntTarget[ci] = 0;
    _hasNonPredPreySignal[ci] = 0;
    if (_huntTargetTimer[ci] > 0) _huntTargetTimer[ci]--;
    if (_hasWeapon[ci] && !predatorFullSuppressed) {
      const predatorKinThreshold = energyFrac <= PREDATION_VERY_HUNGRY_FRACTION
        ? kinThreshold * PREDATION_HUNGRY_KIN_THRESHOLD_MULT
        : kinThreshold;
      const lungeRange2 = lungeRange * lungeRange;
      const huntRange2 = PREDATOR_FLOCK_DETECT_RANGE * PREDATOR_FLOCK_DETECT_RANGE;
      let nearestPreyScore = lungeRange2;
      let preyX = 0, preyY = 0;
      let foundPrey = false;
      let foundNonPredPreySignal = false;
      let bestHuntScore = -Infinity;
      let huntX = 0, huntY = 0;
      let foundHunt = false;
      const predatorBody = Math.max(1e-6, _bodySizeMetric[ci]);
      const hardTargetRatio = Math.max(1.0, predatorSizeTargetHardRatio);
      const hasSoftBand = hardTargetRatio > PREDATOR_SIZE_TARGET_SOFT_RATIO + 1e-6;

      _sensorVisitedGen++;
      if (_sensorVisitedGen === 0) {
        _sensorVisited.fill(0);
        _sensorVisitedGen = 1;
      }
      const preyVisitedGen = _sensorVisitedGen;
      if (!predatorDigestSuppressed) {
        spatialHash.query(cx, cy, PREDATOR_FLOCK_DETECT_RANGE, (blobIdx) => {
          const oci = world.blobCreature[blobIdx];
          if (oci < 0 || oci === ci || _sensorVisited[oci] === preyVisitedGen) return;
          _sensorVisited[oci] = preyVisitedGen;
          const otherHasWeapon = _hasWeapon[oci] === 1;
          const otherGenome = world.creatureGenome[oci];
          if (otherHasWeapon && otherGenome && geneticSimilarity(genome, otherGenome) >= predatorKinThreshold) return;
          const otherCoreIdx = world.creatureBlobs[world.creatureBlobStart[oci]];
          const pdx = world.blobX[otherCoreIdx] - cx;
          const pdy = world.blobY[otherCoreIdx] - cy;
          const pd2 = pdx * pdx + pdy * pdy;
          const preyBody = Math.max(1e-6, _bodySizeMetric[oci]);
          const preyToPredRatio = preyBody / predatorBody;
          if (preyToPredRatio > hardTargetRatio) return;
          const oversizePenalty = hasSoftBand && preyToPredRatio > PREDATOR_SIZE_TARGET_SOFT_RATIO
            ? remapClamp(preyToPredRatio, PREDATOR_SIZE_TARGET_SOFT_RATIO, hardTargetRatio)
            : 0;
          if (pd2 < lungeRange2) {
            const nearPreyScore = pd2 * (1 + oversizePenalty * 2);
            if (nearPreyScore < nearestPreyScore) {
              nearestPreyScore = nearPreyScore;
              preyX = world.blobX[otherCoreIdx];
              preyY = world.blobY[otherCoreIdx];
              foundPrey = true;
              if (!otherHasWeapon) foundNonPredPreySignal = true;
            }
          }
          if (pd2 < huntRange2) {
            const distNorm = Math.sqrt(pd2) / PREDATOR_FLOCK_DETECT_RANGE; // 0..1
            const score = _localCrowd[oci] * PREDATOR_FLOCK_DENSITY_WEIGHT - distNorm - oversizePenalty * 0.95;
            if (score > bestHuntScore) {
              bestHuntScore = score;
              huntX = world.blobX[otherCoreIdx];
              huntY = world.blobY[otherCoreIdx];
              foundHunt = true;
            }
            if (!otherHasWeapon) foundNonPredPreySignal = true;
          }
        });
      }

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
      _hasNonPredPreySignal[ci] = foundNonPredPreySignal ? 1 : 0;
    }

    // Full predator mode: avoid prey and drift toward quiet edge zones.
    if (_hasWeapon[ci] && predatorFullSuppressed) {
      let nearestPreyDx = 0;
      let nearestPreyDy = 0;
      let nearestPreyDist2 = Infinity;
      _sensorVisitedGen++;
      if (_sensorVisitedGen === 0) {
        _sensorVisited.fill(0);
        _sensorVisitedGen = 1;
      }
      const fullVisitedGen = _sensorVisitedGen;
      spatialHash.query(cx, cy, Math.min(PREDATOR_FLOCK_DETECT_RANGE, 700), (blobIdx) => {
        const oci = world.blobCreature[blobIdx];
        if (oci < 0 || oci === ci || _sensorVisited[oci] === fullVisitedGen) return;
        _sensorVisited[oci] = fullVisitedGen;
        if (_hasWeapon[oci]) return;
        const otherCoreIdx = world.creatureBlobs[world.creatureBlobStart[oci]];
        const dx = world.blobX[otherCoreIdx] - cx;
        const dy = world.blobY[otherCoreIdx] - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < nearestPreyDist2) {
          nearestPreyDist2 = d2;
          nearestPreyDx = dx;
          nearestPreyDy = dy;
        }
      });
      if (nearestPreyDist2 < Infinity && nearestPreyDist2 > 1e-6) {
        addSteer(ci, -nearestPreyDx, -nearestPreyDy, PREDATOR_FULL_PREY_AVOID_WEIGHT);
      }
      const left = cx - BOUNDARY_PADDING;
      const right = (WORLD_SIZE - BOUNDARY_PADDING) - cx;
      const top = cy - BOUNDARY_PADDING;
      const bottom = (WORLD_SIZE - BOUNDARY_PADDING) - cy;
      let edgeDx = 0;
      let edgeDy = 0;
      const minEdge = Math.min(left, right, top, bottom);
      if (minEdge === left) edgeDx = -1;
      else if (minEdge === right) edgeDx = 1;
      else if (minEdge === top) edgeDy = -1;
      else edgeDy = 1;
      if (edgeDx !== 0 || edgeDy !== 0) {
        addSteer(ci, edgeDx, edgeDy, PREDATOR_FULL_EDGE_SEEK_WEIGHT);
      }
      _intentMode[ci] = INTENT_SCOUT;
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
    const hungryLocalSnap = wantsFood === 1 && hungryForFood && found && nearestFoodDist2 <= HUNGRY_LOCAL_FOOD_SNAP_RANGE * HUNGRY_LOCAL_FOOD_SNAP_RANGE;
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
      } else if (hungryLocalSnap) {
        const dx = _sensedFoodX[ci] - cx;
        const dy = _sensedFoodY[ci] - cy;
        forceSteer(ci, dx, dy, HUNGRY_LOCAL_FOOD_SNAP_FORCE * (hasSensor ? 1.0 : 1.08));
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
      } else if (hungryLocalSnap) {
        const dx = _sensedFoodX[ci] - cx;
        const dy = _sensedFoodY[ci] - cy;
        forceSteer(ci, dx, dy, HUNGRY_LOCAL_FOOD_SNAP_FORCE * (hasSensor ? 1.0 : 1.08));
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
  world.sizeAvgScale = aliveCount > 0 ? (sizeScaleSum / aliveCount) : 0;
  world.sizeMaxScale = sizeScaleMax;
  world.sizeAvgPredatorScale = predatorScaleCount > 0 ? (predatorScaleSum / predatorScaleCount) : 0;
  world.sizeAvgNonPredScale = nonPredScaleCount > 0 ? (nonPredScaleSum / nonPredScaleCount) : 0;
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
  sizeMetabolismExponent = CREATURE_SIZE_METABOLISM_EXPONENT,
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
    let predatorMetabMult = _hasWeapon[ci] ? PREDATOR_METABOLISM_MULT : 1.0;
    if (_hasWeapon[ci]) {
      if (world.creatureCarcassAlive[ci]) predatorMetabMult *= PREDATOR_CARRION_METABOLISM_MULT;
      else if (_hasActiveLatch[ci]) predatorMetabMult *= PREDATOR_LATCH_METABOLISM_MULT;
    }
    const scoutMetabMult = _activeScoutRole[ci] === 1 ? PACK_SCOUT_METABOLISM_MULT : 1.0;
    const sizeScale = Math.max(CREATURE_SIZE_BIRTH_SCALE, world.creatureSizeScale[ci] || CREATURE_SIZE_BIRTH_SCALE);
    const sizeMetabolismMult = Math.pow(sizeScale, sizeMetabolismExponent);
    world.creatureEnergy[ci] -= Math.pow(count, metabolismExponent) * metabolismCost * kinDiscount * predatorMetabMult * scoutMetabMult * sizeMetabolismMult;

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
    const weaponUpkeepMult = world.creatureCarcassAlive[ci] ? 0.5 : (_hasActiveLatch[ci] ? 0.75 : 1.0);
    const sizeWeaponUpkeepMult = Math.pow(sizeScale, CREATURE_SIZE_WEAPON_UPKEEP_EXPONENT);
    world.creatureEnergy[ci] -= weaponCount * WEAPON_UPKEEP_PER_BLOB * weaponUpkeepMult * sizeWeaponUpkeepMult;
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
    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    let hasWeapon = false;
    for (let i = 0; i < count; i++) {
      if (world.blobType[world.creatureBlobs[start + i]] === BlobType.WEAPON) {
        hasWeapon = true;
        break;
      }
    }
    // Predators should not remove ambient food while actively latching prey or consuming carried carcass.
    if (hasWeapon && (_hasActiveLatch[ci] || world.creatureCarcassAlive[ci])) continue;
    const effectiveStopFraction = hasWeapon ? Math.max(stopFraction, PREDATOR_EAT_FULL_STOP_FRACTION) : stopFraction;
    const effectiveResumeFraction = hasWeapon ? Math.max(resumeFraction, PREDATOR_EAT_RESUME_FRACTION) : resumeFraction;
    const fullEnergy = maxEnergy * effectiveStopFraction;
    const resumeEnergy = maxEnergy * effectiveResumeFraction;
    const scoutPlantClusterForage = _activeScoutRole[ci] === 1 && !hasWeapon && _scoutPlantClusterSeen[ci] === 1;

    if (_isSatiated[ci]) {
      if (world.creatureEnergy[ci] <= resumeEnergy || scoutPlantClusterForage) {
        _isSatiated[ci] = 0;
      } else {
        continue;
      }
    } else if (world.creatureEnergy[ci] >= fullEnergy) {
      _isSatiated[ci] = 1;
      continue;
    }

    if (_eatCooldown[ci] > 0) continue;

    let eaten = 0;
    let stopEating = false;

    for (let i = 0; i < count; i++) {
      const bi = world.creatureBlobs[start + i];
      if (world.blobType[bi] !== BlobType.MOUTH) continue;

      const mx = world.blobX[bi];
      const my = world.blobY[bi];
      const mr = world.blobRadius[bi];
      const eatRange = mr + FOOD_RADIUS * FOOD_INTERACTION_RADIUS_MAX_SCALE;

      while (!stopEating && eaten < eatMaxItemsPerSubstep) {
        const energyFrac = world.creatureEnergy[ci] / Math.max(1, maxEnergy);
        const isCriticalHungry = energyFrac <= CRITICAL_FOOD_PRIORITY_ON_FRAC;
        const isHungry = energyFrac <= STARVING_FOOD_PRIORITY_ON_FRAC;
        const eatContactMult = FOOD_EAT_CONTACT_MULT * (isCriticalHungry
          ? FOOD_EAT_CONTACT_CRITICAL_MULT
          : (isHungry ? FOOD_EAT_CONTACT_HUNGRY_MULT : 1));

        let nearestFood = -1;
        let nearestFoodDist2 = Infinity;

        spatialHash.queryFood(
          mx, my, eatRange,
          world.foodX, world.foodY, world.foodAlive,
          world.activeFoodIds,
          world.foodCount,
          (fi) => {
            if (!world.foodAlive[fi]) return;
            if (scoutPlantClusterForage && world.foodKind[fi] === FoodKind.MEAT) return;
            const dx = world.foodX[fi] - mx;
            const dy = world.foodY[fi] - my;
            const d2 = dx * dx + dy * dy;
            const foodRadius = FOOD_RADIUS * Math.max(0.1, world.foodRadiusScale[fi] || 1);
            const eatContact = (mr + foodRadius) * eatContactMult;
            if (d2 <= eatContact * eatContact && d2 < nearestFoodDist2) {
              nearestFoodDist2 = d2;
              nearestFood = fi;
            }
          },
          () => { world.perfFoodOverflowFallbacks++; },
        );

        if (nearestFood < 0 || !world.foodAlive[nearestFood]) break;

        const foodKind = world.foodKind[nearestFood] as FoodKind;
        const eatenFoodX = world.foodX[nearestFood];
        const eatenFoodY = world.foodY[nearestFood];
        const defaultMaxAge = foodKind === FoodKind.MEAT ? MEAT_STALE_TICKS : FOOD_STALE_TICKS;
        const foodMaxAge = world.foodMaxAge[nearestFood] > 0 ? world.foodMaxAge[nearestFood] : defaultMaxAge;
        const ageMult = foodEnergyMultiplierByAge(foodKind, world.foodAge[nearestFood], foodMaxAge);
        const scale = Math.max(0.1, world.foodEnergyScale[nearestFood] || 1);
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
        world.freeFood(nearestFood);
        const prevMemStrength = _foodMemoryStrength[ci];
        const blend = Math.max(0.15, Math.min(0.7, prevMemStrength));
        _foodMemoryX[ci] = prevMemStrength > 0 ? (_foodMemoryX[ci] * blend + eatenFoodX * (1 - blend)) : eatenFoodX;
        _foodMemoryY[ci] = prevMemStrength > 0 ? (_foodMemoryY[ci] * blend + eatenFoodY * (1 - blend)) : eatenFoodY;
        _foodMemoryStrength[ci] = Math.min(1, Math.max(prevMemStrength, FOOD_MEMORY_MIN_STRENGTH) + FOOD_MEMORY_EAT_REINFORCE);
        _foodMemoryAge[ci] = FOOD_MEMORY_MAX_AGE_TICKS;
        eaten++;

        const predatorMeatGorge = hasWeapon && foodKind === FoodKind.MEAT;
        if (!predatorMeatGorge) {
          let effectiveCooldown = eatCooldownTicks;
          if (!hasWeapon && isHungry) {
            effectiveCooldown = isCriticalHungry ? 0 : Math.max(0, eatCooldownTicks - 1);
          }
          if (effectiveCooldown > 0) {
            _eatCooldown[ci] = effectiveCooldown;
            stopEating = true;
          }
        }

        if (world.creatureEnergy[ci] >= fullEnergy) {
          _isSatiated[ci] = 1;
          stopEating = true;
        }
      }

      if (stopEating || eaten >= eatMaxItemsPerSubstep) break;
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
  predatorSizeDamageExponent = PREDATOR_SIZE_DAMAGE_EXPONENT,
  predatorSizeTargetHardRatio = PREDATOR_SIZE_TARGET_HARD_RATIO,
) {
  const weaponQueryPad = 40;
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;

    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    const genome = world.creatureGenome[ci]!;
    const attackerEnergyFrac = world.creatureEnergy[ci] / Math.max(1, world.creatureMaxEnergy[ci]);
    const predatorDigestSuppressed = _predatorDigestTimer[ci] > 0 && attackerEnergyFrac > PREDATOR_DIGEST_HUNT_RESUME_ENERGY_FRAC;
    const predatorFullSuppressed = _predatorFullTimer[ci] > 0 && attackerEnergyFrac > PREDATOR_FULL_RELEASE_ENERGY_FRAC;
    if (predatorDigestSuppressed || predatorFullSuppressed) continue;
    const predatorKinThreshold = attackerEnergyFrac <= PREDATION_VERY_HUNGRY_FRACTION
      ? kinThreshold * PREDATION_HUNGRY_KIN_THRESHOLD_MULT
      : kinThreshold;
    const attackerBody = Math.max(1e-6, _bodySizeMetric[ci]);
    const hardTargetRatio = Math.max(1.0, predatorSizeTargetHardRatio);

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

        const otherHasWeapon = _hasWeapon[otherCreature] === 1;
        // Predator-vs-predator combat gate:
        // default block; only allow at critical starvation and only when no non-predator prey is available.
        if (otherHasWeapon) {
          const canEmergencyCannibalize =
            attackerEnergyFrac <= PREDATION_VERY_HUNGRY_FRACTION &&
            _hasNonPredPreySignal[ci] === 0;
          if (!canEmergencyCannibalize) return;
        }

        // Kin protection for allowed predator-vs-predator emergency cases.
        const otherGenome = world.creatureGenome[otherCreature];
        if (otherHasWeapon && otherGenome && geneticSimilarity(genome, otherGenome) >= predatorKinThreshold) return;

        const dx = world.blobX[j] - wx;
        const dy = world.blobY[j] - wy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const targetBody = Math.max(1e-6, _bodySizeMetric[otherCreature]);
        const preyToPredRatio = targetBody / attackerBody;
        if (preyToPredRatio > hardTargetRatio) return;
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
            const sizeDamageMult = sizeRatioMultiplier(
              _bodySizeMetric[ci],
              _bodySizeMetric[otherCreature],
              predatorSizeDamageExponent,
              PREDATOR_SIZE_DAMAGE_MIN_MULT,
              PREDATOR_SIZE_DAMAGE_MAX_MULT,
            );
            const damageDealt = WEAPON_DAMAGE * world.blobSize[bi] * shieldReduction * sizeDamageMult;
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
  predatorSizeDamageExponent = PREDATOR_SIZE_DAMAGE_EXPONENT,
  predatorSizeTargetHardRatio = PREDATOR_SIZE_TARGET_HARD_RATIO,
) {
  _hasActiveLatch.fill(0);
  const hardTargetRatio = Math.max(1.0, predatorSizeTargetHardRatio);
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
    const attackerBody = Math.max(1e-6, _bodySizeMetric[wci]);
    const targetBody = Math.max(1e-6, _bodySizeMetric[tci]);
    if ((targetBody / attackerBody) > hardTargetRatio) {
      world.blobWeaponLatchedTarget[wbi] = -1;
      continue; // oversized target: drop latch
    }

    // Decrement timer
    world.latchTimer[li]--;
    if (world.latchTimer[li] <= 0) {
      world.blobWeaponLatchedTarget[wbi] = -1;
      continue; // expired
    }
    _hasActiveLatch[wci] = 1;

    // --- Sustained damage ---
    let shieldReduction = 1.0;
    if (world.blobType[tbi] === BlobType.SHIELD) {
      shieldReduction = Math.max(0.25, 1.0 - 0.5 * world.blobSize[tbi]);
    }
    const attackerEnergyFrac = world.creatureEnergy[wci] / Math.max(1, world.creatureMaxEnergy[wci]);
    const hungryLatchMult = attackerEnergyFrac <= LATCH_HUNGRY_DAMAGE_THRESHOLD ? LATCH_HUNGRY_DAMAGE_MULT : 1.0;
    const sizeDamageMult = sizeRatioMultiplier(
      attackerBody,
      targetBody,
      predatorSizeDamageExponent,
      PREDATOR_SIZE_DAMAGE_MIN_MULT,
      PREDATOR_SIZE_DAMAGE_MAX_MULT,
    );
    const damage = WEAPON_DAMAGE * LATCH_DAMAGE_MULT * hungryLatchMult * world.blobSize[wbi] * shieldReduction * sizeDamageMult;
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
      world.blobX[wbi] += nx * overlap * wFrac * LATCH_CONSTRAINT_STRENGTH;
      world.blobY[wbi] += ny * overlap * wFrac * LATCH_CONSTRAINT_STRENGTH;
      world.blobX[tbi] -= nx * overlap * tFrac * LATCH_CONSTRAINT_STRENGTH;
      world.blobY[tbi] -= ny * overlap * tFrac * LATCH_CONSTRAINT_STRENGTH;
    }

    // Keep latch alive while predator remains in close pursuit/contact.
    const latchRefreshMult = sizeRatioMultiplier(
      attackerBody,
      targetBody,
      PREDATOR_SIZE_LATCH_REFRESH_EXPONENT,
      PREDATOR_SIZE_LATCH_REFRESH_MIN_MULT,
      PREDATOR_SIZE_LATCH_REFRESH_MAX_MULT,
    );
    if (dist <= restDist * LATCH_REFRESH_RANGE_MULT * latchRefreshMult) {
      world.latchTimer[li] = Math.max(world.latchTimer[li], Math.floor(LATCH_DURATION * 0.9));
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

function clearCarriedCarcass(world: World, ci: number): void {
  world.creatureCarcassAlive[ci] = 0;
  world.creatureCarcassEnergy[ci] = 0;
  world.creatureCarcassMaxEnergy[ci] = 0;
  world.creatureCarcassAge[ci] = 0;
  world.creatureCarcassMaxAge[ci] = 0;
  world.creatureCarcassAnchorWeaponBlob[ci] = -1;
  world.creatureCarcassBlobCount[ci] = 0;
}

function findKillerLatchWeaponBlob(world: World, killerCi: number, victimCi: number): number {
  for (let li = 0; li < world.latchCount; li++) {
    if (world.latchWeaponCreature[li] !== killerCi) continue;
    if (world.latchTargetCreature[li] !== victimCi) continue;
    const weaponBlob = world.latchWeaponBlob[li];
    if (weaponBlob < 0 || !world.blobAlive[weaponBlob]) continue;
    return weaponBlob;
  }
  return -1;
}

function dropCarriedCarcassAsStaticMeat(world: World, ci: number): void {
  const carcassCount = world.creatureCarcassBlobCount[ci];
  const carcassEnergy = world.creatureCarcassEnergy[ci];
  if (carcassCount <= 0 || carcassEnergy <= 0) {
    clearCarriedCarcass(world, ci);
    return;
  }
  const anchorBlob = world.creatureCarcassAnchorWeaponBlob[ci];
  let ax = 0;
  let ay = 0;
  if (anchorBlob >= 0 && world.blobAlive[anchorBlob]) {
    ax = world.blobX[anchorBlob];
    ay = world.blobY[anchorBlob];
  } else if (world.creatureAlive[ci] && world.creatureBlobCount[ci] > 0) {
    const coreIdx = world.creatureBlobs[world.creatureBlobStart[ci]];
    ax = world.blobX[coreIdx];
    ay = world.blobY[coreIdx];
  }
  const perBlobEnergyScale = carcassEnergy / Math.max(1, FOOD_ENERGY * carcassCount);
  const base = ci * 12;
  for (let i = 0; i < carcassCount; i++) {
    const fi = world.allocFood(FoodKind.MEAT, MEAT_STALE_TICKS);
    if (fi < 0) break;
    const type = world.creatureCarcassBlobType[base + i] as BlobType;
    const size = world.creatureCarcassBlobSize[base + i];
    const typeMult = RENDER_RADIUS_BY_TYPE[type] ?? 1;
    const targetRenderRadius = BASE_BLOB_RADIUS * size * typeMult;
    world.foodEnergyScale[fi] = Math.max(0.05, perBlobEnergyScale);
    world.foodRadiusScale[fi] = targetRenderRadius / (FOOD_RADIUS * RENDER_RADIUS_MULT);
    world.foodX[fi] = ax + world.creatureCarcassBlobOffsetX[base + i];
    world.foodY[fi] = ay + world.creatureCarcassBlobOffsetY[base + i];
  }
  clearCarriedCarcass(world, ci);
}

function tryAttachKilledPreyAsCarcass(world: World, killerCi: number, victimCi: number, totalCarrionScale: number, carcassMaxAge: number): boolean {
  if (killerCi < 0 || !world.creatureAlive[killerCi]) return false;
  const weaponBlob = findKillerLatchWeaponBlob(world, killerCi, victimCi);
  if (weaponBlob < 0) return false;
  const victimStart = world.creatureBlobStart[victimCi];
  const victimCount = world.creatureBlobCount[victimCi];
  if (victimCount <= 0) return false;

  if (world.creatureCarcassAlive[killerCi] && world.creatureCarcassEnergy[killerCi] > 0) {
    dropCarriedCarcassAsStaticMeat(world, killerCi);
    world.carcassDropOnLatchLossCount++;
  }

  const victimCore = world.creatureBlobs[victimStart];
  const coreX = world.blobX[victimCore];
  const coreY = world.blobY[victimCore];
  const base = killerCi * 12;
  const count = Math.min(12, victimCount);
  for (let i = 0; i < count; i++) {
    const bi = world.creatureBlobs[victimStart + i];
    world.creatureCarcassBlobType[base + i] = world.blobType[bi];
    world.creatureCarcassBlobSize[base + i] = world.blobSize[bi];
    world.creatureCarcassBlobOffsetX[base + i] = world.blobX[bi] - coreX;
    world.creatureCarcassBlobOffsetY[base + i] = world.blobY[bi] - coreY;
  }
  world.creatureCarcassAlive[killerCi] = 1;
  world.creatureCarcassEnergy[killerCi] = Math.max(0, FOOD_ENERGY * totalCarrionScale * CARRIED_MEAT_ENERGY_MULT);
  world.creatureCarcassMaxEnergy[killerCi] = world.creatureCarcassEnergy[killerCi];
  world.creatureCarcassAge[killerCi] = 0;
  world.creatureCarcassMaxAge[killerCi] = Math.max(1, carcassMaxAge);
  world.creatureCarcassAnchorWeaponBlob[killerCi] = weaponBlob;
  world.creatureCarcassBlobCount[killerCi] = count;
  _predatorDigestTimer[killerCi] = Math.max(_predatorDigestTimer[killerCi], PREDATOR_DIGEST_HUNT_SUPPRESS_TICKS);
  _predatorFullTimer[killerCi] = Math.max(_predatorFullTimer[killerCi], PREDATOR_FULL_AFTER_FEED_TICKS);
  if (CARRIED_MEAT_ATTACH_BITE_ENERGY > 0) {
    world.creatureEnergy[killerCi] = Math.min(
      world.creatureMaxEnergy[killerCi],
      world.creatureEnergy[killerCi] + CARRIED_MEAT_ATTACH_BITE_ENERGY,
    );
  }
  world.carcassAttachedCount++;
  return true;
}

export function processCarriedCarcass(
  world: World,
  consumePerTickBase = CARRIED_MEAT_CONSUME_PER_TICK_BASE,
  maxTicks = CARRIED_MEAT_MAX_TICKS,
  staleEnergyFloorMult = CARRIED_MEAT_STALE_ENERGY_FLOOR_MULT,
  consumeStartDelayTicks = CARRIED_MEAT_CONSUME_START_DELAY_TICKS,
  dropOnUnlatch = CARRIED_MEAT_DROP_ON_UNLATCH,
) {
  world.carcassConsumedEnergyTick = 0;
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureCarcassAlive[ci]) continue;
    if (!world.creatureAlive[ci]) {
      clearCarriedCarcass(world, ci);
      continue;
    }

    const anchorBlob = world.creatureCarcassAnchorWeaponBlob[ci];
    if (anchorBlob < 0 || !world.blobAlive[anchorBlob] || world.blobType[anchorBlob] !== BlobType.WEAPON) {
      if (dropOnUnlatch > 0) {
        dropCarriedCarcassAsStaticMeat(world, ci);
        world.carcassDropOnLatchLossCount++;
      } else {
        clearCarriedCarcass(world, ci);
      }
      continue;
    }

    const maxAge = Math.max(1, Math.min(maxTicks, world.creatureCarcassMaxAge[ci] > 0 ? world.creatureCarcassMaxAge[ci] : maxTicks));
    const age = Math.max(0, world.creatureCarcassAge[ci]);
    const ageFrac = Math.max(0, Math.min(1, age / maxAge));
    const staleMult = 1 - (1 - staleEnergyFloorMult) * ageFrac;
    const canConsume = age >= consumeStartDelayTicks;
    const consume = canConsume
      ? Math.min(
        world.creatureCarcassEnergy[ci],
        Math.max(0, consumePerTickBase * staleMult * MEAT_PREDATOR_EAT_EFFICIENCY_MULT),
      )
      : 0;
    if (consume > 0) {
      world.creatureCarcassEnergy[ci] -= consume;
      world.creatureEnergy[ci] = Math.min(world.creatureMaxEnergy[ci], world.creatureEnergy[ci] + consume);
      _predatorDigestTimer[ci] = Math.max(_predatorDigestTimer[ci], PREDATOR_DIGEST_HUNT_SUPPRESS_TICKS);
      _predatorFullTimer[ci] = Math.max(_predatorFullTimer[ci], PREDATOR_FULL_AFTER_FEED_TICKS);
      world.carcassConsumedEnergyTick += consume;
    }
    world.creatureCarcassAge[ci] = age + 1;
    if (world.creatureCarcassEnergy[ci] <= 0 || world.creatureCarcassAge[ci] >= maxAge) {
      clearCarriedCarcass(world, ci);
      world.carcassCompletedCount++;
    }
  }
}

export function killDead(
  world: World,
  spatialHash: SpatialHash,
  carrionDivisor = CARRION_DROP_DIVISOR,
  killBountyFraction = KILL_BOUNTY_FRACTION,
  maxAgeTicks = CREATURE_MAX_AGE_TICKS,
) {
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    const creatureMaxAge = world.creatureMaxAge[ci] > 0 ? world.creatureMaxAge[ci] : maxAgeTicks;
    const diedOfAge = world.creatureAge[ci] >= creatureMaxAge;
    if (world.creatureEnergy[ci] <= 0 || diedOfAge) {
      const lastAttacker = world.creatureLastAttacker[ci];
      if (diedOfAge) {
        world.deathAgeTick++;
        world.deathAgeTotal++;
      } else if (lastAttacker >= 0) {
        world.deathKilledTick++;
        world.deathKilledTotal++;
      } else {
        const start = world.creatureBlobStart[ci];
        const count = world.creatureBlobCount[ci];
        let hasMouth = false;
        for (let i = 0; i < count; i++) {
          if (world.blobType[world.creatureBlobs[start + i]] === BlobType.MOUTH) {
            hasMouth = true;
            break;
          }
        }
        if (!hasMouth) {
          world.deathStarvationNoMouthTick++;
          world.deathStarvationNoMouthTotal++;
        }
        if (count > 0) {
          const coreIdx = world.creatureBlobs[start];
          let foodNear = false;
          spatialHash.queryFood(
            world.blobX[coreIdx],
            world.blobY[coreIdx],
            HUNGRY_LOCAL_FOOD_SNAP_RANGE,
            world.foodX, world.foodY, world.foodAlive,
            world.activeFoodIds,
            world.foodCount,
            () => { foodNear = true; },
            () => { world.perfFoodOverflowFallbacks++; },
          );
          if (foodNear) {
            world.deathStarvationFoodNearTick++;
            world.deathStarvationFoodNearTotal++;
          }
        }
        world.deathStarvationTick++;
        world.deathStarvationTotal++;
      }

      // If this predator is carrying carcass, drop the remaining carried meat before removing creature.
      if (world.creatureCarcassAlive[ci] && world.creatureCarcassEnergy[ci] > 0) {
        dropCarriedCarcassAsStaticMeat(world, ci);
        world.carcassDropOnPredatorDeathCount++;
      } else {
        clearCarriedCarcass(world, ci);
      }

      // Award kill bounty to last attacker
      if (lastAttacker >= 0 && world.creatureAlive[lastAttacker]) {
        _predatorThreatTimer[lastAttacker] = Math.max(_predatorThreatTimer[lastAttacker], PREDATOR_FEAR_KILL_PULSE_TICKS);
        const bounty = world.creatureMaxEnergy[ci] * killBountyFraction;
        world.creatureEnergy[lastAttacker] = Math.min(
          world.creatureEnergy[lastAttacker] + bounty,
          world.creatureMaxEnergy[lastAttacker],
        );
      }

      // Convert corpse to meat one-to-one with dead blobs (same layout/shape), or attach as carried carcass.
      const start = world.creatureBlobStart[ci];
      const count = world.creatureBlobCount[ci];
      let deadBodySizeSum = 0;
      for (let i = 0; i < count; i++) {
        const bi = world.creatureBlobs[start + i];
        deadBodySizeSum += world.blobSize[bi];
      }
      const carrionMult = (lastAttacker >= 0 && world.creatureAlive[lastAttacker]) ? 0.5 : 1.0;
      const totalCarrionScale = Math.max(0, (deadBodySizeSum * carrionMult) / Math.max(1, carrionDivisor));
      let attachedAsCarcass = false;
      if (totalCarrionScale > 0 && lastAttacker >= 0 && world.creatureAlive[lastAttacker]) {
        attachedAsCarcass = tryAttachKilledPreyAsCarcass(world, lastAttacker, ci, totalCarrionScale, MEAT_STALE_TICKS);
      }
      if (!attachedAsCarcass) {
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
      world.constraintBaseDist[write] = world.constraintBaseDist[r];
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
  sizeReproMinAdultFrac = CREATURE_SIZE_REPRO_MIN_ADULT_FRAC,
) {
  // Population cap: don't reproduce if near capacity
  if (world.creatureCount >= creatureCap) return;

  // --- Phase 1: Identify ready creatures ---
  let readyCount = 0;
  _matedThisTick.fill(0);

  for (let ci = 0; ci < MAX_CREATURES; ci++) {
    if (!world.creatureAlive[ci]) continue;
    if (world.creatureReproCooldown[ci] > 0) continue;
    if (world.creatureSizeScale[ci] < world.creatureAdultScaleGoal[ci] * sizeReproMinAdultFrac) continue;

    const energy = world.creatureEnergy[ci];
    const maxEnergy = world.creatureMaxEnergy[ci];
    const isPredator = _hasWeapon[ci] === 1;
    const reproThreshold = Math.min(0.98, REPRODUCE_ENERGY_THRESHOLD + (isPredator ? PREDATOR_REPRO_ENERGY_THRESHOLD_ADD : 0));
    if (energy < maxEnergy * reproThreshold) continue;

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
      if (world.creatureSizeScale[otherCi] < world.creatureAdultScaleGoal[otherCi] * sizeReproMinAdultFrac) return;
      const otherEnergy = world.creatureEnergy[otherCi];
      const otherMaxEnergy = world.creatureMaxEnergy[otherCi];
      const otherPredator = _hasWeapon[otherCi] === 1;
      const otherThreshold = Math.min(0.98, REPRODUCE_ENERGY_THRESHOLD + (otherPredator ? PREDATOR_REPRO_ENERGY_THRESHOLD_ADD : 0));
      if (otherEnergy < otherMaxEnergy * otherThreshold) return;
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
        world.creatureEnergy[childCi] = world.creatureMaxEnergy[childCi];

        // Cooldown scaled by reproducer size (larger = shorter cooldown)
        const cooldownA = Math.floor(REPRODUCE_COOLDOWN / reprSize) + Math.floor(Math.random() * 100 - 50);
        const cooldownB = Math.floor(REPRODUCE_COOLDOWN / _reproducerSize[bestMate]) + Math.floor(Math.random() * 100 - 50);
        const cooldownMultA = _hasWeapon[ci] ? PREDATOR_REPRO_COOLDOWN_MULT : 1.0;
        const cooldownMultB = _hasWeapon[bestMate] ? PREDATOR_REPRO_COOLDOWN_MULT : 1.0;
        world.creatureReproCooldown[ci] = Math.max(50, cooldownA);
        world.creatureReproCooldown[ci] = Math.max(50, Math.floor(world.creatureReproCooldown[ci] * cooldownMultA));
        world.creatureReproCooldown[bestMate] = Math.max(50, Math.floor(cooldownB * cooldownMultB));

        _matedThisTick[ci] = 1;
        _matedThisTick[bestMate] = 1;
        world.creatureMateTimer[ci] = 0;
        world.creatureMateTimer[bestMate] = 0;
      }
    } else {
      // No mate found — increment timer and possibly fall back to asexual
      world.creatureMateTimer[ci]++;

      const fallbackTicks = _hasWeapon[ci] ? Math.floor(asexualFallbackTicks * PREDATOR_REPRO_FALLBACK_MULT) : asexualFallbackTicks;
      if (world.creatureMateTimer[ci] >= fallbackTicks) {
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
          world.creatureEnergy[childCi] = world.creatureMaxEnergy[childCi];
          const baseCooldown = REPRODUCE_COOLDOWN + Math.floor(Math.random() * 100 - 50);
          const cooldownMult = _hasWeapon[ci] ? PREDATOR_REPRO_COOLDOWN_MULT : 1.0;
          world.creatureReproCooldown[ci] = Math.max(50, Math.floor(baseCooldown * cooldownMult));
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
        anchorCreature: ci,
        clanId: world.creatureClanId[ci],
        predatorCount: 0,
        nonPredatorCount: 0,
        representativePredator: -1,
        energyFracSum: 0,
        hungryCount: 0,
        avgEnergyFrac: 0,
        hungryFrac: 0,
        rallyFoodX: 0,
        rallyFoodY: 0,
        rallySignalStrength: 0,
      };
      _packStats.set(packId, stats);
    }
    stats.size++;
    stats.sumX += x;
    stats.sumY += y;
    if (_leaderId[ci] === ci) {
      const prevAnchor = stats.anchorCreature;
      if (
        prevAnchor < 0 ||
        !world.creatureAlive[prevAnchor] ||
        world.creaturePackId[prevAnchor] !== packId ||
        world.creatureEnergy[ci] > world.creatureEnergy[prevAnchor]
      ) {
        stats.anchorCreature = ci;
      }
    }
    const energyFrac = world.creatureEnergy[ci] / Math.max(1, world.creatureMaxEnergy[ci]);
    stats.energyFracSum += energyFrac;
    if (energyFrac <= CLAN_HUNGER_OVERRIDE_THRESHOLD) stats.hungryCount++;
    if (_hasWeapon[ci]) {
      stats.predatorCount++;
      if (stats.representativePredator < 0) stats.representativePredator = ci;
    } else {
      stats.nonPredatorCount++;
    }
    if (_foodSignalDirect[ci] === 1) {
      const scoutBoost = _activeScoutRole[ci] === 1 ? 1.15 : 1.0;
      const candidateStrength = _foodSignalStrength[ci] * scoutBoost;
      if (candidateStrength > stats.rallySignalStrength) {
        stats.rallySignalStrength = candidateStrength;
        stats.rallyFoodX = _foodSignalX[ci];
        stats.rallyFoodY = _foodSignalY[ci];
      }
    }
  }
  for (const stats of _packStats.values()) {
    if (stats.size <= 0) continue;
    stats.avgEnergyFrac = stats.energyFracSum / stats.size;
    stats.hungryFrac = stats.hungryCount / stats.size;
  }
}

function clearActiveScoutRole(ci: number): void {
  _activeScoutRole[ci] = 0;
  _activeScoutAssignedTick[ci] = 0;
}

function assignActiveScouts(world: World): void {
  const scoutByPack = new Map<number, number>();

  // Keep valid existing scouts alive across ticks.
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) {
      clearActiveScoutRole(ci);
      continue;
    }
    if (_activeScoutRole[ci] !== 1) continue;
    const packId = world.creaturePackId[ci];
    if (packId < 0 || _hasWeapon[ci] === 1) {
      clearActiveScoutRole(ci);
      continue;
    }
    const existing = scoutByPack.get(packId);
    if (existing === undefined) {
      scoutByPack.set(packId, ci);
      continue;
    }
    const existingAssignedTick = _activeScoutAssignedTick[existing];
    const assignedTick = _activeScoutAssignedTick[ci];
    const keepCurrent =
      assignedTick < existingAssignedTick ||
      (assignedTick === existingAssignedTick && ci < existing);
    if (keepCurrent) {
      clearActiveScoutRole(existing);
      scoutByPack.set(packId, ci);
    } else {
      clearActiveScoutRole(ci);
    }
  }

  const missingPacks = new Set<number>();
  for (const [packId, stats] of _packStats.entries()) {
    if (stats.size < PACK_SCOUT_ROLE_MIN_PACK_SIZE) continue;
    if (stats.nonPredatorCount <= 0) continue;
    if (scoutByPack.has(packId)) continue;
    missingPacks.add(packId);
  }
  if (missingPacks.size === 0) return;

  const candidateByPack = new Map<number, number>();
  const candidateScoreByPack = new Map<number, number>();
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    if (_hasWeapon[ci] === 1) continue;
    const packId = world.creaturePackId[ci];
    if (!missingPacks.has(packId)) continue;
    const creatureMaxAge = world.creatureMaxAge[ci] > 0 ? world.creatureMaxAge[ci] : CREATURE_MAX_AGE_TICKS;
    const remainingAge = creatureMaxAge - world.creatureAge[ci];
    if (remainingAge < PACK_SCOUT_MIN_REMAINING_AGE_TICKS) continue;
    const start = world.creatureBlobStart[ci];
    const count = world.creatureBlobCount[ci];
    let hasMouth = false;
    for (let i = 0; i < count; i++) {
      if (world.blobType[world.creatureBlobs[start + i]] === BlobType.MOUTH) {
        hasMouth = true;
        break;
      }
    }
    if (!hasMouth) continue;
    const stats = _packStats.get(packId);
    if (!stats) continue;
    // Never assign the pack leader/anchor as scout.
    if (ci === stats.anchorCreature) continue;

    const energyScore = world.creatureEnergy[ci] / Math.max(1, world.creatureMaxEnergy[ci]);
    const ageScore = Math.min(1, remainingAge / Math.max(1, PACK_SCOUT_MIN_REMAINING_AGE_TICKS * 2));
    const score = energyScore + ageScore * 0.2;
    const prevScore = candidateScoreByPack.get(packId);
    const prevCi = candidateByPack.get(packId);
    if (
      prevScore === undefined ||
      score > prevScore ||
      (score === prevScore && prevCi !== undefined && ci < prevCi)
    ) {
      candidateScoreByPack.set(packId, score);
      candidateByPack.set(packId, ci);
    }
  }

  for (const [packId, ci] of candidateByPack.entries()) {
    _activeScoutRole[ci] = 1;
    _activeScoutAssignedTick[ci] = world.tick;
    // Freshly assigned scouts start fully energized.
    world.creatureEnergy[ci] = world.creatureMaxEnergy[ci];
    scoutByPack.set(packId, ci);
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
  assignActiveScouts(world);
  rebuildPackStats(world); // refresh scout-boosted rally signal candidates for this tick
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
  const packAnchorLeashStart2 = PACK_ANCHOR_LEASH_START * PACK_ANCHOR_LEASH_START;
  const packAnchorLeashHard2 = PACK_ANCHOR_LEASH_HARD * PACK_ANCHOR_LEASH_HARD;
  const packMergeDist2 = PACK_MERGE_DISTANCE * PACK_MERGE_DISTANCE;
  const separationRange2 = BOID_SEPARATION_RADIUS * BOID_SEPARATION_RADIUS;
  const separationHardTriggerDist = BOID_SEPARATION_RADIUS * BOID_SEPARATION_HARD_TRIGGER_RATIO;
  const alignmentRange2 = BOID_ALIGNMENT_RADIUS * BOID_ALIGNMENT_RADIUS;
  const cohesionRange2 = BOID_COHESION_RADIUS * BOID_COHESION_RADIUS;
  const antiMillMinRange2 = PACK_ANTI_MILL_MIN_RADIUS * PACK_ANTI_MILL_MIN_RADIUS;
  const antiMillMaxRange2 = PACK_ANTI_MILL_MAX_RADIUS * PACK_ANTI_MILL_MAX_RADIUS;
  const foodSignalRange2 = foodSignalRadius * foodSignalRadius;
  const feedingModeRange2 = FEEDING_MODE_RANGE * FEEDING_MODE_RANGE;
  const foodSignalRelayAgeTicks = Math.max(1, Math.floor(foodSignalDecayTicks * foodSignalRelayAgeFactor));
  const lodRangeScale = lodTier >= 2 ? 0.6 : (lodTier === 1 ? 0.8 : 1.0);
  const queryRange = Math.max(CLAN_HERD_RANGE, BOID_SEPARATION_RADIUS, BOID_ALIGNMENT_RADIUS, BOID_COHESION_RADIUS, PACK_MERGE_DISTANCE, foodSignalRadius) * lodRangeScale;
  const nonPackSeparationMult = 0.25;

  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    _isLeader[ci] = 0;
    _kinScore[ci] = 0;
  }
  rebuildPackLeaders(world);

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
    const currentPackStats = _packStats.get(packId);

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
    const isPredator = _hasWeapon[ci] === 1;
    const hungryForFood = energyFrac <= CLAN_HUNGER_OVERRIDE_THRESHOLD;
    const selfFoodDx = _sensedFoodX[ci] - cx;
    const selfFoodDy = _sensedFoodY[ci] - cy;
    const selfFoodDist2 = selfFoodDx * selfFoodDx + selfFoodDy * selfFoodDy;
    const feedingMode = selfWantsFood && selfFoundFood && selfFoodDist2 <= feedingModeRange2;
    let explorationMode = false;
    const hardHungry = energyFrac <= PACK_REJOIN_HUNGER_GATE;
    const packHungerRally =
      !!currentPackStats &&
      currentPackStats.size >= PACK_HUNGER_RALLY_MIN_PACK_SIZE &&
      currentPackStats.avgEnergyFrac <= PACK_HUNGER_RALLY_AVG_ENERGY_ON_FRAC &&
      currentPackStats.hungryFrac >= PACK_HUNGER_RALLY_HUNGRY_FRACTION_ON &&
      currentPackStats.rallySignalStrength >= PACK_HUNGER_RALLY_MIN_SIGNAL;
    const starving = energyFrac <= STARVING_FOOD_PRIORITY_ON_FRAC;
    const criticallyStarving = energyFrac <= CRITICAL_FOOD_PRIORITY_ON_FRAC;
    let starvationFoodPriority = false;
    let starvationFoodSteerMult = 1.0;
    const recoveryBoost = _packContactRecoveryTimer[ci] > 0 ? 1.45 : 1.0;
    const packPriority = PACK_HERD_PRIORITY_MULT * recoveryBoost;
    const predatorLeaderMult = isPredator ? PREDATOR_PACK_LEADER_MULT : 1.0;
    const predatorAlignMult = isPredator ? PREDATOR_PACK_ALIGNMENT_MULT : 1.0;
    const predatorCohesionMult = isPredator ? PREDATOR_PACK_COHESION_MULT : 1.0;
    const predatorSeparationMult = isPredator ? PREDATOR_PACK_SEPARATION_MULT : 1.0;
    const currentLeader = _leaderId[ci];
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
        const otherIsScoutReporter = _activeScoutRole[otherCi] === 1 && _hasWeapon[otherCi] === 0;
        const otherScoutCanReport =
          !otherIsScoutReporter ||
          (_scoutPlantClusterSeen[otherCi] === 1 && _sensedFoodKind[otherCi] !== FoodKind.MEAT);
        if (!selfFoundFood && _wantsFood[otherCi] === 1 && _hasSensedFood[otherCi] && otherScoutCanReport) {
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
          const hopScale = Math.pow(FOOD_SIGNAL_RELAY_HOP_ATTENUATION, _foodSignalHop[otherCi]);
          const signalAgeFrac = Math.max(0, Math.min(1, _foodSignalAge[otherCi] / Math.max(1, foodSignalDecayTicks)));
          const staleT = signalAgeFrac >= FOOD_SIGNAL_RELAY_STALE_START_FRAC
            ? 1
            : (signalAgeFrac / Math.max(1e-6, FOOD_SIGNAL_RELAY_STALE_START_FRAC));
          const staleScale = FOOD_SIGNAL_RELAY_STALE_MIN_MULT + (1 - FOOD_SIGNAL_RELAY_STALE_MIN_MULT) * staleT;
          const effectiveStrength = _foodSignalStrength[otherCi] * foodSignalShareWeight * relayScale * hopScale * staleScale * shareRelationMult;
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

    let packAnchorX = cx;
    let packAnchorY = cy;
    let packAnchorDist2 = 0;
    let packAnchorFarLeash = false;
    let packAnchorHasLeash = false;
    let packAnchorHardLeash = false;
    let stragglerMode = false;
    if (currentPackStats && currentPackStats.size > 1) {
      const anchorCi = currentPackStats.anchorCreature;
      if (anchorCi >= 0 && world.creatureAlive[anchorCi] && world.creaturePackId[anchorCi] === packId) {
        const anchorCoreIdx = world.creatureBlobs[world.creatureBlobStart[anchorCi]];
        packAnchorX = world.blobX[anchorCoreIdx];
        packAnchorY = world.blobY[anchorCoreIdx];
      } else {
        packAnchorX = currentPackStats.sumX / currentPackStats.size;
        packAnchorY = currentPackStats.sumY / currentPackStats.size;
      }
      const adx = packAnchorX - cx;
      const ady = packAnchorY - cy;
      packAnchorDist2 = adx * adx + ady * ady;
    }

    explorationMode = selfWantsFood && !selfFoundFood && bestFoodDist2 === Infinity && signalFoodW <= 0;
    const postFearRegroup = _packSeekTimer[ci] > 0;
    if (postFearRegroup) explorationMode = false;
    starvationFoodPriority = starving && selfWantsFood && (!!selfFoundFood || bestFoodDist2 < Infinity || signalFoodW > 0);
    if (starvationFoodPriority) {
      starvationFoodSteerMult = criticallyStarving ? CRITICAL_FOOD_STEER_MULT : STARVING_FOOD_STEER_MULT;
    }

    // Write kin score for metabolism discount
    _kinScore[ci] = Math.min(2, samePackCount * 0.33);
    samePackNeighborSum += samePackCount;
    if (_herdBondTimer[ci] > 0) _herdBondTimer[ci]--;
    if (_herdTimer[ci] > 0) _herdTimer[ci]--;

    const regroupIsolated = samePackCount <= PACK_REJOIN_ISOLATION_NEIGHBORS;
    if (regroupIsolated) _packIsolationTimer[ci]++;
    else if (samePackCount >= PACK_STRAGGLER_RELEASE_NEIGHBORS) _packIsolationTimer[ci] = 0;
    const urgentRegroup = regroupIsolated && _packIsolationTimer[ci] >= PACK_REJOIN_URGENT_ISOLATION_TICKS;

    if (currentPackStats && currentPackStats.size > 1) {
      packAnchorFarLeash = packAnchorDist2 >= packAnchorLeashStart2;
      stragglerMode = regroupIsolated && _packIsolationTimer[ci] >= PACK_STRAGGLER_ISOLATION_TICKS && packAnchorFarLeash;
      packAnchorHasLeash = stragglerMode || packAnchorFarLeash;
      packAnchorHardLeash = packAnchorDist2 >= packAnchorLeashHard2;
    }
    if (stragglerMode) {
      explorationMode = false;
    }
    if (urgentRegroup) {
      explorationMode = false;
    }

    // Pack switching: only after sustained isolation (or singleton pack) and not during join lock.
    const currentPackStatsSwitch = _packStats.get(packId);
    const targetPackStats = bestOtherPack >= 0 ? _packStats.get(bestOtherPack) : undefined;
    const currentPackSize = currentPackStatsSwitch?.size ?? 1;
    if (
      bestOtherPack >= 0 &&
      bestOtherPack !== packId &&
      canCreatureJoinPack(world, ci, targetPackStats) &&
      _packJoinLockTimer[ci] <= 0 &&
      _packContactRecoveryTimer[ci] <= 0 &&
      samePackCount === 0 &&
      !packAnchorFarLeash &&
      !stragglerMode &&
      (_packIsolationTimer[ci] >= PACK_LEAVE_ISOLATION_TICKS || currentPackSize <= 1)
    ) {
      joinPack(world, ci, bestOtherPack);
      packId = bestOtherPack;
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
    const preferredLeader = _isLeader[ci]
      ? ci
      : pickPackLeaderForCreature(world, ci, packId, cx, cy, currentLeader);
    if (_leaderTimer[ci] > 0) _leaderTimer[ci]--;
    const assignedLeader = _leaderId[ci];
    let needReassign = _leaderTimer[ci] <= 0 || assignedLeader < 0 || !world.creatureAlive[assignedLeader];
    if (!needReassign && assignedLeader !== preferredLeader) {
      needReassign = true;
    }
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
      _leaderId[ci] = preferredLeader;
      _leaderTimer[ci] = _herdMode[ci] ? Math.floor(CLAN_LEADER_REASSIGN_TICKS * 1.2) : CLAN_LEADER_REASSIGN_TICKS;
      if (_leaderId[ci] !== prevLeader) world.flockLeaderReassigns++;
    }

    const leader = _leaderId[ci];

    // Alarm signaling: packmate detected threat -> trigger fear and flee
    if (!selfFoundThreat && !_hasWeapon[ci] && _activeScoutRole[ci] !== 1 && alarmThreatDist2 < Infinity) {
      _fearTimer[ci] = FEAR_DURATION;
      _fearThreatX[ci] = alarmThreatX;
      _fearThreatY[ci] = alarmThreatY;
      forceSteer(ci, cx - alarmThreatX, cy - alarmThreatY, 0.95);
    }
    if (_fearTimer[ci] > 0) {
      world.flockFearOverrides++;
      continue;
    }

    if (packAnchorHardLeash) {
      forceSteer(ci, packAnchorX - cx, packAnchorY - cy, PACK_ANCHOR_HARD_RETURN_FORCE * predatorLeaderMult);
      continue;
    }

    // Rule 1 hard-priority: if personal space is breached, separation dominates.
    let separationHard = false;
    const sepMag2 = sepX * sepX + sepY * sepY;
    if (sepCount > 0 && sepMag2 > 1e-6 && nearestSepDist <= separationHardTriggerDist) {
      const sepMag = Math.sqrt(sepMag2);
      forceSteer(ci, sepX / sepMag, sepY / sepMag, Math.min(BOID_SEPARATION_HARD_WEIGHT * packPriority * predatorSeparationMult, BOID_MAX_FORCE));
      separationHard = true;
      world.flockHardSeparationApplies++;
    } else if (sepCount > 0 && sepMag2 > 1e-6) {
      const sepMag = Math.sqrt(sepMag2);
      const feedingSepMult = (feedingMode && samePackCount >= FEEDING_MODE_MIN_NEIGHBORS) ? FEEDING_MODE_SEPARATION_MULT : 1.0;
      addSteer(ci, sepX / sepMag, sepY / sepMag, Math.min(BOID_SEPARATION_SOFT_WEIGHT * packPriority * feedingSepMult * predatorSeparationMult, BOID_MAX_FORCE));
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
      if (packAnchorHasLeash && currentPackStats && currentPackStats.size > 1) {
        const leashT = Math.max(0, Math.min(1, (packAnchorDist2 - packAnchorLeashStart2) / Math.max(1, (packAnchorLeashHard2 - packAnchorLeashStart2))));
        const leashForce = PACK_ANCHOR_RETURN_FORCE * (1 + leashT * 0.9);
        addSteer(ci, packAnchorX - cx, packAnchorY - cy, leashForce * predatorLeaderMult * (stragglerMode ? 1.35 : 1.0));
      }

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
              const antiMillStarveMult = starvationFoodPriority ? STARVING_ANTI_MILL_MULT : 1.0;
              const sparsePackMult = Math.max(0.45, Math.min(1, (samePackCenterCount - 2) / 6));
              addSteer(ci, corrX / corrMag, corrY / corrMag, Math.min(packPriority * antiMillWeight * antiMillStarveMult * sparsePackMult, BOID_MAX_FORCE));
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
          const feedingLeaderMult = (feedingMode && samePackCount >= FEEDING_MODE_MIN_NEIGHBORS) ? FEEDING_MODE_LEADER_MULT : 1.0;
          const starvationLeaderMult = starvationFoodPriority ? STARVING_PACK_LEADER_MULT : 1.0;
          const regroupLeaderMult = urgentRegroup ? PACK_REJOIN_URGENT_SOCIAL_MULT : (regroupIsolated ? 1.18 : 1.0);
          addSteer(ci, ldx, ldy, CLAN_LEADER_WEIGHT * packPriority * herdMult * bondMult * hungerLeaderMult * feedingLeaderMult * starvationLeaderMult * regroupLeaderMult * predatorLeaderMult);
        }
      }

      // Long-range regroup: isolated members seek their pack centroid across the map.
      if (regroupIsolated && (postFearRegroup || urgentRegroup || (!explorationMode && !feedingMode))) {
        const stats = _packStats.get(packId);
        if (stats && stats.size > 1) {
          const anchorX = stats.sumX / stats.size;
          const anchorY = stats.sumY / stats.size;
          const pdx = anchorX - cx;
          const pdy = anchorY - cy;
          const pd2 = pdx * pdx + pdy * pdy;
          if (pd2 >= packSeekMinDist2 && pd2 <= packRejoinMaxDist2) {
            const packSizeMult = Math.min(1.4, 1 + Math.max(0, stats.size - 3) * 0.03);
            const starvationSeekMult = (!postFearRegroup && starvationFoodPriority) ? STARVING_PACK_SEEK_MULT : 1.0;
            const postFearSeekMult = postFearRegroup ? PACK_POST_FEAR_REJOIN_FORCE_MULT : 1.0;
            const urgentSeekMult = urgentRegroup ? PACK_REJOIN_URGENT_FORCE_MULT : 1.0;
            addSteer(ci, pdx, pdy, PACK_REJOIN_FORCE * PACK_SEEK_WEIGHT * packPriority * packSizeMult * starvationSeekMult * postFearSeekMult * urgentSeekMult * predatorLeaderMult);
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
          const feedingAlignMult = (feedingMode && samePackCount >= FEEDING_MODE_MIN_NEIGHBORS) ? FEEDING_MODE_ALIGNMENT_MULT : 1.0;
          const starvationAlignMult = starvationFoodPriority ? STARVING_PACK_ALIGNMENT_MULT : 1.0;
          const regroupSocialMult = urgentRegroup ? PACK_REJOIN_URGENT_SOCIAL_MULT : (regroupIsolated ? 1.12 : 1.0);
          addSteer(ci, avx / amag, avy / amag, Math.min(BOID_ALIGNMENT_WEIGHT * CLAN_ALIGNMENT_WEIGHT * persistentMult * packPriority * herdMult * bondMult * exploreSuppress * feedingAlignMult * starvationAlignMult * regroupSocialMult * predatorAlignMult, BOID_MAX_FORCE));
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
          const feedingCohesionMult = (feedingMode && samePackCount >= FEEDING_MODE_MIN_NEIGHBORS) ? FEEDING_MODE_COHESION_MULT : 1.0;
          const starvationCohesionMult = starvationFoodPriority ? STARVING_PACK_COHESION_MULT : 1.0;
          const regroupSocialMult = urgentRegroup ? PACK_REJOIN_URGENT_SOCIAL_MULT : (regroupIsolated ? 1.12 : 1.0);
          addSteer(ci, dx / d, dy / d, Math.min(BOID_COHESION_WEIGHT * CLAN_COHESION_WEIGHT * persistentMult * packPriority * adhesionTrait * herdMult * bondMult * exploreSuppress * feedingCohesionMult * starvationCohesionMult * regroupSocialMult * predatorCohesionMult, BOID_MAX_FORCE));
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
        addSteer(ci, fdx, fdy, (hungryForFood ? CLAN_FOOD_WEIGHT_HUNGRY : CLAN_FOOD_WEIGHT_CALM) * bondFoodMult * starvationFoodSteerMult);
      }

      // Pack hunger rally: when pack-wide hunger is high and a scout has a strong food signal,
      // bias the whole pack toward that hotspot.
      if (
        packHungerRally &&
        currentPackStats &&
        _intentMode[ci] !== INTENT_FLEE &&
        _intentMode[ci] !== INTENT_HUNT
      ) {
        const rdx = currentPackStats.rallyFoodX - cx;
        const rdy = currentPackStats.rallyFoodY - cy;
        const rd2 = rdx * rdx + rdy * rdy;
        if (rd2 > FOOD_TARGET_DEADBAND * FOOD_TARGET_DEADBAND) {
          const rallyWeight = PACK_HUNGER_RALLY_STEER_WEIGHT
            * (0.85 + currentPackStats.hungryFrac * 0.6)
            * (0.9 + Math.min(1.2, currentPackStats.rallySignalStrength));
          addSteer(ci, rdx, rdy, rallyWeight);
        }
      }

      // Dedicated scout behavior: high-energy non-predator scouts move away from the pack core
      // and patrol deterministic sweep lanes to discover new plant regions.
      const activeScout = _activeScoutRole[ci] === 1;
      if (
        activeScout &&
        !isPredator &&
        !packAnchorHasLeash &&
        energyFrac >= PACK_SCOUT_HIGH_ENERGY_FRAC &&
        _intentMode[ci] !== INTENT_FLEE &&
        _intentMode[ci] !== INTENT_MATE &&
        _intentMode[ci] !== INTENT_HUNT
      ) {
        const scoutClusterSeen = _scoutPlantClusterSeen[ci] === 1;
        if (!scoutClusterSeen && samePackCenterCount >= FORAGE_SCATTER_MIN_NEIGHBORS) {
          const centerX = samePackCenterX / samePackCenterCount;
          const centerY = samePackCenterY / samePackCenterCount;
          const awayX = cx - centerX;
          const awayY = cy - centerY;
          const awayMag2 = awayX * awayX + awayY * awayY;
          if (awayMag2 > 1e-6) {
            const awayMag = Math.sqrt(awayMag2);
            addSteer(ci, awayX / awayMag, awayY / awayMag, PACK_SCOUT_AWAY_FROM_PACK_WEIGHT);
          }
        }

        if (scoutClusterSeen) {
          const hdx = _foodSignalX[ci] - cx;
          const hdy = _foodSignalY[ci] - cy;
          const hd2 = hdx * hdx + hdy * hdy;
          if (hd2 > 1e-6) {
            const holdRadius = Math.max(1, PACK_SCOUT_REPORT_HOLD_RADIUS);
            const holdRadius2 = holdRadius * holdRadius;
            const holdDist = Math.sqrt(hd2);
            // Strong pull from far away, gentle pull near center to keep scouts on-site.
            const holdNorm = hd2 >= holdRadius2 ? 1 : Math.max(0.2, holdDist / holdRadius);
            addSteer(ci, hdx / holdDist, hdy / holdDist, PACK_SCOUT_REPORT_HOLD_WEIGHT * holdNorm);
          }
        } else if (!selfFoundFood) {
          const segTicks = Math.max(1, PACK_SCOUT_PATROL_SEGMENT_TICKS);
          const scoutTick = Math.max(0, world.tick - _activeScoutAssignedTick[ci]);
          const seg = Math.floor(scoutTick / segTicks);
          const margin = Math.max(0, Math.min(PACK_SCOUT_PATROL_MARGIN, WORLD_SIZE * 0.45));
          const span = Math.max(1, WORLD_SIZE - margin * 2);
          const lanes = Math.max(2, PACK_SCOUT_PATROL_LANES);
          const lanePhase = Math.floor(seg / 2);
          const laneCycle = Math.floor(lanePhase / lanes);
          const laneInCycle = lanePhase % lanes;
          const laneIndex = (laneCycle & 1) === 0 ? laneInCycle : (lanes - 1 - laneInCycle);
          const tx = (seg & 1) === 0 ? (WORLD_SIZE - margin) : margin;
          const ty = margin + ((laneIndex + 0.5) / lanes) * span;
          const sweepDirX = (seg & 1) === 0 ? 1 : -1;
          addSteer(ci, tx - cx, ty - cy, PACK_SCOUT_PATROL_WEIGHT);
          addSteer(ci, sweepDirX, 0, PACK_SCOUT_PATROL_DIRECTION_WEIGHT);
        }
      }

      // Exploration pressure: when foodless and signal-less in dense packs, fan out from local centroid.
      if (explorationMode && !packAnchorHasLeash) {
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
            const hungerMult = hungryForFood ? HUNGRY_ROAM_SCATTER_MULT : 1.0;
            const displacementMult = hungryForFood
              ? Math.min(2.8, HUNGRY_ROAM_DISPLACEMENT_MIN / Math.max(1, spreadMag))
              : 1.0;
            addSteer(ci, spreadX / spreadMag, spreadY / spreadMag, FORAGE_SCATTER_WEIGHT * densityMult * hungerMult * displacementMult * HUNGRY_ROAM_FAR_SCATTER_MULT);
            appliedScatter = true;
          }
        }
        if (!appliedScatter) {
          const jitter = Math.sin((world.tick + ci * 17) * 0.09) * 0.9;
          const roamAngle = world.creatureHeading[ci] + jitter;
          addSteer(ci, Math.cos(roamAngle), Math.sin(roamAngle), FORAGE_SCATTER_WEIGHT * HUNGRY_ROAM_FAR_SCATTER_MULT * (hungryForFood ? HUNGRY_ROAM_SCATTER_MULT : 1.0));
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
          addSteer(ci, sdx, sdy, foodSignalBlendWeight * intentMult * hungerMult * scoutMult * selfFoodMult * starvationFoodSteerMult);
          world.foodSignalSteerApplies++;
          _foodSignalX[ci] = sx;
          _foodSignalY[ci] = sy;
          const relayStrength = Math.min(
            0.95,
            Math.max(_foodSignalStrength[ci], signalFoodW * 0.65, foodSignalMinStrength * 1.25),
          );
          _foodSignalStrength[ci] = relayStrength;
          const nextHop = hasRelayCandidate ? Math.min(255, Math.min(foodSignalMaxHops + 1, minRelayHop + 1)) : _foodSignalHop[ci];
          _foodSignalHop[ci] = nextHop;
          const hopAgePenalty = Math.pow(FOOD_SIGNAL_RELAY_HOP_ATTENUATION, Math.max(0, nextHop - 1));
          const maxRelayAge = Math.max(6, Math.floor(foodSignalRelayAgeTicks * hopAgePenalty));
          _foodSignalAge[ci] = Math.max(_foodSignalAge[ci], maxRelayAge);
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

export function isCreatureActiveScout(creatureId: number): boolean {
  if (creatureId < 0 || creatureId >= MAX_CREATURES) return false;
  return _activeScoutRole[creatureId] === 1;
}

export function isCreaturePackLeader(creatureId: number): boolean {
  if (creatureId < 0 || creatureId >= MAX_CREATURES) return false;
  return _isLeader[creatureId] === 1;
}
