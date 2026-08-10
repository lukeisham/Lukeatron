/**
 * index.js — createSpellingModule factory (spec FR-1). The module's single
 * public entry point; no globals leaked beyond what a host explicitly
 * binds (e.g. an IIFE wrapper assigning `window.SpellingModule` at build
 * time — that wiring lives in the assembler, not here).
 */
import { tokenize } from "./tokenizer.js";
import { check as rulesCheck, classifyWord } from "./rules.js";
import { suggest as suggestWords } from "./suggest.js";
import { createCustomDict } from "./custom-dict.js";
import { createBackend } from "./backend.js";
import { renderHighlights, showSuggestions, supportsHighlightAPI, replaceWord } from "./ui.js";

const SUPPORTED_VARIANTS = new Set(["en-AU", "en-GB", "en-US", "auto"]);

/** A DictionaryBackend that never finds anything — used when no backend is
 * supplied and the host hasn't wired one in yet; keeps the module usable
 * (tokenizer/UI/custom-dict all still work) instead of throwing at
 * construction time. */
const NULL_BACKEND = createBackend(() => null);

/**
 * createSpellingModule(options) -> SpellingModule  (spec FR-1)
 */
function createSpellingModule(options = {}) {
  if (options.variant !== undefined && !SUPPORTED_VARIANTS.has(options.variant)) {
    console.warn(
      `SpellingModule: unknown variant "${options.variant}", falling back to "en-AU"`
    );
  }
  const variant = SUPPORTED_VARIANTS.has(options.variant) ? options.variant : "en-AU";

  const backend = options.backend ?? NULL_BACKEND;
  const doc = options.document; // may be undefined; ui.js resolves a default

  const customDict = createCustomDict({
    customDict: options.customDict,
    ignoreSession: options.ignoreSession,
    persist: options.persist,
  });

  const ruleCtx = {
    backend,
    isIgnored: (w) => customDict.isIgnored(w),
    isLearned: (w) => customDict.isLearned(w),
  };

  function lookup(word) {
    if (typeof word !== "string" || word.length === 0) return null;
    const row = backend.query(word.toLowerCase());
    if (row) return { known: true, pos: row.pos, rank: row.rank, variant: row.variant };
    if (customDict.isLearned(word) || customDict.isIgnored(word)) return { known: true };
    return { known: false };
  }

  function check(text) {
    const tokens = tokenize(text);
    return rulesCheck(tokens, ruleCtx);
  }

  function suggest(word, limit = 3) {
    return suggestWords(word, backend, limit);
  }

  function isValid(word) {
    if (typeof word !== "string" || word.length === 0) return false;
    return classifyWord(word, ruleCtx).accepted;
  }

  return {
    // FR-2/FR-4/FR-5/FR-7
    lookup,
    check,
    suggest,
    isValid,
    // FR-6
    ignore: (w) => customDict.ignore(w),
    isIgnored: (w) => customDict.isIgnored(w),
    learn: (w, caseSensitive = false) => customDict.learn(w, caseSensitive),
    unlearn: (w) => customDict.unlearn(w),
    isLearned: (w) => customDict.isLearned(w),
    exportDictionary: () => customDict.exportDictionary(),
    importDictionary: (json) => customDict.importDictionary(json),
    // FR-8
    tokenize,
    // FR-9/FR-10/FR-11
    renderHighlights: (inputEl, tokens) => renderHighlights(inputEl, tokens, { document: doc }),
    showSuggestions: (word, anchorEl, actions) =>
      showSuggestions(word, anchorEl, actions, { document: doc, getSuggestions: (w) => suggest(w) }),
    supportsHighlightAPI,
    replaceWord: (range, replacement) => replaceWord(range, replacement, doc),
    // misc
    variant,
  };
}

export { createSpellingModule };
