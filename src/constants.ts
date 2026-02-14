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
export const COLLISION_RADIUS_MULT = 2.5; // collide at this multiple of physics radius

// Blobs
export const BASE_BLOB_RADIUS = 12;
export const CORE_RADIUS_MULT = 1.2;
export const BLOB_MASS_BASE = 1.0;
export const SHIELD_MASS_MULT = 3.0;
export const FAT_MASS_MULT = 2.0;

// Soft-body constraints
export const CONSTRAINT_STIFFNESS = 0.4;
export const STAR_REST_DISTANCE = 30;
export const RING_REST_DISTANCE = 25;

// Spatial hash
export const SPATIAL_CELL_SIZE = 80;

// Food
export const FOOD_RADIUS = 4;
export const FOOD_ENERGY = 40;
export const FOOD_SPAWN_RATE = 10; // per tick
export const FOOD_MAX = 3000;

// Creature
export const INITIAL_CREATURE_COUNT = 30;
export const CREATURE_BASE_ENERGY = 150;
export const CREATURE_MAX_ENERGY_BASE = 250;
export const METABOLISM_COST_PER_BLOB = 0.08; // energy/tick/blob
export const MOTOR_FORCE = 1.2;
export const SENSOR_RANGE = 350;
export const BASIC_FOOD_SENSE_RANGE = 120; // all creatures sense food this close
export const WEAPON_DAMAGE = 2.0;
export const WEAPON_ENERGY_COST = 0.5;
export const MOUTH_EFFICIENCY = 1.0;
export const PHOTO_ENERGY_PER_TICK = 0.5; // multiplied by genome.photoEfficiency (0.2-0.5)
export const FAT_ENERGY_BONUS = 80; // extra max energy per FAT blob
export const ADHESION_FORCE = 0.3;
export const ADHESION_RANGE = 40;

// Reproduction
export const REPRODUCE_ENERGY_THRESHOLD = 0.6; // fraction of max energy
export const REPRODUCE_COOLDOWN = 200; // ticks (base)
export const REPRODUCE_ENERGY_SPLIT = 0.5; // fraction given to child
export const MUTATION_RATE = 0.15;
export const STRUCTURAL_MUTATION_RATE = 0.08;
export const MAX_BLOBS_PER_CREATURE = 12;
export const MIN_BLOBS_PER_CREATURE = 2; // core + at least 1

// Rendering
export const RENDER_RADIUS_MULT = 3.0; // visual radius multiplier for metaball (used for food)
// Per-type render radius multipliers: [CORE, MOUTH, SHIELD, SENSOR, WEAPON, REPRODUCER, MOTOR, FAT, PHOTO, ADHESION]
export const RENDER_RADIUS_BY_TYPE: readonly number[] = [
  2.5,  // CORE: compact center
  2.2,  // MOUTH: medium, part of body
  3.5,  // SHIELD: large protective shell
  1.8,  // SENSOR: small, protrudes
  2.0,  // WEAPON: medium, spiky shader does the rest
  2.5,  // REPRODUCER: medium
  1.8,  // MOTOR: small, visible limb
  3.2,  // FAT: big blobby
  2.8,  // PHOTOSYNTHESIZER: medium-large
  2.2,  // ADHESION: medium
];
export const METABALL_THRESHOLD = 0.45;
export const GLOW_INTENSITY = 0.6;
export const BACKGROUND_COLOR: [number, number, number, number] = [0.02, 0.02, 0.04, 1.0];

// Simulation speed
export const MIN_SPEED = 1;
export const MAX_SPEED = 50;
export const DEFAULT_SPEED = 1;
