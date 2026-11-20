/**
 * Illustrative tailpipe CO2 factors, rounded from fleet averages in India
 * (ICCT: ~41 g/km two-wheelers FY2018-19, ~121 g/km passenger cars FY2020-21).
 * CO2 only: no particulate matter, no life-cycle emissions, no occupancy or congestion effects.
 */
export const FACTORS_KG_PER_KM = { twoWheeler: 0.04, car: 0.12 } as const;
export type Vehicle = keyof typeof FACTORS_KG_PER_KM;

const MAX_KM = 100;
const MAX_TRIPS = 14;
const clamp = (v: number, max: number) => (Number.isFinite(v) ? Math.min(Math.max(v, 0), max) : 0);
const round2 = (v: number) => Math.round(v * 100) / 100;

export function estimateAvoidedKg(km: number, tripsPerWeek: number, vehicle: Vehicle) {
  const perTrip = clamp(km, MAX_KM) * FACTORS_KG_PER_KM[vehicle];
  return { perTripKg: round2(perTrip), weeklyKg: round2(perTrip * clamp(tripsPerWeek, MAX_TRIPS)) };
}
