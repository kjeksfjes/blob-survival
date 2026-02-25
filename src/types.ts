export const enum BlobType {
  CORE = 0,
  MOUTH = 1,
  SHIELD = 2,
  SENSOR = 3,
  WEAPON = 4,
  REPRODUCER = 5,
  MOTOR = 6,
  FAT = 7,
  PHOTOSYNTHESIZER = 8,
  ADHESION = 9,
}

export const BLOB_TYPE_COUNT = 10;

export const enum FoodKind {
  PLANT = 0,
  MEAT = 1,
}

export interface Genome {
  blobTypes: BlobType[];
  blobOffsets: number[];  // angles in radians
  blobSizes: number[];    // size multiplier per blob
  baseHue: number;        // [0, 1]
  turnRate: number;
  maxEnergy: number;
  photoEfficiency: number;
  adhesionStrength: number;
}

// Per-blob GPU data layout (for instance buffer):
// float32 x 8: posX, posY, radius, r, g, b, alpha, type
export const BLOB_FLOATS = 8;

// Per-link GPU data layout:
// float32 x 9: ax, ay, bx, by, thickness, r, g, b, alpha
export const LINK_FLOATS = 9;

// Per-food GPU data layout:
// float32 x 6: posX, posY, radius, alpha, kind, rotNorm
export const FOOD_FLOATS = 6;
