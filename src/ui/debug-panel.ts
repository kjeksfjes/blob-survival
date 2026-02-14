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

      const simFolder = pane.addFolder({ title: 'Simulation' });

      simFolder.addBinding(sim.params, 'foodSpawnRate', {
        min: 0, max: 30, step: 1, label: 'Food/tick',
      });

      simFolder.addBinding(sim.params, 'metabolismCost', {
        min: 0, max: 1, step: 0.01, label: 'Metabolism',
      });

      simFolder.addBinding(sim.params, 'motorForce', {
        min: 0, max: 3, step: 0.1, label: 'Motor Force',
      });

      simFolder.addBinding(sim.params, 'mutationRate', {
        min: 0, max: 0.5, step: 0.01, label: 'Mutation Rate',
      });

      simFolder.addBinding(sim.params, 'creatureCap', {
        min: 1, max: MAX_CREATURES, step: 10, label: 'Creature Cap',
      });
    });
  }
}
