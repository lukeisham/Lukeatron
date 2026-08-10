# Parser Widgets Status Report — Design System

For the writer agent building the single-file HTML report on Luke's 13 parser widgets (1 finished Grammar + 12 in-progress clones). Pure HTML/CSS, no build step, no external fonts/CDNs. Tiny inline `<script>` allowed only for card collapse — everything else is static.

Read this whole file before drafting. Section 1 is the CSS block (paste into one `<style>` in `<head>`). Section 2 is the HTML skeleton + class conventions. Section 3 is a ready-to-paste mockup snippet for the "what the parser UI looks like" figure.

---

## 1. CSS block

Paste verbatim into `<style>`. System font stack, light/print-friendly, two hue families (Teaching vs Church) plus status colours, responsive, tables scroll horizontally in their own container.

```css
:root {
  /* neutrals */
  --ink: #1c1e21;
  --ink-soft: #52565c;
  --ink-faint: #8a8f98;
  --paper: #ffffff;
  --paper-alt: #f6f7f9;
  --line: #e2e5ea;
  --line-strong: #c9cdd4;

  /* context hues */
  --teaching: #2f6f4f;       /* green — Teaching context */
  --teaching-bg: #eaf5ee;
  --teaching-border: #bfe0cc;
  --church: #4a3f9e;         /* indigo — Church context */
  --church-bg: #eeecf9;
  --church-border: #cdc7ec;

  /* status colours */
  --status-done: #1f7a3d;
  --status-done-bg: #e4f5e9;
  --status-draft: #b8860b;
  --status-draft-bg: #fbf2dd;
  --status-stub: #a33a3a;
  --status-stub-bg: #fbe8e8;
  --status-blocked: #6b6f76;
  --status-blocked-bg: #eceef1;

  --radius: 8px;
  --shadow: 0 1px 2px rgba(20,22,26,.06), 0 1px 1px rgba(20,22,26,.04);
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 2.5rem 1.5rem 4rem;
  font-family: var(--font);
  color: var(--ink);
  background: var(--paper);
  line-height: 1.5;
  font-size: 15px;
}

.report {
  max-width: 980px;
  margin: 0 auto;
}

/* ---------- Header ---------- */
.report-header {
  border-bottom: 3px solid var(--ink);
  padding-bottom: 1rem;
  margin-bottom: 2rem;
}
.report-header h1 { font-size: 1.7rem; margin: 0 0 .25rem; }
.report-header .subtitle { color: var(--ink-soft); font-size: .95rem; }
.report-header .meta { color: var(--ink-faint); font-size: .8rem; margin-top: .4rem; }

/* ---------- Section scaffolding ---------- */
section.block { margin: 2.5rem 0; }
section.block h2 {
  font-size: 1.15rem;
  margin: 0 0 1rem;
  padding-bottom: .4rem;
  border-bottom: 1px solid var(--line);
}
section.block h3 { font-size: 1rem; margin: 1.2rem 0 .5rem; }

/* ---------- Stat tiles (executive summary) ---------- */
.stat-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: .75rem;
  margin-bottom: 1.25rem;
}
.stat-tile {
  background: var(--paper-alt);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: .9rem 1rem;
}
.stat-tile .num { font-size: 1.6rem; font-weight: 700; line-height: 1.1; }
.stat-tile .label { font-size: .78rem; color: var(--ink-soft); margin-top: .25rem; }

/* ---------- Status + context chips ---------- */
.chip {
  display: inline-block;
  font-size: .72rem;
  font-weight: 600;
  padding: .15rem .55rem;
  border-radius: 999px;
  white-space: nowrap;
  border: 1px solid transparent;
}
.chip-done     { color: var(--status-done);    background: var(--status-done-bg); }
.chip-draft    { color: var(--status-draft);   background: var(--status-draft-bg); }
.chip-stub     { color: var(--status-stub);    background: var(--status-stub-bg); }
.chip-blocked  { color: var(--status-blocked); background: var(--status-blocked-bg); }

.chip-teaching { color: var(--teaching); background: var(--teaching-bg); border-color: var(--teaching-border); }
.chip-church   { color: var(--church);   background: var(--church-bg);   border-color: var(--church-border); }

/* ---------- Table wrapper (horizontal scroll) ---------- */
.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  -webkit-overflow-scrolling: touch;
}
table.matrix {
  border-collapse: collapse;
  width: 100%;
  min-width: 720px;
  font-size: .85rem;
}
table.matrix th, table.matrix td {
  padding: .55rem .7rem;
  text-align: left;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}
table.matrix thead th {
  background: var(--paper-alt);
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .03em;
  color: var(--ink-soft);
  border-bottom: 1px solid var(--line-strong);
  position: sticky;
  top: 0;
}
table.matrix tbody tr:last-child td { border-bottom: none; }
table.matrix tbody tr:hover { background: var(--paper-alt); }
table.matrix td.context-teaching { border-left: 3px solid var(--teaching); }
table.matrix td.context-church   { border-left: 3px solid var(--church); }

/* ---------- Parser detail cards ---------- */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}
.parser-card {
  border: 1px solid var(--line);
  border-left: 4px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--paper);
  box-shadow: var(--shadow);
  padding: 1rem 1.1rem;
}
.parser-card.context-teaching { border-left-color: var(--teaching); }
.parser-card.context-church   { border-left-color: var(--church); }

.parser-card .card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: .5rem;
  flex-wrap: wrap;
}
.parser-card h4 { margin: 0; font-size: 1rem; }
.parser-card .card-tags { display: flex; gap: .35rem; flex-wrap: wrap; margin-top: .3rem; }

.parser-card dl.card-body { margin: .8rem 0 0; }
.parser-card dl.card-body dt {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .03em;
  color: var(--ink-faint);
  margin-top: .65rem;
}
.parser-card dl.card-body dt:first-child { margin-top: 0; }
.parser-card dl.card-body dd {
  margin: .15rem 0 0;
  font-size: .87rem;
  color: var(--ink);
}
.parser-card dl.card-body dd ul { margin: .2rem 0 0; padding-left: 1.1rem; }

/* collapsible card body — tiny JS toggles [open] attr on <details> */
.parser-card > details > summary {
  cursor: pointer;
  list-style: none;
  font-size: .8rem;
  color: var(--ink-soft);
  margin-top: .5rem;
}
.parser-card > details > summary::-webkit-details-marker { display: none; }
.parser-card > details > summary::before { content: "▸ "; }
.parser-card > details[open] > summary::before { content: "▾ "; }

/* ---------- Pipeline diagram ---------- */
.pipeline {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  align-items: stretch;
  margin: 1rem 0;
}
.pipeline-step {
  flex: 1 1 150px;
  background: var(--paper-alt);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: .7rem .8rem;
  position: relative;
}
.pipeline-step .step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper);
  font-size: .75rem;
  font-weight: 700;
  margin-bottom: .4rem;
}
.pipeline-step .step-title { font-weight: 600; font-size: .85rem; }
.pipeline-step .step-desc { font-size: .78rem; color: var(--ink-soft); margin-top: .2rem; }
.pipeline-arrow {
  align-self: center;
  color: var(--ink-faint);
  font-size: 1.2rem;
  padding: 0 .1rem;
}
@media (max-width: 700px) {
  .pipeline { flex-direction: column; }
  .pipeline-arrow { transform: rotate(90deg); align-self: flex-start; margin-left: .6rem; }
}

/* ---------- Open decisions list ---------- */
ul.decisions { list-style: none; margin: 0; padding: 0; }
ul.decisions li {
  padding: .6rem .8rem;
  border: 1px solid var(--line);
  border-left: 4px solid var(--status-draft);
  border-radius: var(--radius);
  margin-bottom: .5rem;
  font-size: .88rem;
  background: var(--status-draft-bg);
}
ul.decisions li strong { display: block; font-size: .85rem; margin-bottom: .15rem; }

/* ---------- Mockup figure wrapper ---------- */
.mockup-frame {
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--paper-alt);
  padding: 1rem;
}
.mockup-caption { font-size: .78rem; color: var(--ink-faint); margin-top: .5rem; text-align: center; }

/* ---------- Print ---------- */
@media print {
  body { padding: 0; font-size: 12px; }
  .parser-card, table.matrix, .pipeline-step { box-shadow: none; }
  a { color: inherit; text-decoration: none; }
}

/* ---------- Dark mode (optional, degrades gracefully) ---------- */
@media (prefers-color-scheme: dark) {
  body { background: #16171a; color: #e7e9ec; }
  .stat-tile, table.matrix thead th, .pipeline-step, .parser-card, .mockup-frame { background: #1e2024; border-color: #33363c; }
  table.matrix tbody tr:hover { background: #24262b; }
}
```

