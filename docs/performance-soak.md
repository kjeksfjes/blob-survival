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
