# Evolution World Overview

This document summarizes how the simulation world works today, for humans reading the project.

## 1) Creature Traits

Each creature has a genome and a soft-body made of blobs. Blob types define capabilities:

- `CORE`: central body
- `MOUTH`: eats food
- `SHIELD`: reduces incoming damage
- `SENSOR`: helps detection/orientation
- `WEAPON`: enables predation
- `REPRODUCER`: enables reproduction
- `MOTOR`: movement force
- `FAT`: increases max energy storage
- `PHOTOSYNTHESIZER`: passive energy gain from light
- `ADHESION`: sticky/social contact behavior

Main inherited scalar traits include:

- `baseHue`
- `turnRate`
- `maxEnergy`
- `photoEfficiency`
- `adhesionStrength`

Per-blob size/offset are also inherited and mutated.

## 2) What Defines a Predator

A creature is treated as a predator if it has at least one `WEAPON` blob.

- Predator status is derived from body composition each step (not a separate permanent flag).
- In practice it is stable for an individual lifetime, because blob composition does not change after birth.

Predators get different ecology tradeoffs (hunt behavior, carrion handling, plant-eating penalties, weapon upkeep, etc.).

Predator-vs-predator behavior is now strongly gated:

- Default: predators do not attack other predators.
- Emergency exception: only at critical starvation and only when no non-predator prey target is available.

## 3) Genes and Mutations

### Spawn and inheritance

- Random genomes start with 3-6 blobs.
- Viability guards enforce movement + reproduction + at least one energy source (`MOUTH` or `PHOTOSYNTHESIZER`).
- Offspring are produced by sexual crossover when mates are available, otherwise asexual fallback occurs.

### Mutation model

Two mutation channels are used:

- Parametric mutation: scalar traits, blob sizes, blob angles
- Structural mutation: add/remove/change non-core blob types

There is also a rare heavier-mutation burst event on top of normal mutation.

Additional viability guard:

- `WEAPON` implies `MOUTH` (predator lineages are forced to have an oral intake path).

## 4) Reproduction (How It Actually Works)

Reproduction is energy-gated and cooldown-gated.

Basic flow each tick:

1. Creature must be alive and off cooldown.
2. Creature must have enough energy fraction to qualify for reproduction.
3. Engine tries to find a nearby compatible mate.
4. If mate is found: sexual reproduction.
5. If not found for long enough: asexual fallback.

### Sexual reproduction

- Candidate mates are filtered by:
  - distance between reproducer blobs
  - minimum genome similarity
  - mate also being energy-ready and off cooldown
- Child genome is:
  - crossover of both parents
  - followed by mutation
- Parent energy contribution:
  - each parent gives a fraction of its current energy to reproduction
- Child spawn:
  - appears between the two reproducer blobs
  - starts at full child max energy (current behavior)

### Asexual fallback

- If no mate is found after a fallback timer:
  - parent creates mutated clone child
  - parent pays energy split cost
  - child starts at full child max energy

### Predator-specific repro constraints

- Predator lineages (has `WEAPON`) use stricter reproduction economics:
  - higher effective energy threshold
  - longer cooldown multipliers
  - delayed asexual fallback

## 5) Energy, Fullness, and Death

- Creatures now spawn at their own `maxEnergy` (full at birth).

Energy is the central currency. Almost all behavior eventually flows through it.

### Energy inflows

- Eating plant food (`MOUTH`)
- Eating meat/carrion (`MOUTH`, predator has meat bonus)
- Photosynthesis (`PHOTOSYNTHESIZER`, scaled by `photoEfficiency`)
- Predation exchange (damage steal fraction while attacking)
- Kill bounty and carried-carcass consumption paths

### Energy outflows

- Baseline metabolism (blob-count/scaling based)
- Movement-related upkeep
- Weapon upkeep and weapon use costs
- Photosynth blob maintenance taxes

### Predator metabolism and economics (important)

Predators do not just "hunt more"; they run a separate energy economy:

- Baseline predator metabolism multiplier:
  - lower than non-predators (predator-specific multiplier on baseline metabolism)
- While latched to prey:
  - metabolism is reduced further
- While carrying/consuming carcass:
  - metabolism is reduced even further
