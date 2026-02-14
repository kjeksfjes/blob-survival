import { Renderer } from './rendering/renderer';
import { SimulationLoop } from './simulation/simulation-loop';
import { spawnCreature } from './simulation/creature';
import { Hud } from './ui/hud';
import { DebugPanel } from './ui/debug-panel';
import { Legend } from './ui/legend';
import { plop, beow } from './audio/plop';
import {
  WORLD_SIZE, INITIAL_CREATURE_COUNT, FOOD_RADIUS,
  MAX_BLOBS, MAX_FOOD, RENDER_RADIUS_MULT, RENDER_RADIUS_BY_TYPE,
} from './constants';
import { BLOB_FLOATS, FOOD_FLOATS, BlobType } from './types';

async function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const noWebGpu = document.getElementById('no-webgpu') as HTMLElement;

  const renderer = new Renderer();
  const ok = await renderer.init(canvas);

  if (!ok) {
    noWebGpu.style.display = 'flex';
    return;
  }

  // Center camera on world
  // Camera internally uses physical pixels, so account for DPR in zoom calc
  const dpr = window.devicePixelRatio || 1;
  renderer.camera.centerOn(WORLD_SIZE / 2, WORLD_SIZE / 2);
  renderer.camera.zoom = Math.min(
    (canvas.clientWidth * dpr) / WORLD_SIZE,
    (canvas.clientHeight * dpr) / WORLD_SIZE,
  ) * 0.9;

  const sim = new SimulationLoop();
  const hudDisplay = new Hud();
  new DebugPanel(sim);
  const legend = new Legend();

  window.addEventListener('keydown', (e) => {
    if (e.key === 'l' || e.key === 'L') legend.toggle();
  });

  // Spawn initial creatures
  for (let i = 0; i < INITIAL_CREATURE_COUNT; i++) {
    const x = 200 + Math.random() * (WORLD_SIZE - 400);
    const y = 200 + Math.random() * (WORLD_SIZE - 400);
    spawnCreature(sim.world, x, y);
  }

  // Camera controls
  setupCameraControls(canvas, renderer);

  let prevBirths = sim.world.totalBirths;
  let prevDeaths = sim.world.totalDeaths;

  function frame() {
    hudDisplay.tick();
    renderer.resize(canvas);

    // Simulation step
    sim.step();

    // Sound effects (delay plop slightly when both happen so they don't overlap)
    const newDeaths = sim.world.totalDeaths > prevDeaths;
    const newBirths = sim.world.totalBirths > prevBirths;
    if (newDeaths) beow();
    if (newBirths) {
      if (newDeaths) setTimeout(plop, 150);
      else plop();
    }
    prevBirths = sim.world.totalBirths;
    prevDeaths = sim.world.totalDeaths;

    // Pack blob data for GPU
    packBlobsForGpu(sim, renderer);
    packFoodForGpu(sim, renderer);

    renderer.render();
    hudDisplay.update(sim.world, sim.speed);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function packBlobsForGpu(sim: SimulationLoop, renderer: Renderer) {
  const { buffers } = renderer;
  const w = sim.world;
  let count = 0;

  for (let i = 0; i < MAX_BLOBS; i++) {
    if (!w.blobAlive[i]) continue;

    const offset = count * BLOB_FLOATS;
    const type = w.blobType[i] as BlobType;

    buffers.blobData[offset + 0] = w.blobX[i];
    buffers.blobData[offset + 1] = w.blobY[i];
    // Render radius is larger than physics radius so energy fields overlap for metaball merging
    const typeMult = RENDER_RADIUS_BY_TYPE[type] ?? RENDER_RADIUS_MULT;
    buffers.blobData[offset + 2] = w.blobRadius[i] * typeMult;

    const ci = w.blobCreature[i];
    const genome = ci >= 0 ? w.creatureGenome[ci] : null;
    const baseHue = genome ? genome.baseHue : 0.5;

    const [r, g, b] = blobColor(baseHue, type);
    buffers.blobData[offset + 3] = r;
    buffers.blobData[offset + 4] = g;
    buffers.blobData[offset + 5] = b;
    buffers.blobData[offset + 6] = 1.0;
    buffers.blobData[offset + 7] = type as number;

    count++;
  }
  buffers.blobCount = count;
}

function packFoodForGpu(sim: SimulationLoop, renderer: Renderer) {
  const { buffers } = renderer;
  const w = sim.world;
  let count = 0;

  for (let i = 0; i < MAX_FOOD; i++) {
    if (!w.foodAlive[i]) continue;
    const offset = count * FOOD_FLOATS;
    buffers.foodData[offset + 0] = w.foodX[i];
    buffers.foodData[offset + 1] = w.foodY[i];
    buffers.foodData[offset + 2] = FOOD_RADIUS * RENDER_RADIUS_MULT;
    buffers.foodData[offset + 3] = 1.0;
    count++;
  }
  buffers.foodCount = count;
}

function blobColor(hue: number, type: BlobType): [number, number, number] {
  // Fixed-hue types: always the same color regardless of creature hue
  switch (type) {
    case BlobType.MOUTH:           return hslToRgb(0.07, 0.85, 0.50); // orange
    case BlobType.SHIELD:          return hslToRgb(0.58, 0.12, 0.35); // dark steel gray
    case BlobType.SENSOR:          return hslToRgb(0.15, 0.50, 0.80); // pale yellow
    case BlobType.WEAPON:          return hslToRgb(0.00, 0.90, 0.45); // red
    case BlobType.REPRODUCER:      return hslToRgb(0.88, 0.70, 0.60); // pink
    case BlobType.PHOTOSYNTHESIZER: return hslToRgb(0.33, 0.80, 0.55); // green
    case BlobType.ADHESION:        return hslToRgb(0.50, 0.60, 0.50); // teal/cyan
  }

  // Relative-hue types: tinted by creature's base hue
  switch (type) {
    case BlobType.CORE:  return hslToRgb(hue, 0.85, 0.70);
    case BlobType.MOTOR: return hslToRgb(hue, 0.35, 0.40);
    case BlobType.FAT:   return hslToRgb(hue, 0.15, 0.55);
    default:             return hslToRgb(hue, 0.70, 0.55);
  }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  const sector = Math.floor(h * 6);
  switch (sector % 6) {
    case 0: r = c; g = x; break;
    case 1: r = x; g = c; break;
    case 2: g = c; b = x; break;
    case 3: g = x; b = c; break;
    case 4: r = x; b = c; break;
    case 5: r = c; b = x; break;
  }
  return [r + m, g + m, b + m];
}

function setupCameraControls(canvas: HTMLCanvasElement, renderer: Renderer) {
  let isDragging = false;
  let lastMx = 0, lastMy = 0;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMx = e.clientX;
    lastMy = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    renderer.camera.pan(e.clientX - lastMx, e.clientY - lastMy);
    lastMx = e.clientX;
    lastMy = e.clientY;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    renderer.camera.zoomBy(factor, e.clientX, e.clientY);
  }, { passive: false });
}

main().catch(console.error);