---

## 2. HTML skeleton and class conventions

Drop these blocks into the report body, in order. Everything is plain HTML — copy the structure, fill in content.

### Header

```html
<div class="report">
  <header class="report-header">
    <h1>Parser Widgets — Status Review</h1>
    <div class="subtitle">Grammar chassis and its 12 in-progress clones, across Teaching and Church</div>
    <div class="meta">Prepared for Luke · [date] · 13 parsers reviewed</div>
  </header>
```

### Executive summary (stat tiles + prose)

```html
  <section class="block" id="summary">
    <h2>Executive Summary</h2>
    <div class="stat-tiles">
      <div class="stat-tile"><div class="num">1</div><div class="label">Finished &amp; shipped</div></div>
      <div class="stat-tile"><div class="num">12</div><div class="label">Chassis cloned, awaiting build</div></div>
      <div class="stat-tile"><div class="num">11</div><div class="label">Content drafted</div></div>
      <div class="stat-tile"><div class="num">1</div><div class="label">Content still a stub</div></div>
    </div>
    <p>Two or three sentences of prose synthesis here.</p>
  </section>
```

Use as many/few tiles as the numbers warrant — 4–6 is the sweet spot.

### Status matrix

Wrap every table in `.table-scroll`. Use `<td class="context-teaching">` or `context-church` on the first cell of each row for the coloured left rule; use `.chip` spans for status/tier cells.

