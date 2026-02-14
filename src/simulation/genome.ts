import { BlobType } from '../types';
import type { Genome } from '../types';
import {
  MUTATION_RATE, STRUCTURAL_MUTATION_RATE,
  MAX_BLOBS_PER_CREATURE, MIN_BLOBS_PER_CREATURE,
} from '../constants';

const ALL_TYPES: BlobType[] = [
  BlobType.MOUTH, BlobType.SHIELD, BlobType.SENSOR, BlobType.WEAPON,
  BlobType.REPRODUCER, BlobType.MOTOR, BlobType.FAT,
  BlobType.PHOTOSYNTHESIZER, BlobType.ADHESION,
];

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

  return {
    blobTypes,
    blobOffsets,
    blobSizes,
    baseHue: Math.random(),
    turnRate: 0.5 + Math.random() * 1.5,
    maxEnergy: 150 + Math.random() * 100,
    photoEfficiency: 0.2 + Math.random() * 0.3,
    adhesionStrength: 0.2 + Math.random() * 0.4,
  };
}

export function mutateGenome(parent: Genome, mutRate = MUTATION_RATE): Genome {
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

  // Parametric mutations
  if (Math.random() < mutRate) {
    g.baseHue = clamp01(g.baseHue + (Math.random() - 0.5) * 0.1);
  }
  if (Math.random() < mutRate) {
    g.turnRate = Math.max(0.1, g.turnRate + (Math.random() - 0.5) * 0.3);
  }
  if (Math.random() < mutRate) {
    g.maxEnergy = Math.max(80, g.maxEnergy + (Math.random() - 0.5) * 40);
  }
  if (Math.random() < mutRate) {
    g.photoEfficiency = Math.max(0.05, g.photoEfficiency + (Math.random() - 0.5) * 0.1);
  }
  if (Math.random() < mutRate) {
    g.adhesionStrength = Math.max(0.05, g.adhesionStrength + (Math.random() - 0.5) * 0.1);
  }

  // Mutate individual blob sizes
  for (let i = 1; i < g.blobSizes.length; i++) {
    if (Math.random() < mutRate) {
      g.blobSizes[i] = Math.max(0.5, Math.min(1.5, g.blobSizes[i] + (Math.random() - 0.5) * 0.2));
    }
  }

  // Mutate blob offsets (angles)
  for (let i = 1; i < g.blobOffsets.length; i++) {
    if (Math.random() < mutRate) {
      g.blobOffsets[i] += (Math.random() - 0.5) * 0.3;
    }
  }

  // Structural mutations: add or remove a blob
  if (Math.random() < STRUCTURAL_MUTATION_RATE && g.blobTypes.length < MAX_BLOBS_PER_CREATURE) {
    // Add a random blob
    const type = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
    g.blobTypes.push(type);
    g.blobOffsets.push(Math.random() * Math.PI * 2);
    g.blobSizes.push(0.8 + Math.random() * 0.4);
  }

  if (Math.random() < STRUCTURAL_MUTATION_RATE && g.blobTypes.length > MIN_BLOBS_PER_CREATURE) {
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
  if (Math.random() < STRUCTURAL_MUTATION_RATE && g.blobTypes.length > 1) {
    const idx = 1 + Math.floor(Math.random() * (g.blobTypes.length - 1));
    g.blobTypes[idx] = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
  }

  return g;
}

function clamp01(v: number): number {
  return v < 0 ? v + 1 : v > 1 ? v - 1 : v;
}
