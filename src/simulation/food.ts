import { World } from './world';
import {
  FOOD_MAX, WORLD_SIZE, BOUNDARY_PADDING,
  FOOD_PATCH_COUNT, FOOD_PATCH_RADIUS, FOOD_PATCH_FRACTION,
  FOOD_PATCH_DRIFT_SPEED, FOOD_PATCH_ROTATE_INTERVAL,
} from '../constants';

// --- Food patch state ---
interface FoodPatch {
  x: number;
  y: number;
  dx: number; // drift direction
  dy: number;
}

const patches: FoodPatch[] = [];
let patchesInitialized = false;
let ticksSinceRotate = 0;

function initPatches() {
  const margin = BOUNDARY_PADDING + FOOD_PATCH_RADIUS * 0.5;
  for (let i = 0; i < FOOD_PATCH_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    patches.push({
      x: margin + Math.random() * (WORLD_SIZE - margin * 2),
      y: margin + Math.random() * (WORLD_SIZE - margin * 2),
      dx: Math.cos(angle) * FOOD_PATCH_DRIFT_SPEED,
      dy: Math.sin(angle) * FOOD_PATCH_DRIFT_SPEED,
    });
  }
  patchesInitialized = true;
}

function randomizeDriftDirections() {
  for (const p of patches) {
    const angle = Math.random() * Math.PI * 2;
    p.dx = Math.cos(angle) * FOOD_PATCH_DRIFT_SPEED;
    p.dy = Math.sin(angle) * FOOD_PATCH_DRIFT_SPEED;
  }
}

function driftPatches() {
  const margin = BOUNDARY_PADDING + 50;
  for (const p of patches) {
    p.x += p.dx;
    p.y += p.dy;
    // Bounce off walls
    if (p.x < margin) { p.x = margin; p.dx = Math.abs(p.dx); }
    if (p.x > WORLD_SIZE - margin) { p.x = WORLD_SIZE - margin; p.dx = -Math.abs(p.dx); }
    if (p.y < margin) { p.y = margin; p.dy = Math.abs(p.dy); }
    if (p.y > WORLD_SIZE - margin) { p.y = WORLD_SIZE - margin; p.dy = -Math.abs(p.dy); }
  }

  ticksSinceRotate++;
  if (ticksSinceRotate >= FOOD_PATCH_ROTATE_INTERVAL) {
    ticksSinceRotate = 0;
    randomizeDriftDirections();
  }
}

/** Sample a point from a 2D Gaussian centered at (cx, cy) with given sigma, clamped to world. */
function gaussianSample(cx: number, cy: number, sigma: number): [number, number] {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const r = sigma * Math.sqrt(-2 * Math.log(u1 || 1e-10));
  const theta = 2 * Math.PI * u2;
  const x = cx + r * Math.cos(theta);
  const y = cy + r * Math.sin(theta);
  const margin = BOUNDARY_PADDING + 10;
  return [
    Math.max(margin, Math.min(WORLD_SIZE - margin, x)),
    Math.max(margin, Math.min(WORLD_SIZE - margin, y)),
  ];
}

export function spawnFood(world: World, foodSpawnRate: number) {
  if (!patchesInitialized) initPatches();

  const toSpawn = Math.min(foodSpawnRate, FOOD_MAX - world.foodCount);
  if (toSpawn <= 0) return;

  // Drift patches each tick
  driftPatches();

  const margin = BOUNDARY_PADDING + 50;
  const patchCount = Math.round(toSpawn * FOOD_PATCH_FRACTION);
  const uniformCount = toSpawn - patchCount;

  // Spawn food in patches (distribute evenly across patches)
  for (let i = 0; i < patchCount; i++) {
    const fi = world.allocFood();
    if (fi < 0) break;
    const patch = patches[i % FOOD_PATCH_COUNT];
    const [px, py] = gaussianSample(patch.x, patch.y, FOOD_PATCH_RADIUS);
    world.foodX[fi] = px;
    world.foodY[fi] = py;
  }

  // Spawn uniform food (30%)
  for (let i = 0; i < uniformCount; i++) {
    const fi = world.allocFood();
    if (fi < 0) break;
    world.foodX[fi] = margin + Math.random() * (WORLD_SIZE - margin * 2);
    world.foodY[fi] = margin + Math.random() * (WORLD_SIZE - margin * 2);
  }
}
