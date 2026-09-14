// card.js — one project card (board.spec.md FR-4..FR-7, FR-11). Pure DOM
// construction from a ProjectView (the confirmed GET /api/board.json shape,
// documented in server.py's module docstring): every lane, due-text and
// count comes from the object handed in — this file derives nothing (FR-1's
// "zero client-side derivation" applies to cards as much as the grid).
//
// FR-12: this file never imports an edit client — there is no code path here
// that could reach POST /api/edit.
//
// FR-4/D-11: both card densities are built from the SAME markup. board.css's
// card.css sibling hides everything but title+due when controls sets
// body[data-density="condensed"] — there is no separate condensed DOM to
// build, and no rebuild happens on that toggle.

import { el, svgEl, copyToClipboard } from "../shared/dom.js";

// wishlist #9: the standard two-overlapping-documents "copy" icon, in place
// of the word "Copy" — the button's accessible name (aria-label, set where
// this is used below) already carries the text, so this is a visual swap
// only. The front square's fill matches the button's own background
// (--panel-bg-alt), "erasing" the part of the back square it sits over.
function buildCopyIcon() {
  return svgEl("svg", { class: "board-card-copy-icon", viewBox: "0 0 16 16", role: "img", "aria-hidden": "true" }, [
    svgEl("rect", { class: "board-card-copy-icon-back", x: "3", y: "3", width: "9", height: "9", rx: "1.5" }),
    svgEl("rect", { class: "board-card-copy-icon-front", x: "6", y: "6", width: "7", height: "7", rx: "1.3" }),
  ]);
}

function dueDisplayText(project) {
  if (project.due_text) return project.due_text;
  if (project.due_date) return project.due_date;
  return project.due_column?.value ?? "No date";
}

function defaultNavigate(id) {
  // FR-11's chosen navigation scheme: a hash route, so opening a project
  // needs no server route of its own yet. `outline-print`/`project` (built
  // later) should listen for `hashchange` against `#project=<id>`.
  location.hash = `project=${encodeURIComponent(id)}`;
}

/**
 * Build one card. `navigate`/`copy` are injectable so tests can assert
 * FR-11's click behaviour without a real location bar or clipboard;
 * render.js (production) calls this with neither and gets the real ones.
 */
export function buildCard(project, { navigate = defaultNavigate, copy = copyToClipboard } = {}) {
  if (!project.id) {
    // A "shouldn't happen" state (JS-2): every ProjectView server.py sends
    // carries an id. Warn loudly rather than silently building a dead card.
    console.warn("card.js: a project has no id — its card cannot open the project view reliably", project);
  }

  const displayTitle = project.title || "(untitled project)";
  const copyText = project.title || project.id || "";
  const due = dueDisplayText(project);
  const nextActionText = project.next_action ? project.next_action.action : "No open action";
  const owner = project.next_action?.owner || "—";

  const card = el(
    "article",
    {
      class: "board-card",
      // `context` is exposed here (not just `lane`, `projectId`) because
      // controls.spec.md FR-1/FR-2's six view buttons filter the board by
      // context — that filter needs a per-card selector to act on, the same
      // way FR-3's lane colouring needs `data-lane`.
      dataset: { projectId: project.id ?? "", lane: project.lane?.value ?? "", context: project.context ?? "" },
      tabindex: "0",
      role: "link",
      "aria-label": `${displayTitle} — open project`,
      // AD-1: the card IS the project — clicking anywhere on it (except the
      // copy button below) opens the project view.
      onclick: () => navigate(project.id),
      onkeydown: (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault?.();
        navigate(project.id);
      },
    },
    [
      el("h3", { class: "board-card-title" }, displayTitle),
      el("p", { class: "board-card-due" }, due),
      el("p", { class: "board-card-next-action" }, nextActionText),
      el("dl", { class: "board-card-meta" }, [
        el("dt", {}, "ID"),
        el("dd", {}, project.id ?? "—"),
        el("dt", {}, "Owner"),
        el("dd", {}, owner),
      ]),
      el(
        "button",
        {
          class: "board-card-copy",
          type: "button",
          "aria-label": `Copy ${displayTitle}`,
          title: "Copy",
          // FR-11: the copy button never also opens the project — stopping
          // propagation here is what keeps the card's own click listener
          // (above) from firing for a click that started on this button.
          onclick: (event) => {
            event.stopPropagation();
            copy(copyText);
          },
        },
        buildCopyIcon()
      ),
    ].filter(Boolean)
  );

  return card;
}
