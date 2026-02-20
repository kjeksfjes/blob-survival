import { Renderer } from './rendering/renderer';
import { SimulationLoop } from './simulation/simulation-loop';
import { isCreatureActiveScout, isCreaturePackLeader } from './simulation/creature';
import { Hud } from './ui/hud';
import { DebugPanel, type SocialColorMode } from './ui/debug-panel';
import { Legend } from './ui/legend';
import { plop, beow } from './audio/plop';
import {
  WORLD_SIZE, FOOD_RADIUS,
  RENDER_RADIUS_MULT, RENDER_RADIUS_BY_TYPE, FOOD_STALE_TICKS, MEAT_STALE_TICKS,
  FOOD_GROWTH_MIN_MULT, FOOD_GROWTH_PEAK_MULT, FOOD_GROWTH_STALE_MULT, FOOD_GROWTH_PEAK_AGE_FRAC,
  FOOD_VISUAL_FADE_START_FRAC,
  BASE_BLOB_RADIUS, CARRIED_MEAT_RENDER_SCALE_MULT, CARRIED_MEAT_RENDER_BLOB_CAP,
  SCOUT_MARKER_RADIUS_MULT, SCOUT_MARKER_RADIUS_MIN,
} from './constants';
import { BLOB_FLOATS, FOOD_FLOATS, BlobType, FoodKind } from './types';

const enum ViewMode {
  NORMAL = 0,
  PACK = 1,
  CLAN = 2,
}

const FOOD_KIND_CARRIED_MEAT_MARKER = 2;
const FOOD_KIND_SCOUT_MARKER = 3;
const FOOD_KIND_LEADER_MARKER = 4;

