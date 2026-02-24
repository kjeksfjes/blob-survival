import {
  THOUGHT_LATCH_TARGET_DANGER_TEMPLATES,
  THOUGHT_PRIMARY_TEMPLATES,
  THOUGHT_SECONDARY_LINES,
  type SecondaryThoughtKey,
  type ThoughtAxis,
  type ThoughtReason,
  type ThoughtTone,
} from './inspector-thoughts';

export type CreatureInspectorPayload = {
  creatureId: number;
  packId: number | null;
  lineageId: number | null;
  locked: boolean;
  badges: {
    leader: boolean;
    scout: boolean;
    predator: boolean;
    solo: boolean;
  };
  status: {
    intent: string;
    energy: number;
    maxEnergy: number;
    energyFrac: number;
    age: number;
    maxAge: number;
    remainingAge: number;
    sizeScale: number;
    adultGoal: number;
  };
  packInfo: {
    id: number | null;
    membership: string;
    size: number;
    leaderId: number | null;
    scoutId: number | null;
    predatorCount: number;
    avgEnergyFrac: number | null;
    avgSizeScale: number | null;
    anchorDistance: number | null;
  };
  regroup: {
    source: string;
    targetDistance: number | null;
    isolated: boolean;
    urgent: boolean;
  };
  activity: {
    foodPlantEaten: number;
    foodMeatEaten: number;
    foodTotalEaten: number;
    photoGainTick: number;
    photoNetTick: number;
    photoNetLifetime: number;
    latchesInitiated: number;
    kills: number;
    latchLosses: number;
    timesLatchedOn: number;
  };
  runtime: {
    fearTimer: number;
    packIsolationTimer: number;
    packSeekTimer: number;
    hasSensedFood: boolean;
    hasSensedThreat: boolean;
    hasActiveLatch: boolean;
    hasLatchAsTarget: boolean;
    hasWeapon: boolean;
    nearPrey: boolean;
    hasHuntTarget: boolean;
    sensedFoodKind: 'None' | 'Plant' | 'Meat';
    foodSignalStrength: number;
    foodSignalHop: number;
    foodSignalAge: number;
    predatorDigestTimer: number;
    predatorFullTimer: number;
  };
  advanced: {
    blobTotal: number;
    blobCounts: Array<{ label: string; count: number }>;
    reproduction: {
      cooldown: number;
      mateTimer: number;
      energyFrac: number;
      sizeMature: boolean;
    };
    predation: {
      activeLatchCount: number;
      carryingCarcass: boolean;
      carcassEnergyFrac: number | null;
      lastAttackerId: number | null;
    };
  };
};

export type InspectorUpdateState = {
  visible: boolean;
  paused: boolean;
  payload: CreatureInspectorPayload | null;
  deceased: InspectorDeceasedInfo | null;
};

export type InspectorDeceasedInfo = {
  creatureId: number;
  packId: number | null;
  lineageId: number | null;
  causeLabel: string;
  deathTick: number;
  killerId: number | null;
  lastWords: string | null;
};

type InspectorHelpKey =
  | 'status'
  | 'thoughts'
  | 'thought_primary'
  | 'thought_secondary'
  | 'intent'
  | 'energy'
  | 'age'
  | 'size'
  | 'pack_info'
  | 'pack'
  | 'membership'
  | 'members'
  | 'leader'
  | 'scout'
  | 'predators'
  | 'avg_energy'
  | 'avg_size'
  | 'anchor_distance'
  | 'regroup'
  | 'regroup_source'
  | 'regroup_target_distance'
  | 'isolated'
  | 'urgent'
  | 'activity'
  | 'food_plant_eaten'
  | 'food_meat_eaten'
  | 'food_total_eaten'
  | 'photo_gain_tick'
  | 'photo_net_tick'
  | 'photo_net_lifetime'
  | 'latches_initiated'
  | 'kills'
  | 'latch_losses'
  | 'times_latched_on'
  | 'advanced'
  | 'body'
  | 'total_blobs'
  | 'reproduction'
  | 'cooldown'
  | 'mate_timer'
  | 'energy_frac'
  | 'size_mature'
  | 'predation'
  | 'active_latches'
  | 'carrying_carcass'
  | 'carcass_energy'
  | 'last_attacker'
  | 'last_words';

