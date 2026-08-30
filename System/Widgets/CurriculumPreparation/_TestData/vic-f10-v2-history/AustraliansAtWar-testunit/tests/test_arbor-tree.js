// test_arbor-tree.js — Real behavioural tests for ArborTree renderer (FR-ATB-*)
//
// Replaces a prior version whose tests were shams: every assertion was wrapped in
// `try { assert(real check) } catch { assert(true) }`, so a failing check was silently
// swallowed and replaced with an always-true assertion. See _research/_REPAIR.md.
//
// Pattern follows tests/test_document-shell.js: a hand-built fake SVG DOM, no jsdom,
// no library (TEST-8). Every assertion here checks real output — rendered attribute
// values, text content, computed positions — never "did it throw".

import test from 'node:test';
import assert from 'node:assert/strict';

// ===== Hand-built fake SVG DOM (no jsdom) =====
// Extends the pattern from test_document-shell.js with insertBefore/removeChild/
// firstChild, which arbor-tree.js's _renderEdges and renderPage both use.
class MockSVGElement {
  constructor(tag) {
    this.tag = tag;
    this.attributes = {};
    this.children = [];
    this.classList = new Set();
    this._textContent = '';
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  appendChild(child) { if (child) this.children.push(child); return child; }
  removeChild(child) {
    this.children = this.children.filter((c) => c !== child);
    return child;
  }
  insertBefore(newNode, refNode) {
    if (refNode == null) {
      this.children.push(newNode);
    } else {
      const idx = this.children.indexOf(refNode);
      if (idx === -1) this.children.push(newNode);
      else this.children.splice(idx, 0, newNode);
    }
    return newNode;
  }
  get firstChild() { return this.children.length ? this.children[0] : null; }
  set textContent(v) { this._textContent = v; }
  get textContent() { return this._textContent; }
}

global.document = {
  head: { appendChild: () => {} },
  body: { appendChild: () => {}, children: [] },
  createElementNS: (ns, tag) => new MockSVGElement(tag),
  createElement: (tag) => new MockSVGElement(tag),
  createTextNode: (text) => ({ textContent: text }),
  getElementById: () => null,
  // readyState 'loading' means arbor-tree.js's module-bottom auto-init only
  // registers a DOMContentLoaded listener and never actually runs — we never
  // dispatch that event, so the module's own LocalStore()/DocumentShell()
  // side effects at import time are avoided entirely.
  readyState: 'loading',
  addEventListener: () => {}
};
global.window = {};

const { default: ArborTree } = await import('../app/js/arbor-tree.js');
const { layoutTree, buildEdgeList } = await import('../app/js/tidy-tree.js');
const { resolveDomain } = await import('../app/js/domain-resolver.js');

// ===== Helpers =====

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

function collectAll(el, predicate, out = []) {
  if (predicate(el)) out.push(el);
  for (const child of el.children || []) collectAll(child, predicate, out);
  return out;
}

function makeTree() {
  const tree = new ArborTree({ getUnit: () => null });
  return tree;
}

// ===== AC-ATB-1: tidy-tree layout produces non-overlapping positions =====

test('tidy-tree: realistic single-strand fixture (~15 outcomes, several tasks each) has zero rectangle overlap', () => {
  const nodes = [{ id: 'strand-1', kind: 'strand', parentId: null, code: 'A', title: 'Strand' }];
  for (let i = 1; i <= 15; i++) {
    const outcomeId = `outcome-${i}`;
    nodes.push({ id: outcomeId, kind: 'outcome', parentId: 'strand-1', code: `A.${i}`, title: `Outcome ${i}` });
    for (let j = 1; j <= 2; j++) {
      nodes.push({
        id: `${outcomeId}-task-${j}`, kind: 'task', parentId: outcomeId,
        code: `A.${i}.${j}`, title: `Task ${i}.${j}`
      });
    }
  }
  // 1 strand + 15 outcomes + 30 tasks = 46 nodes
  assert.equal(nodes.length, 46);

  const edges = buildEdgeList(nodes);
  const positions = layoutTree(nodes, edges, 140, 80);

  assert.equal(positions.length, 46, 'every node in a single connected tree must get a position');

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      assert.ok(!rectsOverlap(positions[i], positions[j]),
        `nodes ${positions[i].nodeId} and ${positions[j].nodeId} overlap at realistic scale`);
    }
  }
});

