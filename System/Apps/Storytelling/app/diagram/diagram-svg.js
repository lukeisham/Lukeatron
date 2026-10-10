/**
 * Draws the whole table as one <svg>.
 *
 * Painter's order: furniture -> tiles -> connectors -> interaction layer (SVG-3). Everything is
 * built with createElementNS and textContent (never innerHTML). Colour comes only from CSS
 * classes; the one thing set inline is geometry and font-size, so the fit guarantee does
 * not depend on the stylesheet. The stylesheet must therefore NOT set font-size on `.sym`, `.nm`
 * or `.pop`.
 *
 * The same tiles are drawn twice: `original` (the poster's own pixels, checked against the PNG)
 * and `revised` (the shipped table). Furniture that has no fixed home in the revised table is
 * moved by a translate on its own group; the offsets are derived in revisedFurniturePlacement().
 */
import { ELEMENTS, GROUPS, ROGUE } from "../data/elements.js";
import { LAYOUT } from "../data/layout.js";
import {
  CHARACTER_MODIFIERS_LABEL,
  COLUMN_HEADINGS,
  CONNECTORS,
  KEY_CALLOUT,
  POSTER_TITLE,
  ROGUE_CAPTION,
  SUBTROPE_BOXES,
} from "../data/furniture.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const DEFAULT_DIAGRAM_DATA = Object.freeze({
  ELEMENTS,
  GROUPS,
  ROGUE,
  layout: LAYOUT,
  furniture: Object.freeze({
      CHARACTER_MODIFIERS_LABEL,
    COLUMN_HEADINGS,
    CONNECTORS,
    KEY_CALLOUT,
        POSTER_TITLE,
    ROGUE_CAPTION,
    SUBTROPE_BOXES,
    }),
});

/** Cell size fallback when an injected layout has no `geometry`. */
const FALLBACK_GEOMETRY = Object.freeze({ originX: 29, cellWidth: 62.1, cellHeight: 75 });

/** Rogue card: column 0, the row of the Five Man Band sub-tiles. */
const ROGUE_Y = 1125;

// ---- tile text metrics (poster pixels) -------------------------------------------------------
const TILE_PAD_X = 3;
const SYMBOL_MAX_SIZE = 26;
const SYMBOL_MIN_SIZE = 14;
const SYMBOL_BASELINE = 38;
const SYMBOL_BOLD_FACTOR = 1.1;
const POP_SIZE = Math.round(SYMBOL_MAX_SIZE * 0.28 * 10) / 10;
const POP_INSET = 4;
const POP_BASELINE = 10;
const BADGE_SIZE = 9;
const NAME_SIZES = Object.freeze([8, 7.5, 7, 6.5]);
const NAME_LINE_HEIGHT = 1.15;
const NAME_MAX_LINES = 3;
/** First baseline of the name block, by how many lines it has (kept clear of the symbol's descenders). */
const NAME_FIRST_BASELINE = Object.freeze({ 1: 57, 2: 55, 3: 52 });

// ---- where the revised layout moves furniture (see the file header) --------------------------
const REVISED_TITLE_LEFT = 29;
const REVISED_KEY_LEFT = 300;
const REVISED_CALL_BOX_GAP = 5;
const REVISED_FOURTH_WALL_BOX = Object.freeze({ x: 29, y: 1210 });
const GENRE_HEADING = Object.freeze({ id: "genre", block: "genre", baseline: 188, lineHeight: 14.4, fontSize: 12, lines: ["Genre"] });
const MIRRORED_CORNER = Object.freeze({ tl: "tr", tr: "tl", bl: "br", br: "bl" });

// ---- small helpers ---------------------------------------------------------------------------

function fmt(value) {
  return String(Math.round(value * 1000) / 1000);
}

function makeSvgNode(doc, tag, className, attributes = {}) {
  const node = doc.createElementNS(SVG_NS, tag);
  if (className) node.setAttribute("class", className);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, typeof value === "number" ? fmt(value) : String(value));
  return node;
}

function makeSvgText(doc, className, attributes, content) {
  const node = makeSvgNode(doc, "text", className, attributes);
  node.textContent = content;
  return node;
}

function withPlacement(group, dx, dy) {
  if (dx !== 0 || dy !== 0) group.setAttribute("transform", `translate(${fmt(dx)} ${fmt(dy)})`);
  return group;
}