const INSPECTOR_HELP: Record<InspectorHelpKey, string> = {
  status: 'Current state of this creature: behavior intent, reserves, age, and size growth.',
  thoughts: 'Natural-language readout synthesized from current runtime state and social context.',
  thought_primary: 'Current dominant thought right now.',
  thought_secondary: 'Secondary status signal that complements the current thought.',
  intent: 'High-level steering mode currently dominating behavior.',
  energy: 'Current energy reserve versus this creature\'s current max capacity.',
  age: 'Current age, lifespan cap, and remaining lifetime ticks.',
  size: 'Current lifecycle size scale and current adult-scale goal.',
  pack_info: 'Pack-level context for this creature, including composition and aggregate condition.',
  pack: 'Pack ID. Solo means no pack assignment.',
  membership: 'Pack validity state under formal rule: valid packs require at least 2 members.',
  members: 'Total currently alive creatures assigned to this pack ID.',
  leader: 'Current pack leader creature ID, if assigned.',
  scout: 'Current pack scout creature ID, if assigned.',
  predators: 'Number of weapon-bearing creatures currently in this pack.',
  avg_energy: 'Average energy fill ratio across current pack members.',
  avg_size: 'Average lifecycle size scale across current pack members.',
  anchor_distance: 'Distance from this creature to pack centroid anchor.',
  regroup: 'Current regroup diagnostics used by flocking logic.',
  regroup_source: 'Dominant regroup steering source chosen this tick.',
  regroup_target_distance: 'Distance from this creature to current regroup target point.',
  isolated: 'Whether this creature is marked isolated from pack neighbors.',
  urgent: 'Whether creature is currently in urgent regroup mode.',
  activity: 'Lifetime action counters for this creature in its current life.',
  food_plant_eaten: 'Count of plant food pellets this creature has eaten.',
  food_meat_eaten: 'Count of meat food pellets this creature has eaten.',
  food_total_eaten: 'Total eaten pellets (plant + meat).',
  photo_gain_tick: 'Raw photosynthesis income this tick before photosynthesis maintenance costs.',
  photo_net_tick: 'Photosynthesis net this tick after photosynthesis maintenance costs.',
  photo_net_lifetime: 'Lifetime net photosynthesis gained in this life (positive contribution only).',
  latches_initiated: 'How many successful latch events this creature initiated.',
  kills: 'How many creatures this creature has killed.',
  latch_losses: 'How many initiated latches ended without a kill (escape/loss).',
  times_latched_on: 'How many times this creature was latched onto by others.',
  advanced: 'Expanded diagnostics: body composition, reproduction, and predation state.',
  body: 'Body topology summary for this creature.',
  total_blobs: 'Total blobs composing this creature body.',
  reproduction: 'Reproduction-gating and timing diagnostics.',
  cooldown: 'Ticks remaining before this creature can reproduce again.',
  mate_timer: 'Ticks spent/remaining in mate-seeking phase before fallback behavior.',
  energy_frac: 'Energy as fraction of max; used by multiple ecology gates.',
  size_mature: 'Whether lifecycle size gate currently allows reproduction.',
  predation: 'Predation and carcass-carry state diagnostics.',
  active_latches: 'Number of active latches involving this creature (attacker or target).',
  carrying_carcass: 'Whether this creature is currently carrying/consuming a carcass.',
  carcass_energy: 'Remaining carcass energy ratio for carried carcass, if any.',
  last_attacker: 'Most recent attacker creature ID recorded for this creature.',
  last_words: 'Final captured thought for this creature at death.',
};

const INSPECTOR_HELP_TOOLTIP_ID = 'inspector-help-tooltip';
const INSPECTOR_HELP_TOOLTIP_STYLE_ID = 'inspector-help-tooltip-style';
const INSPECTOR_HELP_TOOLTIP_OFFSET = 14;
const INSPECTOR_HELP_TOOLTIP_MARGIN = 10;
const THOUGHT_RUNNING_EVAL_MS = 3000;
const THOUGHT_LATCH_ESCAPE_WINDOW_MS = 4000;

type ThoughtResult = {
  primary: string;
  secondary: string | null;
  secondaryKey: SecondaryThoughtKey | null;
  reasonKey: ThoughtReason;
  tone: ThoughtTone;
  axis: ThoughtAxis;
  critical: boolean;
  majorOverride: boolean;
  stateKey: string;
  updatedAtMs: number;
  renderToken: string;
};

function fmtId(id: number | null): string {
  return id === null || id < 0 ? 'None' : `${id}`;
}

function fmtDist(v: number | null): string {
  return v === null ? 'n/a' : `${v.toFixed(1)}`;
}

function fmtPct(v: number | null): string {
  return v === null ? 'n/a' : `${(v * 100).toFixed(1)}%`;
}

function boolChip(value: boolean, trueText = 'Yes', falseText = 'No'): string {
  const klass = value ? 'inspector-chip on' : 'inspector-chip off';
  return `<span class="${klass}">${value ? trueText : falseText}</span>`;
}

function escHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function helpLabel(label: string, helpKey: InspectorHelpKey): string {
  const helpText = INSPECTOR_HELP[helpKey];
  const aria = `${label}. ${helpText}`;
  return `<span class="inspector-help-label" data-inspector-help="${helpKey}" aria-label="${escHtml(aria)}">${label}</span>`;
}

function sectionTitle(label: string, helpKey: InspectorHelpKey): string {
  return `<div class="inspector-sec-title">${helpLabel(label, helpKey)}</div>`;
}

function row(label: string, value: string, helpKey?: InspectorHelpKey): string {
  const renderedLabel = helpKey ? helpLabel(label, helpKey) : label;
  return `<div class="inspector-row"><span class="inspector-k">${renderedLabel}</span><span class="inspector-v">${value}</span></div>`;
}

function randomTemplate(templates: readonly string[]): string {
  return templates[Math.floor(Math.random() * templates.length)];
}

type ThoughtCandidate = {
  reasonKey: ThoughtReason;
  tone: ThoughtTone;
  axis: ThoughtAxis;
  critical: boolean;
  major: boolean;
  score: number;
};

function thoughtStateKey(payload: CreatureInspectorPayload, latchEscapeActive: boolean): string {
  return [
    payload.status.intent,
    Math.floor(payload.status.energyFrac * 20),
    payload.runtime.fearTimer > 0 ? 1 : 0,
    payload.runtime.hasSensedThreat ? 1 : 0,
    payload.runtime.hasActiveLatch ? 1 : 0,
    payload.runtime.hasLatchAsTarget ? 1 : 0,
    payload.runtime.hasWeapon ? 1 : 0,
    payload.runtime.nearPrey ? 1 : 0,
    payload.runtime.hasHuntTarget ? 1 : 0,
    payload.runtime.hasSensedFood ? 1 : 0,
    payload.runtime.sensedFoodKind,
    payload.badges.scout ? 1 : 0,
    payload.regroup.urgent ? 1 : 0,
    payload.regroup.isolated ? 1 : 0,
    latchEscapeActive ? 1 : 0,
    payload.advanced.predation.carryingCarcass ? 1 : 0,
    Math.floor(payload.runtime.foodSignalStrength * 10),
    Math.floor(Math.max(0, payload.runtime.predatorDigestTimer) / 10),
    Math.floor(Math.max(0, payload.runtime.predatorFullTimer) / 10),
    Math.floor(Math.max(0, payload.runtime.packIsolationTimer) / 10),
  ].join('|');
}