test('tidy-tree: KNOWN BUG — a second top-level strand (parentId: null) and its entire subtree vanish from layout', () => {
  // AC-ATB-1's own fixture description is "~2 strands, ~15 outcomes ... each" — a
  // curriculum unit has multiple strand nodes, each with parentId: null (confirmed by
  // tests/test_curriculum-editor.js's own fixtures). layoutTree's `visit()` only starts
  // from a single root — "the first node with no parentId" — and never revisits sibling
  // roots, so every node under the second (and any further) strand is silently dropped.
  const nodes = [
    { id: 'strand-1', kind: 'strand', parentId: null, code: 'A', title: 'Strand One' },
    { id: 'a-o1', kind: 'outcome', parentId: 'strand-1', code: 'A.1', title: 'Outcome' },
    { id: 'strand-2', kind: 'strand', parentId: null, code: 'B', title: 'Strand Two' },
    { id: 'b-o1', kind: 'outcome', parentId: 'strand-2', code: 'B.1', title: 'Outcome' }
  ];
  const edges = buildEdgeList(nodes);
  const positions = layoutTree(nodes, edges, 140, 80);
  const laidOutIds = positions.map((p) => p.nodeId).sort();

  // This is the CORRECT expected behaviour per AC-ATB-1 (every node of a ~2-strand unit
  // gets laid out). It currently fails: layoutTree returns only ['a-o1', 'strand-1'] —
  // strand-2 and b-o1 are missing entirely, not merely overlapping.
  assert.deepEqual(laidOutIds, ['a-o1', 'b-o1', 'strand-1', 'strand-2'],
    'every node across all top-level strands must appear in the layout, not just the first strand');
});

// ===== FR-ATB-3 / INV-DM-2: verbatim code/title rendering =====

test('arbor-tree: node code and title render verbatim — unusual punctuation, mixed case, not re-cased', () => {
  const tree = makeTree();
  // Kept under 18 chars deliberately — this test isolates verbatim rendering (no
  // reformatting, re-casing, or punctuation-stripping) from the separate truncation
  // defect exercised by the dedicated "KNOWN BUG" test below.
  const fixtures = [
    { id: 'n1', code: '1.2(a)—iii', title: '"Odd" Punct.!' },
    { id: 'n2', code: 'aB-3.2!', title: 'MiXeD Case' },
    { id: 'n3', code: 'X_9/Y', title: 'Semi; test' }
  ];
  tree.unit = { nodes: fixtures.map((f) => ({ ...f, kind: 'strand', parentId: null })) };

  for (const fixture of fixtures) {
    const group = new MockSVGElement('g');
    const pos = { x: 0, y: 0, width: 140, height: 80 };
    tree._renderNodeCard(group, fixture, pos);

    const texts = collectAll(group, (el) => el.tag === 'text');
    const codeText = texts[0];
    const titleText = texts[1];

    assert.equal(codeText.textContent, fixture.code,
      `code should render verbatim (no glyph, no domain set): got "${codeText.textContent}"`);
    assert.equal(titleText.textContent, fixture.title,
      `title should render verbatim: got "${titleText.textContent}"`);
  }
});

test('arbor-tree: KNOWN BUG — node code/title longer than 18 characters is silently truncated, violating verbatim rendering (FR-ATB-3, INV-DM-2)', () => {
  const tree = makeTree();
  const node = {
    id: 'long-1', kind: 'strand', parentId: null,
    code: 'STRAND-VeryLongCodeName-123',
    title: 'A curriculum node title that is much longer than eighteen characters'
  };
  tree.unit = { nodes: [node] };

  const group = new MockSVGElement('g');
  const pos = { x: 0, y: 0, width: 140, height: 80 };
  tree._renderNodeCard(group, node, pos);

  const texts = collectAll(group, (el) => el.tag === 'text');
  // This is what "verbatim, never truncated" (FR-ATB-3 / INV-DM-2) requires.
  // arbor-tree.js's _renderNodeCard calls this._truncate(codeText, 18) and
  // this._truncate(node.title, 18), so both currently come back cut to 17 chars + '…'.
  assert.equal(texts[0].textContent, node.code,
    'node code must never be truncated per FR-ATB-3/INV-DM-2');
  assert.equal(texts[1].textContent, node.title,
    'node title must never be truncated per FR-ATB-3/INV-DM-2');
});

// ===== AD-ATB-3: three coverage chip kinds stay independent =====

test('arbor-tree: a node with all three coverage kinds renders three independent, non-merged chips', () => {
  const tree = makeTree();
  const n1 = { id: 'n1', kind: 'strand', parentId: null, code: 'N1', title: 'Node 1' };
  const n2 = { id: 'n2', kind: 'strand', parentId: null, code: 'N2', title: 'Node 2' };
  tree.unit = {
    nodes: [n1, n2],
    lessons: [],
    bigIdeas: [{ id: 'bi1', title: 'BI One', coverage: [{ nodeId: 'n1', coverage: 'full' }] }],
    unitAssessment: {
      finalAssessment: { id: 'fa1', title: 'Final', coverage: [{ nodeId: 'n1', coverage: 'partial' }] },
      miniAssessments: []
    },
    topics: [{
      id: 't1', title: 'Topic A',
      coverage: [{ nodeId: 'n1', coverage: 'full' }, { nodeId: 'n2', coverage: 'partial' }]
    }]
  };

  // Real derivation pipeline — not hand-set maps — so this also exercises AD-ATB-2's wiring.
  tree.deriveCoverage();

  const pos = { x: 0, y: 0, width: 140, height: 80 };

  const groupN1 = new MockSVGElement('g');
  tree._renderChips(groupN1, n1, pos, 20);
  const rectsN1 = collectAll(groupN1, (el) => el.tag === 'rect');
  const strokesN1 = rectsN1.map((r) => r.getAttribute('stroke')).sort();

  assert.equal(rectsN1.length, 3, 'node covered by all three kinds must render exactly three chips');
  assert.deepEqual(strokesN1, ['#185FA5', '#703508', '#9A4E12'].sort(),
    'the three chips must be big-idea, topic, and assessment coloured independently, not merged into one indicator');

  // Topic-only node (AC-ATB-7): no big-idea or assessment coverage of its own.
  const groupN2 = new MockSVGElement('g');
  tree._renderChips(groupN2, n2, pos, 20);
  const rectsN2 = collectAll(groupN2, (el) => el.tag === 'rect');

  assert.equal(rectsN2.length, 1, 'a topic-only node must render exactly one chip');
  assert.equal(rectsN2[0].getAttribute('stroke'), '#703508', 'the only chip on a topic-only node must be the topic chip');
});

