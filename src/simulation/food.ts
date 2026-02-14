import { World } from './world';
import { FOOD_MAX, WORLD_SIZE, BOUNDARY_PADDING } from '../constants';

export function spawnFood(world: World, foodSpawnRate: number) {
  const toSpawn = Math.min(foodSpawnRate, FOOD_MAX - world.foodCount);
  const margin = BOUNDARY_PADDING + 50;

  for (let i = 0; i < toSpawn; i++) {
    const fi = world.allocFood();
    if (fi < 0) break;

    world.foodX[fi] = margin + Math.random() * (WORLD_SIZE - margin * 2);
    world.foodY[fi] = margin + Math.random() * (WORLD_SIZE - margin * 2);
  }
}
