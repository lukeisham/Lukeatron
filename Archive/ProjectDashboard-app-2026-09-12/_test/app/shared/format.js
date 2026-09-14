// Vocabulary and small pure transforms shared by every view: kind names, effort
// weights, the guessed-vs-stated treatment, depot text cleaning (FR-1h), and the
// stem-grouping rule (FR-0a / FR-6a of styleguide.spec.md and monitor.spec.md).
//
// Every function here is pure — no DOM, no fetch — so it is unit-testable without
// a browser (TEST-8's "fake DOM, not a DOM library" starts by needing as little
// DOM as possible in the first place). `el()` from ./dom.js turns the guessed
// wrapper into an actual node; this file only decides the text and the flag.
//
// Vocabulary here is the documentation spec's glossary (§5) exactly — this is the
// one place kind names are spelled out, so no other module invents its own words.

export const KIND_WAITING = 1;
export const KIND_UNSHAPED = 2;
export const KIND_MINE = 3;
export const KIND_HANDOVER = 4;
export const KIND_INCOMING = 5;

// §5: "1 waiting … 2 unshaped … 3 mine … 4 hand-over … 5 incoming". Used verbatim
// by the print sheet (FR-8, "kinds named in words") and by any screen text that
// names a kind instead of only colouring it.
export const KIND_NAMES = Object.freeze({
  [KIND_WAITING]: "waiting",
  [KIND_UNSHAPED]: "unshaped",
  [KIND_MINE]: "mine",
  [KIND_HANDOVER]: "hand-over",
  [KIND_INCOMING]: "incoming",
});

export function kindName(kind) {
  return KIND_NAMES[kind] ?? "unknown";
}

// model's three effort strings, verbatim (model.py EFFORT_MINUTES/HOUR/SESSION).
// Read here as vocabulary, not derived — the emoji ships from the store's own
// resolved value, this module only ranks it for the effort column (FR-1f).
const EFFORT_WEIGHT = Object.freeze({
  "🏔️ a session": 3,
  "🔨 an hour": 2,
  "⚡ minutes": 1,
});

/** FR-1f's four columns from a three-value scale: heaviest weighs 3, lightest 1,
 * and "no next action" (a plate with nothing open) sorts lightest of all — -1, so
 * it never mixes in among real weights the way model.py's own `_effort_weight`
 * treats the same case for its orderings. */
export function effortWeight(effortValue) {
  return EFFORT_WEIGHT[effortValue] ?? -1;
}

const TOKEN_LABELS = Object.freeze({ little: "little", some: "some", plenty: "plenty" });

export function tokenLabel(tokensValue) {
  return TOKEN_LABELS[tokensValue] ?? tokensValue;
}

/** FR-1h: `queue.md` carries Markdown meant for the text file (bold titles,
 * inline code); a ticker chip renders plain text, so this strips `**bold**` and
 * `` `code` `` before the string reaches a chip. The underlying store text is
 * untouched — only the chip's rendered string is cleaned. */
export function stripMarkdown(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
}

/** A guessed value's presentation: the caller supplies the raw value string and
 * whether it was guessed; this returns `{ text, guessed }` for a view to build a
 * `.guessed` span from (styleguide.md "Guessed, not stated" — a dashed underline
 * in `--ink-guessed`, plus a title naming what was guessed). Kept here rather
 * than returning a DOM node so this file stays DOM-free and testable. */
export function guessedField(value, guessed, whatWasGuessed) {
  return { text: String(value), guessed: Boolean(guessed), title: guessed ? `guessed: ${whatWasGuessed}` : null };
}

/** ISO date -> "6 Sep" for compact on-screen dates. Never used for sorting —
 * every ordering the UI places comes from `model` already sorted (AD-7). */
export function formatShortDate(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function weekdayLabel(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-AU", { weekday: "short", timeZone: "UTC" });
}

// ---------------------------------------------------------------------------
// Stem grouping (styleguide FR-0a, monitor FR-6a) — factor a shared leading
// stem out of three or more sibling strings so a truncated view stops cutting
// exactly where the difference lives (the CH-06 worked example).
// ---------------------------------------------------------------------------

const MIN_GROUP_SIZE = 3;
const MIN_STEM_WORDS = 3;

/**
 * Group sibling items that share a leading run of whole words.
 *
 * @param {{id: string, text: string}[]} items
 * @returns {Array<{type: "group", stem: string, entries: {id: string, suffix: string, text: string}[]}
 *                 | {type: "single", id: string, text: string}>}
 *
 * Rendering rule only (styleguide, "Grouping is the standard answer to
 * repetition") — no store is rewritten, and `text` is always carried through in
 * full for the hover/copy target regardless of grouping.
 */
export function groupByStem(items) {
  const remaining = items.map((item) => ({ ...item, words: item.text.split(/\s+/).filter(Boolean) }));
  const result = [];

  while (remaining.length > 0) {
    const found = findLongestSharedStem(remaining);
    if (!found) {
      for (const item of remaining.splice(0)) result.push({ type: "single", id: item.id, text: item.text });
      break;
    }
    const { stemWords, memberIndexes } = found;
    const stem = stemWords.join(" ");
    const entries = memberIndexes.map((i) => {
      const item = remaining[i];
      const suffix = item.words.slice(stemWords.length).join(" ");
      return { id: item.id, suffix, text: item.text };
    });
    result.push({ type: "group", stem, entries });
    // Remove grouped members, highest index first so earlier indexes stay valid.
    for (const i of [...memberIndexes].sort((a, b) => b - a)) remaining.splice(i, 1);
  }
  return result;
}

/** Longest word-prefix shared by at least MIN_GROUP_SIZE of `remaining`, or null.
 * Searches longest-first so the biggest available stem wins before a shorter,
 * looser one would also qualify. */
function findLongestSharedStem(remaining) {
  const maxWords = Math.max(0, ...remaining.map((item) => item.words.length));
  for (let len = maxWords; len >= MIN_STEM_WORDS; len--) {
    const buckets = new Map(); // stem string -> indexes
    remaining.forEach((item, i) => {
      if (item.words.length <= len) return; // must have at least one differing word left
      const key = item.words.slice(0, len).join(" ");
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(i);
    });
    let best = null;
    for (const [key, indexes] of buckets) {
      if (indexes.length >= MIN_GROUP_SIZE && (!best || indexes.length > best.indexes.length)) {
        best = { key, indexes };
      }
    }
    if (best) return { stemWords: best.key.split(" "), memberIndexes: best.indexes };
  }
  return null;
}
