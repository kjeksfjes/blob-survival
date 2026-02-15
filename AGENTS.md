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

## Known Pitfalls
- WGSL `textureSample` must stay in uniform control flow.
- Camera zoom bugs happen if DPR is ignored.
- Visual radius and physics/collision radius mismatch can cause apparent overlap/tunneling.
- Reproduction cooldown should be randomized to avoid synchronization artifacts.

## Agent Editing Guidelines
- Keep changes local and minimal; preserve performance characteristics.
- Prefer constants in `src/constants.ts` over hardcoded numbers.
- Preserve SoA layout unless a migration is explicitly requested.
- When changing behavior, verify both simulation impact and render consistency.
- For shader edits, validate pipeline assumptions in both WGSL and TS bind/group setup.

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
