// B-7 unblock UI — DOM building. Pure functions: given data, return
// elements. No fetch, no write calls (those stay in unblock.js's event
// delegation, api.js and write-controls.js — API-1's "thin layer" spirit
// applied at the front end too). Every colour is a token from tokens.css
// (documentation spec: "colours live in exactly one file").

import { KIND_MINE, KIND_HANDOVER, markGuessed, daysUntil } from "./format.js";

function text(tag, className, value) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (value !== undefined) el.textContent = value;
  return el;
}

export function buildSkeleton() {
  const root = document.createElement("div");
  root.className = "unblock-panel";
  root.innerHTML = `
    <header class="unblock-header">
      <button type="button" class="unblock-back">&larr; Monitor</button>
      <h2>Unblock</h2>
    </header>
    <div class="unblock-capacity">
      <div class="worker-select" role="radiogroup" aria-label="Who has the capacity">
        <button type="button" class="worker-btn" data-worker="luke" aria-pressed="true">I have capacity</button>
        <button type="button" class="worker-btn" data-worker="agent" aria-pressed="false">An agent has capacity</button>
      </div>
      <div class="capacity-control" data-panel="luke">
        <label>Duration
          <select class="duration-select">
            <option value="10min">10 minutes</option>
            <option value="30min" selected>30 minutes</option>
            <option value="hour">an hour</option>
            <option value="session">a session</option>
          </select>
        </label>
        <label>Energy
          <select class="energy-select">
            <option value="normal" selected>normal</option>
            <option value="low">low</option>
          </select>
        </label>
        <p class="capacity-caveat">A stand-in, not a measure — this sets a working ceiling only.</p>
        <p class="capacity-figure guessed" hidden></p>
      </div>
      <div class="capacity-control" data-panel="agent" hidden>
        <label>Token budget
          <select class="token-select">
            <option value="little">little</option>
            <option value="some" selected>some</option>
            <option value="plenty">plenty</option>
          </select>
        </label>
      </div>
    </div>
    <p class="unblock-summary" aria-live="polite"></p>
    <ul class="candidate-list"></ul>
    <p class="unblock-error" role="alert" hidden></p>
  `;
  return root;
}

function outlineBadge(row) {
  if (row.source !== "project" || row.outline === "none") return null;
  return text("span", `candidate-outline candidate-outline-${row.outline}`, row.outline === "overdue" ? "overdue" : "due this week");
}

function metaLine(row) {
  const meta = document.createElement("div");
  meta.className = "candidate-meta";
  if (row.effort) {
    const el = text("span", "candidate-effort", row.effort);
    markGuessed(el, row.effortGuessed, "effort");
    meta.appendChild(el);
  }
  if (row.tokens) {
    const el = text("span", "candidate-tokens", row.tokens);
    markGuessed(el, row.tokensGuessed, "token cost");
    meta.appendChild(el);
  }
  if (row.due) {
    const days = daysUntil(row.due, new Date());
    const label = days === null ? row.due : days < 0 ? `${row.due} · ${-days}d overdue` : days === 0 ? `${row.due} · today` : `${row.due} · in ${days}d`;
    meta.appendChild(text("span", "candidate-due", label));
  }
  return meta;
}

/** `exempt` marks a row shown despite not fitting (the overdue escape
 * hatch, unblock.spec.md Risks table) — annotated, never silently mixed
 * in indistinguishably from a row that actually fit. */
export function buildCandidateRow(row, { exempt }) {
  const li = document.createElement("li");
  li.className = "candidate-row";
  li.dataset.rowId = row.id;

  const main = document.createElement("div");
  main.className = "candidate-main";
  main.appendChild(text("span", "candidate-title", row.title));
  if (row.source === "depot") main.appendChild(text("span", "candidate-depot-badge", "depot"));
  const badge = outlineBadge(row);
  if (badge) main.appendChild(badge);
  li.appendChild(main);

  li.appendChild(text("p", "candidate-action", row.action));
  li.appendChild(metaLine(row));

  if (exempt) {
    li.appendChild(
      text("p", "candidate-exempt-note", "Shown despite exceeding the stated capacity — it's overdue.")
    );
  }

  li.appendChild(buildControls(row));
  return li;
}

function button(label, action) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "candidate-control";
  b.dataset.action = action;
  b.textContent = label;
  return b;
}

function inlineForm(action, placeholder, submitLabel) {
  const form = document.createElement("form");
  form.className = "candidate-inline-form";
  form.dataset.action = action;
  form.hidden = true;
  const input = document.createElement("input");
  input.type = "text";
  input.name = "value";
  input.placeholder = placeholder;
  input.setAttribute("aria-label", placeholder);
  form.appendChild(input);
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = submitLabel;
  form.appendChild(submit);
  return form;
}

function buildControls(row) {
  const wrap = document.createElement("div");
  wrap.className = "candidate-controls";

  if (row.source === "depot") {
    wrap.appendChild(button("dispatch", "dispatch"));
    return wrap;
  }

  if (row.kind === KIND_MINE) wrap.appendChild(button("done", "done"));
  else if (row.kind === KIND_HANDOVER) wrap.appendChild(button("hand over", "hand-over-open"));

  wrap.appendChild(button("cycle state", "state"));
  wrap.appendChild(button("scrap", "scrap-open"));
  wrap.appendChild(button("ask an agent", "ask-agent"));

  wrap.appendChild(inlineForm("scrap-submit", "what happened", "add"));
  if (row.kind === KIND_HANDOVER) wrap.appendChild(inlineForm("hand-over-submit", "who's taking this", "hand over"));

  return wrap;
}

export function renderSummary(el, { shown, total, worker }) {
  el.textContent = `Showing ${shown} of ${total} — what actually fits ${worker === "agent" ? "an agent" : "you"}, ranked by leverage.`;
}

export function renderError(el, message) {
  if (!message) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = message;
}

export function renderCapacityFigure(el, result) {
  if (!result) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  // SR-9: the fitted/unfitted distinction is carried by the guessed treatment
  // below, not spelled out here — screen text serves Luke, not a maintainer.
  el.textContent = `capacity: ${result.capacity.toFixed(0)}`;
  markGuessed(el, !result.fitted, "an unfitted capacity figure");
}
