import { SimulationLoop, type SimParams } from '../simulation/simulation-loop';
import { MIN_SPEED, MAX_SPEED, MAX_CREATURES } from '../constants';
import {
  createDefaultBodyRenderSettings,
  type BodyRenderPreset,
  type BodyRenderSettingKey,
  type BodyRenderSettings,
} from '../rendering/body-visuals';
import { DEFAULT_RENDER_STYLE, type RenderStyle } from '../rendering/render-style';

export type SocialColorMode = 'Normal' | 'Pack' | 'Clan';
type DebugControlKey =
  | 'speed'
  | 'socialColorMode'
  | 'soundEnabled'
  | 'renderStyle'
  | 'bodyRenderPreset'
  | 'bodyNodeRadiusMult'
  | 'bodyLinkThicknessMult'
  | 'bodyEdgeWidthFrac'
  | 'bodyEdgeDarkness'
  | 'bodyModuleColors'
  | 'bodyCreatureOutline'
  | keyof SimParams;

const CONTROL_HELP: Record<DebugControlKey, string> = {
  speed: 'Number of simulation substeps per frame; higher runs faster but costs more CPU.',
  socialColorMode: 'Color coding mode for creature blobs: Normal, Pack, or Clan.',
  soundEnabled: 'Toggles simulation sound effects (birth/death cues) on or off.',
  renderStyle: 'Selects active rendering backend: connected body renderer or legacy metaball renderer.',
  bodyRenderPreset: 'Body rendering profile: Balanced, Chunky, or Technical.',
  bodyNodeRadiusMult: 'Scales node (blob) draw radius in body mode.',
  bodyLinkThicknessMult: 'Scales bridge thickness between connected blobs.',
  bodyEdgeWidthFrac: 'Fraction of body radius reserved for dark edge contour.',
  bodyEdgeDarkness: 'How much darker body edges are than the fill color.',
  bodyModuleColors: 'Uses per-module colors matching the legend instead of one unified body color in Normal mode.',
  bodyCreatureOutline: 'Draws per-creature overlap-safe black outlines in Connected Bodies mode.',
  foodSpawnRate: 'Plant food spawned per tick; higher means more available food.',
  foodDispersion: '0 keeps food clustered, 1 spreads it more uniformly.',
  showRoleMarkers: 'Shows/hides scout and leader debug rings (Scout: white, Leader: purple).',
  foodSignalRadius: 'Max distance for sharing food signals between packmates.',
  foodSignalDecayTicks: 'How long shared food signals stay usable before fading.',
  foodSignalMinStrength: 'Minimum signal strength required to influence steering.',
  foodSignalShareWeight: 'Base weight applied when sharing a signal.',
  foodSignalBlendWeight: 'How strongly creatures steer toward shared signals.',
  foodSignalRelayAttenuation: 'Signal loss per relay; lower values fade faster.',
  foodSignalMaxHops: 'Maximum number of relay hops for a signal.',
  foodSignalRelayAgeFactor: 'How long relayed signals persist relative to base decay.',
  eatFullStopFraction: 'Energy fraction where creatures become satiated and stop food-seeking.',
  eatResumeFraction: 'Energy fraction where satiated creatures resume food-seeking.',
  eatCooldownTicks: 'Delay in ticks between bite attempts.',
  eatMaxItemsPerSubstep: 'Maximum pellets consumed in one substep.',
  metabolismCost: 'Base per-blob energy drain each tick.',
  metabolismExponent: 'Body-size scaling of metabolism; 1.0 is linear.',
  motorForce: 'Base movement thrust strength.',
  mutationRate: 'Trait mutation intensity during reproduction.',
  structuralMutationRate: 'Frequency/intensity of body-structure mutation.',
  creatureCap: 'Soft population cap that blocks reproduction above the limit.',
  photoEnergyPerTick: 'Base photosynthesis energy income per tick.',
  photoCrowdPenaltyMax: 'Maximum photosynthesis loss from crowding.',
  photoIdlePenaltyMinMult: 'Minimum photosynthesis multiplier when nearly stationary.',
  photoMaintenanceCostPerBlob: 'Flat upkeep cost per photosynthesizer blob.',
  photoMaintenanceSizeMult: 'Additional photosynthesis upkeep scaling with blob size.',
  perfLodEnabled: 'Enables adaptive LOD to improve performance at high population.',
  perfLodTierOverride: '-1 auto, or force tier 0/1/2 manually.',
  perfNeighborBudgetTier1: 'Per-creature neighbor-query budget at LOD tier 1.',
  perfNeighborBudgetTier2: 'Per-creature neighbor-query budget at LOD tier 2.',
  sizeLifecycleEnabled: 'Enables lifecycle growth model (juvenile -> adult -> overgrowth).',
  sizeBirthScale: 'Starting size scale for newborns when lifecycle growth is enabled.',
  sizeAdultMaxScale: 'Maximum adult size cap; sustained surplus can overgrow up to this scale.',
  sizeAdultAgeFrac: 'Age fraction where creatures reach normal adulthood size target.',
  sizeGrowthEnergyMinFrac: 'Minimum energy fraction required before growth can start.',
  sizeGrowthEnergyFullFrac: 'Energy fraction where growth reaches full speed.',
  sizeOvergrowEnergyFrac: 'Energy threshold for mature adults to overgrow past baseline size.',
  sizeReproMinAdultFrac: 'Minimum maturity size fraction required before reproduction is allowed.',
  sizeMetabolismExponent: 'How strongly metabolism scales up with creature size.',
  predatorSizeTargetHardRatio: 'Predators ignore prey above this prey-to-predator body-size ratio.',
  predatorSizeDamageExponent: 'Controls size-ratio scaling on predator hit and latch damage.',
  regroupOverlayEnabled: 'Enables regroup-debug line overlay for pack rejoin behavior diagnostics.',
  regroupOverlayScope: 'Which creatures are included: urgent-only, isolated+urgent, or all packed.',
  regroupOverlayLive: 'Render regroup overlay while simulation is running, not just paused.',
  predationStealFraction: 'Fraction of victim energy transferred during predation.',
  predationKinThreshold: 'Genetic similarity gate affecting kin-protection against predation.',
  carrionDropDivisor: 'Higher values reduce carrion generated from deaths.',
  lungeSpeedMult: 'Predator speed multiplier while lunging/chasing.',
  stealthDetectionMult: 'Predator detectability multiplier; lower is harder to detect.',
  killBountyFraction: 'Extra immediate energy reward on kill.',
  mateMinSimilarity: 'Minimum similarity required for sexual reproduction.',
  asexualFallbackTicks: 'Wait time before switching from mate-seeking to asexual reproduction.',
};

