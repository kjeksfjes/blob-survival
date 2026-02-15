import { World } from '../simulation/world';
import { PACK_MERGE_SMALL_PACK_MAX } from '../constants';

export class Hud {
  private el: HTMLElement;
  private fps = 0;
  private lastTime = performance.now();
  private frameCount = 0;
  private verbose = false;

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

  toggleVerbose() {
    this.verbose = !this.verbose;
  }

  update(world: World, speed: number, viewModeLabel: string) {
    const clanCreatureCounts = new Map<number, number>();
    const clanPackSets = new Map<number, Set<number>>();
    const packCreatureCounts = new Map<number, number>();

    for (let ci = 0; ci < world.creatureAlive.length; ci++) {
      if (!world.creatureAlive[ci]) continue;
      const clanId = world.creatureClanId[ci];
      const packId = world.creaturePackId[ci];
      if (clanId >= 0) {
        clanCreatureCounts.set(clanId, (clanCreatureCounts.get(clanId) ?? 0) + 1);
        let set = clanPackSets.get(clanId);
        if (!set) {
          set = new Set<number>();
          clanPackSets.set(clanId, set);
        }
        if (packId >= 0) set.add(packId);
      }
      if (packId >= 0) {
        packCreatureCounts.set(packId, (packCreatureCounts.get(packId) ?? 0) + 1);
      }
    }

    let largestPack = 0;
    for (const count of packCreatureCounts.values()) {
      if (count > largestPack) largestPack = count;
    }
    const clanCount = clanCreatureCounts.size;
    const packCount = packCreatureCounts.size;
    const avgPackSize = packCount > 0 ? world.creatureCount / packCount : 0;

    const topLineages = Array.from(clanCreatureCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([clanId, creatureCount]) => {
        const packs = clanPackSets.get(clanId)?.size ?? 0;
        return `Lineage ${clanId}: ${packs} packs / ${creatureCount} creatures`;
      });

    const lines = [
      `FPS: ${this.fps}`,
      `Tick: ${world.tick}`,
      `Speed: ${speed}x`,
      `View: ${viewModeLabel}`,
      `HUD: ${this.verbose ? 'Verbose' : 'Compact'} (H)`,
      `Sim Step ms: ${world.simStepMs.toFixed(2)}`,
      `LOD Tier: ${world.perfLodTierActive}`,
      ``,
      `Creatures: ${world.creatureCount}`,
      `Food: ${world.foodCount}`,
      `Food Plant/Meat: ${world.foodPlantCount}/${world.foodMeatCount}`,
      `Food Eaten Total P/M: ${world.foodEatenPlantTotal}/${world.foodEatenMeatTotal}`,
      `Clans: ${clanCount}`,
      `Packs: ${packCount}`,
      `Merge Cap: ${PACK_MERGE_SMALL_PACK_MAX}`,
      `Avg Pack Size: ${avgPackSize.toFixed(1)}`,
      `Largest Pack: ${largestPack}`,
      ...topLineages,
      ``,
      `Births: ${world.totalBirths}`,
      `Deaths: ${world.totalDeaths}`,
      ``,
      `Flock Avg Neighbors: ${world.flockAvgSamePackNeighbors.toFixed(2)}`,
      ``,
      `Food Wants/Sat: ${world.foodWantsCount}/${world.foodSatiatedCount}`,
      `Food Hungry: ${world.foodHungryCount}`,
      `Predators: ${world.predatorCount}`,
      `Avg Energy Frac: ${world.avgEnergyFrac.toFixed(2)}`,
    ];

    if (this.verbose) {
      lines.push(
        ``,
        `Blobs: ${world.blobCount}`,
        `Flock Fear: ${world.flockFearOverrides}`,
        `Flock Sep Hard: ${world.flockHardSeparationApplies}`,
        `Flock Sep Soft: ${world.flockSoftSeparationApplies}`,
        `Flock Anti-Mill: ${world.flockAntiMillApplies}`,
        `Flock Switches: ${world.flockPackSwitches}`,
        `Flock Merges: ${world.flockPackMerges}`,
        `Flock Leader Reassign: ${world.flockLeaderReassigns}`,
        `FoodComm Direct: ${world.foodSignalDirectEmits}`,
        `FoodComm Relay: ${world.foodSignalRelayAdopts}`,
        `FoodComm Steer: ${world.foodSignalSteerApplies}`,
        `FoodComm Expired: ${world.foodSignalExpiredClears}`,
        `FoodComm Avg Str: ${world.foodSignalAvgStrength.toFixed(2)}`,
        `FoodComm Avg Hop: ${world.foodSignalAvgHop.toFixed(2)}`,
        `Intent S/F/H/M/Fl: ${world.intentScoutCount}/${world.intentForageCount}/${world.intentHuntCount}/${world.intentMateCount}/${world.intentFleeCount}`,
        `Perf Food/Sens/Flock: ${world.perfMsFood.toFixed(2)}/${world.perfMsSensors.toFixed(2)}/${world.perfMsFlocking.toFixed(2)}`,
        `Perf Phys/Coll/Eco: ${world.perfMsPhysics.toFixed(2)}/${world.perfMsCollision.toFixed(2)}/${world.perfMsEcology.toFixed(2)}`,
        `Perf Pack ms: ${world.perfMsRenderPack.toFixed(2)}`,
        `Coll Pairs T/R: ${world.perfCollisionPairsTested}/${world.perfCollisionPairsResolved}`,
        `Food Overflow Fallbacks: ${world.perfFoodOverflowFallbacks}`,
        ``,
        `Agg Win: ${world.aggWindowTicks} (${world.aggWindowStartTick}-${world.aggWindowEndTick})`,
        `Agg Food: ${world.aggAvgFood.toFixed(1)}`,
        `Agg Meat: ${world.aggAvgMeat.toFixed(1)}`,
        `Agg Meat Frac: ${world.aggMeatFraction.toFixed(2)}`,
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
        `Agg Eat P/M: ${world.aggAvgEatPlant.toFixed(1)}/${world.aggAvgEatMeat.toFixed(1)}`,
      );
    }

    this.el.innerHTML = lines.join('<br>');
  }
}
