import { World } from './world';
import { SpatialHash } from './spatial-hash';
import { verletIntegrate, solveConstraints, enforceBoundaries } from './physics';
import { resolveCollisions } from './collision';
import {
  updateCreatureLocomotion, updateSensors, updateMetabolism,
  eatFood, handleWeapons, processLatches, processCarriedCarcass, killDead, reproduce, updateFlocking, clearSteering, applySteering,
} from './creature';
import { spawnFood } from './food';
import {
  MAX_BLOBS, FOOD_SPAWN_RATE, METABOLISM_COST_PER_BLOB, METABOLISM_SCALING_EXPONENT,
  MOTOR_FORCE, MUTATION_RATE, CREATURE_CAP,
  PREDATION_STEAL_FRACTION, PREDATION_KIN_THRESHOLD,
  CARRION_DROP_DIVISOR, STRUCTURAL_MUTATION_RATE,
  LUNGE_SPEED_MULT, STEALTH_DETECTION_MULT, KILL_BOUNTY_FRACTION,
  MATE_MIN_SIMILARITY, ASEXUAL_FALLBACK_TICKS,
  FOOD_DISPERSION_DEFAULT,
  EAT_FULL_STOP_FRACTION, EAT_RESUME_FRACTION, EAT_COOLDOWN_TICKS, EAT_MAX_ITEMS_PER_SUBSTEP,
  PHOTO_ENERGY_PER_TICK, PHOTO_CROWD_PENALTY_MAX, PHOTO_IDLE_PENALTY_MIN_MULT, PHOTO_MAINTENANCE_COST_PER_BLOB, PHOTO_MAINTENANCE_SIZE_MULT,
  FOOD_SIGNAL_RADIUS, FOOD_SIGNAL_DECAY_TICKS, FOOD_SIGNAL_MIN_STRENGTH, FOOD_SIGNAL_SHARE_WEIGHT, FOOD_SIGNAL_BLEND_WEIGHT,
  FOOD_SIGNAL_RELAY_ATTENUATION, FOOD_SIGNAL_MAX_HOPS, FOOD_SIGNAL_RELAY_AGE_FACTOR,
} from '../constants';

export interface SimParams {
  foodSpawnRate: number;
  foodDispersion: number;
  metabolismCost: number;
  metabolismExponent: number;
  motorForce: number;
  mutationRate: number;
  structuralMutationRate: number;
  creatureCap: number;
  predationStealFraction: number;
  predationKinThreshold: number;
  carrionDropDivisor: number;
  lungeSpeedMult: number;
  stealthDetectionMult: number;
  killBountyFraction: number;
  mateMinSimilarity: number;
  asexualFallbackTicks: number;
  eatFullStopFraction: number;
  eatResumeFraction: number;
  eatCooldownTicks: number;
  eatMaxItemsPerSubstep: number;
  photoEnergyPerTick: number;
  photoCrowdPenaltyMax: number;
  photoIdlePenaltyMinMult: number;
  photoMaintenanceCostPerBlob: number;
  photoMaintenanceSizeMult: number;
  foodSignalRadius: number;
  foodSignalDecayTicks: number;
  foodSignalMinStrength: number;
  foodSignalShareWeight: number;
  foodSignalBlendWeight: number;
  foodSignalRelayAttenuation: number;
  foodSignalMaxHops: number;
  foodSignalRelayAgeFactor: number;
  perfLodEnabled: boolean;
  perfLodTierOverride: number;
  perfNeighborBudgetTier1: number;
  perfNeighborBudgetTier2: number;
}

