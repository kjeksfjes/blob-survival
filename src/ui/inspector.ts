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

type InspectorHelpKey =
  | 'status'
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
  | 'last_attacker';

const INSPECTOR_HELP: Record<InspectorHelpKey, string> = {
  status: 'Current state of this creature: behavior intent, reserves, age, and size growth.',
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
};

const INSPECTOR_HELP_TOOLTIP_ID = 'inspector-help-tooltip';
const INSPECTOR_HELP_TOOLTIP_STYLE_ID = 'inspector-help-tooltip-style';
const INSPECTOR_HELP_TOOLTIP_OFFSET = 14;
const INSPECTOR_HELP_TOOLTIP_MARGIN = 10;

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
  private advancedOpen = false;
  private lastRenderKey = '';

  constructor() {
    this.el = document.getElementById('inspector') as HTMLElement;
    this.bindHelpTooltipEvents();
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
  }

  update(paused: boolean, payload: CreatureInspectorPayload | null): void {
    const renderKey = !paused
      ? 'hidden'
      : payload
        ? `paused:${payload.creatureId}:${payload.locked ? 1 : 0}`
        : 'paused:empty';
    if (renderKey === this.lastRenderKey) return;
    this.lastRenderKey = renderKey;

    if (!paused) {
      this.el.style.display = 'none';
      hideInspectorHelpTooltip();
      return;
    }

    this.el.style.display = 'block';
    if (!payload) {
      this.el.innerHTML =
        `<div class="inspector-card inspector-empty">` +
        `<div class="inspector-title">Inspector</div>` +
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
      `<div class="inspector-title">Creature ${payload.creatureId}</div>` +
      `<div class="inspector-sub">Pack: ${payload.packId === null ? 'Solo' : payload.packId} · Lineage: ${payload.lineageId === null ? 'n/a' : payload.lineageId}</div>` +
      `<div class="inspector-badges">${badgeParts.join('')}</div>` +
      `</div>` +

      `<div class="inspector-section">` +
      sectionTitle('Status', 'status') +
      row('Intent', payload.status.intent, 'intent') +
      row('Energy', `${payload.status.energy.toFixed(1)} / ${payload.status.maxEnergy.toFixed(1)} (${(payload.status.energyFrac * 100).toFixed(1)}%)`, 'energy') +
      row('Age', `${payload.status.age} / ${payload.status.maxAge} (rem ${payload.status.remainingAge})`, 'age') +
      row('Size', `${payload.status.sizeScale.toFixed(2)} (goal ${payload.status.adultGoal.toFixed(2)})`, 'size') +
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
