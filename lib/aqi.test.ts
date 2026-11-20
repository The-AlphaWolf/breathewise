import assert from "node:assert/strict";
import { test } from "node:test";
import { aqiLevel, effectiveLevel, usAqiCategory } from "./aqi.ts";

test("US AQI level boundaries", () => {
  const cases: [number, number][] = [
    [0, 0], [50, 0], [51, 1], [100, 1], [101, 2], [150, 2],
    [151, 3], [200, 3], [201, 4], [300, 4], [301, 5], [500, 5],
  ];
  for (const [aqi, level] of cases) assert.equal(aqiLevel(aqi), level, `aqi ${aqi}`);
});

test("null AQI has no level and an Unavailable category", () => {
  assert.equal(aqiLevel(null), null);
  assert.equal(usAqiCategory(null), "Unavailable");
  assert.equal(usAqiCategory(51), "Moderate");
  assert.equal(usAqiCategory(301), "Hazardous");
});

test("extra caution raises effective level by one, capped at 5", () => {
  assert.equal(effectiveLevel(1, false), 1);
  assert.equal(effectiveLevel(1, true), 2);
  assert.equal(effectiveLevel(5, true), 5);
});
