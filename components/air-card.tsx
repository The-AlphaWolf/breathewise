"use client";

import { AUTO_REFRESH_MS, type AirSnapshot, formatIst, isStale, minutesAgo, STALE_AFTER_MINUTES } from "../lib/air.ts";
import { usAqiCategory } from "../lib/aqi.ts";
import { type BetterWindow, windowRange } from "../lib/window.ts";

type Props = {
  readonly air: AirSnapshot | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly now: number | null;
  readonly betterWindow: BetterWindow | null;
  readonly onRefresh: () => void;
  readonly onUseDemo: () => void;
};

export function AirCard({ air, loading, error, now, betterWindow, onRefresh, onUseDemo }: Props) {
  const demo = air?.sourceType === "demo";
  const stale = air !== null && !demo && now !== null && isStale(air.sourceTimestamp, now);

  return (
    <article className="status-card" aria-labelledby="air-title">
      {air !== null ? (
        <div className={demo ? "demo-banner" : "model-banner"}>
          {demo ? "Demo data · not a live air-quality reading" : "Model forecast · not a nearby station reading"}
        </div>
      ) : null}
      <p className="eyebrow">2 · Air context</p>

      {loading && air === null ? <p role="status">Loading the modelled air-quality outlook…</p> : null}

      {error !== null ? (
        <div role="alert" className="model-error">
          <p>{error}</p>
          <p>
            {air !== null
              ? "Could not refresh. The last forecast is shown below; check its time before relying on it."
              : "Official local alerts remain the best source right now."}
          </p>
          <button className="model-button" type="button" onClick={onUseDemo}>Switch to demo data</button>
        </div>
      ) : null}

      {air !== null ? (
        <>
          {stale ? (
            <p className="stale-banner" role="status">
              This forecast is more than {STALE_AFTER_MINUTES / 60} hours old and may not reflect current air. Refresh before relying on it.
            </p>
          ) : null}
          <div className="status-heading">
            <div>
              <h2 id="air-title">{usAqiCategory(air.usAqi)}</h2>
              <p>
                {air.usAqi === null ? "US AQI unavailable" : `US AQI ${Math.round(air.usAqi)}`} ·{" "}
                {air.locationLabel}{stale ? " · latest value, may be outdated" : ""}
              </p>
            </div>
          </div>
          <p className="status-summary">
            PM2.5: {air.pm25 ?? "unavailable"} μg/m³ · PM10: {air.pm10 ?? "unavailable"} μg/m³
          </p>
          <dl className="source-list">
            <div><dt>Source type</dt><dd>{demo ? "Demo fixture" : "Area-level model forecast"}</dd></div>
            <div><dt>Source</dt><dd>{air.sourceName}</dd></div>
            <div><dt>Index</dt><dd>US AQI (not the Indian National AQI)</dd></div>
            <div><dt>Source time</dt><dd>{formatIst(air.sourceTimestamp)}</dd></div>
            {!demo && now !== null ? (
              <div>
                <dt>Freshness</dt>
                <dd>
                  Source time {Math.max(0, minutesAgo(air.sourceTimestamp, now))} min ago · fetched{" "}
                  {Math.max(0, Math.round((now - Date.parse(air.retrievedAt)) / 60_000))} min ago · auto-refreshes every {AUTO_REFRESH_MS / 60_000} min
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Better outdoor window</dt>
              <dd>
                {betterWindow === null
                  ? "No clearly better window in the next 12 hours."
                  : `${windowRange(betterWindow)} IST: about ${betterWindow.gainPercent}% lower US AQI than now (forecast).`}
              </dd>
            </div>
          </dl>
          <p className="caveat">{air.caveat}</p>
          {!demo ? (
            <button className="model-button" type="button" disabled={loading} onClick={onRefresh}>
              {loading ? "Refreshing…" : "Refresh forecast"}
            </button>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
