/* ============================================================
   CARTRIDGE · EXPLAINER (ParserShell.spec.md FR-5) — Style, all 7 sweeps
   StyleParser.spec.md §6. Two renderers, chosen by
   R.summary.counts.sweepCategory: "genre" -> findings table +
   rules-extracted (Grammar-style, AD-6 precedent); "register" ->
   traffic-light scorecard. "mixed" runs both, each filtered to its own
   findings (f.cat) so a genre run never leaks into the register scorecard
   or vice versa — the reference slice never exercised 2+ simultaneously
   active sweeps, so this filtering/grouping is new with the follow-up
   extension to all 7 sweeps. Reads only ParseResult + CONTENT (FR-3),
   never the DOM — same as Grammar's own explainer.js.
   ============================================================ */
var EXPLAINER = (function () {
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function excerptText(R, span) {
    var words = [];
    for (var i = span.start; i <= span.end; i++) words.push(R._toks[i].text);
    return words.join(" ");
  }

  var LIGHT = { flag: "🔴", info: "🟡", check: "🟢", na: "⚪" };

  // Which sweep a rule id belongs to, resolved by matching the id's
  // leading section number (e.g. "2.1" -> "2") against the classification
  // that produced it — the same section-number scheme parse() itself uses
  // (StyleParser.spec.md's sweep model), not a CONTENT lookup, so it works
  // for antithesis ids (§8-§12) too, which share no CONTENT.l with their genre.
  function classificationFor(R, ruleId, wantCat) {
    var section = String(ruleId).split(".")[0];
    var found = null;
    (R.summary.classifications || []).forEach(function (c) {
      if (c.cat === wantCat && c.id === section) found = c;
    });
    return found;
  }

  function findingsByCat(R, cat) {
    return R.findings.filter(function (f) { return f.cat === cat; });
  }

  // ---- genre sweep: findings table + rules-extracted (AD-6 precedent) ----
  function genreTable(R) {
    var findings = findingsByCat(R, "genre");
    if (!findings.length) return "<p class=\"muted\">No matches for the selected sweep in this input.</p>";
    var rows = findings.map(function (f) {
      var span = f.spanRef !== undefined ? R.spans[f.spanRef] : { start: f.start, end: f.end };
      var excerpt = excerptText(R, span);
      var content = CONTENT[f.id];
      var suggestion = "";
      if (f.severity === "flag" && content && content.e) {
        var ex = Array.isArray(content.e) ? content.e[0] : content.e;
        suggestion = ex || "";
      } else if (f.severity === "check") {
        suggestion = "recognised register — no rewrite suggested";
      }
      return "<tr><td>“" + esc(excerpt) + "”</td><td>" + esc(f.label) + " (§" + esc(f.id) + ")</td>"
        + "<td>" + Math.round(f.confidence * 100) + "%</td><td>" + esc(suggestion) + "</td></tr>";
    }).join("");
    return "<table class=\"xt\"><thead><tr><th>Excerpt</th><th>Rule</th><th>Confidence</th><th>Suggested revision</th></tr></thead><tbody>" + rows + "</tbody></table>";
  }

  function dedupedIds(findings) {
    var seen = {}, ids = [];
    findings.forEach(function (f) { if (!seen[f.id]) { seen[f.id] = true; ids.push(f.id); } });
    return ids;
  }

  // One dot-point list PER active genre (2+ genres selected together each
  // get their own sub-heading, not one heading borrowing classifications[0]
  // — that was only ever correct for the reference slice's single-genre case).
  function genreRules(R) {
    var ids = dedupedIds(findingsByCat(R, "genre"));
    if (!ids.length) return "";
    var groups = [], groupByLabel = {};
    ids.forEach(function (id) {
      var cls = classificationFor(R, id, "genre");
      var label = cls ? cls.label : "Style";
      if (!groupByLabel[label]) { groupByLabel[label] = []; groups.push(label); }
      groupByLabel[label].push(id);
    });
    return groups.map(function (label) {
      var items = groupByLabel[label].map(function (id) {
        var c = CONTENT[id];
        if (!c) return "";
        var ex = c.e ? (Array.isArray(c.e) ? c.e[0] : c.e) : "";
        return "<li>" + esc(c.n) + " (§" + esc(id) + ") — " + esc(c.d) + (ex ? " <span class=\"ex\">" + esc(ex) + "</span>" : "") + "</li>";
      }).join("");
      return "<div class=\"cat\">" + esc(label) + "</div><ul>" + items + "</ul>";
    }).join("");
  }

  // ---- register sweep: traffic-light scorecard ----
  function registerScorecard(R) {
    var findings = findingsByCat(R, "register");
    var rows = findings.map(function (f) {
      var content = CONTENT[f.id];
      return "<tr><td>" + (LIGHT[f.severity] || "○") + "</td><td>" + esc((content && content.n) || f.label) + " (§" + esc(f.id) + ")</td>"
        + "<td>" + esc(f.explain) + "</td></tr>";
    }).join("");
    return "<table class=\"xt\"><thead><tr><th>Light</th><th>Rule</th><th>Detail / suggestion</th></tr></thead><tbody>" + rows + "</tbody></table>";
  }

  // One "needs attention" list PER active register (Academic English +
  // Simple/Descriptive English selected together each get their own
  // sub-heading, same reasoning as genreRules() above).
  function registerRules(R) {
    var findings = findingsByCat(R, "register");
    var flagged = findings.filter(function (f) { return f.severity === "flag" || f.severity === "info"; });
    if (!flagged.length) return findings.length ? "<div class=\"cat\">All checked rules conform</div>" : "";
    var ids = dedupedIds(flagged);
    var groups = [], groupByLabel = {};
    ids.forEach(function (id) {
      var cls = classificationFor(R, id, "register");
      var label = cls ? cls.label : "Register";
      if (!groupByLabel[label]) { groupByLabel[label] = []; groups.push(label); }
      groupByLabel[label].push(id);
    });
    return groups.map(function (label) {
      var items = groupByLabel[label].map(function (id) {
        var f = flagged.filter(function (x) { return x.id === id; })[0];
        var c = CONTENT[id];
        return "<li>" + esc((c && c.n) || (f && f.label) || id) + " (§" + esc(id) + ") — " + esc((c && c.d) || "") + "</li>";
      }).join("");
      return "<div class=\"cat\">" + esc(label) + " — needs attention</div><ul>" + items + "</ul>";
    }).join("");
  }

  function category(R) { return R.summary.counts && R.summary.counts.sweepCategory; }

  function tables(R) {
    var cat = category(R);
    if (cat === "register") return registerScorecard(R);
    if (cat === "mixed") return genreTable(R) + registerScorecard(R);
    return genreTable(R);
  }

  function rules(R) {
    var cat = category(R);
    if (cat === "register") return registerRules(R);
    if (cat === "mixed") return genreRules(R) + registerRules(R);
    return genreRules(R);
  }

  function toText(R) {
    var lines = [];
    R.findings.forEach(function (f) {
      var content = CONTENT[f.id];
      lines.push((LIGHT[f.severity] || "-") + " " + ((content && content.n) || f.label) + " (§" + f.id + ") — " + f.explain);
    });
    return lines.join("\n");
  }

  function toMarkdown(R) {
    var lines = ["| | Rule | Detail |", "|---|---|---|"];
    R.findings.forEach(function (f) {
      var content = CONTENT[f.id];
      lines.push("| " + (LIGHT[f.severity] || "-") + " | " + ((content && content.n) || f.label) + " (§" + f.id + ") | " + f.explain.replace(/\|/g, "\\|") + " |");
    });
    return lines.join("\n");
  }

  // ---- small required exports (Style has no phrase/POS structure) ----
  function funcOf(R, i) {
    var span = clauseOf(R, i);
    return span ? span.label : "";
  }
  function phraseOf() { return null; }
  function clauseOf(R, i) {
    var found = null;
    (R._clauses || []).forEach(function (c) { if (i >= c.start && i <= c.end) found = c; });
    return found;
  }
  function posShort() { return ""; }
  function needSpace(a, b) {
    if (/^[.,;:!?)]$/.test(b.text)) return false;
    if (/^[("“]$/.test(a.text)) return false;
    return true;
  }

  return {
    tables: tables, rules: rules, toMarkdown: toMarkdown, toText: toText,
    funcOf: funcOf, phraseOf: phraseOf, clauseOf: clauseOf, posShort: posShort, needSpace: needSpace,
  };
})();
