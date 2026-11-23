import { z } from "zod";
import { type Action, ACTIONS, type ContextFlag } from "./actions.ts";
import { effectiveLevel, type Level } from "./aqi.ts";
import type { BetterWindow } from "./window.ts";

export const contextSchema = z.object({
  extraCaution: z.boolean(),
  schoolRun: z.boolean(),
  hasTransit: z.boolean(),
  mustDrive: z.boolean(),
  biomassCooking: z.boolean(),
  lowBudget: z.boolean(),
  ownsPurifier: z.boolean(),
});
export type HouseholdContext = z.infer<typeof contextSchema>;

const CAUTIOUS_DEFAULT: Level = 2;
const EXPOSURE_FIRST_LEVEL = 3;
const COST_FIT: Record<Action["cost"], number> = { free: 3, low: 1, equipment: 0 };
const ROUTINE_FLAGS = ["mustDrive", "hasTransit", "ownsPurifier", "biomassCooking", "schoolRun"] as const;

export type Plan = { readonly top: readonly Action[]; readonly more: readonly Action[] };

function flagsOf(ctx: HouseholdContext, betterWindow: BetterWindow | null): Set<ContextFlag> {
  const flags = new Set<ContextFlag>();
  for (const flag of ROUTINE_FLAGS) if (ctx[flag]) flags.add(flag);
  if (betterWindow !== null) flags.add("betterWindow");
  return flags;
}

/**
 * Deterministic planner: filter by gates, rank, then take the top 3 with at
 * least one indoor and one emissions action. Pure, so it runs on both client
 * and server and the server can validate model output against it.
 */
export function planActions(ctx: HouseholdContext, level: Level | null, betterWindow: BetterWindow | null): Plan {
  const effective = effectiveLevel(level ?? CAUTIOUS_DEFAULT, ctx.extraCaution);
  const flags = flagsOf(ctx, betterWindow);

  const score = (action: Action): number => {
    let s = ctx.lowBudget ? COST_FIT[action.cost] : 0;
    if (action.when.requires?.some((f) => f !== "betterWindow")) s += 10;
    return s;
  };

  const ranked = ACTIONS
    .filter((a) =>
      effective >= (a.when.minLevel ?? 0) &&
      effective <= (a.when.maxLevel ?? 5) &&
      (a.when.requires ?? []).every((f) => flags.has(f)) &&
      !(a.when.excludes ?? []).some((f) => flags.has(f)))
    .map((a, index) => ({ a, index, s: score(a) }))
    .sort((x, y) => y.s - x.s || x.index - y.index)
    .map((x) => x.a);

  // At high levels one exposure action leads; the rest of the plan follows the household's routine.
  const lead = effective >= EXPOSURE_FIRST_LEVEL ? ranked.findIndex((a) => a.impact.exposure !== undefined) : -1;
  if (lead > 0) ranked.unshift(...ranked.splice(lead, 1));

  const picked = new Set<Action>();
  for (const needs of ["indoor", "emissions"] as const) {
    if (![...picked].some((a) => a.impact[needs] !== undefined)) {
      const first = ranked.find((a) => a.impact[needs] !== undefined);
      if (first !== undefined) picked.add(first);
    }
  }
  for (const a of ranked) if (picked.size < 3) picked.add(a);

  return {
    top: ranked.filter((a) => picked.has(a)),
    more: ranked.filter((a) => !picked.has(a)),
  };
}
