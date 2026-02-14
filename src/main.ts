import { Renderer } from './rendering/renderer';
import { SimulationLoop } from './simulation/simulation-loop';
import { spawnCreature } from './simulation/creature';
import { Hud } from './ui/hud';
import { DebugPanel } from './ui/debug-panel';
import {
  WORLD_SIZE, INITIAL_CREATURE_COUNT, FOOD_RADIUS,
  MAX_BLOBS, MAX_FOOD, RENDER_RADIUS_MULT,
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

  // Spawn initial creatures
  for (let i = 0; i < INITIAL_CREATURE_COUNT; i++) {
    const x = 200 + Math.random() * (WORLD_SIZE - 400);
    const y = 200 + Math.random() * (WORLD_SIZE - 400);
    spawnCreature(sim.world, x, y);
  }

  // Camera controls
  setupCameraControls(canvas, renderer);

  function frame() {
    hudDisplay.tick();
    renderer.resize(canvas);

    // Simulation step
    sim.step();

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
    buffers.blobData[offset + 0] = w.blobX[i];
    buffers.blobData[offset + 1] = w.blobY[i];
    // Render radius is larger than physics radius so energy fields overlap for metaball merging
    buffers.blobData[offset + 2] = w.blobRadius[i] * RENDER_RADIUS_MULT;

    const ci = w.blobCreature[i];
    const genome = ci >= 0 ? w.creatureGenome[ci] : null;
    const baseHue = genome ? genome.baseHue : 0.5;
    const type = w.blobType[i] as BlobType;

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
  let sat = 0.7, lit = 0.55;
  let hueShift = 0;

  switch (type) {
    case BlobType.CORE:
      lit = 0.7; sat = 0.8; break;
    case BlobType.MOUTH:
      lit = 0.4; sat = 0.5; break;
    case BlobType.SHIELD:
      lit = 0.35; sat = 0.3; break;
    case BlobType.SENSOR:
      lit = 0.75; sat = 0.9; break;
    case BlobType.WEAPON:
      hueShift = 0.05; lit = 0.6; sat = 0.9; break;
    case BlobType.REPRODUCER:
      hueShift = -0.05; lit = 0.6; sat = 0.6; break;
    case BlobType.MOTOR:
      lit = 0.5; sat = 0.5; break;
    case BlobType.FAT:
      lit = 0.5; sat = 0.3; break;
    case BlobType.PHOTOSYNTHESIZER:
      return hslToRgb(0.33, 0.7, 0.5);
    case BlobType.ADHESION:
      lit = 0.55; sat = 0.4; break;
  }

  let h = hue + hueShift;
  if (h < 0) h += 1;
  if (h > 1) h -= 1;
  return hslToRgb(h, sat, lit);
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
