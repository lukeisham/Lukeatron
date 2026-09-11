// The packed isometric mass (FR-1 family) — the board altitude (all four
// quadrants) and the quadrant altitude (one quadrant alone, larger), which
// share every drawing rule and differ only in scope and scale (SR-1: one
// rendering pipeline, tightly bound by type and purpose, is a single file by
// the rule's own exception clause).
//
// Painter's order (SVG-3, no z-index): every drawable — bare tile, plate or
// stack — is sorted once by screen `base` ascending and appended in that
// order, so nearer objects paint over farther ones without any stacking
// context to manage.

import { svgEl, clear, token } from "../shared/dom.js";
import { QUADRANT_N, BOARD_N, QUADRANT_ORIGIN, TILE_WIDTH, TILE_DEPTH, STOREY_HEIGHT, tileCentre, stackScreen, rotateCorner } from "./geometry.js";
import { assignQuadrantSlots, boardDisplay, quadrantDisplay } from "./lattice.js";
import { hiddenAtThisAngle, hiddenFromAllRotations } from "./occlusion.js";
import { buildCubeDefs, flatDiamondPath } from "./cube-defs.js";
import { projectColour, kindColour } from "./colour.js";

const HW = TILE_WIDTH / 2;
const HD = TILE_DEPTH / 2;
const EX = STOREY_HEIGHT;

function silhouettePath(x, y, storeys) {
  if (storeys <= 0) {
    return `M ${x},${y - HD} L ${x + HW},${y} L ${x},${y + HD} L ${x - HW},${y} Z`;
  }
  const topY = y - (storeys - 1) * EX;
  const bottomY = y + EX;
  return [
    `M ${x},${topY - HD}`, // top vertex of the topmost storey
    `L ${x + HW},${topY}`, // right vertex of the topmost storey
    `L ${x + HW},${bottomY}`, // right-bottom of the ground storey
    `L ${x},${bottomY + HD}`, // front-bottom vertex
    `L ${x - HW},${bottomY}`, // left-bottom of the ground storey
    `L ${x - HW},${topY}`, // left vertex of the topmost storey
    "Z",
  ].join(" ");
}

/** One project's drawable: its slot, its screen position, and a per-storey
 * fill function — computed once per render so hover and the occlusion pass
 * both read the same numbers. FR-20: under `colour = kind` every cube takes
 * its OWN task's kind colour (tasks are already kind-ascending, FR-15, so
 * `tasks[k]` is exactly storey k's task); under `colour = project` every
 * storey in the stack shares the one project fill. */
function buildDrawable(project, u, v, colourMode, quadrantIndex) {
  const storeys = project.is_mind_project ? 0 : project.tasks.length;
  const { x, y } = tileCentre(u, v);
  const screen = stackScreen(u, v, storeys);
  const projectFill = projectColour(project.context, quadrantIndex);
  const fillForStorey = colourMode === "kind" ? (k) => kindColour(project.tasks[k].kind.value) : () => projectFill;
  return { project, u, v, x, y, storeys, screen, fillForStorey };
}

function renderBareTile(x, y) {
  // styleguide FR-6a/AC-12: a solid border is the second cue against the mind
  // plate's dashed one (--dash-bare: none only produces a solid *line* when a
  // stroke colour is actually set — omitting it left bare tiles with no
  // border at all).
  return svgEl("path", { class: "bare-tile", d: flatDiamondPath(), transform: `translate(${x} ${y})`, fill: "var(--bare)", stroke: "var(--line)", "stroke-dasharray": "var(--dash-bare)" });
}

function renderPlate(drawable) {
  return svgEl("path", {
    class: "mind-plate",
    d: flatDiamondPath(),
    transform: `translate(${drawable.x} ${drawable.y})`,
    fill: "var(--mind)",
    stroke: "var(--line)",
    "stroke-dasharray": "var(--dash-mind)",
  });
}

function renderStack(drawable, { hovered }) {
  const { project, x, y, storeys, fillForStorey } = drawable;
  const title = project.title || "";
  const group = svgEl("g", { class: "stack", "data-project-id": project.id, tabindex: "0", role: "button", "aria-label": `${project.id} — ${title}` });

  for (let k = 0; k < storeys; k++) {
    const isTop = k === storeys - 1;
    const symbol = isTop && project.crown === "shared" ? "#cube-dim-crown" : "#cube";
    group.appendChild(svgEl("use", { href: symbol, transform: `translate(${x} ${y - k * EX})`, fill: fillForStorey(k) }));
  }

  if (project.outline !== "none") {
    const colourVar = project.outline === "overdue" ? "var(--fluoro-over)" : "var(--fluoro-week)";
    const widthVar = project.outline === "overdue" ? "var(--stroke-over)" : "var(--stroke-week)";
    group.appendChild(
      svgEl("path", {
        class: "outline",
        d: silhouettePath(x, y, storeys),
        fill: "none",
        stroke: colourVar,
        "stroke-width": widthVar,
        filter: "url(#outline-glow)",
      })
    );
  }

  if (hovered) {
    group.appendChild(svgEl("path", { class: "hover-highlight", d: silhouettePath(x, y, storeys), fill: "none", stroke: "var(--ink)", "stroke-width": 1.5 }));
  }

  return group;
}

