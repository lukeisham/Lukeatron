// B-7 unblock UI — shared display constants and small formatting helpers.
// the unblock spec, the documentation spec §5 (glossary).
//
// Nothing here derives a fact about a task (that is model.py's exclusive job,
// documentation spec D-1/D-7). The tables below only give a DISPLAY ORDER to
// values model.py already resolved and sent as-is — the three canonical
// effort/token strings are the app's own fixed vocabulary (glossary §5), not
// a guess this module is making.

import { KIND_MINE, KIND_HANDOVER } from "../shared/format.js";

// The glossary's three effort values, in the app's own canonical order.
export const EFFORT_ORDER = ["⚡ minutes", "🔨 an hour", "🏔️ a session"];
export const TOKENS_ORDER = ["little", "some", "plenty"];

// SR-4: the kind values themselves live only in shared/format.js — re-exported
// here so this module's own callers/tests don't need a second import path.
export { KIND_MINE, KIND_HANDOVER };

export const KIND_LABEL = { 3: "mine", 4: "hand-over" };

/** Rank for sorting/ceiling comparisons only. `null` for a value this
 * module does not recognise — callers must treat that as "unranked",
 * never as rank 0 (JS-2: no silent worst-case default). */
export function effortRank(value) {
  const i = EFFORT_ORDER.indexOf(value);
  return i === -1 ? null : i;
}

export function tokensRank(value) {
  const i = TOKENS_ORDER.indexOf(value);
  return i === -1 ? null : i;
}

/** model.py's own 1-based scale (`_EFFORT_WEIGHT`: minutes=1, hour=2,
 * session=3) — kept distinct from the 0-based `effortRank` above so the
 * assumed `/api/capacity` contract (api.js) speaks model's own units,
 * never this module's internal sort rank. */
export function effortWeight(value) {
  const rank = effortRank(value);
  return rank === null ? null : rank + 1;
}

// FR-5: the same five-value "temperature" vocabulary !ProjectSweep uses for
// a project's own state, applied here at action level (PRD: "Kind is the
// grammar of an action; State is its temperature"). Cycling order is this
// module's own choice — the spec names the control ("cycle State") but not
// an order — flagged here per SR-8 rather than left silently arbitrary.
export const STATE_CYCLE = ["⚪ undefined", "🔵 waiting", "🟢 on track", "🟠 your move", "🔴 urgent"];

export function nextState(current) {
  const i = STATE_CYCLE.indexOf(current);
  return STATE_CYCLE[(i + 1) % STATE_CYCLE.length];
}

/** Applies the one guessed-vs-stated treatment (STYLE.md "Guessed, not
 * stated"): a dashed underline plus a title naming what was guessed. Same
 * mark for a guessed effort, a guessed token cost, or an unfitted capacity
 * figure — never a distinct treatment per field (that would be a second
 * channel FR-0 does not allow without a clarity reason). */
export function markGuessed(el, guessed, what) {
  el.classList.toggle("guessed", Boolean(guessed));
  if (guessed) el.title = `guessed — ${what}, not stated in the file`;
  else el.removeAttribute("title");
}

export function daysUntil(isoDate, todayDate) {
  if (!isoDate) return null;
  const due = new Date(isoDate + "T00:00:00");
  const today = new Date(todayDate.toDateString());
  return Math.round((due - today) / 86400000);
}
