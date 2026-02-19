import { SimulationLoop, type SimParams } from '../simulation/simulation-loop';
import { MIN_SPEED, MAX_SPEED, MAX_CREATURES } from '../constants';

type DebugControlKey = 'speed' | keyof SimParams;

const CONTROL_HELP: Record<DebugControlKey, string> = {
  speed: 'Number of simulation substeps per frame; higher runs faster but costs more CPU.',
  foodSpawnRate: 'Plant food spawned per tick; higher means more available food.',
  foodDispersion: '0 keeps food clustered, 1 spreads it more uniformly.',
  showRoleMarkers: 'Shows/hides scout and leader debug rings.',
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
  labelEl.tabIndex = 0;
  labelEl.setAttribute('aria-describedby', HELP_TOOLTIP_ID);
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
  labelEl.addEventListener('focus', () => {
    const rect = labelEl.getBoundingClientRect();
    showHelpTooltip(helpText, rect.left + rect.width * 0.5, rect.top + rect.height * 0.5);
  });
  labelEl.addEventListener('blur', hideHelpTooltip);
  labelEl.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') hideHelpTooltip();
  });
}

function addBindingWithHelp<T extends object, K extends keyof T & string>(
  container: BindingContainer,
  target: T,
  key: K,
  params?: Record<string, unknown>,
  helpKey?: DebugControlKey,
): any {
  const bindingApi = params ? container.addBinding(target, key, params) : container.addBinding(target, key);
  const resolvedHelpKey = helpKey ?? (key as unknown as DebugControlKey);
  attachLabelHelp(bindingApi, CONTROL_HELP[resolvedHelpKey]);
  return bindingApi;
}

export class DebugPanel {
  constructor(sim: SimulationLoop) {
    // Dynamic import to avoid type issues with tweakpane
    import('tweakpane').then(({ Pane }) => {
      const pane = new Pane({ title: 'Controls', expanded: true }) as any;

      const params = { speed: sim.speed };

      addBindingWithHelp(pane, params, 'speed', {
        min: MIN_SPEED, max: MAX_SPEED, step: 1, label: 'Speed',
      }).on('change', (e: any) => { sim.speed = e.value; });

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
        min: 0, max: 1, step: 0.01, label: 'Metabolism',
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
      const folders = [simFolder, foodCommsFolder, photoFolder, perfFolder, predFolder, reproFolder];
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
}