const NARROW_CHARS = new Map([
  ["i", 0.22], ["l", 0.22], ["j", 0.22], ["t", 0.28], ["f", 0.28], ["r", 0.33], ["I", 0.28],
  ["'", 0.19], ["’", 0.19], [".", 0.28], [",", 0.28], [":", 0.28], [";", 0.28], ["!", 0.28],
  [" ", 0.28], ["-", 0.33], ["(", 0.33], [")", 0.33], ["?", 0.56], ["&", 0.67],
  ["m", 0.83], ["w", 0.72], ["M", 0.83], ["W", 0.94],
]);

/**
 * Estimated width of `text` in em-fractions of `fontSize`, for a Helvetica/Arial-like face.
 * Deliberately a little generous: it decides font sizes, and a system font that is narrower than
 * the estimate only leaves a little slack.
 * @param {string} text
 * @param {number} fontSize
 * @returns {number} width in the same units as fontSize
 */
export function estimateSvgTextWidth(text, fontSize) {
  let ems = 0;
  for (const char of String(text)) {
    if (NARROW_CHARS.has(char)) ems += NARROW_CHARS.get(char);
    else if (char >= "A" && char <= "Z") ems += 0.68;
    else ems += 0.56;
  }
  return ems * fontSize;
}

function wrapWords(text, maxWidth, fontSize) {
  const lines = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && estimateSvgTextWidth(trial, fontSize) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Chooses the font size and line breaks for a tile's name so it fits: tries the sizes from
 * large to the legible floor; at the floor it merges surplus lines and, only if a line is still too
 * wide, compresses that line with `textLength`.
 * @param {string} name
 * @param {number} maxWidth usable width inside the tile
 * @returns {{fontSize:number, lines:Array<{text:string, width:number, compressed:boolean}>}}
 */
export function fitTileName(name, maxWidth) {
  const describe = (fontSize, lines) => lines.map((text) => {
    const natural = estimateSvgTextWidth(text, fontSize);
    return { text, width: Math.min(natural, maxWidth), compressed: natural > maxWidth };
  });
  for (const fontSize of NAME_SIZES) {
    const lines = wrapWords(name, maxWidth, fontSize);
    if (lines.length <= NAME_MAX_LINES && lines.every((line) => estimateSvgTextWidth(line, fontSize) <= maxWidth)) {
      return { fontSize, lines: describe(fontSize, lines) };
    }
  }
  const floor = NAME_SIZES[NAME_SIZES.length - 1];
  let lines = wrapWords(name, maxWidth, floor);
  if (lines.length > NAME_MAX_LINES) lines = [...lines.slice(0, NAME_MAX_LINES - 1), lines.slice(NAME_MAX_LINES - 1).join(" ")];
  return { fontSize: floor, lines: describe(floor, lines) };
}

/** Symbol font size: the poster's big size, shrunk to fit the tile's width down to a floor. */
function fitSymbolSize(symbol, maxWidth) {
  const perUnit = estimateSvgTextWidth(symbol, 1) * SYMBOL_BOLD_FACTOR;
  return Math.max(SYMBOL_MIN_SIZE, Math.min(SYMBOL_MAX_SIZE, Math.floor((maxWidth / perUnit) * 10) / 10));
}

function symbolOf(element) {
  return element.symbol ?? element.id;
}

// ---- tiles -----------------------------------------------------------------------------------

function appendTileName(doc, tile, name, rect) {
  const fit = fitTileName(name, rect.w - 2 * TILE_PAD_X);
  const centre = rect.x + rect.w / 2;
  const first = rect.y + NAME_FIRST_BASELINE[fit.lines.length];
  const label = makeSvgNode(doc, "text", "nm", { "text-anchor": "middle", "font-size": fit.fontSize });
  fit.lines.forEach((line, index) => {
    const isLast = index === fit.lines.length - 1;
    const span = makeSvgNode(doc, "tspan", "", { x: centre, y: first + index * fit.fontSize * NAME_LINE_HEIGHT });
    if (line.compressed) {
      span.setAttribute("textLength", fmt(line.width));
      span.setAttribute("lengthAdjust", "spacingAndGlyphs");
    }
    span.textContent = isLast ? line.text : `${line.text} `;
    label.append(span);
  });
  tile.append(label);
}

/**
 * Neighbouring tiles share an edge, but `x + w` of one and `x` of the next differ by float noise (about 1e-13), and a
 * browser that snaps edges to pixels can round the two differently, drawing a 2px line. Snapping every edge to an
 * eighth of a unit (exact in binary) makes each shared edge bit-identical, so both tiles round it the same way.
 */
const EDGE_STEP = 8;
const snapEdge = (value) => Math.round(value * EDGE_STEP) / EDGE_STEP;

export function snappedRect(rect) {
  const left = snapEdge(rect.x);
  const top = snapEdge(rect.y);
  return { x: left, y: top, width: snapEdge(rect.x + rect.w) - left, height: snapEdge(rect.y + rect.h) - top };
}

function appendTileFace(doc, tile, { symbol, name, rect, popText, snap = false }) {
  tile.append(makeSvgNode(doc, "rect", "tile-rect", snap ? snappedRect(rect) : { x: rect.x, y: rect.y, width: rect.w, height: rect.h }));
  const centre = rect.x + rect.w / 2;
  tile.append(makeSvgText(doc, "sym", {
    x: centre,
    y: rect.y + SYMBOL_BASELINE,
    "text-anchor": "middle",
    "font-size": fitSymbolSize(symbol, rect.w - 2 * TILE_PAD_X),
  }, symbol));
  appendTileName(doc, tile, name, rect);
  if (popText !== undefined) {
    tile.append(makeSvgText(doc, "pop", {
      x: rect.x + rect.w - POP_INSET,
      y: rect.y + POP_BASELINE,
      "text-anchor": "end",
      "font-size": POP_SIZE,
    }, popText));
  }
  tile.append(makeSvgText(doc, "step-badge", { x: rect.x + POP_INSET, y: rect.y + POP_BASELINE + 1, "font-size": BADGE_SIZE }, ""));
}

function buildTile(doc, element, rect) {
  const classes = ["tile", `tile-${element.group}`];
  if (element.added === true) classes.push("is-added");
  const tile = makeSvgNode(doc, "g", classes.join(" "), {
    "data-element-id": element.id,
    tabindex: "0",
    role: "button",
    "aria-label": element.name,
  });
  appendTileFace(doc, tile, {
    symbol: symbolOf(element),
    name: element.name,
    rect,
    popText: element.popText,
    snap: true,
  });
  return tile;
}

function buildRogueCard(doc, rogue, rect, caption) {
  const card = makeSvgNode(doc, "g", "tile tile-rogue rogue", {
    "data-element-id": rogue.id,
    tabindex: "0",
    role: "button",
    "aria-label": rogue.name,
  });
  appendTileFace(doc, card, { symbol: rogue.id, name: rogue.name, rect });
  const captionText = makeSvgNode(doc, "text", "rogue-caption", { "font-size": 10.5 });
  const words = caption.split(" — ");
  const lines = words.length === 2 ? [`${words[0]} —`, words[1]] : [caption];
  lines.forEach((line, index) => {
    const span = makeSvgNode(doc, "tspan", "", { x: rect.x + rect.w + 8, y: rect.y + 30 + index * 13 });
    span.textContent = index < lines.length - 1 ? `${line} ` : line;
    captionText.append(span);
  });
  return { card, captionText };
}

// ---- furniture -------------------------------------------------------------------------------

function textLengthAttributes(item) {
  return item.textLength ? { textLength: item.textLength, lengthAdjust: "spacingAndGlyphs" } : {};
}

function buildTitle(doc, title, dx) {
  const group = withPlacement(makeSvgNode(doc, "g", "furniture-title"), dx, 0);
  for (const run of title.runs) {
    group.append(makeSvgText(doc, `title-run tone-${run.tone}`, {
      x: run.x, y: run.baseline, "font-size": run.fontSize, ...textLengthAttributes(run),
    }, run.text));
  }
  return group;
}

function headingCentre(heading, layoutName, layout) {
  if (layoutName === "original") return heading.centreX;
  const span = layout.blockSpan(heading.block, "revised");
  return span ? span.x + span.w / 2 : null;
}

function buildHeadings(doc, layoutName, headings, layout) {
  const group = makeSvgNode(doc, "g", "furniture-headings");
  const all = layoutName === "revised" ? [...headings, GENRE_HEADING] : headings;
  for (const heading of all) {
    const centre = headingCentre(heading, layoutName, layout);
    if (centre === null) {
      console.warn(`diagram-svg: no column span for heading "${heading.id}" in ${layoutName}; not drawn`);
      continue;
    }
    heading.lines.forEach((line, index) => {
      group.append(makeSvgText(doc, "col-heading", {
        x: centre,
        y: heading.baseline + index * heading.lineHeight,
        "text-anchor": "middle",
        "font-size": heading.fontSize,
        "data-heading": heading.id,
      }, line));
    });
  }
  return group;
}

function buildCharModLabel(doc, label, layoutName, layout) {
  const span = layoutName === "revised" ? layout.blockSpan(label.block, "revised") : null;
  const centre = span ? span.x + span.w / 2 : label.centreX;
  const group = makeSvgNode(doc, "g", "char-mod-label");
  group.append(makeSvgNode(doc, "rect", "char-mod-box", {
    x: centre - label.box.width / 2, y: label.box.y, width: label.box.width, height: label.box.height,
  }));
  label.lines.forEach((line, index) => {
    group.append(makeSvgText(doc, "char-mod-text", {
      x: centre, y: label.baseline + index * label.lineHeight, "text-anchor": "middle", "font-size": label.fontSize,
    }, line));
  });
  return group;
}

function keyClass(base, item) {
  return item.popKey ? `${base} pop-key` : base;
}

function appendKeyRow(doc, group, row, labelClass) {
  group.append(makeSvgText(doc, keyClass(labelClass, row), {
    x: row.x, y: row.baseline, "font-size": row.fontSize, ...textLengthAttributes(row),
  }, row.text));
  group.append(makeSvgNode(doc, "path", keyClass("key-leader", row), { d: row.leader, fill: "none" }));
  for (const note of row.note ?? []) {
    group.append(makeSvgText(doc, keyClass("key-note", row), {
      x: note.x, y: note.baseline, "font-size": note.fontSize, ...textLengthAttributes(note),
    }, note.text));
  }
}

function buildKey(doc, key, dx) {
  const group = withPlacement(makeSvgNode(doc, "g", "key-callout"), dx, 0);
  group.append(makeSvgNode(doc, "rect", "key-box", { x: key.box.x, y: key.box.y, width: key.box.width, height: key.box.height }));
  group.append(makeSvgText(doc, "key-sample-sym", {
    x: key.sampleSymbol.x, y: key.sampleSymbol.baseline, "text-anchor": "middle", "font-size": key.sampleSymbol.fontSize,
  }, key.sampleSymbol.text));
  group.append(makeSvgText(doc, "key-sample-nm", {
    x: key.sampleName.x, y: key.sampleName.baseline, "text-anchor": "middle", "font-size": key.sampleName.fontSize,
  }, key.sampleName.text));
  group.append(makeSvgNode(doc, "circle", keyClass("key-badge", key.badge), { cx: key.badge.cx, cy: key.badge.cy, r: key.badge.r }));
  group.append(makeSvgText(doc, keyClass("key-badge-text", key.badge), {
    x: key.badge.cx, y: key.badge.cy + key.badge.fontSize * 0.36, "text-anchor": "middle", "font-size": key.badge.fontSize,
  }, key.badge.text));
  appendKeyRow(doc, group, key.identifier, "key-label");
  appendKeyRow(doc, group, key.tropeName, "key-label");
  appendKeyRow(doc, group, key.popularity, "key-label");
  return group;
}

const SUBTROPE_COLUMN_GAP = 14;
const SUBTROPE_BOLD_FACTOR = 1.1;
/** The width estimate runs up to ~5% under a real system face (measured in the browser), so the fit adds this. */
const SUBTROPE_WIDTH_SLACK = 1.06;

const subtropeTextWidth = (text, fontSize) => estimateSvgTextWidth(text, fontSize) * SUBTROPE_WIDTH_SLACK;

/**
 * A subtrope box sized to its text: the poster's rectangle is the floor, and the box grows on the
 * right and bottom until the widest line (the bold title included) and the last row sit inside it
 * with the same padding the left edge has. Multi-column boxes re-space their columns so a long
 * item cannot run into the next column. The drawing and the connectors both read this.
 * @returns {{ x: number, y: number, width: number, height: number, columns: {x: number, items: string[]}[] }}
 */
function fitSubtropeBox(box) {
  const pad = box.textX - box.box.x;
  const columns = [];
  let cursor = box.textX;
  for (const source of box.columns ?? [{ x: box.textX, items: box.items }]) {
    const x = box.columns ? Math.max(source.x, cursor) : source.x;
    const width = Math.max(...source.items.map((item) => subtropeTextWidth(item, box.fontSize)));
    columns.push({ x, items: source.items });
    cursor = x + width + SUBTROPE_COLUMN_GAP;
  }
  const lastColumn = columns[columns.length - 1];
  const widestLast = Math.max(...lastColumn.items.map((item) => subtropeTextWidth(item, box.fontSize)));
  const titleRight = box.textX + subtropeTextWidth(box.title, box.fontSize) * SUBTROPE_BOLD_FACTOR;
  const right = Math.max(box.box.x + box.box.width, lastColumn.x + widestLast + pad, titleRight + pad);
  const rows = Math.max(...columns.map((column) => column.items.length));
  const bottom = Math.max(box.box.y + box.box.height, box.firstBaseline + (rows - 1) * box.lineHeight + pad);
  return { x: box.box.x, y: box.box.y, width: right - box.box.x, height: bottom - box.box.y, columns };
}

function buildSubtropeBox(doc, box, placement) {
  const group = withPlacement(makeSvgNode(doc, "g", "subtrope-box", { "data-box-id": box.id }), placement.dx, placement.dy);
  const fitted = fitSubtropeBox(box);
  group.append(makeSvgNode(doc, "rect", "subtrope-rect", { x: fitted.x, y: fitted.y, width: fitted.width, height: fitted.height }));
  group.append(makeSvgText(doc, "subtrope-title", { x: box.textX, y: box.titleBaseline, "font-size": box.fontSize }, box.title));
  for (const column of fitted.columns) {
    column.items.forEach((item, index) => {
      group.append(makeSvgText(doc, "subtrope-item", {
        x: column.x, y: box.firstBaseline + index * box.lineHeight, "font-size": box.fontSize,
      }, item));
    });
  }
  return group;
}

// ---- revised-layout furniture placement ------------------------------------------------------

/**
 * Where each moved furniture group goes in the revised layout, as translate offsets. Every choice
 * puts the item in space the revised table leaves empty (checked against the tile rectangles).
 */
function revisedFurniturePlacement(furniture, layout) {
  const genre = layout.blockSpan("genre", "revised");
  const callBox = furniture.SUBTROPE_BOXES.find((box) => box.id === "call-to-adventure-box");
  const wallBox = furniture.SUBTROPE_BOXES.find((box) => box.id === "fourth-wall-box");
  return {
    titleDx: REVISED_TITLE_LEFT - furniture.POSTER_TITLE.box.x,
    keyDx: REVISED_KEY_LEFT - furniture.KEY_CALLOUT.box.x,
    subtrope: {
      [callBox.id]: { dx: genre.x - REVISED_CALL_BOX_GAP - fitSubtropeBox(callBox).width - callBox.box.x, dy: 0 },
      [wallBox.id]: { dx: REVISED_FOURTH_WALL_BOX.x - wallBox.box.x, dy: REVISED_FOURTH_WALL_BOX.y - wallBox.box.y },
    },
  };
}

const ORIGINAL_FURNITURE_PLACEMENT = Object.freeze({
  titleDx: 0, keyDx: 0, subtrope: Object.freeze({}),
});

function subtropePlacement(placement, boxId) {
  return placement.subtrope[boxId] ?? { dx: 0, dy: 0 };
}

// ---- connectors ------------------------------------------------------------------------------

function cornerOf(rect, corner) {
  const x = corner.endsWith("r") ? rect.x + rect.w : rect.x;
  const y = corner.startsWith("b") ? rect.y + rect.h : rect.y;
  return [x, y];
}

function endRect(end, context) {
  if (end.tileId !== undefined) return context.tileRects.get(end.tileId) ?? null;
  const box = context.furniture.SUBTROPE_BOXES.find((candidate) => candidate.id === end.furnitureId);
  if (!box) return null;
  const { dx, dy } = subtropePlacement(context.placement, box.id);
  const fitted = fitSubtropeBox(box);
  return { x: fitted.x + dx, y: fitted.y + dy, w: fitted.width, h: fitted.height };
}

/** Revised connectors keep the poster's tangent shape, so every end's left/right corner flips with the mirrored table. */
function connectorPoints(connector, layoutName, context) {
  if (layoutName === "original") return connector.points;
  const ends = [connector.from, connector.to].map((end) => {
    const rect = endRect(end, context);
    return rect ? cornerOf(rect, MIRRORED_CORNER[end.corner]) : null;
  });
  if (ends.includes(null)) {
    console.warn(`diagram-svg: connector "${connector.id}" has an end that is not on the table; not drawn`);
    return null;
  }
  return ends;
}

function buildConnectors(doc, layer, layoutName, context) {
  for (const connector of context.furniture.CONNECTORS) {
    const points = connectorPoints(connector, layoutName, context);
    if (!points) continue;
    const [[x1, y1], [x2, y2]] = points;
    layer.append(makeSvgNode(doc, "line", "connector", {
      x1, y1, x2, y2, "stroke-dasharray": connector.dash, "stroke-width": connector.width, "data-connector-id": connector.id,
    }));
  }
}

// ---- assembly --------------------------------------------------------------------------------

function buildFurnitureLayer(doc, layoutName, data, placement) {
  const { furniture, layout } = data;
  const layer = makeSvgNode(doc, "g", "layer layer-furniture");
  layer.append(buildTitle(doc, furniture.POSTER_TITLE, placement.titleDx));
  layer.append(buildHeadings(doc, layoutName, furniture.COLUMN_HEADINGS, layout));
  for (const box of furniture.SUBTROPE_BOXES) layer.append(buildSubtropeBox(doc, box, subtropePlacement(placement, box.id)));
  layer.append(buildCharModLabel(doc, furniture.CHARACTER_MODIFIERS_LABEL, layoutName, layout));
  layer.append(buildKey(doc, furniture.KEY_CALLOUT, placement.keyDx));
  return layer;
}

function buildTilesLayer(doc, layoutName, data) {
  const { layout, furniture, ELEMENTS: elements, GROUPS: groups, ROGUE: rogue } = data;
  const layer = makeSvgNode(doc, "g", "layer layer-tiles");
  const tileRects = new Map();
  for (const element of elements) {
    const rect = layout.tileRect(element, layoutName);
    if (rect === null) continue;
    if (groups[element.group] === undefined) console.warn(`diagram-svg: tile ${element.id} has unknown group "${element.group}"`);
    tileRects.set(element.id, rect);
    layer.append(buildTile(doc, element, rect));
  }
  if (layoutName === "revised") {
    const geometry = layout.geometry ?? FALLBACK_GEOMETRY;
    const rect = { x: geometry.originX, y: ROGUE_Y, w: geometry.cellWidth, h: geometry.cellHeight };
    const { card, captionText } = buildRogueCard(doc, rogue, rect, furniture.ROGUE_CAPTION);
    layer.append(card, captionText);
  }
  return { layer, tileRects };
}

/**
 * Builds the poster as an <svg> element (never innerHTML).
 * @param {Document} doc a document (or fake) with createElementNS
 * @param {"original"|"revised"} layoutName
 * @param {{ELEMENTS?:object[], GROUPS?:object, ROGUE?:object, furniture?:object, layout?:object}} [data] overrides, for tests
 * @returns {SVGSVGElement}
 */
export function buildDiagramSvg(doc, layoutName, data = {}) {
  if (!doc || typeof doc.createElementNS !== "function") throw new Error("buildDiagramSvg: doc must provide createElementNS");
  const merged = { ...DEFAULT_DIAGRAM_DATA, ...data, furniture: { ...DEFAULT_DIAGRAM_DATA.furniture, ...(data.furniture ?? {}) } };
  const viewBox = merged.layout.viewBoxFor(layoutName);
  const placement = layoutName === "revised" ? revisedFurniturePlacement(merged.furniture, merged.layout) : ORIGINAL_FURNITURE_PLACEMENT;

  const svg = makeSvgNode(doc, "svg", "st-diagram", {
    viewBox: viewBox.attr,
    preserveAspectRatio: "xMidYMid meet",
    role: "group",
    "aria-label": merged.furniture.POSTER_TITLE.text,
    "data-pop": "on",
    "data-layout": layoutName,
  });
  const furnitureLayer = buildFurnitureLayer(doc, layoutName, merged, placement);
  const { layer: tilesLayer, tileRects } = buildTilesLayer(doc, layoutName, merged);
  const connectorLayer = makeSvgNode(doc, "g", "layer layer-connectors");
  buildConnectors(doc, connectorLayer, layoutName, { tileRects, furniture: merged.furniture, placement });
  svg.append(furnitureLayer, tilesLayer, connectorLayer, makeSvgNode(doc, "g", "interaction-layer"));
  return svg;
}

/**
 * Clears `host` and draws the table into it.
 * @param {Element} host the diagram host element
 * @param {"original"|"revised"} [layoutName]
 * @returns {SVGSVGElement} the new svg
 */
export function drawDiagram(host, layoutName = "revised") {
  const svg = buildDiagramSvg(host.ownerDocument, layoutName);
  host.replaceChildren(svg);
  return svg;
}