type HoverHighlightContext = {
  isPaused: boolean;
  hoveredCreatureId: number;
  hoveredPackId: number;
};

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
  let viewMode: ViewMode = ViewMode.NORMAL;
  let paused = false;
  let hoverClientX = 0;
  let hoverClientY = 0;
  let hoverHasPointer = false;
  let hoverCreatureId = -1;
  let hoverPackId = -1;
  let isCanvasDragging = false;
  const debugPanel = new DebugPanel(sim, {
    getSocialColorMode: () => viewModeToSocialColorMode(viewMode),
    setSocialColorMode: (mode) => {
      viewMode = socialColorModeToViewMode(mode);
    },
  });
  const legend = new Legend();

  const setViewMode = (mode: ViewMode) => {
    if (viewMode === mode) return;
    viewMode = mode;
    debugPanel.setSocialColorMode(viewModeToSocialColorMode(viewMode));
  };

  const setPaused = (nextPaused: boolean) => {
    paused = nextPaused;
  };

  const clearHoverHighlight = () => {
    hoverCreatureId = -1;
    hoverPackId = -1;
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'l' || e.key === 'L') legend.toggle();
    if (e.key === 'h' || e.key === 'H') hudDisplay.toggleVerbose();
    const isPKey = e.key === 'p' || e.key === 'P';
    if (isPKey && e.shiftKey) setViewMode(viewMode === ViewMode.CLAN ? ViewMode.NORMAL : ViewMode.CLAN);
    else if (isPKey) setViewMode(viewMode === ViewMode.PACK ? ViewMode.NORMAL : ViewMode.PACK);
    if (e.code === 'Space') {
      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;
      if (isTypingTarget) return;
      e.preventDefault();
      setPaused(!paused);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    hoverClientX = e.clientX;
    hoverClientY = e.clientY;
    hoverHasPointer = true;
  });

  canvas.addEventListener('pointerleave', () => {
    hoverHasPointer = false;
    clearHoverHighlight();
  });

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    isCanvasDragging = true;
    hoverClientX = e.clientX;
    hoverClientY = e.clientY;
  });

  window.addEventListener('pointerup', () => {
    isCanvasDragging = false;
  });

  window.addEventListener('pointercancel', () => {
    isCanvasDragging = false;
  });

  // Camera controls
  setupCameraControls(canvas, renderer);

  let prevBirths = sim.world.totalBirths;
  let prevDeaths = sim.world.totalDeaths;

  function frame() {
    hudDisplay.tick();
    renderer.resize(canvas);

    // Simulation step
    if (!paused) sim.step();

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

    if (!paused || !hoverHasPointer || isCanvasDragging) {
      clearHoverHighlight();
    } else {
      hoverCreatureId = pickHoveredCreature(sim, renderer, canvas, hoverClientX, hoverClientY);
      hoverPackId = hoverCreatureId >= 0 ? sim.world.creaturePackId[hoverCreatureId] : -1;
    }
    const hoverHighlight: HoverHighlightContext = {
      isPaused: paused,
      hoveredCreatureId: hoverCreatureId,
      hoveredPackId: hoverPackId,
    };

    // Pack blob data for GPU
    const packStartMs = performance.now();
    packBlobsForGpu(sim, renderer, viewMode, hoverHighlight);
    packFoodForGpu(sim, renderer, hoverHighlight);
    const packMs = performance.now() - packStartMs;
    sim.world.perfMsRenderPack = sim.world.perfMsRenderPack > 0
      ? sim.world.perfMsRenderPack * 0.9 + packMs * 0.1
      : packMs;

    renderer.render();
    hudDisplay.update(sim.world, sim.speed, viewModeLabel(viewMode));

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function packBlobsForGpu(
  sim: SimulationLoop,
  renderer: Renderer,
  viewMode: ViewMode,
  highlight: HoverHighlightContext,
) {
  const { buffers } = renderer;
  const w = sim.world;
  let count = 0;
  for (let si = 0; si < w.blobCount; si++) {
    const i = w.activeBlobIds[si];

    const offset = count * BLOB_FLOATS;
    const type = w.blobType[i] as BlobType;

    buffers.blobData[offset + 0] = w.blobX[i];
    buffers.blobData[offset + 1] = w.blobY[i];
    // Render radius is larger than physics radius so energy fields overlap for metaball merging
    const typeMult = RENDER_RADIUS_BY_TYPE[type] ?? RENDER_RADIUS_MULT;
    buffers.blobData[offset + 2] = w.blobRadius[i] * typeMult;

    const ci = w.blobCreature[i];
    const [r, g, b] = blobColorForMode(w, ci, type, viewMode);
    let outR = r;
    let outG = g;
    let outB = b;
    let outA = 1.0;
    const hasPausedHover = highlight.isPaused && highlight.hoveredCreatureId >= 0;
    if (hasPausedHover && ci >= 0 && w.creatureAlive[ci]) {
      const isHoveredTarget = ci === highlight.hoveredCreatureId;
      const isHoveredPackmate = highlight.hoveredPackId >= 0 && w.creaturePackId[ci] === highlight.hoveredPackId;
      if (isHoveredTarget || isHoveredPackmate) {
        const whiteBlend = isHoveredTarget ? 0.96 : 0.78;
        outR = r + (1 - r) * whiteBlend;
        outG = g + (1 - g) * whiteBlend;
        outB = b + (1 - b) * whiteBlend;
        // Slight additive field boost reads as a soft glow after metaball threshold.
        outA = isHoveredTarget ? 1.22 : 1.10;
      } else {
        outA = 0;
      }
    } else if (hasPausedHover) {
      outA = 0;
    }
    buffers.blobData[offset + 3] = Math.min(1, outR);
    buffers.blobData[offset + 4] = Math.min(1, outG);
    buffers.blobData[offset + 5] = Math.min(1, outB);
    buffers.blobData[offset + 6] = outA;
    buffers.blobData[offset + 7] = type as number;

    count++;
  }
  buffers.blobCount = count;
}

function packFoodForGpu(
  sim: SimulationLoop,
  renderer: Renderer,
  highlight: HoverHighlightContext,
) {
  const { buffers } = renderer;
  if (highlight.isPaused && highlight.hoveredCreatureId >= 0) {
    buffers.foodCount = 0;
    return;
  }
  const w = sim.world;
  let count = 0;
  const maxInstances = Math.floor(buffers.foodData.length / FOOD_FLOATS);
  for (let si = 0; si < w.foodCount; si++) {
    if (count >= maxInstances) break;
    const i = w.activeFoodIds[si];
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

  // Render carried carcasses as attached meat blobs so predation outcomes are visible.
  let carriedRendered = 0;
  for (let ci = 0; ci < w.creatureAlive.length; ci++) {
    if (count >= maxInstances || carriedRendered >= CARRIED_MEAT_RENDER_BLOB_CAP) break;
    if (!w.creatureAlive[ci] || !w.creatureCarcassAlive[ci]) continue;
    const carcassCount = w.creatureCarcassBlobCount[ci];
    if (carcassCount <= 0) continue;
    const anchorBlob = w.creatureCarcassAnchorWeaponBlob[ci];
    if (anchorBlob < 0 || !w.blobAlive[anchorBlob]) continue;
    const ax = w.blobX[anchorBlob];
    const ay = w.blobY[anchorBlob];
    let carryOffsetX = 0;
    let carryOffsetY = 0;
    if (w.creatureBlobCount[ci] > 0) {
      const coreIdx = w.creatureBlobs[w.creatureBlobStart[ci]];
      const dirX = ax - w.blobX[coreIdx];
      const dirY = ay - w.blobY[coreIdx];
      const mag = Math.hypot(dirX, dirY);
      if (mag > 1e-6) {
        // Keep carried carcass visibly offset from predator body instead of fully overlapping it.
        const outward = 18;
        carryOffsetX = (dirX / mag) * outward;
        carryOffsetY = (dirY / mag) * outward;
      }
    }
    const carcassMaxAge = Math.max(1, w.creatureCarcassMaxAge[ci]);
    const carcassAgeNorm = Math.max(0, Math.min(1, w.creatureCarcassAge[ci] / carcassMaxAge));
    const alpha = 0.95 - carcassAgeNorm * 0.65;
    const base = ci * 12;
    for (let i = 0; i < carcassCount; i++) {
      if (count >= maxInstances || carriedRendered >= CARRIED_MEAT_RENDER_BLOB_CAP) break;
      const type = w.creatureCarcassBlobType[base + i] as BlobType;
      const size = w.creatureCarcassBlobSize[base + i];
      const offsetX = w.creatureCarcassBlobOffsetX[base + i];
      const offsetY = w.creatureCarcassBlobOffsetY[base + i];
      const typeMult = RENDER_RADIUS_BY_TYPE[type] ?? 1;
      const offset = count * FOOD_FLOATS;
      buffers.foodData[offset + 0] = ax + carryOffsetX + offsetX;
      buffers.foodData[offset + 1] = ay + carryOffsetY + offsetY;
      buffers.foodData[offset + 2] = BASE_BLOB_RADIUS * size * typeMult * CARRIED_MEAT_RENDER_SCALE_MULT;
      buffers.foodData[offset + 3] = Math.max(0.2, alpha);
      buffers.foodData[offset + 4] = FOOD_KIND_CARRIED_MEAT_MARKER; // carried meat (render-only kind for distinct styling)
      buffers.foodData[offset + 5] = carcassAgeNorm;
      count++;
      carriedRendered++;
    }
  }

  // Render scout/leader markers as optional non-food overlay instances (kind=3/4).
  if (sim.params.showRoleMarkers) {
    for (let ci = 0; ci < w.creatureAlive.length; ci++) {
      if (count >= maxInstances) break;
      if (!w.creatureAlive[ci]) continue;
      const coreIdx = w.creatureBlobs[w.creatureBlobStart[ci]];
      if (coreIdx < 0 || !w.blobAlive[coreIdx]) continue;
      const markerRadius = Math.max(SCOUT_MARKER_RADIUS_MIN, w.blobRadius[coreIdx] * SCOUT_MARKER_RADIUS_MULT);

      if (isCreatureActiveScout(ci)) {
        const offset = count * FOOD_FLOATS;
        buffers.foodData[offset + 0] = w.blobX[coreIdx];
        buffers.foodData[offset + 1] = w.blobY[coreIdx];
        buffers.foodData[offset + 2] = markerRadius;
        buffers.foodData[offset + 3] = 0.95;
        buffers.foodData[offset + 4] = FOOD_KIND_SCOUT_MARKER; // scout marker (render-only kind)
        buffers.foodData[offset + 5] = 0;
        count++;
        if (count >= maxInstances) break;
      }

      if (isCreaturePackLeader(ci)) {
        const offset = count * FOOD_FLOATS;
        buffers.foodData[offset + 0] = w.blobX[coreIdx];
        buffers.foodData[offset + 1] = w.blobY[coreIdx];
        buffers.foodData[offset + 2] = markerRadius;
        buffers.foodData[offset + 3] = 0.95;
        buffers.foodData[offset + 4] = FOOD_KIND_LEADER_MARKER; // leader marker (render-only kind)
        buffers.foodData[offset + 5] = 0;
        count++;
      }
    }
  }

  buffers.foodCount = count;
}

function pickHoveredCreature(
  sim: SimulationLoop,
  renderer: Renderer,
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): number {
  const rect = canvas.getBoundingClientRect();
  if (
    clientX < rect.left || clientX > rect.right ||
    clientY < rect.top || clientY > rect.bottom
  ) {
    return -1;
  }
  const dpr = window.devicePixelRatio || 1;
  const px = (clientX - rect.left) * dpr;
  const py = (clientY - rect.top) * dpr;
  const worldX = renderer.camera.x + (px - canvas.width / 2) / renderer.camera.zoom;
  const worldY = renderer.camera.y + (py - canvas.height / 2) / renderer.camera.zoom;
  const w = sim.world;
  let bestCreature = -1;
  let bestDistSq = Number.POSITIVE_INFINITY;
  const minPickRadius = 10 / renderer.camera.zoom;
  for (let si = 0; si < w.blobCount; si++) {
    const bi = w.activeBlobIds[si];
    if (!w.blobAlive[bi]) continue;
    const ci = w.blobCreature[bi];
    if (ci < 0 || !w.creatureAlive[ci]) continue;
    const type = w.blobType[bi] as BlobType;
    const typeMult = RENDER_RADIUS_BY_TYPE[type] ?? RENDER_RADIUS_MULT;
    const renderRadius = w.blobRadius[bi] * typeMult;
    const pickRadius = Math.max(renderRadius * 1.15, minPickRadius);
    const dx = worldX - w.blobX[bi];
    const dy = worldY - w.blobY[bi];
    const distSq = dx * dx + dy * dy;
    if (distSq > pickRadius * pickRadius) continue;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestCreature = ci;
    }
  }
  return bestCreature;
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

function socialColorModeToViewMode(mode: SocialColorMode): ViewMode {
  switch (mode) {
    case 'Pack': return ViewMode.PACK;
    case 'Clan': return ViewMode.CLAN;
    default: return ViewMode.NORMAL;
  }
}

function viewModeToSocialColorMode(mode: ViewMode): SocialColorMode {
  switch (mode) {
    case ViewMode.PACK: return 'Pack';
    case ViewMode.CLAN: return 'Clan';
    default: return 'Normal';
  }
}

function clanColor(clanId: number): [number, number, number] {
  if (clanId < 0) return [0.35, 0.38, 0.45];
  return socialColorFromId(clanId, 0.82);
}

function packColor(packId: number): [number, number, number] {
  if (packId < 0) return [0.35, 0.38, 0.45];
  return socialColorFromId(packId, 0.18);
}

function socialColorFromId(id: number, hueOffset: number): [number, number, number] {
  // Deterministic low-collision palette from integer IDs.
  const h = (hueOffset + id * 0.61803398875) % 1;
  const variant = id % 8;
  const sat = [0.74, 0.82, 0.88, 0.78, 0.86, 0.90, 0.80, 0.92][variant];
  const lit = [0.50, 0.58, 0.46, 0.62, 0.54, 0.48, 0.60, 0.52][variant];
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
