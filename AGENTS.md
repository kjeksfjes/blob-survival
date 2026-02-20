# AGENTS.md

## Purpose
This file is the agent/handoff guide for the Evolution Simulator MVP.

## Project Summary
Browser-based 2D evolution simulator. Soft-body blob creatures eat, die, and reproduce with mutation in a petri-dish world. Natural selection should emerge from energy economics (no explicit fitness function).

## Stack
- TypeScript + Vite
- WebGPU rendering (WGSL shaders)
- CPU-side physics (Verlet + spatial hashing)
- Tweakpane for debug controls

## Run
- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`

## Simulation + Render Pipeline
Per frame:
1. `SimulationLoop.step()` on CPU
2. N substeps (`1x` to `50x` speed multiplier):
   - age/cull stale food
   - spawn food
   - sensors
   - locomotion
   - Verlet integration
   - spatial hash rebuild
   - constraints
   - collision resolution
   - boundary enforcement
   - eat food
   - weapons
   - metabolism
   - kill dead
   - reproduce
3. Pack SoA data into `Float32Array`s
4. `GpuBuffers.upload()` CPU -> GPU
5. `Renderer.render()` on GPU
   - Pass 1: blob quads + food dots to offscreen target (additive blend)
   - Pass 2: fullscreen metaball threshold + glow to canvas
6. `HUD.update()` in DOM

## Architecture Map
```
src/
  main.ts                      # Entry point, frame loop, camera controls, GPU packing
  constants.ts                 # Tunable simulation/render constants
  types.ts                     # BlobType enum, Genome interface, GPU data layouts
  simulation/
    world.ts                   # SoA world state + free-list allocators
    physics.ts                 # Verlet integration, constraints, boundaries
    spatial-hash.ts            # Broad-phase collision grid
    collision.ts               # Circle-circle narrow-phase
    creature.ts                # Spawn, sensors, locomotion, metabolism, weapons, reproduction
    genome.ts                  # Random genome + mutation
    food.ts                    # Food spawning and patch behavior
    simulation-loop.ts         # Step orchestration and SimParams
  rendering/
    renderer.ts                # WebGPU setup + render pass orchestration
    blob-pass.ts               # Instanced blob energy field pass
    metaball-pass.ts           # Threshold/glow post-process pass
    food-pass.ts               # Food rendering pass
    gpu-buffers.ts             # GPU buffer upload/management
    camera.ts                  # 2D orthographic camera
  shaders/
    blob.wgsl                  # Blob energy field shader
    metaball.wgsl              # Threshold + glow shader
    food.wgsl                  # Food shader
  ui/
    hud.ts                     # Overlay stats
    debug-panel.ts             # Tweakpane controls
