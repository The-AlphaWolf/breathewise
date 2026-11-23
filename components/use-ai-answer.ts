"use client";

import { useRef, useState } from "react";
import { z } from "zod";
import { type AiOutput, aiOutputSchema } from "../lib/ai.ts";

const AI_TIMEOUT_MS = 15_000;

const replySchema = z.object({ ai: aiOutputSchema.optional(), error: z.string().optional() });

export type AiState =
  | { readonly key: string; readonly status: "loading" }
  | { readonly key: string; readonly status: "ok"; readonly ai: AiOutput }
  | { readonly key: string; readonly status: "unavailable"; readonly message: string };

/**
 * One AI answer at a time. An answer belongs to the `key` it was requested for (source, data time,
 * household, question), so `current` is null as soon as any of those change.
 */
export function useAiAnswer(currentKey: string) {
  const [state, setState] = useState<AiState | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function ask(body: unknown) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const key = currentKey;
    setState({ key, status: "loading" });

    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      const reply = replySchema.safeParse(await response.json().catch(() => null)).data;
      if (!response.ok || reply?.ai === undefined) throw new Error(reply?.error ?? "AI explanation is unavailable.");
      setState({ key, status: "ok", ai: reply.ai });
    } catch (error) {
      if (abort.current !== controller) return;
      const reason = error instanceof Error && !controller.signal.aborted ? error.message : "AI explanation timed out.";
      setState({ key, status: "unavailable", message: `${reason} Showing the rules-based plan instead.` });
    } finally {
      clearTimeout(timer);
    }
  }

  return { current: state?.key === currentKey ? state : null, ask };
}
