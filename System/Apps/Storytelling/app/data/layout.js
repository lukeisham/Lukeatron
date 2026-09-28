/**
 * The revised table as data (diagram spec FR-D11, AD-5). Pure: no DOM, no I/O.
 *
 * One column permutation turns poster positions into the shipped table; the 36 added
 * elements have fixed placements; the Five Man Band sub-tiles mirror about their parent.
 * The generator calls `tileRect` / `viewBoxFor` / `blockSpan` and verify.html calls
 * `checkLayout`, so a later block reorder is a one-line edit here.
 */

const GRID_ORIGIN_X = 29;
const GRID_ORIGIN_Y = 49;
const CELL_WIDTH = 62.1;
const CELL_HEIGHT = 75;

const ORIGINAL_COLUMNS = 20;
const REVISED_COLUMNS = 23;

/** Right margin is the poster's own: 1303 - (29 + 20 * 62.1). */
const VIEWBOX_ORIGINAL = Object.freeze({ x: 0, y: 0, w: 1303, h: 1632 });
const VIEWBOX_REVISED = Object.freeze({ x: 0, y: 0, w: 1489.3, h: 1632 });

/** Poster column i (0-based) -> revised column; `row` is unchanged. */
export const POSTER_TO_REVISED = Object.freeze([
  22, 20, 19, 18, 15, 14, 13, 5, 4, 12, 11, 10, 9, 8, 7, 6, 3, 2, 1, 0,
]);

/** Poster column ranges (inclusive) of each block, as printed on the poster. */
const POSTER_BLOCK_COLUMNS = Object.freeze({
  structureA: [0, 0],
  setting: [1, 1],
  storymod: [2, 2],
  plotdev: [3, 3],
  heroes: [4, 6],
  charmod: [7, 8],
  archetypes: [9, 11],
  villains: [12, 15],
  metatropes: [16, 17],
  production: [18, 18],
  fandom: [19, 19],
});

/** Revised columns of the two blocks that exist only in the revised layout. */
const ADDED_BLOCK_COLUMNS = Object.freeze({
  genre: [16, 17],
  structureB: [21, 21],
});

const ADDED_FIRST_ROW = 2;

/**
 * Where each of the 36 added elements sits in the revised layout, by id.
 * Mirrors `reference/work/added-elements.json` (structureB = column 21; genre1 = 16; genre2 = 17;
 * rows 2-13 top to bottom).
 */
export const ADDED_PLACEMENT = Object.freeze(buildAddedPlacement());

function buildAddedPlacement() {
  const columns = [
    [21, ["Pro", "Imr", "Inc", "Fsh", "Sbp", "Rsa", "Tck", "Rts", "Pt", "Fbk", "Clh", "Epi"]],
    [16, ["Com", "Tra", "Sat", "Rom", "Whd", "Ccs", "Dys", "Hei", "Hor", "Cma", "Rdt", "Sol"]],
    [17, ["Fnt", "Sf", "Wst", "Thr", "Adv", "War", "Esp", "Sup", "Fty", "Gth", "Fnr", "Hfc"]],
  ];
  const placement = {};
  for (const [col, ids] of columns) {
    ids.forEach((id, index) => {
      placement[id] = Object.freeze({ col, row: ADDED_FIRST_ROW + index });
    });
  }
  return placement;
}

/** Sub-tiles hang under a parent; the parent's poster column is a poster fact the rule needs. */
const PARENT_POSTER_COLUMN = Object.freeze({ "5ma": 5 });

const POSTER_ELEMENT_COUNT = 181;

/** Measurement noise: the poster's sub-tiles are 62 apart, a cell is 62.1 wide. */
const OVERLAP_TOLERANCE = 0.5;

const posterBlockByColumn = buildPosterBlockByColumn();

function buildPosterBlockByColumn() {
  const byColumn = [];
  for (const [block, [first, last]] of Object.entries(POSTER_BLOCK_COLUMNS)) {
    for (let col = first; col <= last; col += 1) byColumn[col] = block;
  }
  return Object.freeze(byColumn);
}

const revisedSpans = buildRevisedSpans();
const originalSpans = Object.freeze(
  Object.fromEntries(
    Object.entries(POSTER_BLOCK_COLUMNS).map(([block, [first, last]]) => [block, [first, last]]),
  ),
);

