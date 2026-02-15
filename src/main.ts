import { Renderer } from './rendering/renderer';
import { SimulationLoop } from './simulation/simulation-loop';
import { spawnCreature } from './simulation/creature';
import { Hud } from './ui/hud';
import { DebugPanel } from './ui/debug-panel';
import { Legend } from './ui/legend';
import { plop, beow } from './audio/plop';
import {
  WORLD_SIZE, INITIAL_CREATURE_COUNT, FOOD_RADIUS,
  MAX_BLOBS, MAX_FOOD, RENDER_RADIUS_MULT, RENDER_RADIUS_BY_TYPE, FOOD_STALE_TICKS, MEAT_STALE_TICKS,
  FOOD_GROWTH_MIN_MULT, FOOD_GROWTH_PEAK_MULT, FOOD_GROWTH_STALE_MULT, FOOD_GROWTH_PEAK_AGE_FRAC,
  FOOD_VISUAL_FADE_START_FRAC,
} from './constants';
import { BLOB_FLOATS, FOOD_FLOATS, BlobType, FoodKind } from './types';

const enum ViewMode {
  NORMAL = 0,
  PACK = 1,
  CLAN = 2,
}

const packColorSlotById = new Map<number, number>();
let nextPackColorSlot = 0;

async function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const noWebGpu = document.getElementById('no-webgpu') as HTMLElement;
  const modeOverlay = document.getElementById('mode-overlay') as HTMLElement;

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
  let viewMode: ViewMode = ViewMode.NORMAL;

  window.addEventListener('keydown', (e) => {
    if (e.key === 'l' || e.key === 'L') legend.toggle();
    if (e.key === 'h' || e.key === 'H') hudDisplay.toggleVerbose();
    if (e.key === 'v' || e.key === 'V') {
      viewMode = ((viewMode + 1) % 3) as ViewMode;
      flashModeOverlay(modeOverlay, viewMode);
    }
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
    packBlobsForGpu(sim, renderer, viewMode);
    packFoodForGpu(sim, renderer);

    renderer.render();
    hudDisplay.update(sim.world, sim.speed, viewModeLabel(viewMode));

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function packBlobsForGpu(sim: SimulationLoop, renderer: Renderer, viewMode: ViewMode) {
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
    const [r, g, b] = blobColorForMode(w, ci, type, viewMode);
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
    const kind = w.foodKind[i] as FoodKind;
    const age = w.foodAge[i];
    const maxAge = w.foodMaxAge[i] > 0
      ? w.foodMaxAge[i]
      : (kind === FoodKind.MEAT ? MEAT_STALE_TICKS : FOOD_STALE_TICKS);
    const ageNorm = maxAge > 0 ? Math.max(0, Math.min(1, age / maxAge)) : 0;
    let visualGrowth = 1.0;
    if (kind === FoodKind.PLANT) {
      const peakFrac = Math.max(0.05, Math.min(0.95, FOOD_GROWTH_PEAK_AGE_FRAC));
      let growthMult = 1.0;
      if (ageNorm <= peakFrac) {
        const t = ageNorm / peakFrac;
        growthMult = FOOD_GROWTH_MIN_MULT + (FOOD_GROWTH_PEAK_MULT - FOOD_GROWTH_MIN_MULT) * t;
      } else {
        // Visuals: keep peak size in stale phase; stale is communicated via alpha fade.
        growthMult = FOOD_GROWTH_PEAK_MULT;
      }
      visualGrowth = Math.max(0.75, Math.min(1.15, growthMult));
    }
    const radiusScale = Math.max(0.1, w.foodRadiusScale[i] || 1);

    buffers.foodData[offset + 0] = w.foodX[i];
    buffers.foodData[offset + 1] = w.foodY[i];
    buffers.foodData[offset + 2] = FOOD_RADIUS * RENDER_RADIUS_MULT * visualGrowth * radiusScale;
    const fadeStart = Math.floor(maxAge * FOOD_VISUAL_FADE_START_FRAC);
    const fadeSpan = Math.max(1, maxAge - fadeStart);
    let alpha = 1.0;
    if (age > fadeStart) {
      const t = Math.min(1, (age - fadeStart) / fadeSpan);
      // Smooth fade in the last stale quarter of lifespan.
      alpha = 1 - (t * t * (3 - 2 * t));
    }
    buffers.foodData[offset + 3] = alpha;
    buffers.foodData[offset + 4] = kind;
    buffers.foodData[offset + 5] = ageNorm;
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

function blobColorForMode(world: SimulationLoop['world'], creatureId: number, type: BlobType, mode: ViewMode): [number, number, number] {
  if (creatureId < 0 || !world.creatureAlive[creatureId]) {
    return blobColor(0.5, type);
  }
  const clanId = world.creatureClanId[creatureId];
  const packId = world.creaturePackId[creatureId];
  if (mode === ViewMode.CLAN) return clanColor(clanId);
  if (mode === ViewMode.PACK) return packColor(packId);
  const genome = world.creatureGenome[creatureId];
  const baseHue = genome ? genome.baseHue : 0.5;
  return blobColor(baseHue, type);
}

function viewModeLabel(mode: ViewMode): string {
  switch (mode) {
    case ViewMode.PACK: return 'Pack';
    case ViewMode.CLAN: return 'Clan';
    default: return 'Normal';
  }
}

function flashModeOverlay(el: HTMLElement, mode: ViewMode): void {
  if (mode === ViewMode.NORMAL) return;
  el.textContent = mode === ViewMode.PACK ? 'PACK MODE' : 'CLAN MODE';
  el.classList.remove('show');
  // Restart the CSS transition on rapid toggles.
  void el.offsetWidth;
  el.classList.add('show');
  window.setTimeout(() => {
    el.classList.remove('show');
  }, 1260);
}

function hash01(value: number): number {
  const x = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function clanColor(clanId: number): [number, number, number] {
  if (clanId < 0) return [0.35, 0.38, 0.45];
  const h = hash01(clanId * 17 + 101);
  return hslToRgb(h, 0.56, 0.54);
}

function packColor(packId: number): [number, number, number] {
  if (packId < 0) return [0.35, 0.38, 0.45];
  let slot = packColorSlotById.get(packId);
  if (slot === undefined) {
    slot = nextPackColorSlot++;
    packColorSlotById.set(packId, slot);
  }
  // Strictly distinct slot progression for packs; stable per packId.
  const h = (slot * 0.61803398875) % 1;
  const v = slot % 8;
  const sat = [0.72, 0.80, 0.86, 0.76, 0.84, 0.90, 0.78, 0.88][v];
  const lit = [0.50, 0.58, 0.46, 0.62, 0.54, 0.48, 0.60, 0.52][v];
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
