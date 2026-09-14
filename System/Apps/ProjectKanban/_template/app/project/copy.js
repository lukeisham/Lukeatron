// copy.js — FR-6/FR-7/AC-2/AC-10: every copy target carries the FULL text a
// row's source data carries, never the shortened or grouped text the row
// happens to display. Wraps shared/dom.js's copyToClipboard (the same call
// card.js already uses) so every builder below, and their section-level
// counterparts, funnel through the one clipboard call in the app.

import { el, copyToClipboard } from "../shared/dom.js";

export { copyToClipboard };

/** FR-6: a chip's copy is always the stem-and-all action text — grouping.js
 * never rewrites `.action`, so this is simply the field itself. */
export function taskCopyText(task) {
  return task.action ?? "";
}

export function eventCopyText(event) {
  const when = event.date || "No date";
  const type = event.type ? ` (${event.type})` : "";
  return `${when} — ${event.event ?? ""}${type}`;
}

/** AC-10: always the full path. A row may show a shortened filename, but
 * this is never built from what the row displays — only from `doc.file`. */
export function documentCopyText(doc) {
  return doc.file ?? "";
}

export function personCopyText(person) {
  const role = person.role ? ` — ${person.role}` : "";
  return `${person.person ?? ""}${role}`;
}

/** FR-7: a section copy is dot points built from the SAME per-item copy
 * text as each row's own copy button — never re-derived from what the
 * section visually shows (AC-10's Documents case is the sharpest example). */
export function sectionCopyText(items, itemCopyText) {
  return items.map((item) => `• ${itemCopyText(item)}`).join("\n");
}

/**
 * A small "Copy" button wired to the clipboard, with a brief on-screen
 * confirmation (dom.js's own copyToClipboard already resolves true/false
 * for exactly this). Shared by sections.js and task-row.js (SR-4) rather
 * than each building its own.
 */
export function buildCopyButton(label, getText) {
  const button = el("button", { class: "project-copy-btn", type: "button", "aria-label": label }, "Copy");
  let resetTimer = null;
  button.addEventListener("click", async () => {
    const ok = await copyToClipboard(getText());
    button.textContent = ok ? "Copied" : "Copy failed";
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      button.textContent = "Copy";
    }, 1200);
  });
  return button;
}