function buildRevisedSpans() {
  const spans = {};
  for (const [block, [first, last]] of Object.entries(POSTER_BLOCK_COLUMNS)) {
    const mapped = [];
    for (let col = first; col <= last; col += 1) mapped.push(POSTER_TO_REVISED[col]);
    spans[block] = [Math.min(...mapped), Math.max(...mapped)];
  }
  for (const [block, range] of Object.entries(ADDED_BLOCK_COLUMNS)) spans[block] = [...range];
  return Object.freeze(spans);
}

function byFirstColumn(spans) {
  return Object.entries(spans)
    .sort(([, a], [, b]) => a[0] - b[0])
    .map(([block]) => block);
}

/** Revised, left to right: fandom, production, metatropes(2), charmod(2), villains(4), archetypes(3), heroes(3), genre(2), plotdev, storymod, setting, structureB, structureA. */
export const REVISED_BLOCK_ORDER = Object.freeze(byFirstColumn(revisedSpans));

/** The poster's own left-to-right order. */
export const ORIGINAL_BLOCK_ORDER = Object.freeze(byFirstColumn(originalSpans));

function assertLayoutName(layoutName) {
  if (layoutName !== "original" && layoutName !== "revised") {
    throw new Error(`layout.js: layoutName must be "original" or "revised", got ${JSON.stringify(layoutName)}`);
  }
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function isGridElement(element) {
  return Number.isInteger(element.col) && Number.isInteger(element.row);
}

function columnRect(col, row) {
  return {
    x: round3(GRID_ORIGIN_X + col * CELL_WIDTH),
    y: round3(GRID_ORIGIN_Y + row * CELL_HEIGHT),
    w: CELL_WIDTH,
    h: CELL_HEIGHT,
  };
}

function parentColumnOf(element) {
  const parentColumn = PARENT_POSTER_COLUMN[element.parent];
  if (parentColumn === undefined) {
    throw new Error(`layout.js: element ${element.id} has unknown parent ${JSON.stringify(element.parent)}`);
  }
  return parentColumn;
}

function subTileRect(element, layoutName) {
  if (!Number.isFinite(element.x) || !Number.isFinite(element.y)) {
    throw new Error(`layout.js: sub-tile ${element.id} needs numeric x and y`);
  }
  if (layoutName === "original") {
    return { x: element.x, y: element.y, w: CELL_WIDTH, h: CELL_HEIGHT };
  }
  const posterParentColumn = parentColumnOf(element);
  const originalParentCentre = GRID_ORIGIN_X + posterParentColumn * CELL_WIDTH + CELL_WIDTH / 2;
  const revisedParentCentre =
    GRID_ORIGIN_X + POSTER_TO_REVISED[posterParentColumn] * CELL_WIDTH + CELL_WIDTH / 2;
  // Reflecting a centre about the parent's centre: new = parent' - (old - parent).
  const originalCentre = element.x + CELL_WIDTH / 2;
  const revisedCentre = revisedParentCentre - (originalCentre - originalParentCentre);
  return { x: round3(revisedCentre - CELL_WIDTH / 2), y: element.y, w: CELL_WIDTH, h: CELL_HEIGHT };
}

function addedCell(element) {
  const cell = ADDED_PLACEMENT[element.id];
  if (!cell) throw new Error(`layout.js: added element ${element.id} has no placement`);
  return cell;
}

/**
 * Rectangle of a tile in viewBox pixels.
 * @param {{id:string, col?:number, row?:number, x?:number, y?:number, parent?:string, added?:boolean}} element
 * @param {"original"|"revised"} layoutName
 * @returns {{x:number, y:number, w:number, h:number} | null} null only for an added element in `original`
 *   (added tiles are not drawn there, AC-D6). Throws for an element it cannot place.
 */
export function tileRect(element, layoutName) {
  assertLayoutName(layoutName);
  if (element.added === true) {
    if (layoutName === "original") return null;
    const { col, row } = addedCell(element);
    return columnRect(col, row);
  }
  if (element.parent !== undefined) return subTileRect(element, layoutName);
  if (!isGridElement(element)) {
    throw new Error(`layout.js: element ${element.id} has neither col/row nor parent`);
  }
  const col = layoutName === "revised" ? POSTER_TO_REVISED[element.col] : element.col;
  if (col === undefined) throw new Error(`layout.js: element ${element.id} has poster column ${element.col} outside 0-19`);
  return columnRect(col, element.row);
}

/**
 * @param {"original"|"revised"} layoutName
 * @returns {{x:number, y:number, w:number, h:number, attr:string}} `attr` is the string for the SVG `viewBox` attribute.
 */
export function viewBoxFor(layoutName) {
  assertLayoutName(layoutName);
  const box = layoutName === "revised" ? VIEWBOX_REVISED : VIEWBOX_ORIGINAL;
  return { ...box, attr: `${box.x} ${box.y} ${box.w} ${box.h}` };
}

/**
 * The block an element belongs to, independent of layout. Poster tiles are placed by poster
 * column (so highlight and paler-villain tiles land in the block they sit in); sub-tiles take
 * their parent's block; added tiles take the block of their placement.
 * @returns {string} a name in `REVISED_BLOCK_ORDER`
 */
export function blockOf(element) {
  if (element.added === true) {
    const { col } = addedCell(element);
    return col === ADDED_BLOCK_COLUMNS.structureB[0] ? "structureB" : "genre";
  }
  const posterCol = element.parent !== undefined ? parentColumnOf(element) : element.col;
  const block = posterBlockByColumn[posterCol];
  if (!block) throw new Error(`layout.js: element ${element.id} has poster column ${element.col} outside 0-19`);
  return block;
}

/**
 * Horizontal extent of a block, for anchoring headings and callouts (FR-D11 d).
 * @returns {{firstCol:number, lastCol:number, columns:number, x:number, w:number} | null} null when the block
 *   does not exist in that layout (genre and structureB have no original position).
 */
export function blockSpan(block, layoutName) {
  assertLayoutName(layoutName);
  const range = (layoutName === "revised" ? revisedSpans : originalSpans)[block];
  if (!range) return null;
  const [firstCol, lastCol] = range;
  const columns = lastCol - firstCol + 1;
  return { firstCol, lastCol, columns, x: round3(GRID_ORIGIN_X + firstCol * CELL_WIDTH), w: round3(columns * CELL_WIDTH) };
}

function layoutRectsOverlap(a, b) {
  const across = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const down = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return across > OVERLAP_TOLERANCE && down > OVERLAP_TOLERANCE;
}

function placeAll(elements, layoutName, problems) {
  const placed = [];
  for (const element of elements) {
    if (layoutName === "original" && element.added === true) continue;
    try {
      const rect = tileRect(element, layoutName);
      placed.push({ element, rect, block: blockOf(element) });
    } catch (error) {
      problems.push(`${element.id}: ${error.message}`);
    }
  }
  return placed;
}

function checkIds(placed, problems) {
  const seen = new Set();
  for (const { element } of placed) {
    if (seen.has(element.id)) problems.push(`duplicate id ${element.id}`);
    seen.add(element.id);
  }
}

function checkCounts(elements, layoutName, problems) {
  const poster = elements.filter((element) => element.added !== true);
  if (poster.length !== POSTER_ELEMENT_COUNT) {
    problems.push(`expected ${POSTER_ELEMENT_COUNT} poster elements, found ${poster.length}`);
  }
  for (const element of poster.filter((el) => el.parent !== undefined)) {
    const parent = poster.find((el) => el.id === element.parent);
    if (!parent) problems.push(`sub-tile ${element.id} has no parent element ${element.parent} in the data`);
    else if (parent.col !== PARENT_POSTER_COLUMN[element.parent]) {
      problems.push(`parent ${parent.id} is at poster column ${parent.col}, layout.js assumes ${PARENT_POSTER_COLUMN[element.parent]}`);
    }
  }
  if (layoutName !== "revised") return;
  const presentAdded = new Set(elements.filter((el) => el.added === true).map((el) => el.id));
  for (const id of Object.keys(ADDED_PLACEMENT)) {
    if (!presentAdded.has(id)) problems.push(`missing added element ${id}`);
  }
}

function checkOverlaps(placed, problems) {
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i];
      const b = placed[j];
      if (layoutRectsOverlap(a.rect, b.rect)) {
        problems.push(`${a.element.id} and ${b.element.id} share a cell or overlap near (${a.rect.x}, ${a.rect.y})`);
      }
    }
  }
}

