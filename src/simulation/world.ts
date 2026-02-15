import {
  MAX_BLOBS, MAX_CREATURES, MAX_FOOD,
  WORLD_SIZE, CREATURE_BASE_ENERGY, CREATURE_MAX_ENERGY_BASE,
  LATCH_MAX,
} from '../constants';
import { BlobType, Genome } from '../types';

/**
 * Structure-of-Arrays world state with free-list allocation.
 * All arrays are pre-allocated to max capacity.
 */
export class World {
  // --- Blob SoA ---
  readonly blobX: Float32Array;
  readonly blobY: Float32Array;
  readonly blobPrevX: Float32Array;
  readonly blobPrevY: Float32Array;
  readonly blobRadius: Float32Array;
  readonly blobType: Uint8Array;
  readonly blobCreature: Int32Array;  // which creature this blob belongs to (-1 = free)
  readonly blobAlive: Uint8Array;     // 0 = free, 1 = alive
  readonly blobMass: Float32Array;
  readonly blobSize: Float32Array;
  private blobFreeList: Int32Array;
  private blobFreeCount: number;
  blobCount = 0; // number of alive blobs (for stats)

  // --- Creature SoA ---
  readonly creatureAlive: Uint8Array;
  readonly creatureEnergy: Float32Array;
  readonly creatureMaxEnergy: Float32Array;
  readonly creatureBlobStart: Int32Array;  // index of first blob slot
  readonly creatureBlobCount: Uint8Array;  // number of blobs
  readonly creatureBlobs: Int32Array;      // flat array: creature i's blobs at [blobStart..blobStart+blobCount)
  readonly creatureHeading: Float32Array;
  readonly creatureAge: Int32Array;
  readonly creatureReproCooldown: Int32Array;
  readonly creatureMateTimer: Int32Array;  // ticks spent ready-to-mate without finding a mate
  readonly creatureClanId: Int32Array;
  readonly creatureClanBornTick: Int32Array;
  readonly creaturePackId: Int32Array;
  readonly creatureGenome: (Genome | null)[];
  readonly creatureLastAttacker: Int32Array;  // last creature that attacked this one (-1 = none)
  // Constraint data: pairs of blob indices for distance constraints
  readonly constraintA: Int32Array;
  readonly constraintB: Int32Array;
  readonly constraintDist: Float32Array;
  constraintCount = 0;
  private creatureFreeList: Int32Array;
  private creatureFreeCount: number;
  creatureCount = 0;
  nextClanId = 0;
  nextPackId = 0;

  // --- Latch SoA (predator grab-on) ---
  readonly latchWeaponBlob: Int32Array;   // weapon blob index
  readonly latchTargetBlob: Int32Array;   // prey blob index
  readonly latchWeaponCreature: Int32Array; // attacking creature
  readonly latchTargetCreature: Int32Array; // target creature
  readonly latchTimer: Int32Array;        // ticks remaining
  latchCount = 0;

  // --- Food SoA ---
  readonly foodX: Float32Array;
  readonly foodY: Float32Array;
  readonly foodAlive: Uint8Array;
  private foodFreeList: Int32Array;
  private foodFreeCount: number;
  foodCount = 0;

  // Stats
  tick = 0;
  totalBirths = 0;
  totalDeaths = 0;
  flockFearOverrides = 0;
  flockHardSeparationApplies = 0;
  flockSoftSeparationApplies = 0;
  flockAntiMillApplies = 0;
  flockPackSwitches = 0;
  flockPackMerges = 0;
  flockLeaderReassigns = 0;
  flockAvgSamePackNeighbors = 0;
  foodSignalDirectEmits = 0;
  foodSignalRelayAdopts = 0;
  foodSignalSteerApplies = 0;
  foodSignalExpiredClears = 0;
  foodSignalAvgStrength = 0;
  foodSignalAvgHop = 0;
  aggWindowTicks = 0;
  aggWindowStartTick = 0;
  aggWindowEndTick = 0;
  aggAvgFood = 0;
  aggAvgCreatures = 0;
  aggAvgRelay = 0;
  aggAvgSteer = 0;
  aggAvgNeighbors = 0;
  aggDirectRate = 0;
  aggRelayRate = 0;
  aggSteerRate = 0;
  aggExpiredRate = 0;
  aggRelayPerDirect = 0;
  aggSteerPerRelay = 0;
  aggMinSignalStrength = 0;
  aggMaxSignalStrength = 0;
  aggMinSignalHop = 0;
  aggMaxSignalHop = 0;

