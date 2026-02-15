# Persistent Clan Herding + Roaming Stability

## Summary
Replace fragile kin-only flocking with a persistent clan identity model plus arbitration-driven movement and herd incentives.
Goal: produce stable, visible roaming herds (not temporary local clusters), while preserving fear/predator dynamics and current performance constraints.

## Scope and Success Criteria

### Goal
Make herd behavior the dominant calm-state pattern:
1. Creatures form and maintain same-clan herds.
2. Herds migrate as coherent groups over long timescales.
3. Predators still trigger stampedes; fear still overrides herding.

### Success Criteria
1. After warm-up (2-3 simulated minutes), at least 40% of alive creatures have >= 4 same-clan neighbors in herd radius.
2. At least 2-4 roaming herd centroids show sustained displacement (not static clumps) over 60s windows.
3. Fear/stampede still works immediately on predator proximity.
4. No significant perf regression at `creatureCap=250`, `speed=10`.

## Important API / Data Structure Changes

### `src/simulation/world.ts`
Add persistent clan state:
- `creatureClanId: Int32Array` (default `-1`)
- `creatureClanBornTick: Int32Array` (for new-member bond grace)
- `nextClanId: number` (monotonic counter)

Add helpers:
- `allocClanId(): number`
- Ensure clan fields reset on `freeCreature`.

### `src/simulation/creature.ts`
Change spawn/reproduction interfaces:
- `spawnCreature(...)` signature becomes:
  - `spawnCreature(world, x, y, genome?, opts?: { clanId?: number; parentA?: number; parentB?: number })`

Clan assignment rules:
- Initial seed: each starter creature gets its own clan id.
- Asexual reproduction: child inherits parent clan.
- Sexual reproduction: child inherits clan of closer parent (distance to child spawn), tie -> parent A.
- No random new clan creation in normal reproduction.

## Behavioral Model

### 1. Movement Arbitration (keep single resolver)
Retain and complete one-pass arbitration pipeline:
1. `clearSteering`
2. `updateSensors` emit intents
3. `updateFlocking` emit intents
4. `applySteering`
5. `updateCreatureLocomotion`

No direct `world.creatureHeading[...] = ...` outside `applySteering`.

### 2. Clan-first flocking
In `updateFlocking`, primary neighborhood grouping key is `creatureClanId`, not genetic similarity.

For each creature:
- Query neighbors in flock radius.
- Compute:
  - `sameClanCount`
  - `sameClanCOM`
  - `sameClanAvgHeadingVector`

Herd mode enter/exit by clan quorum hysteresis:
- enter: `sameClanCount >= 5`
- exit: `sameClanCount <= 2` for lock expiry

### 3. Strong initial bond phase (newly grouped)
Keep transient bond window but tie it to clan-based herd entry:
- On herd-mode enter: set bond timer.
- During bond:
  - increase cohesion/alignment/leader weights
  - reduce food pull unless hungry
  - enable mild clan collision softening

### 4. Alignment term (new, required)
Add explicit velocity/heading alignment intent:
- Use neighbor heading vectors (or core displacement vectors from previous tick).
- Weight this term strongly in herd mode.
- This is the missing ingredient preventing “bump and disperse”.

### 5. Roaming driver
Leader-first in calm state:
- Clan leader chosen by score:
  - `localClanDensity + adhesionStrength + energyReserve`
- Leader target persistence increased for herd mode.
- Followers steer toward leader target + alignment + cohesion.

### 6. Hunger and fear priority
- Fear remains hard override.
- Hunger can override roaming:
  - below hunger threshold, food intent weight rises.
  - above threshold, roaming dominates.

## Collision Interaction

### `src/simulation/collision.ts`
Apply softening only for same-clan bonded pairs:
- Conditions:
  - same clan id
  - both in herd mode
  - bond timer active
  - neither in fear
- overlap correction *= soften factor (partial, never zero)

No softening for non-clan or non-bonded interactions.

## Constants to Add / Tune (`src/constants.ts`)

### Clan + herd
- `CLAN_HERD_RANGE`
- `CLAN_HERD_ENTER_QUORUM = 5`
- `CLAN_HERD_EXIT_QUORUM = 2`
- `CLAN_HERD_LOCK_TICKS`
- `CLAN_BOND_TICKS`
- `CLAN_COHESION_WEIGHT`
- `CLAN_ALIGNMENT_WEIGHT`
- `CLAN_LEADER_WEIGHT`
- `CLAN_FOOD_WEIGHT_CALM`
- `CLAN_FOOD_WEIGHT_HUNGRY`
- `CLAN_HUNGER_OVERRIDE_THRESHOLD`

### Collision
- `CLAN_BOND_COLLISION_SOFTEN`

### Leader persistence
- `CLAN_LEADER_REASSIGN_TICKS`
- `CLAN_LEADER_TARGET_REASSIGN_TICKS`

Keep GUI unchanged (no new Tweakpane bindings).

## Implementation Steps (ordered)
1. State foundations
- Add clan arrays/counter in `world.ts`.
- Wire reset/free logic.

2. Spawn/reproduction clan propagation
- Update `spawnCreature` and all callsites.
- Assign clan ids for seed, asexual, sexual paths.

3. Arbitration hardening
- Audit and remove remaining direct heading writes.
- Ensure resolver-only heading updates.

4. Clan flocking core
- Switch grouping metrics from kin similarity to clan id.
- Add quorum hysteresis and herd-mode timers.

5. Alignment intent
- Add alignment vector aggregation and weighting.
- Integrate into steering blend.

6. Leader selection (clan-scoped)
- Leader scoring and target persistence.
- Follower leader intent.

7. Bond phase + collision softening
- Add bond timer effects.
- Gate collision softening by bonded same-clan state.

8. Tuning pass
- Tune constants for visible herds and roaming.
- Keep fear override and performance.

9. AGENTS update
- Add note that flocking now uses persistent clan identity + arbitration pipeline.

## Test Cases and Scenarios

### Functional
1. Calm run
- Herds form from same-clan members and stay coherent.
2. Roaming
- Herd centroids move across map over time.
3. Predator event
- Immediate flee override; regroup afterward.
4. Food scarcity
- Herds still seek food when hungry.

### Regression
1. Performance
- Compare against current baseline at `speed=10`.
2. Collision artifacts
- No permanent overlapping mats.
3. Boundary behavior
- No new wall pinning.

### Programmatic checks (lightweight)
Add debug counters (internal log/HUD optional):
- `% creatures with sameClanCount >= 4`
- number of active herd clusters
- mean herd centroid displacement per minute

## Rollout / Commit Plan
1. `feat: 🧬 Add persistent clan identity to creatures`
2. `feat: 🧭 Switch flocking to clan-based arbitration with alignment`
3. `fix: 🤝 Stabilize herd formation with bond-phase collision softening`
4. `docs: 💡 Document clan-herding model and tuning notes`

## Assumptions and Defaults
1. Strong herding is desired over individual behavior.
2. Persistent social identity is acceptable even if it reduces pure genome-only grouping.
3. Fear override must remain absolute.
4. No UI dial additions.