```html
  <section class="block" id="matrix">
    <h2>Status Matrix</h2>
    <div class="table-scroll">
      <table class="matrix">
        <thead>
          <tr>
            <th>Parser</th><th>Context</th><th>Content maturity</th>
            <th>Chassis adapted</th><th>Tier profile</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="context-teaching">Grammar</td>
            <td><span class="chip chip-teaching">Teaching</span></td>
            <td>Final, shipped</td>
            <td>N/A — original</td>
            <td>Tier A + B</td>
            <td><span class="chip chip-done">Done</span></td>
          </tr>
          <tr>
            <td class="context-church">Greek and Hebrew</td>
            <td><span class="chip chip-church">Church</span></td>
            <td>43 KB, proposed scope</td>
            <td>Cloned, not adapted</td>
            <td>Tier A (B proposed)</td>
            <td><span class="chip chip-draft">Draft</span></td>
          </tr>
          <!-- one row per parser -->
        </tbody>
      </table>
    </div>
  </section>
```

Status chip vocabulary — pick one per row: `chip-done` (shipped/verified), `chip-draft` (content drafted, build pending), `chip-stub` (content still a TODO stub), `chip-blocked` (waiting on Luke decision/sign-off). Fact-checking is the only current `chip-stub`.

### Parser detail cards

One `.parser-card` per parser inside `.card-grid`. The `<details>` wrapping "Work done" / "Work remaining" makes it collapsible with zero JS beyond the browser default — no script required unless you want all cards to default open/closed together (see note below).

```html
  <section class="block" id="details">
    <h2>Parser Detail</h2>
    <div class="card-grid">

      <article class="parser-card context-church">
        <div class="card-head">
          <h4>Biblical symbols and cross-references</h4>
          <span class="chip chip-draft">Draft</span>
        </div>
        <div class="card-tags">
          <span class="chip chip-church">Church</span>
          <span class="chip">CH-14</span>
        </div>
        <dl class="card-body">
          <dt>Purpose</dt>
          <dd>Identifies symbolic language in a passage and surfaces related canonical texts.</dd>
          <dt>Reasoning tiers</dt>
          <dd>Tier A: symbol detection, keyword/synonym match, cross-ref lookup. Tier B: disabled slot for interpretive disputes.</dd>
          <dt>Output / UI</dt>
          <dd>Colour-by-category highlighting, hover coordinates, click-through symbol entries.</dd>
        </dl>
        <details>
          <summary>Work done / work remaining</summary>
          <dl class="card-body">
            <dt>Work done</dt>
            <dd>
              <ul>
                <li>Chassis cloned 2026-07-06</li>
                <li>Content seeded — 1083 lines, largest draft, 6 entries [UNVERIFIED]</li>
              </ul>
            </dd>
            <dt>Work remaining</dt>
            <dd>
              <ul>
                <li>README/build adaptation, drop lexicon step</li>
                <li>Cartridge swap: CONFIG, CONTENT, ENGINE.rules, EXPLAINER</li>
                <li>Luke review of DRAFT + [UNVERIFIED] entries</li>
              </ul>
            </dd>
          </dl>
        </details>
      </article>

      <!-- repeat: one <article class="parser-card context-teaching|context-church"> per parser, 13 total -->

    </div>
  </section>
```

