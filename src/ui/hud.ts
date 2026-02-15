import { World } from '../simulation/world';

export class Hud {
  private el: HTMLElement;
  private fps = 0;
  private lastTime = performance.now();
  private frameCount = 0;

  constructor() {
    this.el = document.getElementById('hud')!;
  }

  tick() {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
    }
  }

  update(world: World, speed: number) {
    this.el.innerHTML = [
      `FPS: ${this.fps}`,
      `Tick: ${world.tick}`,
      `Speed: ${speed}x`,
      ``,
      `Creatures: ${world.creatureCount}`,
      `Blobs: ${world.blobCount}`,
      `Food: ${world.foodCount}`,
      ``,
      `Births: ${world.totalBirths}`,
      `Deaths: ${world.totalDeaths}`,
      ``,
      `Flock Fear: ${world.flockFearOverrides}`,
      `Flock Sep Hard: ${world.flockHardSeparationApplies}`,
      `Flock Sep Soft: ${world.flockSoftSeparationApplies}`,
      `Flock Anti-Mill: ${world.flockAntiMillApplies}`,
      `Flock Switches: ${world.flockPackSwitches}`,
      `Flock Merges: ${world.flockPackMerges}`,
      `Flock Leader Reassign: ${world.flockLeaderReassigns}`,
      `Flock Avg Neighbors: ${world.flockAvgSamePackNeighbors.toFixed(2)}`,
      ``,
      `FoodComm Direct: ${world.foodSignalDirectEmits}`,
      `FoodComm Relay: ${world.foodSignalRelayAdopts}`,
      `FoodComm Steer: ${world.foodSignalSteerApplies}`,
      `FoodComm Expired: ${world.foodSignalExpiredClears}`,
      `FoodComm Avg Str: ${world.foodSignalAvgStrength.toFixed(2)}`,
      `FoodComm Avg Hop: ${world.foodSignalAvgHop.toFixed(2)}`,
      `Food Wants/Sat: ${world.foodWantsCount}/${world.foodSatiatedCount}`,
      `Food Hungry: ${world.foodHungryCount}`,
      `Predators: ${world.predatorCount}`,
      `Avg Energy Frac: ${world.avgEnergyFrac.toFixed(2)}`,
      `Intent S/F/H/M/Fl: ${world.intentScoutCount}/${world.intentForageCount}/${world.intentHuntCount}/${world.intentMateCount}/${world.intentFleeCount}`,
      ``,
      `Agg Win: ${world.aggWindowTicks} (${world.aggWindowStartTick}-${world.aggWindowEndTick})`,
      `Agg Food: ${world.aggAvgFood.toFixed(1)}`,
      `Agg Creatures: ${world.aggAvgCreatures.toFixed(1)}`,
      `Agg Relay/t: ${world.aggRelayRate.toFixed(2)}`,
      `Agg Steer/t: ${world.aggSteerRate.toFixed(2)}`,
      `Agg R/D: ${world.aggRelayPerDirect.toFixed(2)}`,
      `Agg S/R: ${world.aggSteerPerRelay.toFixed(2)}`,
      `Agg Str Min/Max: ${world.aggMinSignalStrength.toFixed(2)}/${world.aggMaxSignalStrength.toFixed(2)}`,
      `Agg Hop Min/Max: ${world.aggMinSignalHop.toFixed(2)}/${world.aggMaxSignalHop.toFixed(2)}`,
      `Agg Wants/Hungry: ${world.aggAvgWantsFood.toFixed(1)}/${world.aggAvgHungry.toFixed(1)}`,
      `Agg Predators: ${world.aggAvgPredators.toFixed(1)}`,
      `Agg Energy Frac: ${world.aggAvgEnergyFrac.toFixed(2)}`,
      `Agg Forage/Hunt: ${world.aggAvgIntentForage.toFixed(1)}/${world.aggAvgIntentHunt.toFixed(1)}`,
    ].join('<br>');
  }
}
