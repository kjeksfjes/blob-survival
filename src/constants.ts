// World
export const WORLD_SIZE = 4000;

// Capacities (pre-allocated)
export const MAX_BLOBS = 20_000;
export const MAX_CREATURES = 2000;
export const MAX_FOOD = 5000;
export const CREATURE_CAP = 250; // soft cap: no reproduction above this

// Physics
export const PHYSICS_DT = 1 / 60;
export const VERLET_DAMPING = 0.98;
export const CONSTRAINT_ITERATIONS = 4;
export const BOUNDARY_PADDING = 20;
export const COLLISION_RADIUS_MULT = 1.3; // collide at this multiple of physics radius
export const WALL_BOUNCE_DAMPING = 0.25; // reflected velocity factor when blobs hit world bounds

// Blobs
export const BASE_BLOB_RADIUS = 9;
export const CORE_RADIUS_MULT = 1.2;
export const BLOB_MASS_BASE = 1.0;
export const SHIELD_MASS_MULT = 1.5;
export const FAT_MASS_MULT = 2.0;

// Soft-body constraints
export const CONSTRAINT_STIFFNESS = 0.4;
export const STAR_REST_DISTANCE = 22;
export const RING_REST_DISTANCE = 18;

// Spatial hash
export const SPATIAL_CELL_SIZE = 80;

// Food
export const FOOD_RADIUS = 4;
export const FOOD_ENERGY = 32;
export const FOOD_SPAWN_RATE = 5; // per tick
export const FOOD_MAX = 1500;
export const FOOD_STALE_TICKS = 6000; // baseline food lifecycle (~100s at 60 UPS)
export const FOOD_STALE_DESPAWN_CHANCE = 0.06; // per-tick despawn chance once stale
export const FOOD_STALE_LIFESPAN_JITTER_FRAC = 0.35; // +/- lifespan randomization per food item
export const MEAT_STALE_TICKS = Math.max(120, Math.floor(FOOD_STALE_TICKS / 7.2)); // ~25% of previous meat lifespan; rots much faster
export const FOOD_GROWTH_MIN_MULT = 0.6; // newborn food yield multiplier
export const FOOD_GROWTH_PEAK_MULT = 1.2; // peak growth yield multiplier
export const FOOD_GROWTH_STALE_MULT = 0.4; // near-despawn stale yield multiplier
export const FOOD_GROWTH_PEAK_AGE_FRAC = 0.55; // normalized age where food yield peaks
export const FOOD_VISUAL_FADE_START_FRAC = 0.85; // portion of lifespan before visual rot/fade begins
export const MEAT_DECAY_MIN_MULT = 0.25; // decay-only curve floor for carrion energy
export const MEAT_PREDATOR_EAT_EFFICIENCY_MULT = 1.35; // predators digest carrion better
export const CARRIED_MEAT_CONSUME_PER_TICK_BASE = 0.35; // slow drain so carcass remains visible while still feeding predators over time
export const CARRIED_MEAT_MAX_TICKS = 1800; // attached carcass lifetime (~30s @ 60 UPS)
export const CARRIED_MEAT_STALE_ENERGY_FLOOR_MULT = 0.25; // minimum carried-carcass drain multiplier near rot end
export const CARRIED_MEAT_CONSUME_START_DELAY_TICKS = 1; // delay first drain tick so death->carcass transition is visually readable
export const CARRIED_MEAT_ATTACH_BITE_ENERGY = 60; // strong immediate recovery on latched kill conversion
export const CARRIED_MEAT_ENERGY_MULT = 6.0; // attached carcass yields substantially more total energy than dropped carrion
export const PREDATOR_DIGEST_HUNT_SUPPRESS_TICKS = 220; // while digesting carcass, predators should avoid immediate re-hunt
export const PREDATOR_DIGEST_HUNT_RESUME_ENERGY_FRAC = 0.70; // predators stay in digest state until their energy has dropped significantly
export const PREDATOR_FULL_AFTER_FEED_TICKS = 36000; // predators remain full for extremely long after feeding (~600s @60 UPS)
export const PREDATOR_FULL_RELEASE_ENERGY_FRAC = 0.28; // full lock only lifts once predator energy is genuinely low again
export const PREDATOR_FULL_DORMANT_MOTOR_MULT = 0.02; // near-still movement while predator is in full lock
export const PREDATOR_FULL_DORMANT_STEER_MULT = 0.04; // very strong steering damping while predator is in full lock
export const PREDATOR_FULL_PREY_AVOID_WEIGHT = 1.35; // actively avoid nearby prey while full
export const PREDATOR_FULL_EDGE_SEEK_WEIGHT = 0.85; // when full, bias movement toward world edges to idle away from prey zones
export const PREDATOR_REPRO_ENERGY_THRESHOLD_ADD = 0.18; // predators need higher energy fraction before reproducing
export const PREDATOR_REPRO_COOLDOWN_MULT = 2.2; // predator reproduction cooldown multiplier
export const PREDATOR_REPRO_FALLBACK_MULT = 1.8; // predator asexual fallback delay multiplier
export const CARRIED_MEAT_DROP_ON_UNLATCH = 1; // drop remaining carried carcass as static meat when anchor is lost
export const CARRIED_MEAT_RENDER_SCALE_MULT = 1.25; // visual scale multiplier for attached carcass blobs
export const CARRIED_MEAT_RENDER_BLOB_CAP = 1200; // safety cap for extra per-frame carried-meat blobs
export const CARRION_CHUNK_MIN = 2;
export const CARRION_CHUNK_MAX = 10;

