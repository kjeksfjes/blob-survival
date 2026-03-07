import { Renderer } from './rendering/renderer';
import {
  createBodyRenderSettingsForPreset,
} from './rendering/body-visuals';
import { DEFAULT_RENDER_STYLE, type RenderStyle } from './rendering/render-style';
import { SimulationLoop } from './simulation/simulation-loop';
import { getCreatureRuntimeDebugSnapshot, isCreatureActiveScout, isCreaturePackLeader } from './simulation/creature';
import {
  CREATURE_DEATH_CAUSE_AGE,
  CREATURE_DEATH_CAUSE_KILLED,
  CREATURE_DEATH_CAUSE_STARVATION,
  LEADERBOARD_DEATH_RECORD_CAP,
} from './simulation/world';
import { Hud } from './ui/hud';
import { DebugPanel, type SocialColorMode } from './ui/debug-panel';
import { Legend } from './ui/legend';
import { Inspector, type CreatureInspectorPayload } from './ui/inspector';
import {
  Leaderboard,
  type LeaderboardBoard,
  type LeaderboardDeathRecord,
  type LeaderboardPlaceholderRow,
  type LeaderboardPayload,
  type LeaderboardRowHall,
  type LeaderboardRowLive,
} from './ui/leaderboard';
import { plop, beow, type DeathCause } from './audio/plop';
import {
  WORLD_SIZE, FOOD_RADIUS, MAX_CREATURES,
  RENDER_RADIUS_MULT, RENDER_RADIUS_BY_TYPE, FOOD_STALE_TICKS, MEAT_STALE_TICKS,
  FOOD_GROWTH_MIN_MULT, FOOD_GROWTH_PEAK_MULT, FOOD_GROWTH_STALE_MULT, FOOD_GROWTH_PEAK_AGE_FRAC,
  FOOD_VISUAL_FADE_START_FRAC, FOOD_VISUAL_MIN_ALPHA,
  FOOD_DUST_BURST_COUNT, FOOD_DUST_DRAG, FOOD_DUST_DRIFT_UP_ACCEL, FOOD_DUST_EVENT_CAP,
  FOOD_DUST_EVENTS_MAX_PER_FRAME, FOOD_DUST_LIFETIME_MAX_S, FOOD_DUST_LIFETIME_MIN_S,
  FOOD_DUST_PARTICLE_MAX, FOOD_DUST_RADIUS_MAX, FOOD_DUST_RADIUS_MIN, FOOD_DUST_SPEED_MAX, FOOD_DUST_SPEED_MIN,
  FOOD_DUST_DIRECTIONAL_BIAS,
  BASE_BLOB_RADIUS, CARRIED_MEAT_RENDER_SCALE_MULT, CARRIED_MEAT_RENDER_BLOB_CAP, CARRIED_MEAT_VISUAL_MIN_ALPHA,
  SCOUT_MARKER_RADIUS_MULT, SCOUT_MARKER_RADIUS_MIN,
} from './constants';
import { BLOB_FLOATS, FOOD_FLOATS, LINK_FLOATS, DUST_FLOATS, BlobType, FoodKind } from './types';

const enum ViewMode {
  NORMAL = 0,
  PACK = 1,
  CLAN = 2,
}

const FOOD_KIND_CARRIED_MEAT_MARKER = 2;
const FOOD_KIND_SCOUT_MARKER = 3;
const FOOD_KIND_LEADER_MARKER = 4;
const SOUND_ENABLED_STORAGE_KEY = 'evolution01.soundEnabled';
const FLAT_MODE_STORAGE_KEY = 'evolution01.flatMode';
const SOCIAL_COLOR_MODE_STORAGE_KEY = 'evolution01.socialColorMode';
const LAST_NORMAL_SOCIAL_MODE_STORAGE_KEY = 'evolution01.lastNormalSocialColorMode';
const REGROUP_DEBUG_NONE = 0;
const REGROUP_DEBUG_ANCHOR = 1;
const REGROUP_DEBUG_LEADER = 2;
const REGROUP_DEBUG_REJOIN = 3;
const REGROUP_OVERLAY_MAX_LINES = 1200;
const POINTER_CLICK_DRAG_THRESHOLD_SQ = 36;
const INSPECT_MEAT_VISIBILITY_RADIUS = 120;
const LEADERBOARD_REFRESH_INTERVAL_MS = 250;
const LEADERBOARD_TOP_K = 5;
const _foregroundPredatorFlags = new Uint8Array(MAX_CREATURES);
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
const BODY_BLOB_TYPE_ORDER: BlobType[] = [
  BlobType.CORE,
  BlobType.MOUTH,
  BlobType.SHIELD,
  BlobType.SENSOR,
  BlobType.WEAPON,
  BlobType.REPRODUCER,
  BlobType.MOTOR,
  BlobType.FAT,
  BlobType.PHOTOSYNTHESIZER,
  BlobType.ADHESION,
];

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
  snapshot: {
    generation: number;
    ageAtDeath: number;
    foodPlantEaten: number;
    foodMeatEaten: number;
    foodTotalEaten: number;
    latchesInitiated: number;
    kills: number;
    latchLosses: number;
    timesLatchedOn: number;
    photoGainTick: number;
    photoNetTick: number;
    photoNetLifetime: number;
    blobTotal: number;
    blobCore: number;
    blobMouth: number;
    blobShield: number;
    blobSensor: number;
    blobWeapon: number;
    blobReproducer: number;
    blobMotor: number;
    blobFat: number;
    blobPhotosynthesizer: number;
    blobAdhesion: number;
  } | null;
};

type LeaderboardStore = {
  hallRecords: LeaderboardDeathRecord[];
  deathFeedCursorTotal: number;
  lastRefreshMs: number;
  dirty: boolean;
};