Note on collapsibility: native `<details>/<summary>` needs no JS at all and satisfies "collapsible cards." Only add a script if Luke wants an "expand all / collapse all" control — in that case a ~6-line script toggling the `open` attribute on all `.parser-card details` is enough; keep it inline at the bottom of `<body>`.

### Pipeline diagram (5-step remaining build pipeline)

```html
  <section class="block" id="pipeline">
    <h2>Remaining Build Pipeline (per clone)</h2>
    <div class="pipeline">
      <div class="pipeline-step">
        <span class="step-num">1</span>
        <div class="step-title">Adapt README + build scripts</div>
        <div class="step-desc">Rename outputs, decide lexicon need</div>
      </div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step">
        <span class="step-num">2</span>
        <div class="step-title">Swap the four cartridges</div>
        <div class="step-desc">CONFIG · CONTENT compile · ENGINE.rules · EXPLAINER.render</div>
      </div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step">
        <span class="step-num">3</span>
        <div class="step-title">Write short spec</div>
        <div class="step-desc">Cites the Grammar spec as base</div>
      </div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step">
        <span class="step-num">4</span>
        <div class="step-title">Build</div>
        <div class="step-desc">Run build_parser.py</div>
      </div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step">
        <span class="step-num">5</span>
        <div class="step-title">Test &amp; freeze</div>
        <div class="step-desc">Verify against sample input, lock version</div>
      </div>
    </div>
  </section>
```

### Open decisions for Luke

```html
  <section class="block" id="decisions">
    <h2>Open Decisions for Luke</h2>
    <ul class="decisions">
      <li><strong>Explainer format undefined</strong> — Style, Tropes, Fact-checking, Biblical Commentary, Systematic Theology.</li>
      <li><strong>Story-tension ↔ Tropes overlap</strong> — trope-rule duplication between the two parsers unresolved.</li>
      <li><strong>Fact-checking source list</strong> — approved sources for Tier B not yet chosen.</li>
      <li><strong>Lexicon keep/drop per clone</strong> — only Greek and Hebrew clearly needs one.</li>
      <li><strong>Greek and Hebrew scope sign-off</strong> — [PROPOSED SCOPE] flag awaiting confirmation.</li>
    </ul>
  </section>
```

### Mockup figure

```html
  <section class="block" id="mockup">
    <h2>What a Parser Widget Looks Like</h2>
    <p>Real screenshots exist only for Grammar; mockup below illustrates the shared chassis UI every clone inherits.</p>
    <!-- paste Section 3 snippet here -->
    <div class="mockup-caption">Illustrative mockup — colours/labels vary by parser</div>
  </section>

  <footer style="margin-top:3rem; font-size:.78rem; color:var(--ink-faint); border-top:1px solid var(--line); padding-top:1rem;">
    Drafted by Lukeatron · parser-widgets status review
  </footer>
</div> <!-- /.report -->
```

---

## 3. Mockup snippet — parser widget UI

Self-contained; paste directly into the mockup section. Uses its own small scoped class prefix (`pw-`) so it never collides with report classes.