// ===== FR-ATB-10: domain glyphs come from the shared resolveDomain function =====

test('arbor-tree: domain glyph on a rendered node reflects resolveDomain\'s actual output, for both skill and knowledge domains', () => {
  const tree = makeTree();
  const skillStrand = { id: 's-skill', kind: 'strand', parentId: null, domain: 'skill', code: 'SK', title: 'Skill Strand' };
  const skillOutcome = { id: 'o-skill', kind: 'outcome', parentId: 's-skill', code: 'SK.1', title: 'Skill Outcome' };
  const knowledgeStrand = { id: 's-know', kind: 'strand', parentId: null, domain: 'knowledge', code: 'KN', title: 'Knowledge Strand' };
  const unsetStrand = { id: 's-unset', kind: 'strand', parentId: null, code: 'UN', title: 'Unset Strand' };

  const allNodes = [skillStrand, skillOutcome, knowledgeStrand, unsetStrand];
  tree.unit = { nodes: allNodes };
  const pos = { x: 0, y: 0, width: 140, height: 80 };

  for (const node of [skillStrand, skillOutcome, knowledgeStrand, unsetStrand]) {
    const group = new MockSVGElement('g');
    tree._renderNodeCard(group, node, pos);
    const codeText = collectAll(group, (el) => el.tag === 'text')[0];

    // Compute expected glyph from the SAME shared function arbor-tree is required to call
    // (FR-ATB-10 / AD-ATB-4), rather than hardcoding which node "should" be which domain —
    // ties the assertion to the shared function's real return value.
    const domain = resolveDomain(node.id, allNodes);
    const expectedPrefix = domain === 'skill' ? '✎ ' : domain === 'knowledge' ? '📓 ' : '';

    assert.ok(codeText.textContent.startsWith(expectedPrefix),
      `node ${node.id}: resolveDomain returned "${domain}" but rendered code was "${codeText.textContent}"`);
    if (domain === null) {
      assert.ok(!codeText.textContent.startsWith('✎ ') && !codeText.textContent.startsWith('📓 '),
        `node ${node.id} has no resolvable domain and must render no glyph`);
    }
  }
});

// ===== Empty nodes[] renders a sensible empty state =====

test('arbor-tree: empty nodes[] renders a sensible empty-state message, not a throw or a broken tree', () => {
  const tree = makeTree();
  tree.unit = { nodes: [], bigIdeas: [], lessons: [], topics: [], unitAssessment: {} };
  tree.deriveCoverage();

  const svg = new MockSVGElement('svg');
  assert.doesNotThrow(() => tree.renderPage({}, svg));

  const texts = collectAll(svg, (el) => el.tag === 'text');
  const messageText = texts.find((t) => t.textContent.includes('No curriculum nodes'));
  assert.ok(messageText, 'must render a sensible empty-state message mentioning "No curriculum nodes"');

  // No node cards should have been rendered — a card background rect has rx="4".
  const cardRects = collectAll(svg, (el) => el.tag === 'rect' && el.getAttribute('rx') === '4');
  assert.equal(cardRects.length, 0, 'an empty tree must render zero node cards');
});

// ===== SVG discipline: viewBox present and correctly spelled =====

test('arbor-tree: rendered root SVG carries a correctly-spelled viewBox attribute', () => {
  const tree = makeTree();
  tree.unit = { nodes: [], bigIdeas: [], lessons: [], topics: [], unitAssessment: {} };
  tree.deriveCoverage();

  const svg = new MockSVGElement('svg');
  tree.renderPage({}, svg);

  assert.equal(svg.getAttribute('viewBox'), '0 0 1123 794',
    'viewBox must be set to the A4-landscape-at-96dpi dimensions');
  // Guard against the common typo (lowercase "viewbox") landing instead of the real one.
  assert.equal(svg.getAttribute('viewbox'), undefined, 'must not use a lowercase "viewbox" attribute');
});
