import { World } from './world';
import { SpatialHash } from './spatial-hash';
import { verletIntegrate, solveConstraints, enforceBoundaries } from './physics';
import { resolveCollisions } from './collision';
import {
  updateCreatureLocomotion, updateSensors, updateMetabolism,
  eatFood, handleWeapons, processLatches, killDead, reproduce, updateFlocking,
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
}

export class SimulationLoop {
  readonly world = new World();
  readonly spatialHash = new SpatialHash();
  speed = 1;

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
  };

  step() {
    const substeps = this.speed;
    for (let s = 0; s < substeps; s++) {
      this.substep();
    }
  }

  private substep() {
    const { world, spatialHash, params } = this;

    // Spawn food
    spawnFood(world, params.foodSpawnRate, params.foodDispersion);

    // Creature behavior
    updateSensors(world, params.predationKinThreshold, params.stealthDetectionMult);
    updateCreatureLocomotion(world, params.motorForce, params.lungeSpeedMult);

    // Physics
    verletIntegrate(world, 1 / 60);
    spatialHash.rebuild(world.blobX, world.blobY, world.blobAlive, MAX_BLOBS);
    solveConstraints(world);

    // Weapons before collision: check contact before collision resolver separates creatures
    handleWeapons(world, params.predationStealFraction, params.predationKinThreshold);
    processLatches(world, params.predationStealFraction);

    resolveCollisions(world, spatialHash);
    enforceBoundaries(world);
    updateFlocking(world, spatialHash);

    // Ecology
    eatFood(world, params.eatFullStopFraction, params.eatResumeFraction, params.eatCooldownTicks, params.eatMaxItemsPerSubstep);
    updateMetabolism(world, params.metabolismCost, params.metabolismExponent);
    killDead(world, params.carrionDropDivisor, params.killBountyFraction);

    // Reproduction
    reproduce(world, spatialHash, params.mutationRate, params.structuralMutationRate, params.creatureCap, params.mateMinSimilarity, params.asexualFallbackTicks);

    world.tick++;
  }
}