// Food patches
export const FOOD_PATCH_COUNT = 5;
export const FOOD_PATCH_DRIFT_SPEED = 0.3;  // px/tick patch center drift
export const FOOD_PATCH_ROTATE_INTERVAL = 2000; // ticks between new drift direction

// Sub-hotspots per patch (multi-lobe shapes)
export const FOOD_PATCH_SUB_COUNT_MIN = 2;
export const FOOD_PATCH_SUB_COUNT_MAX = 3;
export const FOOD_PATCH_SUB_OFFSET = 120;       // base distance from patch center
export const FOOD_PATCH_SUB_ORBIT_SPEED = 0.002; // radians/tick

// Dispersion slider range (0 = tight clusters, 1 = uniform)
export const FOOD_DISPERSION_DEFAULT = 0.18;
export const FOOD_SIGMA_MIN = 40;              // sigma at dispersion=0
export const FOOD_SIGMA_MAX = 500;             // sigma at dispersion=1
export const FOOD_PATCH_FRACTION_MIN = 0.95;   // patch % at dispersion=0
export const FOOD_PATCH_FRACTION_MAX = 0.15;   // patch % at dispersion=1
export const FOOD_SUB_OFFSET_SCALE_MIN = 0.6;  // sub-offset scale at dispersion=0
export const FOOD_SUB_OFFSET_SCALE_MAX = 1.8;  // sub-offset scale at dispersion=1
export const FOOD_TARGET_LOCK_TICKS = 36; // keep pursuing last chosen food target for this many ticks
export const FOOD_TARGET_DEADBAND = 16; // if already this close to food target, avoid constant steering corrections
export const FOOD_TARGET_NEAREST_SWITCH_DISTANCE = 120; // when within this distance of food, target nearest pellet over patch centroid
export const FOOD_MEMORY_MAX_AGE_TICKS = 3600; // per-creature remembered hotspot lifetime
export const FOOD_MEMORY_MIN_STRENGTH = 0.08; // minimum memory confidence to be used
export const FOOD_MEMORY_DECAY_PER_TICK = 0.9994; // slow confidence decay
export const FOOD_MEMORY_EAT_REINFORCE = 0.55; // confidence boost on successful bite
export const FOOD_MEMORY_FAIL_DECAY_MULT = 0.5; // confidence multiplier after failed revisit

