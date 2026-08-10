/**
 * rules.js — the misspelled-or-not pass (spec §4, FR-4, FR-7).
 *
 * Rule order (first match wins, "accept" = not misspelled), ten rules per
 * spec §4.
 *
 * MEASURED DEVIATION from §4 as literally written (documented per the task
 * brief's "say so and explain what you built instead" instruction): §4 has
 * no rule that exempts a capitalised proper noun that (a) is not literally
 * in the dictionary and (b) is not sentence-initial — which is most proper
 * nouns in running text ("I visited Melbourne last year"). The shipped
 * dictionary deliberately excludes SCOWL's higher-tier proper-names lists
 * (see build/build_spelling_db.py's DEFAULT_CATEGORIES comment) — common
 * world place/person names like "Melbourne" or "London" only appear in
 * SCOWL at tier 80+, tens of thousands of extra entries past the file-size
 * budget. bench/benchmark.mjs's first run measured a 65.8% false-positive
 * rate on a 231-word proper-noun/jargon holdout without a fix for this.
 * Given spec §4's own framing — false positives are "the primary failure
 * mode... weighted above suggestion recall" — rule 5 is widened here to
 * accept any simple Title-Case token (one leading capital, rest lowercase,
 * 3+ letters) at a NON-sentence-initial position. Sentence-initial position
 * keeps the spec's exact literal behaviour — "Teh" at a sentence start must
 * still flag, per §4's own worked example — because check() (below) tracks
 * sentence boundaries and only applies the widened exemption when a token
 * is not the first word of its sentence, where "this looks like a proper
 * noun" is a much safer inference. Re-measured false-positive rate after
 * this change is recorded in README.md; if it still exceeds the 2% budget,
 * the next lever is re-adding SCOWL's proper-names at a higher tier, not
 * further loosening this rule.
 */

import {
  isAllCaps,
  isCamelCase,
  isContraction,
  isHyphenatedCompound,
} from "./tokenizer.js";

// Longest-suffix-first so "-ness" isn't mistaken for a stray "-s" strip.
const SUFFIXES_LONGEST_FIRST = [
  "tion", "ness", "ment",
  "ity", "ful", "ize", "ise", "ing", "est",
  "ed", "er", "es", "ly",
  "s",
];

const CONTRACTION_WHITELIST = new Set([
  "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't",
  "haven't", "hasn't", "hadn't", "won't", "wouldn't", "can't", "couldn't",
  "shouldn't", "mustn't", "it's", "that's", "there's", "here's", "what's",
  "who's", "let's", "i'm", "you're", "we're", "they're", "i've", "you've",
  "we've", "they've", "i'd", "you'd", "he'd", "she'd", "we'd", "they'd",
  "i'll", "you'll", "he'll", "she'll", "we'll", "they'll", "y'all",
  "o'clock", "ma'am",
]);

// Title-Case shape used by the widened rule 5: one leading capital, rest
// lowercase, 3+ letters — e.g. "Melbourne", "Shakespeare".
const TITLE_CASE_RE = /^[A-Z][a-z]{2,}$/;

function isTitleCaseWord(word) {
  return TITLE_CASE_RE.test(word);
}

/** rule 6 — morphological variants (suffix strip, e-drop, doubled-consonant
 * undo, y<->ies). Operates on an already-lowercased word. */
function isMorphologicallyValid(word, backend) {
  if (word.endsWith("ies") && word.length > 4) {
    if (backend.has(word.slice(0, -3) + "y")) return true;
  }
  for (const suf of SUFFIXES_LONGEST_FIRST) {
    if (word.length <= suf.length + 2 || !word.endsWith(suf)) continue;
    const base = word.slice(0, -suf.length);
    if (backend.has(base)) return true;
    if (backend.has(base + "e")) return true; // e-drop: "making" -> "mak" + "e"
    const last = base[base.length - 1];
    const secondLast = base[base.length - 2];
    if (base.length > 2 && last === secondLast && backend.has(base.slice(0, -1))) {
      return true; // doubled consonant: "running" -> "runn" -> "run"
    }
  }
  return false;
}

