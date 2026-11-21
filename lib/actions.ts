import type { Level } from "./aqi.ts";

export type ContextFlag =
  | "mustDrive" | "hasTransit" | "ownsPurifier" | "biomassCooking" | "schoolRun" | "betterWindow";

export type Action = {
  readonly id: string;
  readonly title: string;
  readonly do: string;
  readonly why: string;
  readonly fallback: string;
  readonly assumption: string;
  /** Impact is qualitative by design; exposure and emissions are never merged. */
  readonly impact: { readonly exposure?: string; readonly emissions?: string; readonly indoor?: string };
  /** Level gates apply to the effective level (after extra caution). */
  readonly when: {
    readonly minLevel?: Level;
    readonly maxLevel?: Level;
    readonly requires?: readonly ContextFlag[];
    readonly excludes?: readonly ContextFlag[];
  };
  readonly cost: "free" | "low" | "equipment";
  readonly scope: "household" | "community";
};

export const ACTIONS: readonly Action[] = [
  {
    id: "outdoor-shift",
    title: "Move flexible outdoor play to the better window",
    do: "If an outdoor activity is flexible, schedule it in the lower-AQI window shown above instead of now, and keep it light.",
    why: "The same activity spent in lower-particle air means less time breathing the worst of the day.",
    fallback: "If the window passes or conditions change, keep the activity short or move it indoors.",
    assumption: "Based on an area-level model forecast; street-level air can differ.",
    impact: { exposure: "May lower time spent in the worst air of the day." },
    when: { minLevel: 1, maxLevel: 2, requires: ["betterWindow"] },
    cost: "free", scope: "household",
  },
  {
    id: "outdoor-indoor-alt",
    title: "Swap strenuous outdoor activity for an indoor one",
    do: "Replace optional running, sports or long playground time with an indoor game, stretching or a walk in a large indoor space.",
    why: "Hard exercise raises how much air you breathe, so it adds more particles on a high-pollution day.",
    fallback: "If outdoor time is essential, keep it short and easy, and take breaks.",
    assumption: "Applies when air quality is unhealthy for sensitive groups or worse, including extra-caution households.",
    impact: { exposure: "Reduces exertion in polluted air, which can lower the amount of particles breathed in." },
    when: { minLevel: 2 },
    cost: "free", scope: "household",
  },
  {
    id: "school-run-combine",
    title: "Combine the school run with other trips",
    do: "Chain the school drop-off with your commute or errands into one trip instead of separate vehicle trips.",
    why: "One combined journey replaces several short, cold-start trips.",
    fallback: "If timings do not match, combine at least the pick-up with one errand.",
    assumption: "Assumes a private vehicle is already used for the school run.",
    impact: { emissions: "Fewer separate vehicle trips means lower household transport emissions." },
    when: { requires: ["schoolRun"] },
    cost: "free", scope: "household",
  },
  {
    id: "transit-swap",
    title: "Use metro, bus or a shared ride for one trip",
    do: "Replace one separate private-vehicle trip today with metro, bus or a shared ride.",
    why: "Sharing a vehicle or using mass transit spreads the same trip's emissions over more people.",
    fallback: "If the timing does not work, combine errands into one trip instead.",
    assumption: "Transit is not automatically lower exposure: platforms and busy roads can be polluted too.",
    impact: { emissions: "Lower household transport emissions for that trip. No exposure benefit is claimed." },
    when: { requires: ["hasTransit"], excludes: ["mustDrive"] },
    cost: "low", scope: "household",
  },
  {
    id: "carpool",
    title: "Share the school run with a neighbour",
    do: "Ask a neighbouring family to share the school run this week, taking turns.",
    why: "Two families in one vehicle halves the number of trips to the same gate.",
    fallback: "If it is last-minute, start with one shared day next week.",
    assumption: "Needs another family with a similar route and schedule.",
    impact: { emissions: "Fewer vehicles on the school route lowers shared emissions and gate congestion." },
    when: { requires: ["schoolRun"] },
    cost: "free", scope: "community",
  },
  {
    id: "no-idling",
    title: "Switch the engine off while waiting",
    do: "Turn the engine off at the school gate, at crossings and while parked.",
    why: "An idling engine adds exhaust without moving anyone anywhere.",
    fallback: "If the engine must stay on for safety or heat, keep waits as short as possible.",
    assumption: "Applies when you are driving today.",
    impact: {
      emissions: "Avoids exhaust emissions from standing vehicles.",
      exposure: "Can reduce exhaust where people queue or wait nearby.",
    },
    when: { requires: ["mustDrive"] },
    cost: "free", scope: "household",
  },
  {
    id: "wfh",
    title: "Work from home if your employer allows it",
    do: "On the worst days, ask to work from home or shift to flexible hours.",
    why: "It avoids a commute at peak traffic and peak pollution.",
    fallback: "If it is not possible, travel outside the heaviest traffic hours when that is safe.",
    assumption: "Depends on your job and employer policy.",
    impact: {
      emissions: "Removes a commute trip from the household's transport emissions.",
      exposure: "Avoids commute time outdoors and in traffic.",
    },
    when: { minLevel: 3, excludes: ["mustDrive"] },
    cost: "free", scope: "household",
  },
  {
    id: "no-burning",
    title: "Do not burn leaves, rubbish or crop waste",
    do: "Keep waste out of open fires, and report open burning in your area to the local authority.",
    why: "Open burning releases large amounts of fine particles right where people live.",
    fallback: "If waste piles up, separate it and arrange a municipal pick-up instead.",
    assumption: "Applies at any air quality level; it matters most in winter.",
    impact: { emissions: "Avoids a local source of particles and smoke across the neighbourhood." },
    when: {},
    cost: "free", scope: "community",
  },
  {
    id: "cooking-clean",
    title: "Cook with cleaner fuel and exhaust where you can",
    do: "Use LPG or electric for cooking if possible; with biomass or coal, cook in a ventilated spot with a lid on and the exhaust or window open.",
    why: "Smoke from solid-fuel cooking is a big source of indoor particles.",
    fallback: "If you cannot switch fuel, cook short, covered meals and keep children out of the kitchen.",
    assumption: "Never block ventilation or exits; follow appliance instructions.",
    impact: { indoor: "Lowers particles produced inside the home." },
    when: { requires: ["biomassCooking"] },
    cost: "low", scope: "household",
  },
  {
    id: "no-incense",
    title: "Skip incense, candles and mosquito coils today",
    do: "Leave out incense, candles, mosquito coils and indoor smoking today.",
    why: "They release smoke particles into the room you are trying to keep clean.",
    fallback: "If you need them, use a small amount in a well-ventilated room away from where people spend time.",
    assumption: "A source-control step, not a replacement for official guidance.",
    impact: { indoor: "Avoids adding particles indoors." },
    when: {},
    cost: "free", scope: "household",
  },
  {
    id: "damp-clean",
    title: "Damp-mop instead of dry sweeping",
    do: "Use a damp cloth or mop for floors and surfaces instead of dry sweeping or dusting.",
    why: "Dry sweeping lifts settled dust back into the air.",
    fallback: "If you must sweep, do it gently and wear a mask if you are sensitive to dust.",
    assumption: "A low-effort source-control step.",
    impact: { indoor: "Keeps settled dust from being stirred back into the air." },
    when: {},
    cost: "free", scope: "household",
  },
  {
    id: "clean-room",
    title: "Set up one cleaner-air room",
    do: "Pick one room, such as a bedroom, keep its door and windows shut at peak hours if it is safe, and keep smoke sources out of it.",
    why: "Concentrating effort on one room is easier than trying to clean the whole home.",
    fallback: "If you have no spare room, use the room where you spend most time.",
    assumption: "Never reduce required ventilation, cooling, heating or exit access.",
    impact: { indoor: "Helps keep one space lower in particles." },
    when: { minLevel: 2, excludes: ["ownsPurifier"] },
    cost: "free", scope: "household",
  },
  {
    id: "purifier-run",
    title: "Run your air purifier in the main room",
    do: "Run the purifier on a high setting in the room you use most, with the door closed.",
    why: "A purifier removes particles from the air in the room it sits in.",
    fallback: "If it is noisy at night, use a lower setting once the room has been cleaned.",
    assumption: "Check that the filter is clean and follow the manufacturer instructions.",
    impact: { indoor: "Can lower indoor particle levels in that room." },
    when: { minLevel: 1, requires: ["ownsPurifier"] },
    cost: "equipment", scope: "household",
  },
  {
    id: "ventilate-window",
    title: "Air the home briefly during the better window",
    do: "Open windows for a short time during the lower-AQI window, then close them again.",
    why: "Stale indoor air also needs refreshing, and the better window is the least bad time to do it.",
    fallback: "If the window has passed, skip it today.",
    assumption: "Based on an area-level forecast; not suitable when outdoor air is unhealthy.",
    impact: { indoor: "Refreshes indoor air at the lowest-pollution time of the day." },
    when: { maxLevel: 2, requires: ["betterWindow"] },
    cost: "free", scope: "household",
  },
];

export const actionById: ReadonlyMap<string, Action> = new Map(ACTIONS.map((a) => [a.id, a]));
