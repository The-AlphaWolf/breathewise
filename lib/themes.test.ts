import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isTheme, THEMES } from "./themes.ts";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function tokens(id: string): Record<string, string> {
  const block = new RegExp(String.raw`\[data-theme="${id}"\]\s*\{([^}]*)\}`).exec(css);
  assert.ok(block, `theme block for ${id}`);
  return Object.fromEntries([...block[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground token, background token, minimum ratio]: 4.5 for text, 3 for focus rings and UI edges.
const PAIRS: [string, string, number][] = [
  ["ink", "paper", 4.5], ["ink", "surface", 4.5], ["ink", "field", 4.5], ["ink", "blue-soft", 4.5],
  ["muted", "paper", 4.5], ["muted", "surface", 4.5],
  ["body", "surface", 4.5], ["body", "answer-bg", 4.5],
  ["blue", "surface", 4.5], ["blue", "blue-soft", 4.5],
  ["on-accent", "blue", 4.5], ["on-ink", "ink", 4.5],
  ["warn-fg", "warn-bg", 4.5], ["ok-fg", "ok-bg", 4.5],
  ["danger", "surface", 4.5],
  ["hero-fg", "hero-a", 4.5], ["hero-fg", "hero-b", 4.5],
  ["hero-muted", "hero-a", 4.5], ["hero-muted", "hero-b", 4.5],
  ["focus", "paper", 3], ["focus", "surface", 3],
];

test("every theme defines the same token set as the default theme", () => {
  const base = Object.keys(tokens("sky")).sort();
  for (const { id } of THEMES) assert.deepEqual(Object.keys(tokens(id)).sort(), base, id);
});

for (const { id } of THEMES) {
  test(`theme ${id} meets contrast targets`, () => {
    const t = tokens(id);
    for (const [fg, bg, min] of PAIRS) {
      const ratio = contrast(t[fg], t[bg]);
      assert.ok(ratio >= min, `${id}: ${fg} on ${bg} is ${ratio.toFixed(2)}, needs ${min}`);
    }
  });
}

test("theme ids are unique and validated", () => {
  assert.equal(new Set(THEMES.map((t) => t.id)).size, THEMES.length);
  assert.ok(isTheme("midnight"));
  assert.ok(!isTheme("neon") && !isTheme(null));
});