function primaryCandidates(payload: CreatureInspectorPayload, latchEscapeActive: boolean): ThoughtCandidate[] {
  const energyFrac = payload.status.energyFrac;
  const threatActive = payload.runtime.hasSensedThreat || payload.runtime.fearTimer > 0;
  const victimLatch = payload.runtime.hasLatchAsTarget;
  const immediateDanger = victimLatch || threatActive || payload.runtime.fearTimer >= 16;
  const predatorLatched = payload.badges.predator && payload.runtime.hasActiveLatch;
  const predatorHuntPursuit =
    payload.badges.predator &&
    !predatorLatched &&
    (payload.runtime.nearPrey || payload.runtime.hasHuntTarget || payload.status.intent === 'Hunt');
  const predatorFeeding =
    payload.badges.predator &&
    payload.advanced.predation.carryingCarcass;
  const predatorDigesting =
    payload.badges.predator &&
    !predatorFeeding &&
    payload.runtime.predatorDigestTimer > 0 &&
    payload.runtime.predatorFullTimer > 0;
  const criticalHunger = energyFrac <= 0.20;
  const reluctantCarrion =
    !payload.badges.predator &&
    energyFrac <= 0.34 &&
    (payload.runtime.sensedFoodKind === 'Meat' || payload.advanced.predation.carryingCarcass);
  const scoutReporting =
    payload.badges.scout &&
    payload.runtime.hasSensedFood &&
    payload.runtime.sensedFoodKind === 'Plant' &&
    payload.runtime.foodSignalStrength >= 0.12;
  const urgentRegroup = payload.regroup.urgent || (payload.regroup.isolated && payload.runtime.packIsolationTimer >= 20);

  const candidates: ThoughtCandidate[] = [];
  if (immediateDanger) {
    const fearBoost = Math.min(60, payload.runtime.fearTimer);
    candidates.push({
      reasonKey: 'danger_immediate',
      tone: 'danger',
      axis: 'danger',
      critical: true,
      major: victimLatch,
      score: 900 + fearBoost + (victimLatch ? 40 : 0),
    });
  }
  if (!victimLatch && latchEscapeActive) {
    candidates.push({
      reasonKey: 'escaped_latch_relief',
      tone: 'social',
      axis: 'social',
      critical: false,
      major: false,
      score: 780,
    });
  }
  if (predatorLatched) {
    const latchPressure = 40 + (payload.runtime.nearPrey ? 20 : 0) + (payload.runtime.hasHuntTarget ? 10 : 0);
    candidates.push({
      reasonKey: 'predator_latched',
      tone: 'hunt',
      axis: 'mission',
      critical: true,
      major: true,
      score: 860 + latchPressure,
    });
  } else if (predatorHuntPursuit) {
    const pressure = (payload.runtime.nearPrey ? 25 : 0) + (payload.runtime.hasHuntTarget ? 20 : 0) + (payload.status.intent === 'Hunt' ? 10 : 0);
    candidates.push({
      reasonKey: 'hunt_commit',
      tone: 'hunt',
      axis: 'mission',
      critical: true,
      major: false,
      score: 800 + pressure,
    });
  }
  if (predatorFeeding) {
    const digestBoost = Math.min(40, Math.floor(payload.runtime.predatorDigestTimer * 0.35));
    candidates.push({
      reasonKey: 'predator_feeding',
      tone: 'hunt',
      axis: 'mission',
      critical: false,
      major: false,
      score: 760 + digestBoost,
    });
  } else if (predatorDigesting) {
    const digestScore = Math.min(50, Math.floor(payload.runtime.predatorDigestTimer * 0.25));
    candidates.push({
      reasonKey: 'predator_digesting',
      tone: 'calm',
      axis: 'mission',
      critical: false,
      major: false,
      score: 460 + digestScore,
    });
  }
  if (criticalHunger) {
    const hunger = Math.floor((0.20 - energyFrac) * 300);
    candidates.push({
      reasonKey: 'critical_hunger',
      tone: 'hunger',
      axis: 'hunger',
      critical: false,
      major: false,
      score: 700 + Math.max(0, hunger),
    });
  }
  if (reluctantCarrion) {
    const desperation = Math.floor((0.34 - energyFrac) * 160);
    candidates.push({
      reasonKey: 'reluctant_carrion',
      tone: 'hunger',
      axis: 'hunger',
      critical: false,
      major: false,
      score: 600 + Math.max(0, desperation),
    });
  }
  if (scoutReporting) {
    const signalScore = Math.floor(payload.runtime.foodSignalStrength * 120);
    candidates.push({
      reasonKey: 'scout_report',
      tone: 'social',
      axis: 'mission',
      critical: false,
      major: false,
      score: 500 + Math.max(0, signalScore),
    });
  }
  if (urgentRegroup) {
    const isolationScore = Math.min(90, Math.floor(payload.runtime.packIsolationTimer * 0.5));
    candidates.push({
      reasonKey: 'urgent_regroup',
      tone: 'social',
      axis: 'social',
      critical: false,
      major: false,
      score: 400 + isolationScore + (payload.regroup.urgent ? 35 : 0),
    });
  }
  if (payload.status.intent === 'Mate') {
    candidates.push({
      reasonKey: 'mate_intent',
      tone: 'calm',
      axis: 'mission',
      critical: false,
      major: false,
      score: 300,
    });
  }
  if (payload.status.intent === 'Forage') {
    candidates.push({
      reasonKey: 'forage_intent',
      tone: 'calm',
      axis: 'mission',
      critical: false,
      major: false,
      score: 200,
    });
  }
  candidates.push({
    reasonKey: 'calm',
    tone: 'calm',
    axis: 'calm',
    critical: false,
    major: false,
    score: 100,
  });
  return candidates;
}