function checkInsideViewBox(placed, layoutName, problems) {
  const box = viewBoxFor(layoutName);
  for (const { element, rect } of placed) {
    const outside = rect.x < box.x || rect.y < box.y || rect.x + rect.w > box.x + box.w || rect.y + rect.h > box.y + box.h;
    if (outside) problems.push(`${element.id} lies outside the viewBox`);
  }
}

function occupiedColumnsByBlock(placed) {
  const byBlock = new Map();
  for (const { element, rect, block } of placed) {
    if (element.parent !== undefined) continue; // hanging tiles sit outside the grid columns
    const col = Math.round((rect.x - GRID_ORIGIN_X) / CELL_WIDTH);
    if (!byBlock.has(block)) byBlock.set(block, new Set());
    byBlock.get(block).add(col);
  }
  return byBlock;
}

function checkBlocks(placed, layoutName, problems) {
  const spans = layoutName === "revised" ? revisedSpans : originalSpans;
  const occupied = occupiedColumnsByBlock(placed);
  for (const [block, [first, last]] of Object.entries(spans)) {
    const columns = occupied.get(block);
    if (!columns) {
      if (layoutName === "revised" || POSTER_BLOCK_COLUMNS[block]) problems.push(`block ${block} has no tiles`);
      continue;
    }
    for (let col = first; col <= last; col += 1) {
      if (!columns.has(col)) problems.push(`block ${block} is not contiguous: column ${col} is empty`);
    }
    for (const col of columns) {
      if (col < first || col > last) problems.push(`block ${block} has a tile in column ${col}, outside its columns ${first}-${last}`);
    }
  }
}