type DustParticleState = {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  age: Float32Array;
  lifetime: Float32Array;
  radius: Float32Array;
  alpha: Float32Array;
  seed: Float32Array;
  tint: Float32Array;
  count: number;
  eventCursorTotal: number;
  lastUpdateMs: number;
};
type NormalSocialColorMode = 'NormalPart' | 'NormalGenome';

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
  const persistedSocialMode = loadSocialColorMode();
  const persistedLastNormalMode = loadLastNormalSocialColorMode();
  let viewMode: ViewMode = ViewMode.NORMAL;
  let paused = false;
  let soundEnabled = loadSoundEnabled();
  let flatModeEnabled = loadFlatModeEnabled();
  let genomeColorEnabled = persistedLastNormalMode === 'NormalGenome';
  let lastNormalSocialMode: NormalSocialColorMode = persistedLastNormalMode ?? 'NormalPart';
  if (persistedSocialMode) {
    switch (persistedSocialMode) {
      case 'NormalPart':
        viewMode = ViewMode.NORMAL;
        genomeColorEnabled = false;
        lastNormalSocialMode = 'NormalPart';
        break;
      case 'NormalGenome':
        viewMode = ViewMode.NORMAL;
        genomeColorEnabled = true;
        lastNormalSocialMode = 'NormalGenome';
        break;
      case 'Pack':
        viewMode = ViewMode.PACK;
        break;
      case 'Clan':
        viewMode = ViewMode.CLAN;
        break;
    }
  }
  let renderStyle: RenderStyle = flatModeEnabled ? 'Connected' : DEFAULT_RENDER_STYLE;
  renderer.setRenderStyle(renderStyle);
  let bodyVisuals = createBodyRenderSettingsForPreset('Technical');
  const applyEffectiveBodyRenderSettings = () => {
    const technical = createBodyRenderSettingsForPreset('Technical');
    bodyVisuals = {
      ...technical,
      moduleColors: !genomeColorEnabled,
      creatureOutline: true,
    };
    renderer.setBodyRenderSettings(bodyVisuals);
  };
  applyEffectiveBodyRenderSettings();
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
  const setFlatMode = (enabled: boolean) => {
    flatModeEnabled = enabled;
    saveFlatModeEnabled(enabled);
    renderStyle = enabled ? 'Connected' : 'Metaball';
    renderer.setRenderStyle(renderStyle);
    applyEffectiveBodyRenderSettings();
  };
  const setSocialColorMode = (mode: SocialColorMode) => {
    switch (mode) {
      case 'NormalPart':
        viewMode = ViewMode.NORMAL;
        genomeColorEnabled = false;
        lastNormalSocialMode = 'NormalPart';
        break;
      case 'NormalGenome':
        viewMode = ViewMode.NORMAL;
        genomeColorEnabled = true;
        lastNormalSocialMode = 'NormalGenome';
        break;
      case 'Pack':
        viewMode = ViewMode.PACK;
        break;
      case 'Clan':
        viewMode = ViewMode.CLAN;
        break;
    }
    applyEffectiveBodyRenderSettings();
    saveSocialColorMode(mode);
    saveLastNormalSocialColorMode(lastNormalSocialMode);
    debugPanel.setSocialColorMode(viewModeToSocialColorMode(viewMode, genomeColorEnabled));
  };
  const resetVisualDefaults = () => {
    flatModeEnabled = false;
    saveFlatModeEnabled(flatModeEnabled);
    genomeColorEnabled = false;
    lastNormalSocialMode = 'NormalPart';
    renderStyle = DEFAULT_RENDER_STYLE;
    renderer.setRenderStyle(renderStyle);
    applyEffectiveBodyRenderSettings();
  };
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
    getSocialColorMode: () => viewModeToSocialColorMode(viewMode, genomeColorEnabled),
    setSocialColorMode,
    getSoundEnabled: () => soundEnabled,
    setSoundEnabled: (enabled) => {
      soundEnabled = enabled;
      saveSoundEnabled(enabled);
    },
    getFlatMode: () => flatModeEnabled,
    setFlatMode,
    resetVisualDefaults,
  });
  const legend = new Legend();
  const hudEl = document.getElementById('hud') as HTMLElement;
  const leaderboardStore: LeaderboardStore = {
    hallRecords: [],
    deathFeedCursorTotal: 0,
    lastRefreshMs: -Infinity,
    dirty: true,
  };
  const dustParticles = createDustParticleState();
  let leaderboardPayload: LeaderboardPayload | null = null;
  let leaderboardWorldRef = sim.world;
  const leaderboard = new Leaderboard({
    onSelectLive: (creatureId: number) => {
      const world = sim.world;
      if (creatureId < 0 || creatureId >= world.creatureAlive.length) return;
      if (!world.creatureAlive[creatureId]) return;
      lockedCreatureId = creatureId;
      lockedCreatureGeneration = world.creatureGeneration[creatureId];
      lockedKnownPackId = world.creaturePackId[creatureId] >= 0 ? world.creaturePackId[creatureId] : null;
      lockedKnownLineageId = world.creatureClanId[creatureId] >= 0 ? world.creatureClanId[creatureId] : null;
      inspectedDeath = null;
      inspectorDismissed = false;
      clearHoverHighlight();
    },
    onSelectDeceased: (record: LeaderboardDeathRecord) => {
      lockedCreatureId = -1;
      lockedCreatureGeneration = -1;
      lockedKnownPackId = record.packId >= 0 ? record.packId : null;
      lockedKnownLineageId = record.lineageId >= 0 ? record.lineageId : null;
      inspectedDeath = leaderboardRecordToInspectedDeathInfo(record);
      inspectorDismissed = false;
      clearHoverHighlight();
    },
  });

  const setViewMode = (mode: ViewMode) => {
    if (viewMode === mode) return;
    viewMode = mode;
    debugPanel.setSocialColorMode(viewModeToSocialColorMode(viewMode, genomeColorEnabled));
  };

  const setPaused = (nextPaused: boolean) => {
    if (!paused && nextPaused) inspectorDismissed = false;
    paused = nextPaused;
  };

  const clearHoverHighlight = () => {
    hoverCreatureId = -1;
  };

  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    const isTypingTarget =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable === true;
    if (e.key === 'l' || e.key === 'L') legend.toggle();
    if (e.key === 'h' || e.key === 'H') hudDisplay.toggleVerbose();
    if ((e.key === 'b' || e.key === 'B') && !isTypingTarget) {
      leaderboard.toggleVisible();
      leaderboardStore.dirty = true;
    }
    const isPKey = e.key === 'p' || e.key === 'P';
    if (isPKey && e.shiftKey) {
      if (viewMode === ViewMode.CLAN) setSocialColorMode(lastNormalSocialMode);
      else setSocialColorMode('Clan');
    } else if (isPKey) {
      if (viewMode === ViewMode.PACK) setSocialColorMode(lastNormalSocialMode);
      else setSocialColorMode('Pack');
    }
    if (e.code === 'Space') {
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
    const picked = pickHoveredCreature(sim, renderer, canvas, e.clientX, e.clientY, bodyVisuals.nodeRadiusMult);
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
  let prevDeathStarvationTotal = sim.world.deathStarvationTotal;
  let prevDeathKilledTotal = sim.world.deathKilledTotal;
  let prevDeathAgeTotal = sim.world.deathAgeTotal;

  function frame() {
    hudDisplay.tick();
    renderer.resize(canvas);
    resizeOverlayCanvas(canvas, overlayCanvas);

    // Simulation step
    if (!paused) sim.step();
    if (sim.world !== leaderboardWorldRef) {
      leaderboardWorldRef = sim.world;
      leaderboardStore.hallRecords.length = 0;
      leaderboardStore.deathFeedCursorTotal = 0;
      leaderboardStore.lastRefreshMs = -Infinity;
      leaderboardStore.dirty = true;
      leaderboardPayload = null;
      dustParticles.eventCursorTotal = 0;
      dustParticles.count = 0;
      dustParticles.lastUpdateMs = performance.now();
      prevBirths = sim.world.totalBirths;
      prevDeaths = sim.world.totalDeaths;
      prevDeathStarvationTotal = sim.world.deathStarvationTotal;
      prevDeathKilledTotal = sim.world.deathKilledTotal;
      prevDeathAgeTotal = sim.world.deathAgeTotal;
    }
    consumeLeaderboardDeathFeed(sim.world, leaderboardStore);

    // Sound effects (delay plop slightly when both happen so they don't overlap)
    const newDeaths = sim.world.totalDeaths > prevDeaths;
    const newBirths = sim.world.totalBirths > prevBirths;
    const deltaStarvation = Math.max(0, sim.world.deathStarvationTotal - prevDeathStarvationTotal);
    const deltaKilled = Math.max(0, sim.world.deathKilledTotal - prevDeathKilledTotal);
    const deltaAge = Math.max(0, sim.world.deathAgeTotal - prevDeathAgeTotal);
    const dominantDeathCause: DeathCause = selectDominantDeathCause(
      deltaStarvation,
      deltaKilled,
      deltaAge,
      newDeaths,
    );
    if (soundEnabled) {
      if (newDeaths) beow(dominantDeathCause);
      if (newBirths) {
        if (newDeaths) setTimeout(plop, 150);
        else plop();
      }
    }
    prevBirths = sim.world.totalBirths;
    prevDeaths = sim.world.totalDeaths;
    prevDeathStarvationTotal = sim.world.deathStarvationTotal;
    prevDeathKilledTotal = sim.world.deathKilledTotal;
    prevDeathAgeTotal = sim.world.deathAgeTotal;

    const dustNowMs = performance.now();
    if (paused) {
      // Freeze dust while paused and prevent a large dt jump on resume.
      dustParticles.lastUpdateMs = dustNowMs;
    } else {
      consumeFoodDustEventFeed(sim.world, dustParticles);
      updateDustParticles(dustParticles, dustNowMs);
    }

    if (!paused || !hoverHasPointer || isCanvasDragging) {
      clearHoverHighlight();
    } else {
      hoverCreatureId = pickHoveredCreature(sim, renderer, canvas, hoverClientX, hoverClientY, bodyVisuals.nodeRadiusMult);
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
          const deathRecord = findDeathRecordForCreature(
            leaderboardStore.hallRecords,
            lockedCreatureId,
            lockedCreatureGeneration,
          );
          inspectedDeath = buildInspectedDeathInfo(
            sim,
            lockedCreatureId,
            lockedKnownPackId,
            lockedKnownLineageId,
            inspector.getLastThoughtForCreature(lockedCreatureId),
            deathRecord,
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
    const foregroundPredatorFlags = populateForegroundPredatorFlags(sim.world);

    // Pack blob data for GPU
    const packStartMs = performance.now();
    packBlobsForGpu(sim, renderer, viewMode, hoverHighlight, bodyVisuals.nodeRadiusMult, bodyVisuals.moduleColors, foregroundPredatorFlags);
    if (renderStyle === 'Connected') {
      packLinksForGpu(sim, renderer, viewMode, hoverHighlight, bodyVisuals.linkThicknessMult, bodyVisuals.moduleColors, foregroundPredatorFlags);
    } else {
      renderer.buffers.linkCount = 0;
    }
    packFoodForGpu(sim, renderer, hoverHighlight);
    packDustForGpu(renderer, dustParticles, hoverHighlight);
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
        snapshot: inspectedDeath.snapshot,
      } : null,
    });
    hudDisplay.update(sim.world, sim.speed, viewModeLabel(viewMode));
    const hudBottom = hudEl.getBoundingClientRect().bottom;
    leaderboard.setAnchorTop(hudBottom + 8);
    const nowMs = performance.now();
    const shouldRefreshLeaderboard =
      leaderboardStore.dirty ||
      nowMs - leaderboardStore.lastRefreshMs >= LEADERBOARD_REFRESH_INTERVAL_MS;
    if (shouldRefreshLeaderboard) {
      leaderboardPayload = buildLeaderboardPayload(sim.world, leaderboardStore.hallRecords);
      leaderboardStore.lastRefreshMs = nowMs;
      leaderboardStore.dirty = false;
    }
    if (leaderboardPayload) leaderboard.update(leaderboardPayload);

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

function deathCauseLabelFromCode(code: number): 'Starvation' | 'Killed' | 'Old Age' {
  if (code === CREATURE_DEATH_CAUSE_KILLED) return 'Killed';
  if (code === CREATURE_DEATH_CAUSE_AGE) return 'Old Age';
  return 'Starvation';
}

function selectDominantDeathCause(
  starvationDelta: number,
  killedDelta: number,
  ageDelta: number,
  sawDeaths: boolean,
): DeathCause {
  if (!sawDeaths) return 'generic';
  // If any kill happened this frame, always use killed audio profile.
  if (killedDelta > 0) return 'killed';
  const maxDelta = Math.max(starvationDelta, killedDelta, ageDelta);
  if (maxDelta <= 0) return 'generic';
  // Tie-break order (non-kill frames): starvation > old_age.
  if (starvationDelta === maxDelta) return 'starvation';
  return 'old_age';
}

function leaderboardRecordToInspectedDeathInfo(record: LeaderboardDeathRecord): InspectedDeathInfo {
  return {
    creatureId: record.creatureSlot,
    packId: record.packId >= 0 ? record.packId : null,
    lineageId: record.lineageId >= 0 ? record.lineageId : null,
    causeLabel: deathCauseLabelFromCode(record.deathCause),
    deathTick: record.deathTick,
    killerId: null,
    lastWords: null,
    x: record.deathX,
    y: record.deathY,
    snapshot: {
      generation: record.generation,
      ageAtDeath: record.ageAtDeath,
      foodPlantEaten: record.foodPlantEaten,
      foodMeatEaten: record.foodMeatEaten,
      foodTotalEaten: record.foodTotalEaten,
      latchesInitiated: record.latchesInitiated,
      kills: record.kills,
      latchLosses: record.latchLosses,
      timesLatchedOn: record.timesLatchedOn,
      photoGainTick: record.photoGainTick,
      photoNetTick: record.photoNetTick,
      photoNetLifetime: record.photoNetLifetime,
      blobTotal: record.blobTotal,
      blobCore: record.blobCore,
      blobMouth: record.blobMouth,
      blobShield: record.blobShield,
      blobSensor: record.blobSensor,
      blobWeapon: record.blobWeapon,
      blobReproducer: record.blobReproducer,
      blobMotor: record.blobMotor,
      blobFat: record.blobFat,
      blobPhotosynthesizer: record.blobPhotosynthesizer,
      blobAdhesion: record.blobAdhesion,
    },
  };
}

function findDeathRecordForCreature(
  hallRecords: LeaderboardDeathRecord[],
  creatureId: number,
  generation: number,
): LeaderboardDeathRecord | null {
  if (creatureId < 0 || generation < 0) return null;
  for (let i = hallRecords.length - 1; i >= 0; i--) {
    const record = hallRecords[i];
    if (record.creatureSlot !== creatureId) continue;
    if (record.generation !== generation) continue;
    return record;
  }
  return null;
}

function consumeLeaderboardDeathFeed(
  world: SimulationLoop['world'],
  store: LeaderboardStore,
): void {
  const total = world.leaderboardDeathTotalEmitted;
  const oldestAvailable = Math.max(0, total - world.leaderboardDeathCount);
  if (store.deathFeedCursorTotal < oldestAvailable) {
    store.deathFeedCursorTotal = oldestAvailable;
  }
  while (store.deathFeedCursorTotal < total) {
    const slot = store.deathFeedCursorTotal % LEADERBOARD_DEATH_RECORD_CAP;
    const record: LeaderboardDeathRecord = {
      creatureSlot: world.leaderboardDeathCreatureSlot[slot],
      generation: world.leaderboardDeathGeneration[slot],
      packId: world.leaderboardDeathPackId[slot],
      lineageId: world.leaderboardDeathLineageId[slot],
      deathTick: world.leaderboardDeathTick[slot],
      deathCause: world.leaderboardDeathCause[slot],
      deathX: world.leaderboardDeathX[slot],
      deathY: world.leaderboardDeathY[slot],
      ageAtDeath: world.leaderboardDeathAge[slot],
      foodPlantEaten: world.leaderboardDeathFoodPlantEaten[slot],
      foodMeatEaten: world.leaderboardDeathFoodMeatEaten[slot],
      foodTotalEaten: world.leaderboardDeathFoodTotalEaten[slot],
      latchesInitiated: world.leaderboardDeathLatchesInitiated[slot],
      kills: world.leaderboardDeathKills[slot],
      latchLosses: world.leaderboardDeathLatchLosses[slot],
      timesLatchedOn: world.leaderboardDeathTimesLatchedOn[slot],
      photoGainTick: world.leaderboardDeathPhotoGainTick[slot],
      photoNetTick: world.leaderboardDeathPhotoNetTick[slot],
      photoNetLifetime: world.leaderboardDeathPhotoNetLifetime[slot],
      blobTotal: world.leaderboardDeathBlobTotal[slot],
      blobCore: world.leaderboardDeathBlobCore[slot],
      blobMouth: world.leaderboardDeathBlobMouth[slot],
      blobShield: world.leaderboardDeathBlobShield[slot],
      blobSensor: world.leaderboardDeathBlobSensor[slot],
      blobWeapon: world.leaderboardDeathBlobWeapon[slot],
      blobReproducer: world.leaderboardDeathBlobReproducer[slot],
      blobMotor: world.leaderboardDeathBlobMotor[slot],
      blobFat: world.leaderboardDeathBlobFat[slot],
      blobPhotosynthesizer: world.leaderboardDeathBlobPhotosynthesizer[slot],
      blobAdhesion: world.leaderboardDeathBlobAdhesion[slot],
    };
    store.hallRecords.push(record);
    if (store.hallRecords.length > LEADERBOARD_DEATH_RECORD_CAP) {
      store.hallRecords.shift();
    }
    store.deathFeedCursorTotal++;
    store.dirty = true;
  }
}

function createDustParticleState(): DustParticleState {
  return {
    x: new Float32Array(FOOD_DUST_PARTICLE_MAX),
    y: new Float32Array(FOOD_DUST_PARTICLE_MAX),
    vx: new Float32Array(FOOD_DUST_PARTICLE_MAX),
    vy: new Float32Array(FOOD_DUST_PARTICLE_MAX),
    age: new Float32Array(FOOD_DUST_PARTICLE_MAX),
    lifetime: new Float32Array(FOOD_DUST_PARTICLE_MAX),
    radius: new Float32Array(FOOD_DUST_PARTICLE_MAX),
    alpha: new Float32Array(FOOD_DUST_PARTICLE_MAX),
    seed: new Float32Array(FOOD_DUST_PARTICLE_MAX),
    tint: new Float32Array(FOOD_DUST_PARTICLE_MAX),
    count: 0,
    eventCursorTotal: 0,
    lastUpdateMs: performance.now(),
  };
}

function consumeFoodDustEventFeed(
  world: SimulationLoop['world'],
  state: DustParticleState,
): void {
  const total = world.eatVfxEventTotalEmitted;
  const oldestAvailable = Math.max(0, total - world.eatVfxEventCount);
  if (state.eventCursorTotal < oldestAvailable) {
    state.eventCursorTotal = oldestAvailable;
  }
  let consumed = 0;
  while (state.eventCursorTotal < total && consumed < FOOD_DUST_EVENTS_MAX_PER_FRAME) {
    const slot = state.eventCursorTotal % FOOD_DUST_EVENT_CAP;
    spawnDustBurst(
      state,
      world.eatVfxEventX[slot],
      world.eatVfxEventY[slot],
      world.eatVfxEventStrength[slot],
      world.eatVfxEventDirX[slot],
      world.eatVfxEventDirY[slot],
    );
    state.eventCursorTotal++;
    consumed++;
  }
}

function spawnDustBurst(
  state: DustParticleState,
  x: number,
  y: number,
  strength: number,
  dirX: number,
  dirY: number,
): void {
  const available = FOOD_DUST_PARTICLE_MAX - state.count;
  if (available <= 0) return;
  const burstStrength = Math.max(0.35, Math.min(1.8, strength));
  const dirMag = Math.hypot(dirX, dirY);
  const dirNx = dirMag > 1e-5 ? (dirX / dirMag) : 0;
  const dirNy = dirMag > 1e-5 ? (dirY / dirMag) : 0;
  const burstCount = Math.min(FOOD_DUST_BURST_COUNT, available);
  for (let i = 0; i < burstCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (FOOD_DUST_SPEED_MIN + Math.random() * (FOOD_DUST_SPEED_MAX - FOOD_DUST_SPEED_MIN))
      * (0.7 + burstStrength * 0.4);
    const radialVx = Math.cos(angle) * speed;
    const radialVy = Math.sin(angle) * speed - speed * 0.18;
    const directionalBoost = speed * FOOD_DUST_DIRECTIONAL_BIAS * (0.85 + Math.random() * 0.55);
    const vx = radialVx + dirNx * directionalBoost;
    const vy = radialVy + dirNy * directionalBoost;
    const lifetime = FOOD_DUST_LIFETIME_MIN_S + Math.random() * (FOOD_DUST_LIFETIME_MAX_S - FOOD_DUST_LIFETIME_MIN_S);
    const radius = (FOOD_DUST_RADIUS_MIN + Math.random() * (FOOD_DUST_RADIUS_MAX - FOOD_DUST_RADIUS_MIN))
      * (0.78 + burstStrength * 0.26);
    const spawnOffset = (1.5 + Math.random() * 7.5) * burstStrength;
    const px = x + Math.cos(angle) * spawnOffset;
    const py = y + Math.sin(angle) * spawnOffset;
    appendDustParticle(state, px, py, vx, vy, lifetime, radius, Math.random(), Math.random());
  }
}

function appendDustParticle(
  state: DustParticleState,
  x: number,
  y: number,
  vx: number,
  vy: number,
  lifetime: number,
  radius: number,
  seed: number,
  tint: number,
): void {
  if (state.count >= FOOD_DUST_PARTICLE_MAX) return;
  const idx = state.count;
  state.x[idx] = x;
  state.y[idx] = y;
  state.vx[idx] = vx;
  state.vy[idx] = vy;
  state.age[idx] = 0;
  state.lifetime[idx] = lifetime;
  state.radius[idx] = radius;
  state.alpha[idx] = 1;
  state.seed[idx] = seed;
  state.tint[idx] = tint;
  state.count++;
}

function removeDustParticleAt(state: DustParticleState, idx: number): void {
  const last = state.count - 1;
  if (idx < 0 || idx > last) return;
  if (idx !== last) {
    state.x[idx] = state.x[last];
    state.y[idx] = state.y[last];
    state.vx[idx] = state.vx[last];
    state.vy[idx] = state.vy[last];
    state.age[idx] = state.age[last];
    state.lifetime[idx] = state.lifetime[last];
    state.radius[idx] = state.radius[last];
    state.alpha[idx] = state.alpha[last];
    state.seed[idx] = state.seed[last];
    state.tint[idx] = state.tint[last];
  }
  state.count = last;
}

function updateDustParticles(state: DustParticleState, nowMs: number): void {
  const dt = Math.max(0, Math.min(0.05, (nowMs - state.lastUpdateMs) / 1000));
  state.lastUpdateMs = nowMs;
  if (dt <= 0 || state.count <= 0) return;

  const drag = Math.pow(FOOD_DUST_DRAG, dt * 60);
  let i = 0;
  while (i < state.count) {
    state.age[i] += dt;
    const life = Math.max(0.001, state.lifetime[i]);
    if (state.age[i] >= life) {
      removeDustParticleAt(state, i);
      continue;
    }

    const t = state.age[i] / life;
    state.vy[i] -= FOOD_DUST_DRIFT_UP_ACCEL * dt;
    state.vx[i] *= drag;
    state.vy[i] *= drag;
    state.x[i] += state.vx[i] * dt;
    state.y[i] += state.vy[i] * dt;
    // Keep a visibly continuous fade across the whole lifetime.
    state.alpha[i] = (1 - t) * 0.95;
    i++;
  }
}

function packDustForGpu(renderer: Renderer, state: DustParticleState, highlight: HoverHighlightContext): void {
  const { buffers } = renderer;
  const inspectingPaused = highlight.isPaused && highlight.hoveredCreatureId >= 0;
  if (inspectingPaused) {
    buffers.dustCount = 0;
    return;
  }
  const maxInstances = Math.floor(buffers.dustData.length / DUST_FLOATS);
  const count = Math.min(state.count, maxInstances);
  for (let i = 0; i < count; i++) {
    const offset = i * DUST_FLOATS;
    buffers.dustData[offset + 0] = state.x[i];
    buffers.dustData[offset + 1] = state.y[i];
    buffers.dustData[offset + 2] = state.radius[i];
    buffers.dustData[offset + 3] = state.alpha[i];
    buffers.dustData[offset + 4] = state.seed[i];
    buffers.dustData[offset + 5] = state.tint[i];
  }
  buffers.dustCount = count;
}

type LiveRankCandidate = {
  creatureId: number;
  generation: number;
  packId: number | null;
  lineageId: number | null;
  metricMain: string;
  metricSub: string;
  age: number;
  energyFrac: number;
  foodTotal: number;
  foodPlant: number;
  kills: number;
  killEfficiency: number;
  latches: number;
  photoNetLifetime: number;
  photoNetTick: number;
};

type HallRankCandidate = {
  row: LeaderboardRowHall;
  deathTick: number;
  ageAtDeath: number;
  foodTotal: number;
  foodPlant: number;
  kills: number;
  killEfficiency: number;
  latches: number;
  photoNetLifetime: number;
};

function buildLeaderboardPayload(
  world: SimulationLoop['world'],
  hallRecords: LeaderboardDeathRecord[],
): LeaderboardPayload {
  const liveRows: LiveRankCandidate[] = [];

  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    const age = world.creatureAge[ci];
    const maxEnergy = Math.max(1, world.creatureMaxEnergy[ci]);
    const energyFrac = world.creatureEnergy[ci] / maxEnergy;
    const foodPlant = world.creatureFoodPlantEatenTotal[ci];
    const foodMeat = world.creatureFoodMeatEatenTotal[ci];
    const foodTotal = foodPlant + foodMeat;
    const kills = world.creatureKillsTotal[ci];
    const latches = world.creatureLatchesInitiatedTotal[ci];
    const killEfficiency = kills / Math.max(1, latches);
    const photoNetLifetime = world.creaturePhotoEnergyNetLifetimeTotal[ci];
    const photoNetTick = world.creaturePhotoEnergyNetTick[ci];
    const row: LiveRankCandidate = {
      creatureId: ci,
      generation: world.creatureGeneration[ci],
      packId: world.creaturePackId[ci] >= 0 ? world.creaturePackId[ci] : null,
      lineageId: world.creatureClanId[ci] >= 0 ? world.creatureClanId[ci] : null,
      metricMain: '',
      metricSub: '',
      age,
      energyFrac,
      foodTotal,
      foodPlant,
      kills,
      killEfficiency,
      latches,
      photoNetLifetime,
      photoNetTick,
    };
    liveRows.push(row);
  }
  const hallCandidates: HallRankCandidate[] = [];
  for (const record of hallRecords) {
    const row: LeaderboardRowHall = {
      record,
      metricMain: '',
      metricSub: '',
      causeLabel: deathCauseLabelFromCode(record.deathCause),
    };
    const killEfficiency = record.kills / Math.max(1, record.latchesInitiated);
    const candidate: HallRankCandidate = {
      row,
      deathTick: record.deathTick,
      ageAtDeath: record.ageAtDeath,
      foodTotal: record.foodTotalEaten,
      foodPlant: record.foodPlantEaten,
      kills: record.kills,
      killEfficiency,
      latches: record.latchesInitiated,
      photoNetLifetime: record.photoNetLifetime,
    };
    hallCandidates.push(candidate);
  }

  const mapLiveRow = (row: LiveRankCandidate, board: LeaderboardBoard): LeaderboardRowLive => {
    if (board === 'survivors') {
      return {
        creatureId: row.creatureId,
        generation: row.generation,
        packId: row.packId,
        lineageId: row.lineageId,
        metricMain: `Age ${row.age}`,
        metricSub: `Energy ${(row.energyFrac * 100).toFixed(1)}%`,
      };
    }
    if (board === 'foragers') {
      return {
        creatureId: row.creatureId,
        generation: row.generation,
        packId: row.packId,
        lineageId: row.lineageId,
        metricMain: `Food ${row.foodTotal}`,
        metricSub: `Plant ${row.foodPlant} · Age ${row.age}`,
      };
    }
    if (board === 'hunters') {
      return {
        creatureId: row.creatureId,
        generation: row.generation,
        packId: row.packId,
        lineageId: row.lineageId,
        metricMain: `Kills ${row.kills}`,
        metricSub: `Eff ${(row.killEfficiency * 100).toFixed(0)}% · Latch ${row.latches}`,
      };
    }
    return {
      creatureId: row.creatureId,
      generation: row.generation,
      packId: row.packId,
      lineageId: row.lineageId,
      metricMain: `Photo ${row.photoNetLifetime.toFixed(1)}`,
      metricSub: `Tick ${row.photoNetTick.toFixed(2)} · Age ${row.age}`,
    };
  };

  const mapHallRow = (candidate: HallRankCandidate, board: LeaderboardBoard): LeaderboardRowHall => {
    if (board === 'survivors') {
      return {
        ...candidate.row,
        metricMain: `Age ${candidate.ageAtDeath}`,
        metricSub: `Food ${candidate.foodTotal}`,
      };
    }
    if (board === 'foragers') {
      return {
        ...candidate.row,
        metricMain: `Food ${candidate.foodTotal}`,
        metricSub: `Plant ${candidate.foodPlant} · Age ${candidate.ageAtDeath}`,
      };
    }
    if (board === 'hunters') {
      return {
        ...candidate.row,
        metricMain: `Kills ${candidate.kills}`,
        metricSub: `Eff ${(candidate.killEfficiency * 100).toFixed(0)}% · Latch ${candidate.latches}`,
      };
    }
    return {
      ...candidate.row,
      metricMain: `Photo ${candidate.photoNetLifetime.toFixed(1)}`,
      metricSub: `Age ${candidate.ageAtDeath}`,
    };
  };

  const survivorLive = [...liveRows]
    .sort((a, b) => (b.age - a.age) || (b.energyFrac - a.energyFrac) || (a.creatureId - b.creatureId))
    .slice(0, LEADERBOARD_TOP_K);
  const foragerLive = [...liveRows]
    .sort((a, b) => (b.foodTotal - a.foodTotal) || (b.foodPlant - a.foodPlant) || (b.age - a.age) || (a.creatureId - b.creatureId))
    .slice(0, LEADERBOARD_TOP_K);
  const hunterLive = [...liveRows]
    .sort((a, b) => (b.kills - a.kills) || (b.killEfficiency - a.killEfficiency) || (b.latches - a.latches) || (a.creatureId - b.creatureId))
    .slice(0, LEADERBOARD_TOP_K);
  const solarLive = [...liveRows]
    .sort((a, b) => (b.photoNetLifetime - a.photoNetLifetime) || (b.photoNetTick - a.photoNetTick) || (b.age - a.age) || (a.creatureId - b.creatureId))
    .slice(0, LEADERBOARD_TOP_K);
  const survivorHall = [...hallCandidates]
    .sort((a, b) => (b.ageAtDeath - a.ageAtDeath) || (b.deathTick - a.deathTick))
    .slice(0, LEADERBOARD_TOP_K);
  const foragerHall = [...hallCandidates]
    .sort((a, b) => (b.foodTotal - a.foodTotal) || (b.foodPlant - a.foodPlant) || (b.ageAtDeath - a.ageAtDeath) || (b.deathTick - a.deathTick))
    .slice(0, LEADERBOARD_TOP_K);
  const hunterHall = [...hallCandidates]
    .sort((a, b) => (b.kills - a.kills) || (b.killEfficiency - a.killEfficiency) || (b.latches - a.latches) || (b.deathTick - a.deathTick))
    .slice(0, LEADERBOARD_TOP_K);
  const solarHall = [...hallCandidates]
    .sort((a, b) => (b.photoNetLifetime - a.photoNetLifetime) || (b.ageAtDeath - a.ageAtDeath) || (b.deathTick - a.deathTick))
    .slice(0, LEADERBOARD_TOP_K);

  const fillLiveTopK = (rows: LeaderboardRowLive[]): Array<LeaderboardRowLive | LeaderboardPlaceholderRow> => {
    const out: Array<LeaderboardRowLive | LeaderboardPlaceholderRow> = [...rows];
    while (out.length < LEADERBOARD_TOP_K) {
      out.push({ placeholder: true, label: 'No entry' });
    }
    return out;
  };
  const fillHallTopK = (rows: LeaderboardRowHall[]): Array<LeaderboardRowHall | LeaderboardPlaceholderRow> => {
    const out: Array<LeaderboardRowHall | LeaderboardPlaceholderRow> = [...rows];
    while (out.length < LEADERBOARD_TOP_K) {
      out.push({ placeholder: true, label: 'No record' });
    }
    return out;
  };

  return {
    boards: {
      survivors: {
        live: fillLiveTopK(survivorLive.map((row) => mapLiveRow(row, 'survivors'))),
        hall: fillHallTopK(survivorHall.map((row) => mapHallRow(row, 'survivors'))),
      },
      foragers: {
        live: fillLiveTopK(foragerLive.map((row) => mapLiveRow(row, 'foragers'))),
        hall: fillHallTopK(foragerHall.map((row) => mapHallRow(row, 'foragers'))),
      },
      hunters: {
        live: fillLiveTopK(hunterLive.map((row) => mapLiveRow(row, 'hunters'))),
        hall: fillHallTopK(hunterHall.map((row) => mapHallRow(row, 'hunters'))),
      },
      solar: {
        live: fillLiveTopK(solarLive.map((row) => mapLiveRow(row, 'solar'))),
        hall: fillHallTopK(solarHall.map((row) => mapHallRow(row, 'solar'))),
      },
    },
  };
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
  renderWorldBoundsBackdrop(renderer, overlayCanvas, overlayCtx);
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

function renderWorldBoundsBackdrop(
  renderer: Renderer,
  overlayCanvas: HTMLCanvasElement,
  overlayCtx: CanvasRenderingContext2D,
): void {
  const cam = renderer.camera;
  const zoom = cam.zoom;
  if (!(zoom > 0)) return;

  const halfW = overlayCanvas.width * 0.5;
  const halfH = overlayCanvas.height * 0.5;
  const toScreenX = (wx: number): number => (wx - cam.x) * zoom + halfW;
  const toScreenY = (wy: number): number => (wy - cam.y) * zoom + halfH;

  const worldLeft = toScreenX(0);
  const worldRight = toScreenX(WORLD_SIZE);
  const worldTop = toScreenY(0);
  const worldBottom = toScreenY(WORLD_SIZE);

  const w = overlayCanvas.width;
  const h = overlayCanvas.height;
  const left = Math.max(0, Math.min(w, worldLeft));
  const right = Math.max(0, Math.min(w, worldRight));
  const top = Math.max(0, Math.min(h, worldTop));
  const bottom = Math.max(0, Math.min(h, worldBottom));

  overlayCtx.save();
  // Keep outside-world area subtly distinct from the active simulation area.
  overlayCtx.fillStyle = 'rgba(30, 36, 50, 0.34)';
  if (top > 0) overlayCtx.fillRect(0, 0, w, top);
  if (bottom < h) overlayCtx.fillRect(0, bottom, w, h - bottom);
  if (left > 0 && bottom > top) overlayCtx.fillRect(0, top, left, bottom - top);
  if (right < w && bottom > top) overlayCtx.fillRect(right, top, w - right, bottom - top);

  const intersectsViewport = worldRight > 0 && worldLeft < w && worldBottom > 0 && worldTop < h;
  if (intersectsViewport) {
    const dpr = window.devicePixelRatio || 1;
    const rectW = Math.max(0, right - left);
    const rectH = Math.max(0, bottom - top);
    if (rectW > 0 && rectH > 0) {
      const baseStroke = Math.max(1, 1.1 * dpr);
      overlayCtx.strokeStyle = 'rgba(90, 108, 148, 0.12)';
      overlayCtx.lineWidth = baseStroke * 1.45;
      overlayCtx.strokeRect(left, top, rectW, rectH);

      overlayCtx.strokeStyle = 'rgba(165, 186, 232, 0.22)';
      overlayCtx.lineWidth = baseStroke;
      overlayCtx.strokeRect(left, top, rectW, rectH);
    }
  }
  overlayCtx.restore();
}

function buildInspectedDeathInfo(
  sim: SimulationLoop,
  creatureId: number,
  fallbackPackId: number | null,
  fallbackLineageId: number | null,
  lastWords: string | null,
  record: LeaderboardDeathRecord | null,
): InspectedDeathInfo {
  const world = sim.world;
  const deathCause = record?.deathCause ?? world.creatureLastDeathCause[creatureId];
  const killerId = world.creatureLastDeathKillerId[creatureId];
  let causeLabel = 'Unknown';
  if (deathCause === CREATURE_DEATH_CAUSE_AGE) causeLabel = 'Old age';
  else if (deathCause === CREATURE_DEATH_CAUSE_STARVATION) causeLabel = 'Starvation';
  else if (deathCause === CREATURE_DEATH_CAUSE_KILLED) {
    causeLabel = killerId >= 0 ? `Killed by Creature ${killerId}` : 'Killed';
  }

  return {
    creatureId,
    packId: record ? (record.packId >= 0 ? record.packId : null) : fallbackPackId,
    lineageId: record ? (record.lineageId >= 0 ? record.lineageId : null) : fallbackLineageId,
    causeLabel,
    deathTick: record?.deathTick ?? (world.creatureLastDeathTick[creatureId] >= 0 ? world.creatureLastDeathTick[creatureId] : world.tick),
    killerId: killerId >= 0 ? killerId : null,
    lastWords,
    x: record?.deathX ?? world.creatureLastDeathX[creatureId],
    y: record?.deathY ?? world.creatureLastDeathY[creatureId],
    snapshot: record
      ? {
        generation: record.generation,
        ageAtDeath: record.ageAtDeath,
        foodPlantEaten: record.foodPlantEaten,
        foodMeatEaten: record.foodMeatEaten,
        foodTotalEaten: record.foodTotalEaten,
        latchesInitiated: record.latchesInitiated,
        kills: record.kills,
        latchLosses: record.latchLosses,
        timesLatchedOn: record.timesLatchedOn,
        photoGainTick: record.photoGainTick,
        photoNetTick: record.photoNetTick,
        photoNetLifetime: record.photoNetLifetime,
        blobTotal: record.blobTotal,
        blobCore: record.blobCore,
        blobMouth: record.blobMouth,
        blobShield: record.blobShield,
        blobSensor: record.blobSensor,
        blobWeapon: record.blobWeapon,
        blobReproducer: record.blobReproducer,
        blobMotor: record.blobMotor,
        blobFat: record.blobFat,
        blobPhotosynthesizer: record.blobPhotosynthesizer,
        blobAdhesion: record.blobAdhesion,
      }
      : null,
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
  healthFracSum: number;
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
        healthFracSum: 0,
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
    const ciMaxHealth = Math.max(1, world.creatureMaxHealth[ci]);
    stats.energyFracSum += world.creatureEnergy[ci] / ciMaxEnergy;
    stats.healthFracSum += world.creatureHealth[ci] / ciMaxHealth;
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
  let packAvgHealthFrac: number | null = null;
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
    packAvgHealthFrac = selfPackStats.healthFracSum / Math.max(1, selfPackStats.size);
    packAvgSizeScale = selfPackStats.sizeScaleSum / Math.max(1, selfPackStats.size);
  } else if (selfPackStats) {
    packMembership = 'Singleton';
    packSize = selfPackStats.size;
    packPredatorCount = selfPackStats.predatorCount;
    packAvgEnergyFrac = selfPackStats.energyFracSum / Math.max(1, selfPackStats.size);
    packAvgHealthFrac = selfPackStats.healthFracSum / Math.max(1, selfPackStats.size);
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
    .sort((a, b) => a[0] - b[0]);
  const blobCountsByType = new Map<number, number>(blobCounts);
  const orderedBlobCounts = BODY_BLOB_TYPE_ORDER
    .map((type) => ({ label: BLOB_TYPE_LABELS[type] ?? `Type ${type}`, count: blobCountsByType.get(type) ?? 0 }));

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
  const health = world.creatureHealth[creatureId];
  const maxHealth = Math.max(1, world.creatureMaxHealth[creatureId]);
  const healthFrac = health / maxHealth;
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
      health,
      maxHealth,
      healthFrac,
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
      avgHealthFrac: packAvgHealthFrac,
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
      blobCounts: orderedBlobCounts,
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
  nodeRadiusMult: number,
  moduleColors: boolean,
  foregroundPredatorFlags: Uint8Array,
) {
  const { buffers } = renderer;
  const w = sim.world;
  let count = 0;
  // Draw normal creatures first, then active predation/carcass predators on top.
  for (let pass = 0; pass < 2; pass++) {
    const drawForeground = pass === 1;
    for (let si = 0; si < w.blobCount; si++) {
      const i = w.activeBlobIds[si];
      const ci = w.blobCreature[i];
      const isForeground = ci >= 0 && foregroundPredatorFlags[ci] === 1;
      if (isForeground !== drawForeground) continue;

      const offset = count * BLOB_FLOATS;
      const type = w.blobType[i] as BlobType;

      buffers.blobData[offset + 0] = w.blobX[i];
      buffers.blobData[offset + 1] = w.blobY[i];
      const typeMult = RENDER_RADIUS_BY_TYPE[type] ?? RENDER_RADIUS_MULT;
      buffers.blobData[offset + 2] = w.blobRadius[i] * typeMult * nodeRadiusMult;

      const [r, g, b] = blobColorForMode(w, ci, type, viewMode, moduleColors);
      const style = creatureBodyStyle(w, ci, r, g, b, highlight);
      buffers.blobData[offset + 3] = style.r;
      buffers.blobData[offset + 4] = style.g;
      buffers.blobData[offset + 5] = style.b;
      buffers.blobData[offset + 6] = style.a;
      buffers.blobData[offset + 7] = type as number;
      buffers.blobData[offset + 8] = ci >= 0 ? (ci + 1) : 0;

      count++;
    }
  }
  buffers.blobCount = count;
}

type CreatureBodyStyle = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function creatureBodyStyle(
  world: SimulationLoop['world'],
  creatureId: number,
  baseR: number,
  baseG: number,
  baseB: number,
  highlight: HoverHighlightContext,
): CreatureBodyStyle {
  let outR = baseR;
  let outG = baseG;
  let outB = baseB;
  let outA = 1.0;
  const hasInspectionTarget = highlight.hoveredCreatureId >= 0;
  if (hasInspectionTarget && creatureId >= 0 && world.creatureAlive[creatureId]) {
    const isHoveredTarget = creatureId === highlight.hoveredCreatureId;
    const isLockedTarget = highlight.lockedCreatureId >= 0 && creatureId === highlight.lockedCreatureId;
    const isLatchLinked = !!highlight.latchedCreatureIds?.has(creatureId);
    if (highlight.isPaused) {
      const isHoveredPackmate = highlight.hoveredPackId >= 0 && world.creaturePackId[creatureId] === highlight.hoveredPackId;
      if (isHoveredTarget || isHoveredPackmate || isLatchLinked) {
        if (isLockedTarget) {
          outR = 1.0;
          outG = 0.78;
          outB = 0.12;
          outA = 1.0;
        } else if (isLatchLinked) {
          outR = 0.42;
          outG = 0.42;
          outB = 0.42;
          outA = 1.0;
        } else {
          const whiteBlend = isHoveredTarget ? 0.96 : 0.78;
          outR = baseR + (1 - baseR) * whiteBlend;
          outG = baseG + (1 - baseG) * whiteBlend;
          outB = baseB + (1 - baseB) * whiteBlend;
          outA = 1.0;
        }
      } else {
        outA = 0;
      }
    } else if (isLockedTarget) {
      outR = 1.0;
      outG = 0.78;
      outB = 0.12;
      outA = 1.0;
    }
  } else if (highlight.isPaused && hasInspectionTarget) {
    outA = 0;
  }
  return {
    r: Math.max(0, Math.min(1, outR)),
    g: Math.max(0, Math.min(1, outG)),
    b: Math.max(0, Math.min(1, outB)),
    a: Math.max(0, Math.min(1, outA)),
  };
}

function packLinksForGpu(
  sim: SimulationLoop,
  renderer: Renderer,
  viewMode: ViewMode,
  highlight: HoverHighlightContext,
  linkThicknessMult: number,
  moduleColors: boolean,
  foregroundPredatorFlags: Uint8Array,
) {
  const { buffers } = renderer;
  const w = sim.world;
  let count = 0;
  const maxInstances = Math.floor(buffers.linkData.length / LINK_FLOATS);
  // Draw normal creatures first, then active predation/carcass predators on top.
  for (let pass = 0; pass < 2; pass++) {
    if (count >= maxInstances) break;
    const drawForeground = pass === 1;
    for (let c = 0; c < w.constraintCount; c++) {
      if (count >= maxInstances) break;
      const a = w.constraintA[c];
      const b = w.constraintB[c];
      if (a < 0 || b < 0) continue;
      if (!w.blobAlive[a] || !w.blobAlive[b]) continue;
      const ci = w.blobCreature[a];
      if (ci < 0 || !w.creatureAlive[ci]) continue;
      if (w.blobCreature[b] !== ci) continue;
      const isForeground = foregroundPredatorFlags[ci] === 1;
      if (isForeground !== drawForeground) continue;

      const aType = w.blobType[a] as BlobType;
      const bType = w.blobType[b] as BlobType;
      const [baseR, baseG, baseB] = linkColorForMode(w, ci, aType, bType, viewMode, moduleColors);
      const style = creatureBodyStyle(w, ci, baseR, baseG, baseB, highlight);
      if (style.a <= 0.001) continue;

      const thickness = Math.max(0.8, ((w.blobRadius[a] + w.blobRadius[b]) * 0.5) * linkThicknessMult);
      const offset = count * LINK_FLOATS;
      buffers.linkData[offset + 0] = w.blobX[a];
      buffers.linkData[offset + 1] = w.blobY[a];
      buffers.linkData[offset + 2] = w.blobX[b];
      buffers.linkData[offset + 3] = w.blobY[b];
      buffers.linkData[offset + 4] = thickness;
      buffers.linkData[offset + 5] = style.r;
      buffers.linkData[offset + 6] = style.g;
      buffers.linkData[offset + 7] = style.b;
      buffers.linkData[offset + 8] = style.a;
      buffers.linkData[offset + 9] = ci + 1;
      count++;
    }
  }
  buffers.linkCount = count;
}

function populateForegroundPredatorFlags(world: SimulationLoop['world']): Uint8Array {
  _foregroundPredatorFlags.fill(0);
  for (let ci = 0; ci < world.creatureAlive.length; ci++) {
    if (!world.creatureAlive[ci]) continue;
    if (world.creatureCarcassAlive[ci] === 1) {
      _foregroundPredatorFlags[ci] = 1;
    }
  }
  for (let li = 0; li < world.latchCount; li++) {
    const predatorCi = world.latchWeaponCreature[li];
    if (predatorCi < 0 || predatorCi >= world.creatureAlive.length) continue;
    if (!world.creatureAlive[predatorCi]) continue;
    _foregroundPredatorFlags[predatorCi] = 1;
  }
  return _foregroundPredatorFlags;
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
      alpha = 1 - (t * t * (3 - 2 * t)) * (1 - FOOD_VISUAL_MIN_ALPHA);
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
    const alpha = 0.96 - carcassAgeNorm * 0.42;
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
      buffers.foodData[offset + 3] = Math.max(CARRIED_MEAT_VISUAL_MIN_ALPHA, alpha);
      buffers.foodData[offset + 4] = FOOD_KIND_CARRIED_MEAT_MARKER; // carried meat (render-only kind for distinct styling)
      buffers.foodData[offset + 5] = carcassAgeNorm;
      count++;
      carriedRendered++;
    }
  }

  const solidCount = count;

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

  buffers.foodSolidCount = solidCount;
  buffers.foodMarkerCount = Math.max(0, count - solidCount);
  buffers.foodCount = count;
}

