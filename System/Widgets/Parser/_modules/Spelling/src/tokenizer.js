/**
 * tokenizer.js — the Spelling module's own tokenizer (spec FR-8, plan D-5).
 *
 * Self-contained: does not call any host's `ENGINE.tokenize()`. This is the
 * one dependency plan D-5 explicitly cuts, so the module works standalone.
 *
 * tokenize(text) -> SpellToken[]  where SpellToken = {text, start, end, isWord}
 * Offsets are character-accurate against the ORIGINAL input string.
 */

// Curly apostrophes normalise to straight ones for boundary detection only
// (rule 1) — both are single UTF-16 code units, so the substitution never
// shifts offsets, and the token `text` below is sliced from the ORIGINAL
// string so a returned token still shows the user's own curly quote.
const CURLY_APOSTROPHE_RE = /[’‘]/g;

function normalizeApostrophes(text) {
  return text.replace(CURLY_APOSTROPHE_RE, "'");
}

// One master regex, alternatives tried left-to-right at each position —
// this IS the rule-order from FR-8 (url/email/number win over a generic
// word run; a word run itself absorbs contractions, hyphenated compounds,
// and ALL-CAPS-with-trailing-digits in one match, since none of those need
// a different token *boundary*, only different downstream classification).
const URL_ALT = String.raw`https?:\/\/\S+|www\.[^\s]+`;
const EMAIL_ALT = String.raw`[\w.+-]+@[\w-]+\.[\w.-]+`;
const NUMBER_ALT = String.raw`\d+(?:[.,]\d+)*`;
// letters, optionally joined by ' or - to more letters (contractions,
// hyphenated compounds), optionally followed by trailing digits (NASA2).
const WORD_ALT = String.raw`[A-Za-z]+(?:['-][A-Za-z]+)*\d*`;
const WHITESPACE_ALT = String.raw`\s+`;
const PUNCT_ALT = String.raw`[^\sA-Za-z0-9]+`;

const TOKEN_RE = new RegExp(
  `(${URL_ALT})|(${EMAIL_ALT})|(${NUMBER_ALT})|(${WORD_ALT})|(${WHITESPACE_ALT})|(${PUNCT_ALT})`,
  "g"
);

/**
 * tokenize(text: string) -> SpellToken[]
 */
function tokenize(text) {
  if (typeof text !== "string" || text.length === 0) return [];

  const normalized = normalizeApostrophes(text);
  const tokens = [];
  TOKEN_RE.lastIndex = 0;

  let match;
  while ((match = TOKEN_RE.exec(normalized)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    // group 4 is the WORD_ALT capture -> the only isWord:true class.
    const isWord = match[4] !== undefined;
    tokens.push({
      text: text.slice(start, end),
      start,
      end,
      isWord,
    });
  }

  return tokens;
}

/** isAllCaps(word) -> true for a run of 2+ uppercase letters, optional
 * trailing digits (FR-8 rule 7 / §4 rule 3), e.g. "NASA", "NASA2". */
function isAllCaps(word) {
  return /^[A-Z]{2,}\d*$/.test(word);
}

/** isCamelCase(word) -> true for a mixed-case run that is not simple
 * sentence-case (single leading capital, rest lowercase) — catches
 * "iPhone", "getElementById" (FR-8 rule 8 / §4 rule 4). Requires 4+ chars
 * per the research's CamelCase exception threshold. */
function isCamelCase(word) {
  if (word.length < 4) return false;
  if (!/[a-z]/.test(word) || !/[A-Z]/.test(word)) return false;
  return !/^[A-Z][a-z]*$/.test(word);
}

/** isContraction(word) -> true if the token contains an apostrophe within
 * a run of letters (FR-8 rule 5 / §4 rule 7). */
function isContraction(word) {
  return word.includes("'");
}

/** isHyphenatedCompound(word) -> true if the token contains a hyphen within
 * a run of letters (FR-8 rule 6 / §4 rule 8). */
function isHyphenatedCompound(word) {
  return word.includes("-");
}

export {
  tokenize,
  normalizeApostrophes,
  isAllCaps,
  isCamelCase,
  isContraction,
  isHyphenatedCompound,
};
