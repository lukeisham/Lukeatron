// card.js — one project card. Pure DOM
// construction from a ProjectView (the confirmed GET /api/board.json shape,
// documented in server.py's module docstring): every lane, due-text and
// count comes from the object handed in — this file derives nothing (the
// "zero client-side derivation" rule applies to cards as much as the grid).
//
// This file never imports an edit client — there is no code path here
// that could reach POST /api/edit.
//
// Both card densities are built from the SAME markup. board.css's
// card.css sibling hides everything but title+due when controls sets
// body[data-density="condensed"] — there is no separate condensed DOM to
// build, and no rebuild happens on that toggle.

import { el, svgEl, copyToClipboard } from "../shared/dom.js";
import { wash } from "../shared/flourish.js";

// How long the copy button keeps its "copied" look — the same window
// project/copy.js gives its own Copy button, so both routes feel alike.
const COPIED_MS = 1200;

// wishlist #9: the standard two-overlapping-documents "copy" icon, in place
// of the word "Copy" — the button's accessible name (aria-label, set where
// this is used below) already carries the text, so this is a visual swap
// only. The front square's fill matches the button's own background
// (--panel-bg-alt), "erasing" the part of the back square it sits over.
function buildCopyIcon() {
  return svgEl("svg", { class: "board-card-copy-icon", viewBox: "0 0 16 16", role: "img", "aria-hidden": "true" }, [
    svgEl("rect", { class: "board-card-copy-icon-back", x: "3", y: "3", width: "9", height: "9", rx: "1.5" }),
    svgEl("rect", { class: "board-card-copy-icon-front", x: "6", y: "6", width: "7", height: "7", rx: "1.3" }),
    // Hidden until a copy succeeds (flourish.css .is-copied): the two squares
    // give way to a tick, so the icon keeps its exact size.
    svgEl("path", { class: "board-card-copy-icon-check", d: "M3.5 8.5 L7 12 L13 4.5" }),
  ]);
}

function dueDisplayText(project) {
  if (project.due_text) return project.due_text;
  if (project.due_date) return project.due_date;
  return project.due_column?.value ?? "No date";
}

function defaultNavigate(id) {
  // The navigation scheme is a hash route, so opening a project
  // needs no server route of its own yet. `outline-print`/`project` (built
  // later) should listen for `hashchange` against `#project=<id>`.
  location.hash = `project=${encodeURIComponent(id)}`;
}

/**
 * Build one card. `navigate`/`copy` are injectable so tests can assert
 * the click behaviour without a real location bar or clipboard;
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

  // One tick timer per card, so a second copy restarts the same 1.2s window
  // rather than stacking (mirrors project/copy.js's own resetTimer).
  let copiedTimer = null;
  const copyButton = el(
    "button",
    {
      class: "board-card-copy",
      type: "button",
      "aria-label": `Copy ${displayTitle}`,
      title: "Copy",
      // The copy button never also opens the project — stopping
      // propagation here is what keeps the card's own click listener
      // (on the card, below) from firing for a click that started on this button.
      onclick: async (event) => {
        event.stopPropagation();
        // `copy` may be an injected stub that returns nothing; only an
        // explicit `false` (the clipboard refused) counts as a failure.
        const ok = (await copy(copyText)) !== false;
        if (!ok) return;
        copyButton.classList.add("is-copied");
        wash(card);
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => copyButton.classList.remove("is-copied"), COPIED_MS);
      },
    },
    buildCopyIcon()
  );

  const card = el(
    "article",
    {
      class: "board-card",
      // `context` is exposed here (not just `lane`, `projectId`) because
      // The six view buttons in controls filter the board by
      // context — that filter needs a per-card selector to act on, the same
      // way lane colouring needs `data-lane`.
      dataset: { projectId: project.id ?? "", lane: project.lane?.value ?? "", context: project.context ?? "" },
      tabindex: "0",
      role: "link",
      "aria-label": `${displayTitle} — open project`,
      // The card IS the project — clicking anywhere on it (except the
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
      el("p", { class: "board-card-next-action", dataset: { lane: project.next_action?.lane?.value ?? "" } }, nextActionText),
      el("dl", { class: "board-card-meta" }, [
        el("dt", {}, "ID"),
        el("dd", {}, project.id ?? "—"),
        el("dt", {}, "Owner"),
        el("dd", {}, owner),
      ]),
      copyButton,
    ].filter(Boolean)
  );

  return card;
}
