import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

export function measure(fn, { runs = 5 } = {}) {
  assert.ok(Number.isInteger(runs) && runs >= 2, "Use pelo menos duas execuções.");
  const times = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    fn();
    if (i > 0) times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  const middle = Math.floor(times.length / 2);
  return times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2;
}

export function assertFast(fn, budgetMs, label) {
  const factor = Number(process.env.FLOCO_TIMING_FACTOR ?? 3);
  assert.ok(Number.isFinite(factor) && factor > 0, "FLOCO_TIMING_FACTOR deve ser positivo e finito.");
  const median = measure(fn);
  assert.ok(median < budgetMs * factor,
    `${label}: mediana ${median.toFixed(2)} ms, limite ${budgetMs * factor} ms (${budgetMs} × ${factor}).`);
  return median;
}
