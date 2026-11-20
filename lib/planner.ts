export type ScenarioId = "severe" | "moderate" | "improving";

export type AirScenario = {
  readonly id: ScenarioId;
  readonly label: string;
  readonly severity: "Severe" | "Moderate" | "Improving";
  readonly primaryPollutant: string;
  readonly updatedAt: string;
  readonly sourceLabel: string;
  readonly sourceType: "demo";
  readonly summary: string;
  readonly caveat: string;
};

export type HouseholdProfile = {
  readonly extraCaution: boolean;
  readonly hasTransit: boolean;
  readonly mustDrive: boolean;
  readonly lowCost: boolean;
};

export type Recommendation = {
  readonly id: string;
  readonly title: string;
  readonly action: string;
  readonly reason: string;
  readonly fallback: string;
  readonly impactLabel: "Exposure opportunity" | "Household emissions opportunity" | "Indoor source-control";
  readonly caveat: string;
};

export const scenarios: readonly AirScenario[] = [
  {
    id: "severe",
    label: "Severe smog morning",
    severity: "Severe",
    primaryPollutant: "PM2.5",
    updatedAt: "Demo scenario · 08:00 IST",
    sourceLabel: "Demo fixture — Delhi NCR severe-smog scenario",
    sourceType: "demo",
    summary: "A high-particle morning with limited flexibility for outdoor activities.",
    caveat: "Fixed data for demonstration. It is not a live CPCB station reading.",
  },
  {
    id: "moderate",
    label: "Moderate conditions",
    severity: "Moderate",
    primaryPollutant: "PM2.5",
    updatedAt: "Demo scenario · 12:30 IST",
    sourceLabel: "Demo fixture — city-level moderate scenario",
    sourceType: "demo",
    summary: "Conditions are less severe, but cautious choices still matter for sensitive households.",
    caveat: "Fixed data for demonstration. Check official local alerts before making health decisions.",
  },
  {
    id: "improving",
    label: "Improving afternoon",
    severity: "Improving",
    primaryPollutant: "PM2.5",
    updatedAt: "Demo scenario · 16:30 IST",
    sourceLabel: "Demo fixture — improving-afternoon scenario",
    sourceType: "demo",
    summary: "The displayed scenario suggests a potentially better window later in the day.",
    caveat: "Fixed data for demonstration. A forecast is not a guarantee of street-level conditions.",
  },
];

export const demoQuestions = [
  "We must drive today. What is the most practical plan?",
  "Is there a potentially better time for outdoor play?",
  "What low-cost indoor actions can we take today?",
] as const;

function getScenario(id: ScenarioId): AirScenario {
  const scenario = scenarios.find((item) => item.id === id);

  if (scenario === undefined) {
    throw new Error("Unknown demonstration scenario.");
  }

  return scenario;
}

