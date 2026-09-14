// note-box.js — FR-8/D-9: a note names its target section of notes.md,
// defaulting to Scraps & ideas. What "Agent guidance" does is stated
// permanently on the page next to the choice, not tucked into a tooltip —
// a line landing there steers every future agent working on this project,
// so choosing it has to be deliberate (documentation.spec.md's own line on
// the notes.md hand-off).

import { el } from "../shared/dom.js";

const SECTIONS = [
  { value: "scraps", label: "Scraps & ideas" },
  { value: "constraints", label: "Constraints" },
  { value: "reference", label: "Reference" },
  { value: "guidance", label: "Agent guidance" },
];

function buildSectionChoice() {
  const inputs = SECTIONS.map((section, i) =>
    el("input", {
      type: "radio",
      name: "project-note-section",
      value: section.value,
      checked: i === 0 ? "true" : null, // D-9: Scraps & ideas is the default
    })
  );
  const labels = SECTIONS.map((section, i) => el("label", { class: "project-note-section-option" }, [inputs[i], ` ${section.label}`]));
  return { container: el("div", { class: "project-note-sections" }, labels), inputs };
}

/**
 * `submitNote(section, text)` is injected by project.js, which owns the
 * network round-trip and the mtime. Returns `{ ok, message? }`.
 */
export function buildNoteBox(submitNote) {
  const textarea = el("textarea", { class: "project-note-text", spellcheck: "true", "aria-label": "Note text", rows: "3" }); // FR-9
  const { container: sectionChoice, inputs } = buildSectionChoice();
  const submit = el("button", { type: "button", class: "project-note-submit" }, "Add note");
  const status = el("p", { class: "project-note-status", role: "status" }, "");

  submit.addEventListener("click", async () => {
    const text = textarea.value.trim();
    if (!text) {
      status.textContent = "Write something before adding it.";
      return;
    }
    const chosen = inputs.find((input) => input.checked);
    const section = chosen?.getAttribute("value") ?? "scraps";

    submit.disabled = true;
    const { ok, message } = await submitNote(section, text);
    submit.disabled = false;
    status.textContent = ok ? "Added." : message;
    if (ok) textarea.value = "";
  });

  return el("section", { class: "project-section project-note-box" }, [
    el("h2", {}, "Add a note"),
    sectionChoice,
    el("p", { class: "project-note-guidance-hint" }, "Agent guidance steers every future agent working on this project — it becomes a standing instruction, not just a note."),
    textarea,
    submit,
    status,
  ]);
}