function glowFilterDef() {
  // stdDeviation takes a bare number, but --glow-blur is a CSS length (px) —
  // parsed here rather than changing the token, which every other consumer
  // (a real stroke-width/blur in CSS) needs the unit on.
  const blur = parseFloat(token("--glow-blur")) || 4;
  return svgEl("filter", { id: "outline-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, [
    svgEl("feGaussianBlur", { stdDeviation: blur, result: "blur" }),
    svgEl("feMerge", {}, [svgEl("feMergeNode", { in: "blur" }), svgEl("feMergeNode", { in: "SourceGraphic" })]),
  ]);
}

/** Builds the drawables for one quadrant's projects, at either altitude. */
function quadrantDrawables(board, context, { colourMode, frontMode, rotation, altitude }) {
  const projects = board.projects.filter((p) => p.context === context);
  const effortOrder = board.orderings?.[context]?.effort ?? projects.map((p) => p.id);
  const frontOrder = board.orderings?.[context]?.[frontMode] ?? projects.map((p) => p.id);
  const slots = assignQuadrantSlots(effortOrder, frontOrder);
  const byId = new Map(projects.map((p) => [p.id, p]));

  const used = new Set();
  const drawables = [];
  for (const [id, { lu, lv }] of slots) {
    const project = byId.get(id);
    if (!project) continue;
    used.add(`${lu},${lv}`);
    const [u, v] = altitude === "quadrant" ? quadrantDisplay(lu, lv, rotation) : boardDisplay(context, lu, lv, rotation);
    drawables.push(buildDrawable(project, u, v, colourMode, [...slots.keys()].indexOf(id)));
  }

  const bare = [];
  for (let lu = 0; lu < QUADRANT_N; lu++) {
    for (let lv = 0; lv < QUADRANT_N; lv++) {
      if (used.has(`${lu},${lv}`)) continue;
      const [u, v] = altitude === "quadrant" ? quadrantDisplay(lu, lv, rotation) : boardDisplay(context, lu, lv, rotation);
      bare.push(tileCentre(u, v));
    }
  }
  return { drawables, bare };
}

function occlusionInputs(drawables) {
  return drawables.map((d) => ({ id: d.project.id, x: d.screen.x, base: d.screen.base, top: d.screen.top }));
}

const CORNER_AT_R0 = [
  { context: "Personal Research", corner: [0, 0], role: "far" },
  { context: "Personal Productivity", corner: [BOARD_N, 0], role: "right" },
  { context: "Teaching", corner: [0, BOARD_N], role: "left" },
  { context: "Church", corner: [BOARD_N, BOARD_N], role: "near" },
];

// FR-21/AC-18: the push direction degenerates to (0,0) whenever a rotated
// corner lands exactly on the board's centre — which happens for exactly one
// quadrant at every rotation index (confirmed live: Personal Research at
// r=0, Personal Productivity at r=1, Church at r=2, Teaching at r=3). Each
// CORNER_AT_R0 entry's own `role` is the fallback direction for that case, so
// the label always clears the mass instead of landing on top of it.
const ROLE_PUSH = { far: [0, -1], near: [0, 1], left: [-1, 0], right: [1, 0] };

function renderQuadrantLabels(rotation) {
  const group = svgEl("g", { class: "quadrant-labels" });
  for (const { context, corner, role } of CORNER_AT_R0) {
    const [a, b] = rotateCorner(corner[0], corner[1], BOARD_N, rotation);
    const cx = (a - b) * (TILE_WIDTH / 2);
    const cy = (a + b) * (TILE_DEPTH / 2);
    // push the label outward from the board centre so it clears the mass
    const mag = Math.hypot(cx, cy);
    const [dx, dy] = mag > 0 ? [cx / mag, cy / mag] : ROLE_PUSH[role];
    const lx = cx + dx * 24;
    const ly = cy + dy * 24;
    group.appendChild(svgEl("text", { x: lx, y: ly, class: "quadrant-label", "text-anchor": "middle" }, context));
  }
  return group;
}

