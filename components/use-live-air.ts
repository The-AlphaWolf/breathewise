"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AUTO_REFRESH_MS, type AirSnapshot, airSnapshotSchema, UNAVAILABLE_MESSAGE } from "../lib/air.ts";

const errorBody = z.object({ error: z.string() });

async function loadLive(url: string, signal: AbortSignal): Promise<AirSnapshot> {
  const response = await fetch(url, { signal });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorBody.safeParse(payload).data?.error ?? UNAVAILABLE_MESSAGE);
  const parsed = airSnapshotSchema.safeParse(payload);
  if (!parsed.success) throw new Error("The air-quality response was not in the expected format.");
  return parsed.data;
}

/**
 * Live air data for one endpoint `url`: fetches, auto-refreshes while the tab is visible, and keeps the
 * previous snapshot on screen during a refresh. `snapshot` is null until data for this exact `url` arrives.
 */
export function useLiveAir(enabled: boolean, url: string) {
  const [live, setLive] = useState<{ readonly url: string; readonly snapshot: AirSnapshot } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const lastFetched = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    loadLive(url, controller.signal)
      .then((snapshot) => {
        lastFetched.current = Date.now();
        setLive({ url, snapshot });
        setNow(lastFetched.current);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : UNAVAILABLE_MESSAGE);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, url, reload]);

  // Tick once a minute so "N min ago" and the stale banner stay accurate.
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(tick);
  }, [enabled]);

  // Auto-refresh while the tab is visible, and catch up when a stale tab becomes visible again.
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => setReload((n) => n + 1);
    const timer = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, AUTO_REFRESH_MS);
    const onVisible = () => {
      const last = lastFetched.current;
      if (document.visibilityState === "visible" && last !== null && Date.now() - last > AUTO_REFRESH_MS) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  return {
    snapshot: live?.url === url ? live.snapshot : null,
    error,
    loading,
    now,
    refresh: () => setReload((n) => n + 1),
  };
}