export class SimulationLoop {
  readonly world = new World();
  readonly spatialHash = new SpatialHash();
  speed = 1;
  private readonly aggregateWindow = 500;
  private aggSamples = 0;
  private aggFoodSum = 0;
  private aggMeatSum = 0;
  private aggCreatureSum = 0;
  private aggRelaySum = 0;
  private aggSteerSum = 0;
  private aggNeighborSum = 0;
  private aggDirectSum = 0;
  private aggRelayAdoptSum = 0;
  private aggSteerApplySum = 0;
  private aggExpiredSum = 0;
  private aggMinStrength = Infinity;
  private aggMaxStrength = 0;
  private aggMinHop = Infinity;
  private aggMaxHop = 0;
  private aggWantsFoodSum = 0;
  private aggHungrySum = 0;
  private aggPredatorSum = 0;
  private aggEnergyFracSum = 0;
  private aggIntentForageSum = 0;
  private aggIntentHuntSum = 0;
  private aggEatPlantSum = 0;
  private aggEatMeatSum = 0;

  readonly params: SimParams = {
    foodSpawnRate: FOOD_SPAWN_RATE,
    foodDispersion: FOOD_DISPERSION_DEFAULT,
    metabolismCost: METABOLISM_COST_PER_BLOB,
    metabolismExponent: METABOLISM_SCALING_EXPONENT,
    motorForce: MOTOR_FORCE,
    mutationRate: MUTATION_RATE,
    structuralMutationRate: STRUCTURAL_MUTATION_RATE,
    creatureCap: CREATURE_CAP,
    predationStealFraction: PREDATION_STEAL_FRACTION,
    predationKinThreshold: PREDATION_KIN_THRESHOLD,
    carrionDropDivisor: CARRION_DROP_DIVISOR,
    lungeSpeedMult: LUNGE_SPEED_MULT,
    stealthDetectionMult: STEALTH_DETECTION_MULT,
    killBountyFraction: KILL_BOUNTY_FRACTION,
    mateMinSimilarity: MATE_MIN_SIMILARITY,
    asexualFallbackTicks: ASEXUAL_FALLBACK_TICKS,
    eatFullStopFraction: EAT_FULL_STOP_FRACTION,
    eatResumeFraction: EAT_RESUME_FRACTION,
    eatCooldownTicks: EAT_COOLDOWN_TICKS,
    eatMaxItemsPerSubstep: EAT_MAX_ITEMS_PER_SUBSTEP,
    photoEnergyPerTick: PHOTO_ENERGY_PER_TICK,
    photoCrowdPenaltyMax: PHOTO_CROWD_PENALTY_MAX,
    photoIdlePenaltyMinMult: PHOTO_IDLE_PENALTY_MIN_MULT,
    photoMaintenanceCostPerBlob: PHOTO_MAINTENANCE_COST_PER_BLOB,
    photoMaintenanceSizeMult: PHOTO_MAINTENANCE_SIZE_MULT,
    foodSignalRadius: FOOD_SIGNAL_RADIUS,
    foodSignalDecayTicks: FOOD_SIGNAL_DECAY_TICKS,
    foodSignalMinStrength: FOOD_SIGNAL_MIN_STRENGTH,
    foodSignalShareWeight: FOOD_SIGNAL_SHARE_WEIGHT,
    foodSignalBlendWeight: FOOD_SIGNAL_BLEND_WEIGHT,
    foodSignalRelayAttenuation: FOOD_SIGNAL_RELAY_ATTENUATION,
    foodSignalMaxHops: FOOD_SIGNAL_MAX_HOPS,
    foodSignalRelayAgeFactor: FOOD_SIGNAL_RELAY_AGE_FACTOR,
    perfLodEnabled: true,
    perfLodTierOverride: -1,
    perfNeighborBudgetTier1: 48,
    perfNeighborBudgetTier2: 24,
  };

  step() {
    const stepStartMs = performance.now();
    const substeps = this.speed;
    for (let s = 0; s < substeps; s++) {
      this.substep();
    }
    const stepMs = performance.now() - stepStartMs;
    this.world.simStepMs = this.world.simStepMs > 0
      ? this.world.simStepMs * 0.9 + stepMs * 0.1
      : stepMs;
  }

