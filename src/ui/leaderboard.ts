export type LeaderboardBoard = 'survivors' | 'foragers' | 'hunters' | 'solar';

export type LeaderboardDeathRecord = {
  creatureSlot: number;
  generation: number;
  packId: number;
  lineageId: number;
  deathTick: number;
  deathCause: number;
  deathX: number;
  deathY: number;
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
};

export type LeaderboardRowLive = {
  creatureId: number;
  generation: number;
  packId: number | null;
  lineageId: number | null;
  metricMain: string;
  metricSub: string;
};

export type LeaderboardRowHall = {
  record: LeaderboardDeathRecord;
  metricMain: string;
  metricSub: string;
  causeLabel: 'Starvation' | 'Killed' | 'Old Age';
};

export type LeaderboardPlaceholderRow = {
  placeholder: true;
  label: string;
};

export type LeaderboardPayload = {
  boards: Record<LeaderboardBoard, {
    live: Array<LeaderboardRowLive | LeaderboardPlaceholderRow>;
    hall: Array<LeaderboardRowHall | LeaderboardPlaceholderRow>;
  }>;
};

type LeaderboardOptions = {
  onSelectLive?: (creatureId: number) => void;
  onSelectDeceased?: (record: LeaderboardDeathRecord) => void;
};

const BOARD_ORDER: LeaderboardBoard[] = ['survivors', 'foragers', 'hunters', 'solar'];
const BOARD_LABEL: Record<LeaderboardBoard, string> = {
  survivors: 'Survivors',
  foragers: 'Foragers',
  hunters: 'Hunters',
  solar: 'Solar',
};

function fmtPack(packId: number | null): string {
  return packId === null || packId < 0 ? 'Solo' : `P${packId}`;
}

function fmtLineage(lineageId: number | null): string {
  return lineageId === null || lineageId < 0 ? 'L?' : `L${lineageId}`;
}

function causeClass(causeLabel: LeaderboardRowHall['causeLabel']): string {
  if (causeLabel === 'Killed') return 'killed';
  if (causeLabel === 'Old Age') return 'age';
  return 'starvation';
}

export class Leaderboard {
  private readonly el: HTMLElement;
  private readonly onSelectLive?: (creatureId: number) => void;
  private readonly onSelectDeceased?: (record: LeaderboardDeathRecord) => void;
  private payload: LeaderboardPayload | null = null;
  private activeBoard: LeaderboardBoard = 'survivors';
  private visible = true;
  private dragPointerId = -1;
  private isDragging = false;
  private hasCustomPosition = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private lastRenderKey = '';

  constructor(options?: LeaderboardOptions) {
    this.el = document.getElementById('leaderboard') as HTMLElement;
    this.onSelectLive = options?.onSelectLive;
    this.onSelectDeceased = options?.onSelectDeceased;
    this.bindEvents();
    this.bindDrag();
    this.render();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.el.classList.toggle('hidden', !visible);
  }

  toggleVisible(): void {
    this.setVisible(!this.visible);
  }

  setAnchorTop(px: number): void {
    if (this.hasCustomPosition) return;
    const top = Math.max(12, Math.round(px));
    this.el.style.top = `${top}px`;
    this.el.style.maxHeight = '';
    this.el.style.height = '';
  }

  update(payload: LeaderboardPayload): void {
    this.payload = payload;
    this.render();
  }

  private bindEvents(): void {
    this.el.addEventListener('pointerdown', (ev: PointerEvent) => {
      ev.stopPropagation();
    });
    this.el.addEventListener('pointerup', (ev: PointerEvent) => {
      ev.stopPropagation();
      if (this.isDragging) return;
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      this.activateFromTarget(target);
    });

    // Keep keyboard activation support for buttons.
    this.el.addEventListener('click', (ev: MouseEvent) => {
      ev.stopPropagation();
      if (ev.detail !== 0) return;
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      this.activateFromTarget(target);
    });
  }

