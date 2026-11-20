import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateAvoidedKg, FACTORS_KG_PER_KM } from "./emissions.ts";

test("factors are visible constants", () => {
  assert.equal(FACTORS_KG_PER_KM.car, 0.12);
  assert.equal(FACTORS_KG_PER_KM.twoWheeler, 0.04);
});

test("per-trip and weekly estimate = km x trips x factor", () => {
  assert.deepEqual(estimateAvoidedKg(10, 3, "car"), { perTripKg: 1.2, weeklyKg: 3.6 });
  assert.deepEqual(estimateAvoidedKg(5, 2, "twoWheeler"), { perTripKg: 0.2, weeklyKg: 0.4 });
});

test("invalid or negative inputs give zero, not NaN", () => {
  assert.deepEqual(estimateAvoidedKg(Number.NaN, 3, "car"), { perTripKg: 0, weeklyKg: 0 });
  assert.deepEqual(estimateAvoidedKg(-5, 3, "car"), { perTripKg: 0, weeklyKg: 0 });
  assert.deepEqual(estimateAvoidedKg(10, -1, "car"), { perTripKg: 1.2, weeklyKg: 0 });
});

test("inputs are capped so absurd values stay bounded", () => {
  assert.equal(estimateAvoidedKg(1_000_000, 1, "car").perTripKg, 12);
});