  private substep() {
    const { world, spatialHash, params } = this;
    const t0 = performance.now();
    world.perfFoodOverflowFallbacks = 0;

    // Spawn food
    spawnFood(world, params.foodSpawnRate, params.foodDispersion);
    spatialHash.rebuildFood(world.foodX, world.foodY, world.foodAlive, world.foodAlive.length, world.activeFoodIds, world.foodCount);
    spatialHash.rebuild(world.blobX, world.blobY, world.blobAlive, MAX_BLOBS, world.activeBlobIds, world.blobCount);
    const tFood = performance.now();
    world.perfMsFood = world.perfMsFood > 0 ? world.perfMsFood * 0.9 + (tFood - t0) * 0.1 : (tFood - t0);

    // Creature behavior intent + arbitration
    clearSteering(world);
    updateSensors(
      world,
      spatialHash,
      params.predationKinThreshold,
      params.stealthDetectionMult,
      params.eatFullStopFraction,
      params.eatResumeFraction,
      params.foodSignalDecayTicks,
      params.foodSignalMinStrength,
    );
    const tSensors = performance.now();
    world.perfMsSensors = world.perfMsSensors > 0 ? world.perfMsSensors * 0.9 + (tSensors - tFood) * 0.1 : (tSensors - tFood);
    let lodTier = 0;
    if (params.perfLodEnabled) {
      if (params.perfLodTierOverride >= 0) lodTier = params.perfLodTierOverride | 0;
      else if (world.creatureCount > 700) lodTier = 2;
      else if (world.creatureCount > 350) lodTier = 1;
    }
    world.perfLodTierActive = lodTier;
    const neighborBudget = lodTier === 2 ? params.perfNeighborBudgetTier2 : (lodTier === 1 ? params.perfNeighborBudgetTier1 : 0);
    updateFlocking(
      world,
      spatialHash,
      params.foodSignalRadius,
      params.foodSignalMinStrength,
      params.foodSignalShareWeight,
      params.foodSignalBlendWeight,
      params.foodSignalRelayAttenuation,
      params.foodSignalMaxHops,
      params.foodSignalDecayTicks,
      params.foodSignalRelayAgeFactor,
      neighborBudget,
      lodTier,
    );
    const tFlock = performance.now();
    world.perfMsFlocking = world.perfMsFlocking > 0 ? world.perfMsFlocking * 0.9 + (tFlock - tSensors) * 0.1 : (tFlock - tSensors);
    applySteering(world);
    updateCreatureLocomotion(world, params.motorForce, params.lungeSpeedMult);

    // Physics
    verletIntegrate(world, 1 / 60);
    spatialHash.rebuild(world.blobX, world.blobY, world.blobAlive, MAX_BLOBS, world.activeBlobIds, world.blobCount);
    solveConstraints(world);
    const tPhysics = performance.now();
    world.perfMsPhysics = world.perfMsPhysics > 0 ? world.perfMsPhysics * 0.9 + (tPhysics - tFlock) * 0.1 : (tPhysics - tFlock);

    // Weapons before collision: check contact before collision resolver separates creatures
    handleWeapons(world, spatialHash, params.predationStealFraction, params.predationKinThreshold);
    processLatches(world, params.predationStealFraction);
    processCarriedCarcass(world);

    resolveCollisions(world, spatialHash);
    enforceBoundaries(world);
    const tCollision = performance.now();
    world.perfMsCollision = world.perfMsCollision > 0 ? world.perfMsCollision * 0.9 + (tCollision - tPhysics) * 0.1 : (tCollision - tPhysics);

    // Ecology
    eatFood(world, spatialHash, params.eatFullStopFraction, params.eatResumeFraction, params.eatCooldownTicks, params.eatMaxItemsPerSubstep);
    updateMetabolism(
      world,
      params.metabolismCost,
      params.metabolismExponent,
      params.photoEnergyPerTick,
      params.photoCrowdPenaltyMax,
      params.photoIdlePenaltyMinMult,
      params.photoMaintenanceCostPerBlob,
      params.photoMaintenanceSizeMult,
    );
    killDead(world, params.carrionDropDivisor, params.killBountyFraction);

    // Reproduction
    reproduce(world, spatialHash, params.mutationRate, params.structuralMutationRate, params.creatureCap, params.mateMinSimilarity, params.asexualFallbackTicks);
    const tEco = performance.now();
    world.perfMsEcology = world.perfMsEcology > 0 ? world.perfMsEcology * 0.9 + (tEco - tCollision) * 0.1 : (tEco - tCollision);

    world.tick++;
    this.accumulateWindowMetrics();
  }

