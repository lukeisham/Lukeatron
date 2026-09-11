// The opened stack (FR-6, FR-6a, FR-6b, FR-6c) — the third altitude, and the
// project view. Breaks a stack into its slices, each led to its task's name,
// kind and effort by a dotted line; groups a shared stem into one heading
// (FR-6a, the CH-06 worked example); and carries the single door out to
// Unblock (FR-6c) — the only route to action anywhere in this module (FR-13).
//
// This module never imports the write client. "take this to Unblock" hands
// the project id to whichever module owns Unblock via a plain DOM event —
// `projectdashboard:open-unblock`, detail `{ projectId }`, dispatched on
// `document` (the contract unblock.js's own header comment documents) — a
// decoupled hand-off, not an import, so this file stays structurally
// incapable of writing anything (D-2's guarantee extended to the door itself).

import { el, svgEl, clear, copyToClipboard } from "../shared/dom.js";
import { groupByStem, guessedField, kindName, formatShortDate } from "../shared/format.js";
import { kindColour } from "./colour.js";
import { buildCubeDefs } from "./cube-defs.js";

const SLICE_CUBE_SIZE = 28;

function sliceIcon(kind) {
  const svg = svgEl("svg", { viewBox: "0 0 28 28", width: SLICE_CUBE_SIZE, height: SLICE_CUBE_SIZE, class: "slice-icon" });
  svg.appendChild(buildCubeDefs());
  svg.appendChild(svgEl("use", { href: "#cube", transform: "translate(14 16)", fill: kindColour(kind) }));
  return svg;
}

function taskLine(task, labelText, fullText) {
  const dueBadge = task.due
    ? el("span", { class: "slice-due" }, task.kind.value === 5 ? `arrives ${formatShortDate(task.due)}` : `due ${formatShortDate(task.due)}`)
    : null;
  const effortField = guessedField(task.effort.value, task.effort.guessed, "effort");
  const kindField = guessedField(kindName(task.kind.value), task.kind.guessed, "kind");
  // FR-6a/AC-6a: a grouped row's label is only the suffix, so the full stem+suffix
  // text goes on `title` — hover (and the copy target, via the browser's own
  // selection) still reaches it even though the row itself shows the short form.
  const labelAttrs = fullText && fullText !== labelText ? { class: "slice-label", title: fullText } : { class: "slice-label" };
  return el("div", { class: "slice-line" }, [
    sliceIcon(task.kind.value),
    svgEl("line", { class: "slice-leader", x1: 0, y1: 0, x2: 24, y2: 0 }), // dotted leader (CSS stroke-dasharray)
    el("div", { class: "slice-text" }, [
      el("span", labelAttrs, labelText),
      el("span", { class: kindField.guessed ? "guessed" : null, title: kindField.title }, ` · ${kindField.text}`),
      el("span", { class: effortField.guessed ? "guessed" : null, title: effortField.title }, ` · ${effortField.text}`),
      dueBadge,
    ]),
  ]);
}

function renderSlices(project) {
  // Decoded before grouping, not after: two titles differing only by a
  // double-escaped entity (server.py's bug — see this build's final report)
  // must not be treated as a spurious stem/suffix split.
  const items = project.tasks.map((t, i) => ({ id: t.index ?? String(i), text: t.action }));
  const byId = new Map(project.tasks.map((t, i) => [t.index ?? String(i), t]));
  const groups = groupByStem(items);

  return groups.map((group) => {
    if (group.type === "single") {
      return taskLine(byId.get(group.id), group.text);
    }
    // FR-6a: the stem becomes a heading; each row carries only what differs.
    return el("div", { class: "slice-group" }, [
      el("div", { class: "slice-stem" }, group.stem),
      el(
        "div",
        { class: "slice-group-rows" },
        group.entries.map((entry) => taskLine(byId.get(entry.id), entry.suffix || "(same)", entry.text))
      ),
    ]);
  });
}

function renderFootings(project) {
  // FR-6c: at most three, else "+N more in the registry". `model`'s Board
  // object does not currently carry a `footings` field (see this build's
  // final report) — rendered only when present, so the section simply does
  // not appear rather than showing an invented placeholder.
  if (!Array.isArray(project.footings) || project.footings.length === 0) return null;
  const shown = project.footings.slice(0, 3);
  const rest = project.footings.length - shown.length;
  return el("div", { class: "footings" }, [
    el("h3", {}, "Footings"),
    el("ul", {}, shown.map((f) => el("li", {}, f))),
    rest > 0 ? el("p", { class: "muted" }, `+${rest} more in the registry`) : null,
  ]);
}

function renderIncoming(project) {
  const incoming = project.tasks.filter((t) => t.kind.value === 5 && t.due);
  if (incoming.length === 0) return null;
  return el("div", { class: "incoming" }, [
    el("h3", {}, "Incoming"),
    el(
      "ul",
      {},
      incoming.map((t) => el("li", {}, `${t.action} — arrives ${formatShortDate(t.due)}`))
    ),
  ]);
}

/**
 * Renders the opened stack for `project` into `container`. `onBack` returns to
 * the quadrant altitude (FR-4's one-gesture pull-back).
 */
export function renderOpenedStack(container, project, { onBack }) {
  clear(container);

  const title = project.title || "(untitled)";
  // HTML-3: the page's one <h1> is monitor.js's own screen-reader-only
  // heading, present at every altitude — this stays an <h2> so the
  // hierarchy never skips a level.
  const heading = el("h2", { class: "opened-heading" }, `${project.id} — ${title}`); // FR-6b: never truncated

  const copyBtn = el(
    "button",
    { class: "icon-button", type: "button", onClick: () => copyToClipboard(`${project.id} — ${title}`) },
    "⧉ copy"
  );
  // FR-7: the registry path is a second copy target, beside the id+title one above.
  const copyPathBtn = project.path
    ? el(
        "button",
        { class: "icon-button", type: "button", title: project.path, onClick: () => copyToClipboard(project.path) },
        "⧉ copy path"
      )
    : null;
  const printBtn = el("button", { class: "icon-button", type: "button", onClick: () => window.print() }, "🖨 print");
  const unblockBtn = el(
    "button",
    {
      class: "primary-button",
      type: "button",
      onClick: () =>
        document.dispatchEvent(new CustomEvent("projectdashboard:open-unblock", { detail: { projectId: project.id } })),
    },
    "take this to Unblock"
  );

  const backBtn = el("button", { class: "link-button", type: "button", onClick: onBack }, "‹ back");

  const body = el("div", { class: "opened-stack" }, [
    el("div", { class: "opened-toolbar" }, [backBtn, copyBtn, copyPathBtn, printBtn, unblockBtn]),
    heading,
    project.is_mind_project ? el("p", { class: "muted" }, "A mind project — nothing open needs Luke yet.") : null,
    el("div", { class: "slices" }, renderSlices(project)),
    renderFootings(project),
    renderIncoming(project),
  ]);
  container.appendChild(body);
}
