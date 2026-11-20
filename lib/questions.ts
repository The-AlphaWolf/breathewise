import type { HouseholdContext } from "./rules.ts";
import type { BetterWindow } from "./window.ts";

export const QUESTIONS = [
  { id: "must-drive", text: "We must drive today. What is the most practical plan?" },
  { id: "outdoor-window", text: "Is there a better time for outdoor play?" },
  { id: "indoor-low-cost", text: "What low-cost indoor actions can we take today?" },
] as const;

export type QuestionId = (typeof QUESTIONS)[number]["id"];
export const questionById = (id: string) => QUESTIONS.find((q) => q.id === id);

/** Deterministic answers used when the model is unavailable or its output fails validation. */
export function fallbackAnswer(id: QuestionId, ctx: HouseholdContext, window: BetterWindow | null): string {
  switch (id) {
    case "must-drive":
      return "If driving is required, keep it to essential travel, combine errands that would otherwise be separate trips, and switch the engine off while waiting. Check official local alerts before leaving.";
    case "outdoor-window":
      return window === null
        ? "The forecast shows no clearly better outdoor window today. Keep flexible activity indoors or short unless official local information shows an improvement."
        : `The forecast suggests lower US AQI around ${window.start.slice(11)}–${window.end.slice(11)} (about ${window.gainPercent}% lower than now). It is a model forecast, so re-check official local data before moving flexible activity there.`;
    case "indoor-low-cost":
      return ctx.lowBudget
        ? "Prioritise free actions: skip incense and coils, damp-mop instead of dry sweeping, and keep one room free of smoke sources. Do not compromise safe cooking, ventilation or heat safety."
        : "Start with source control, then use a cleaner-air room or an existing purifier if it is safe for your home. Follow equipment instructions and local public-health guidance.";
  }
}
