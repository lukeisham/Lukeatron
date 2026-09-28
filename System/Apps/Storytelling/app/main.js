/**
 * main.js — the only module that imports several others; it finds each page region by id and mounts the
 * module that owns it (documentation.spec §3). Modules talk to each other by events, so the order below
 * matters only where one needs another's return value (the drag-drop and library wiring).
 *
 * Every mount is isolated: a module that throws is logged by name and the rest of the page still comes up (JS-2).
 */
import { drawDiagram } from "./diagram/diagram-svg.js";
import { mountViewport, mountToolbar } from "./diagram/viewport.js";
import { mountSelection } from "./diagram/selection.js";
import { mountStoryCanvas } from "./story/story-canvas.js";
import { mountDragDrop } from "./story/drag-drop.js";
import { mountStoryHighlight } from "./story/story-highlight.js";
import { mountLibraryPanel } from "./story/library-panel.js";
import { mountDetailPanel } from "./detail/detail-panel.js";
import { mountAboutPanel } from "./detail/about-panel.js";
import { mountListPanel } from "./lists/list-panel.js";
import { mountAgentApi } from "./agent/agent-api.js";

const LAYOUT_NAME = "revised";

/** Runs one mount; on failure logs which module broke and returns null so the others carry on. */
function mountSafely(moduleName, mount) {
  try {
    return mount();
  } catch (error) {
    console.error(`main: ${moduleName} failed to mount — the rest of the page continues without it.`, error);
    return null;
  }
}

/** The page region with this id, or null after logging which region is missing from index.html. */
function regionById(id) {
  const region = document.getElementById(id);
  if (!region) console.error(`main: index.html has no element with id "${id}"; the module that owns it is skipped.`);
  return region;
}

/** Mounts `mount(region)` on the region with this id; null if the region is missing or the mount fails. */
function mountInto(moduleName, id, mount) {
  const region = regionById(id);
  return region ? mountSafely(moduleName, () => mount(region)) : null;
}

/** Library entries open through the canvas so the name field, saved-state and unsaved-changes test agree. */
function libraryOptionsFor(canvas) {
  if (!canvas) return {};
  return {
    isDirty: () => canvas.hasUnsavedChanges(),
    open: (shape) => canvas.loadShape(shape, shape.name),
  };
}

/** Builds the whole page. Exported so a test page can call it; the module also runs it on load. */
export function startStorytelling() {
  const diagramHost = regionById("diagram-host");
  if (diagramHost) mountSafely("diagram-svg", () => drawDiagram(diagramHost, LAYOUT_NAME));

  if (diagramHost) {
    mountSafely("viewport", () => mountViewport(diagramHost));
    mountSafely("selection", () => mountSelection(diagramHost));
  }
  mountInto("toolbar", "toolbar", (host) =>
    mountToolbar(host, { getSvg: () => diagramHost?.querySelector("svg") ?? null }));

  const canvas = mountInto("story-canvas", "story-area", (host) => mountStoryCanvas(host));
  if (diagramHost && canvas) mountSafely("drag-drop", () => mountDragDrop({ diagramHost, canvas }));

  mountInto("detail-panel", "detail-panel", (host) => mountDetailPanel(host));
  mountInto("list-panel", "list-panel", (host) => mountListPanel(host));
  mountInto("about-panel", "about-panel", (host) => mountAboutPanel(host));
  mountInto("library-panel", "library-panel", (host) => mountLibraryPanel(host, libraryOptionsFor(canvas)));

  if (diagramHost) mountSafely("story-highlight", () => mountStoryHighlight(diagramHost));
  mountSafely("agent-api", () => mountAgentApi());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startStorytelling, { once: true });
} else {
  startStorytelling();
}