function pickHoveredCreature(
  sim: SimulationLoop,
  renderer: Renderer,
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  nodeRadiusMult: number,
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
    const renderRadius = w.blobRadius[bi] * typeMult * nodeRadiusMult;
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

function creatureBaseColor(hue: number): [number, number, number] {
  return hslToRgb(hue, 0.74, 0.56);
}

function moduleLegendColor(hue: number, type: BlobType): [number, number, number] {
  // Fixed-hue types: matches legend mapping.
  switch (type) {
    case BlobType.MOUTH:           return hslToRgb(0.07, 0.85, 0.50);
    case BlobType.SHIELD:          return hslToRgb(0.58, 0.12, 0.35);
    case BlobType.SENSOR:          return hslToRgb(0.15, 0.50, 0.80);
    case BlobType.WEAPON:          return hslToRgb(0.00, 0.90, 0.45);
    case BlobType.REPRODUCER:      return hslToRgb(0.88, 0.70, 0.60);
    case BlobType.PHOTOSYNTHESIZER: return hslToRgb(0.33, 0.80, 0.55);
    case BlobType.ADHESION:        return hslToRgb(0.50, 0.60, 0.50);
  }
  // Relative-hue types: based on creature hue.
  switch (type) {
    case BlobType.CORE:  return hslToRgb(hue, 0.85, 0.70);
    case BlobType.MOTOR: return hslToRgb(hue, 0.35, 0.40);
    case BlobType.FAT:   return hslToRgb(hue, 0.15, 0.55);
    default:             return hslToRgb(hue, 0.70, 0.55);
  }
}

function blobColorForMode(
  world: SimulationLoop['world'],
  creatureId: number,
  type: BlobType,
  mode: ViewMode,
  moduleColors: boolean,
): [number, number, number] {
  if (creatureId < 0 || !world.creatureAlive[creatureId]) {
    return creatureBaseColor(0.5);
  }
  const clanId = world.creatureClanId[creatureId];
  const packId = world.creaturePackId[creatureId];
  if (mode === ViewMode.CLAN) return clanColor(clanId);
  if (mode === ViewMode.PACK) return packColor(packId);
  const genome = world.creatureGenome[creatureId];
  const baseHue = genome ? genome.baseHue : 0.5;
  if (moduleColors) return moduleLegendColor(baseHue, type);
  return creatureBaseColor(baseHue);
}

function linkColorForMode(
  world: SimulationLoop['world'],
  creatureId: number,
  typeA: BlobType,
  typeB: BlobType,
  mode: ViewMode,
  moduleColors: boolean,
): [number, number, number] {
  if (mode !== ViewMode.NORMAL || !moduleColors) {
    return blobColorForMode(world, creatureId, BlobType.CORE, mode, false);
  }
  const genome = (creatureId >= 0 && world.creatureAlive[creatureId])
    ? world.creatureGenome[creatureId]
    : null;
  const hue = genome ? genome.baseHue : 0.5;
  const [r1, g1, b1] = moduleLegendColor(hue, typeA);
  const [r2, g2, b2] = moduleLegendColor(hue, typeB);
  return [(r1 + r2) * 0.5, (g1 + g2) * 0.5, (b1 + b2) * 0.5];
}

function viewModeLabel(mode: ViewMode): string {
  switch (mode) {
    case ViewMode.PACK: return 'Pack';
    case ViewMode.CLAN: return 'Clan';
    default: return 'Normal';
  }
}

function viewModeToSocialColorMode(mode: ViewMode, genomeColorEnabled: boolean): SocialColorMode {
  switch (mode) {
    case ViewMode.PACK: return 'Pack';
    case ViewMode.CLAN: return 'Clan';
    default: return genomeColorEnabled ? 'NormalGenome' : 'NormalPart';
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
    const dpr = window.devicePixelRatio || 1;
    renderer.camera.pan((e.clientX - lastMx) * dpr, (e.clientY - lastMy) * dpr);
    lastMx = e.clientX;
    lastMy = e.clientY;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const pivotX = (e.clientX - rect.left) * dpr;
    const pivotY = (e.clientY - rect.top) * dpr;
    renderer.camera.zoomBy(factor, pivotX, pivotY);
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

function loadFlatModeEnabled(): boolean {
  try {
    const raw = window.localStorage.getItem(FLAT_MODE_STORAGE_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    // Ignore storage errors and fallback to default.
  }
  return false;
}

function saveFlatModeEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(FLAT_MODE_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore storage errors; runtime toggle still works for current session.
  }
}

function loadSocialColorMode(): SocialColorMode | null {
  try {
    const raw = window.localStorage.getItem(SOCIAL_COLOR_MODE_STORAGE_KEY);
    if (isSocialColorMode(raw)) return raw;
  } catch {
    // Ignore storage errors and fallback to default.
  }
  return null;
}

function saveSocialColorMode(mode: SocialColorMode): void {
  try {
    window.localStorage.setItem(SOCIAL_COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors; runtime mode still works for current session.
  }
}

function loadLastNormalSocialColorMode(): NormalSocialColorMode | null {
  try {
    const raw = window.localStorage.getItem(LAST_NORMAL_SOCIAL_MODE_STORAGE_KEY);
    if (raw === 'NormalPart' || raw === 'NormalGenome') return raw;
  } catch {
    // Ignore storage errors and fallback to default.
  }
  return null;
}

function saveLastNormalSocialColorMode(mode: NormalSocialColorMode): void {
  try {
    window.localStorage.setItem(LAST_NORMAL_SOCIAL_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors; runtime mode still works for current session.
  }
}

function isSocialColorMode(mode: string | null): mode is SocialColorMode {
  return mode === 'NormalPart' || mode === 'NormalGenome' || mode === 'Pack' || mode === 'Clan';
}
