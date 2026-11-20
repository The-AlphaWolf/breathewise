import { z } from "zod";
import { aqiLevel } from "./aqi.ts";

export const airSnapshotSchema = z.object({
  mode: z.enum(["live", "demo"]),
  cityId: z.string(),
  locationLabel: z.string(),
  sourceName: z.string(),
  sourceType: z.enum(["model", "demo"]),
  indexSystem: z.literal("US AQI"),
  /** Local India time, no offset, e.g. 2026-11-20T08:00 */
  sourceTimestamp: z.string(),
  retrievedAt: z.string(),
  pm25: z.number().nullable(),
  pm10: z.number().nullable(),
  usAqi: z.number().nullable(),
  hourly: z.array(z.object({ time: z.string(), usAqi: z.number().nullable() })),
  caveat: z.string(),
});
export type AirSnapshot = z.infer<typeof airSnapshotSchema>;

export const STALE_AFTER_MINUTES = 180;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-20T08:00" → "20 Nov, 08:00 IST" (string formatting; no timezone maths). */
export function formatIst(timestamp: string): string {
  const [date, time] = timestamp.split("T");
  const [, month, day] = date.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]}, ${time.slice(0, 5)} IST`;
}

const sourceMs = (timestamp: string) => Date.parse(timestamp + ":00+05:30");

export function minutesAgo(sourceTimestamp: string, nowMs: number): number {
  return Math.round((nowMs - sourceMs(sourceTimestamp)) / 60_000);
}

export function isStale(sourceTimestamp: string, nowMs: number): boolean {
  return minutesAgo(sourceTimestamp, nowMs) > STALE_AFTER_MINUTES;
}

export const levelOf = (s: AirSnapshot) => aqiLevel(s.usAqi);