```

## Core Design Constraints
1. Structure-of-Arrays across creature/blob/food state to avoid GC churn.
2. Preallocated buffers and free-list slot reuse.
3. Verlet integration (`pos`, `prevPos`; velocity is implicit).
4. Two-pass metaball rendering (additive field then threshold/glow).
5. Render radius and collision radius are intentionally scaled relative to physics radius.
6. Camera zoom math must include DPR (`clientWidth * dpr`).

## Current Model Notes
- 10 blob types: `CORE`, `MOUTH`, `SHIELD`, `SENSOR`, `WEAPON`, `REPRODUCER`, `MOTOR`, `FAT`, `PHOTOSYNTHESIZER`, `ADHESION`.
- Creature topology: star (all to core) + ring (adjacent links).
- Reproduction uses energy threshold + cooldown + mutation.
- Predation includes kin-protection via genome similarity.
- Predators can relax kin-protection only when very hungry (energy-based override).
- Predator-vs-predator attacks are now hard-gated: blocked by default, with emergency-only cannibalism at critical starvation when no non-predator prey target exists.
- Flocking is pack-first: pack-scoped leaders, relay, and merge/switch dynamics drive social motion; fear response overrides leader-follow during threat.
- Fear/stampede now comes from active predation windows (latched predators + recent-kill pulse), not passive nearby predators.
- Pack merges are intentionally small-pack cleanup only (absolute smaller-pack cap) to reduce long-run collapse into a single dominant pack.
- Food supports patch-based spawning plus staleness aging/despawn to prevent long-run saturation.
- Food has typed resources: `PLANT` (ambient spawned) and `MEAT` (corpse carrion).
- Food lifespan is randomized per pellet (`foodMaxAge`) around a baseline lifecycle.
- Food nutrition follows a growth->peak->stale curve (age-based energy multiplier).
- Meat nutrition uses a decay-only curve and rots faster than plant food.
- Creatures maintain per-individual food memory (reinforced by successful bites, decays over time, penalized on failed revisits) to reduce food-near starvation loops.
- Death converts creatures into meat mapped 1:1 to the dead blob layout/positions; render size is preserved.
- Predators get a meat-consumption efficiency bonus, while non-predators can still eat meat.
- Predators now have explicit ecological tradeoffs: reduced plant-eating efficiency and per-weapon upkeep, so weapon-heavy lineages must convert hunts/meat to stay competitive.
- Predator intent priority favors prey pursuit over forage unless critically starved and lacking prey targets.
- Latch kill progression is intentionally slow (low latch DPS), making latch/kill phases much longer and more visible.
- Food visuals mirror lifecycle: growth size ramp, late-life alpha fade before despawn.
- Creatures also die of old age (`CREATURE_MAX_AGE_TICKS`) in addition to zero-energy death.
- Genome viability guards require movement + reproduction and at least one energy source (`MOUTH` or `PHOTOSYNTHESIZER`), and enforce `WEAPON => MOUTH`.
- Rendering supports social debug view modes toggled by `V`: `Normal`, `Pack` (distinct per-pack colors), and `Clan` (single color per lineage/clan ID).
- Pack identity can branch at birth (low-probability offshoots) so clans can naturally contain multiple concurrent packs.
- Pack/Clan debug colors are deterministic from IDs (stable across frames, low collision risk), not random per draw.
- Scouting is role-based (not fallback-intent-based): packs maintain one persistent scout when possible (non-predator, non-leader, mouth-capable, not near old-age), and if that scout dies/invalidates a replacement is assigned.
- New scout assignments get immediate full-energy refill; active scouts keep a strong metabolism discount.
- Scouts are fearless: active scouts ignore predator threat sensing and pack alarm fear relays.
- Scouts have long-range food vision and plant-focused reporting: they detect food much farther away, report only meaningful `PLANT` clusters (not meat), and share hotspot centroids with their pack.
- Scout movement is methodical: early activation, deterministic sweep-lane patrol, and hotspot hold behavior so scouts stay near large plant finds instead of immediately drifting off.
- Scout markers are rendered as white ring overlays (render-only food-pass marker kind), independent of blob instance layout.
- HUD supports compact/verbose modes toggled by `H`; compact includes social summaries (clan/pack counts, pack-size stats, top lineages), verbose includes full diagnostics/aggregates and `Sim Step ms`.
- HUD compact view shows the active pack merge policy cap (`Merge Cap`) for run-to-run screenshot/log comparability.
- World state now maintains dense active-index lists for blobs/food (`activeBlobIds`, `activeFoodIds`) with swap-remove bookkeeping; hot loops should prefer these over full-capacity scans.
- Collision latch checks use an O(1) blob latch map (`blobWeaponLatchedTarget`) instead of scanning all latches per pair.
- Simulation exposes adaptive performance LOD controls in `SimParams`/debug panel (`perfLodEnabled`, tier override, neighbor budgets) to trade social fidelity for throughput at high population.
- HUD verbose mode includes stage-level perf telemetry (food/sensors/flocking/physics/collision/ecology/packing ms) and collision/query counters.

## Known Pitfalls
- WGSL `textureSample` must stay in uniform control flow.
- Camera zoom bugs happen if DPR is ignored.
- Visual radius and physics/collision radius mismatch can cause apparent overlap/tunneling.
- Reproduction cooldown should be randomized to avoid synchronization artifacts.
- `FOOD_MAX` controls spawn-time cap, but carrion can exceed it up to `MAX_FOOD`; stale-food culling is required for long-run balance/perf.
- Long-run perf is usually dominated by high `foodCount`, `blobCount`, and speed multiplier (`substeps`), not HUD aggregation logs.
- If a behavior loop regresses from active-list iteration back to `MAX_*` scanning, creature-cap throughput drops sharply.
- Food-cell overflow in spatial food queries can trigger expensive fallback scans; monitor `Food Overflow Fallbacks` in HUD when tuning food density.

## Agent Editing Guidelines
- Keep changes local and minimal; preserve performance characteristics.
- Prefer constants in `src/constants.ts` over hardcoded numbers.
- Preserve SoA layout unless a migration is explicitly requested.
- When changing behavior, verify both simulation impact and render consistency.
- For shader edits, validate pipeline assumptions in both WGSL and TS bind/group setup.
- UI shortcut labels must always include the shortcut in parentheses (for example: `Pause (Space)`, `Pack (P)`).

## Performance Guardrails
- Avoid `O(creatures^2)` and `O(creatures * food)` scans in per-substep hot paths.
- Prefer `SpatialHash` queries for nearby blob/food lookups over full-capacity loops.
- Prefer dense active-index iteration (`world.activeBlobIds`, `world.activeFoodIds`) for hot paths instead of scanning `MAX_BLOBS` / `MAX_FOOD`.
- Keep `geneticSimilarity` and other hot helpers allocation-free (no per-call typed array allocations).
- When adding behavior, check it under high speed multipliers (`10x+`) before considering it done.

## Commit Convention
- Format: `<type>: <emoji> <short imperative summary>`
- Common types in this repo: `feat`, `fix`, `docs`.
- Match existing style from repo history (example: `feat: 🧬 Add sexual reproduction with genome crossover`).

## Recommended Validation After Changes
- Run: `npm run build` (type-check + bundle sanity)
- Manual run: `npm run dev`
- Verify:
  - simulation remains stable at high speed multipliers
  - camera pan/zoom behaves correctly on DPR displays
  - metaball rendering still merges and thresholds correctly
  - no obvious population collapse/explosion regressions unless intended

## Backlog
See `IDEAS.md` for potential features and experiments.
