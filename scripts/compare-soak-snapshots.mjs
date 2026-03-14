#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function readJson(filePath) {
  const abs = path.resolve(filePath);
  const raw = fs.readFileSync(abs, 'utf8');
  return JSON.parse(raw);
}

function num(v, fallback = 0) {
  return Number.isFinite(v) ? v : fallback;
}

function pctDelta(current, baseline) {
  if (baseline <= 0) return current > 0 ? Infinity : 0;
  return ((current - baseline) / baseline) * 100;
}

function formatDeltaPct(delta) {
  if (!Number.isFinite(delta)) return '+inf%';
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

function verdictFromDelta(deltaPct, warnPct, failPct) {
  if (deltaPct >= failPct) return 'FAIL';
  if (deltaPct >= warnPct) return 'WARN';
  return 'PASS';
}

function usageAndExit() {
  console.error('Usage: npm run perf:compare-soak -- --baseline <path> --current <path>');
  process.exit(1);
}

const args = process.argv.slice(2);
let baselinePath = '';
let currentPath = '';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--baseline') baselinePath = args[i + 1] ?? '';
  if (args[i] === '--current') currentPath = args[i + 1] ?? '';
}
if (!baselinePath || !currentPath) usageAndExit();

const baseline = readJson(baselinePath);
const current = readJson(currentPath);

const perfKeys = ['step', 'food', 'sensors', 'flocking', 'physics', 'collision', 'ecology', 'pack'];
const lines = [];
let worst = 'PASS';

function updateWorst(verdict) {
  if (verdict === 'FAIL') worst = 'FAIL';
  else if (verdict === 'WARN' && worst !== 'FAIL') worst = 'WARN';
}

for (const key of perfKeys) {
  const b = num(baseline?.perfMs?.[key], 0);
  const c = num(current?.perfMs?.[key], 0);
  const delta = pctDelta(c, b);
  const verdict = verdictFromDelta(delta, 10, 20);
  updateWorst(verdict);
  lines.push(`${verdict.padEnd(4)} perfMs.${key.padEnd(9)} baseline=${b.toFixed(3)} current=${c.toFixed(3)} delta=${formatDeltaPct(delta)}`);
}

const bOverflow = num(baseline?.overflowFallbacksPerSubstep, 0);
const cOverflow = num(current?.overflowFallbacksPerSubstep, 0);
const overflowDelta = cOverflow - bOverflow;
let overflowVerdict = 'PASS';
if (overflowDelta >= 5) overflowVerdict = 'FAIL';
else if (overflowDelta >= 2) overflowVerdict = 'WARN';
updateWorst(overflowVerdict);
lines.push(
  `${overflowVerdict.padEnd(4)} overflowFallbacksPerSubstep baseline=${bOverflow.toFixed(1)} current=${cOverflow.toFixed(1)} delta=${overflowDelta >= 0 ? '+' : ''}${overflowDelta.toFixed(1)}`,
);

const bSpeed = num(baseline?.speed, 0);
const cSpeed = num(current?.speed, 0);
const speedNote = bSpeed === cSpeed ? `${bSpeed}x` : `${bSpeed}x -> ${cSpeed}x`;

console.log('Soak Snapshot Comparison');
console.log(`Baseline: ${path.resolve(baselinePath)}`);
console.log(`Current:  ${path.resolve(currentPath)}`);
console.log(`Speed:    ${speedNote}`);
console.log('');
for (const line of lines) console.log(line);
console.log('');
console.log(`Overall Regression Verdict: ${worst}`);
