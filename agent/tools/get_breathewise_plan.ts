import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  answerPreview,
  createPlan,
  type HouseholdProfile,
  type ScenarioId,
} from "../../lib/planner";

const inputSchema = z.object({
  scenario: z.enum(["severe", "moderate", "improving"]),
  extraCaution: z.boolean(),
  hasTransit: z.boolean(),
  mustDrive: z.boolean(),
  lowCost: z.boolean(),
  question: z.string().min(1).max(300),
  dataContext: z.enum(["demo", "model"]),
});

export default defineTool({
  description:
    "Return BreatheWise-approved actions and a bounded explanation for a household follow-up. Always use this before replying to a BreatheWise question. Do not create advice outside the returned plan.",
  inputSchema,
  label: {
    start: () => "Checking the approved BreatheWise plan",
    complete: () => "Prepared a source-aware BreatheWise explanation",
  },
  async execute(input) {
    const profile: HouseholdProfile = {
      extraCaution: input.extraCaution,
      hasTransit: input.hasTransit,
      mustDrive: input.mustDrive,
      lowCost: input.lowCost,
    };
    const scenario: ScenarioId = input.scenario;

    return {
      dataContext: input.dataContext,
      responseRule:
        input.dataContext === "model"
          ? "This is a modelled area forecast, not a nearby station observation or official local alert."
          : "This is a fixed demo fixture, not a live air-quality reading or official local alert.",
      approvedPlan: createPlan(profile, scenario),
      boundedAnswer: answerPreview(input.question, profile, scenario),
    };
  },
});
