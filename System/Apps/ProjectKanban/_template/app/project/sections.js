// sections.js — the read-only halves of the project page: purpose,
// definition of done, events, documents, people, decision log (FR-2).
// Next Actions is the only editable section and lives in actions.js — none
// of the six edits reach this file. A section with nothing to show (no
// purpose written, no documents listed) renders nothing rather than an
// empty heading; project.js filters the null results out.

import { el } from "../shared/dom.js";
import { buildCopyButton, eventCopyText, documentCopyText, personCopyText, sectionCopyText } from "./copy.js";

// At least 8 of Luke's live registries write an explicit "— | — | —"
// placeholder row instead of leaving an Events/Documents/People table empty
// (stores.py's own "—" convention — a blank cell reads as not-stated, so
// every field on a row like this comes back null). Rendered as-is that's a
// hollow row with an empty label and a copy button that copies nothing —
// worse than the section not existing. A row where every field the caller
// cares about is null/empty is filtered before it ever reaches the DOM.
function hasContent(fields) {
  return fields.some((value) => value !== null && value !== undefined && String(value).trim() !== "");
}

function sectionHeading(title, getSectionText) {
  const children = [el("h2", {}, title)];
  // FR-7: only sections whose rows are themselves copy targets (events,
  // documents, people) get a section-level copy — Purpose/Definition of
  // Done/Decision Log are plain prose lists with no per-row copy of their
  // own for a section copy to mirror.
  if (getSectionText) children.push(buildCopyButton(`Copy ${title}`, getSectionText));
  return el("div", { class: "project-section-heading" }, children);
}

export function buildPurposeSection(project) {
  if (!project.purpose) return null;
  return el("section", { class: "project-section" }, [sectionHeading("Purpose"), el("p", { class: "project-purpose" }, project.purpose)]);
}

export function buildDefinitionOfDoneSection(project) {
  const items = project.definition_of_done ?? [];
  if (!items.length) return null;
  return el("section", { class: "project-section" }, [
    sectionHeading("Definition of Done"),
    el("ul", { class: "project-list" }, items.map((text) => el("li", {}, text))),
  ]);
}

export function buildEventsSection(project) {
  const events = (project.events ?? []).filter((event) => hasContent([event.date, event.event, event.type, event.link]));
  if (!events.length) return null;
  return el("section", { class: "project-section" }, [
    sectionHeading("Events", () => sectionCopyText(events, eventCopyText)),
    el(
      "ul",
      { class: "project-list project-events" },
      events.map((event) =>
        el("li", { class: "project-row" }, [
          el("span", { class: "project-row-text" }, eventCopyText(event)),
          buildCopyButton(`Copy ${event.event ?? "event"}`, () => eventCopyText(event)),
        ])
      )
    ),
  ]);
}

/** FR-7/AC-10: the row shows only the basename (with the full path on
 * hover); the row's own copy and the section copy both still reach for
 * `doc.file` in full — see copy.js's documentCopyText, never this. */
function basename(fullPath) {
  const trimmed = (fullPath ?? "").replace(/\/+$/, "");
  const parts = trimmed.split("/");
  return parts[parts.length - 1] || fullPath || "";
}

export function buildDocumentsSection(project) {
  const documents = (project.documents ?? []).filter((doc) => hasContent([doc.file, doc.description, doc.status, doc.on_close]));
  if (!documents.length) return null;
  return el("section", { class: "project-section" }, [
    sectionHeading("Documents", () => sectionCopyText(documents, documentCopyText)),
    el(
      "ul",
      { class: "project-list project-documents" },
      documents.map((doc) =>
        el(
          "li",
          { class: "project-row" },
          [
            el("span", { class: "project-row-text project-row-text--accent", title: doc.file ?? "" }, basename(doc.file)),
            doc.description ? el("span", { class: "project-row-detail" }, doc.description) : null,
            buildCopyButton(`Copy ${basename(doc.file)}`, () => documentCopyText(doc)),
          ].filter(Boolean)
        )
      )
    ),
  ]);
}

export function buildPeopleSection(project) {
  const people = (project.people ?? []).filter((person) => hasContent([person.person, person.id, person.role, person.link]));
  if (!people.length) return null;
  return el("section", { class: "project-section" }, [
    sectionHeading("People", () => sectionCopyText(people, personCopyText)),
    el(
      "ul",
      { class: "project-list project-people" },
      people.map((person) =>
        el("li", { class: "project-row" }, [
          el("span", { class: "project-row-text project-row-text--accent" }, personCopyText(person)),
          buildCopyButton(`Copy ${person.person ?? "person"}`, () => personCopyText(person)),
        ])
      )
    ),
  ]);
}

// wishlist: "Hide/reveal Decision Log" — reuses the Next Actions section's
// done-toggle pattern (same button class, same aria-expanded/onclick shape,
// same closed-by-default rule) rather than inventing a second disclosure
// control for what is functionally the same kind of thing: a list that can
// grow long and isn't needed at a glance.
function buildDecisionLogToggle(entries, showDecisionLog, onToggle) {
  if (!entries.length) return null;
  return el(
    "button",
    { type: "button", class: "project-copy-btn", "aria-expanded": String(showDecisionLog), onclick: onToggle },
    showDecisionLog ? `Hide Decision Log (${entries.length})` : `Show Decision Log (${entries.length})`
  );
}

export function buildDecisionLogSection(project, showDecisionLog, onToggleDecisionLog) {
  // D-15/model.py: file order, append-only at the source — never re-sorted
  // here on an assumption about which end is newest.
  const entries = project.decision_log ?? [];
  if (!entries.length) return null;
  const heading = el("div", { class: "project-section-heading" }, [el("h2", {}, "Decision Log"), buildDecisionLogToggle(entries, showDecisionLog, onToggleDecisionLog)].filter(Boolean));
  const children = [heading];
  if (showDecisionLog) children.push(el("ul", { class: "project-list" }, entries.map((text) => el("li", {}, text))));
  return el("section", { class: "project-section" }, children);
}