```html
<div class="mockup-frame">
  <style>
    .pw-widget { font-family: var(--font); font-size: .85rem; }
    .pw-input {
      border: 1px solid var(--line-strong); border-radius: 6px;
      background: var(--paper); padding: .6rem .75rem; margin-bottom: .8rem;
      color: var(--ink-faint); font-style: italic;
    }
    .pw-text {
      background: var(--paper); border: 1px solid var(--line);
      border-radius: 6px; padding: .8rem .9rem; line-height: 1.9;
      margin-bottom: .7rem;
    }
    .pw-span { padding: .05rem .15rem; border-radius: 3px; }
    .pw-noun    { background: #eaf5ee; border-bottom: 2px solid #2f6f4f; }
    .pw-verb    { background: #fbe8e8; border-bottom: 2px solid #a33a3a; }
    .pw-modifier{ background: #fbf2dd; border-bottom: 2px solid #b8860b; }
    .pw-conn    { background: #eeecf9; border-bottom: 2px solid #4a3f9e; }
    .pw-legend { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: .8rem; }
    .pw-chip { display: inline-flex; align-items: center; gap: .3rem; font-size: .72rem; color: var(--ink-soft); }
    .pw-swatch { width: .6rem; height: .6rem; border-radius: 2px; display: inline-block; }
    .pw-layers { display: flex; gap: .4rem; margin-bottom: .8rem; }
    .pw-layer-btn {
      font-size: .72rem; padding: .3rem .6rem; border-radius: 6px;
      border: 1px solid var(--line-strong); background: var(--paper); color: var(--ink-soft);
    }
    .pw-layer-btn.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }
    .pw-layer-btn.tier-b { color: var(--ink-faint); background: var(--paper-alt); border-style: dashed; }
    .pw-explainer { width: 100%; border-collapse: collapse; font-size: .78rem; }
    .pw-explainer th, .pw-explainer td { border: 1px solid var(--line); padding: .35rem .5rem; text-align: left; }
    .pw-explainer th { background: var(--paper-alt); font-size: .68rem; text-transform: uppercase; color: var(--ink-soft); }
  </style>

  <div class="pw-widget">
    <div class="pw-input">Paste or type a passage — up to 1000 words…</div>

    <div class="pw-layers">
      <span class="pw-layer-btn active">Focus: Parts of Speech</span>
      <span class="pw-layer-btn">Focus: Clause Structure</span>
      <span class="pw-layer-btn tier-b" title="Not wired for this parser">Tier B: Style Advisor</span>
    </div>

    <div class="pw-text">
      <span class="pw-span pw-noun">The council</span>
      <span class="pw-span pw-verb">reviewed</span>
      the proposal
      <span class="pw-span pw-conn">before</span>
      <span class="pw-span pw-modifier">quietly</span>
      adjourning.
    </div>

    <div class="pw-legend">
      <span class="pw-chip"><span class="pw-swatch" style="background:#2f6f4f"></span>Noun phrase</span>
      <span class="pw-chip"><span class="pw-swatch" style="background:#a33a3a"></span>Verb</span>
      <span class="pw-chip"><span class="pw-swatch" style="background:#b8860b"></span>Modifier</span>
      <span class="pw-chip"><span class="pw-swatch" style="background:#4a3f9e"></span>Connective</span>
    </div>

    <table class="pw-explainer">
      <thead><tr><th>Token</th><th>Category</th><th>Note</th></tr></thead>
      <tbody>
        <tr><td>The council</td><td>Noun phrase</td><td>Subject, definite</td></tr>
        <tr><td>reviewed</td><td>Verb</td><td>Past tense, transitive</td></tr>
        <tr><td>quietly</td><td>Modifier</td><td>Adverb of manner</td></tr>
      </tbody>
    </table>
  </div>
</div>
```

---

## Usage notes for the writer

- One `<style>` block in `<head>` with Section 1's CSS; everything below it is content.
- Context colour is chip + left-border only — never the whole card/row background — so it stays readable and print-friendly.
- Status vocabulary is fixed to four values (done / draft / stub / blocked); don't invent new ones, map every parser's actual state onto these.
- The status matrix and detail cards should carry the same 13 parsers in the same order; matrix is the scan, cards are the depth.
- Keep card `<dd>` content terse — this is a 10-minute read, not the full research file. Bullet the "work remaining" list to 3–6 items max per card, trim from the research file rather than pasting whole paragraphs.
- The mockup section needs no data — it's illustrative, not a real parser's output.