  private accumulateWindowMetrics() {
    const w = this.world;
    this.aggSamples++;
    this.aggFoodSum += w.foodCount;
    this.aggMeatSum += w.foodMeatCount;
    this.aggCreatureSum += w.creatureCount;
    this.aggRelaySum += w.foodSignalRelayAdopts;
    this.aggSteerSum += w.foodSignalSteerApplies;
    this.aggNeighborSum += w.flockAvgSamePackNeighbors;
    this.aggDirectSum += w.foodSignalDirectEmits;
    this.aggRelayAdoptSum += w.foodSignalRelayAdopts;
    this.aggSteerApplySum += w.foodSignalSteerApplies;
    this.aggExpiredSum += w.foodSignalExpiredClears;
    this.aggMinStrength = Math.min(this.aggMinStrength, w.foodSignalAvgStrength);
    this.aggMaxStrength = Math.max(this.aggMaxStrength, w.foodSignalAvgStrength);
    this.aggMinHop = Math.min(this.aggMinHop, w.foodSignalAvgHop);
    this.aggMaxHop = Math.max(this.aggMaxHop, w.foodSignalAvgHop);
    this.aggWantsFoodSum += w.foodWantsCount;
    this.aggHungrySum += w.foodHungryCount;
    this.aggPredatorSum += w.predatorCount;
    this.aggEnergyFracSum += w.avgEnergyFrac;
    this.aggIntentForageSum += w.intentForageCount;
    this.aggIntentHuntSum += w.intentHuntCount;
    this.aggEatPlantSum += w.foodEatenPlant;
    this.aggEatMeatSum += w.foodEatenMeat;

    if (this.aggSamples < this.aggregateWindow) return;

    const samples = this.aggSamples;
    const startTick = w.tick - samples + 1;
    const endTick = w.tick;
    const avgFood = this.aggFoodSum / samples;
    const avgMeat = this.aggMeatSum / samples;
    const avgMeatFrac = avgFood > 0 ? avgMeat / avgFood : 0;
    const avgCreatures = this.aggCreatureSum / samples;
    const avgRelay = this.aggRelaySum / samples;
    const avgSteer = this.aggSteerSum / samples;
    const avgNeighbors = this.aggNeighborSum / samples;
    const directRate = this.aggDirectSum / samples;
    const relayRate = this.aggRelayAdoptSum / samples;
    const steerRate = this.aggSteerApplySum / samples;
    const expiredRate = this.aggExpiredSum / samples;
    const relayPerDirect = this.aggDirectSum > 0 ? this.aggRelayAdoptSum / this.aggDirectSum : 0;
    const steerPerRelay = this.aggRelayAdoptSum > 0 ? this.aggSteerApplySum / this.aggRelayAdoptSum : 0;
    const minStrength = Number.isFinite(this.aggMinStrength) ? this.aggMinStrength : 0;
    const minHop = Number.isFinite(this.aggMinHop) ? this.aggMinHop : 0;
    const avgWantsFood = this.aggWantsFoodSum / samples;
    const avgHungry = this.aggHungrySum / samples;
    const avgPredators = this.aggPredatorSum / samples;
    const avgEnergyFrac = this.aggEnergyFracSum / samples;
    const avgIntentForage = this.aggIntentForageSum / samples;
    const avgIntentHunt = this.aggIntentHuntSum / samples;
    const avgEatPlant = this.aggEatPlantSum / samples;
    const avgEatMeat = this.aggEatMeatSum / samples;

    w.aggWindowTicks = samples;
    w.aggWindowStartTick = startTick;
    w.aggWindowEndTick = endTick;
    w.aggAvgFood = avgFood;
    w.aggAvgMeat = avgMeat;
    w.aggMeatFraction = avgMeatFrac;
    w.aggAvgCreatures = avgCreatures;
    w.aggAvgRelay = avgRelay;
    w.aggAvgSteer = avgSteer;
    w.aggAvgNeighbors = avgNeighbors;
    w.aggDirectRate = directRate;
    w.aggRelayRate = relayRate;
    w.aggSteerRate = steerRate;
    w.aggExpiredRate = expiredRate;
    w.aggRelayPerDirect = relayPerDirect;
    w.aggSteerPerRelay = steerPerRelay;
    w.aggMinSignalStrength = minStrength;
    w.aggMaxSignalStrength = this.aggMaxStrength;
    w.aggMinSignalHop = minHop;
    w.aggMaxSignalHop = this.aggMaxHop;
    w.aggAvgWantsFood = avgWantsFood;
    w.aggAvgHungry = avgHungry;
    w.aggAvgPredators = avgPredators;
    w.aggAvgEnergyFrac = avgEnergyFrac;
    w.aggAvgIntentForage = avgIntentForage;
    w.aggAvgIntentHunt = avgIntentHunt;
    w.aggAvgEatPlant = avgEatPlant;
    w.aggAvgEatMeat = avgEatMeat;

    console.log(
      `[Agg ${startTick}-${endTick}] food=${avgFood.toFixed(1)} creatures=${avgCreatures.toFixed(1)} ` +
      `direct/t=${directRate.toFixed(2)} relay/t=${relayRate.toFixed(2)} steer/t=${steerRate.toFixed(2)} ` +
      `r/d=${relayPerDirect.toFixed(2)} s/r=${steerPerRelay.toFixed(2)} ` +
      `str=[${minStrength.toFixed(3)},${this.aggMaxStrength.toFixed(3)}] hop=[${minHop.toFixed(3)},${this.aggMaxHop.toFixed(3)}] ` +
      `wants=${avgWantsFood.toFixed(1)} hungry=${avgHungry.toFixed(1)} pred=${avgPredators.toFixed(1)} meat=${avgMeat.toFixed(1)} mFrac=${avgMeatFrac.toFixed(2)} ` +
      `eatP/t=${avgEatPlant.toFixed(2)} eatM/t=${avgEatMeat.toFixed(2)} ` +
      `eFrac=${avgEnergyFrac.toFixed(2)} forage=${avgIntentForage.toFixed(1)} hunt=${avgIntentHunt.toFixed(1)}`,
    );

    this.aggSamples = 0;
    this.aggFoodSum = 0;
    this.aggMeatSum = 0;
    this.aggCreatureSum = 0;
    this.aggRelaySum = 0;
    this.aggSteerSum = 0;
    this.aggNeighborSum = 0;
    this.aggDirectSum = 0;
    this.aggRelayAdoptSum = 0;
    this.aggSteerApplySum = 0;
    this.aggExpiredSum = 0;
    this.aggMinStrength = Infinity;
    this.aggMaxStrength = 0;
    this.aggMinHop = Infinity;
    this.aggMaxHop = 0;
    this.aggWantsFoodSum = 0;
    this.aggHungrySum = 0;
    this.aggPredatorSum = 0;
    this.aggEnergyFracSum = 0;
    this.aggIntentForageSum = 0;
    this.aggIntentHuntSum = 0;
    this.aggEatPlantSum = 0;
    this.aggEatMeatSum = 0;
  }
}