  private activateFromTarget(target: HTMLElement): void {
    const tabButton = target.closest('[data-lb-tab]') as HTMLElement | null;
    if (tabButton) {
      const tab = tabButton.dataset.lbTab as LeaderboardBoard | undefined;
      if (!tab || !BOARD_ORDER.includes(tab)) return;
      this.activeBoard = tab;
      this.render();
      return;
    }

    if (!this.payload) return;
    const rowEl = target.closest('[data-lb-kind]') as HTMLElement | null;
    if (!rowEl || rowEl.dataset.lbPlaceholder === '1') return;
    const rowKind = rowEl.dataset.lbKind;
    const rowIndex = Number(rowEl.dataset.lbIndex ?? '-1');
    if (!Number.isFinite(rowIndex) || rowIndex < 0) return;

    const section = this.payload.boards[this.activeBoard];
    if (rowKind === 'live') {
      const row = section.live[rowIndex];
      if (!row || 'placeholder' in row) return;
      this.onSelectLive?.(row.creatureId);
      return;
    }
    if (rowKind === 'hall') {
      const row = section.hall[rowIndex];
      if (!row || 'placeholder' in row) return;
      this.onSelectDeceased?.(row.record);
    }
  }

  private bindDrag(): void {
    this.el.addEventListener('pointerdown', (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const header = target.closest('.lb-header');
      if (!header) return;
      const rect = this.el.getBoundingClientRect();
      this.dragOffsetX = ev.clientX - rect.left;
      this.dragOffsetY = ev.clientY - rect.top;
      this.dragPointerId = ev.pointerId;
      this.isDragging = true;
      this.hasCustomPosition = true;
      this.el.classList.add('lb-dragging');
      document.body.classList.add('lb-global-dragging');
      this.el.style.left = `${Math.round(rect.left)}px`;
      this.el.style.top = `${Math.round(rect.top)}px`;
      this.el.style.right = 'auto';
      if (this.el.hasPointerCapture(ev.pointerId)) this.el.releasePointerCapture(ev.pointerId);
      this.el.setPointerCapture(ev.pointerId);
      ev.preventDefault();
      ev.stopPropagation();
    });

    this.el.addEventListener('pointermove', (ev: PointerEvent) => {
      if (!this.isDragging || ev.pointerId !== this.dragPointerId) return;
      const rect = this.el.getBoundingClientRect();
      const margin = 8;
      const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
      const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
      const left = Math.max(margin, Math.min(ev.clientX - this.dragOffsetX, maxLeft));
      const top = Math.max(margin, Math.min(ev.clientY - this.dragOffsetY, maxTop));
      this.el.style.left = `${Math.round(left)}px`;
      this.el.style.top = `${Math.round(top)}px`;
    });

    const endDrag = (ev: PointerEvent): void => {
      if (!this.isDragging || ev.pointerId !== this.dragPointerId) return;
      if (this.el.hasPointerCapture(ev.pointerId)) this.el.releasePointerCapture(ev.pointerId);
      this.isDragging = false;
      this.dragPointerId = -1;
      this.el.classList.remove('lb-dragging');
      document.body.classList.remove('lb-global-dragging');
    };
    this.el.addEventListener('pointerup', endDrag);
    this.el.addEventListener('pointercancel', endDrag);
  }