/** rule 7 — contractions: whole-token whitelist, else naive split. */
function isValidContraction(lowerWord, backend) {
  if (CONTRACTION_WHITELIST.has(lowerWord)) return true;
  const parts = lowerWord.split("'");
  if (parts.length !== 2) return false;
  const [head, tail] = parts;
  if (!backend.has(head)) return false;
  const commonClitics = new Set(["s", "t", "d", "ll", "re", "ve", "m"]);
  return commonClitics.has(tail) || backend.has(tail);
}

/** rule 8 — hyphenated compounds: every '-'-separated part passes rule 1 or 6. */
function isValidHyphenatedCompound(lowerWord, backend) {
  const parts = lowerWord.split("-").filter(Boolean);
  if (parts.length < 2) return false;
  return parts.every((p) => backend.has(p) || isMorphologicallyValid(p, backend));
}

/**
 * classifyWord(word, ctx, position) -> { accepted: boolean, rule?: number }
 * ctx = { backend: DictionaryBackend, isIgnored: (w)=>bool, isLearned: (w)=>bool }
 * position = { sentenceInitial?: boolean } — see file header re: rule 5.
 */
function classifyWord(word, ctx, position = {}) {
  const lower = word.toLowerCase();

  if (ctx.backend.has(lower)) return { accepted: true, rule: 1 };
  if (ctx.isIgnored(word) || ctx.isLearned(word)) return { accepted: true, rule: 2 };
  if (isAllCaps(word)) return { accepted: true, rule: 3 };
  if (isCamelCase(word)) return { accepted: true, rule: 4 };
  if (!position.sentenceInitial && isTitleCaseWord(word)) return { accepted: true, rule: 5 };
  if (isMorphologicallyValid(lower, ctx.backend)) return { accepted: true, rule: 6 };
  if (isContraction(word) && isValidContraction(lower, ctx.backend)) {
    return { accepted: true, rule: 7 };
  }
  if (isHyphenatedCompound(word) && isValidHyphenatedCompound(lower, ctx.backend)) {
    return { accepted: true, rule: 8 };
  }
  return { accepted: false };
}

const SENTENCE_BOUNDARY_RE = /[.!?\n]/;

/**
 * check(tokens, ctx) -> MisspelledToken[]
 * `tokens` is the tokenizer's SpellToken[] output. `ctx` is the same shape
 * classifyWord takes. Returns entries for words that fail every rule
 * (`{word, start, end}`) AND, separately, immediately-repeated words
 * (`{word, start, end, kind: "repeat"}`, spec §4 rule 9) — a repeat can fire
 * even on a correctly-spelled word, so it is not gated on classifyWord's
 * result.
 */
function check(tokens, ctx) {
  const findings = [];
  let previousWordToken = null;
  let previousWasSentenceBoundary = true;

  for (const token of tokens) {
    if (!token.isWord) {
      if (SENTENCE_BOUNDARY_RE.test(token.text)) previousWasSentenceBoundary = true;
      continue;
    }

    if (
      previousWordToken &&
      previousWordToken.text.toLowerCase() === token.text.toLowerCase() &&
      !previousWasSentenceBoundary
    ) {
      findings.push({ word: token.text, start: token.start, end: token.end, kind: "repeat" });
    }

    const decision = classifyWord(token.text, ctx, { sentenceInitial: previousWasSentenceBoundary });
    if (!decision.accepted) {
      findings.push({ word: token.text, start: token.start, end: token.end });
    }

    previousWordToken = token;
    previousWasSentenceBoundary = false;
  }

  return findings;
}

export {
  check,
  classifyWord,
  isMorphologicallyValid,
  isValidContraction,
  isValidHyphenatedCompound,
};
