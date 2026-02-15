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
export const FOOD_ENERGY = 40;
export const FOOD_SPAWN_RATE = 10; // per tick
export const FOOD_MAX = 3000;

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
export const FOOD_DISPERSION_DEFAULT = 0.3;
export const FOOD_SIGMA_MIN = 40;              // sigma at dispersion=0
export const FOOD_SIGMA_MAX = 500;             // sigma at dispersion=1
export const FOOD_PATCH_FRACTION_MIN = 0.95;   // patch % at dispersion=0
export const FOOD_PATCH_FRACTION_MAX = 0.15;   // patch % at dispersion=1
export const FOOD_SUB_OFFSET_SCALE_MIN = 0.6;  // sub-offset scale at dispersion=0
export const FOOD_SUB_OFFSET_SCALE_MAX = 1.8;  // sub-offset scale at dispersion=1
export const FOOD_TARGET_LOCK_TICKS = 24; // keep pursuing last chosen food target for this many ticks
export const FOOD_TARGET_DEADBAND = 28; // if already this close to food target, avoid constant steering corrections

// Creature
export const INITIAL_CREATURE_COUNT = 30;
export const CREATURE_BASE_ENERGY = 150;
export const CREATURE_MAX_ENERGY_BASE = 250;
export const METABOLISM_COST_PER_BLOB = 0.08; // energy/tick/blob
export const METABOLISM_SCALING_EXPONENT = 0.75; // sub-linear: count^exp * cost (1.0 = linear)
export const MOTOR_FORCE = 1.2;
export const SENSOR_RANGE = 350;
export const BASIC_FOOD_SENSE_RANGE = 120; // all creatures sense food this close
export const WEAPON_DAMAGE = 2.0;
export const WEAPON_ENERGY_COST = 0.1;
export const MOUTH_EFFICIENCY = 1.0;
export const EAT_FULL_STOP_FRACTION = 0.9; // stop eating at this energy fraction (satiety enter)
export const EAT_RESUME_FRACTION = 0.7; // resume eating at this energy fraction (satiety exit)
export const EAT_COOLDOWN_TICKS = 10; // ticks after a bite before next bite
export const EAT_MAX_ITEMS_PER_SUBSTEP = 1; // hard cap on food pellets eaten per substep
export const PHOTO_ENERGY_PER_TICK = 0.9; // multiplied by genome.photoEfficiency (0.2-0.5)
export const FAT_ENERGY_BONUS = 80; // extra max energy per FAT blob
export const ADHESION_FORCE = 0.3;
export const ADHESION_RANGE = 40;
export const PREDATION_STEAL_FRACTION = 0.8;
export const PREDATION_KIN_THRESHOLD = 0.5;
export const CARRION_DROP_DIVISOR = 2;
export const CARRION_SCATTER_RADIUS = 30;
export const FEAR_DURATION = 75; // ticks to keep fleeing after threat disappears (~1.25s)
export const FEAR_SPEED_MULT = 1.35; // movement multiplier while fleeing

// Predator mechanics
export const LUNGE_SPEED_MULT = 1.5;       // speed boost when chasing prey
export const LUNGE_RANGE = 200;             // distance to trigger lunge
export const STEALTH_DETECTION_MULT = 0.8;  // predators detected at 80% normal range
export const KILL_BOUNTY_FRACTION = 0.3;    // killer gets 30% of victim's maxEnergy
export const LATCH_DURATION = 30;           // ticks weapon stays attached after contact
export const LATCH_DAMAGE_MULT = 0.5;       // fraction of WEAPON_DAMAGE applied per latch tick
export const LATCH_MAX = 50;                // max simultaneous latches
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
export const CLAN_LEADER_WEIGHT = 0.58;
export const CLAN_FOOD_WEIGHT_CALM = 0.05;
export const CLAN_FOOD_WEIGHT_HUNGRY = 0.28;
export const CLAN_HUNGER_OVERRIDE_THRESHOLD = 0.55;
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
export const PACK_LEAVE_ISOLATION_TICKS = 200;
export const PACK_SEEK_WEIGHT = 0.42;
export const PACK_SEEK_MIN_DISTANCE = 360;
export const PACK_PERSISTENT_COHESION_WEIGHT = 0.9;
export const PACK_PERSISTENT_ALIGNMENT_WEIGHT = 0.95;
export const PACK_MERGE_CONTACT_TICKS = 70;
export const PACK_MERGE_DISTANCE = 430;
export const PACK_MERGE_CONTACT_MIN_NEIGHBORS = 3;
export const PACK_MERGE_COOLDOWN_TICKS = 260;
export const PACK_HERD_PRIORITY_MULT = 1.35;
export const PACK_MEMBER_COLLISION_SOFTEN = 0.22;
export const PACK_MEMBER_BOUNCE_DAMP = 0.45;
export const PACK_REJOIN_FORCE = 0.85;
export const PACK_REJOIN_MAX_DIST = 1800;
export const PACK_REJOIN_HUNGER_GATE = 0.28;
export const PACK_CONTACT_RECOVERY_TICKS = 36;
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
export const BACKGROUND_COLOR: [number, number, number, number] = [0.02, 0.02, 0.04, 1.0];

// Simulation speed
export const MIN_SPEED = 1;
export const MAX_SPEED = 50;
export const DEFAULT_SPEED = 1;