  private render(): void {
    if (!this.visible) {
      if (this.lastRenderKey !== 'hidden') {
        this.el.innerHTML = '';
        this.lastRenderKey = 'hidden';
      }
      return;
    }

    const section = this.payload?.boards[this.activeBoard] ?? { live: [], hall: [] };
    const renderKey = `${this.activeBoard}|${this.signatureForSection(section)}`;
    if (renderKey === this.lastRenderKey) return;
    this.lastRenderKey = renderKey;

    const tabs = BOARD_ORDER
      .map((board) => {
        const activeClass = board === this.activeBoard ? ' active' : '';
        return `<button type="button" class="lb-tab${activeClass}" data-lb-tab="${board}">${BOARD_LABEL[board]}</button>`;
      })
      .join('');

    const liveRows = section.live.length > 0
      ? section.live.map((row, i) => {
        if ('placeholder' in row) {
          return (
            `<div class="lb-row placeholder" data-lb-kind="live" data-lb-index="${i}" data-lb-placeholder="1">` +
              `<div class="lb-row-top">` +
                `<span class="lb-id">#—</span>` +
                `<span class="lb-metric">—</span>` +
              `</div>` +
              `<div class="lb-row-sub">${row.label}</div>` +
            `</div>`
          );
        }
        return (
          `<button type="button" class="lb-row" data-lb-kind="live" data-lb-index="${i}">` +
            `<div class="lb-row-top">` +
              `<span class="lb-id">#${row.creatureId}.${row.generation}</span>` +
              `<span class="lb-metric">${row.metricMain}</span>` +
            `</div>` +
            `<div class="lb-row-sub">${fmtPack(row.packId)} · ${fmtLineage(row.lineageId)} · ${row.metricSub}</div>` +
          `</button>`
        );
      }).join('')
      : `<div class="lb-empty">No live records yet.</div>`;

    const hallRows = section.hall.length > 0
      ? section.hall.map((row, i) => {
        if ('placeholder' in row) {
          return (
            `<div class="lb-row hall placeholder" data-lb-kind="hall" data-lb-index="${i}" data-lb-placeholder="1">` +
              `<div class="lb-row-top">` +
                `<span class="lb-id">#—</span>` +
                `<span class="lb-metric">—</span>` +
              `</div>` +
              `<div class="lb-row-sub">${row.label}</div>` +
            `</div>`
          );
        }
        return (
          `<button type="button" class="lb-row hall" data-lb-kind="hall" data-lb-index="${i}">` +
            `<div class="lb-row-top">` +
              `<span class="lb-id">#${row.record.creatureSlot}.${row.record.generation}</span>` +
              `<span class="lb-metric">${row.metricMain}</span>` +
            `</div>` +
            `<div class="lb-row-sub">` +
              `${fmtPack(row.record.packId)} · ${fmtLineage(row.record.lineageId)} · ${row.metricSub}` +
              ` <span class="lb-cause ${causeClass(row.causeLabel)}">${row.causeLabel}</span>` +
              ` <span class="lb-tick">T${row.record.deathTick}</span>` +
            `</div>` +
          `</button>`
        );
      }).join('')
      : `<div class="lb-empty">No hall records yet.</div>`;

    this.el.innerHTML =
      `<div class="lb-card">` +
        `<div class="lb-header">Leaderboard</div>` +
        `<div class="lb-tabs">${tabs}</div>` +
        `<div class="lb-content">` +
          `<div class="lb-section">` +
            `<div class="lb-section-title">Live Top 5</div>` +
            `${liveRows}` +
          `</div>` +
          `<div class="lb-section">` +
            `<div class="lb-section-title">Hall of Fame Top 5</div>` +
            `${hallRows}` +
          `</div>` +
        `</div>` +
      `</div>`;
  }

  private signatureForSection(section: {
    live: Array<LeaderboardRowLive | LeaderboardPlaceholderRow>;
    hall: Array<LeaderboardRowHall | LeaderboardPlaceholderRow>;
  }): string {
    const liveSig = section.live
      .map((row) => ('placeholder' in row
        ? `p:${row.label}`
        : `l:${row.creatureId}:${row.generation}:${row.metricMain}:${row.metricSub}`))
      .join('|');
    const hallSig = section.hall
      .map((row) => ('placeholder' in row
        ? `p:${row.label}`
        : `h:${row.record.creatureSlot}:${row.record.generation}:${row.record.deathTick}:${row.metricMain}:${row.metricSub}:${row.causeLabel}`))
      .join('|');
    return `${liveSig}::${hallSig}`;
  }
}
