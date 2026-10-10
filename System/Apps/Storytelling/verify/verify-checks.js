/**
 * Pure logic for the verification page. No DOM, no I/O,
 * so `tests/verify-checks.test.js` can run it under node.
 */

/** Per-channel tolerance for the colour check. */
export const CHANNEL_TOLERANCE = 6;

/** Sample this many source pixels in from a tile's top-left corner: clear of the centred symbol and the top-right popularity. */
export const SAMPLE_INSET = 4;

export const EXPECTED_POSTER_COUNT = 181;
export const EXPECTED_ADDED_COUNT = 36;

export const RESULT_PASS = "pass";
export const RESULT_FAIL = "fail";
export const RESULT_ACCEPTED = "accepted difference";
const RESULT_VALUES = Object.freeze([RESULT_PASS, RESULT_FAIL, RESULT_ACCEPTED]);

/**
 * The source pixel to sample for a tile: a fixed inset from its top-left corner,
 * always inside the rectangle.
 * @param {{x:number, y:number, w:number, h:number}} rect tile rectangle in source pixels
 * @param {number} [inset]
 * @returns {{x:number, y:number}} integer pixel coordinates
 */
export function sampleInsetPoint(rect, inset = SAMPLE_INSET) {
  if (!(rect.w > 2) || !(rect.h > 2)) {
    throw new Error(`verify-checks: tile rectangle too small to sample (${rect.w} x ${rect.h})`);
  }
  const dx = Math.min(inset, rect.w / 2);
  const dy = Math.min(inset, rect.h / 2);
  return { x: Math.floor(rect.x + dx), y: Math.floor(rect.y + dy) };
}

/**
 * True when every RGB channel of `a` is within `tolerance` of `b` (inclusive).
 * @param {number[]} a [r, g, b]
 * @param {number[]} b [r, g, b]
 * @param {number} [tolerance]
 */
export function channelsWithin(a, b, tolerance = CHANNEL_TOLERANCE) {
  if (a.length < 3 || b.length < 3) throw new Error("verify-checks: a colour needs three channels");
  return [0, 1, 2].every((i) => Math.abs(a[i] - b[i]) <= tolerance);
}

/**
 * Reads the colour a browser reports from getComputedStyle: "rgb(r, g, b)" or "rgba(r, g, b, a)".
 * @param {string} text
 * @returns {number[] | null} [r, g, b], or null for anything else (for example "none")
 */
export function parseCssRgb(text) {
  const match = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(String(text).trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/**
 * Compares the source pixel with the SVG tile's computed fill.
 * @param {number[]} sourceRgb
 * @param {string} computedFill
 * @returns {{status:"pass"|"fail"|"unreadable", svgRgb:number[]|null}}
 */
export function colourVerdict(sourceRgb, computedFill) {
  const svgRgb = parseCssRgb(computedFill);
  if (svgRgb === null) return { status: "unreadable", svgRgb: null };
  return { status: channelsWithin(sourceRgb, svgRgb) ? "pass" : "fail", svgRgb };
}

/**
 * The count check: poster elements in the data against the number counted in the source,
 * and added elements counted apart (they have no source).
 * @param {Array<{added?:boolean}>} elements
 * @param {{sourceCount?:number, expectedAdded?:number}} [options]
 */
export function countCheck(elements, { sourceCount = EXPECTED_POSTER_COUNT, expectedAdded = EXPECTED_ADDED_COUNT } = {}) {
  const added = elements.filter((element) => element.added === true).length;
  const poster = elements.length - added;
  return {
    poster,
    added,
    total: elements.length,
    sourceCount,
    expectedAdded,
    posterOk: poster === sourceCount,
    addedOk: added === expectedAdded,
    ok: poster === sourceCount && added === expectedAdded,
  };
}

function cell(text) {
  return String(text ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

/**
 * Markdown for pasting into results.md: one table row per element, then totals.
 * @param {Array<{id:string, name:string, popText?:string, colour?:string, result?:string}>} rows
 * @returns {string}
 */
export function resultsMarkdown(rows) {
  const lines = ["| Id | Name | Popularity | Colour | Result |", "| --- | --- | --- | --- | --- |"];
  for (const row of rows) {
    lines.push(`| ${cell(row.id)} | ${cell(row.name)} | ${cell(row.popText)} | ${cell(row.colour)} | ${cell(row.result)} |`);
  }
  const count = (value) => rows.filter((row) => row.result === value).length;
  const unchecked = rows.filter((row) => !RESULT_VALUES.includes(row.result)).length;
  lines.push(
    "",
    `Totals: ${rows.length} elements — ${count(RESULT_PASS)} pass, ${count(RESULT_FAIL)} fail, ` +
      `${count(RESULT_ACCEPTED)} accepted difference, ${unchecked} unchecked.`,
  );
  return lines.join("\n") + "\n";
}

/**
 * The poster elements only (the added ones have no source and are exempt from the fidelity check).
 * @param {Array<{added?:boolean}>} elements
 */
export function posterElements(elements) {
  return elements.filter((element) => element.added !== true);
}

/**
 * A blank results table: a row for each of the poster elements (181), result and colour left empty.
 * Added elements are checked by the layout check and are not listed.
 * @param {Array<{id:string, name:string, popText?:string, added?:boolean}>} elements
 */
export function emptyResultsTemplate(elements) {
  const rows = posterElements(elements).map((element) => ({
    id: element.id,
    name: element.name,
    popText: element.popText,
    colour: "",
    result: "",
  }));
  return resultsMarkdown(rows);
}