function pickBestCandidate(candidates: ThoughtCandidate[]): ThoughtCandidate {
  if (candidates.length === 0) {
    return {
      reasonKey: 'calm',
      tone: 'calm',
      axis: 'calm',
      critical: false,
      major: false,
      score: 0,
    };
  }
  let bestScore = -Infinity;
  for (const c of candidates) {
    if (c.score > bestScore) bestScore = c.score;
  }
  const ties = candidates.filter((c) => c.score === bestScore);
  if (ties.length === 1) return ties[0];
  return ties[Math.floor(Math.random() * ties.length)];
}

function isMajorReasonActive(payload: CreatureInspectorPayload, reasonKey: ThoughtReason): boolean {
  if (reasonKey === 'danger_immediate') {
    return payload.runtime.hasLatchAsTarget;
  }
  if (reasonKey === 'escaped_latch_relief') {
    return false;
  }
  if (reasonKey === 'predator_latched') {
    return payload.runtime.hasActiveLatch && payload.badges.predator;
  }
  return false;
}

function primaryTemplates(reasonKey: ThoughtReason): readonly string[] {
  return THOUGHT_PRIMARY_TEMPLATES[reasonKey];
}

function primaryLineForCandidate(
  payload: CreatureInspectorPayload,
  candidate: ThoughtCandidate,
  previous: ThoughtResult | undefined,
): string {
  if (previous && previous.reasonKey === candidate.reasonKey) {
    if (candidate.reasonKey === 'danger_immediate') {
      const previousWasLatchPanic = THOUGHT_LATCH_TARGET_DANGER_TEMPLATES.includes(previous.primary);
      if (previousWasLatchPanic !== payload.runtime.hasLatchAsTarget) {
        // Latch sub-state changed inside same reason; pick line that matches new sub-state.
      } else {
        // Hold wording stable for the duration of this reason/event.
        return previous.primary;
      }
    } else {
    // Hold wording stable for the duration of this reason/event.
      return previous.primary;
    }
  }
  if (candidate.reasonKey === 'danger_immediate' && payload.runtime.hasLatchAsTarget) {
    return randomTemplate(THOUGHT_LATCH_TARGET_DANGER_TEMPLATES);
  }
  return randomTemplate(primaryTemplates(candidate.reasonKey));
}

type SecondaryThoughtResult = {
  key: SecondaryThoughtKey;
  line: string;
};

function pickSecondaryThought(
  key: SecondaryThoughtKey,
  previous: ThoughtResult | undefined,
): SecondaryThoughtResult | null {
  const options = THOUGHT_SECONDARY_LINES[key];
  if (!options || options.length === 0) return null;
  if (previous && previous.secondaryKey === key && previous.secondary && options.includes(previous.secondary)) {
    return { key, line: previous.secondary };
  }
  return { key, line: randomTemplate(options) };
}

function secondaryThoughtForAxis(
  payload: CreatureInspectorPayload,
  primaryAxis: ThoughtAxis,
  previous: ThoughtResult | undefined,
): SecondaryThoughtResult | null {
  const lowEnergy = payload.status.energyFrac <= 0.38;
  const danger = payload.runtime.hasSensedThreat || payload.runtime.fearTimer > 0 || payload.runtime.hasLatchAsTarget;
  const social = payload.regroup.urgent || payload.regroup.isolated || payload.runtime.packSeekTimer > 0;
  const mission =
    payload.badges.scout ||
    payload.status.intent === 'Mate' ||
    payload.status.intent === 'Forage' ||
    (payload.badges.predator && (
      payload.runtime.nearPrey ||
      payload.runtime.hasHuntTarget ||
      payload.advanced.predation.carryingCarcass ||
      payload.runtime.predatorDigestTimer > 0
    ));

  if (primaryAxis !== 'danger' && danger) {
    return payload.runtime.hasLatchAsTarget
      ? pickSecondaryThought('dangerLatched', previous)
      : pickSecondaryThought('dangerThreat', previous);
  }
  if (primaryAxis !== 'hunger' && lowEnergy) {
    return payload.runtime.sensedFoodKind === 'Plant'
      ? pickSecondaryThought('hungerPlant', previous)
      : pickSecondaryThought('hungerGeneric', previous);
  }
  if (primaryAxis !== 'social' && social) {
    return payload.packInfo.membership === 'Valid (>=2)'
      ? pickSecondaryThought('socialPack', previous)
      : pickSecondaryThought('socialSolo', previous);
  }
  if (primaryAxis !== 'mission' && mission) {
    if (payload.badges.scout) return pickSecondaryThought('missionScout', previous);
    if (payload.badges.predator && payload.runtime.hasActiveLatch) return pickSecondaryThought('missionPredatorLatched', previous);
    if (payload.badges.predator && payload.advanced.predation.carryingCarcass) return pickSecondaryThought('missionPredatorFeeding', previous);
    if (payload.badges.predator && payload.runtime.predatorDigestTimer > 0) return pickSecondaryThought('missionPredatorDigesting', previous);
    if (payload.badges.predator) return pickSecondaryThought('missionPredatorGeneric', previous);
    if (payload.status.intent === 'Mate') return pickSecondaryThought('missionMate', previous);
    if (payload.status.intent === 'Forage') return pickSecondaryThought('missionForage', previous);
  }
  return null;
}

function fallbackLastWords(causeLabel: string): string {
  const lower = causeLabel.toLowerCase();
  if (lower.includes('starvation')) return 'Should have found one more bite...';
  if (lower.includes('killed')) return 'Tell the pack I tried.';
  if (lower.includes('old age')) return 'Long run. Worth it.';
  return 'Signal fading...';
}