type BindingContainer = {
  addBinding: (obj: object, key: string, params?: Record<string, unknown>) => any;
};

const HELP_TOOLTIP_ID = 'debug-control-help-tooltip';
const HELP_TOOLTIP_STYLE_ID = 'debug-control-help-tooltip-style';
const HELP_TOOLTIP_OFFSET = 14;
const HELP_TOOLTIP_MARGIN = 10;
const ACTION_BUTTON_STYLE_ID = 'debug-control-action-buttons-style';
const INPUT_SCRUB_STYLE_ID = 'debug-control-input-scrub-style';
const RESET_DEFAULTS_CONFIRM_WINDOW_MS = 3000;
const RESET_DEFAULTS_MIN_CONFIRM_DELAY_MS = 200;
const CONFIRM_COUNTDOWN_TICK_MS = 100;

function ensureInputScrubStyle(): void {
  if (document.getElementById(INPUT_SCRUB_STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = INPUT_SCRUB_STYLE_ID;
  styleEl.textContent = `
    .tp-txtv_k,
    .tp-txtv_g,
    .tp-txtv .tp-ttv {
      display: none !important;
    }
  `;
  document.head.appendChild(styleEl);
}

function attachInputAutoSelect(root: HTMLElement): void {
  const getNumericInput = (target: EventTarget | null): HTMLInputElement | null => {
    if (!(target instanceof HTMLInputElement)) return null;
    if (!target.classList.contains('tp-txtv_i')) return null;
    return target;
  };

  const normalizeDecimalSeparator = (input: HTMLInputElement): void => {
    if (!input.value.includes(',')) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.replace(/,/g, '.');
    if (start !== null && end !== null) input.setSelectionRange(start, end);
  };

  const selectIfActive = (input: HTMLInputElement): void => {
    window.setTimeout(() => {
      if (document.activeElement === input) input.select();
    }, 0);
  };

  root.addEventListener('focusin', (ev: FocusEvent) => {
    const input = getNumericInput(ev.target);
    if (!input) return;
    selectIfActive(input);
  });

  root.addEventListener('pointerup', (ev: PointerEvent) => {
    const input = getNumericInput(ev.target);
    if (!input) return;
    selectIfActive(input);
  });

  root.addEventListener('input', (ev: Event) => {
    const input = getNumericInput(ev.target);
    if (!input) return;
    normalizeDecimalSeparator(input);
  });

  root.addEventListener('change', (ev: Event) => {
    const input = getNumericInput(ev.target);
    if (!input) return;
    normalizeDecimalSeparator(input);
  });

  root.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key !== 'Enter') return;
    const input = getNumericInput(ev.target);
    if (!input) return;
    selectIfActive(input);
  });
}

