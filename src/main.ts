import { Renderer } from './rendering/renderer';
import { SimulationLoop } from './simulation/simulation-loop';
import { getCreatureRuntimeDebugSnapshot, isCreatureActiveScout, isCreaturePackLeader } from './simulation/creature';
import {
  CREATURE_DEATH_CAUSE_AGE,
  CREATURE_DEATH_CAUSE_KILLED,
  CREATURE_DEATH_CAUSE_STARVATION,
} from './simulation/world';
import { Hud } from './ui/hud';
import { DebugPanel, type SocialColorMode } from './ui/debug-panel';
import { Legend } from './ui/legend';
import { Inspector, type CreatureInspectorPayload } from './ui/inspector';
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
const SOUND_ENABLED_STORAGE_KEY = 'evolution01.soundEnabled';
const REGROUP_DEBUG_NONE = 0;
const REGROUP_DEBUG_ANCHOR = 1;
const REGROUP_DEBUG_LEADER = 2;
const REGROUP_DEBUG_REJOIN = 3;
const REGROUP_OVERLAY_MAX_LINES = 1200;
const POINTER_CLICK_DRAG_THRESHOLD_SQ = 36;
const INSPECT_MEAT_VISIBILITY_RADIUS = 120;
const BLOB_TYPE_LABELS: Record<number, string> = {
  [BlobType.CORE]: 'Core',
  [BlobType.MOUTH]: 'Mouth',
  [BlobType.SHIELD]: 'Shield',
  [BlobType.SENSOR]: 'Sensor',
  [BlobType.WEAPON]: 'Weapon',
  [BlobType.REPRODUCER]: 'Reproducer',
  [BlobType.MOTOR]: 'Motor',
  [BlobType.FAT]: 'Fat',
  [BlobType.PHOTOSYNTHESIZER]: 'Photo',
  [BlobType.ADHESION]: 'Adhesion',
};

type HoverHighlightContext = {
  isPaused: boolean;
  hoveredCreatureId: number;
  hoveredPackId: number;
  lockedCreatureId: number;
  inspectedSourceCreatureIds: Set<number> | null;
  latchedCreatureIds: Set<number> | null;
};

type InspectedDeathInfo = {
  creatureId: number;
  packId: number | null;
  lineageId: number | null;
  causeLabel: string;
  deathTick: number;
  killerId: number | null;
  lastWords: string | null;
  x: number;
  y: number;
};

