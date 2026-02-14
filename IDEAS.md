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

## Species & Individual Chronicle ("Creaturepedia")
A living log that tracks notable species (lineages) and individual creatures. Species get auto-detected by clustering genomes over time — when a lineage persists for N generations, it earns a named entry with stats: population peak, territory, dominant strategy (grazer/predator/photosynthesizer), average lifespan, blob composition. Individual creatures that hit milestones (longest-lived, most offspring, most kills, first to reach a new region, last survivor of a lineage) get their own entries with a timeline of key events. Could render as a scrollable sidebar or overlay panel — a "Wikipedia" of the simulation's history. Data collection would run on the CPU alongside the sim, tracking lineage IDs (parent chain), per-creature kill/birth/energy counters, and species clustering via genetic similarity. Expensive part is the UI and history storage, not the tracking itself.

## Save & Load Worlds
Serialize the entire world state (SoA arrays, genomes, spatial hash, tick counter) plus the Creaturepedia history to a single file (JSON or binary blob). Allow saving to localStorage or downloading as a file, and loading it back to resume a simulation exactly where it left off. Enables sharing interesting worlds, comparing runs, and preserving long-running ecosystems. Binary format (e.g. a zip of typed array buffers + JSON metadata) would keep file sizes manageable for worlds with thousands of ticks of history.

## Divided World — Chambers & Bottlenecks
Split the world into 2-4 chambers connected by narrow passages (1-2 creature widths). Geographic isolation drives speciation: populations in separate chambers evolve independently under local selection pressure, then occasionally meet at chokepoints — leading to competition, hybridization, or coexistence.

**Implementation:** Define chamber boundaries as axis-aligned walls in `physics.ts` boundary enforcement. Each wall is a line segment with a gap (the passage). Creatures colliding with a wall get pushed back, same as the world border. Walls would need to be added to the spatial hash or checked separately during boundary enforcement. Rendering: draw walls as dim lines in a new render pass, or bake them into the metaball background.

**Gameplay possibilities:**
- Chambers could have different environmental conditions (food density, light level) — creating distinct biomes. A food-rich chamber breeds grazers, a barren one breeds predators, and the passages become contested borders.
- Passages act as natural chokepoints: weapon-heavy species could "guard" a passage, or fast motor-heavy species could raid neighboring chambers.
- Combine with Seasonal Variation: periodically widen/narrow passages (tides, earthquakes) to alternate between isolation and mixing phases.
- Combine with Environmental Gradient: each chamber gets a different food/light profile, so the optimal genome differs per chamber.
- Start with fully closed walls, then open passages after N ticks — lets populations diverge before first contact. The moment passages open could produce dramatic invasions.

**Considerations:** Passage width is critical — too wide and there's no real isolation, too narrow and creatures get stuck in traffic jams. Might need pathfinding or at least a bias toward passage openings when creatures hit walls. Wall collision is cheap (line segment tests), but rendering them nicely alongside the metaball aesthetic needs thought.

## Pre-Seeded World Scenarios
Option to start a new world with established flocks and predators instead of random creatures. Spawn clusters of genetically similar creatures (same base genome with light mutation) in separate regions, with some lineages tuned for grazing (photo/mouth/fat) and others for predation (weapon/motor/sensor). Skips the slow bootstrap phase where everything looks the same and jumps straight into visible inter-species dynamics — stampedes, territorial standoffs, predator-prey chases. Could offer a few presets ("Peaceful Grazers", "Arms Race", "Mixed Ecosystem") or a single "Mature World" seed.