// Creature
export const INITIAL_CREATURE_COUNT = 30;
export const CREATURE_BASE_ENERGY = 150;
export const CREATURE_MAX_ENERGY_BASE = 250;
export const METABOLISM_COST_PER_BLOB = 0.10; // energy/tick/blob
export const METABOLISM_SCALING_EXPONENT = 0.75; // sub-linear: count^exp * cost (1.0 = linear)
export const MOTOR_FORCE = 1.2;
export const SENSOR_RANGE = 350;
export const BASIC_FOOD_SENSE_RANGE = 180; // all creatures sense food this close
export const HUNGRY_FOOD_SENSE_MIN_RANGE = 360; // hungry creatures always sense at least this far
export const WEAPON_DAMAGE = 2.0;
export const WEAPON_ENERGY_COST = 0.1;
export const WEAPON_UPKEEP_PER_BLOB = 0.045; // passive upkeep per weapon blob per tick
export const MOUTH_EFFICIENCY = 1.0;
export const EAT_FULL_STOP_FRACTION = 0.80; // stop eating at this energy fraction (satiety enter)
export const EAT_RESUME_FRACTION = 0.48; // resume eating at this energy fraction (satiety exit)
export const PREDATOR_EAT_FULL_STOP_FRACTION = 0.92; // predators should keep eating longer to recover from hunt costs
export const PREDATOR_EAT_RESUME_FRACTION = 0.62; // predators resume eating at a higher fraction than non-predators
export const EAT_COOLDOWN_TICKS = 2; // ticks after a bite before next bite
export const EAT_MAX_ITEMS_PER_SUBSTEP = 3; // hard cap on food pellets eaten per substep
export const FOOD_INTERACTION_RADIUS_MAX_SCALE = 6.0; // max radius scale assumed for food interaction query
export const FOOD_EAT_CONTACT_MULT = 1.8; // mouth-food contact leniency multiplier
export const FOOD_EAT_CONTACT_HUNGRY_MULT = 1.15; // widen bite window while hungry
export const FOOD_EAT_CONTACT_CRITICAL_MULT = 1.30; // widen bite window further while critically hungry
export const NON_PREDATOR_EAT_EFFICIENCY = 1.0;
export const PREDATOR_PLANT_EAT_EFFICIENCY = 0.58; // predators digest plant food less efficiently, limiting predator-only dominance
export const PHOTO_ENERGY_PER_TICK = 0.46; // multiplied by genome.photoEfficiency (0.2-0.5)
export const PHOTO_CROWD_PENALTY_NEIGHBORS_FULL = 14; // local crowd count where crowding penalty reaches max
export const PHOTO_CROWD_PENALTY_MAX = 0.60; // maximum photosynthesis reduction from crowding
export const PHOTO_IDLE_SPEED_SOFT_START = 0.08; // start reducing photo gain below this core speed
export const PHOTO_IDLE_SPEED_SOFT_FULL = 0.28; // full photo gain above this core speed
export const PHOTO_IDLE_PENALTY_MIN_MULT = 0.35; // minimum movement multiplier at near-zero speed
export const PHOTO_MAINTENANCE_COST_PER_BLOB = 0.08; // flat per-photo-blob maintenance tax
export const PHOTO_MAINTENANCE_SIZE_MULT = 0.04; // additional per-size photo-blob maintenance tax
export const CREATURE_MAX_AGE_TICKS = 18000; // hard lifespan cap (~5 minutes at 60 UPS)
export const FAT_ENERGY_BONUS = 80; // extra max energy per FAT blob
export const ADHESION_FORCE = 0.3;
export const ADHESION_RANGE = 40;
export const PREDATION_STEAL_FRACTION = 0.62;
export const PREDATION_KIN_THRESHOLD = 0.5;
export const PREDATION_VERY_HUNGRY_FRACTION = 0.2; // predator can relax kin avoidance below this energy fraction
export const PREDATION_HUNGRY_KIN_THRESHOLD_MULT = 0.35; // effective kin threshold multiplier when very hungry
export const PREDATOR_URGENT_FORAGE_FRACTION = 0.30; // predators fallback to food earlier when hunts are not converting
export const PREDATOR_METABOLISM_MULT = 0.90; // weapon-bearers burn somewhat less baseline metabolism
export const PREDATOR_LATCH_METABOLISM_MULT = 0.55; // strong metabolism reduction while actively latched to prey
export const PREDATOR_CARRION_METABOLISM_MULT = 0.45; // strong metabolism reduction while carrying/consuming carcass
export const CARRION_DROP_DIVISOR = 2;
export const CARRION_SCATTER_RADIUS = 30;
export const FEAR_DURATION = 75; // ticks to keep fleeing after threat disappears (~1.25s)
export const FEAR_SPEED_MULT = 1.35; // movement multiplier while fleeing
export const PREDATOR_FEAR_ACTIVE_HOLD_TICKS = 45; // while latched/carcass-eating, predator remains a fear source
export const PREDATOR_FEAR_KILL_PULSE_TICKS = 220; // kill event broadcasts fear for longer to trigger stampede

