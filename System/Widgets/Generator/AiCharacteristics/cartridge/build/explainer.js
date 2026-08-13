/* AiCharacteristics EXPLAINER — GeneratorShell.spec.md FR-5/AD-1 (nine
   required exports). Every characteristic ENGINE can flag has a matching
   CONTENT entry here it can render the "why an LLM favours this" account
   from — the honesty caveat (CONTENT["0.1"]) is rendered first, every
   time, in both tables() and rules(). */
var EXPLAINER = (function () {
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function caveatHtml() {
    var c = CONTENT["0.1"];
    return '<p class="ai-caveat"><strong>' + esc(c ? c.n : "Read this first") + ":</strong> " + esc(c ? c.d : "") + "</p>";
  }

  function detectionTypeOf(id) {
    return (CONTENT[id] && CONTENT[id].detectionType) || "LOCAL";
  }

  function tables(R) {
    var rows = R.findings.filter(function (f) { return f.id !== "0.1"; });
    if (!rows.length) {
      return caveatHtml() + "<p>No seeded characteristic matched this text.</p>";
    }
    var byId = {};
    rows.forEach(function (f) { (byId[f.id] = byId[f.id] || []).push(f); });
    var html = caveatHtml() + '<table class="xt"><tr><th>Characteristic</th><th>Category</th><th>Detection</th><th>Confidence</th><th>Occurrences</th></tr>';
    Object.keys(byId).forEach(function (id) {
      var group = byId[id], c = CONTENT[id];
      var confPct = Math.round((group[0].confidence || 0) * 100);
      html += "<tr><td>" + esc((c && c.n) || group[0].label) + "</td><td>" + esc((c && c.category) || "") +
        "</td><td>" + esc(detectionTypeOf(id)) + "</td><td>" + confPct + "%</td><td>" + group.length + "</td></tr>";
    });
    html += "</table>";
    return html;
  }

  function rules(R) {
    var ids = [];
    var seen = {};
    R.findings.forEach(function (f) {
      if (f.id === "0.1" || seen[f.id]) return;
      seen[f.id] = true;
      ids.push(f.id);
    });
    var html = caveatHtml();
    if (!ids.length) return html + "<p>No seeded characteristic matched this text — that is itself weak evidence either way (see caveat above).</p>";
    var byCategory = {};
    ids.forEach(function (id) {
      var c = CONTENT[id];
      var cat = (c && c.category) || "Other";
      (byCategory[cat] = byCategory[cat] || []).push(id);
    });
    Object.keys(byCategory).forEach(function (cat) {
      html += '<div class="cat">' + esc(cat) + "</div><ul>";
      byCategory[cat].forEach(function (id) {
        var c = CONTENT[id];
        if (!c) return;
        html += "<li><strong>" + esc(c.n) + "</strong> (" + esc(c.confidenceTier || "?") + " confidence) — " + esc(c.d) +
          (c.e ? ' <span class="ex">e.g. ' + esc(c.e) + "</span>" : "") +
          (c.why ? "<br><em>Why a model does this:</em> " + esc(c.why) : "") + "</li>";
      });
      html += "</ul>";
    });
    return html;
  }

  function toMarkdown(R) {
    var c0 = CONTENT["0.1"];
    var lines = ["# " + R.meta.asset + " — explainer", "", "**" + (c0 ? c0.n : "Read this first") + ":** " + (c0 ? c0.d : ""), ""];
    var seen = {};
    R.findings.forEach(function (f) {
      if (f.id === "0.1" || seen[f.id]) return;
      seen[f.id] = true;
      var c = CONTENT[f.id];
      lines.push("## " + (c ? c.n : f.label) + (c && c.confidenceTier ? " (" + c.confidenceTier + " confidence)" : ""));
      if (c) lines.push(c.d);
      if (c && c.why) lines.push("Why a model does this: " + c.why);
      lines.push("");
    });
    if (Object.keys(seen).length === 0) lines.push("No seeded characteristic matched this text.");
    return lines.join("\n");
  }

  function toText(R) {
    return toMarkdown(R).replace(/^#+\s*/gm, "").replace(/\*\*/g, "");
  }

  function funcOf(R, tokenIdx) {
    var cl = clauseOf(R, tokenIdx);
    return cl ? cl.label : "unflagged text";
  }

  function phraseOf(R, tokenIdx) { return null; }

  function clauseOf(R, tokenIdx) {
    var clauses = R._clauses || [];
    for (var i = 0; i < clauses.length; i++) {
      var c = clauses[i];
      if (tokenIdx >= c.start && tokenIdx <= c.end) return c;
    }
    return null;
  }

  function posShort(token) { return token.isWord ? "word" : "punct"; }

  function needSpace(a, b) {
    if (!b) return false;
    if (!b.isWord && ".,;:!?…".indexOf(b.text) >= 0) return false;
    if (!a.isWord && "([\"'“‘".indexOf(a.text) >= 0) return false;
    return true;
  }

  return {
    tables: tables, rules: rules, toMarkdown: toMarkdown, toText: toText,
    funcOf: funcOf, phraseOf: phraseOf, clauseOf: clauseOf,
    posShort: posShort, needSpace: needSpace,
  };
})();
