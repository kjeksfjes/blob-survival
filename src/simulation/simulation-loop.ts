import { World } from './world';
import { SpatialHash } from './spatial-hash';
import { verletIntegrate, solveConstraints, enforceBoundaries } from './physics';
import { resolveCollisions } from './collision';
import {
  updateCreatureLocomotion, updateSensors, updateMetabolism,
  eatFood, handleWeapons, killDead, reproduce,
} from './creature';
import { spawnFood } from './food';
import {
  MAX_BLOBS, FOOD_SPAWN_RATE, METABOLISM_COST_PER_BLOB,
  MOTOR_FORCE, MUTATION_RATE,
} from '../constants';

export interface SimParams {
  foodSpawnRate: number;
  metabolismCost: number;
  motorForce: number;
  mutationRate: number;
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
    updateSensors(world);
    updateCreatureLocomotion(world, params.motorForce);

    // Physics
    verletIntegrate(world, 1 / 60);
    spatialHash.rebuild(world.blobX, world.blobY, world.blobAlive, MAX_BLOBS);
    solveConstraints(world);
    resolveCollisions(world, spatialHash);
    enforceBoundaries(world);

    // Ecology
    eatFood(world);
    handleWeapons(world);
    updateMetabolism(world, params.metabolismCost);
    killDead(world);

    // Reproduction
    reproduce(world, params.mutationRate);

    world.tick++;
  }
}