// Predator mechanics
export const LUNGE_SPEED_MULT = 1.5;       // speed boost when chasing prey
export const LUNGE_RANGE = 200;             // distance to trigger lunge
export const STEALTH_DETECTION_MULT = 0.8;  // predators detected at 80% normal range
export const KILL_BOUNTY_FRACTION = 0.18;   // killer gets a smaller bonus to avoid predator snowballing
export const LATCH_DURATION = 95;           // ticks weapon stays attached after contact
export const LATCH_DAMAGE_MULT = 0.07;      // much lower per-tick latch damage so latch/kill phase lasts far longer
export const LATCH_MAX = 140;               // max simultaneous latches
export const LATCH_TOUCH_PADDING = 3.0;     // allow latch on near-first-touch contacts (in collision-radius space)
export const LATCH_REFRESH_RANGE_MULT = 2.1; // refresh latch timer while weapon remains near prey blob
export const LATCH_CONSTRAINT_STRENGTH = 0.9; // higher = keep latched blobs in contact more aggressively
export const LATCH_HUNGRY_DAMAGE_THRESHOLD = 0.45; // below this energy frac, predator latch damage gets boosted
export const LATCH_HUNGRY_DAMAGE_MULT = 1.10; // modest latch DPS boost for hungry predators
export const WEAPON_FORWARD_PULL = 1.8;       // strong orbit pull when chasing prey (~90° in 19 ticks)
export const WEAPON_FORWARD_PULL_IDLE = 0.5;  // gentle forward drift when wandering
export const PREDATOR_FLOCK_DETECT_RANGE = 900; // predators can notice dense prey clusters at this range
export const PREDATOR_FLOCK_CLUSTER_RADIUS = 180; // radius used to estimate local crowding around prey
export const PREDATOR_FLOCK_DENSITY_WEIGHT = 0.35; // higher = stronger preference for dense clusters over nearest target

