# Future Ideas

## Near-Term Priorities (Current Run)

### Food Competition Rebalance (Shared Feast Window)
Add a short-lived pack convergence behavior around dense plant discoveries:
- When a packmate/scout detects a strong plant hotspot, nearby packmates reduce dispersion
- For a short window, prioritize converging on the shared feast zone
- Then decay back to normal forage behavior

Goal: improve coordinated feeding without permanent over-clumping.

### Audio Pass 2 (Variant Set)
Keep current subtle audio style but reduce repetition:
- Add 2-3 low-variance presets for birth tick and death tone
- Randomly choose per event within constrained ranges

This preserves readability while lowering auditory fatigue over long runs.

### Simulation Presets
Add one-click parameter presets in Controls:
- `Baseline`
- `Tight Flocks`
- `Predator Heavy`
- `Sparse Food`

Useful for fast experiments, reproducible screenshots, and side-by-side behavior comparisons.

### Inspector "Creature Thoughts" Stream
Add a dynamic, personality-like thought line (or short rotating stack) to the creature inspector so behavior feels interpretable in plain language.

Examples:
- "I’m starving, but Creature 136 looks bitey."
- "Jackpot. I just found a buffet of plants."
- "Where is everyone? Regroup mode, immediately."
- "Yuck, hunger forced me to eat dead meat."

Core concept:
- Thoughts are generated from real runtime state (intent/fear/energy/pack/regroup/latch/food-signal), not random flavor text.
- Use priority tiers so the most important survival context is surfaced first (e.g., immediate danger > starvation > social regroup > exploration).
- Keep phrasing concise and varied with a small template pool per state to avoid repetitive spam.
- Brainstorm a large and creative template library that combines multiple signals at once (not just single-state lines), so thoughts can express conflict and tradeoffs.

Suggested v1 output:
- 1 primary thought (current highest-priority state)
- 1 secondary note (optional, if non-conflicting)
- Update cadence: every ~200-400 ms while inspected, with short hold to reduce flicker

Suggested v2 output (chat-like thought stream):
- Render thoughts as a lightweight rolling chat feed inside inspector.
- Mix "new thought" and "self-reply" style lines when state combinations shift (e.g., hunger + fear + regroup).
- Keep a short history window (e.g., last 6-12 thoughts) with soft decay/fade to avoid clutter.
- Preserve key terminal moments (e.g., pre-death or death-context thought) as pinned entries.

Signal ideas (state -> thought themes):
- Fear active + known attacker/threat: danger/avoidance thoughts
- Very low energy: urgent hunger thoughts
- Non-predator eating meat under hunger gate: reluctant carrion thoughts
- Active scout + plant cluster seen: discovery/report thoughts
- Regroup source = anchor/leader/rejoin + isolated/urgent: social cohesion thoughts
- Predator with hunt target or active latch: chase/commit thoughts
- Satiated/full timers: "not hungry" / "digesting" thoughts
- Combination examples:
  - Hunger + threat + known attacker: "I'm hungry, but Creature 149 is in my way."
  - Scout + hotspot + far from pack: "Huge plant jackpot here. Ping sent. I’m camping this spot."
  - Non-predator + carrion + critical hunger: "Yuck, hunger forced me to eat dead meat."
  - Isolated + urgent regroup + low energy: "Need pack now. Can't drift alone much longer."
  - Predator latch + low stamina: "Latch confirmed. Energy low. Must finish quickly."
  - Prey being latched: ["Ow! It hurts!", "Help! I'm being attacked!", "Someone save me!", ...]
  - Low health: "I don't feel so well."
  - Critical health: "This might be it..."
  - Low energy: "I'm hungry!"
  - Very low energy: "So... hungry!"

Implementation notes:
- Add an inspector-local thought synthesizer (UI-side) that consumes `CreatureRuntimeDebugSnapshot` + world fields already exposed.
- Optionally expose a few extra debug flags if needed (e.g., "ate meat this tick", "just reported hotspot", "has hunt target").
- Persist the final thought in deceased view as explicit "Last Words" (death inspector), for storytelling/debug value.

Why this helps:
- Makes complex multi-system behavior legible without reading many raw counters.
- Speeds tuning by translating low-level state into human-readable intent/conflict.

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
