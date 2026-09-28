/**
 * Draws the whole table as one <svg> (diagram spec FR-D4, FR-D9-D14).
 *
 * Painter's order: furniture -> tiles -> connectors -> interaction layer (SVG-3). Everything is
 * built with createElementNS and textContent (never innerHTML). Colour comes only from CSS
 * classes; the one thing set inline is geometry and font-size, so the fit guarantee (AC-D3) does
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
  ADDED_ELEMENT_CREDIT,
  CHARACTER_MODIFIERS_LABEL,
  COLUMN_HEADINGS,
  CONNECTORS,
  KEY_CALLOUT,
  OUTLINE_EXAMPLES,
  POSTER_CREDITS,
  POSTER_TITLE,
  ROGUE_CAPTION,
  SUBTROPE_BOXES,
  TVTROPES_CREDIT,
} from "../data/furniture.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const DEFAULT_DIAGRAM_DATA = Object.freeze({
  ELEMENTS,
  GROUPS,
  ROGUE,
  layout: LAYOUT,
  furniture: Object.freeze({
    ADDED_ELEMENT_CREDIT,
    CHARACTER_MODIFIERS_LABEL,
    COLUMN_HEADINGS,
    CONNECTORS,
    KEY_CALLOUT,
    OUTLINE_EXAMPLES,
    POSTER_CREDITS,
    POSTER_TITLE,
    ROGUE_CAPTION,
    SUBTROPE_BOXES,
    TVTROPES_CREDIT,
  }),
});

/** Cell size fallback when an injected layout has no `geometry`. */
const FALLBACK_GEOMETRY = Object.freeze({ originX: 29, cellWidth: 62.1, cellHeight: 75 });

/** Rogue card: column 0, the row of the Five Man Band sub-tiles (FR-D14). */
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
const REVISED_CREDITS_CENTRE = 600;
const REVISED_CALL_BOX_GAP = 5;
const REVISED_FOURTH_WALL_BOX = Object.freeze({ x: 29, y: 1210 });
const REVISED_PANEL_TOP = 1306;
const REVISED_FOOTER_DROP = 24;
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
 * Chooses the font size and line breaks for a tile's name so it fits (AC-D3): tries the sizes from
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