/**
 * Renders the board altitude (all four quadrants) or the quadrant altitude
 * (one, larger) into `container`. Returns the occlusion diagnostic (FR-22a) —
 * printed by the caller, gating nothing.
 */
export function renderMass(container, board, opts) {
  const { colourMode, frontMode, rotation, altitude, context, onHoverChange, onOpenStack, hoveredId } = opts;
  clear(container);

  const scale = altitude === "quadrant" ? 1.6 : 1;
  const viewBoxSize = altitude === "quadrant" ? 420 : 640;

  const svg = svgEl("svg", { viewBox: `${-viewBoxSize / 2} ${-viewBoxSize / 2 + 40} ${viewBoxSize} ${viewBoxSize}`, class: "mass-svg", role: "img", "aria-label": "The board" });
  svg.appendChild(buildCubeDefs());
  svg.appendChild(svgEl("defs", {}, [glowFilterDef()]));

  const scaleGroup = svgEl("g", { transform: `scale(${scale})` });

  let allDrawables = [];
  let allBare = [];
  if (altitude === "quadrant") {
    const { drawables, bare } = quadrantDrawables(board, context, { colourMode, frontMode, rotation, altitude });
    allDrawables = drawables;
    allBare = bare;
  } else {
    for (const ctx of Object.keys(QUADRANT_ORIGIN)) {
      const { drawables, bare } = quadrantDrawables(board, ctx, { colourMode, frontMode, rotation, altitude });
      allDrawables.push(...drawables);
      allBare.push(...bare);
    }
    scaleGroup.appendChild(renderQuadrantLabels(rotation));
  }

  for (const pos of allBare) scaleGroup.appendChild(renderBareTile(pos.x, pos.y));

  const painterOrder = [...allDrawables].sort((a, b) => a.screen.base - b.screen.base);
  for (const drawable of painterOrder) {
    const node = drawable.project.is_mind_project ? renderPlate(drawable) : renderStack(drawable, { hovered: drawable.project.id === hoveredId });
    if (!drawable.project.is_mind_project) {
      node.classList.toggle("dimmed", Boolean(hoveredId) && hoveredId !== drawable.project.id);
      node.addEventListener("mouseenter", () => onHoverChange(drawable.project.id));
      node.addEventListener("mouseleave", () => onHoverChange(null));
      node.addEventListener("click", () => onOpenStack(drawable.project));
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenStack(drawable.project);
        }
      });
    }
    scaleGroup.appendChild(node);
  }

  svg.appendChild(scaleGroup);

  // FR-5: hover reveals id, title, open-task count and soonest due date with
  // no click and no view change — a fixed HUD line, not transformed by
  // scaleGroup, so it reads the same at either altitude.
  const hoveredDrawable = allDrawables.find((d) => d.project.id === hoveredId);
  if (hoveredDrawable) {
    const p = hoveredDrawable.project;
    const title = p.title || "(untitled)";
    const due = p.urgency_days == null ? "nothing due" : p.urgency_days < 0 ? `overdue by ${-p.urgency_days}d` : p.urgency_days === 0 ? "due today" : `due in ${p.urgency_days}d`;
    svg.appendChild(
      svgEl(
        "text",
        { x: -viewBoxSize / 2 + 12, y: -viewBoxSize / 2 + 56, class: "hover-hud" },
        `${p.id} — ${title} · ${hoveredDrawable.storeys} open · ${due}`
      )
    );
  }

  container.appendChild(svg);

  // FR-22a: the occlusion diagnostic, run over every pair at the current
  // rotation, plus the intersection across all four — diagnostics only,
  // gating nothing (AD-5).
  const params = { cubeWidth: TILE_WIDTH, scale };
  const hiddenNow = hiddenAtThisAngle(occlusionInputs(allDrawables), params);
  const hiddenPerRotation = [0, 1, 2, 3].map((r) => {
    if (altitude === "quadrant") {
      return hiddenAtThisAngle(occlusionInputs(quadrantDrawables(board, context, { colourMode, frontMode, rotation: r, altitude }).drawables), params);
    }
    const drawablesR = Object.keys(QUADRANT_ORIGIN).flatMap(
      (ctx) => quadrantDrawables(board, ctx, { colourMode, frontMode, rotation: r, altitude }).drawables
    );
    return hiddenAtThisAngle(occlusionInputs(drawablesR), params);
  });
  const hiddenAllFour = hiddenFromAllRotations(hiddenPerRotation);

  return { hiddenThisAngle: hiddenNow.size, hiddenAllFour: hiddenAllFour.size, total: allDrawables.length };
}
