# Evolution Simulator MVP

## What This Is
Browser-based 2D evolution simulator. Soft-body blob-creatures eat, die, and reproduce with mutations in a petri-dish world. Natural selection emerges from energy economics -- no explicit fitness function.

## Tech Stack
- **TypeScript + Vite** (dev server: `npm run dev`)
- **WebGPU** for rendering (Metal path on M1 Mac)
- **WGSL** hand-written shaders
- **CPU-side physics**: Verlet integration, spatial hashing
- **Tweakpane** for debug controls

## Architecture

```
Each frame:
  SimulationLoop.step()         [CPU]
    N sub-steps (speed multiplier 1x-50x):
      spawn food -> sensors -> locomotion -> Verlet integrate ->
      spatial hash rebuild -> solve constraints -> resolve collisions ->
      enforce boundaries -> eat food -> weapons -> metabolism ->
      kill dead -> reproduce

  Pack SoA data into Float32Arrays  [CPU]
  GpuBuffers.upload()               [CPU -> GPU]

  Renderer.render()                 [GPU]
    Pass 1: Instanced blob quads + food dots -> offscreen texture (additive blend)
    Pass 2: Full-screen metaball threshold + glow -> canvas

  HUD.update()                      [DOM]
```

## Key Design Decisions

1. **Structure of Arrays (SoA)**: All blob/creature/food data in parallel typed arrays. Zero GC pressure.
2. **Free-list allocation**: Pre-allocated buffers to max capacity. Stack-based free list for slot reuse.
3. **Verlet integration**: Stores `pos` and `prevPos` (no velocity). Constraint solving just moves positions.
4. **2-pass metaball rendering**: Pass 1 additively blends energy fields to offscreen texture. Pass 2 thresholds + glows.
5. **Render radius = 3x physics radius** (`RENDER_RADIUS_MULT`): So energy fields overlap for metaball merging. Collision detection uses `COLLISION_RADIUS_MULT = 2.5` to match the visual body size.
6. **Camera uses physical pixels internally**: Zoom must be calculated with DPR: `(clientWidth * dpr) / WORLD_SIZE`.

## File Structure
```
src/
  main.ts                      # Entry: init, rAF loop, GPU packing, camera controls
  constants.ts                 # All tunable parameters
  types.ts                     # BlobType enum, Genome interface, GPU data layouts
  simulation/
    world.ts                   # SoA state container + free-list allocators
    physics.ts                 # Verlet integration, constraint solver, boundaries
    spatial-hash.ts            # Grid-based spatial hash for collision broad-phase
    collision.ts               # Circle-circle narrow-phase (inter-creature)
    creature.ts                # Spawn, locomotion, sensors (food + threat), metabolism, death, weapons, reproduce
    genome.ts                  # Random genome generation + mutation
    food.ts                    # Food spawning, multi-lobe patches, dispersion control
    simulation-loop.ts         # Step orchestration, speed control, SimParams
  rendering/
    renderer.ts                # WebGPU init, 2-pass render orchestration
    blob-pass.ts               # Instanced blob rendering (additive blend)
    metaball-pass.ts           # Full-screen threshold + glow post-process
    food-pass.ts               # Food particle rendering
    gpu-buffers.ts             # Buffer management, CPU->GPU upload
    camera.ts                  # 2D orthographic camera (pan, zoom)
  shaders/
    blob.wgsl                  # Instanced quad + Gaussian energy falloff
    metaball.wgsl              # Threshold + glow (all textureSample BEFORE branches!)
    food.wgsl                  # Food dot shader
  ui/
    hud.ts                     # HTML overlay: FPS, tick, population, births/deaths
    debug-panel.ts             # Tweakpane: speed, food rate, food dispersion, metabolism, mutation, predation, carrion
```

## Creature Design
10 blob types: CORE (required), MOUTH, SHIELD, SENSOR, WEAPON, REPRODUCER, MOTOR, FAT, PHOTOSYNTHESIZER, ADHESION. Topology: star (all to core) + ring (adjacent).

## Current Energy Balance (constants.ts)
- Metabolism: 0.08/blob/tick. A 4-blob creature costs 0.32/tick.
- Food: 40 energy, 10 spawned/tick. ~400 energy/tick entering world.
- Photo: 0.5 * genome.photoEfficiency (0.2-0.5) = 0.1-0.25/tick/blob. Barely covers 1 blob cost.
- Predation: attackers steal 50% of damage dealt. Net +0.5 vs unshielded, net -0.2 vs shielded. Kin (similarity >= 0.5) are spared.
- Carrion: dead creatures drop floor(blobCount / 2) food items at death site. A 6-blob creature returns 120 energy to the world.
- Speed-size tradeoff: motor force divided by sqrt(totalBlobCount). Small creatures are fast, large ones are slow.
- Reproduction: requires 60% max energy, splits 50/50 with child, cooldown ~200 ticks (randomized).
- Population cap: 250 creatures.

## Known Pitfalls (bugs we already hit and fixed)
- **WGSL textureSample must be in uniform control flow**: No textureSample after early returns or non-uniform branches. All sampling happens at top of metaball fragment shader.
- **Camera DPR mismatch**: Camera internally uses physical pixels. Zoom must be set with `clientWidth * dpr`, not just `clientWidth`.
- **Render vs physics radius**: Render radius is 3x physics for metaball merging. Collision must use scaled radius too or creatures appear to pass through each other.
- **Reproduction synchronization**: Initial cooldowns must be randomized, not all set to the same value.

## What's Working
- WebGPU rendering with metaball post-processing
- Soft-body creatures with Verlet physics
- Food spawning in multi-lobe patches (2-3 orbiting sub-hotspots per patch, dispersion slider 0→1), eating, photosynthesis
- Predation: weapons steal energy, kin protection via genetic similarity
- Threat detection: creatures flee from weapon-bearing non-kin (sensors extend detection range)
- Carrion: dead creatures drop food clusters
- Speed-size tradeoff: small creatures faster, large ones slower
- Kin-based flocking with shared food sensing and metabolism discount
- Reproduction with mutation (parametric + structural)
- Collision detection between creatures
- Camera pan/zoom, HUD, Tweakpane controls (including predation/carrion knobs)

## Potential Next Steps
- Better visual differentiation per blob type
- Creature selection / inspection UI
- Population graphs over time
- Compute shader migration for physics
- Performance optimization (iterate only alive entities, not MAX_BLOBS)
- See IDEAS.md for feature backlog (venom, seasonal variation, etc.)
