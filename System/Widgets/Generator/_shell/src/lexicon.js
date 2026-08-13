/* ============================================================
   SHELL · LEXICON PORTAL (GeneratorShell.spec.md FR-7)
   sql.js-backed embedded SQLite lexicon. A cartridge with
   lexicon.enabled:false in its manifest never calls this; LEX.ready
   stays false and every query returns null. Never edited per
   cartridge — the query shape (word, pos, alt, feat, rank) is the
   one contract every cartridge lexicon.db must satisfy.
   ============================================================ */
var LEX = { db: null, ready: false, morphOnly: false, count: "?", cache: {} };

function b64bytes(b64) {
  var bin = atob(b64), u = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

LEX.query = function (word) {
  if (word in LEX.cache) return LEX.cache[word];
  var out = null;
  if (LEX.db) {
    try {
      var st = LEX.db.prepare("SELECT pos,alt,feat,rank FROM lexicon WHERE word=?");
      st.bind([word]);
      if (st.step()) {
        var r = st.getAsObject();
        out = { pos: r.pos, alt: r.alt ? r.alt.split(",") : [], feat: r.feat ? r.feat.split(",") : [], rank: r.rank };
      }
      st.free();
    } catch (e) {
      console.warn("LEX.query failed for word:", word, e);
    }
  }
  LEX.cache[word] = out;
  return out;
};

LEX.has = function (word) { return !!LEX.query(word); };

LEX.init = function (cb) {
  if (typeof LEXDB_B64 === "undefined" || !LEXDB_B64 || LEXDB_B64.indexOf("__") === 0) {
    LEX.morphOnly = true; cb(); return;
  }
  try {
    initSqlJs({ wasmBinary: b64bytes(SQLJS_WASM_B64).buffer }).then(function (SQL) {
      LEX.db = new SQL.Database(b64bytes(LEXDB_B64));
      var st = LEX.db.prepare("SELECT value FROM meta WHERE key='entries'");
      if (st.step()) LEX.count = st.getAsObject().value;
      st.free();
      LEX.ready = true;
      cb();
    }).catch(function (e) {
      console.warn("LEX.init: sql.js load failed, falling back to morphology-only mode", e);
      LEX.morphOnly = true; cb();
    });
  } catch (e) {
    console.warn("LEX.init: sql.js unavailable, falling back to morphology-only mode", e);
    LEX.morphOnly = true; cb();
  }
};
