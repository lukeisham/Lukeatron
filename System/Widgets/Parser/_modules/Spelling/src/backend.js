/**
 * backend.js — the injectable DictionaryBackend seam (spec FR-3).
 *
 *   interface DictionaryBackend {
 *     query(word: string): { pos: string|null, rank: number, variant: "AU"|"GB"|"US"|null } | null;
 *     has(word: string): boolean;
 *   }
 *
 * `pos` is always null: SCOWL (the shipped dictionary source, see
 * build/build_spelling_db.py's header) is a plain word list with no
 * part-of-speech data. The field is kept in the return shape for interface
 * compatibility with a future richer source, but nothing in this module
 * reads it today.
 *
 * `createBackend(rawQuery)` is deliberately SQL-engine-agnostic: it takes a
 * plain function `(word) => {rank, variant} | null | undefined` and wraps it
 * in the DictionaryBackend shape. This is what makes TEST-4 possible without
 * a real `.db` — a test supplies a `Map` lookup as `rawQuery`, no SQLite
 * anywhere in the test path.
 *
 * `createSqlJsBackend(sqlJsDatabase)` is the convenience adapter a real host
 * uses: `sqlJsDatabase` is an already-open sql.js `Database` (the module
 * owns its own sql.js wiring per plan D-5 — it never reaches into a host's
 * `LEX` portal). Not exercised by this module's own test suite (TEST-4
 * forbids sql.js in the test path); exercised only by hand in-browser.
 */

/**
 * createBackend(rawQuery) -> DictionaryBackend
 * `rawQuery(lowercasedWord)` must return `{rank, variant}` or a falsy value.
 */
function createBackend(rawQuery) {
  if (typeof rawQuery !== "function") {
    throw new TypeError("createBackend(rawQuery): rawQuery must be a function");
  }

  return {
    query(word) {
      if (typeof word !== "string" || word.length === 0) return null;
      const row = rawQuery(word.toLowerCase());
      if (!row) return null;
      return {
        pos: null,
        rank: row.rank,
        variant: row.variant ?? null,
      };
    },
    has(word) {
      if (typeof word !== "string" || word.length === 0) return false;
      return !!rawQuery(word.toLowerCase());
    },
  };
}

/**
 * createSqlJsBackend(sqlJsDatabase) -> DictionaryBackend
 * Adapts a sql.js `Database` (schema per build/build_spelling_db.py:
 * `words(word_id, word, rank, variant)`, UNIQUE index on `word`) to the
 * DictionaryBackend interface. Uses a single prepared statement, `?`
 * placeholders only (SQL-1/SQL-2) — never string-interpolated SQL.
 */
function createSqlJsBackend(sqlJsDatabase) {
  if (!sqlJsDatabase || typeof sqlJsDatabase.prepare !== "function") {
    throw new TypeError("createSqlJsBackend(sqlJsDatabase): expected an open sql.js Database");
  }

  const stmt = sqlJsDatabase.prepare("SELECT rank, variant FROM words WHERE word = ?");

  return createBackend((word) => {
    stmt.bind([word]);
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.reset();
    return row;
  });
}

/**
 * supportsGzipDecompression() -> boolean
 * Feature-detects the Compression Streams API's `DecompressionStream`
 * (TASK-1, 2026-08-10 test-and-refine pass). This is a pure Streams-API
 * transform with no network/origin gating, so it works on `file://` the
 * same as any other origin — verified in Node (a stand-in for the V8/
 * SpiderMonkey/JSC engines the target browsers embed), not guessed at.
 * Support: Chrome/Edge 80+, Firefox 113+, Safari 16.4+. A host should call
 * this before choosing between the gzip-compressed `.db.gz` payload (small,
 * ~55% of base64-raw, needs this API) and the raw `.db` payload (larger,
 * works everywhere) — see `_modules/Spelling/README.md` "Compression".
 */
function supportsGzipDecompression() {
  return typeof DecompressionStream === "function" && typeof Response === "function";
}

/**
 * decompressGzipBase64(base64Gz) -> Promise<Uint8Array>
 * Decodes a base64 string of gzip-compressed bytes (as produced by
 * `build/build_spelling_db.py`'s `write_gzipped_copy()`, i.e. the contents
 * of `data/spelling.db.gz`) and returns the decompressed raw bytes ready to
 * hand to `sqlJs.Database(bytes)`. Throws if `supportsGzipDecompression()`
 * is false — callers must feature-detect first (JS-2: a guard against a
 * "shouldn't happen" state warns with context) and fall back to shipping
 * the raw uncompressed `.db` base64 instead.
 */
async function decompressGzipBase64(base64Gz) {
  if (!supportsGzipDecompression()) {
    console.warn(
      "decompressGzipBase64: DecompressionStream unavailable in this browser; " +
        "the host must fall back to the raw (uncompressed) spelling.db payload."
    );
    throw new Error("DecompressionStream unsupported");
  }
  const binary = atob(base64Gz);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

export { createBackend, createSqlJsBackend, supportsGzipDecompression, decompressGzipBase64 };
