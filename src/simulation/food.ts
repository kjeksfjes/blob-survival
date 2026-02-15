import { World } from './world';
import {
  FOOD_MAX, WORLD_SIZE, BOUNDARY_PADDING,
  FOOD_PATCH_COUNT, FOOD_PATCH_DRIFT_SPEED, FOOD_PATCH_ROTATE_INTERVAL,
  FOOD_PATCH_SUB_COUNT_MIN, FOOD_PATCH_SUB_COUNT_MAX,
  FOOD_PATCH_SUB_OFFSET, FOOD_PATCH_SUB_ORBIT_SPEED,
  FOOD_SIGMA_MIN, FOOD_SIGMA_MAX,
  FOOD_PATCH_FRACTION_MIN, FOOD_PATCH_FRACTION_MAX,
  FOOD_SUB_OFFSET_SCALE_MIN, FOOD_SUB_OFFSET_SCALE_MAX,
} from '../constants';

// --- Sub-hotspot (lobe within a patch) ---
interface SubHotspot {
  offsetAngle: number; // angle from patch center
  offsetDist: number;  // base distance from patch center
  weight: number;      // selection weight (higher = more food spawns here)
}

// --- Food patch state ---
interface FoodPatch {
  x: number;
  y: number;
  dx: number; // drift direction
  dy: number;
  subs: SubHotspot[];
  totalWeight: number; // cached sum of sub weights
}

const patches: FoodPatch[] = [];
let patchesInitialized = false;
let ticksSinceRotate = 0;

function initPatches() {
  const margin = BOUNDARY_PADDING + 200;
  for (let i = 0; i < FOOD_PATCH_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const subCount = FOOD_PATCH_SUB_COUNT_MIN +
      Math.floor(Math.random() * (FOOD_PATCH_SUB_COUNT_MAX - FOOD_PATCH_SUB_COUNT_MIN + 1));

    const subs: SubHotspot[] = [];
    let totalWeight = 0;
    for (let s = 0; s < subCount; s++) {
      const w = 0.5 + Math.random(); // weight in [0.5, 1.5]
      subs.push({
        offsetAngle: (Math.PI * 2 * s) / subCount + (Math.random() - 0.5) * 0.8,
        offsetDist: FOOD_PATCH_SUB_OFFSET * (0.7 + Math.random() * 0.6),
        weight: w,
      });
      totalWeight += w;
    }

    patches.push({
      x: margin + Math.random() * (WORLD_SIZE - margin * 2),
      y: margin + Math.random() * (WORLD_SIZE - margin * 2),
      dx: Math.cos(angle) * FOOD_PATCH_DRIFT_SPEED,
      dy: Math.sin(angle) * FOOD_PATCH_DRIFT_SPEED,
      subs,
      totalWeight,
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

    // Orbit sub-hotspots
    for (const sub of p.subs) {
      sub.offsetAngle += FOOD_PATCH_SUB_ORBIT_SPEED;
    }
  }

  ticksSinceRotate++;
  if (ticksSinceRotate >= FOOD_PATCH_ROTATE_INTERVAL) {
    ticksSinceRotate = 0;
    randomizeDriftDirections();
  }
}

/** Weighted random pick of a sub-hotspot */
function weightedPickSub(patch: FoodPatch): SubHotspot {
  let r = Math.random() * patch.totalWeight;
  for (const sub of patch.subs) {
    r -= sub.weight;
    if (r <= 0) return sub;
  }
  return patch.subs[patch.subs.length - 1];
}

/** Sample a point from a 2D Gaussian centered at (cx, cy) with given sigma.
 *  Rejects samples outside world bounds to avoid edge accumulation. */
function gaussianSample(cx: number, cy: number, sigma: number): [number, number] | null {
  const margin = BOUNDARY_PADDING + 10;
  // Try a few times, then give up to avoid infinite loops near edges
  for (let attempt = 0; attempt < 4; attempt++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const r = sigma * Math.sqrt(-2 * Math.log(u1 || 1e-10));
    const theta = 2 * Math.PI * u2;
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    if (x >= margin && x <= WORLD_SIZE - margin && y >= margin && y <= WORLD_SIZE - margin) {
      return [x, y];
    }
  }
  return null;
}

/** Linearly interpolate between a and b by t */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function spawnFood(world: World, foodSpawnRate: number, dispersion: number) {
  if (!patchesInitialized) initPatches();

  const toSpawn = Math.min(foodSpawnRate, FOOD_MAX - world.foodCount);
  if (toSpawn <= 0) return;

  // Drift patches each tick
  driftPatches();

  // Derive parameters from dispersion slider (0=tight, 1=uniform)
  const sigma = lerp(FOOD_SIGMA_MIN, FOOD_SIGMA_MAX, dispersion);
  const patchFraction = lerp(FOOD_PATCH_FRACTION_MIN, FOOD_PATCH_FRACTION_MAX, dispersion);
  const subOffsetScale = lerp(FOOD_SUB_OFFSET_SCALE_MIN, FOOD_SUB_OFFSET_SCALE_MAX, dispersion);

  const margin = BOUNDARY_PADDING + 50;
  const patchCount = Math.round(toSpawn * patchFraction);
  const uniformCount = toSpawn - patchCount;

  // Spawn food in patches via sub-hotspots
  for (let i = 0; i < patchCount; i++) {
    const patch = patches[i % FOOD_PATCH_COUNT];
    const sub = weightedPickSub(patch);

    // Sub-hotspot world position
    const sx = patch.x + Math.cos(sub.offsetAngle) * sub.offsetDist * subOffsetScale;
    const sy = patch.y + Math.sin(sub.offsetAngle) * sub.offsetDist * subOffsetScale;

    const sample = gaussianSample(sx, sy, sigma);
    if (!sample) continue;
    const fi = world.allocFood();
    if (fi < 0) break;
    world.foodX[fi] = sample[0];
    world.foodY[fi] = sample[1];
  }

  // Spawn uniform food
  for (let i = 0; i < uniformCount; i++) {
    const fi = world.allocFood();
    if (fi < 0) break;
    world.foodX[fi] = margin + Math.random() * (WORLD_SIZE - margin * 2);
    world.foodY[fi] = margin + Math.random() * (WORLD_SIZE - margin * 2);
  }
}
