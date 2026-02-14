# Future Ideas

## Environmental Gradient
Food density or light intensity varies spatially (e.g., food-rich center, bright edges for photosynthesis). Different lineages would colonize different zones and visually cluster by region. Could implement as a density function modulating `spawnFood` placement and `PHOTO_ENERGY_PER_TICK` based on world position.

## Creature Glow Reflects Strategy
Brightness/saturation scales with energy level, and aggressive creatures (weapon-heavy) get a visual tint shift. Makes behavioral "species" immediately readable at a glance. Could modify the GPU packing in `main.ts` to encode energy ratio and weapon count into the alpha/color channels.

## Food Clustering / Patches
Spawn food in rotating hotspot patches instead of uniform random. Creates territories worth defending, barren zones that favor photosynthesizers or fat storage. Could use 3-5 Gaussian blobs that drift slowly across the world.

## Venom Blob Type
A blob that makes the creature costly to attack — attacker loses extra energy on hit (beyond weapon cost). Unlike SHIELD which reduces damage taken, venom punishes the attacker. Creates poison/aposematism dynamics: "don't eat the colorful ones." Could lead to mimicry if non-venomous creatures evolve similar hues.

## Seasonal Variation
Cycle food spawn rate (or photo efficiency) on a slow sine wave. Boom periods favor fast reproducers, bust periods favor fat storage and efficiency. Forces generalist vs specialist tradeoffs.

## Spore / Seed Dispersal
Alternative reproduction mode: instead of budding next to parent, launch offspring to a random distant location. Costs more energy but colonizes empty areas. Could be a genome parameter (dispersal distance) that mutations tune.

## Camouflage / Stealth
Reduce threat detection range against this creature. Ambush predators that are hard to detect until close. Counter-play: sensors extend detection enough to overcome camouflage.

## Filter Feeder Blob Type
Passively absorbs energy from food within a radius without needing to physically touch it. Slower intake than MOUTH but works while stationary. Favors large sedentary creatures in food-rich areas.
