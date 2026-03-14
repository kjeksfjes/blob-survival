# Performance Budgets and Soak Checklist

This document defines the canonical performance gates and long-run soak recipe for the simulator.

## Performance budgets

`Sim Step ms` gate targets:

- `1x` speed budget: `8.0 ms`
- `10x` speed budget: `55.0 ms`
- Speeds between `1x` and `10x` interpolate linearly
- Speeds above `10x` scale linearly using the `10x` per-speed budget

Gate thresholds:

- `PASS`: actual/budget ratio `<= 1.00`
- `WARN`: actual/budget ratio `> 1.00` and `<= 1.30`
- `FAIL`: actual/budget ratio `> 1.30`

Food overflow fallback gate (`perfFoodOverflowFallbacks`, per substep):

- `PASS`: `<= 12`
- `WARN`: `> 12` and `<= 36`
- `FAIL`: `> 36`

These gates are surfaced in HUD telemetry (`Perf Gate`, `Soak Gate`, `Overflow Gate`).

## Canonical soak scenario

Use debug panel action: `Scenarios -> Apply Soak Scenario`

Scenario settings:

- Speed: `10x`
- Creature cap: `450`
- Food spawn rate: `6`
- Food dispersion: `0.22`
- Adaptive LOD: `enabled`
- Neighbor budget tier 1: `36`
- Neighbor budget tier 2: `16`
- Target soak duration: `216000` ticks (~60 min @ 60 UPS)

## Adaptive LOD defaults

Default adaptive LOD settings are tuned for earlier downshift at high population:

- Tier 1 creature threshold: `260` on / `220` off
- Tier 2 creature threshold: `420` on / `360` off
- Tier 1 neighbor-pressure threshold: `92` on / `72` off
- Tier 2 neighbor-pressure threshold: `148` on / `120` off
- Query range scale: tier 1 `0.74`, tier 2 `0.52`
- Neighbor budget default: tier 1 `40`, tier 2 `18`

## Soak checklist (pass/fail)

A soak run should be considered healthy when:

- No NaN/infinite perf metrics (`Soak Gate` keeps `Finite:Y`)
- Entity counters remain within hard bounds (`Soak Gate` keeps `Bounds:Y`)
- `Perf Gate` does not spend sustained time in `FAIL`
- `Overflow Gate` does not spend sustained time in `FAIL`
- No hard simulation stalls/freezes
- No unbounded growth in creatures/food/blobs beyond configured caps
- No catastrophic collapse unless expected for the test variant

## Snapshot logging

Use debug panel action: `Scenarios -> Log Soak Snapshot`

This emits a structured snapshot to the browser console under:

- `[SOAK SNAPSHOT]`

Use these snapshots at regular intervals (for example every 10k ticks) to compare runs.

## Baseline regression workflow

Goal: quickly answer "did this change regress perf?" using one baseline snapshot and one current snapshot.

### 1) Capture baseline snapshot

1. Start from the branch/commit you trust as baseline.
2. In debug panel: `Scenarios -> Apply Soak Scenario`.
3. Let it settle for a comparable window (for example around `tick 10k`).
4. In debug panel: `Scenarios -> Log Soak Snapshot`.
5. Save JSON from `[SOAK SNAPSHOT]` console log to a file, for example:
   - `docs/perf-baselines/soak-10x-baseline.json`

### 2) Capture current snapshot

1. Switch to your working branch.
2. Repeat the same scenario and capture process.
3. Save JSON to a second file, for example:
   - `docs/perf-baselines/soak-10x-current.json`

### 3) Compare snapshots

Run:

```bash
npm run perf:compare-soak -- --baseline docs/perf-baselines/soak-10x-baseline.json --current docs/perf-baselines/soak-10x-current.json
```

The comparator reports:

- `perfMs.*` deltas with thresholds:
  - `PASS`: < `+10%`
  - `WARN`: `+10%` to `< +20%`
  - `FAIL`: `>= +20%`
- `overflowFallbacksPerSubstep` delta:
  - `PASS`: `< +2`
  - `WARN`: `+2` to `< +5`
  - `FAIL`: `>= +5`
- Overall verdict (`PASS`/`WARN`/`FAIL`)

### 4) Development rhythm integration

For behavior/perf-affecting changes:

1. Take a pre-change snapshot (or reuse recent baseline for your machine).
2. Implement change.
3. Take post-change snapshot.
4. Run comparator.
5. Record verdict + key deltas in Beads issue notes before close.
