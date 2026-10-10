// copy.js — every copy target carries the FULL text a
// row's source data carries, never the shortened or grouped text the row
// happens to display. Wraps shared/dom.js's copyToClipboard (the same call
// card.js already uses) so every builder below, and their section-level
// counterparts, funnel through the one clipboard call in the app.

import { el, copyToClipboard } from "../shared/dom.js";
import { wash } from "../shared/flourish.js";

export { copyToClipboard };

/** A chip's copy is always the stem-and-all action text — grouping.js
 * never rewrites `.action`, so this is simply the field itself. */
export function taskCopyText(task) {
  return task.action ?? "";
}

export function eventCopyText(event) {
  const when = event.date || "No date";
  const type = event.type ? ` (${event.type})` : "";
  return `${when} — ${event.event ?? ""}${type}`;
}

/** Always the full path. A row may show a shortened filename, but
 * this is never built from what the row displays — only from `doc.file`. */
export function documentCopyText(doc) {
  return doc.file ?? "";
}

export function personCopyText(person) {
  const role = person.role ? ` — ${person.role}` : "";
  return `${person.person ?? ""}${role}`;
}

/** A section copy is dot points built from the SAME per-item copy
 * text as each row's own copy button — never re-derived from what the
 * section visually shows (the Documents case is the sharpest example). */
export function sectionCopyText(items, itemCopyText) {
  return items.map((item) => `• ${itemCopyText(item)}`).join("\n");
}

// Where a copy's wash lands. A row's own copy button washes its row; a
// section heading's copy washes the section's list (the heading and the list
// are siblings inside .project-section). `closest`/`querySelector` are real
// DOM only — a fake DOM without them simply gets no wash.
export const rowTarget = (button) => button.closest?.(".project-row") ?? null;
export const sectionListTarget = (button) => button.closest?.(".project-section")?.querySelector?.(".project-list") ?? null;

/**
 * A small "Copy" button wired to the clipboard, with a brief on-screen
 * confirmation (dom.js's own copyToClipboard already resolves true/false
 * for exactly this): the text swaps to "Copied", the button takes the
 * accent, and `washTarget(button)` — the thing that was copied — gets a soft
 * wash. A failed copy shows "Copy failed" and no wash. Shared by sections.js
 * and task-row.js (SR-4) rather than each building its own.
 */
export function buildCopyButton(label, getText, { washTarget = rowTarget } = {}) {
  const button = el("button", { class: "project-copy-btn", type: "button", "aria-label": label }, "Copy");
  let resetTimer = null;
  button.addEventListener("click", async () => {
    const ok = await copyToClipboard(getText());
    button.textContent = ok ? "Copied" : "Copy failed";
    if (ok) {
      button.classList.add("is-copied");
      wash(washTarget(button));
    } else {
      button.classList.remove("is-copied");
    }
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      button.textContent = "Copy";
      button.classList.remove("is-copied");
    }, 1200);
  });
  return button;
}
