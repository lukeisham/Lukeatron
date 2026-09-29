// InboxNote in Home's Inbox slot: a rail of Markdown marks, the note, Copy and Save.
// Home's slots/inbox.js re-exports mount; nothing here persists — the note dies with the tab.
import { bold, italic, list, link } from "./marks.js";
import { saveNote } from "./api.js";

const LIMIT = 2000;
const COUNTER_FROM = 1600;
const SAVED_MS = 4000;
const COPIED_MS = 1500;
const STYLESHEET = "/widgets/InboxNote/inbox-note.css";
const MARKS = { bold, italic, list, link };
const SHORTCUT_MARKS = { b: "bold", i: "italic" };
const SAVE_ERRORS = {
  0: "Couldn't reach Home. Your note is still here.",
  401: "Signed out — sign in again, then save.",
  413: "Too long to save.",
};
const SAVE_ERROR_OTHER = "Couldn't save. Your note is still here.";

const glyph = (paths) => `<svg class="glyph-line" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const GLYPHS = {
  inbox: glyph('<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>'),
  list: glyph('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
  link: glyph('<path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1"/><path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1"/>'),
  copy: glyph('<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V4H4v12h4"/>'),
  save: glyph('<path d="M12 3v11M7 9l5 5 5-5"/><path d="M3 15v5h18v-5"/>'),
};

// Static markup only — no user text is ever interpolated here (JS-6).
const TEMPLATE = `
  <h2 class="slot-title" id="inbox-note-title">${GLYPHS.inbox}Inbox</h2>
  <div class="inbox-note-body">
    <div class="inbox-note-rail">
      <button type="button" class="inbox-note-mark" data-mark="bold" aria-label="Bold (⌘B)" title="Bold (⌘B)"><b>B</b></button>
      <button type="button" class="inbox-note-mark" data-mark="italic" aria-label="Italic (⌘I)" title="Italic (⌘I)"><i>I</i></button>
      <button type="button" class="inbox-note-mark" data-mark="list" aria-label="List" title="List">${GLYPHS.list}</button>
      <button type="button" class="inbox-note-mark" data-mark="link" aria-label="Link" title="Link">${GLYPHS.link}</button>
      <span class="inbox-note-count" data-count hidden></span>
    </div>
    <textarea class="inbox-note-text" maxlength="${LIMIT}" aria-labelledby="inbox-note-title"
              placeholder="Jot something down…" spellcheck="true"></textarea>
  </div>
  <div class="inbox-note-actions">
    <button type="button" class="inbox-note-icon" data-copy aria-label="Copy" title="Copy">${GLYPHS.copy}</button>
    <button type="button" class="inbox-note-icon inbox-note-save" data-save aria-label="Save to Inbox (⌘↵)" title="Save to Inbox (⌘↵)">${GLYPHS.save}</button>
  </div>
  <p class="inbox-note-status" role="status" aria-live="polite"></p>`;

function addStylesheetOnce() {
  if (document.querySelector(`link[href="${STYLESHEET}"]`)) return;
  const sheet = document.createElement("link");
  sheet.rel = "stylesheet";
  sheet.href = STYLESHEET;
  document.head.append(sheet);
}

export function mount(section) {
  if (!section) {
    console.warn("InboxNote: no [data-slot=inbox] section to mount into");
    return;
  }
  addStylesheetOnce();
  section.classList.remove("placeholder");
  section.classList.add("inbox-note");
  section.innerHTML = TEMPLATE;

  const note = section.querySelector("textarea");
  const counter = section.querySelector("[data-count]");
  const copyButton = section.querySelector("[data-copy]");
  const saveButton = section.querySelector("[data-save]");
  const status = section.querySelector(".inbox-note-status");
  let saving = false;
  let statusTimer = 0;

  function showStatus(text, { alert = false, forMs = 0 } = {}) {
    clearTimeout(statusTimer);
    status.textContent = text;
    status.classList.toggle("is-alert", alert);
    status.setAttribute("role", alert ? "alert" : "status");
    if (forMs) statusTimer = setTimeout(() => { status.textContent = ""; }, forMs);
  }

  function refresh() {
    const length = note.value.length;
    counter.hidden = length < COUNTER_FROM;
    counter.textContent = `${length.toLocaleString("en-AU")} / ${LIMIT.toLocaleString("en-AU")}`;
    counter.classList.toggle("is-full", length >= LIMIT);
    saveButton.disabled = saving || !note.value.trim();
    copyButton.disabled = !note.value;
  }

  function applyMark(name) {
    const { value, selectionStart, selectionEnd } = note;
    const edit = MARKS[name](value, selectionStart, selectionEnd);
    if (edit.text.length > LIMIT) return;
    // Replace only the changed span so the browser's undo stack keeps working.
    let head = 0;
    while (head < value.length && value[head] === edit.text[head]) head += 1;
    let tail = 0;
    while (tail < value.length - head && value[value.length - 1 - tail] === edit.text[edit.text.length - 1 - tail]) tail += 1;
    note.focus();
    note.setRangeText(edit.text.slice(head, edit.text.length - tail), head, value.length - tail);
    note.setSelectionRange(edit.start, edit.end);
    refresh();
  }

  async function save() {
    if (saveButton.disabled) return;
    saving = true;
    refresh();
    try {
      const { file } = await saveNote(note.value);
      note.value = "";
      showStatus(`Saved · ${file}`, { forMs: SAVED_MS });
    } catch (failure) {
      showStatus(SAVE_ERRORS[failure?.status] ?? SAVE_ERROR_OTHER, { alert: true });
    } finally {
      saving = false;
      refresh();
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(note.value);
      showStatus("Copied", { forMs: COPIED_MS });
    } catch {
      showStatus("Copy failed", { alert: true, forMs: COPIED_MS });
    }
  }

  section.addEventListener("click", (event) => {
    const markButton = event.target.closest("[data-mark]");
    if (markButton) applyMark(markButton.dataset.mark);
  });
  copyButton.addEventListener("click", copy);
  saveButton.addEventListener("click", save);
  note.addEventListener("input", refresh);
  note.addEventListener("keydown", (event) => {
    if (!event.metaKey) return;
    const mark = SHORTCUT_MARKS[event.key.toLowerCase()];
    if (mark) {
      event.preventDefault();
      applyMark(mark);
    } else if (event.key === "Enter") {
      event.preventDefault();
      save();
    }
  });
  refresh();
}