// Clan herding (persistent social identity)
export const CLAN_HERD_RANGE = 760;
export const KIN_METABOLISM_DISCOUNT = 0.25; // max metabolism reduction near same-clan creatures
export const CLAN_HERD_ENTER_QUORUM = 5;
export const CLAN_HERD_EXIT_QUORUM = 2;
export const CLAN_HERD_LOCK_TICKS = 170;
export const CLAN_BOND_TICKS = 140;
export const CLAN_COHESION_WEIGHT = 1.05;
export const CLAN_ALIGNMENT_WEIGHT = 1.3;
export const CLAN_LEADER_WEIGHT = 0.54;
export const CLAN_FOOD_WEIGHT_CALM = 0.14;
export const CLAN_FOOD_WEIGHT_HUNGRY = 0.75;
export const CLAN_HUNGER_OVERRIDE_THRESHOLD = 0.62;
export const CLAN_BOND_COHESION_MULT = 2.0;
export const CLAN_BOND_ALIGNMENT_MULT = 1.9;
export const CLAN_BOND_LEADER_MULT = 1.65;
export const CLAN_BOND_FOOD_MULT = 0.45;
export const CLAN_BOND_COLLISION_SOFTEN = 0.5;
export const CLAN_LEADER_REASSIGN_TICKS = 620;
export const CLAN_LEADER_TARGET_REASSIGN_TICKS = 760;
export const CLAN_LEADER_TARGET_RADIUS = 760;
export const CLAN_LEADER_FOLLOW_RANGE = 980;
export const CLAN_LEADER_SPLIT_DISTANCE = 1200;
export const CLAN_LEADER_WANDER_JITTER = 0.12;
export const CLAN_LEADER_EDGE_MARGIN = 220;
export const CLAN_LEADER_DENSITY_WEIGHT = 0.04;
export const PACK_JOIN_LOCK_TICKS = 260;
export const PACK_OFFSHOOT_CHANCE_ASEXUAL = 0.07; // chance a single-parent birth starts a new pack within the same clan
export const PACK_OFFSHOOT_CHANCE_SEXUAL_SAME_PACK = 0.16; // chance a two-parent same-pack birth buds into a new pack
export const PACK_LEAVE_ISOLATION_TICKS = 300;
export const PACK_SEEK_WEIGHT = 0.42;
export const PACK_SEEK_MIN_DISTANCE = 360;
export const PACK_PERSISTENT_COHESION_WEIGHT = 0.82;
export const PACK_PERSISTENT_ALIGNMENT_WEIGHT = 0.92;
export const PACK_MERGE_CONTACT_TICKS = 130;
export const PACK_MERGE_DISTANCE = 320;
export const PACK_MERGE_CONTACT_MIN_NEIGHBORS = 5;
export const PACK_MERGE_COOLDOWN_TICKS = 420;
export const PACK_MERGE_MAX_SIZE_RATIO = 2.6;
export const PACK_MERGE_SMALL_PACK_MAX = 20; // only allow merges when the smaller pack is at most this size
export const PACK_MERGE_MAX_POP_FRACTION = 0.58; // block merges that would create an oversized dominant pack
export const PACK_PREDATOR_MERGE_MIN_SIMILARITY = 0.5; // predator-involved merges require at least this genome similarity
export const PACK_HERD_PRIORITY_MULT = 1.35;
export const PACK_MEMBER_COLLISION_SOFTEN = 0.22;
export const PACK_MEMBER_BOUNCE_DAMP = 0.45;
export const PACK_REJOIN_FORCE = 0.85;
export const PACK_REJOIN_MAX_DIST = 1800;
export const PACK_REJOIN_HUNGER_GATE = 0.28;
export const PACK_CONTACT_RECOVERY_TICKS = 36;
export const FORAGE_SCATTER_MIN_NEIGHBORS = 8;
export const FORAGE_SCATTER_WEIGHT = 0.60;
export const BOID_SEPARATION_RADIUS = 120;
export const BOID_ALIGNMENT_RADIUS = 300;
export const BOID_COHESION_RADIUS = 420;
export const BOID_SEPARATION_WEIGHT = 1.2;
export const BOID_ALIGNMENT_WEIGHT = 1.1;
export const BOID_COHESION_WEIGHT = 1.0;
export const BOID_SEPARATION_HARD_WEIGHT = 1.8;
export const BOID_SEPARATION_HARD_TRIGGER_RATIO = 0.45;
export const BOID_SEPARATION_SOFT_WEIGHT = 0.75;
export const BOID_MAX_FORCE = 2.3;
export const BOID_MIN_NEIGHBORS_ALIGN = 2;
export const BOID_MIN_NEIGHBORS_COHESION = 2;
export const BOID_PACK_NEIGHBOR_MULT = 1.0;
export const BOID_CLAN_NEIGHBOR_MULT = 0.55;
export const FOOD_SIGNAL_RADIUS = 700;
export const FOOD_SIGNAL_DECAY_TICKS = 120;
export const FOOD_SIGNAL_MIN_STRENGTH = 0.02;
export const FOOD_SIGNAL_SHARE_WEIGHT = 1.0;
export const FOOD_SIGNAL_BLEND_WEIGHT = 0.85;
export const FOOD_SIGNAL_RELAY_ATTENUATION = 0.76;
export const FOOD_SIGNAL_MAX_HOPS = 2;
export const FOOD_SIGNAL_RELAY_AGE_FACTOR = 0.6;
export const FOOD_SIGNAL_RELAY_HOP_ATTENUATION = 0.5; // extra per-hop attenuation for relayed signals
export const FOOD_SIGNAL_RELAY_STALE_START_FRAC = 0.55; // relay signal starts being penalized after this age fraction
export const FOOD_SIGNAL_RELAY_STALE_MIN_MULT = 0.2; // stale relays are strongly down-weighted
export const FOOD_SIGNAL_CLAN_SHARE_MULT = 0.6;
export const FOOD_SIGNAL_HUNGRY_MULT = 1.8;
export const FOOD_SIGNAL_SCOUT_MULT = 1.15;
export const PACK_HUNGER_RALLY_AVG_ENERGY_ON_FRAC = 0.58; // pack-level hunger trigger from average energy fraction
export const PACK_HUNGER_RALLY_HUNGRY_FRACTION_ON = 0.45; // minimum share of hungry members to trigger rally
export const PACK_HUNGER_RALLY_MIN_SIGNAL = 0.62; // require a strong scout/direct signal ("large food")
export const PACK_HUNGER_RALLY_MIN_PACK_SIZE = 4; // avoid over-coordinating tiny packs
export const PACK_HUNGER_RALLY_STEER_WEIGHT = 1.45; // strong pack convergence force during hunger rally
export const PACK_SCOUT_ROLE_MIN_PACK_SIZE = 6; // no dedicated scouts in tiny packs
export const PACK_SCOUT_ROLE_MAX_FRAC = 0.06; // dedicated scout quota as fraction of eligible non-predators
export const PACK_SCOUT_ROLE_ROTATE_TICKS = 1800; // rotate scout assignment slowly so scouts have time to search
export const PACK_SCOUT_ROLE_MIN_TENURE_TICKS = 900; // minimum time a creature keeps scout duty once assigned
export const PACK_SCOUT_ROLE_MIN_HUNGRY_FRAC = 0.2; // only form scout role when pack is meaningfully hungry
export const PACK_SCOUT_HIGH_ENERGY_FRAC = 0.72; // scouts only enter outbound patrol when comfortably fueled
export const PACK_SCOUT_AWAY_FROM_PACK_WEIGHT = 1.35; // push high-energy scouts out of dense pack center
export const PACK_SCOUT_PATROL_WEIGHT = 1.10; // systematic world patrol steering weight
export const PACK_SCOUT_PATROL_SEGMENT_TICKS = 1200; // ticks spent on one scout patrol waypoint before retargeting
export const PACK_SCOUT_PATROL_MARGIN = 260; // avoid selecting patrol waypoints too close to world boundary
export const PACK_SCOUT_METABOLISM_MULT = 0.32; // active scouts burn far less energy so they can survey longer
export const HUNGRY_LOCAL_FOOD_SNAP_FORCE = 1.2; // starving creatures should strongly snap to nearby food
export const HUNGRY_LOCAL_FOOD_SNAP_RANGE = 210; // max range where local food snap can hard-lock steering
export const STARVING_FOOD_PRIORITY_ON_FRAC = 0.45; // starving creatures deprioritize social milling when food is known
export const CRITICAL_FOOD_PRIORITY_ON_FRAC = 0.30; // critical starvation tier
export const STARVING_PACK_LEADER_MULT = 0.12;
export const STARVING_PACK_ALIGNMENT_MULT = 0.10;
export const STARVING_PACK_COHESION_MULT = 0.08;
export const STARVING_PACK_SEEK_MULT = 0.12;
export const STARVING_ANTI_MILL_MULT = 0.15;
export const STARVING_FOOD_STEER_MULT = 1.8;
export const CRITICAL_FOOD_STEER_MULT = 2.4;
export const HUNGRY_ROAM_DISPLACEMENT_MIN = 240; // minimum radial displacement for starvation exploration push
export const HUNGRY_ROAM_SCATTER_MULT = 2.0; // exploration scatter multiplier while starving
export const FEEDING_MODE_RANGE = 240; // distance from sensed food where anti-clump feeding behavior activates
export const FEEDING_MODE_MIN_NEIGHBORS = 5; // feeding anti-clump only matters when locally crowded
export const FEEDING_MODE_LEADER_MULT = 0.30; // reduce leader-follow while actively feeding
export const FEEDING_MODE_ALIGNMENT_MULT = 0.32; // reduce pack alignment while actively feeding
export const FEEDING_MODE_COHESION_MULT = 0.26; // reduce pack cohesion while actively feeding
export const FEEDING_MODE_SEPARATION_MULT = 1.45; // increase local separation while actively feeding
export const INTENT_HUNGER_FORAGE_ON = 0.50;
export const INTENT_HUNGER_FORAGE_OFF = 0.62;
export const INTENT_MATE_ENERGY_THRESHOLD = 0.7;
export const INTENT_HUNT_TARGET_LOCK_TICKS = 45;
export const ROLE_FRONT_SENSOR_STRENGTH = 0.9;
export const ROLE_FRONT_WEAPON_STRENGTH = 1.25;
export const ROLE_FRONT_REPRO_STRENGTH = 0.95;
export const ROLE_FRONT_DEADZONE = 2.5;
export const PACK_ANTI_MILL_TANGENTIAL_DAMP = 1.25;
export const PACK_ANTI_MILL_RADIAL_PULL = 0.85;
export const PACK_ANTI_MILL_MIN_RADIUS = 130;
export const PACK_ANTI_MILL_MAX_RADIUS = 760;
export const PACK_ANTI_MILL_ACTIVATION_NEIGHBORS = 3;
export const PACK_ANTI_MILL_RECOVERY_TICKS = 52;
export const PACK_FORWARD_DRIFT_WEIGHT = 0.5;
export const PACK_CENTROID_DAMP_WHEN_CROWDED = 0.5;
export const PACK_ANTI_MILL_VELOCITY_DAMP = 0.65;
export const PACK_ANTI_MILL_FORCE_TANGENTIAL_SPEED = 0.28;
export const PACK_ANTI_MILL_FORCE_FORWARD_BIAS = 0.35;