export function createPlan(profile: HouseholdProfile, scenarioId: ScenarioId): readonly Recommendation[] {
  const scenario = getScenario(scenarioId);
  const cautionText = profile.extraCaution
    ? "Because extra caution is selected, keep plans especially conservative and follow official local guidance first."
    : "Adjust this plan if an official local alert gives more specific instructions.";

  const outdoorRecommendation: Recommendation =
    scenario.severity === "Severe"
      ? {
          id: "outdoor",
          title: "Keep high-exertion outdoor time short",
          action:
            "Avoid adding optional strenuous outdoor activity during this severe demo period; use indoor alternatives when practical.",
          reason:
            cautionText + " Reducing time and exertion during a high-particle period is a cautious exposure opportunity.",
          fallback:
            "If outdoor travel is unavoidable, keep the activity essential, take breaks, and follow the latest official local alert.",
          impactLabel: "Exposure opportunity",
          caveat:
            "This is general information, not medical advice. The demo fixture does not replace an official warning.",
        }
      : {
          id: "outdoor",
          title: "Use the potentially better time window",
          action:
            "If current official information agrees, schedule flexible outdoor activity for the displayed improving period rather than the earlier window.",
          reason:
            "Moving a flexible activity away from the highest displayed pollution period can reduce time spent in worse conditions.",
          fallback:
            "Keep the activity short or move it indoors if conditions change or local guidance is stricter.",
          impactLabel: "Exposure opportunity",
          caveat:
            "A city-level model or fixture cannot guarantee conditions on one street or route.",
        };

  const travelRecommendation: Recommendation = profile.mustDrive
    ? {
        id: "travel",
        title: "Make one essential driving plan",
        action:
          "Combine essential errands into the required drive and avoid creating an additional separate vehicle trip.",
        reason:
          "This is a household-emissions opportunity when combined errands replace a separate journey. It does not claim a personal-exposure benefit.",
        fallback:
          "If errands can wait, postpone the non-essential one and re-check current official conditions later.",
        impactLabel: "Household emissions opportunity",
        caveat:
          "Personal exposure can vary by route, traffic, ventilation, and duration.",
      }
    : profile.hasTransit
      ? {
          id: "travel",
          title: "Compare a shared or transit option",
          action:
            "For a separate trip, consider an existing transit or shared-trip option if it fits your schedule and local guidance.",
          reason:
            "Replacing a separate private-vehicle journey can reduce household transport emissions. It is not automatically a lower-exposure option.",
          fallback:
            "If the shared option is impractical, combine errands or choose a later, less busy time only when it remains safe.",
          impactLabel: "Household emissions opportunity",
          caveat:
            "BreatheWise does not perform route-level exposure modelling in this MVP.",
        }
      : {
          id: "travel",
          title: "Avoid adding an optional separate trip",
          action:
            "Keep today’s travel focused on essential activities and group errands where that is practical.",
          reason:
            "Avoiding an optional separate journey can lower household transport emissions without assuming a specific travel mode.",
          fallback:
            "Plan the non-essential task for another day if conditions, time, or safety do not support it.",
          impactLabel: "Household emissions opportunity",
          caveat:
            "This is a qualitative impact statement, not a numeric emissions estimate.",
        };

  const indoorRecommendation: Recommendation = profile.lowCost
    ? {
        id: "indoor",
        title: "Reduce avoidable indoor particle sources",
        action:
          "Choose lower-smoke cooking where practical, avoid incense or candles, and use damp cleaning instead of dry sweeping.",
        reason:
          "These low-cost steps can avoid adding particles indoors while outdoor particle pollution is elevated.",
        fallback:
          "Choose one room where the household spends time and keep particle-generating activities away from it when safe to do so.",
        impactLabel: "Indoor source-control",
        caveat:
          "Do not compromise safe cooking, cooling, ventilation, emergency exits, or appliance instructions.",
        }
    : {
        id: "indoor",
        title: "Create a lower-particle indoor routine",
        action:
          "If compatible with your home and local guidance, use a room where the household spends time, limit indoor smoke sources, and maintain approved filtration equipment.",
        reason:
          "Reducing indoor sources and using compatible filtration can support a lower-particle space during poor outdoor conditions.",
        fallback:
          "Start with the free source-control actions if equipment is unavailable.",
        impactLabel: "Indoor source-control",
        caveat:
          "Follow manufacturer instructions and do not reduce required building ventilation or heat safety.",
        };

  return [outdoorRecommendation, travelRecommendation, indoorRecommendation];
}

export function answerPreview(
  question: string,
  profile: HouseholdProfile,
  scenarioId: ScenarioId,
): string {
  const scenario = getScenario(scenarioId);

  if (question.startsWith("We must drive")) {
    return "If driving is required, keep it to essential travel, combine errands that would otherwise be separate trips, and avoid claiming that driving is safer or less safe without route-specific evidence. Check official local alerts before leaving.";
  }

  if (question.startsWith("Is there")) {
    return scenario.severity === "Improving"
      ? "This demo shows an improving later window, so it may be worth re-checking official local data before moving flexible outdoor activity there. It is not a guarantee of street-level conditions."
      : "This scenario does not show a clearly better outdoor window. Keep flexible activity indoors or short unless official local information indicates an improvement.";
  }

  return profile.lowCost
    ? "Prioritize free actions: avoid indoor smoke sources when practical, damp-clean instead of dry-sweeping, and keep the household’s main room away from particle-generating activities. Do not compromise safe cooking, ventilation, or heat safety."
    : "Start with source control, then use compatible existing filtration or a cleaner-air room only when it is safe for your home. Follow equipment instructions and local public-health guidance.";
}
