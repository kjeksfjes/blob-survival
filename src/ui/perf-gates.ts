import {
  MAX_BLOBS,
  MAX_CREATURES,
  MAX_FOOD,
  PERF_BUDGET_SPEED_BASE,
  PERF_BUDGET_SPEED_TARGET,
  PERF_BUDGET_STEP_MS_AT_1X,
  PERF_BUDGET_STEP_MS_AT_10X,
  PERF_FOOD_OVERFLOW_FAIL_PER_SUBSTEP,
  PERF_FOOD_OVERFLOW_WARN_PER_SUBSTEP,
  PERF_GATE_FAIL_RATIO,
  PERF_GATE_WARN_RATIO,
} from '../constants';
import type { World } from '../simulation/world';

export type GateStatus = 'PASS' | 'WARN' | 'FAIL';

export interface BudgetGateResult {
  status: GateStatus;
  actualMs: number;
  budgetMs: number;
  ratio: number;
}

export interface OverflowGateResult {
  status: GateStatus;
  actualPerSubstep: number;
  warnPerSubstep: number;
  failPerSubstep: number;
}

export interface SoakChecklistResult {
  status: GateStatus;
  metricsFinite: boolean;
  entityBoundsValid: boolean;
  perfGate: BudgetGateResult;
  overflowGate: OverflowGateResult;
}

function clamp01(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function classifyRatio(ratio: number): GateStatus {
  if (ratio > PERF_GATE_FAIL_RATIO) return 'FAIL';
  if (ratio > PERF_GATE_WARN_RATIO) return 'WARN';
  return 'PASS';
}

export function getStepBudgetMs(speed: number): number {
  const safeSpeed = Math.max(PERF_BUDGET_SPEED_BASE, speed);
  if (safeSpeed <= PERF_BUDGET_SPEED_TARGET) {
    const t = clamp01((safeSpeed - PERF_BUDGET_SPEED_BASE) / (PERF_BUDGET_SPEED_TARGET - PERF_BUDGET_SPEED_BASE));
    return PERF_BUDGET_STEP_MS_AT_1X + (PERF_BUDGET_STEP_MS_AT_10X - PERF_BUDGET_STEP_MS_AT_1X) * t;
  }
  const targetMsPerSpeed = PERF_BUDGET_STEP_MS_AT_10X / PERF_BUDGET_SPEED_TARGET;
  return safeSpeed * targetMsPerSpeed;
}

export function evaluateStepBudgetGate(simStepMs: number, speed: number): BudgetGateResult {
  const budgetMs = getStepBudgetMs(speed);
  const safeActual = Number.isFinite(simStepMs) ? simStepMs : Number.POSITIVE_INFINITY;
  const ratio = safeActual / Math.max(0.0001, budgetMs);
  return {
    status: classifyRatio(ratio),
    actualMs: safeActual,
    budgetMs,
    ratio,
  };
}

export function evaluateOverflowGate(fallbacksPerSubstep: number): OverflowGateResult {
  let status: GateStatus = 'PASS';
  if (fallbacksPerSubstep > PERF_FOOD_OVERFLOW_FAIL_PER_SUBSTEP) status = 'FAIL';
  else if (fallbacksPerSubstep > PERF_FOOD_OVERFLOW_WARN_PER_SUBSTEP) status = 'WARN';
  return {
    status,
    actualPerSubstep: fallbacksPerSubstep,
    warnPerSubstep: PERF_FOOD_OVERFLOW_WARN_PER_SUBSTEP,
    failPerSubstep: PERF_FOOD_OVERFLOW_FAIL_PER_SUBSTEP,
  };
}

export function evaluateSoakChecklist(world: World, speed: number): SoakChecklistResult {
  const metricsFinite = Number.isFinite(world.simStepMs)
    && Number.isFinite(world.perfMsFood)
    && Number.isFinite(world.perfMsSensors)
    && Number.isFinite(world.perfMsFlocking)
    && Number.isFinite(world.perfMsPhysics)
    && Number.isFinite(world.perfMsCollision)
    && Number.isFinite(world.perfMsEcology)
    && Number.isFinite(world.perfMsRenderPack);
  const entityBoundsValid = world.blobCount >= 0 && world.blobCount <= MAX_BLOBS
    && world.creatureCount >= 0 && world.creatureCount <= MAX_CREATURES
    && world.foodCount >= 0 && world.foodCount <= MAX_FOOD;
  const perfGate = evaluateStepBudgetGate(world.simStepMs, speed);
  const overflowGate = evaluateOverflowGate(world.perfFoodOverflowFallbacks);

  let status: GateStatus = 'PASS';
  if (!metricsFinite || !entityBoundsValid || perfGate.status === 'FAIL' || overflowGate.status === 'FAIL') status = 'FAIL';
  else if (perfGate.status === 'WARN' || overflowGate.status === 'WARN') status = 'WARN';

  return {
    status,
    metricsFinite,
    entityBoundsValid,
    perfGate,
    overflowGate,
  };
}