// Reproduction
export const REPRODUCE_ENERGY_THRESHOLD = 0.6; // fraction of max energy
export const REPRODUCE_COOLDOWN = 200; // ticks (base)
export const REPRODUCE_ENERGY_SPLIT = 0.5; // fraction given to child (asexual)
export const MUTATION_RATE = 0.15;
export const STRUCTURAL_MUTATION_RATE = 0.15;
export const HEAVY_MUTATION_CHANCE = 0.03; // rare larger mutation bursts on top of normal mutation flow
export const HEAVY_MUTATION_SCALE = 2.2; // multiplier for mutation deltas during heavy mutation events
export const MAX_BLOBS_PER_CREATURE = 12;
export const MIN_BLOBS_PER_CREATURE = 2; // core + at least 1

// Sexual reproduction
export const MATE_RANGE = 50;                       // base proximity for reproducer blobs
export const MATE_MIN_SIMILARITY = 0.3;             // minimum genetic similarity to mate
export const SEXUAL_REPRODUCE_ENERGY_SPLIT = 0.3;   // fraction each parent gives to child
export const ASEXUAL_FALLBACK_TICKS = 300;           // ticks before falling back to asexual

// Rendering
export const RENDER_RADIUS_MULT = 3.0; // visual radius multiplier for metaball (used for food)
// Per-type render radius multipliers: [CORE, MOUTH, SHIELD, SENSOR, WEAPON, REPRODUCER, MOTOR, FAT, PHOTO, ADHESION]
// Kept small so blobs read as distinct shapes joined by thin bridges
export const RENDER_RADIUS_BY_TYPE: readonly number[] = [
  1.6,  // CORE: slightly larger center
  1.4,  // MOUTH: compact
  1.8,  // SHIELD: largest — protective shell
  1.2,  // SENSOR: small, protrudes clearly
  1.3,  // WEAPON: small-medium, spiky shader does the rest
  1.5,  // REPRODUCER: medium
  1.2,  // MOTOR: small, visible limb
  1.8,  // FAT: big soft extension
  1.6,  // PHOTOSYNTHESIZER: medium
  1.4,  // ADHESION: compact
];
export const METABALL_THRESHOLD = 0.45;
export const GLOW_INTENSITY = 0.6;
export const BACKGROUND_COLOR: [number, number, number, number] = [0.0, 0.0, 0.0, 1.0];

// Simulation speed
export const MIN_SPEED = 1;
export const MAX_SPEED = 50;
export const DEFAULT_SPEED = 1;
