import { BlobType } from '../types';
import type { Genome } from '../types';
import {
  MUTATION_RATE, STRUCTURAL_MUTATION_RATE,
  HEAVY_MUTATION_CHANCE, HEAVY_MUTATION_SCALE,
  MAX_BLOBS_PER_CREATURE, MIN_BLOBS_PER_CREATURE,
} from '../constants';

const ALL_TYPES: BlobType[] = [
  BlobType.MOUTH, BlobType.SHIELD, BlobType.SENSOR, BlobType.WEAPON,
  BlobType.REPRODUCER, BlobType.MOTOR, BlobType.FAT,
  BlobType.PHOTOSYNTHESIZER, BlobType.ADHESION,
];

function ensureRequiredRoles(g: Genome): void {
  // Keep lineages ecologically viable: always require movement, reproduction, and at least one energy source.
  ensureType(g, BlobType.MOTOR);
  ensureType(g, BlobType.REPRODUCER);
  const hasMouth = hasType(g, BlobType.MOUTH);
  const hasPhoto = hasType(g, BlobType.PHOTOSYNTHESIZER);
  if (!hasMouth && !hasPhoto) {
    ensureType(g, Math.random() < 0.5 ? BlobType.MOUTH : BlobType.PHOTOSYNTHESIZER);
  }
}

function hasType(g: Genome, type: BlobType): boolean {
  for (let i = 1; i < g.blobTypes.length; i++) {
    if (g.blobTypes[i] === type) return true;
  }
  return false;
}

function ensureType(g: Genome, type: BlobType): void {
  for (let i = 1; i < g.blobTypes.length; i++) {
    if (g.blobTypes[i] === type) return;
  }
  if (g.blobTypes.length < MAX_BLOBS_PER_CREATURE) {
    g.blobTypes.push(type);
    g.blobOffsets.push(Math.random() * Math.PI * 2);
    g.blobSizes.push(0.8 + Math.random() * 0.4);
    return;
  }
  // At cap: replace a random non-core blob.
  const idx = 1 + Math.floor(Math.random() * (g.blobTypes.length - 1));
  g.blobTypes[idx] = type;
}

export function randomGenome(): Genome {
  const numBlobs = 3 + Math.floor(Math.random() * 4); // 3-6 blobs
  const blobTypes: BlobType[] = [BlobType.CORE];
  const blobOffsets: number[] = [0];
  const blobSizes: number[] = [1.0];

  // Always include at least one MOUTH or PHOTOSYNTHESIZER (energy source)
  // and one REPRODUCER and one MOTOR
  const required = [BlobType.REPRODUCER, BlobType.MOTOR];
  if (Math.random() < 0.5) {
    required.push(BlobType.MOUTH);
  } else {
    required.push(BlobType.PHOTOSYNTHESIZER);
  }

  for (let i = 0; i < required.length && blobTypes.length < numBlobs; i++) {
    blobTypes.push(required[i]);
    blobOffsets.push((blobTypes.length / numBlobs) * Math.PI * 2);
    blobSizes.push(0.8 + Math.random() * 0.4);
  }

  // Fill remaining with random types
  while (blobTypes.length < numBlobs) {
    const type = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
    blobTypes.push(type);
    blobOffsets.push((blobTypes.length / numBlobs) * Math.PI * 2);
    blobSizes.push(0.8 + Math.random() * 0.4);
  }

  const g: Genome = {
    blobTypes,
    blobOffsets,
    blobSizes,
    baseHue: Math.random(),
    turnRate: 0.5 + Math.random() * 1.5,
    maxEnergy: 150 + Math.random() * 100,
    photoEfficiency: 0.2 + Math.random() * 0.3,
    adhesionStrength: 0.2 + Math.random() * 0.4,
  };
  ensureRequiredRoles(g);
  return g;
}