  constructor() {
    // Blobs
    this.blobX = new Float32Array(MAX_BLOBS);
    this.blobY = new Float32Array(MAX_BLOBS);
    this.blobPrevX = new Float32Array(MAX_BLOBS);
    this.blobPrevY = new Float32Array(MAX_BLOBS);
    this.blobRadius = new Float32Array(MAX_BLOBS);
    this.blobType = new Uint8Array(MAX_BLOBS);
    this.blobCreature = new Int32Array(MAX_BLOBS);
    this.blobAlive = new Uint8Array(MAX_BLOBS);
    this.blobMass = new Float32Array(MAX_BLOBS);
    this.blobSize = new Float32Array(MAX_BLOBS);
    this.blobFreeList = new Int32Array(MAX_BLOBS);
    for (let i = MAX_BLOBS - 1; i >= 0; i--) this.blobFreeList[MAX_BLOBS - 1 - i] = i;
    this.blobFreeCount = MAX_BLOBS;

    // Creatures
    this.creatureAlive = new Uint8Array(MAX_CREATURES);
    this.creatureEnergy = new Float32Array(MAX_CREATURES);
    this.creatureMaxEnergy = new Float32Array(MAX_CREATURES);
    this.creatureBlobStart = new Int32Array(MAX_CREATURES);
    this.creatureBlobCount = new Uint8Array(MAX_CREATURES);
    this.creatureBlobs = new Int32Array(MAX_CREATURES * 12); // max 12 blobs per creature
    this.creatureHeading = new Float32Array(MAX_CREATURES);
    this.creatureAge = new Int32Array(MAX_CREATURES);
    this.creatureReproCooldown = new Int32Array(MAX_CREATURES);
    this.creatureMateTimer = new Int32Array(MAX_CREATURES);
    this.creatureClanId = new Int32Array(MAX_CREATURES).fill(-1);
    this.creatureClanBornTick = new Int32Array(MAX_CREATURES);
    this.creaturePackId = new Int32Array(MAX_CREATURES).fill(-1);
    this.creatureGenome = new Array(MAX_CREATURES).fill(null);
    this.creatureLastAttacker = new Int32Array(MAX_CREATURES).fill(-1);
    // Constraints: max ~(12*12) per creature * MAX_CREATURES, but most have few
    const maxConstraints = MAX_CREATURES * 30;
    this.constraintA = new Int32Array(maxConstraints);
    this.constraintB = new Int32Array(maxConstraints);
    this.constraintDist = new Float32Array(maxConstraints);
    this.creatureFreeList = new Int32Array(MAX_CREATURES);
    for (let i = MAX_CREATURES - 1; i >= 0; i--) this.creatureFreeList[MAX_CREATURES - 1 - i] = i;
    this.creatureFreeCount = MAX_CREATURES;

    // Latches
    this.latchWeaponBlob = new Int32Array(LATCH_MAX);
    this.latchTargetBlob = new Int32Array(LATCH_MAX);
    this.latchWeaponCreature = new Int32Array(LATCH_MAX);
    this.latchTargetCreature = new Int32Array(LATCH_MAX);
    this.latchTimer = new Int32Array(LATCH_MAX);

    // Food
    this.foodX = new Float32Array(MAX_FOOD);
    this.foodY = new Float32Array(MAX_FOOD);
    this.foodAlive = new Uint8Array(MAX_FOOD);
    this.foodFreeList = new Int32Array(MAX_FOOD);
    for (let i = MAX_FOOD - 1; i >= 0; i--) this.foodFreeList[MAX_FOOD - 1 - i] = i;
    this.foodFreeCount = MAX_FOOD;
  }

  // --- Blob allocation ---
  allocBlob(): number {
    if (this.blobFreeCount === 0) return -1;
    const idx = this.blobFreeList[--this.blobFreeCount];
    this.blobAlive[idx] = 1;
    this.blobCount++;
    return idx;
  }

  freeBlob(idx: number) {
    this.blobAlive[idx] = 0;
    this.blobCreature[idx] = -1;
    this.blobFreeList[this.blobFreeCount++] = idx;
    this.blobCount--;
  }

  // --- Creature allocation ---
  allocCreature(): number {
    if (this.creatureFreeCount === 0) return -1;
    const idx = this.creatureFreeList[--this.creatureFreeCount];
    this.creatureAlive[idx] = 1;
    this.creatureCount++;
    return idx;
  }

  freeCreature(idx: number) {
    // Free all blobs belonging to this creature
    const start = this.creatureBlobStart[idx];
    const count = this.creatureBlobCount[idx];
    for (let i = 0; i < count; i++) {
      const blobIdx = this.creatureBlobs[start + i];
      if (blobIdx >= 0) this.freeBlob(blobIdx);
    }
    this.creatureAlive[idx] = 0;
    this.creatureGenome[idx] = null;
    this.creatureBlobCount[idx] = 0;
    this.creatureLastAttacker[idx] = -1;
    this.creatureMateTimer[idx] = 0;
    this.creatureClanId[idx] = -1;
    this.creatureClanBornTick[idx] = 0;
    this.creaturePackId[idx] = -1;
    this.creatureFreeList[this.creatureFreeCount++] = idx;
    this.creatureCount--;
    this.totalDeaths++;
  }

  allocClanId(): number {
    const id = this.nextClanId;
    this.nextClanId++;
    return id;
  }

  allocPackId(): number {
    const id = this.nextPackId;
    this.nextPackId++;
    return id;
  }

  // --- Food allocation ---
  allocFood(): number {
    if (this.foodFreeCount === 0) return -1;
    const idx = this.foodFreeList[--this.foodFreeCount];
    this.foodAlive[idx] = 1;
    this.foodCount++;
    return idx;
  }

  freeFood(idx: number) {
    this.foodAlive[idx] = 0;
    this.foodFreeList[this.foodFreeCount++] = idx;
    this.foodCount--;
  }
}
