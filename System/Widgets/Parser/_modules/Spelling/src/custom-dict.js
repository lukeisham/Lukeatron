/**
 * custom-dict.js — the custom dictionary: ignore/learn/unlearn/export/import
 * (spec FR-6, §7). JSON schema is §7's, unchanged from
 * `persistence-ui-testing.md`.
 *
 * IGNORE vs LEARN (§7): ignore() is session-Map-only and NEVER calls
 * `persist` (cleared on reload); learn()/unlearn()/importDictionary() call
 * `persist(fullCustomDictObject)` — the whole object, not a diff — if the
 * host supplied one. `persist` is optional: learn() must never throw when
 * it is omitted (the TEST-7 gate).
 */

const SCHEMA_VERSION = "1.0";

/**
 * createCustomDict(options) -> CustomDict
 * options: { customDict?: object, ignoreSession?: object, persist?: fn }
 */
function createCustomDict(options = {}) {
  const customDict = options.customDict ?? {};
  const ignoreSession = options.ignoreSession ?? {};
  const persist = typeof options.persist === "function" ? options.persist : null;

  function callPersist() {
    // Guard per JS-2: persist is optional by design (spec FR-1), so a
    // missing callback is a valid, silent no-op here — not a "shouldn't
    // happen" state. Only an unexpected throw FROM the callback is worth
    // surfacing, and we let that propagate to the caller rather than
    // swallowing it, since silently eating a host's persistence error
    // would itself violate JS-2.
    if (persist) persist(customDict);
  }

  return {
    ignore(word) {
      if (typeof word !== "string" || word.length === 0) return;
      ignoreSession[word.toLowerCase()] = true;
    },

    isIgnored(word) {
      if (typeof word !== "string") return false;
      return !!ignoreSession[word.toLowerCase()];
    },

    learn(word, caseSensitive = false) {
      if (typeof word !== "string" || word.length === 0) return;
      const key = caseSensitive ? word : word.toLowerCase();
      customDict[key] = {
        addedAt: new Date().toISOString(),
        caseSensitive,
        source: "manual",
      };
      callPersist();
    },

    unlearn(word) {
      if (typeof word !== "string") return;
      delete customDict[word];
      delete customDict[word.toLowerCase()];
      callPersist();
    },

    isLearned(word) {
      if (typeof word !== "string" || word.length === 0) return false;
      const exact = customDict[word];
      if (exact && exact.caseSensitive) return true;
      const lower = customDict[word.toLowerCase()];
      if (lower && !lower.caseSensitive) return true;
      return false;
    },

    exportDictionary() {
      return JSON.stringify(
        { version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), words: customDict },
        null,
        2
      );
    },

    importDictionary(json) {
      let parsed;
      try {
        parsed = JSON.parse(json);
      } catch (err) {
        return { ok: false, added: 0, error: `invalid JSON: ${err.message}` };
      }
      if (!parsed || typeof parsed !== "object" || typeof parsed.words !== "object" || parsed.words === null) {
        return { ok: false, added: 0, error: "missing or invalid 'words' field" };
      }

      const incomingKeys = Object.keys(parsed.words);
      for (const key of incomingKeys) {
        customDict[key] = parsed.words[key];
      }
      callPersist();

      return { ok: true, added: incomingKeys.length };
    },
  };
}

export { createCustomDict, SCHEMA_VERSION };
