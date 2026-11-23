import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

const SPACING = /^(padding(-[a-z]+)?|margin(-[a-z]+)?|gap|row-gap|column-gap|min-height|height)$/;

/** px values (rem converted) of one declaration; null when it holds anything that is not a plain length. */
function lengths(value: string): number[] | null {
  const out: number[] = [];
  for (const token of value.trim().split(/\s+/)) {
    const m = /^(-?[\d.]+)(px|rem)?$/.exec(token);
    if (m === null) return null;
    out.push(m[2] === "rem" ? Number(m[1]) * 16 : Number(m[1]));
  }
  return out;
}

test("spacing values sit on the 4px grid (1px and 2px nudges allowed)", () => {
  const bad: string[] = [];
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].trim().split("\n").pop()?.trim() ?? "";
    for (const decl of rule[2].split(";")) {
      const [prop, ...rest] = decl.split(":");
      if (!SPACING.test(prop.trim())) continue;
      const values = lengths(rest.join(":"));
      if (values === null) continue;
      for (const v of values) if (Math.abs(v) % 4 !== 0 && Math.abs(v) !== 1 && Math.abs(v) !== 2) bad.push(`${selector} { ${prop.trim()}: ${rest.join(":").trim()} }`);
    }
  }
  assert.deepEqual([...new Set(bad)], [], "off-grid spacing");
});

test("every class selector in the stylesheet is used by a component", () => {
  const source = readdirSync(new URL("../components", import.meta.url))
    .map((f) => readFileSync(new URL(`../components/${f}`, import.meta.url), "utf8"))
    .join("\n");
  const dead = new Set<string>();
  for (const [, name] of css.matchAll(/\.([a-z][a-z0-9-]*)/g)) if (!source.includes(name)) dead.add(name);
  assert.deepEqual([...dead].sort(), [], "dead selectors");
});

test("the interface contains no emoji", () => {
  const files = readdirSync(new URL("../components", import.meta.url));
  for (const f of files) {
    const text = readFileSync(new URL(`../components/${f}`, import.meta.url), "utf8");
    assert.ok(!/\p{Extended_Pictographic}/u.test(text.replace(/[☀-➿]/g, "")), `emoji in ${f}`);
  }
});

test("headings and buttons carry no trailing period", () => {
  const bad: string[] = [];
  for (const f of readdirSync(new URL("../components", import.meta.url))) {
    const text = readFileSync(new URL(`../components/${f}`, import.meta.url), "utf8");
    for (const m of text.matchAll(/<(h[1-3]|button)\b[^>]*>\s*([^<{}]+?)\s*<\/\1>/g)) {
      if (m[2].trim().endsWith(".")) bad.push(`${f}: ${m[2].trim()}`);
    }
  }
  assert.deepEqual(bad, []);
});
