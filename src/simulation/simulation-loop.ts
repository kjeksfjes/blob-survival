import { World } from './world';
import { SpatialHash } from './spatial-hash';
import { verletIntegrate, solveConstraints, enforceBoundaries } from './physics';
import { resolveCollisions } from './collision';
import {
  updateCreatureLocomotion, updateSensors, updateMetabolism,
  eatFood, handleWeapons, killDead, reproduce, updateFlocking,
} from './creature';
import { spawnFood } from './food';
import {
  MAX_BLOBS, FOOD_SPAWN_RATE, METABOLISM_COST_PER_BLOB,
  MOTOR_FORCE, MUTATION_RATE, CREATURE_CAP,
  PREDATION_STEAL_FRACTION, PREDATION_KIN_THRESHOLD,
  CARRION_DROP_DIVISOR, STRUCTURAL_MUTATION_RATE,
} from '../constants';

export interface SimParams {
  foodSpawnRate: number;
  metabolismCost: number;
  motorForce: number;
  mutationRate: number;
  structuralMutationRate: number;
  creatureCap: number;
  predationStealFraction: number;
  predationKinThreshold: number;
  carrionDropDivisor: number;
}

export class SimulationLoop {
  readonly world = new World();
  readonly spatialHash = new SpatialHash();
  speed = 1;

  readonly params: SimParams = {
    foodSpawnRate: FOOD_SPAWN_RATE,
    metabolismCost: METABOLISM_COST_PER_BLOB,
    motorForce: MOTOR_FORCE,
    mutationRate: MUTATION_RATE,
    structuralMutationRate: STRUCTURAL_MUTATION_RATE,
    creatureCap: CREATURE_CAP,
    predationStealFraction: PREDATION_STEAL_FRACTION,
    predationKinThreshold: PREDATION_KIN_THRESHOLD,
    carrionDropDivisor: CARRION_DROP_DIVISOR,
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
    spawnFood(world, params.foodSpawnRate);

    // Creature behavior
    updateSensors(world, params.predationKinThreshold);
    updateCreatureLocomotion(world, params.motorForce);

    // Physics
    verletIntegrate(world, 1 / 60);
    spatialHash.rebuild(world.blobX, world.blobY, world.blobAlive, MAX_BLOBS);
    solveConstraints(world);
    resolveCollisions(world, spatialHash);
    enforceBoundaries(world);
    updateFlocking(world, spatialHash);

    // Ecology
    eatFood(world);
    handleWeapons(world, params.predationStealFraction, params.predationKinThreshold);
    updateMetabolism(world, params.metabolismCost);
    killDead(world, params.carrionDropDivisor);

    // Reproduction
    reproduce(world, params.mutationRate, params.structuralMutationRate, params.creatureCap);

    world.tick++;
  }
}
