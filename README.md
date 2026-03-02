# Blob Survival

A browser-based 2D soft-body evolution sandbox where creatures forage, hunt, flock, mutate, reproduce, and die under energy constraints.

## Try It

Live demo: [https://kjeksfjes.github.io/blob-survival/](https://kjeksfjes.github.io/blob-survival/)

## What Is Blob Survival?

Blob Survival is an artificial life simulation where behavior emerges from local rules and energy economics, not scripted goals.

Creatures are built from soft-body modules and can develop different survival strategies over time:
- Foraging and photosynthesis
- Predator/prey dynamics and carrion use
- Pack and clan social behavior
- Scout/leader roles and regrouping
- Mutation-driven diversity through reproduction

## Core Features

- Soft-body creatures (Verlet-based blob structures)
- Typed body modules (`Core`, `Mouth`, `Shield`, `Sensor`, `Weapon`, `Reproducer`, `Motor`, `Fat`, `Photo`, `Adhesion`)
- Dynamic ecology: plant food, meat, starvation, old age, predation
- Social systems: packs, leaders, scouts, regroup behavior
- Deep runtime tooling: inspector, leaderboard, debug controls
- Multiple visual styles:
  - Metaball (default)
  - Flat Mode (connected flat rendering)

## Quickstart

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Controls (Quick Reference)

- `Pause (Space)`
- `Pack (P)`
- `Clan (Shift+P)`
- `HUD Detail (H)`
- `Legend (L)`
- `Leaderboard (B)`
- `Zoom (Mouse Wheel)`
- `Pan (Drag)`

Most tuning is available in the in-app Controls panel.

## Inspection Tools

- Pause and hover a creature to inspect it quickly.
- Click a creature to lock inspection while you move around or resume the simulation.
- The inspector shows detailed per-creature runtime data, body composition, social/regroup context, and activity stats.
- Creatures expose dynamic thought text during inspection, and locked creatures preserve last words on death.
- The leaderboard can jump directly to live creatures or deceased records for fast comparison.

## Visual & Social Modes

- **Social Colors**:
  - `Normal (Part)` (module-based colors)
  - `Normal (Genome)` (unified genome color)
  - `Pack (P)` (pack coloring)
  - `Clan (Shift+P)` (lineage coloring)
- **Flat Mode**:
  - Toggle between default metaball look and flat connected-body rendering.

## Tech Stack

- TypeScript + Vite
- WebGPU + WGSL shaders
- CPU-side soft-body physics (Verlet + spatial hashing)
- Tweakpane debug UI

## More Documentation

- [WORLD_OVERVIEW.md](WORLD_OVERVIEW.md) — simulation model and ecosystem behavior
- [IDEAS.md](IDEAS.md) — feature ideas and experiments
- [AGENTS.md](AGENTS.md) — technical handoff notes