export function mutateGenome(parent: Genome, mutRate = MUTATION_RATE, structRate = STRUCTURAL_MUTATION_RATE): Genome {
  const g: Genome = {
    blobTypes: [...parent.blobTypes],
    blobOffsets: [...parent.blobOffsets],
    blobSizes: [...parent.blobSizes],
    baseHue: parent.baseHue,
    turnRate: parent.turnRate,
    maxEnergy: parent.maxEnergy,
    photoEfficiency: parent.photoEfficiency,
    adhesionStrength: parent.adhesionStrength,
  };
  const heavyMut = Math.random() < HEAVY_MUTATION_CHANCE;
  const scale = heavyMut ? HEAVY_MUTATION_SCALE : 1;
  const effStructRate = heavyMut ? Math.min(1, structRate * 1.8) : structRate;

  // Parametric mutations
  if (Math.random() < mutRate) {
    g.baseHue = clamp01(g.baseHue + (Math.random() - 0.5) * 0.1 * scale);
  }
  if (Math.random() < mutRate) {
    g.turnRate = Math.max(0.1, g.turnRate + (Math.random() - 0.5) * 0.3 * scale);
  }
  if (Math.random() < mutRate) {
    g.maxEnergy = Math.max(80, g.maxEnergy + (Math.random() - 0.5) * 40 * scale);
  }
  if (Math.random() < mutRate) {
    g.photoEfficiency = Math.max(0.05, g.photoEfficiency + (Math.random() - 0.5) * 0.1 * scale);
  }
  if (Math.random() < mutRate) {
    g.adhesionStrength = Math.max(0.05, g.adhesionStrength + (Math.random() - 0.5) * 0.1 * scale);
  }

  // Mutate individual blob sizes
  for (let i = 1; i < g.blobSizes.length; i++) {
    if (Math.random() < mutRate) {
      g.blobSizes[i] = Math.max(0.5, Math.min(1.5, g.blobSizes[i] + (Math.random() - 0.5) * 0.2 * scale));
    }
  }

  // Mutate blob offsets (angles)
  for (let i = 1; i < g.blobOffsets.length; i++) {
    if (Math.random() < mutRate) {
      g.blobOffsets[i] += (Math.random() - 0.5) * 0.3 * scale;
    }
  }

  // Structural mutations: add or remove a blob
  if (Math.random() < effStructRate && g.blobTypes.length < MAX_BLOBS_PER_CREATURE) {
    // Add a random blob
    const type = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
    g.blobTypes.push(type);
    g.blobOffsets.push(Math.random() * Math.PI * 2);
    g.blobSizes.push(0.8 + Math.random() * 0.4);
  }

  if (Math.random() < effStructRate && g.blobTypes.length > MIN_BLOBS_PER_CREATURE) {
    // Remove a random non-CORE blob
    const removable = [];
    for (let i = 1; i < g.blobTypes.length; i++) removable.push(i);
    if (removable.length > 0) {
      const ri = removable[Math.floor(Math.random() * removable.length)];
      g.blobTypes.splice(ri, 1);
      g.blobOffsets.splice(ri, 1);
      g.blobSizes.splice(ri, 1);
    }
  }

  // Type mutation: change a non-CORE blob's type
  if (Math.random() < effStructRate && g.blobTypes.length > 1) {
    const idx = 1 + Math.floor(Math.random() * (g.blobTypes.length - 1));
    g.blobTypes[idx] = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
  }

  ensureRequiredRoles(g);
  return g;
}

/** Crossover two parent genomes. Does NOT mutate — caller chains mutateGenome(). */
export function crossoverGenome(a: Genome, b: Genome): Genome {
  const lenA = a.blobTypes.length;
  const lenB = b.blobTypes.length;
  // Child length: random between parents' lengths (at least MIN_BLOBS_PER_CREATURE)
  const childLen = Math.max(
    MIN_BLOBS_PER_CREATURE,
    Math.min(lenA, lenB) + Math.floor(Math.random() * (Math.abs(lenA - lenB) + 1)),
  );

  const blobTypes: BlobType[] = [BlobType.CORE]; // slot 0 is always CORE
  const blobOffsets: number[] = [0];
  const blobSizes: number[] = [1.0];

  for (let i = 1; i < childLen; i++) {
    // Coin-flip picks from parent A or B; fall back to the other if out of range
    const pickA = Math.random() < 0.5;
    let donor: Genome;
    if (pickA) {
      donor = i < lenA ? a : b;
    } else {
      donor = i < lenB ? b : a;
    }
    // If still out of range (both parents shorter), use random type
    if (i >= donor.blobTypes.length) {
      blobTypes.push(ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)]);
      blobOffsets.push(Math.random() * Math.PI * 2);
      blobSizes.push(0.8 + Math.random() * 0.4);
    } else {
      blobTypes.push(donor.blobTypes[i]);
      blobOffsets.push(donor.blobOffsets[i]);
      blobSizes.push(donor.blobSizes[i]);
    }
  }

  // Scalar params: coin-flip per field
  const scalarDonorTurn = Math.random() < 0.5 ? a : b;
  const scalarDonorEnergy = Math.random() < 0.5 ? a : b;
  const scalarDonorPhoto = Math.random() < 0.5 ? a : b;
  const scalarDonorAdhesion = Math.random() < 0.5 ? a : b;

  // baseHue: weighted blend (70/30) with circular wrapping
  const primary = Math.random() < 0.5 ? a : b;
  const secondary = primary === a ? b : a;
  let hueDiff = secondary.baseHue - primary.baseHue;
  // Wrap to [-0.5, 0.5] for shortest circular path
  if (hueDiff > 0.5) hueDiff -= 1;
  if (hueDiff < -0.5) hueDiff += 1;
  const blendedHue = clamp01(primary.baseHue + hueDiff * 0.3);

  const g: Genome = {
    blobTypes,
    blobOffsets,
    blobSizes,
    baseHue: blendedHue,
    turnRate: scalarDonorTurn.turnRate,
    maxEnergy: scalarDonorEnergy.maxEnergy,
    photoEfficiency: scalarDonorPhoto.photoEfficiency,
    adhesionStrength: scalarDonorAdhesion.adhesionStrength,
  };
  ensureRequiredRoles(g);
  return g;
}

function clamp01(v: number): number {
  return v < 0 ? v + 1 : v > 1 ? v - 1 : v;
}