- Weapon tax:
  - each weapon blob has passive upkeep cost
  - active weapon contact/hits also cost energy
- Plant penalty:
  - predators have reduced plant-food eating efficiency
- Meat advantage:
  - predators digest meat/carrion more efficiently than non-predators

Net effect:

- Predator lineages are tuned to convert hunts into energy and cannot reliably dominate on plant food alone.
- If hunt conversion fails, weapon-heavy bodies become expensive and collapse.
- If hunt conversion is too easy, predator share can rise quickly; this is one of the main balancing axes.

### Satiety/fullness behavior

- Creatures use satiety thresholds to stop/resume eating.
- Non-predators stop eating sooner and resume lower.
- Predators have higher full/resume thresholds and extra digest/full timers after successful feeding.

### Death conditions

- Starvation: `energy <= 0`
- Old age: age cap reached (`creatureMaxAge`, randomized around global max)

When a creature dies, it is removed and converted to carrion (static meat or carried carcass path).

Starvation diagnostics also track subset causes:

- starvation while having no mouth
- starvation while food was nearby

## 6) Food Model and Distribution

Food exists as two kinds:

- `PLANT`: ambient spawned food
- `MEAT`: carrion from dead creatures

### Distribution

- Plant food uses patch-based spawning with dispersion control.
- Total spawned plant food is capped (`FOOD_MAX`), while carrion is managed through aging/rot.

### Lifecycle and nutrition

- Plant food follows growth -> peak -> stale nutrition multipliers.
- Meat follows a decay curve and rots faster than plant food.
- Food lifespan is randomized per pellet around baseline lifespan.
- Visuals mirror lifecycle (growth size ramp and late fade).
- Creatures also keep per-individual food memory:
  - reinforced when bites succeed,
  - decays over time,
  - degraded quickly when revisiting remembered spots that no longer contain food.

## 7) Predation and Carrion

- Weapon contact can latch and deal sustained damage.
- Latch kill progression is intentionally much slower now (lower latch DPS), so latching/kill phases last longer and are more visible.
- On kill, a victim can become carried carcass meat if conditions match (latched predator flow), otherwise static meat is spawned.
- Carried carcasses are consumed over time and can drop to static meat on unlatch/death.
- Predators have digest/fullness control timers that reduce immediate rehunting after successful feeding.
- Fear/stampede is tied to active predation windows:
  - passive nearby predators do not trigger fear,
  - latching/carcass-consuming predators do,
  - and kills emit a temporary stronger fear pulse.

## 8) Packs, Clans, and Flocking

Social motion is pack-first:

- Creatures have pack/clan identity.
- Leader/relay/merge/switch logic drives collective movement.
- Threat/fear logic can override normal following behavior.
- Pack-merge policy is intentionally conservative to avoid long-run collapse into one mega-pack.
- Hungry packs can enter rally mode: when pack-level hunger is high and a strong scout signal exists, pack members bias movement toward that reported hotspot.
- Scouts are role-based (not merely fallback intent):
  - only non-predators can be scouts,
  - only a small quota per pack is active,
  - assignment rotates slowly with minimum tenure,
  - high-energy scouts roam away from the pack and patrol deterministic world waypoints.

## 9) Useful Mental Model

A simple way to think about the world:

- Morphology (blob composition) defines available behaviors.
- Energy economics decides survival/reproduction.
- Mutation reshapes morphology and tuning over generations.
- Food topology and social dynamics decide who discovers and controls resources.

## 10) Practical Tuning Levers

If behavior drifts in an unwanted direction, the biggest levers are usually:

- Food abundance/distribution/lifetime (`FOOD_MAX`, dispersion, stale timings)
- Predator economics (weapon upkeep, plant efficiency, carrion conversion)
- Reproduction thresholds/cooldowns
- Pack merge constraints and flocking weights

## 11) Suggested Read Order in Code

If you want to map this doc to implementation quickly:

- `src/simulation/genome.ts`: random genomes, mutation, crossover
- `src/simulation/creature.ts`: spawn, sensing, locomotion, eat, weapons, metabolism, death, reproduce
- `src/simulation/food.ts`: food spawning and patch behavior
- `src/simulation/simulation-loop.ts`: per-substep orchestration
- `src/constants.ts`: major tuning knobs
