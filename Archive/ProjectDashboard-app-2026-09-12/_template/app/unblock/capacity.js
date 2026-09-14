// B-7 unblock UI — worker-first capacity (the unblock spec FR-2,
// FR-2a, FR-2b) and the ceiling each worker's control produces for the fit
// test in candidates.js.
//
// AD-1 (this spec): capacity lives in the browser session only, never
// persisted — plain module-level state, no storage of any kind.

import { getCapacity, ApiError } from "./api.js";

export const WORKERS = { LUKE: "luke", AGENT: "agent" };

// FR-2a/OQ-3's own stated default: the token-budget control is *relative*,
// not absolute — little admits the cheapest tokens tier only, some admits
// two tiers, plenty admits all three. This table is unblock's own answer to
// its own open question (unblock.spec.md §5 OQ-3), not a duplicate of any
// arbitrary numeric constant model.py owns (AD-8) — nothing here assumes a
// token count, only an order over three fixed labels.
const AGENT_CEILING = { little: 0, some: 1, plenty: 2 };

// FR-2b: duration + energy is "the acknowledged placeholder" — the UI says
// so in one line, and this mapping is this module's own provisional
// heuristic (unblock.spec.md OQ-1 states the bucket labels, not a fit
// formula) turning four duration buckets into a ceiling over the three
// effort levels. Flagged here rather than left silently arbitrary (SR-8),
// same as model.py flags its own heuristics in-line.
const LUKE_DURATION_CEILING = { "10min": 0, "30min": 0, hour: 1, session: 2 };

export function agentCeiling(tokenBudgetValue) {
  return AGENT_CEILING[tokenBudgetValue] ?? 0;
}

export function lukeCeiling(duration, energy) {
  const base = LUKE_DURATION_CEILING[duration] ?? 0;
  return energy === "low" ? Math.max(0, base - 1) : base;
}

export function createCapacityState() {
  return {
    worker: WORKERS.LUKE,
    tokenBudget: "some",
    duration: "30min",
    energy: "normal",
  };
}

/** FR-2b/FR-19 (model.spec.md): the capacity *matrix* is a separate,
 * purely informational figure — it never gates the fit test itself (that
 * is `lukeCeiling` above, over duration+energy). Its only job is to render
 * with the guessed-not-stated treatment once it exists (FR-11, AC-1d).
 * Assumed route (api.js docstring) — a 404 renders as "not yet available",
 * never as an error, and never blocks the candidate list. */
export async function fetchLukesCapacityFigure({ nextActionEffortWeight, openCount }) {
  try {
    return await getCapacity({ nextActionEffortWeight, openCount });
  } catch (err) {
    if (err instanceof ApiError && (err.kind === "not_found" || err.kind === "network")) return null;
    throw err;
  }
}