function checkColumnTotals(placed, layoutName, problems) {
  const used = new Set();
  for (const columns of occupiedColumnsByBlock(placed).values()) for (const col of columns) used.add(col);
  const expected = layoutName === "revised" ? REVISED_COLUMNS : ORIGINAL_COLUMNS;
  for (let col = 0; col < expected; col += 1) {
    if (!used.has(col)) problems.push(`column ${col} of ${expected} is empty`);
  }
  for (const col of used) {
    if (col >= expected) problems.push(`tile in column ${col}, beyond the ${expected} columns`);
  }
}

function checkRightHandBlock(layoutName, problems) {
  if (layoutName !== "revised") return;
  const first = revisedSpans.genre[0];
  const last = revisedSpans.structureA[1];
  if (last - first + 1 !== 7) problems.push(`right-hand block (genre to structure) is ${last - first + 1} columns, expected 7`);
}

function checkMirroredSubTiles(placed, layoutName, problems) {
  if (layoutName !== "revised") return;
  for (const { element, rect } of placed.filter((item) => item.element.parent !== undefined)) {
    const original = tileRect(element, "original");
    const parentColumn = parentColumnOf(element);
    const originalOffset = original.x + CELL_WIDTH / 2 - (GRID_ORIGIN_X + parentColumn * CELL_WIDTH + CELL_WIDTH / 2);
    const revisedOffset = rect.x + CELL_WIDTH / 2 - (GRID_ORIGIN_X + POSTER_TO_REVISED[parentColumn] * CELL_WIDTH + CELL_WIDTH / 2);
    if (Math.abs(originalOffset + revisedOffset) > 0.01) problems.push(`sub-tile ${element.id} is not mirrored about ${element.parent}`);
  }
}

/**
 * The layout check of FR-D7 / AC-D5: places every element and reports what is wrong.
 * In `original` the added elements are skipped, since that layout does not draw them.
 * @param {Array<object>} elements the full element list (poster and added)
 * @param {"original"|"revised"} layoutName
 * @returns {string[]} problems, empty when the layout is sound
 */
export function checkLayout(elements, layoutName) {
  assertLayoutName(layoutName);
  const problems = [];
  checkCounts(elements, layoutName, problems);
  const placed = placeAll(elements, layoutName, problems);
  checkIds(placed, problems);
  checkOverlaps(placed, problems);
  checkInsideViewBox(placed, layoutName, problems);
  checkBlocks(placed, layoutName, problems);
  checkColumnTotals(placed, layoutName, problems);
  checkRightHandBlock(layoutName, problems);
  checkMirroredSubTiles(placed, layoutName, problems);
  return problems;
}

/** Everything the generator needs, gathered (FR-D11). */
export const LAYOUT = Object.freeze({
  POSTER_TO_REVISED,
  ADDED_PLACEMENT,
  REVISED_BLOCK_ORDER,
  ORIGINAL_BLOCK_ORDER,
  geometry: Object.freeze({
    originX: GRID_ORIGIN_X,
    originY: GRID_ORIGIN_Y,
    cellWidth: CELL_WIDTH,
    cellHeight: CELL_HEIGHT,
    originalColumns: ORIGINAL_COLUMNS,
    revisedColumns: REVISED_COLUMNS,
  }),
  tileRect,
  viewBoxFor,
  blockOf,
  blockSpan,
  checkLayout,
});
