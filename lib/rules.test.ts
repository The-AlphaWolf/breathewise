import assert from "node:assert/strict";
import { test } from "node:test";
import type { Level } from "./aqi.ts";
import { type HouseholdContext, planActions } from "./rules.ts";
import type { BetterWindow } from "./window.ts";

const base: HouseholdContext = {
  extraCaution: false, schoolRun: false, hasTransit: false, mustDrive: false,
  biomassCooking: false, lowBudget: false, ownsPurifier: false,
};
const window: BetterWindow = { start: "2026-11-20T14:00", end: "2026-11-20T16:00", avgAqi: 120, gainPercent: 40 };
const ids = (r: ReturnType<typeof planActions>) => [...r.top, ...r.more].map((a) => a.id);
const LEVELS: Level[] = [0, 1, 2, 3, 4, 5];

function everyContext(): HouseholdContext[] {
  const keys = Object.keys(base) as (keyof HouseholdContext)[];
  return Array.from({ length: 1 << keys.length }, (_, mask) =>
    Object.fromEntries(keys.map((k, i) => [k, (mask & (1 << i)) !== 0])) as HouseholdContext);
}

test("extra caution raises the effective level for exposure rules", () => {
  assert.ok(!ids(planActions(base, 1, null)).includes("outdoor-indoor-alt"));
  assert.ok(ids(planActions({ ...base, extraCaution: true }, 1, null)).includes("outdoor-indoor-alt"));
});

test("no outdoor or window-airing action at effective level >= Unhealthy", () => {
  for (const level of [3, 4, 5] as Level[]) {
    const got = ids(planActions(base, level, window));
    assert.ok(!got.includes("outdoor-shift"), `outdoor-shift at ${level}`);
    assert.ok(!got.includes("ventilate-window"), `ventilate-window at ${level}`);
  }
  // Level 2 + extra caution is effective level 3.
  const cautious = ids(planActions({ ...base, extraCaution: true }, 2, window));
  assert.ok(!cautious.includes("outdoor-shift"));
});

test("outdoor-shift needs a real better window", () => {
  assert.ok(ids(planActions(base, 2, window)).includes("outdoor-shift"));
  assert.ok(!ids(planActions(base, 2, null)).includes("outdoor-shift"));
});

test("mustDrive excludes the transit swap; transit needs hasTransit", () => {
  assert.ok(!ids(planActions({ ...base, mustDrive: true, hasTransit: true }, 4, null)).includes("transit-swap"));
  assert.ok(ids(planActions({ ...base, hasTransit: true }, 4, null)).includes("transit-swap"));
  assert.ok(!ids(planActions(base, 4, null)).includes("transit-swap"));
});

test("purifier action only for owners; cleaner-room action only for non-owners", () => {
  assert.ok(ids(planActions({ ...base, ownsPurifier: true }, 4, null)).includes("purifier-run"));
  assert.ok(!ids(planActions({ ...base, ownsPurifier: true }, 4, null)).includes("clean-room"));
  assert.ok(!ids(planActions(base, 4, null)).includes("purifier-run"));
  assert.ok(ids(planActions(base, 4, null)).includes("clean-room"));
});

test("routine flags change the plan", () => {
  assert.ok(ids(planActions({ ...base, schoolRun: true }, 4, null)).includes("school-run-combine"));
  assert.ok(!ids(planActions(base, 4, null)).includes("school-run-combine"));
  assert.ok(planActions({ ...base, biomassCooking: true }, 4, null).top.some((a) => a.id === "cooking-clean"));
});

test("top 3 always include one indoor and one emissions action", () => {
  for (const ctx of everyContext()) {
    for (const level of LEVELS) {
      for (const w of [null, window]) {
        const { top } = planActions(ctx, level, w);
        const label = JSON.stringify({ ctx, level, w: w !== null });
        assert.equal(top.length, 3, label);
        assert.equal(new Set(top.map((a) => a.id)).size, 3, label);
        assert.ok(top.some((a) => a.impact.indoor !== undefined), "indoor " + label);
        assert.ok(top.some((a) => a.impact.emissions !== undefined), "emissions " + label);
      }
    }
  }
});

test("transit swap makes no exposure claim, so it never leads at high levels", () => {
  const top = planActions({ ...base, hasTransit: true }, 4, null).top;
  assert.equal(top[0].id === "transit-swap", false);
  assert.equal(top.find((a) => a.id === "transit-swap")?.impact.exposure, undefined);
});

test("a stated routine shows up in the top 3 even at severe levels", () => {
  const top = planActions({ ...base, extraCaution: true, schoolRun: true }, 4, null).top.map((a) => a.id);
  assert.ok(top.includes("school-run-combine"), top.join());
});

test("at high levels the first card is an exposure action", () => {
  assert.ok(planActions(base, 4, null).top[0].impact.exposure !== undefined);
});

test("low budget prefers free actions over low-cost ones; output is deterministic", () => {
  const ctx = { ...base, schoolRun: true, hasTransit: true };
  const relaxed = planActions(ctx, 1, null);
  const frugal = planActions({ ...ctx, lowBudget: true }, 1, null);
  assert.ok(relaxed.top.some((a) => a.id === "transit-swap"));
  assert.ok(frugal.top.some((a) => a.id === "carpool") && !frugal.top.some((a) => a.id === "transit-swap"));
  assert.deepEqual(ids(frugal), ids(planActions({ ...ctx, lowBudget: true }, 1, null)));
});

test("unavailable AQI falls back to cautious defaults", () => {
  assert.deepEqual(ids(planActions(base, null, null)), ids(planActions(base, 2, null)));
});