function appendTileFace(doc, tile, { symbol, name, rect, popText }) {
  tile.append(makeSvgNode(doc, "rect", "tile-rect", { x: rect.x, y: rect.y, width: rect.w, height: rect.h }));
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

function buildTile(doc, element, rect, addedCredit) {
  const classes = ["tile", `tile-${element.group}`];
  if (element.added === true) classes.push("is-added");
  const tile = makeSvgNode(doc, "g", classes.join(" "), {
    "data-element-id": element.id,
    tabindex: "0",
    role: "button",
    "aria-label": element.name,
  });
  if (element.added === true) {
    const title = makeSvgNode(doc, "title");
    title.textContent = addedCredit;
    tile.append(title);
  }
  appendTileFace(doc, tile, {
    symbol: symbolOf(element),
    name: element.name,
    rect,
    popText: element.added === true ? undefined : element.popText,
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

function buildSubtropeBox(doc, box, placement) {
  const group = withPlacement(makeSvgNode(doc, "g", "subtrope-box", { "data-box-id": box.id }), placement.dx, placement.dy);
  group.append(makeSvgNode(doc, "rect", "subtrope-rect", { x: box.box.x, y: box.box.y, width: box.box.width, height: box.box.height }));
  group.append(makeSvgText(doc, "subtrope-title", { x: box.textX, y: box.titleBaseline, "font-size": box.fontSize }, box.title));
  const columns = box.columns ?? [{ x: box.textX, items: box.items }];
  for (const column of columns) {
    column.items.forEach((item, index) => {
      group.append(makeSvgText(doc, "subtrope-item", {
        x: column.x, y: box.firstBaseline + index * box.lineHeight, "font-size": box.fontSize,
      }, item));
    });
  }
  return group;
}

function buildCredits(doc, credits, dx) {
  const group = withPlacement(makeSvgNode(doc, "g", "poster-credits"), dx, 0);
  credits.lines.forEach((line, index) => {
    group.append(makeSvgText(doc, "credit-line", {
      x: credits.centreX, y: credits.baseline + index * credits.lineHeight, "text-anchor": "middle", "font-size": credits.fontSize,
    }, line));
  });
  return group;
}

function fitFontSize(text, maxWidth, maxSize, minSize) {
  const perUnit = estimateSvgTextWidth(text, 1);
  return Math.max(minSize, Math.min(maxSize, Math.floor((maxWidth / perUnit) * 10) / 10));
}

function buildChip(doc, chip) {
  const group = makeSvgNode(doc, "g", `chip chip-${chip.group}`, { "data-chip-id": chip.id });
  group.append(makeSvgNode(doc, "rect", "chip-rect", { x: chip.x, y: chip.y, width: chip.width, height: chip.height }));
  const size = fitFontSize(chip.id, chip.width - 2, Math.min(10.5, chip.height * 0.72), 6);
  group.append(makeSvgText(doc, "chip-label", {
    x: chip.x + chip.width / 2, y: chip.y + chip.height / 2 + size * 0.35, "text-anchor": "middle", "font-size": size,
  }, chip.id));
  return group;
}

function buildFranchise(doc, franchise) {
  const group = makeSvgNode(doc, "g", "franchise", { "data-franchise": franchise.id });
  const box = franchise.titleBox;
  const size = fitFontSize(franchise.title, box.width * 0.94, 30, 9);
  group.append(makeSvgText(doc, "franchise-title", {
    x: box.x + box.width / 2, y: box.y + box.height / 2 + size * 0.35, "text-anchor": "middle", "font-size": size,
  }, franchise.title));
  for (const link of franchise.links) {
    group.append(makeSvgNode(doc, "path", `chip-link chip-link-${link.kind}`, { d: link.d, "stroke-width": link.width, fill: "none" }));
  }
  for (const chip of franchise.chips) group.append(buildChip(doc, chip));
  return group;
}

function buildOutlinePanel(doc, panel, placement) {
  const group = withPlacement(makeSvgNode(doc, "g", "outline-panel"), placement.dx, placement.dy);
  const frame = panel.frame;
  group.append(makeSvgNode(doc, "rect", "outline-frame", {
    x: frame.x, y: frame.y, width: frame.width, height: frame.height, "stroke-width": frame.strokeWidth,
  }));
  group.append(makeSvgText(doc, "outline-heading", {
    x: panel.heading.x, y: panel.heading.baseline, "font-size": panel.heading.fontSize, ...textLengthAttributes(panel.heading),
  }, panel.heading.text));
  for (const franchise of panel.franchises) group.append(buildFranchise(doc, franchise));
  return group;
}

function buildTvtropesCredit(doc, credit, placement) {
  const group = withPlacement(makeSvgNode(doc, "g", "tvtropes-credit"), placement.dx, placement.dy);
  const leadWidth = credit.siteX - credit.x - 8;
  group.append(makeSvgText(doc, "tvtropes-lead", {
    x: credit.x, y: credit.baseline, "font-size": credit.fontSize, textLength: leadWidth, lengthAdjust: "spacingAndGlyphs",
  }, credit.lead));
  group.append(makeSvgText(doc, "tvtropes-site", {
    x: credit.siteX, y: credit.baseline, "font-size": credit.fontSize,
    textLength: credit.underline.x2 - credit.underline.x1, lengthAdjust: "spacingAndGlyphs",
  }, credit.site));
  group.append(makeSvgNode(doc, "line", "tvtropes-underline", {
    x1: credit.underline.x1, x2: credit.underline.x2, y1: credit.underline.y, y2: credit.underline.y,
  }));
  return group;
}

// ---- revised-layout furniture placement ------------------------------------------------------

/**
 * Where each moved furniture group goes in the revised layout, as translate offsets. Every choice
 * puts the item in space the revised table leaves empty (checked against the tile rectangles).
 */
function revisedFurniturePlacement(furniture, layout) {
  const viewBox = layout.viewBoxFor("revised");
  const genre = layout.blockSpan("genre", "revised");
  const callBox = furniture.SUBTROPE_BOXES.find((box) => box.id === "call-to-adventure-box");
  const wallBox = furniture.SUBTROPE_BOXES.find((box) => box.id === "fourth-wall-box");
  const frame = furniture.OUTLINE_EXAMPLES.frame;
  return {
    titleDx: REVISED_TITLE_LEFT - furniture.POSTER_TITLE.box.x,
    keyDx: REVISED_KEY_LEFT - furniture.KEY_CALLOUT.box.x,
    creditsDx: REVISED_CREDITS_CENTRE - furniture.POSTER_CREDITS.centreX,
    subtrope: {
      [callBox.id]: { dx: genre.x - REVISED_CALL_BOX_GAP - callBox.box.width - callBox.box.x, dy: 0 },
      [wallBox.id]: { dx: REVISED_FOURTH_WALL_BOX.x - wallBox.box.x, dy: REVISED_FOURTH_WALL_BOX.y - wallBox.box.y },
    },
    panel: { dx: (viewBox.w - frame.width) / 2 - frame.x, dy: REVISED_PANEL_TOP - frame.y },
    footer: { dx: (viewBox.w - 1303) / 2, dy: REVISED_FOOTER_DROP },
  };
}

const ORIGINAL_FURNITURE_PLACEMENT = Object.freeze({
  titleDx: 0, keyDx: 0, creditsDx: 0, subtrope: Object.freeze({}), panel: Object.freeze({ dx: 0, dy: 0 }), footer: Object.freeze({ dx: 0, dy: 0 }),
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
  return { x: box.box.x + dx, y: box.box.y + dy, w: box.box.width, h: box.box.height };
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
  layer.append(buildCredits(doc, furniture.POSTER_CREDITS, placement.creditsDx));
  layer.append(buildOutlinePanel(doc, furniture.OUTLINE_EXAMPLES, placement.panel));
  layer.append(buildTvtropesCredit(doc, furniture.TVTROPES_CREDIT, placement.footer));
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
    layer.append(buildTile(doc, element, rect, furniture.ADDED_ELEMENT_CREDIT));
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