function ensureInspectorHelpTooltipStyle(): void {
  if (document.getElementById(INSPECTOR_HELP_TOOLTIP_STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = INSPECTOR_HELP_TOOLTIP_STYLE_ID;
  styleEl.textContent = `
    #${INSPECTOR_HELP_TOOLTIP_ID} {
      position: fixed;
      left: 0;
      top: 0;
      z-index: 12001;
      max-width: 320px;
      padding: 8px 10px;
      border: 1px solid rgba(194, 210, 255, 0.36);
      border-radius: 8px;
      background: rgba(18, 24, 40, 0.96);
      color: #e8eeff;
      font-family: 'Menlo', 'Consolas', monospace;
      font-size: 11px;
      line-height: 1.35;
      letter-spacing: 0.01em;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
      pointer-events: none;
      opacity: 0;
      white-space: normal;
      transition: opacity 100ms linear;
    }
    #${INSPECTOR_HELP_TOOLTIP_ID}.is-visible {
      opacity: 1;
    }
  `;
  document.head.appendChild(styleEl);
}

function ensureInspectorHelpTooltipElement(): HTMLDivElement {
  let tooltip = document.getElementById(INSPECTOR_HELP_TOOLTIP_ID) as HTMLDivElement | null;
  if (tooltip) return tooltip;
  tooltip = document.createElement('div');
  tooltip.id = INSPECTOR_HELP_TOOLTIP_ID;
  tooltip.setAttribute('role', 'tooltip');
  document.body.appendChild(tooltip);
  return tooltip;
}

function positionInspectorHelpTooltip(tooltip: HTMLDivElement, x: number, y: number): void {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  let left = x + INSPECTOR_HELP_TOOLTIP_OFFSET;
  let top = y + INSPECTOR_HELP_TOOLTIP_OFFSET;
  const rect = tooltip.getBoundingClientRect();
  if (left + rect.width + INSPECTOR_HELP_TOOLTIP_MARGIN > viewportW) {
    left = x - rect.width - INSPECTOR_HELP_TOOLTIP_OFFSET;
  }
  if (top + rect.height + INSPECTOR_HELP_TOOLTIP_MARGIN > viewportH) {
    top = y - rect.height - INSPECTOR_HELP_TOOLTIP_OFFSET;
  }
  left = Math.max(INSPECTOR_HELP_TOOLTIP_MARGIN, Math.min(left, viewportW - rect.width - INSPECTOR_HELP_TOOLTIP_MARGIN));
  top = Math.max(INSPECTOR_HELP_TOOLTIP_MARGIN, Math.min(top, viewportH - rect.height - INSPECTOR_HELP_TOOLTIP_MARGIN));
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function showInspectorHelpTooltip(helpText: string, x: number, y: number): void {
  ensureInspectorHelpTooltipStyle();
  const tooltip = ensureInspectorHelpTooltipElement();
  tooltip.textContent = helpText;
  tooltip.classList.add('is-visible');
  positionInspectorHelpTooltip(tooltip, x, y);
}

function moveInspectorHelpTooltip(x: number, y: number): void {
  const tooltip = document.getElementById(INSPECTOR_HELP_TOOLTIP_ID) as HTMLDivElement | null;
  if (!tooltip || !tooltip.classList.contains('is-visible')) return;
  positionInspectorHelpTooltip(tooltip, x, y);
}

function hideInspectorHelpTooltip(): void {
  const tooltip = document.getElementById(INSPECTOR_HELP_TOOLTIP_ID) as HTMLDivElement | null;
  if (!tooltip) return;
  tooltip.classList.remove('is-visible');
}

function getHelpTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest('[data-inspector-help]') as HTMLElement | null;
}

export class Inspector {
  private readonly el: HTMLElement;
  private readonly onClose?: () => void;
  private advancedOpen = false;
  private lastRenderKey = '';
  private dragEnabled = false;
  private isDragging = false;
  private dragPointerId = -1;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private hasCustomPosition = false;
  private readonly thoughtByCreature = new Map<number, ThoughtResult>();
  private readonly lastThoughtByCreature = new Map<number, string>();
  private readonly wasLatchTargetByCreature = new Map<number, boolean>();
  private readonly latchEscapeUntilByCreature = new Map<number, number>();

  constructor(options?: { onClose?: () => void }) {
    this.el = document.getElementById('inspector') as HTMLElement;
    this.onClose = options?.onClose;
    this.bindHelpTooltipEvents();
    this.bindDragEvents();
  }

  private setGlobalDragCursor(active: boolean): void {
    document.body.style.cursor = active ? 'grabbing' : '';
  }

  getLastThoughtForCreature(creatureId: number): string | null {
    const text = this.lastThoughtByCreature.get(creatureId);
    return text && text.length > 0 ? text : null;
  }

  private resolveThought(payload: CreatureInspectorPayload, paused: boolean, nowMs: number): ThoughtResult {
    const wasLatchTarget = this.wasLatchTargetByCreature.get(payload.creatureId) === true;
    const isLatchTarget = payload.runtime.hasLatchAsTarget;
    if (wasLatchTarget && !isLatchTarget) {
      this.latchEscapeUntilByCreature.set(payload.creatureId, nowMs + THOUGHT_LATCH_ESCAPE_WINDOW_MS);
    }
    this.wasLatchTargetByCreature.set(payload.creatureId, isLatchTarget);
    const latchEscapeUntil = this.latchEscapeUntilByCreature.get(payload.creatureId) ?? 0;
    const latchEscapeActive = latchEscapeUntil > nowMs;
    if (!latchEscapeActive && latchEscapeUntil > 0) {
      this.latchEscapeUntilByCreature.delete(payload.creatureId);
    }

    const stateKey = thoughtStateKey(payload, latchEscapeActive);
    const previous = this.thoughtByCreature.get(payload.creatureId);
    const candidates = primaryCandidates(payload, latchEscapeActive);
    const primary = pickBestCandidate(candidates);
    const primaryMajor = primary.major && isMajorReasonActive(payload, primary.reasonKey);

    if (previous?.majorOverride) {
      const majorStillActive = isMajorReasonActive(payload, previous.reasonKey);
      if (majorStillActive) {
        const secondary = secondaryThoughtForAxis(payload, previous.axis, previous);
        const secondaryLine = secondary?.line ?? null;
        const secondaryKey = secondary?.key ?? null;
        if (secondaryLine === previous.secondary && secondaryKey === previous.secondaryKey && previous.stateKey === stateKey) {
          return previous;
        }
        const lockedThought: ThoughtResult = {
          ...previous,
          secondary: secondaryLine,
          secondaryKey,
          stateKey,
          renderToken: `${previous.reasonKey}:${secondaryLine ?? ''}:${secondaryKey ?? 'none'}:major`,
        };
        this.thoughtByCreature.set(payload.creatureId, lockedThought);
        return lockedThought;
      }
    }

    const forceReevaluateAfterMajor = previous?.majorOverride === true && !isMajorReasonActive(payload, previous.reasonKey);
    if (previous) {
      if (paused && previous.stateKey === stateKey) {
        return previous;
      }
      if (!paused && !forceReevaluateAfterMajor && !primaryMajor && nowMs - previous.updatedAtMs < THOUGHT_RUNNING_EVAL_MS) {
        return previous;
      }
    }

    const primaryLine = primaryLineForCandidate(payload, primary, previous);
    const stableSecondaryPrevious = previous && previous.reasonKey === primary.reasonKey ? previous : undefined;
    const secondary = secondaryThoughtForAxis(payload, primary.axis, stableSecondaryPrevious);
    const secondaryLine = secondary?.line ?? null;
    const secondaryKey = secondary?.key ?? null;
    const thought: ThoughtResult = {
      primary: primaryLine,
      secondary: secondaryLine,
      secondaryKey,
      reasonKey: primary.reasonKey,
      tone: primary.tone,
      axis: primary.axis,
      critical: primary.critical,
      majorOverride: primaryMajor,
      stateKey,
      updatedAtMs: nowMs,
      renderToken: `${primary.reasonKey}:${secondaryLine ?? ''}:${secondaryKey ?? 'none'}:${primaryMajor ? 'major' : 'normal'}`,
    };
    this.thoughtByCreature.set(payload.creatureId, thought);
    this.lastThoughtByCreature.set(payload.creatureId, primaryLine);
    return thought;
  }

  private bindHelpTooltipEvents(): void {
    this.el.addEventListener('pointerover', (ev: PointerEvent) => {
      if (ev.pointerType === 'touch') return;
      const helpEl = getHelpTarget(ev.target);
      if (!helpEl) return;
      const helpKey = helpEl.dataset.inspectorHelp as InspectorHelpKey | undefined;
      if (!helpKey) return;
      const helpText = INSPECTOR_HELP[helpKey];
      if (!helpText) return;
      showInspectorHelpTooltip(helpText, ev.clientX, ev.clientY);
    });

    this.el.addEventListener('pointermove', (ev: PointerEvent) => {
      if (ev.pointerType === 'touch') return;
      const helpEl = getHelpTarget(ev.target);
      if (!helpEl) {
        hideInspectorHelpTooltip();
        return;
      }
      moveInspectorHelpTooltip(ev.clientX, ev.clientY);
    });

    this.el.addEventListener('pointerout', (ev: PointerEvent) => {
      const fromHelpEl = getHelpTarget(ev.target);
      if (!fromHelpEl) return;
      const toHelpEl = getHelpTarget(ev.relatedTarget);
      if (toHelpEl === fromHelpEl) return;
      hideInspectorHelpTooltip();
    });

    this.el.addEventListener('pointerdown', hideInspectorHelpTooltip);
    this.el.addEventListener('click', (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const closeButton = target.closest('.inspector-close') as HTMLElement | null;
      if (!closeButton) return;
      ev.preventDefault();
      hideInspectorHelpTooltip();
      this.onClose?.();
    });
  }

  private bindDragEvents(): void {
    this.el.addEventListener('pointerdown', (ev: PointerEvent) => {
      if (!this.dragEnabled) return;
      if (ev.button !== 0) return;
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const closeButton = target.closest('.inspector-close');
      if (closeButton) return;
      const header = target.closest('.inspector-headline');
      if (!header) return;
      const rect = this.el.getBoundingClientRect();
      this.dragOffsetX = ev.clientX - rect.left;
      this.dragOffsetY = ev.clientY - rect.top;
      this.dragPointerId = ev.pointerId;
      this.isDragging = true;
      this.hasCustomPosition = true;
      this.el.classList.add('inspector-dragging');
      this.setGlobalDragCursor(true);
      this.el.style.left = `${Math.round(rect.left)}px`;
      this.el.style.top = `${Math.round(rect.top)}px`;
      this.el.style.right = 'auto';
      this.el.style.bottom = 'auto';
      this.el.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    });

    this.el.addEventListener('pointermove', (ev: PointerEvent) => {
      if (!this.isDragging) return;
      if (ev.pointerId !== this.dragPointerId) return;
      const rect = this.el.getBoundingClientRect();
      const margin = 8;
      const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
      const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
      const nextLeft = Math.max(margin, Math.min(ev.clientX - this.dragOffsetX, maxLeft));
      const nextTop = Math.max(margin, Math.min(ev.clientY - this.dragOffsetY, maxTop));
      this.el.style.left = `${Math.round(nextLeft)}px`;
      this.el.style.top = `${Math.round(nextTop)}px`;
    });

    const endDrag = (ev: PointerEvent): void => {
      if (!this.isDragging) return;
      if (ev.pointerId !== this.dragPointerId) return;
      if (this.el.hasPointerCapture(ev.pointerId)) this.el.releasePointerCapture(ev.pointerId);
      this.isDragging = false;
      this.dragPointerId = -1;
      this.el.classList.remove('inspector-dragging');
      this.setGlobalDragCursor(false);
    };
    this.el.addEventListener('pointerup', endDrag);
    this.el.addEventListener('pointercancel', endDrag);
  }

  private setDragEnabled(enabled: boolean): void {
    if (this.dragEnabled === enabled) return;
    this.dragEnabled = enabled;
    this.el.classList.toggle('inspector-draggable', enabled);
    if (!enabled && this.isDragging) {
      this.isDragging = false;
      this.dragPointerId = -1;
      this.el.classList.remove('inspector-dragging');
      this.setGlobalDragCursor(false);
    }
  }

  private resetPositionToDefault(): void {
    this.hasCustomPosition = false;
    this.isDragging = false;
    this.dragPointerId = -1;
    this.el.classList.remove('inspector-dragging');
    this.setGlobalDragCursor(false);
    this.el.style.left = '';
    this.el.style.top = '';
    this.el.style.right = '12px';
    this.el.style.bottom = '70px';
  }

  update(state: InspectorUpdateState): void {
    const { visible, paused, payload, deceased } = state;
    const nowMs = performance.now();
    const thought = payload ? this.resolveThought(payload, paused, nowMs) : null;
    const liveBucket = !paused && payload ? `:${Math.floor(nowMs / 200)}` : '';
    const renderKey = !visible
      ? 'hidden'
      : payload
        ? `${paused ? 'paused' : 'running'}:${payload.creatureId}:${payload.locked ? 1 : 0}:${thought?.renderToken ?? 'none'}${liveBucket}`
        : deceased
          ? `${paused ? 'paused' : 'running'}:deceased:${deceased.creatureId}:${deceased.deathTick}:${deceased.lastWords ?? ''}`
          : `${paused ? 'paused' : 'running'}:empty`;
    if (renderKey === this.lastRenderKey) return;
    this.lastRenderKey = renderKey;

    if (!visible) {
      this.setDragEnabled(false);
      this.el.style.display = 'none';
      hideInspectorHelpTooltip();
      return;
    }

    this.el.style.display = 'block';
    this.setDragEnabled(payload !== null);
    if (!payload) {
      if (deceased) {
        this.el.innerHTML =
          `<div class="inspector-card inspector-empty inspector-deceased">` +
          `<div class="inspector-headline"><div class="inspector-title">Creature ${deceased.creatureId} Deceased</div><button type="button" class="inspector-close" aria-label="Close inspector">✕</button></div>` +
          `<div class="inspector-sub">Pack: ${deceased.packId === null ? 'Solo' : deceased.packId} · Lineage: ${deceased.lineageId === null ? 'n/a' : deceased.lineageId}</div>` +
          `<div class="inspector-row"><span class="inspector-k">Cause</span><span class="inspector-v">${deceased.causeLabel}</span></div>` +
          `<div class="inspector-row"><span class="inspector-k">Last Attacker</span><span class="inspector-v">${fmtId(deceased.killerId)}</span></div>` +
          `<div class="inspector-row"><span class="inspector-k">Death Tick</span><span class="inspector-v">${deceased.deathTick}</span></div>` +
          `<div class="inspector-section">` +
          sectionTitle('Last Words', 'last_words') +
          `<div class="inspector-thought-bubble tone-danger">${escHtml(deceased.lastWords ?? fallbackLastWords(deceased.causeLabel))}</div>` +
          `</div>` +
          `<div class="inspector-hint">Select another creature to inspect, or close inspector.</div>` +
          `</div>`;
        hideInspectorHelpTooltip();
        return;
      }
      // Minimized hint card should always return to default anchored position.
      if (this.hasCustomPosition) this.resetPositionToDefault();
      this.el.innerHTML =
        `<div class="inspector-card inspector-empty">` +
        `<div class="inspector-headline"><div class="inspector-title">Inspector</div></div>` +
        `<div class="inspector-hint">Paused: hover a creature to inspect, click to lock.</div>` +
        `</div>`;
      hideInspectorHelpTooltip();
      return;
    }

    const badgeParts: string[] = [];
    if (payload.locked) badgeParts.push('<span class="inspector-badge lock">Locked</span>');
    if (payload.badges.leader) badgeParts.push('<span class="inspector-badge leader">Leader</span>');
    if (payload.badges.scout) badgeParts.push('<span class="inspector-badge scout">Scout</span>');
    if (payload.badges.predator) badgeParts.push('<span class="inspector-badge predator">Predator</span>');
    if (payload.badges.solo) badgeParts.push('<span class="inspector-badge solo">Solo</span>');

    this.el.innerHTML =
      `<div class="inspector-card">` +
      `<div class="inspector-header">` +
      `<div class="inspector-headline"><div class="inspector-title">Creature ${payload.creatureId}</div><button type="button" class="inspector-close" aria-label="Close inspector">✕</button></div>` +
      `<div class="inspector-sub">Pack: ${payload.packId === null ? 'Solo' : payload.packId} · Lineage: ${payload.lineageId === null ? 'n/a' : payload.lineageId}</div>` +
      `<div class="inspector-badges">${badgeParts.join('')}</div>` +
      `</div>` +
      `<div class="inspector-content">` +

      `<div class="inspector-section">` +
      sectionTitle('Thoughts', 'thoughts') +
      `<div class="inspector-row inspector-thought-row"><span class="inspector-k">${helpLabel('Current Thought', 'thought_primary')}</span></div>` +
      `<div class="inspector-thought-bubble tone-${thought?.tone ?? 'calm'}">${escHtml(thought?.primary ?? 'Steady state.')}</div>` +
      (thought?.secondary
        ? `<div class="inspector-row inspector-thought-row"><span class="inspector-k">${helpLabel('Secondary Signal', 'thought_secondary')}</span></div><div class="inspector-thought-bubble tone-calm secondary">${escHtml(thought.secondary)}</div>`
        : '') +
      `</div>` +

      `<div class="inspector-section">` +
      sectionTitle('Status', 'status') +
      row('Intent', payload.status.intent, 'intent') +
      row('Energy', `${payload.status.energy.toFixed(1)} / ${payload.status.maxEnergy.toFixed(1)} (${(payload.status.energyFrac * 100).toFixed(1)}%)`, 'energy') +
      row('Age', `${payload.status.age} / ${payload.status.maxAge} (rem ${payload.status.remainingAge})`, 'age') +
      row('Size', `${payload.status.sizeScale.toFixed(2)} (goal ${payload.status.adultGoal.toFixed(2)})`, 'size') +
      `</div>` +

      `<div class="inspector-section">` +
      sectionTitle('Activity', 'activity') +
      row('Plant Eaten', `${payload.activity.foodPlantEaten}`, 'food_plant_eaten') +
      row('Meat Eaten', `${payload.activity.foodMeatEaten}`, 'food_meat_eaten') +
      row('Food Total', `${payload.activity.foodTotalEaten}`, 'food_total_eaten') +
      row('Photo Gain (Tick)', payload.activity.photoGainTick.toFixed(2), 'photo_gain_tick') +
      row('Photo Net (Tick)', payload.activity.photoNetTick.toFixed(2), 'photo_net_tick') +
      row('Photo Net (Lifetime)', payload.activity.photoNetLifetime.toFixed(1), 'photo_net_lifetime') +
      row('Latches', `${payload.activity.latchesInitiated}`, 'latches_initiated') +
      row('Kills', `${payload.activity.kills}`, 'kills') +
      row('Lost Latches', `${payload.activity.latchLosses}`, 'latch_losses') +
      row('Latched On (Taken)', `${payload.activity.timesLatchedOn}`, 'times_latched_on') +
      `</div>` +

      `<div class="inspector-section">` +
      sectionTitle('Pack Info', 'pack_info') +
      row('Pack', payload.packInfo.id === null ? 'Solo' : `${payload.packInfo.id}`, 'pack') +
      row('Membership', payload.packInfo.membership, 'membership') +
      row('Members', `${payload.packInfo.size}`, 'members') +
      row('Leader', fmtId(payload.packInfo.leaderId), 'leader') +
      row('Scout', fmtId(payload.packInfo.scoutId), 'scout') +
      row('Predators', `${payload.packInfo.predatorCount}`, 'predators') +
      row('Avg Energy', fmtPct(payload.packInfo.avgEnergyFrac), 'avg_energy') +
      row('Avg Size', payload.packInfo.avgSizeScale === null ? 'n/a' : payload.packInfo.avgSizeScale.toFixed(2), 'avg_size') +
      row('Anchor Distance', fmtDist(payload.packInfo.anchorDistance), 'anchor_distance') +
      `</div>` +

      `<div class="inspector-section">` +
      sectionTitle('Regroup', 'regroup') +
      row('Source', payload.regroup.source, 'regroup_source') +
      row('Target Distance', fmtDist(payload.regroup.targetDistance), 'regroup_target_distance') +
      row('Isolated', boolChip(payload.regroup.isolated), 'isolated') +
      row('Urgent', boolChip(payload.regroup.urgent), 'urgent') +
      `</div>` +

      `<details class="inspector-advanced">` +
      `<summary>${helpLabel('Advanced', 'advanced')}</summary>` +
      `<div class="inspector-section">` +
      sectionTitle('Body', 'body') +
      row('Total Blobs', `${payload.advanced.blobTotal}`, 'total_blobs') +
      payload.advanced.blobCounts.map((entry) => row(entry.label, `${entry.count}`)).join('') +
      `</div>` +
      `<div class="inspector-section">` +
      sectionTitle('Reproduction', 'reproduction') +
      row('Cooldown', `${payload.advanced.reproduction.cooldown}`, 'cooldown') +
      row('Mate Timer', `${payload.advanced.reproduction.mateTimer}`, 'mate_timer') +
      row('Energy Frac', payload.advanced.reproduction.energyFrac.toFixed(3), 'energy_frac') +
      row('Size Mature', boolChip(payload.advanced.reproduction.sizeMature), 'size_mature') +
      `</div>` +
      `<div class="inspector-section">` +
      sectionTitle('Predation', 'predation') +
      row('Active Latches', `${payload.advanced.predation.activeLatchCount}`, 'active_latches') +
      row('Carrying Carcass', boolChip(payload.advanced.predation.carryingCarcass), 'carrying_carcass') +
      row('Carcass Energy', payload.advanced.predation.carcassEnergyFrac === null ? 'n/a' : `${(payload.advanced.predation.carcassEnergyFrac * 100).toFixed(1)}%`, 'carcass_energy') +
      row('Last Attacker', fmtId(payload.advanced.predation.lastAttackerId), 'last_attacker') +
      `</div>` +
      `</details>` +
      `</div>` +
      `</div>`;

    const detailsEl = this.el.querySelector('details.inspector-advanced') as HTMLDetailsElement | null;
    if (detailsEl) {
      detailsEl.open = this.advancedOpen;
      detailsEl.addEventListener('toggle', () => {
        this.advancedOpen = detailsEl.open;
      });
    }
  }
}
