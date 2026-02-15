import { SPATIAL_CELL_SIZE, WORLD_SIZE, MAX_BLOBS } from '../constants';

const GRID_SIZE = Math.ceil(WORLD_SIZE / SPATIAL_CELL_SIZE);
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const MAX_PER_CELL = 32;
const MAX_FOOD_PER_CELL = 128;

/**
 * Grid-based spatial hash for O(n) broad-phase collision detection.
 * Rebuilt each frame (cheaper than incremental for moving objects).
 */
export class SpatialHash {
  // Each cell stores up to MAX_PER_CELL blob indices
  private readonly cells: Int32Array;
  private readonly cellCounts: Int32Array;
  // Separate index for food to avoid brute-force scanning MAX_FOOD per query
  private readonly foodCells: Int32Array;
  private readonly foodCellCounts: Int32Array;
  private readonly foodCellOverflow: Uint8Array;

  constructor() {
    this.cells = new Int32Array(TOTAL_CELLS * MAX_PER_CELL);
    this.cellCounts = new Int32Array(TOTAL_CELLS);
    this.foodCells = new Int32Array(TOTAL_CELLS * MAX_FOOD_PER_CELL);
    this.foodCellCounts = new Int32Array(TOTAL_CELLS);
    this.foodCellOverflow = new Uint8Array(TOTAL_CELLS);
  }

  clear() {
    this.cellCounts.fill(0);
  }

  clearFood() {
    this.foodCellCounts.fill(0);
    this.foodCellOverflow.fill(0);
  }

  private cellIndex(x: number, y: number): number {
    const cx = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(x / SPATIAL_CELL_SIZE)));
    const cy = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(y / SPATIAL_CELL_SIZE)));
    return cy * GRID_SIZE + cx;
  }

  insert(blobIdx: number, x: number, y: number) {
    const cell = this.cellIndex(x, y);
    const count = this.cellCounts[cell];
    if (count < MAX_PER_CELL) {
      this.cells[cell * MAX_PER_CELL + count] = blobIdx;
      this.cellCounts[cell] = count + 1;
    }
  }

  insertFood(foodIdx: number, x: number, y: number) {
    const cell = this.cellIndex(x, y);
    const count = this.foodCellCounts[cell];
    if (count < MAX_FOOD_PER_CELL) {
      this.foodCells[cell * MAX_FOOD_PER_CELL + count] = foodIdx;
      this.foodCellCounts[cell] = count + 1;
    } else {
      this.foodCellOverflow[cell] = 1;
    }
  }

  /**
   * Query all blob indices in cells overlapping the given AABB.
   * Calls callback for each found blob index.
   */
  query(
    x: number, y: number, radius: number,
    callback: (blobIdx: number) => void,
  ) {
    const minCx = Math.max(0, Math.floor((x - radius) / SPATIAL_CELL_SIZE));
    const maxCx = Math.min(GRID_SIZE - 1, Math.floor((x + radius) / SPATIAL_CELL_SIZE));
    const minCy = Math.max(0, Math.floor((y - radius) / SPATIAL_CELL_SIZE));
    const maxCy = Math.min(GRID_SIZE - 1, Math.floor((y + radius) / SPATIAL_CELL_SIZE));

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const cell = cy * GRID_SIZE + cx;
        const count = this.cellCounts[cell];
        const base = cell * MAX_PER_CELL;
        for (let i = 0; i < count; i++) {
          callback(this.cells[base + i]);
        }
      }
    }
  }

  /** Rebuild the entire hash from blob positions */
  rebuild(
    blobX: Float32Array,
    blobY: Float32Array,
    blobAlive: Uint8Array,
    maxIdx: number,
    activeBlobIds?: Int32Array,
    activeBlobCount?: number,
  ) {
    this.clear();
    if (activeBlobIds && typeof activeBlobCount === 'number') {
      for (let si = 0; si < activeBlobCount; si++) {
        const i = activeBlobIds[si];
        this.insert(i, blobX[i], blobY[i]);
      }
      return;
    }
    for (let i = 0; i < maxIdx; i++) {
      if (blobAlive[i]) {
        this.insert(i, blobX[i], blobY[i]);
      }
    }
  }

  /** Rebuild the food index from food positions */
  rebuildFood(
    foodX: Float32Array,
    foodY: Float32Array,
    foodAlive: Uint8Array,
    maxFood: number,
    activeFoodIds?: Int32Array,
    activeFoodCount?: number,
  ) {
    this.clearFood();
    if (activeFoodIds && typeof activeFoodCount === 'number') {
      for (let si = 0; si < activeFoodCount; si++) {
        const i = activeFoodIds[si];
        this.insertFood(i, foodX[i], foodY[i]);
      }
      return;
    }
    for (let i = 0; i < maxFood; i++) {
      if (foodAlive[i]) {
        this.insertFood(i, foodX[i], foodY[i]);
      }
    }
  }

  /** Query food indices near a position */
  queryFood(
    x: number, y: number, radius: number,
    foodX: Float32Array, foodY: Float32Array, foodAlive: Uint8Array,
    activeFoodIds: Int32Array | null,
    activeFoodCount: number,
    callback: (foodIdx: number) => void,
    onOverflowFallback?: () => void,
  ) {
    const minCx = Math.max(0, Math.floor((x - radius) / SPATIAL_CELL_SIZE));
    const maxCx = Math.min(GRID_SIZE - 1, Math.floor((x + radius) / SPATIAL_CELL_SIZE));
    const minCy = Math.max(0, Math.floor((y - radius) / SPATIAL_CELL_SIZE));
    const maxCy = Math.min(GRID_SIZE - 1, Math.floor((y + radius) / SPATIAL_CELL_SIZE));
    const r2 = radius * radius;

    // If any overlapped cell overflowed, fall back to full scan for correctness.
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const cell = cy * GRID_SIZE + cx;
        if (this.foodCellOverflow[cell]) {
          if (onOverflowFallback) onOverflowFallback();
          if (activeFoodIds && activeFoodCount > 0) {
            for (let si = 0; si < activeFoodCount; si++) {
              const fi = activeFoodIds[si];
              const dx = foodX[fi] - x;
              const dy = foodY[fi] - y;
              if (dx * dx + dy * dy < r2) callback(fi);
            }
          } else {
            for (let i = 0; i < foodAlive.length; i++) {
              if (!foodAlive[i]) continue;
              const dx = foodX[i] - x;
              const dy = foodY[i] - y;
              if (dx * dx + dy * dy < r2) callback(i);
            }
          }
          return;
        }
      }
    }

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const cell = cy * GRID_SIZE + cx;
        const count = this.foodCellCounts[cell];
        const base = cell * MAX_FOOD_PER_CELL;
        for (let i = 0; i < count; i++) {
          const fi = this.foodCells[base + i];
          if (!foodAlive[fi]) continue;
          const dx = foodX[fi] - x;
          const dy = foodY[fi] - y;
          if (dx * dx + dy * dy < r2) {
            callback(fi);
          }
        }
      }
    }
  }
}
