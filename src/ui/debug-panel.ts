import { SimulationLoop } from '../simulation/simulation-loop';
import { MIN_SPEED, MAX_SPEED, MAX_CREATURES } from '../constants';

export class DebugPanel {
  constructor(sim: SimulationLoop) {
    // Dynamic import to avoid type issues with tweakpane
    import('tweakpane').then(({ Pane }) => {
      const pane = new Pane({ title: 'Controls', expanded: true }) as any;

      const params = { speed: sim.speed };

      pane.addBinding(params, 'speed', {
        min: MIN_SPEED, max: MAX_SPEED, step: 1, label: 'Speed',
      }).on('change', (e: any) => { sim.speed = e.value; });

      const simFolder = pane.addFolder({ title: 'Simulation', expanded: true });

      simFolder.addBinding(sim.params, 'foodSpawnRate', {
        min: 0, max: 30, step: 1, label: 'Food/tick',
      });

      simFolder.addBinding(sim.params, 'foodDispersion', {
        min: 0, max: 1, step: 0.05, label: 'Food Dispersion',
      });

      simFolder.addBinding(sim.params, 'showRoleMarkers', {
        label: 'Role Markers',
      });

      const foodCommsFolder = pane.addFolder({ title: 'Food Comms', expanded: false });

      foodCommsFolder.addBinding(sim.params, 'foodSignalRadius', {
        min: 120, max: 600, step: 10, label: 'Signal Radius',
      });

      foodCommsFolder.addBinding(sim.params, 'foodSignalDecayTicks', {
        min: 20, max: 200, step: 1, label: 'Signal Decay',
      });

      foodCommsFolder.addBinding(sim.params, 'foodSignalMinStrength', {
        min: 0.01, max: 0.5, step: 0.01, label: 'Signal Min',
      });

      foodCommsFolder.addBinding(sim.params, 'foodSignalShareWeight', {
        min: 0.1, max: 1.5, step: 0.05, label: 'Share Weight',
      });

      foodCommsFolder.addBinding(sim.params, 'foodSignalBlendWeight', {
        min: 0.05, max: 1.2, step: 0.05, label: 'Blend Weight',
      });

      foodCommsFolder.addBinding(sim.params, 'foodSignalRelayAttenuation', {
        min: 0.1, max: 1, step: 0.05, label: 'Relay Atten.',
      });

      foodCommsFolder.addBinding(sim.params, 'foodSignalMaxHops', {
        min: 0, max: 5, step: 1, label: 'Max Hops',
      });

      foodCommsFolder.addBinding(sim.params, 'foodSignalRelayAgeFactor', {
        min: 0.2, max: 1, step: 0.05, label: 'Relay Age',
      });

      simFolder.addBinding(sim.params, 'eatFullStopFraction', {
        min: 0.5, max: 1, step: 0.05, label: 'Eat Stop',
      });

      simFolder.addBinding(sim.params, 'eatResumeFraction', {
        min: 0.2, max: 0.95, step: 0.05, label: 'Eat Resume',
      });

      simFolder.addBinding(sim.params, 'eatCooldownTicks', {
        min: 0, max: 60, step: 1, label: 'Eat Cooldown',
      });

      simFolder.addBinding(sim.params, 'eatMaxItemsPerSubstep', {
        min: 1, max: 5, step: 1, label: 'Eat Max/Sub',
      });

      simFolder.addBinding(sim.params, 'metabolismCost', {
        min: 0, max: 1, step: 0.01, label: 'Metabolism',
      });

      simFolder.addBinding(sim.params, 'metabolismExponent', {
        min: 0.5, max: 1.0, step: 0.05, label: 'Metab. Exponent',
      });

      simFolder.addBinding(sim.params, 'motorForce', {
        min: 0, max: 3, step: 0.1, label: 'Motor Force',
      });

      simFolder.addBinding(sim.params, 'mutationRate', {
        min: 0, max: 0.5, step: 0.01, label: 'Mutation Rate',
      });

      simFolder.addBinding(sim.params, 'structuralMutationRate', {
        min: 0, max: 0.5, step: 0.01, label: 'Struct. Mutation',
      });

      simFolder.addBinding(sim.params, 'creatureCap', {
        min: 1, max: MAX_CREATURES, step: 10, label: 'Creature Cap',
      });

      const photoFolder = pane.addFolder({ title: 'Photosynthesis', expanded: false });

      photoFolder.addBinding(sim.params, 'photoEnergyPerTick', {
        min: 0, max: 1.5, step: 0.01, label: 'Base Gain',
      });

      photoFolder.addBinding(sim.params, 'photoCrowdPenaltyMax', {
        min: 0, max: 0.95, step: 0.01, label: 'Crowd Penalty',
      });

      photoFolder.addBinding(sim.params, 'photoIdlePenaltyMinMult', {
        min: 0, max: 1, step: 0.01, label: 'Idle Min Mult',
      });

      photoFolder.addBinding(sim.params, 'photoMaintenanceCostPerBlob', {
        min: 0, max: 0.5, step: 0.01, label: 'Maint/Base',
      });

      photoFolder.addBinding(sim.params, 'photoMaintenanceSizeMult', {
        min: 0, max: 0.5, step: 0.01, label: 'Maint/Size',
      });

      const perfFolder = pane.addFolder({ title: 'Performance LOD', expanded: false });

      perfFolder.addBinding(sim.params, 'perfLodEnabled', {
        label: 'Enable LOD',
      });

      perfFolder.addBinding(sim.params, 'perfLodTierOverride', {
        min: -1, max: 2, step: 1, label: 'Tier Override',
      });

      perfFolder.addBinding(sim.params, 'perfNeighborBudgetTier1', {
        min: 8, max: 128, step: 4, label: 'Nbr Budget T1',
      });

      perfFolder.addBinding(sim.params, 'perfNeighborBudgetTier2', {
        min: 4, max: 96, step: 4, label: 'Nbr Budget T2',
      });

      const predFolder = pane.addFolder({ title: 'Predation & Carrion', expanded: false });

      predFolder.addBinding(sim.params, 'predationStealFraction', {
        min: 0, max: 1, step: 0.05, label: 'Steal Fraction',
      });

      predFolder.addBinding(sim.params, 'predationKinThreshold', {
        min: 0, max: 1, step: 0.05, label: 'Kin Threshold',
      });

      predFolder.addBinding(sim.params, 'carrionDropDivisor', {
        min: 1, max: 6, step: 1, label: 'Carrion Divisor',
      });

      predFolder.addBinding(sim.params, 'lungeSpeedMult', {
        min: 1, max: 3, step: 0.1, label: 'Lunge Speed',
      });

      predFolder.addBinding(sim.params, 'stealthDetectionMult', {
        min: 0.2, max: 1, step: 0.05, label: 'Stealth Det.',
      });

      predFolder.addBinding(sim.params, 'killBountyFraction', {
        min: 0, max: 1, step: 0.05, label: 'Kill Bounty',
      });

      const reproFolder = pane.addFolder({ title: 'Reproduction', expanded: false });

      reproFolder.addBinding(sim.params, 'mateMinSimilarity', {
        min: 0, max: 1, step: 0.05, label: 'Mate Similarity',
      });

      reproFolder.addBinding(sim.params, 'asexualFallbackTicks', {
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
