// The Bedlam-cube construction (documentation spec, PRD build note): one cube
// defined once in <defs>, instanced everywhere with <use>, its side faces
// shaded off a single inherited fill by feColorMatrix — five palette values
// (the two shade tokens plus whatever fill an instance carries), not fifteen.
// AD-3 measured this at 57% smaller markup than three separately-filled
// polygons per cube.
//
// A <use> element's cloned content inherits CSS-level presentational
// properties (like `fill`) from the <use> element itself, not from where the
// original sits in <defs> — that inheritance is what lets every instance
// recolour by setting one attribute on the <use>, never touching the shared
// definition (SVG-5).

import { svgEl, token } from "../shared/dom.js";
import { TILE_WIDTH, TILE_DEPTH, STOREY_HEIGHT } from "./geometry.js";

const HW = TILE_WIDTH / 2;
const HD = TILE_DEPTH / 2;
const EX = STOREY_HEIGHT;

// Vertices relative to the diamond's centre (matches geometry.js's tileCentre,
// which is also centre-referenced — the seam between "where" and "how big").
const TOP = [0, -HD];
const RIGHT = [HW, 0];
const BOTTOM = [0, HD];
const LEFT = [-HW, 0];

function pathFrom(points) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]},${p[1]}`).join(" ") + " Z";
}

const TOP_FACE_D = pathFrom([TOP, RIGHT, BOTTOM, LEFT]);
const RIGHT_FACE_D = pathFrom([RIGHT, BOTTOM, [BOTTOM[0], BOTTOM[1] + EX], [RIGHT[0], RIGHT[1] + EX]]);
const LEFT_FACE_D = pathFrom([LEFT, BOTTOM, [BOTTOM[0], BOTTOM[1] + EX], [LEFT[0], LEFT[1] + EX]]);

/** A feColorMatrix that scales RGB by `factor`, leaving alpha untouched — the
 * "off a single inherited fill" shading AD-3 describes: it darkens whatever
 * colour was inherited without needing to know what that colour is. */
function scaleMatrix(factor) {
  const f = factor.toFixed(3);
  return `${f} 0 0 0 0  0 ${f} 0 0 0  0 0 ${f} 0 0  0 0 0 1 0`;
}

/**
 * Builds the shared <defs>: the two shading filters (read from
 * --face-shade-mid / --face-shade-dark every call, so a token edit is picked
 * up on the next render) and two cube symbols — `cube` (top face at full
 * inherited strength) and `cube-dim-crown` (top face also mid-shaded, the
 * crown's "waiting on someone" treatment, STYLE.md "The crown"). Call once per
 * render and append to the SVG root before any `<use>` references it.
 */
export function buildCubeDefs() {
  const mid = parseFloat(token("--face-shade-mid"));
  const dark = parseFloat(token("--face-shade-dark"));

  const filterMid = svgEl("filter", { id: "cube-face-mid" }, [
    svgEl("feColorMatrix", { type: "matrix", values: scaleMatrix(mid) }),
  ]);
  const filterDark = svgEl("filter", { id: "cube-face-dark" }, [
    svgEl("feColorMatrix", { type: "matrix", values: scaleMatrix(dark) }),
  ]);

  const rightFace = svgEl("path", { class: "cube-face cube-face-right", d: RIGHT_FACE_D, filter: "url(#cube-face-mid)" });
  const leftFace = svgEl("path", { class: "cube-face cube-face-left", d: LEFT_FACE_D, filter: "url(#cube-face-dark)" });

  const cube = svgEl("g", { id: "cube" }, [
    svgEl("path", { class: "cube-face cube-face-top", d: TOP_FACE_D }),
    rightFace.cloneNode(true),
    leftFace.cloneNode(true),
  ]);

  const cubeDimCrown = svgEl("g", { id: "cube-dim-crown" }, [
    svgEl("path", { class: "cube-face cube-face-top", d: TOP_FACE_D, filter: "url(#cube-face-mid)" }),
    rightFace.cloneNode(true),
    leftFace.cloneNode(true),
  ]);

  return svgEl("defs", {}, [filterMid, filterDark, cube, cubeDimCrown]);
}

/** The flat diamond alone (a plate or a bare tile) — no side faces, no
 * extrusion. `dashed` selects --dash-mind over --dash-bare (STYLE.md, "Mind
 * plate vs. bare tile"). */
export function flatDiamondPath() {
  return TOP_FACE_D;
}