async function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const overlayCanvas = document.getElementById('debug-overlay') as HTMLCanvasElement;
  const overlayCtx = overlayCanvas.getContext('2d');
  const noWebGpu = document.getElementById('no-webgpu') as HTMLElement;
  if (!overlayCtx) throw new Error('2D overlay context unavailable');
  const overlayContext = overlayCtx;

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
  let soundEnabled = loadSoundEnabled();
  let hoverClientX = 0;
  let hoverClientY = 0;
  let hoverHasPointer = false;
  let hoverCreatureId = -1;
  let lockedCreatureId = -1;
  let lockedCreatureGeneration = -1;
  let lockedKnownPackId: number | null = null;
  let lockedKnownLineageId: number | null = null;
  let isCanvasDragging = false;
  let pointerDownX = 0;
  let pointerDownY = 0;
  let suppressLockClick = false;
  let inspectorDismissed = false;
  let inspectedDeath: InspectedDeathInfo | null = null;
  const inspector = new Inspector({
    onClose: () => {
      if (paused) {
        // In paused mode, close should fall back to minimized hint state, not fully hide inspector.
        inspectorDismissed = false;
        hoverHasPointer = false;
      } else {
        inspectorDismissed = true;
      }
      lockedCreatureId = -1;
      lockedCreatureGeneration = -1;
      lockedKnownPackId = null;
      lockedKnownLineageId = null;
      inspectedDeath = null;
      clearHoverHighlight();
    },
  });
  const debugPanel = new DebugPanel(sim, {
    getSocialColorMode: () => viewModeToSocialColorMode(viewMode),
    setSocialColorMode: (mode) => {
      viewMode = socialColorModeToViewMode(mode);
    },
    getSoundEnabled: () => soundEnabled,
    setSoundEnabled: (enabled) => {
      soundEnabled = enabled;
      saveSoundEnabled(enabled);
    },
  });
  const legend = new Legend();

  const setViewMode = (mode: ViewMode) => {
    if (viewMode === mode) return;
    viewMode = mode;
    debugPanel.setSocialColorMode(viewModeToSocialColorMode(viewMode));
  };

  const setPaused = (nextPaused: boolean) => {
    if (!paused && nextPaused) inspectorDismissed = false;
    paused = nextPaused;
  };

  const clearHoverHighlight = () => {
    hoverCreatureId = -1;
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
    if (isCanvasDragging) {
      const dx = e.clientX - pointerDownX;
      const dy = e.clientY - pointerDownY;
      if (dx * dx + dy * dy >= POINTER_CLICK_DRAG_THRESHOLD_SQ) suppressLockClick = true;
    }
  });

  canvas.addEventListener('pointerleave', () => {
    hoverHasPointer = false;
    clearHoverHighlight();
  });

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    isCanvasDragging = true;
    pointerDownX = e.clientX;
    pointerDownY = e.clientY;
    suppressLockClick = false;
    hoverClientX = e.clientX;
    hoverClientY = e.clientY;
  });

  canvas.addEventListener('click', (e) => {
    if (!paused) return;
    if (suppressLockClick) {
      suppressLockClick = false;
      return;
    }
    const picked = pickHoveredCreature(sim, renderer, canvas, e.clientX, e.clientY);
    if (inspectedDeath) {
      if (picked < 0) return;
      inspectedDeath = null;
    }
    if (picked < 0) {
      lockedCreatureId = -1;
      lockedCreatureGeneration = -1;
      lockedKnownPackId = null;
      lockedKnownLineageId = null;
      return;
    }
    inspectorDismissed = false;
    inspectedDeath = null;
    if (lockedCreatureId === picked) {
      lockedCreatureId = -1;
      lockedCreatureGeneration = -1;
      lockedKnownPackId = null;
      lockedKnownLineageId = null;
    } else {
      lockedCreatureId = picked;
      lockedCreatureGeneration = sim.world.creatureGeneration[picked];
      lockedKnownPackId = sim.world.creaturePackId[picked] >= 0 ? sim.world.creaturePackId[picked] : null;
      lockedKnownLineageId = sim.world.creatureClanId[picked] >= 0 ? sim.world.creatureClanId[picked] : null;
    }
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
    resizeOverlayCanvas(canvas, overlayCanvas);

    // Simulation step
    if (!paused) sim.step();

    // Sound effects (delay plop slightly when both happen so they don't overlap)
    const newDeaths = sim.world.totalDeaths > prevDeaths;
    const newBirths = sim.world.totalBirths > prevBirths;
    if (soundEnabled) {
      if (newDeaths) beow();
      if (newBirths) {
        if (newDeaths) setTimeout(plop, 150);
        else plop();
      }
    }
    prevBirths = sim.world.totalBirths;
    prevDeaths = sim.world.totalDeaths;

    if (!paused || !hoverHasPointer || isCanvasDragging) {
      clearHoverHighlight();
    } else {
      hoverCreatureId = pickHoveredCreature(sim, renderer, canvas, hoverClientX, hoverClientY);
    }
    updateCanvasCursor(canvas, paused, isCanvasDragging, hoverCreatureId);

    if (lockedCreatureId >= 0) {
      const alive = sim.world.creatureAlive[lockedCreatureId] === 1;
      const sameGeneration = sim.world.creatureGeneration[lockedCreatureId] === lockedCreatureGeneration;
      if (alive && sameGeneration) {
        lockedKnownPackId = sim.world.creaturePackId[lockedCreatureId] >= 0 ? sim.world.creaturePackId[lockedCreatureId] : null;
        lockedKnownLineageId = sim.world.creatureClanId[lockedCreatureId] >= 0 ? sim.world.creatureClanId[lockedCreatureId] : null;
      } else {
        if (!inspectedDeath) {
          inspectedDeath = buildInspectedDeathInfo(
            sim,
            lockedCreatureId,
            lockedKnownPackId,
            lockedKnownLineageId,
            inspector.getLastThoughtForCreature(lockedCreatureId),
          );
        }
        lockedCreatureId = -1;
        lockedCreatureGeneration = -1;
      }
    }
    const effectiveCreatureId = lockedCreatureId >= 0
      ? lockedCreatureId
      : (paused ? hoverCreatureId : -1);
    const suppressHoverInspection = inspectedDeath !== null && lockedCreatureId < 0;
    const effectiveCreatureIdForUi = suppressHoverInspection ? -1 : effectiveCreatureId;
    const effectivePackIdForUi = effectiveCreatureIdForUi >= 0 ? sim.world.creaturePackId[effectiveCreatureIdForUi] : -1;
    const inspectedSourceCreatureIds = (paused && effectiveCreatureIdForUi >= 0)
      ? collectInspectionSourceCreatures(sim.world, effectiveCreatureIdForUi, effectivePackIdForUi)
      : null;
    const latchedCreatureIds = (paused && inspectedSourceCreatureIds)
      ? collectLatchedCounterpartCreatures(sim.world, inspectedSourceCreatureIds)
      : null;
    const hoverHighlight: HoverHighlightContext = {
      isPaused: paused,
      hoveredCreatureId: effectiveCreatureIdForUi,
      hoveredPackId: effectivePackIdForUi,
      lockedCreatureId,
      inspectedSourceCreatureIds,
      latchedCreatureIds,
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
    renderRegroupOverlay(sim, renderer, overlayCanvas, overlayContext, paused, effectivePackIdForUi);
    if (inspectedDeath && !inspectorDismissed) {
      renderInspectedDeathMarker(renderer, overlayCanvas, overlayContext, inspectedDeath);
    }
    const inspectorPayload = effectiveCreatureIdForUi >= 0
      ? buildCreatureInspectorPayload(sim, effectiveCreatureIdForUi, lockedCreatureId >= 0 && effectiveCreatureIdForUi === lockedCreatureId)
      : null;
    inspector.update({
      visible: !inspectorDismissed && (paused || lockedCreatureId >= 0 || inspectedDeath !== null),
      paused,
      payload: inspectorPayload,
      deceased: inspectedDeath ? {
        creatureId: inspectedDeath.creatureId,
        packId: inspectedDeath.packId,
        lineageId: inspectedDeath.lineageId,
        causeLabel: inspectedDeath.causeLabel,
        deathTick: inspectedDeath.deathTick,
        killerId: inspectedDeath.killerId,
        lastWords: inspectedDeath.lastWords,
      } : null,
    });
    hudDisplay.update(sim.world, sim.speed, viewModeLabel(viewMode));

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function updateCanvasCursor(
  canvas: HTMLCanvasElement,
  paused: boolean,
  isDragging: boolean,
  hoveredCreatureId: number,
): void {
  const nextCursor =
    isDragging ? 'grabbing'
      : (paused && hoveredCreatureId >= 0) ? 'pointer'
        : 'default';
  if (canvas.style.cursor !== nextCursor) canvas.style.cursor = nextCursor;
}

function resizeOverlayCanvas(baseCanvas: HTMLCanvasElement, overlayCanvas: HTMLCanvasElement): void {
  if (overlayCanvas.width !== baseCanvas.width || overlayCanvas.height !== baseCanvas.height) {
    overlayCanvas.width = baseCanvas.width;
    overlayCanvas.height = baseCanvas.height;
  }
}

function renderRegroupOverlay(
  sim: SimulationLoop,
  renderer: Renderer,
  overlayCanvas: HTMLCanvasElement,
  overlayCtx: CanvasRenderingContext2D,
  paused: boolean,
  hoveredPackId: number,
): void {
  const showOverlay = sim.params.regroupOverlayEnabled && (paused || sim.params.regroupOverlayLive);
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  if (!showOverlay) return;

  const pausedHoverPackOnly = paused && hoveredPackId >= 0;

  const w = sim.world;
  const cam = renderer.camera;
  const zoom = cam.zoom;
  const cx = cam.x;
  const cy = cam.y;
  const halfW = overlayCanvas.width * 0.5;
  const halfH = overlayCanvas.height * 0.5;
  const dpr = window.devicePixelRatio || 1;

  const toScreenX = (wx: number): number => (wx - cx) * zoom + halfW;
  const toScreenY = (wy: number): number => (wy - cy) * zoom + halfH;
  const inBounds = (sx: number, sy: number): boolean =>
    sx >= -16 && sx <= overlayCanvas.width + 16 && sy >= -16 && sy <= overlayCanvas.height + 16;

  let lineCount = 0;
  for (let ci = 0; ci < w.creatureAlive.length; ci++) {
    if (lineCount >= REGROUP_OVERLAY_MAX_LINES) break;
    if (!w.creatureAlive[ci]) continue;

    const packId = w.creaturePackId[ci];
    if (packId < 0) continue;
    if (pausedHoverPackOnly && packId !== hoveredPackId) continue;

    const scope = sim.params.regroupOverlayScope;
    if (scope === 'urgent' && w.creatureRegroupDebugUrgent[ci] === 0) continue;
    if (scope === 'isolated' && w.creatureRegroupDebugIsolated[ci] === 0) continue;
    if (w.creatureRegroupDebugActive[ci] === 0) continue;

    const source = w.creatureRegroupDebugSource[ci];
    if (source === REGROUP_DEBUG_NONE) continue;

    const start = w.creatureBlobStart[ci];
    if (start < 0 || start >= w.creatureBlobs.length) continue;
    const coreIdx = w.creatureBlobs[start];
    if (coreIdx < 0 || !w.blobAlive[coreIdx]) continue;

    const fromX = toScreenX(w.blobX[coreIdx]);
    const fromY = toScreenY(w.blobY[coreIdx]);
    const toX = toScreenX(w.creatureRegroupDebugTargetX[ci]);
    const toY = toScreenY(w.creatureRegroupDebugTargetY[ci]);
    if (!inBounds(fromX, fromY) && !inBounds(toX, toY)) continue;

    let r = 1.0;
    let g = 0.62;
    let b = 0.16;
    if (source === REGROUP_DEBUG_LEADER) {
      r = 0.20;
      g = 0.90;
      b = 1.00;
    } else if (source === REGROUP_DEBUG_REJOIN) {
      r = 0.65;
      g = 1.00;
      b = 0.20;
    }
    const urgent = w.creatureRegroupDebugUrgent[ci] === 1;
    const alpha = urgent ? 0.94 : 0.70;
    const lineWidth = (urgent ? 2.2 : 1.5) * dpr;
    const dotRadius = (urgent ? 2.6 : 2.0) * dpr;
    const color = `rgba(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)}, ${alpha})`;

    overlayCtx.strokeStyle = color;
    overlayCtx.lineWidth = lineWidth;
    overlayCtx.beginPath();
    overlayCtx.moveTo(fromX, fromY);
    overlayCtx.lineTo(toX, toY);
    overlayCtx.stroke();

    overlayCtx.fillStyle = color;
    overlayCtx.beginPath();
    overlayCtx.arc(toX, toY, dotRadius, 0, Math.PI * 2);
    overlayCtx.fill();

    lineCount++;
  }
}

function buildInspectedDeathInfo(
  sim: SimulationLoop,
  creatureId: number,
  fallbackPackId: number | null,
  fallbackLineageId: number | null,
  lastWords: string | null,
): InspectedDeathInfo {
  const world = sim.world;
  const deathCause = world.creatureLastDeathCause[creatureId];
  const killerId = world.creatureLastDeathKillerId[creatureId];
  let causeLabel = 'Unknown';
  if (deathCause === CREATURE_DEATH_CAUSE_AGE) causeLabel = 'Old age';
  else if (deathCause === CREATURE_DEATH_CAUSE_STARVATION) causeLabel = 'Starvation';
  else if (deathCause === CREATURE_DEATH_CAUSE_KILLED) {
    causeLabel = killerId >= 0 ? `Killed by Creature ${killerId}` : 'Killed';
  }

  return {
    creatureId,
    packId: fallbackPackId,
    lineageId: fallbackLineageId,
    causeLabel,
    deathTick: world.creatureLastDeathTick[creatureId] >= 0 ? world.creatureLastDeathTick[creatureId] : world.tick,
    killerId: killerId >= 0 ? killerId : null,
    lastWords,
    x: world.creatureLastDeathX[creatureId],
    y: world.creatureLastDeathY[creatureId],
  };
}

function renderInspectedDeathMarker(
  renderer: Renderer,
  overlayCanvas: HTMLCanvasElement,
  overlayCtx: CanvasRenderingContext2D,
  death: InspectedDeathInfo,
): void {
  const cam = renderer.camera;
  const sx = (death.x - cam.x) * cam.zoom + overlayCanvas.width * 0.5;
  const sy = (death.y - cam.y) * cam.zoom + overlayCanvas.height * 0.5;
  const size = Math.max(10, 18 * cam.zoom);
  const half = size * 0.5;
  const stroke = Math.max(2, Math.min(5, size * 0.18));
  overlayCtx.save();
  overlayCtx.globalCompositeOperation = 'source-over';
  overlayCtx.strokeStyle = 'rgba(255, 199, 31, 0.98)';
  overlayCtx.lineWidth = stroke;
  overlayCtx.lineCap = 'round';
  overlayCtx.shadowBlur = 12;
  overlayCtx.shadowColor = 'rgba(255, 199, 31, 0.78)';
  overlayCtx.beginPath();
  overlayCtx.moveTo(sx - half, sy - half);
  overlayCtx.lineTo(sx + half, sy + half);
  overlayCtx.moveTo(sx + half, sy - half);
  overlayCtx.lineTo(sx - half, sy + half);
  overlayCtx.stroke();
  overlayCtx.restore();
}

function collectInspectionSourceCreatures(
  world: SimulationLoop['world'],
  inspectedCreatureId: number,
  inspectedPackId: number,
): Set<number> | null {
  if (inspectedCreatureId < 0 || !world.creatureAlive[inspectedCreatureId]) return null;
  const out = new Set<number>();
  if (inspectedPackId < 0) {
    out.add(inspectedCreatureId);
    return out;
  }
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    if (world.creaturePackId[ci] !== inspectedPackId) continue;
    out.add(ci);
  }
  if (!out.has(inspectedCreatureId)) out.add(inspectedCreatureId);
  return out;
}

function collectLatchedCounterpartCreatures(
  world: SimulationLoop['world'],
  sourceCreatureIds: Set<number>,
): Set<number> | null {
  const out = new Set<number>();
  for (let li = 0; li < world.latchCount; li++) {
    const weaponCreature = world.latchWeaponCreature[li];
    const targetCreature = world.latchTargetCreature[li];
    const sourceHasWeapon = sourceCreatureIds.has(weaponCreature);
    const sourceHasTarget = sourceCreatureIds.has(targetCreature);
    if (sourceHasWeapon && !sourceHasTarget && targetCreature >= 0 && world.creatureAlive[targetCreature]) out.add(targetCreature);
    else if (sourceHasTarget && !sourceHasWeapon && weaponCreature >= 0 && world.creatureAlive[weaponCreature]) out.add(weaponCreature);
  }
  return out.size > 0 ? out : null;
}

type InspectorPackStats = {
  size: number;
  sumX: number;
  sumY: number;
  leaderId: number | null;
  scoutId: number | null;
  predatorCount: number;
  energyFracSum: number;
  sizeScaleSum: number;
};

function buildCreatureInspectorPayload(
  sim: SimulationLoop,
  creatureId: number,
  locked: boolean,
): CreatureInspectorPayload | null {
  const world = sim.world;
  if (creatureId < 0 || creatureId >= world.creatureAlive.length) return null;
  if (!world.creatureAlive[creatureId]) return null;

  const runtime = getCreatureRuntimeDebugSnapshot(world, creatureId);
  if (!runtime) return null;

  const packStats = new Map<number, InspectorPackStats>();
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    const packId = world.creaturePackId[ci];
    if (packId < 0) continue;
    let stats = packStats.get(packId);
    if (!stats) {
      stats = {
        size: 0,
        sumX: 0,
        sumY: 0,
        leaderId: null,
        scoutId: null,
        predatorCount: 0,
        energyFracSum: 0,
        sizeScaleSum: 0,
      };
      packStats.set(packId, stats);
    }
    const coreIdx = world.creatureBlobs[world.creatureBlobStart[ci]];
    if (coreIdx >= 0 && world.blobAlive[coreIdx]) {
      stats.sumX += world.blobX[coreIdx];
      stats.sumY += world.blobY[coreIdx];
    }
    stats.size++;
    const ciMaxEnergy = Math.max(1, world.creatureMaxEnergy[ci]);
    stats.energyFracSum += world.creatureEnergy[ci] / ciMaxEnergy;
    stats.sizeScaleSum += world.creatureSizeScale[ci];
    const ciRuntime = getCreatureRuntimeDebugSnapshot(world, ci);
    if (ciRuntime?.hasWeapon) stats.predatorCount++;
    if (stats.leaderId === null && isCreaturePackLeader(world, ci)) stats.leaderId = ci;
    if (stats.scoutId === null && isCreatureActiveScout(world, ci)) stats.scoutId = ci;
  }

  const coreIdx = world.creatureBlobs[world.creatureBlobStart[creatureId]];
  if (coreIdx < 0 || !world.blobAlive[coreIdx]) return null;
  const cx = world.blobX[coreIdx];
  const cy = world.blobY[coreIdx];

  const rawPackId = world.creaturePackId[creatureId];
  const selfPackStats = rawPackId >= 0 ? packStats.get(rawPackId) : undefined;
  const validPack = !!selfPackStats && selfPackStats.size >= 2;

  let anchorDistance: number | null = null;
  let leaderId: number | null = null;
  let scoutId: number | null = null;
  let packMembership = 'Solo';
  let packSize = 0;
  let packPredatorCount = 0;
  let packAvgEnergyFrac: number | null = null;
  let packAvgSizeScale: number | null = null;
  if (validPack && selfPackStats) {
    const anchorX = selfPackStats.sumX / Math.max(1, selfPackStats.size);
    const anchorY = selfPackStats.sumY / Math.max(1, selfPackStats.size);
    anchorDistance = Math.hypot(anchorX - cx, anchorY - cy);
    leaderId = selfPackStats.leaderId;
    scoutId = selfPackStats.scoutId;
    packMembership = 'Valid (>=2)';
    packSize = selfPackStats.size;
    packPredatorCount = selfPackStats.predatorCount;
    packAvgEnergyFrac = selfPackStats.energyFracSum / Math.max(1, selfPackStats.size);
    packAvgSizeScale = selfPackStats.sizeScaleSum / Math.max(1, selfPackStats.size);
  } else if (selfPackStats) {
    packMembership = 'Singleton';
    packSize = selfPackStats.size;
    packPredatorCount = selfPackStats.predatorCount;
    packAvgEnergyFrac = selfPackStats.energyFracSum / Math.max(1, selfPackStats.size);
    packAvgSizeScale = selfPackStats.sizeScaleSum / Math.max(1, selfPackStats.size);
    leaderId = selfPackStats.leaderId;
    scoutId = selfPackStats.scoutId;
  }

  const blobStart = world.creatureBlobStart[creatureId];
  const blobCount = world.creatureBlobCount[creatureId];
  const typeCounts = new Map<number, number>();
  for (let i = 0; i < blobCount; i++) {
    const bi = world.creatureBlobs[blobStart + i];
    if (bi < 0 || !world.blobAlive[bi]) continue;
    const type = world.blobType[bi] as BlobType;
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }
  const blobCounts = Array.from(typeCounts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([type, count]) => ({ label: BLOB_TYPE_LABELS[type] ?? `Type ${type}`, count }))
    .filter((entry) => entry.count > 0);

  let activeLatchCount = 0;
  for (let li = 0; li < world.latchCount; li++) {
    if (
      world.latchWeaponCreature[li] === creatureId ||
      world.latchTargetCreature[li] === creatureId
    ) {
      activeLatchCount++;
    }
  }

  const regroupSource =
    world.creatureRegroupDebugSource[creatureId] === REGROUP_DEBUG_ANCHOR ? 'Anchor'
      : world.creatureRegroupDebugSource[creatureId] === REGROUP_DEBUG_LEADER ? 'Leader'
        : world.creatureRegroupDebugSource[creatureId] === REGROUP_DEBUG_REJOIN ? 'Rejoin'
          : 'None';
  let regroupTargetDistance: number | null = null;
  if (world.creatureRegroupDebugActive[creatureId] === 1) {
    const tx = world.creatureRegroupDebugTargetX[creatureId];
    const ty = world.creatureRegroupDebugTargetY[creatureId];
    regroupTargetDistance = Math.hypot(tx - cx, ty - cy);
  }

  const energy = world.creatureEnergy[creatureId];
  const maxEnergy = Math.max(1, world.creatureMaxEnergy[creatureId]);
  const energyFrac = energy / maxEnergy;
  const age = world.creatureAge[creatureId];
  const maxAge = Math.max(1, world.creatureMaxAge[creatureId]);
  const maxCarcassEnergy = Math.max(0, world.creatureCarcassMaxEnergy[creatureId]);

  return {
    creatureId,
    packId: validPack ? rawPackId : null,
    lineageId: world.creatureClanId[creatureId] >= 0 ? world.creatureClanId[creatureId] : null,
    locked,
    badges: {
      leader: runtime.isLeader,
      scout: runtime.isActiveScout,
      predator: runtime.hasWeapon,
      solo: !validPack,
    },
    status: {
      intent: runtime.intent,
      energy,
      maxEnergy,
      energyFrac,
      age,
      maxAge,
      remainingAge: Math.max(0, maxAge - age),
      sizeScale: world.creatureSizeScale[creatureId],
      adultGoal: world.creatureAdultScaleGoal[creatureId],
    },
    packInfo: {
      id: rawPackId >= 0 ? rawPackId : null,
      membership: packMembership,
      size: packSize,
      leaderId,
      scoutId,
      predatorCount: packPredatorCount,
      avgEnergyFrac: packAvgEnergyFrac,
      avgSizeScale: packAvgSizeScale,
      anchorDistance,
    },
    regroup: {
      source: regroupSource,
      targetDistance: regroupTargetDistance,
      isolated: world.creatureRegroupDebugIsolated[creatureId] === 1,
      urgent: world.creatureRegroupDebugUrgent[creatureId] === 1,
    },
    activity: {
      foodPlantEaten: world.creatureFoodPlantEatenTotal[creatureId],
      foodMeatEaten: world.creatureFoodMeatEatenTotal[creatureId],
      foodTotalEaten: world.creatureFoodPlantEatenTotal[creatureId] + world.creatureFoodMeatEatenTotal[creatureId],
      photoGainTick: world.creaturePhotoEnergyGrossTick[creatureId],
      photoNetTick: world.creaturePhotoEnergyNetTick[creatureId],
      photoNetLifetime: world.creaturePhotoEnergyNetLifetimeTotal[creatureId],
      latchesInitiated: world.creatureLatchesInitiatedTotal[creatureId],
      kills: world.creatureKillsTotal[creatureId],
      latchLosses: world.creatureLatchLossesTotal[creatureId],
      timesLatchedOn: world.creatureTimesLatchedOnTotal[creatureId],
    },
    runtime: {
      fearTimer: runtime.fearTimer,
      packIsolationTimer: runtime.packIsolationTimer,
      packSeekTimer: runtime.packSeekTimer,
      hasSensedFood: runtime.hasSensedFood,
      hasSensedThreat: runtime.hasSensedThreat,
      hasActiveLatch: runtime.hasActiveLatch,
      hasLatchAsTarget: runtime.hasLatchAsTarget,
      hasWeapon: runtime.hasWeapon,
      nearPrey: runtime.nearPrey,
      hasHuntTarget: runtime.hasHuntTarget,
      sensedFoodKind: runtime.sensedFoodKind,
      foodSignalStrength: runtime.foodSignalStrength,
      foodSignalHop: runtime.foodSignalHop,
      foodSignalAge: runtime.foodSignalAge,
      predatorDigestTimer: runtime.predatorDigestTimer,
      predatorFullTimer: runtime.predatorFullTimer,
    },
    advanced: {
      blobTotal: blobCount,
      blobCounts,
      reproduction: {
        cooldown: world.creatureReproCooldown[creatureId],
        mateTimer: world.creatureMateTimer[creatureId],
        energyFrac,
        sizeMature: world.creatureSizeScale[creatureId] >= (world.creatureAdultScaleGoal[creatureId] * sim.params.sizeReproMinAdultFrac),
      },
      predation: {
        activeLatchCount,
        carryingCarcass: world.creatureCarcassAlive[creatureId] === 1,
        carcassEnergyFrac: maxCarcassEnergy > 0
          ? Math.max(0, Math.min(1, world.creatureCarcassEnergy[creatureId] / maxCarcassEnergy))
          : null,
        lastAttackerId: world.creatureLastAttacker[creatureId] >= 0 ? world.creatureLastAttacker[creatureId] : null,
      },
    },
  };
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
    const hasInspectionTarget = highlight.hoveredCreatureId >= 0;
    if (hasInspectionTarget && ci >= 0 && w.creatureAlive[ci]) {
      const isHoveredTarget = ci === highlight.hoveredCreatureId;
      const isLockedTarget = highlight.lockedCreatureId >= 0 && ci === highlight.lockedCreatureId;
      const isLatchLinked = !!highlight.latchedCreatureIds?.has(ci);
      if (highlight.isPaused) {
        const isHoveredPackmate = highlight.hoveredPackId >= 0 && w.creaturePackId[ci] === highlight.hoveredPackId;
        if (isHoveredTarget || isHoveredPackmate || isLatchLinked) {
          if (isLockedTarget) {
            // Lock state: explicit gold highlight so it is clearly distinct from white pack highlights.
            outR = 1.0;
            outG = 0.78;
            outB = 0.12;
            outA = 1.45;
          } else if (isLatchLinked) {
            // Latch-linked counterpart creature gets neutral gray highlight for readability.
            outR = 0.42;
            outG = 0.42;
            outB = 0.42;
            outA = 1.08;
          } else {
            const whiteBlend = isHoveredTarget ? 0.96 : 0.78;
            outR = r + (1 - r) * whiteBlend;
            outG = g + (1 - g) * whiteBlend;
            outB = b + (1 - b) * whiteBlend;
            // Slight additive field boost reads as a soft glow after metaball threshold.
            outA = isHoveredTarget ? 1.22 : 1.10;
          }
        } else {
          outA = 0;
        }
      } else if (isLockedTarget) {
        // While running, keep only the locked creature visually emphasized.
        outR = 1.0;
        outG = 0.78;
        outB = 0.12;
        outA = 1.36;
      }
    } else if (highlight.isPaused && hasInspectionTarget) {
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
  const w = sim.world;
  const inspectingPaused = highlight.isPaused && highlight.hoveredCreatureId >= 0;
  const inspectedSourceCreatureIds = inspectingPaused ? highlight.inspectedSourceCreatureIds : null;
  const inspectCoreXs: number[] = [];
  const inspectCoreYs: number[] = [];
  if (inspectingPaused && inspectedSourceCreatureIds) {
    for (const ci of inspectedSourceCreatureIds) {
      if (!w.creatureAlive[ci]) continue;
      const coreIdx = w.creatureBlobs[w.creatureBlobStart[ci]];
      if (coreIdx < 0 || !w.blobAlive[coreIdx]) continue;
      inspectCoreXs.push(w.blobX[coreIdx]);
      inspectCoreYs.push(w.blobY[coreIdx]);
    }
  }
  let count = 0;
  const maxInstances = Math.floor(buffers.foodData.length / FOOD_FLOATS);
  for (let si = 0; si < w.foodCount; si++) {
    if (count >= maxInstances) break;
    const i = w.activeFoodIds[si];
    const offset = count * FOOD_FLOATS;
    const kind = w.foodKind[i] as FoodKind;
    if (inspectingPaused) {
      // During paused inspection, hide plant pellets but keep nearby meat visible for carcass/meat context.
      if (kind !== FoodKind.MEAT) continue;
      if (inspectCoreXs.length > 0) {
        let nearAnyInspectedCore = false;
        for (let j = 0; j < inspectCoreXs.length; j++) {
          const dx = w.foodX[i] - inspectCoreXs[j];
          const dy = w.foodY[i] - inspectCoreYs[j];
          if (dx * dx + dy * dy <= INSPECT_MEAT_VISIBILITY_RADIUS * INSPECT_MEAT_VISIBILITY_RADIUS) {
            nearAnyInspectedCore = true;
            break;
          }
        }
        if (!nearAnyInspectedCore) continue;
      }
    }
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
    if (inspectingPaused && !inspectedSourceCreatureIds?.has(ci)) continue;
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

      if (isCreatureActiveScout(w, ci)) {
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

      if (isCreaturePackLeader(w, ci)) {
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

function loadSoundEnabled(): boolean {
  try {
    const raw = window.localStorage.getItem(SOUND_ENABLED_STORAGE_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    // Ignore storage errors (private mode/restricted env) and fallback to default.
  }
  return true;
}

function saveSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore storage errors; runtime toggle still works for current session.
  }
}
