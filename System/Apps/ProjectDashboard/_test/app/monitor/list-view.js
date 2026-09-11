// The ☰ list view (FR-3): plain lists grouped by quadrant, every project named,
// carrying each project's next-action effort and its state.
//
// FR-3 orders the list 🔴 → 🟠 → 🔵 → 🟢 → ⚪ — the colour-board `state` from
// `Projects/_tracking.yaml`. `model`'s Board object does not currently expose
// that field (see this build's final report), so a project without one falls
// back to the `due` ordering `model` already supplies, and the state cell
// renders a plain dash rather than inventing a colour. The moment `model`
// starts returning `project.state`, `stateRank` below picks it up with no
// other change here.

import { el, clear, copyToClipboard } from "../shared/dom.js";
import { guessedField } from "../shared/format.js";

const STATE_RANK = { "🔴": 0, "🟠": 1, "🔵": 2, "🟢": 3, "⚪": 4 };

function stateRank(state) {
  if (!state) return 99; // unranked — sorts after every stated state, before nothing
  const glyph = [...state][0];
  return STATE_RANK[glyph] ?? 99;
}

function effortCell(project) {
  const task = project.next_action;
  if (!task) return el("span", { class: "muted" }, "—");
  const field = guessedField(task.effort.value, task.effort.guessed, "effort");
  return el("span", { class: field.guessed ? "guessed" : null, title: field.title }, field.text);
}

function projectRow(project, onOpenStack) {
  const title = project.title || "(untitled)";
  const outlineClass = project.outline !== "none" ? ` outline-${project.outline}` : "";
  return el("li", { class: `list-row${outlineClass}` }, [
    el("button", { class: "link-button list-row-id", type: "button", onClick: () => onOpenStack(project.id) }, project.id),
    el("span", { class: "list-row-title" }, title),
    el("span", { class: "list-row-state" }, project.state ?? "—"),
    effortCell(project),
    el(
      "button",
      { class: "icon-button", type: "button", title: "copy", onClick: () => copyToClipboard(`${project.id} — ${title}`) },
      "⧉"
    ),
  ]);
}

export function renderListView(container, board, { onOpenStack }) {
  clear(container);
  const byContext = new Map();
  for (const project of board.projects) {
    if (!byContext.has(project.context)) byContext.set(project.context, []);
    byContext.get(project.context).push(project);
  }

  const sections = [...byContext.entries()].map(([context, projects]) => {
    const dueOrder = board.orderings?.[context]?.due ?? [];
    const rank = new Map(dueOrder.map((id, i) => [id, i]));
    const ordered = [...projects].sort((a, b) => {
      const stateDiff = stateRank(a.state) - stateRank(b.state);
      if (stateDiff !== 0) return stateDiff;
      return (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999);
    });
    return el("section", { class: "list-section" }, [
      el("h2", {}, context),
      el("ul", { class: "list-rows" }, ordered.map((p) => projectRow(p, onOpenStack))),
    ]);
  });

  container.appendChild(el("div", { class: "list-view" }, sections));
}
