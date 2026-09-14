// project.js — outline-print's entry point: routing (FR-1/AC-9), the
// full-page render, and the edit round-trip every control in this module
// eventually calls through submitEdit/submitNote/submitTagEdit below.
// board.js owns the opposite half of the same route split (see that file's
// own header comment on FR-1/AC-9) — this file only ever acts while the
// hash names a project, and always re-fetches on entry (D-15: a stale
// project view after an edit made elsewhere is a real risk; a fresh GET on
// every entry is the simpler-to-get-right default).

import { el, clear } from "../shared/dom.js";
import { fetchBoard } from "../shared/board-client.js";
import { postEdit } from "./edits.js";
import { buildPurposeSection, buildDefinitionOfDoneSection, buildEventsSection, buildDocumentsSection, buildPeopleSection, buildDecisionLogSection } from "./sections.js";
import { buildNextActionsSection } from "./actions.js";
import { buildNoteBox } from "./note-box.js";
import { printProject } from "./print.js";

// wishlist #4b: showDone is a per-page-visit UI toggle, not a stored
// preference (unlike controls.js's density/palette) — it resets to off on
// every fresh project visit, same as the toolbar's own view state does not
// carry over from board to project.
const state = { project: null, mtime: null, showDone: false };

function isProjectRoute() {
  return location.hash.startsWith("#project=");
}

function currentProjectId() {
  const match = location.hash.match(/^#project=(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function projectRoot() {
  return document.getElementById("project-root");
}

// FR-1/AC-9: the other direction of the route split — board.js's own
// header comment carries the authoritative description of both halves.
function setRoute(isProject) {
  if (isProject) document.body.dataset.route = "project";
  else delete document.body.dataset.route;
  const root = projectRoot();
  if (root) root.hidden = !isProject;
}

function navigateToBoard() {
  location.hash = "";
}

function showMessage(root, message) {
  clear(root);
  root.appendChild(
    el("div", { class: "project-error", role: "alert" }, [el("p", {}, message), el("button", { type: "button", onclick: navigateToBoard }, "Back to board")])
  );
}

function showEditError(message) {
  const banner = document.querySelector(".project-error-banner");
  if (!banner) return;
  banner.textContent = message;
  banner.hidden = false;
}

function clearEditError() {
  const banner = document.querySelector(".project-error-banner");
  if (banner) banner.hidden = true;
}

// FR-4's four per-row edits (tick, due, owner, lane) all funnel through
// here. A success re-fetches and re-renders the whole project rather than
// patching one field locally — model.py, not this module, is what knows
// how a new due date reshuffles due_column or a new kind reshuffles lane,
// so a refetch is the only way this page stays correct without duplicating
// that derivation client-side (D-2 holds: only model derives a fact).
async function submitEdit(field, task, value) {
  try {
    const result = await postEdit({ project_id: state.project.id, mtime: state.mtime, field, row: task.index, value });
    state.mtime = result.mtime;
    clearEditError();
    await loadProject(state.project.id, { silent: true });
    return { ok: true };
  } catch (err) {
    showEditError(err.message);
    return { ok: false, message: err.message };
  }
}

async function submitNote(section, text) {
  try {
    const result = await postEdit({ project_id: state.project.id, mtime: state.mtime, field: "note", section, value: text });
    state.mtime = result.mtime;
    clearEditError();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

function toggleShowDone() {
  state.showDone = !state.showDone;
  renderProjectPage(projectRoot(), state.project);
}

function renderProjectPage(root, project) {
  clear(root);
  const header = el("div", { class: "project-header", dataset: { printHide: "true" } }, [
    el("button", { type: "button", class: "project-back", onclick: navigateToBoard }, "← Back to board"),
    el("button", { type: "button", class: "project-print", onclick: printProject }, "Print project"),
  ]);
  // HTML-3: index.html's own <h1>ProjectKanban</h1> stays in the DOM (only
  // .app-toolbar is hidden on this route, not the whole header) — an <h2>
  // here keeps exactly one <h1> per page, matching board.css's own
  // lane/card titles' precedent of never introducing a second one.
  const title = el("h2", { class: "project-title" }, project.title || project.id || "(untitled project)");
  const errorBanner = el("p", { class: "project-error-banner", role: "alert", hidden: true }, "");

  const sections = [
    buildPurposeSection(project),
    buildDefinitionOfDoneSection(project),
    buildNextActionsSection(project, submitEdit, state.showDone, toggleShowDone),
    buildEventsSection(project),
    buildDocumentsSection(project),
    buildPeopleSection(project),
    buildDecisionLogSection(project),
    buildNoteBox(submitNote),
  ].filter(Boolean);

  root.appendChild(el("article", { class: "project-page" }, [header, title, errorBanner, ...sections]));
}

async function loadProject(projectId, { silent = false } = {}) {
  const root = projectRoot();
  if (!root) return;
  try {
    const board = await fetchBoard();
    const project = (board.projects ?? []).find((p) => p.id === projectId);
    if (!project) {
      // JS-2: a deleted/renamed project between page-load and click is a
      // real possibility, not a "shouldn't happen" — never a blank page.
      showMessage(root, "This project could not be found — it may have been closed or renamed.");
      return;
    }
    state.project = project;
    state.mtime = project.mtime;
    // wishlist #4b: a fresh navigation to a (possibly different) project
    // resets the toggle; an edit's own silent refetch of the SAME project
    // must not — flipping it back off mid-edit would be a surprise, not a
    // safety feature.
    if (!silent) state.showDone = false;
    renderProjectPage(root, project);
  } catch (err) {
    console.warn("project.js: could not load the project —", err);
    if (!silent) showMessage(root, "The project could not be loaded. Try again in a moment.");
  }
}

async function handleRouteChange() {
  const isProject = isProjectRoute();
  setRoute(isProject);
  if (!isProject) return;
  const id = currentProjectId();
  const root = projectRoot();
  if (!id || !root) return;
  await loadProject(id);
}

window.addEventListener("hashchange", handleRouteChange);
handleRouteChange();
