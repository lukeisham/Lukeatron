/* Psychometric cartridge ENGINE (present mode) — GeneratorShell.spec.md §3b.
   getPool/render/checkAnswer/explainItem are the four present-mode exports
   (generator.answer + generator.explainer are both true in config.yaml).

   Dispatch is by item.category (SR-1: one small function per category,
   not one tangled function) — see the render()/checkAnswer()/explainItem()
   switches at the bottom of this file.

   Abstract-Diagrammatic Reasoning (category "abstract-reasoning") is the
   one category whose item is not prose: pool.json carries a grid/sequence/
   odd-one-out RULE SPEC (DECISIONS.md D-3), authored in
   Psychometric/cartridge/build/abstract_specs.py. deriveAnswerId() below
   walks that spec at both render time (to draw the SVG) and check-answer
   time (to grade) — the correct lettered option is *derived* from the
   rule every time, never read from a hand-recorded field. tests/js/
   test-abstract-rules.mjs cross-checks every derived answer against the
   seed content's own key. */
var ENGINE = (function () {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getPool() {
    return Object.keys(CONTENT).map(function (id) {
      return CONTENT[id];
    });
  }

  function sortedLetters(obj) {
    return Object.keys(obj).sort();
  }

  /* ================================================================
     Abstract reasoning: cell descriptors -> SVG, and rule-derived answer
     ================================================================ */

  var SIZE_PX = { 1: 9, 2: 12, 3: 16, 4: 20, 5: 24, 6: 27, 7: 29, 8: 31 };
  var SIZE_WORD = { small: 2, medium: 3, large: 5 };
  var POSITIONS = {
    center: [0.5, 0.5],
    left: [0.25, 0.5],
    right: [0.75, 0.5],
    "center-left": [0.35, 0.5],
    "center-right": [0.65, 0.5],
    "top-left": [0.25, 0.25],
    "top-center": [0.5, 0.25],
    "top-right": [0.75, 0.25],
    "bottom-left": [0.25, 0.75],
    "bottom-center": [0.5, 0.75],
    "bottom-right": [0.75, 0.75],
  };
  var SYMMETRY_PERIOD = { rectangle: 180, circle: 1, dot: 1 };

  function cellRadius(size) {
    if (typeof size === "string") size = SIZE_WORD[size] || 3;
    if (size == null) size = 3;
    return SIZE_PX[size] || SIZE_PX[3];
  }

  function polygonPoints(sides, cx, cy, r, rotationDeg) {
    var pts = [];
    var start = -90 + (rotationDeg || 0);
    for (var i = 0; i < sides; i++) {
      var angle = ((start + (360 / sides) * i) * Math.PI) / 180;
      pts.push(cx + r * Math.cos(angle) + "," + (cy + r * Math.sin(angle)));
    }
    return pts.join(" ");
  }

  function starPoints(cx, cy, rOuter, rotationDeg) {
    var rInner = rOuter * 0.45;
    var pts = [];
    var start = -90 + (rotationDeg || 0);
    for (var i = 0; i < 10; i++) {
      var r = i % 2 === 0 ? rOuter : rInner;
      var angle = ((start + 36 * i) * Math.PI) / 180;
      pts.push(cx + r * Math.cos(angle) + "," + (cy + r * Math.sin(angle)));
    }
    return pts.join(" ");
  }

  /** One shape at (cx,cy). fillMode: "filled" | "outline" | "half"
   * (half draws filled + outline overlay — a visual distractor, never a
   * puzzle's actual generated cell). */
  function drawShape(shape, cx, cy, r, fillMode, rotationDeg) {
    var fillAttr = fillMode === "filled" || fillMode === "half" ? "var(--ink)" : "none";
    var strokeAttr = "var(--ink)";
    var body;
    if (shape === "circle" || shape === "dot") {
      var radius = shape === "dot" ? Math.max(4, r * 0.35) : r;
      body = '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" fill="' + fillAttr + '" stroke="' + strokeAttr + '" stroke-width="2" />';
    } else if (shape === "square") {
      var s = r * 1.5;
      body =
        '<rect x="' + (cx - s / 2) + '" y="' + (cy - s / 2) + '" width="' + s + '" height="' + s +
        '" fill="' + fillAttr + '" stroke="' + strokeAttr + '" stroke-width="2" transform="rotate(' + (rotationDeg || 0) + " " + cx + " " + cy + ')" />';
    } else if (shape === "rectangle") {
      var w = r * 2, h = r * 1.1;
      body =
        '<rect x="' + (cx - w / 2) + '" y="' + (cy - h / 2) + '" width="' + w + '" height="' + h +
        '" fill="' + fillAttr + '" stroke="' + strokeAttr + '" stroke-width="2" transform="rotate(' + (rotationDeg || 0) + " " + cx + " " + cy + ')" />';
    } else if (shape === "triangle") {
      body =
        '<polygon points="' + polygonPoints(3, cx, cy, r * 1.15, rotationDeg) +
        '" fill="' + fillAttr + '" stroke="' + strokeAttr + '" stroke-width="2" />';
    } else if (shape === "pentagon") {
      body = '<polygon points="' + polygonPoints(5, cx, cy, r, rotationDeg) + '" fill="' + fillAttr + '" stroke="' + strokeAttr + '" stroke-width="2" />';
    } else if (shape === "hexagon") {
      body = '<polygon points="' + polygonPoints(6, cx, cy, r, rotationDeg) + '" fill="' + fillAttr + '" stroke="' + strokeAttr + '" stroke-width="2" />';
    } else if (shape === "star") {
      body = '<polygon points="' + starPoints(cx, cy, r * 1.1, rotationDeg) + '" fill="' + fillAttr + '" stroke="' + strokeAttr + '" stroke-width="2" />';
    } else {
      console.warn("drawShape: unknown shape", shape);
      body = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--line2)" stroke-width="2" />';
    }
    if (fillMode === "half") {
      var clipId = "half" + Math.round(cx) + "-" + Math.round(cy);
      body =
        '<clipPath id="' + clipId + '"><rect x="' + (cx - r * 1.5) + '" y="' + (cy - r * 1.5) + '" width="' + (r * 1.5) + '" height="' + (r * 3) + '" /></clipPath>' +
        body.replace(" />", ' clip-path="url(#' + clipId + ')" />') +
        drawShape(shape, cx, cy, r, "outline", rotationDeg);
    }
    return body;
  }

  /** A cell's shapes laid out within a box (0..w, 0..h), honouring
   * count (side-by-side) and an optional named position anchor. */
  function renderCell(cell, x, y, w, h) {
    if (!cell) return "";
    var count = cell.count || 1;
    var r = cellRadius(cell.size);
    var svg = "";
    if (count > 1 && cell.layout === "square") {
      var quadrants = [
        [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7],
      ];
      for (var q = 0; q < Math.min(count, quadrants.length); q++) {
        svg += drawShape(cell.shape, x + quadrants[q][0] * w, y + quadrants[q][1] * h, r * 0.6, cell.fill, cell.rotation);
      }
      return svg;
    }
    if (count > 1) {
      var step = w / (count + 1);
      for (var i = 1; i <= count; i++) {
        svg += drawShape(cell.shape, x + step * i, y + h / 2, r * 0.7, cell.fill, cell.rotation);
      }
      return svg;
    }
    var pos = POSITIONS[cell.position] || POSITIONS.center;
    return drawShape(cell.shape, x + pos[0] * w, y + pos[1] * h, r, cell.fill, cell.rotation);
  }

  function missingPlaceholder(x, y, w, h) {
    return (
      '<rect x="' + (x + 4) + '" y="' + (y + 4) + '" width="' + (w - 8) + '" height="' + (h - 8) +
      '" fill="none" stroke="var(--line2)" stroke-width="2" stroke-dasharray="4 4" />' +
      '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 6) + '" text-anchor="middle" font-size="20" fill="var(--ink3)">?</text>'
    );
  }

  function renderMatrixSvg(item) {
    var cell = 70, gap = 4, pad = 8;
    var side = item.cols * cell + (item.cols - 1) * gap + pad * 2;
    var svg = '<svg viewBox="0 0 ' + side + " " + side + '" role="img" aria-label="Reasoning matrix">';
    for (var r = 0; r < item.rows; r++) {
      for (var c = 0; c < item.cols; c++) {
        var x = pad + c * (cell + gap);
        var y = pad + r * (cell + gap);
        svg += '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" fill="var(--card)" stroke="var(--line)" />';
        if (r === item.missing.r && c === item.missing.c) {
          svg += missingPlaceholder(x, y, cell, cell);
        } else {
          svg += renderCell(item.grid[r][c], x, y, cell, cell);
        }
      }
    }
    svg += "</svg>";
    return svg;
  }

  function renderSeriesSvg(item) {
    var cell = 70, gap = 6, pad = 8;
    var n = item.sequence.length;
    var w = n * cell + (n - 1) * gap + pad * 2;
    var svg = '<svg viewBox="0 0 ' + w + " 86" + '" role="img" aria-label="Figure sequence">';
    for (var i = 0; i < n; i++) {
      var x = pad + i * (cell + gap);
      svg += '<rect x="' + x + '" y="8" width="' + cell + '" height="' + cell + '" fill="var(--card)" stroke="var(--line)" />';
      if (item.sequence[i] === null) {
        svg += missingPlaceholder(x, 8, cell, cell);
      } else {
        svg += renderCell(item.sequence[i], x, 8, cell, cell);
      }
    }
    svg += "</svg>";
    return svg;
  }

  var ARRANGEMENT_TRIANGLE = [[0.5, 0.22], [0.22, 0.78], [0.78, 0.78]];
  var ARRANGEMENT_INVERTED = [[0.22, 0.22], [0.78, 0.22], [0.5, 0.78]];
  var ARRANGEMENT_LINE3 = [[0.2, 0.5], [0.5, 0.5], [0.8, 0.5]];
  var ARRANGEMENT_SQUARE = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]];
  var ARRANGEMENT_DIAMOND = [[0.5, 0.15], [0.85, 0.5], [0.5, 0.85], [0.15, 0.5]];
  var ARRANGEMENT_RECT = [[0.15, 0.35], [0.85, 0.35], [0.15, 0.65], [0.85, 0.65]];
  var ARRANGEMENT_LINE4 = [[0.15, 0.5], [0.4, 0.5], [0.65, 0.5], [0.9, 0.5]];

  function dotArrangementSvg(points, w, h, biggerIndex) {
    var svg = '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Dot arrangement">';
    points.forEach(function (pt, i) {
      var r = biggerIndex === i ? 7 : 5;
      svg += '<circle cx="' + pt[0] * w + '" cy="' + pt[1] * h + '" r="' + r + '" fill="var(--ink)" />';
    });
    svg += "</svg>";
    return svg;
  }

  function overlapPairSvg(cell, w, h) {
    var r = 18;
    var svg = '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Overlapping shapes">';
    svg += drawShape(cell.shape, w * 0.4, h * 0.5, r, cell.fill, 0);
    svg += drawShape(cell.shape, w * 0.6, h * 0.5, r, cell.fill, 0);
    svg += "</svg>";
    return svg;
  }

  function oddOneOutOptionSvg(cell) {
    var w = 90, h = 70;
    if (cell.layout === "overlap-pair") return overlapPairSvg(cell, w, h);
    if (cell.arrangementFamily) {
      var pts;
      if (cell.arrangementFamily === "line") pts = ARRANGEMENT_LINE3;
      else pts = cell.inverted ? ARRANGEMENT_INVERTED : ARRANGEMENT_TRIANGLE;
      if (cell.spacing === "uneven") pts = [[0.5, 0.15], [0.3, 0.8], [0.85, 0.85]];
      return dotArrangementSvg(pts, w, h, -1);
    }
    if (cell.shapeType) {
      var byType = {
        square: ARRANGEMENT_SQUARE,
        diamond: ARRANGEMENT_DIAMOND,
        rectangle: ARRANGEMENT_RECT,
        line: ARRANGEMENT_LINE4,
      };
      var arrangement = byType[cell.shapeType] || ARRANGEMENT_SQUARE;
      var biggerIndex = cell.sizeUniform === false ? 0 : -1;
      return dotArrangementSvg(arrangement, w, h, biggerIndex);
    }
    console.warn("oddOneOutOptionSvg: cell has no recognised arrangement shape", cell);
    return dotArrangementSvg(ARRANGEMENT_SQUARE, w, h, -1);
  }

  /* ---- rule derivation (the D-3 contract: same spec drives the answer) --- */

  function valueFromLine(line, skipIndex, attr) {
    for (var i = 0; i < line.length; i++) {
      if (i === skipIndex) continue;
      var cell = line[i];
      if (cell && cell[attr] !== undefined) return cell[attr];
    }
    console.warn("valueFromLine: no known value for attr", attr);
    return undefined;
  }

  function deriveIncrement(line, missingIndex, attr) {
    var known = [];
    line.forEach(function (cell, i) {
      if (i !== missingIndex && cell && cell[attr] !== undefined) known.push({ i: i, v: cell[attr] });
    });
    if (known.length < 2) {
      console.warn("deriveIncrement: fewer than two known values for attr", attr);
      return known.length ? known[0].v : undefined;
    }
    known.sort(function (a, b) { return a.i - b.i; });
    var first = known[0], last = known[known.length - 1];
    var step = (last.v - first.v) / (last.i - first.i);
    return last.v + step * (missingIndex - last.i);
  }

  function deriveMatrixCell(item) {
    var r = item.missing.r, c = item.missing.c;
    var derived = {};
    item.rules.forEach(function (rule) {
      var attr = rule.attr;
      if (rule.by === "row") derived[attr] = valueFromLine(item.grid[r], c, attr);
      else if (rule.by === "col") derived[attr] = valueFromLine(item.grid.map(function (row) { return row[c]; }), r, attr);
      else if (rule.by === "row-increment") derived[attr] = deriveIncrement(item.grid[r], c, attr);
      else if (rule.by === "col-increment") derived[attr] = deriveIncrement(item.grid.map(function (row) { return row[c]; }), r, attr);
      else if (rule.by === "constant") derived[attr] = rule.value;
      else console.warn("deriveMatrixCell: unknown rule.by", rule.by);
    });
    return derived;
  }

  function deriveSeriesCell(item) {
    var seq = item.sequence;
    var missingIndex = seq.indexOf(null);
    var derived = {};
    item.rules.forEach(function (rule) {
      var attr = rule.attr;
      if (rule.by === "constant") derived[attr] = valueFromLine(seq, missingIndex, attr);
      else if (rule.by === "sequence-increment") derived[attr] = deriveIncrement(seq, missingIndex, attr);
      else if (rule.by === "path") {
        var known = [];
        seq.forEach(function (cell, i) {
          if (i !== missingIndex && cell && cell[attr] !== undefined) known.push({ i: i, v: cell[attr] });
        });
        known.sort(function (a, b) { return a.i - b.i; });
        var last = known[known.length - 1];
        var idx = rule.path.indexOf(last.v);
        derived[attr] = rule.path[idx + (missingIndex - last.i)];
      } else console.warn("deriveSeriesCell: unknown rule.by", rule.by);
    });
    return derived;
  }

  function normalizeRotation(deg, shape) {
    var period = SYMMETRY_PERIOD[shape] || 360;
    return ((deg % period) + period) % period;
  }

  function attrsEqual(attr, a, b, shape) {
    if (attr === "rotation") return normalizeRotation(a, shape) === normalizeRotation(b, shape);
    return a === b;
  }

  function deriveGridAnswerId(item, derived) {
    var attrs = item.rules.map(function (r) { return r.attr; });
    var letters = sortedLetters(item.options);
    for (var i = 0; i < letters.length; i++) {
      var letter = letters[i];
      var opt = item.options[letter];
      var matches = attrs.every(function (attr) { return attrsEqual(attr, derived[attr], opt[attr], derived.shape); });
      if (matches) return letter;
    }
    console.warn("deriveGridAnswerId: no option matched the derived cell", item.id, derived);
    return null;
  }

  /** Finds the attribute (checked in item.priority order) whose values
   * split 4-to-1 across the five lettered items, and returns the letter
   * of the lone minority item — the odd one out, mechanically derived. */
  function deriveOddOneOutAnswerId(item) {
    var letters = sortedLetters(item.items);
    for (var p = 0; p < item.priority.length; p++) {
      var attr = item.priority[p];
      var byValue = {};
      letters.forEach(function (letter) {
        var key = JSON.stringify(item.items[letter][attr]);
        (byValue[key] = byValue[key] || []).push(letter);
      });
      var keys = Object.keys(byValue);
      if (keys.length === 2) {
        var minority = keys.filter(function (k) { return byValue[k].length === 1; });
        if (minority.length === 1) return byValue[minority[0]][0];
      }
    }
    console.warn("deriveOddOneOutAnswerId: no 4-1 split found across priority attrs", item.id);
    return null;
  }

  function deriveAnswerId(item) {
    if (item.kind === "matrix") return deriveGridAnswerId(item, deriveMatrixCell(item));
    if (item.kind === "series") return deriveGridAnswerId(item, deriveSeriesCell(item));
    if (item.kind === "oddOneOut") return deriveOddOneOutAnswerId(item);
    console.warn("deriveAnswerId: unknown item.kind", item.kind);
    return null;
  }

  function describeRules(item) {
    var BY_PHRASE = {
      row: "stays constant along each row",
      col: "stays constant along each column",
      "row-increment": "increases by a fixed step along each row",
      "col-increment": "increases by a fixed step along each column",
      constant: "stays constant throughout",
      "sequence-increment": "increases by a fixed step along the sequence",
      path: "follows a fixed path of positions",
    };
    if (item.kind === "oddOneOut") {
      return "Compare " + item.priority.join(", then ") + " across all five items; the one that breaks the shared pattern is the odd one out.";
    }
    return item.rules
      .map(function (rule) { return rule.attr + " " + (BY_PHRASE[rule.by] || rule.by); })
      .join("; ") + ".";
  }

  /* ================================================================
     Category renderers
     ================================================================ */

  function renderStimulusBlock(item) {
    return (
      '<p class="psy-stimulus">' + esc(item.stimulus) + "</p>" +
      '<p class="psy-question"><strong>' + esc(item.question) + "</strong></p>"
    );
  }

  function renderOptionsList(item) {
    var html = '<ul class="psy-options">';
    sortedLetters(item.options).forEach(function (letter) {
      html += "<li><strong>" + letter + ":</strong> " + esc(item.options[letter]) + "</li>";
    });
    html += "</ul>";
    return html;
  }

  function renderMCQ(item) {
    return {
      html: renderStimulusBlock(item) + renderOptionsList(item),
      clueHtml: '<p>' + esc(item.clue) + "</p>",
      canonicalText: item.stimulus + "\n\n" + item.question,
    };
  }

  function renderSJT(item) {
    var html =
      renderStimulusBlock(item) +
      renderOptionsList(item) +
      '<p class="psy-meta">Type your ranking as five comma-separated letters, best to worst (e.g. B,D,A,E,C).</p>';
    return {
      html: html,
      clueHtml: "<p>" + esc(item.clue) + "</p>",
      canonicalText: item.stimulus + "\n\n" + item.question,
    };
  }

  function renderDirTable(table) {
    if (!table) return "";
    var html = '<table class="psy-table"><thead><tr>';
    table.header.forEach(function (cell) { html += "<th>" + esc(cell) + "</th>"; });
    html += "</tr></thead><tbody>";
    table.rows.forEach(function (row) {
      html += "<tr>";
      row.forEach(function (cell) { html += "<td>" + esc(cell) + "</td>"; });
      html += "</tr>";
    });
    html += "</tbody></table>";
    table.notes.forEach(function (note) {
      html += '<p class="psy-table-note">' + esc(note) + "</p>";
    });
    return html;
  }

  function renderDIR(item) {
    var body = item.table
      ? renderDirTable(item.table)
      : "<pre>" + esc(item.stimulus) + "</pre>";
    var html =
      body +
      '<p class="psy-question"><strong>' + esc(item.question) + "</strong></p>" +
      renderOptionsList(item) +
      '<p class="psy-meta">Answer with a letter (A–E) or a number — numeric answers are checked with tolerance.</p>';
    return {
      html: html,
      clueHtml: "<p>" + esc(item.clue) + "</p>",
      canonicalText: item.question,
    };
  }

  function renderAR(item) {
    var puzzleSvg = item.kind === "matrix" ? renderMatrixSvg(item) : item.kind === "series" ? renderSeriesSvg(item) : "";
    var html = '<div class="ar-puzzle">' + puzzleSvg + "</div>";
    html += '<p class="psy-question"><strong>' + esc(item.question || "Which option completes the pattern?") + "</strong></p>";
    html += '<div class="ar-options">';
    sortedLetters(item.options).forEach(function (letter) {
      var cell = item.options[letter];
      var thumb = item.kind === "oddOneOut" ? oddOneOutOptionSvg(cell) : renderSingleCellThumb(cell);
      html +=
        '<div class="ar-option"><span class="ar-letter">' + letter + "</span>" + thumb +
        '<span class="ar-option-label">' + esc((item.optionLabels && item.optionLabels[letter]) || "") + "</span></div>";
    });
    html += "</div>";
    return {
      html: html,
      clueHtml: "<p>" + esc(item.clue) + "</p>",
      canonicalText: (item.question || "Abstract reasoning item " + item.id),
    };
  }

  function renderSingleCellThumb(cell) {
    var w = 90, h = 90;
    return '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Option">' + renderCell(cell, 0, 0, w, h) + "</svg>";
  }

  function render(item) {
    switch (item.category) {
      case "situational-judgement":
        return renderSJT(item);
      case "verbal-critical-reasoning":
      case "deductive-analytical":
        return renderMCQ(item);
      case "data-interpretation":
        return renderDIR(item);
      case "abstract-reasoning":
        return renderAR(item);
      default:
        console.warn("render: unknown category", item.category);
        return { html: "<p>" + esc(item.stimulus || "") + "</p>", canonicalText: item.stimulus || "" };
    }
  }

  /* ================================================================
     Category checkers (SR-1: dispatched by category, not one function)
     ================================================================ */

  function firstLetter(raw) {
    var match = String(raw == null ? "" : raw).match(/[A-E]/i);
    return match ? match[0].toUpperCase() : null;
  }

  function checkLetterAnswer(item, userAnswer) {
    var letter = firstLetter(userAnswer);
    if (!letter) return { correct: false, message: "Type a letter A–E first." };
    var correct = letter === item.correctLetter;
    return {
      correct: correct,
      message: correct
        ? "Correct!"
        : "Not quite — the answer is " + item.correctLetter + ": " + item.options[item.correctLetter],
    };
  }

  function parseOrderInput(raw) {
    var letters = String(raw == null ? "" : raw).toUpperCase().match(/[A-E]/g) || [];
    var seen = {};
    var ordered = [];
    letters.forEach(function (letter) {
      if (!seen[letter]) { seen[letter] = true; ordered.push(letter); }
    });
    return ordered;
  }

  function concordanceRatio(order, correctOrder) {
    var pos = {};
    correctOrder.forEach(function (letter, i) { pos[letter] = i; });
    var n = order.length;
    var concordant = 0, total = 0;
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        total++;
        if (pos[order[i]] < pos[order[j]]) concordant++;
      }
    }
    return total ? concordant / total : 0;
  }

  function checkSJT(item, userAnswer) {
    var order = parseOrderInput(userAnswer);
    if (order.length !== 5) {
      return { correct: false, message: "Enter all five letters, e.g. B,D,A,E,C." };
    }
    var ratio = concordanceRatio(order, item.correctOrder);
    var passed = ratio >= 0.7;
    var pct = Math.round(ratio * 100);
    return {
      correct: passed,
      message: passed
        ? "Good ranking — " + pct + "% agreement with the model answer."
        : pct + "% agreement (need 70%+). Model order: " + item.correctOrder.join(", "),
    };
  }

  var NUMBER_RE_JS = /([£$]?)(\d[\d,]*(?:\.\d+)?)\s*(%?)/;

  function parseNumericInput(raw) {
    var match = NUMBER_RE_JS.exec(String(raw == null ? "" : raw));
    if (!match) return null;
    return { value: parseFloat(match[2].replace(/,/g, "")), isPercent: !!match[3] };
  }

  function checkDIR(item, userAnswer) {
    var trimmed = String(userAnswer == null ? "" : userAnswer).trim();
    if (/^[A-E]$/i.test(trimmed)) return checkLetterAnswer(item, trimmed);

    var parsed = parseNumericInput(trimmed);
    if (parsed && item.numericTarget) {
      var target = item.numericTarget;
      var tolerance = target.isPercent ? 2 : Math.abs(target.value) * 0.05;
      var withinTolerance = Math.abs(parsed.value - target.value) <= tolerance;
      return {
        correct: withinTolerance,
        message: withinTolerance
          ? "Correct! (within tolerance of " + target.value + (target.isPercent ? "%" : "") + ")"
          : "Not quite — target is " + target.value + (target.isPercent ? "%" : "") + " (letter " + item.correctLetter + ").",
      };
    }
    return checkLetterAnswer(item, trimmed);
  }

  function checkAR(item, userAnswer) {
    var letter = firstLetter(userAnswer);
    if (!letter) return { correct: false, message: "Type a letter A–E first." };
    var correctLetter = deriveAnswerId(item);
    if (!correctLetter) {
      console.warn("checkAR: could not derive an answer for", item.id);
      return { correct: false, message: "This item's rule could not be evaluated." };
    }
    var correct = letter === correctLetter;
    return {
      correct: correct,
      message: correct ? "Correct!" : "Not quite — the answer is " + correctLetter + ".",
    };
  }

  function checkAnswer(item, userAnswer) {
    switch (item.category) {
      case "situational-judgement":
        return checkSJT(item, userAnswer);
      case "verbal-critical-reasoning":
      case "deductive-analytical":
        return checkLetterAnswer(item, userAnswer);
      case "data-interpretation":
        return checkDIR(item, userAnswer);
      case "abstract-reasoning":
        return checkAR(item, userAnswer);
      default:
        console.warn("checkAnswer: unknown category", item.category);
        return { correct: false, message: "Unable to check this item." };
    }
  }

  /* ================================================================
     Explainer (per-category — required since generator.explainer: true)
     ================================================================ */

  function explainGeneric(item) {
    return "<p>" + esc(item.explainerText) + "</p>";
  }

  function explainSJT(item) {
    return (
      "<p>" + esc(item.explainerText) + "</p>" +
      "<p><strong>Model order (best → worst):</strong> " + esc(item.correctOrder.join(", ")) + "</p>"
    );
  }

  function explainAR(item) {
    var correctLetter = deriveAnswerId(item);
    return (
      "<p>" + esc(item.explainerText) + "</p>" +
      "<p><strong>Rule:</strong> " + esc(describeRules(item)) + "</p>" +
      "<p><strong>Derived answer:</strong> " + esc(correctLetter || "unresolved") + "</p>"
    );
  }

  function explainItem(item) {
    switch (item.category) {
      case "situational-judgement":
        return explainSJT(item);
      case "abstract-reasoning":
        return explainAR(item);
      case "verbal-critical-reasoning":
      case "deductive-analytical":
      case "data-interpretation":
        return explainGeneric(item);
      default:
        console.warn("explainItem: unknown category", item.category);
        return explainGeneric(item);
    }
  }

  return {
    getPool: getPool,
    render: render,
    checkAnswer: checkAnswer,
    explainItem: explainItem,
    // Exposed for tests (TEST-9: import the real module, don't re-implement
    // the derivation algorithm in the test).
    _deriveAnswerId: deriveAnswerId,
    _concordanceRatio: concordanceRatio,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = ENGINE;
}
