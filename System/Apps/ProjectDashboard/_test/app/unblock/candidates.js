// B-7 unblock UI — assembling, filtering and ranking the candidate list.
// the unblock spec FR-1, FR-3, FR-3a, FR-3b, FR-4, FR-11.
//
// This file reads values model.py already resolved (kind, effort, tokens,
// outline, each with its own `guessed` flag) and never re-derives one —
// that stays model's exclusive job (documentation spec D-1, D-7). What it
// does is the part the spec assigns to Unblock itself: pick which of an
// already-resolved project's open tasks is its one candidate action, decide
// whether a row fits a chosen worker's capacity, and order the result
// cheapest-first (FR-4). Ranking reads only effort/tokens — the numerator
// PRD 2.3 cut from the app has no field, variable or comment naming it
// anywhere below (unblock.spec.md AC-1f).

import { KIND_MINE, KIND_HANDOVER, effortRank, tokensRank } from "./format.js";

/** FR-1: a project's `tasks` array is already kind-ascending (model.py
 * FR-15), so the first entry whose kind is 3 or 4 is the project's one
 * addressable candidate — never its raw `next_action`, which can be a
 * kind 1/2/5 row that happens to sit first in the file (glossary: "next
 * action" is a per-project concept, not a demand-kind guarantee). */
function projectCandidateTask(project) {
  return project.tasks.find((t) => t.kind.value === KIND_MINE || t.kind.value === KIND_HANDOVER) ?? null;
}

function projectRow(project, task) {
  return {
    source: "project",
    id: `project:${project.id}:${task.index ?? task.action}`,
    projectId: project.id,
    title: project.title ?? project.id,
    context: project.context,
    action: task.action,
    kind: task.kind.value,
    kindGuessed: task.kind.guessed,
    row: task.index,
    effort: task.effort.value,
    effortGuessed: task.effort.guessed,
    tokens: task.tokens.value,
    tokensGuessed: task.tokens.guessed,
    due: task.due,
    outline: project.outline, // "overdue" | "this-week" | "none" — project-level (D-24), read as-is
    staleHandover: project.is_mind_project ? false : project.stale_handover,
    // Not yet on the board object (model.py/ProjectView carries no mtime
    // field today) — every write control below fails closed when this is
    // absent rather than sending a request guaranteed to fail validation.
    // See the build report: this is a stores -> model -> server gap, not
    // fixable inside this module's seam.
    mtime: typeof project.mtime === "number" ? project.mtime : null,
    // For the (assumed, optional) capacity-matrix figure only — FR-19's
    // "open count" input. Never used by the fit test itself.
    openCount: project.tasks.length,
  };
}

/** DepotJob carries no `effort` field (model.py: "queue.md carries no
 * Tokens column, so always derived" — and no Effort column at all). For
 * Luke's own duration-based ceiling test this reuses the job's own
 * `tokens` rank as the nearest available size signal — a documented stand-
 * in, flagged in the build report as a possible stores/model gap (depot
 * rows might eventually carry their own Effort), not invented silently. */
function depotRow(job) {
  return {
    source: "depot",
    id: `depot:${job.index ?? job.task}`,
    projectId: null,
    title: "Depot",
    context: null,
    action: job.task,
    kind: job.kind, // always 3 or 4, never guessed (model.py's own comment)
    kindGuessed: false,
    row: null,
    effort: null,
    effortGuessed: false,
    tokens: job.tokens.value,
    tokensGuessed: job.tokens.guessed,
    due: job.wake_due, // a wake/due date, never treated as an outline (D-28)
    outline: "none",
    staleHandover: false,
    mtime: null, // queue.md is never written by this app (writes.spec FR-7) — no write control needs this
  };
}

/** FR-1/AC-7: assembles every open kind-3/4 candidate across the whole
 * board — one row per project (its first open 3/4, kind-ascending) plus
 * one row per depot job. No kind 1, 2 or 5 ever reaches this list. */
export function buildCandidates(board) {
  const rows = [];
  for (const project of board.projects) {
    if (project.is_mind_project) continue; // model FR-6: mind projects excluded from Unblock
    const task = projectCandidateTask(project);
    if (task) rows.push(projectRow(project, task));
  }
  for (const job of board.depot) rows.push(depotRow(job));
  return rows;
}

/** FR-3: the agent worker only ever sees kind 4 (an agent can take it) —
 * "hides everything only Luke can do" (AC-2). Luke sees both. */
export function forWorker(rows, worker) {
  if (worker === "agent") return rows.filter((r) => r.kind === KIND_HANDOVER);
  return rows;
}

/** The row's own size rank on whichever scale its worker uses: tokens for
 * an agent (FR-3a), effort for Luke — falling back to tokens for a depot
 * row that carries no effort (see depotRow above). `null` means genuinely
 * unranked (never treated as "smallest"). */
function sizeRank(row, worker) {
  if (worker === "agent") return tokensRank(row.tokens);
  return row.effort !== null ? effortRank(row.effort) : tokensRank(row.tokens);
}

/** FR-3a/FR-3b: a row fits when its size rank is within the worker's
 * ceiling. The risk table's own escape hatch: a project row already
 * outlined `overdue` is always shown regardless of fit (annotated
 * separately by the caller), because a capacity filter hiding something
 * genuinely urgent is the one failure mode worse than an honestly full
 * list (unblock.spec.md Risks). Depot rows carry no outline (D-5) and get
 * no such exemption — they are discretionary by design. */
export function applyFit(rows, worker, ceilingRank) {
  const fitting = [];
  const exemptOverdue = [];
  const dropped = [];
  for (const row of rows) {
    const rank = sizeRank(row, worker);
    const fits = rank !== null && rank <= ceilingRank;
    if (fits) fitting.push(row);
    else if (row.source === "project" && row.outline === "overdue") exemptOverdue.push(row);
    else dropped.push(row);
  }
  return { fitting, exemptOverdue, dropped };
}

/** FR-4/AC-1e: cheapest first, always — urgency only breaks a tie between
 * two equally-sized rows, it never promotes an overdue row ahead of a
 * cheaper one. Mirrors model.py's own `_leverage_sort_key`, at action
 * rather than project granularity (model returns project-level orderings
 * only; this list's granularity is Unblock's own, per FR-1). */
export function sortCheapestFirst(rows, worker, todayIso) {
  const urgency = (row) => {
    if (!row.due) return Infinity;
    return row.due < todayIso ? -1 : row.due.localeCompare(todayIso);
  };
  return [...rows].sort((a, b) => {
    const ra = sizeRank(a, worker) ?? 99;
    const rb = sizeRank(b, worker) ?? 99;
    if (ra !== rb) return ra - rb;
    const ua = urgency(a);
    const ub = urgency(b);
    if (ua !== ub) return ua - ub;
    return a.id.localeCompare(b.id);
  });
}