function ensureActionButtonStyle(): void {
  let styleEl = document.getElementById(ACTION_BUTTON_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = ACTION_BUTTON_STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    .debug-action-restart .tp-btnv_b {
      border-color: rgb(125 133 152 / 84%);
      background: rgb(86 92 106);
      color: rgb(234 239 248);
      transition: background-color 100ms linear, border-color 100ms linear, color 100ms linear;
    }
    .debug-action-restart .tp-btnv_b:hover {
      border-color: rgb(144 152 172 / 90%);
      background: rgb(100 106 120);
    }
    .debug-action-restart .tp-btnv_b:active {
      background: rgb(76 82 96);
    }
    .debug-action-reset .tp-btnv_b {
      border-color: rgb(228 126 112 / 82%);
      background: rgb(204 103 89);
      color: rgb(255 242 238);
      transition: background-color 100ms linear, border-color 100ms linear, color 100ms linear;
    }
    .debug-action-reset .tp-btnv_b:hover {
      border-color: rgb(238 143 128 / 88%);
      background: rgb(216 118 104);
    }
    .debug-action-reset .tp-btnv_b:active {
      background: rgb(188 89 76);
    }
  `;
}

function styleActionButton(buttonApi: any, className: string): void {
  if (!buttonApi?.element) return;
  ensureActionButtonStyle();
  buttonApi.element.classList.add(className);
}

function ensureHelpTooltipStyle(): void {
  if (document.getElementById(HELP_TOOLTIP_STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = HELP_TOOLTIP_STYLE_ID;
  styleEl.textContent = `
    #${HELP_TOOLTIP_ID} {
      position: fixed;
      left: 0;
      top: 0;
      z-index: 12000;
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
    #${HELP_TOOLTIP_ID}.is-visible {
      opacity: 1;
    }
  `;
  document.head.appendChild(styleEl);
}

function ensureHelpTooltipElement(): HTMLDivElement {
  let tooltip = document.getElementById(HELP_TOOLTIP_ID) as HTMLDivElement | null;
  if (tooltip) return tooltip;
  tooltip = document.createElement('div');
  tooltip.id = HELP_TOOLTIP_ID;
  tooltip.setAttribute('role', 'tooltip');
  document.body.appendChild(tooltip);
  return tooltip;
}

function positionHelpTooltip(tooltip: HTMLDivElement, x: number, y: number): void {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let left = x + HELP_TOOLTIP_OFFSET;
  let top = y + HELP_TOOLTIP_OFFSET;
  const rect = tooltip.getBoundingClientRect();

  if (left + rect.width + HELP_TOOLTIP_MARGIN > viewportW) {
    left = x - rect.width - HELP_TOOLTIP_OFFSET;
  }
  if (top + rect.height + HELP_TOOLTIP_MARGIN > viewportH) {
    top = y - rect.height - HELP_TOOLTIP_OFFSET;
  }

  left = Math.max(HELP_TOOLTIP_MARGIN, Math.min(left, viewportW - rect.width - HELP_TOOLTIP_MARGIN));
  top = Math.max(HELP_TOOLTIP_MARGIN, Math.min(top, viewportH - rect.height - HELP_TOOLTIP_MARGIN));

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function showHelpTooltip(helpText: string, x: number, y: number): void {
  ensureHelpTooltipStyle();
  const tooltip = ensureHelpTooltipElement();
  tooltip.textContent = helpText;
  tooltip.classList.add('is-visible');
  positionHelpTooltip(tooltip, x, y);
}

function moveHelpTooltip(x: number, y: number): void {
  const tooltip = document.getElementById(HELP_TOOLTIP_ID) as HTMLDivElement | null;
  if (!tooltip || !tooltip.classList.contains('is-visible')) return;
  positionHelpTooltip(tooltip, x, y);
}

function hideHelpTooltip(): void {
  const tooltip = document.getElementById(HELP_TOOLTIP_ID) as HTMLDivElement | null;
  if (!tooltip) return;
  tooltip.classList.remove('is-visible');
}

function attachLabelHelp(bindingApi: any, helpText: string): void {
  if (!bindingApi?.element || !helpText) return;
  const labelEl = bindingApi.element.querySelector('.tp-lblv_l') as HTMLElement | null;
  if (!labelEl) return;
  const labelText = (labelEl.textContent ?? '').trim();
  labelEl.removeAttribute('title');
  labelEl.style.cursor = 'help';
  labelEl.setAttribute('aria-label', labelText ? `${labelText}. ${helpText}` : helpText);

  labelEl.addEventListener('pointerenter', (ev: PointerEvent) => {
    if (ev.pointerType === 'touch') return;
    showHelpTooltip(helpText, ev.clientX, ev.clientY);
  });
  labelEl.addEventListener('pointermove', (ev: PointerEvent) => {
    if (ev.pointerType === 'touch') return;
    moveHelpTooltip(ev.clientX, ev.clientY);
  });
  labelEl.addEventListener('pointerleave', hideHelpTooltip);
  labelEl.addEventListener('pointerdown', hideHelpTooltip);
}

function addBindingWithHelp<T extends object, K extends keyof T & string>(
  container: BindingContainer,
  target: T,
  key: K,
  params?: Record<string, unknown>,
  helpKey?: DebugControlKey,
): any {
  let bindingParams = params;
  if (bindingParams && typeof bindingParams.step === 'number') {
    // Keep typed values exact by disabling Tweakpane step quantization for text input bindings.
    // (Tweakpane snaps to a step grid anchored at initial value.)
    bindingParams = { ...bindingParams };
    delete bindingParams.step;
  }

  const bindingApi = bindingParams ? container.addBinding(target, key, bindingParams) : container.addBinding(target, key);
  const resolvedHelpKey = helpKey ?? (key as unknown as DebugControlKey);
  attachLabelHelp(bindingApi, CONTROL_HELP[resolvedHelpKey]);
  return bindingApi;
}

export class DebugPanel {
  private pane: any = null;
  private uiState: {
    speed: number;
    socialColorMode: SocialColorMode;
    soundEnabled: boolean;
    renderStyle: RenderStyle;
    bodyRenderPreset: BodyRenderPreset;
    nodeRadiusMult: number;
    linkThicknessMult: number;
    edgeWidthFrac: number;
    edgeDarkness: number;
    moduleColors: boolean;
    creatureOutline: boolean;
  };

  constructor(
    sim: SimulationLoop,
    options?: {
      getSocialColorMode?: () => SocialColorMode;
      setSocialColorMode?: (mode: SocialColorMode) => void;
      getSoundEnabled?: () => boolean;
      setSoundEnabled?: (enabled: boolean) => void;
      getRenderStyle?: () => RenderStyle;
      setRenderStyle?: (style: RenderStyle) => void;
      resetRenderStyleDefaults?: () => void;
      getBodyRenderSettings?: () => BodyRenderSettings;
      setBodyRenderPreset?: (preset: BodyRenderPreset) => void;
      setBodyRenderSetting?: <K extends BodyRenderSettingKey>(key: K, value: BodyRenderSettings[K]) => void;
      resetBodyRenderDefaults?: () => void;
    },
  ) {
    const initialBodyVisuals = options?.getBodyRenderSettings
      ? options.getBodyRenderSettings()
      : createDefaultBodyRenderSettings();
    this.uiState = {
      speed: sim.speed,
      socialColorMode: options?.getSocialColorMode ? options.getSocialColorMode() : 'Normal',
      soundEnabled: options?.getSoundEnabled ? options.getSoundEnabled() : true,
      renderStyle: options?.getRenderStyle ? options.getRenderStyle() : DEFAULT_RENDER_STYLE,
      bodyRenderPreset: initialBodyVisuals.preset,
      nodeRadiusMult: initialBodyVisuals.nodeRadiusMult,
      linkThicknessMult: initialBodyVisuals.linkThicknessMult,
      edgeWidthFrac: initialBodyVisuals.edgeWidthFrac,
      edgeDarkness: initialBodyVisuals.edgeDarkness,
      moduleColors: initialBodyVisuals.moduleColors,
      creatureOutline: initialBodyVisuals.creatureOutline,
    };

    // Dynamic import to avoid type issues with tweakpane
    import('tweakpane').then(({ Pane }) => {
      ensureInputScrubStyle();
      const pane = new Pane({ title: 'Controls', expanded: true }) as any;
      this.pane = pane;
      if (pane.element) attachInputAutoSelect(pane.element as HTMLElement);

      addBindingWithHelp(pane, this.uiState, 'speed', {
        min: MIN_SPEED, max: MAX_SPEED, step: 1, label: 'Speed',
      }).on('change', (e: any) => { sim.speed = e.value; });

      addBindingWithHelp(pane, this.uiState, 'socialColorMode', {
        label: 'Social Colors',
        options: { Normal: 'Normal', 'Pack (P)': 'Pack', 'Clan (Shift+P)': 'Clan' },
      }).on('change', (e: any) => {
        const mode = e.value as SocialColorMode;
        this.uiState.socialColorMode = mode;
        options?.setSocialColorMode?.(mode);
      });

      addBindingWithHelp(pane, this.uiState, 'soundEnabled', {
        label: 'Sound',
      }).on('change', (e: any) => {
        const enabled = !!e.value;
        this.uiState.soundEnabled = enabled;
        options?.setSoundEnabled?.(enabled);
      });

      const syncBodyVisualUiStateFromSource = () => {
        const next = options?.getBodyRenderSettings?.();
        if (!next) return;
        this.uiState.bodyRenderPreset = next.preset;
        this.uiState.nodeRadiusMult = next.nodeRadiusMult;
        this.uiState.linkThicknessMult = next.linkThicknessMult;
        this.uiState.edgeWidthFrac = next.edgeWidthFrac;
        this.uiState.edgeDarkness = next.edgeDarkness;
        this.uiState.moduleColors = next.moduleColors;
        this.uiState.creatureOutline = next.creatureOutline;
      };

      const restartButton = pane.addButton({ title: 'Restart' });
      styleActionButton(restartButton, 'debug-action-restart');
      let restartConfirmArmed = false;
      let restartConfirmArmedAtMs = 0;
      let restartConfirmTimerId: number | null = null;
      let restartConfirmIntervalId: number | null = null;
      const restartButtonLabelEl = restartButton.element?.querySelector('.tp-btnv_t') as HTMLElement | null;

      const setRestartButtonTitle = (title: string) => {
        if ('title' in restartButton) {
          (restartButton as { title: string }).title = title;
        }
        if (restartButtonLabelEl) restartButtonLabelEl.textContent = title;
      };

      const clearRestartConfirm = () => {
        restartConfirmArmed = false;
        restartConfirmArmedAtMs = 0;
        if (restartConfirmTimerId !== null) {
          window.clearTimeout(restartConfirmTimerId);
          restartConfirmTimerId = null;
        }
        if (restartConfirmIntervalId !== null) {
          window.clearInterval(restartConfirmIntervalId);
          restartConfirmIntervalId = null;
        }
        setRestartButtonTitle('Restart');
      };

      const updateRestartConfirmTitle = () => {
        if (!restartConfirmArmed) return;
        const elapsedMs = performance.now() - restartConfirmArmedAtMs;
        const remainingMs = Math.max(0, RESET_DEFAULTS_CONFIRM_WINDOW_MS - elapsedMs);
        const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
        setRestartButtonTitle(`Confirm Restart (${remainingSec})`);
      };

      restartButton.on('click', () => {
        if (!restartConfirmArmed) {
          restartConfirmArmed = true;
          restartConfirmArmedAtMs = performance.now();
          updateRestartConfirmTitle();
          if (restartConfirmIntervalId !== null) window.clearInterval(restartConfirmIntervalId);
          restartConfirmIntervalId = window.setInterval(updateRestartConfirmTitle, CONFIRM_COUNTDOWN_TICK_MS);
          if (restartConfirmTimerId !== null) window.clearTimeout(restartConfirmTimerId);
          restartConfirmTimerId = window.setTimeout(clearRestartConfirm, RESET_DEFAULTS_CONFIRM_WINDOW_MS);
          return;
        }
        const now = performance.now();
        if (now - restartConfirmArmedAtMs < RESET_DEFAULTS_MIN_CONFIRM_DELAY_MS) return;
        clearRestartConfirm();
        sim.restartSimulation();
      });

      const resetButton = pane.addButton({ title: 'Reset Defaults' });
      styleActionButton(resetButton, 'debug-action-reset');
      let resetConfirmArmed = false;
      let resetConfirmArmedAtMs = 0;
      let resetConfirmTimerId: number | null = null;
      let resetConfirmIntervalId: number | null = null;
      const resetButtonLabelEl = resetButton.element?.querySelector('.tp-btnv_t') as HTMLElement | null;

      const setResetButtonTitle = (title: string) => {
        if ('title' in resetButton) {
          (resetButton as { title: string }).title = title;
        }
        if (resetButtonLabelEl) resetButtonLabelEl.textContent = title;
      };

      const clearResetConfirm = () => {
        resetConfirmArmed = false;
        resetConfirmArmedAtMs = 0;
        if (resetConfirmTimerId !== null) {
          window.clearTimeout(resetConfirmTimerId);
          resetConfirmTimerId = null;
        }
        if (resetConfirmIntervalId !== null) {
          window.clearInterval(resetConfirmIntervalId);
          resetConfirmIntervalId = null;
        }
        setResetButtonTitle('Reset Defaults');
      };

      const updateResetConfirmTitle = () => {
        if (!resetConfirmArmed) return;
        const elapsedMs = performance.now() - resetConfirmArmedAtMs;
        const remainingMs = Math.max(0, RESET_DEFAULTS_CONFIRM_WINDOW_MS - elapsedMs);
        const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
        setResetButtonTitle(`Confirm Reset (${remainingSec})`);
      };

      resetButton.on('click', () => {
        if (!resetConfirmArmed) {
          resetConfirmArmed = true;
          resetConfirmArmedAtMs = performance.now();
          updateResetConfirmTitle();
          if (resetConfirmIntervalId !== null) window.clearInterval(resetConfirmIntervalId);
          resetConfirmIntervalId = window.setInterval(updateResetConfirmTitle, CONFIRM_COUNTDOWN_TICK_MS);
          if (resetConfirmTimerId !== null) window.clearTimeout(resetConfirmTimerId);
          resetConfirmTimerId = window.setTimeout(clearResetConfirm, RESET_DEFAULTS_CONFIRM_WINDOW_MS);
          return;
        }
        const now = performance.now();
        if (now - resetConfirmArmedAtMs < RESET_DEFAULTS_MIN_CONFIRM_DELAY_MS) return;
        clearResetConfirm();
        sim.resetSettingsToDefaults();
        options?.resetRenderStyleDefaults?.();
        options?.resetBodyRenderDefaults?.();
        this.uiState.speed = sim.speed;
        this.uiState.renderStyle = options?.getRenderStyle ? options.getRenderStyle() : DEFAULT_RENDER_STYLE;
        syncBodyVisualUiStateFromSource();
        pane.refresh();
      });

      const visualsFolder = pane.addFolder({ title: 'Visuals', expanded: false });

      addBindingWithHelp(visualsFolder, this.uiState, 'renderStyle', {
        label: 'Style',
        options: {
          'Connected Bodies': 'Connected',
          'Metaball (Legacy)': 'MetaballLegacy',
        },
      }, 'renderStyle').on('change', (e: any) => {
        const style = e.value as RenderStyle;
        this.uiState.renderStyle = style;
        options?.setRenderStyle?.(style);
      });

      addBindingWithHelp(visualsFolder, this.uiState, 'bodyRenderPreset', {
        label: 'Preset',
        options: { Balanced: 'Balanced', Chunky: 'Chunky', Technical: 'Technical' },
      }, 'bodyRenderPreset').on('change', (e: any) => {
        const preset = e.value as BodyRenderPreset;
        this.uiState.bodyRenderPreset = preset;
        options?.setBodyRenderPreset?.(preset);
        syncBodyVisualUiStateFromSource();
        pane.refresh();
      });

      addBindingWithHelp(visualsFolder, this.uiState, 'moduleColors', {
        label: 'Module Colors',
      }, 'bodyModuleColors').on('change', (e: any) => {
        this.uiState.moduleColors = !!e.value;
        options?.setBodyRenderSetting?.('moduleColors', this.uiState.moduleColors);
      });

      addBindingWithHelp(visualsFolder, this.uiState, 'creatureOutline', {
        label: 'Creature Outline',
      }, 'bodyCreatureOutline').on('change', (e: any) => {
        this.uiState.creatureOutline = !!e.value;
        options?.setBodyRenderSetting?.('creatureOutline', this.uiState.creatureOutline);
      });

      const visualsAdvanced = visualsFolder.addFolder({ title: 'Advanced', expanded: false });

      addBindingWithHelp(visualsAdvanced, this.uiState, 'nodeRadiusMult', {
        min: 0.75, max: 1.35, step: 0.01, label: 'Node Radius', format: (v: number) => v.toFixed(2),
      }, 'bodyNodeRadiusMult').on('change', (e: any) => {
        this.uiState.nodeRadiusMult = e.value;
        options?.setBodyRenderSetting?.('nodeRadiusMult', e.value);
      });

      addBindingWithHelp(visualsAdvanced, this.uiState, 'linkThicknessMult', {
        min: 0.35, max: 1.5, step: 0.01, label: 'Link Thickness', format: (v: number) => v.toFixed(2),
      }, 'bodyLinkThicknessMult').on('change', (e: any) => {
        this.uiState.linkThicknessMult = e.value;
        options?.setBodyRenderSetting?.('linkThicknessMult', e.value);
      });

      addBindingWithHelp(visualsAdvanced, this.uiState, 'edgeWidthFrac', {
        min: 0.02, max: 0.45, step: 0.01, label: 'Edge Width', format: (v: number) => v.toFixed(2),
      }, 'bodyEdgeWidthFrac').on('change', (e: any) => {
        this.uiState.edgeWidthFrac = e.value;
        options?.setBodyRenderSetting?.('edgeWidthFrac', e.value);
      });

      addBindingWithHelp(visualsAdvanced, this.uiState, 'edgeDarkness', {
        min: 0, max: 0.8, step: 0.01, label: 'Edge Darkness', format: (v: number) => v.toFixed(2),
      }, 'bodyEdgeDarkness').on('change', (e: any) => {
        this.uiState.edgeDarkness = e.value;
        options?.setBodyRenderSetting?.('edgeDarkness', e.value);
      });

      const simFolder = pane.addFolder({ title: 'Simulation', expanded: true });

      addBindingWithHelp(simFolder, sim.params, 'foodSpawnRate', {
        min: 0, max: 30, step: 1, label: 'Food/tick',
      });

      addBindingWithHelp(simFolder, sim.params, 'foodDispersion', {
        min: 0, max: 1, step: 0.05, label: 'Food Dispersion',
      });

      addBindingWithHelp(simFolder, sim.params, 'showRoleMarkers', {
        label: 'Role Markers',
      });

      const foodCommsFolder = pane.addFolder({ title: 'Food Comms', expanded: false });

      addBindingWithHelp(foodCommsFolder, sim.params, 'foodSignalRadius', {
        min: 120, max: 600, step: 10, label: 'Signal Radius',
      });

      addBindingWithHelp(foodCommsFolder, sim.params, 'foodSignalDecayTicks', {
        min: 20, max: 200, step: 1, label: 'Signal Decay',
      });

      addBindingWithHelp(foodCommsFolder, sim.params, 'foodSignalMinStrength', {
        min: 0.01, max: 0.5, step: 0.01, label: 'Signal Min',
      });

      addBindingWithHelp(foodCommsFolder, sim.params, 'foodSignalShareWeight', {
        min: 0.1, max: 1.5, step: 0.05, label: 'Share Weight',
      });

      addBindingWithHelp(foodCommsFolder, sim.params, 'foodSignalBlendWeight', {
        min: 0.05, max: 1.2, step: 0.05, label: 'Blend Weight',
      });

      addBindingWithHelp(foodCommsFolder, sim.params, 'foodSignalRelayAttenuation', {
        min: 0.1, max: 1, step: 0.05, label: 'Relay Atten.',
      });

      addBindingWithHelp(foodCommsFolder, sim.params, 'foodSignalMaxHops', {
        min: 0, max: 5, step: 1, label: 'Max Hops',
      });

      addBindingWithHelp(foodCommsFolder, sim.params, 'foodSignalRelayAgeFactor', {
        min: 0.2, max: 1, step: 0.05, label: 'Relay Age',
      });

      addBindingWithHelp(simFolder, sim.params, 'eatFullStopFraction', {
        min: 0.5, max: 1, step: 0.05, label: 'Eat Stop',
      });

      addBindingWithHelp(simFolder, sim.params, 'eatResumeFraction', {
        min: 0.2, max: 0.95, step: 0.05, label: 'Eat Resume',
      });

      addBindingWithHelp(simFolder, sim.params, 'eatCooldownTicks', {
        min: 0, max: 60, step: 1, label: 'Eat Cooldown',
      });

      addBindingWithHelp(simFolder, sim.params, 'eatMaxItemsPerSubstep', {
        min: 1, max: 5, step: 1, label: 'Eat Max/Sub',
      });

      addBindingWithHelp(simFolder, sim.params, 'metabolismCost', {
        min: 0, max: 1, step: 0.01, label: 'Metabolism', format: (v: number) => v.toFixed(2),
      });

      addBindingWithHelp(simFolder, sim.params, 'metabolismExponent', {
        min: 0.5, max: 1.0, step: 0.05, label: 'Metab. Exponent',
      });

      addBindingWithHelp(simFolder, sim.params, 'motorForce', {
        min: 0, max: 3, step: 0.1, label: 'Motor Force',
      });

      addBindingWithHelp(simFolder, sim.params, 'mutationRate', {
        min: 0, max: 0.5, step: 0.01, label: 'Mutation Rate',
      });

      addBindingWithHelp(simFolder, sim.params, 'structuralMutationRate', {
        min: 0, max: 0.5, step: 0.01, label: 'Struct. Mutation',
      });

      addBindingWithHelp(simFolder, sim.params, 'creatureCap', {
        min: 1, max: MAX_CREATURES, step: 10, label: 'Creature Cap',
      });

      const growthFolder = pane.addFolder({ title: 'Growth & Size', expanded: false });

      addBindingWithHelp(growthFolder, sim.params, 'sizeLifecycleEnabled', {
        label: 'Enable Lifecycle',
      });

      addBindingWithHelp(growthFolder, sim.params, 'sizeBirthScale', {
        min: 0.1, max: 1, step: 0.01, label: 'Newborn Scale',
      });

      addBindingWithHelp(growthFolder, sim.params, 'sizeAdultMaxScale', {
        min: 1, max: 6, step: 0.1, label: 'Adult Max',
      });

      addBindingWithHelp(growthFolder, sim.params, 'sizeAdultAgeFrac', {
        min: 0.1, max: 0.9, step: 0.01, label: 'Adult Age Frac',
      });

      addBindingWithHelp(growthFolder, sim.params, 'sizeGrowthEnergyMinFrac', {
        min: 0, max: 0.95, step: 0.01, label: 'Grow E Min',
      });

      addBindingWithHelp(growthFolder, sim.params, 'sizeGrowthEnergyFullFrac', {
        min: 0.05, max: 1, step: 0.01, label: 'Grow E Full',
      });

      addBindingWithHelp(growthFolder, sim.params, 'sizeOvergrowEnergyFrac', {
        min: 0.5, max: 1, step: 0.01, label: 'Overgrow E',
      });

      addBindingWithHelp(growthFolder, sim.params, 'sizeReproMinAdultFrac', {
        min: 0.7, max: 1, step: 0.01, label: 'Repro Min Adult',
      });

      addBindingWithHelp(growthFolder, sim.params, 'sizeMetabolismExponent', {
        min: 0.8, max: 2.4, step: 0.05, label: 'Size Metab Exp',
      });

      addBindingWithHelp(growthFolder, sim.params, 'predatorSizeTargetHardRatio', {
        min: 1, max: 3, step: 0.05, label: 'Pred Hard Ratio',
      });

      addBindingWithHelp(growthFolder, sim.params, 'predatorSizeDamageExponent', {
        min: 0, max: 1.5, step: 0.05, label: 'Pred Dmg Exp',
      });

      const regroupOverlayFolder = pane.addFolder({ title: 'Regroup Overlay', expanded: false });

      addBindingWithHelp(regroupOverlayFolder, sim.params, 'regroupOverlayEnabled', {
        label: 'Regroup Overlay',
      });

      addBindingWithHelp(regroupOverlayFolder, sim.params, 'regroupOverlayScope', {
        label: 'Scope',
        options: {
          Urgent: 'urgent',
          'Isolated+Urgent': 'isolated',
          'All Packed': 'all',
        },
      });

      addBindingWithHelp(regroupOverlayFolder, sim.params, 'regroupOverlayLive', {
        label: 'Show While Running',
      });

      const photoFolder = pane.addFolder({ title: 'Photosynthesis', expanded: false });

      addBindingWithHelp(photoFolder, sim.params, 'photoEnergyPerTick', {
        min: 0, max: 1.5, step: 0.01, label: 'Base Gain',
      });

      addBindingWithHelp(photoFolder, sim.params, 'photoCrowdPenaltyMax', {
        min: 0, max: 0.95, step: 0.01, label: 'Crowd Penalty',
      });

      addBindingWithHelp(photoFolder, sim.params, 'photoIdlePenaltyMinMult', {
        min: 0, max: 1, step: 0.01, label: 'Idle Min Mult',
      });

      addBindingWithHelp(photoFolder, sim.params, 'photoMaintenanceCostPerBlob', {
        min: 0, max: 0.5, step: 0.01, label: 'Maint/Base',
      });

      addBindingWithHelp(photoFolder, sim.params, 'photoMaintenanceSizeMult', {
        min: 0, max: 0.5, step: 0.01, label: 'Maint/Size',
      });

      const perfFolder = pane.addFolder({ title: 'Performance LOD', expanded: false });

      addBindingWithHelp(perfFolder, sim.params, 'perfLodEnabled', {
        label: 'Enable LOD',
      });

      addBindingWithHelp(perfFolder, sim.params, 'perfLodTierOverride', {
        min: -1, max: 2, step: 1, label: 'Tier Override',
      });

      addBindingWithHelp(perfFolder, sim.params, 'perfNeighborBudgetTier1', {
        min: 8, max: 128, step: 4, label: 'Nbr Budget T1',
      });

      addBindingWithHelp(perfFolder, sim.params, 'perfNeighborBudgetTier2', {
        min: 4, max: 96, step: 4, label: 'Nbr Budget T2',
      });

      const predFolder = pane.addFolder({ title: 'Predation & Carrion', expanded: false });

      addBindingWithHelp(predFolder, sim.params, 'predationStealFraction', {
        min: 0, max: 1, step: 0.05, label: 'Steal Fraction',
      });

      addBindingWithHelp(predFolder, sim.params, 'predationKinThreshold', {
        min: 0, max: 1, step: 0.05, label: 'Kin Threshold',
      });

      addBindingWithHelp(predFolder, sim.params, 'carrionDropDivisor', {
        min: 1, max: 6, step: 1, label: 'Carrion Divisor',
      });

      addBindingWithHelp(predFolder, sim.params, 'lungeSpeedMult', {
        min: 1, max: 3, step: 0.1, label: 'Lunge Speed',
      });

      addBindingWithHelp(predFolder, sim.params, 'stealthDetectionMult', {
        min: 0.2, max: 1, step: 0.05, label: 'Stealth Det.',
      });

      addBindingWithHelp(predFolder, sim.params, 'killBountyFraction', {
        min: 0, max: 1, step: 0.05, label: 'Kill Bounty',
      });

      const reproFolder = pane.addFolder({ title: 'Reproduction', expanded: false });

      addBindingWithHelp(reproFolder, sim.params, 'mateMinSimilarity', {
        min: 0, max: 1, step: 0.05, label: 'Mate Similarity',
      });

      addBindingWithHelp(reproFolder, sim.params, 'asexualFallbackTicks', {
        min: 50, max: 1000, step: 50, label: 'Asex. Fallback',
      });

      // Accordion behavior: opening one folder closes all others.
      const folders = [simFolder, visualsFolder, foodCommsFolder, growthFolder, regroupOverlayFolder, photoFolder, perfFolder, predFolder, reproFolder];
      for (const folder of folders) {
        folder.on('fold', (ev: any) => {
          if (!ev.expanded) return;
          for (const other of folders) {
            if (other !== folder && other.expanded) other.expanded = false;
          }
        });
      }
    });
  }

  setSocialColorMode(mode: SocialColorMode): void {
    this.uiState.socialColorMode = mode;
    if (this.pane) this.pane.refresh();
  }
}
