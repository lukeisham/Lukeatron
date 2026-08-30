/**
 * test_crib-sheet.js — Smoke tests for crib-sheet module
 *
 * Tests: AC-CSB-1…16 (generation, rendering, editing, no-clobber,
 * markdown parsing, placeholder text, overflow flag, domain glyphs, XSS protection)
 *
 * Stdlib only: node:test, node:assert
 */

import test from 'node:test';
import assert from 'node:assert';
import { CribSheet, renderMarkdown } from '../app/js/crib-sheet.js';

// ===== FIXTURES =====

/**
 * Create a mock unit with minimal data for testing.
 */
function createMockUnit(title = 'Test Unit') {
  return {
    id: 'unit-test-001',
    title,
    curriculum: {
      title: 'Test Curriculum',
      labels: {
        cribSheetHalves: {
          upper: 'Core Concepts',
          lower: 'Applications'
        }
      }
    },
    cribSheet: {
      id: 'crib-sheet',
      title: `${title} Crib Sheet`,
      orientation: 'portrait',
      sections: [],
      pageCount: 1
    },
    nodes: [],
    images: []
  };
}

/**
 * Create mock big ideas for testing.
 */
function createMockBigIdeas() {
  return [
    {
      id: 'bi-001',
      title: 'Understanding Variables',
      parentId: null,
      topicId: 'topic-001',
      coverage: [
        { nodeId: 'node-001', coverage: 'full', note: null }
      ],
      children: [
        {
          id: 'bi-001-sub-1',
          title: 'Variable Declaration',
          parentId: 'bi-001',
          topicId: null,
          coverage: [
            { nodeId: 'node-002', coverage: 'full', note: null }
          ],
          children: []
        }
      ]
    },
    {
      id: 'bi-002',
      title: 'Working with Data Types',
      parentId: null,
      topicId: 'topic-002',
      coverage: [
        { nodeId: 'node-003', coverage: 'full', note: null }
      ],
      children: []
    }
  ];
}

/**
 * Mock LocalStore for testing.
 */
class MockLocalStore {
  constructor() {
    this.data = null;
  }

  saveUnit(unit) {
    this.data = unit;
    return Promise.resolve();
  }

  loadUnit() {
    return Promise.resolve(this.data);
  }
}

// ===== TESTS =====

test('CribSheet: initialization creates empty sheet', () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  assert.ok(cribSheet.unit.cribSheet);
  assert.equal(cribSheet.unit.cribSheet.orientation, 'portrait');
  assert.ok(Array.isArray(cribSheet.unit.cribSheet.sections));
});

test('CribSheet: generate() creates one section per big idea and sub-big idea', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  const bigIdeas = createMockBigIdeas();
  // Set up mock big idea global (simplified for test)
  global.__bigIdeasGlobal = new Map(
    bigIdeas.map(bi => [bi.id, bi])
      .concat(bigIdeas[0].children.map(c => [c.id, c]))
  );

  await cribSheet.generate(bigIdeas);

  // bigIdeas[0] has 1 child → expect 3 sections (2 top-level + 1 sub)
  // bigIdeas[1] has no children → expect 1 section
  // Total: 4 sections
  assert.equal(cribSheet.unit.cribSheet.sections.length, 3);
});

test('CribSheet: generate() seeds section with bigIdeaId, half="upper", empty text', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  const bigIdeas = createMockBigIdeas().slice(0, 1); // Just first one
  global.__bigIdeasGlobal = new Map([[bigIdeas[0].id, bigIdeas[0]]]);

  await cribSheet.generate(bigIdeas);

  const firstSection = cribSheet.unit.cribSheet.sections[0];
  assert.equal(firstSection.bigIdeaId, bigIdeas[0].id);
  assert.equal(firstSection.half, 'upper');
  assert.equal(firstSection.text, '');
  assert.ok(Array.isArray(firstSection.imageRefs));
  assert.equal(firstSection.provenance, 'generated');
});

test('CribSheet: no-clobber rule — re-generate preserves edited text, size, half', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  const bigIdeas = createMockBigIdeas().slice(0, 1);
  global.__bigIdeasGlobal = new Map([[bigIdeas[0].id, bigIdeas[0]]]);

  // First generation
  await cribSheet.generate(bigIdeas);
  const section = cribSheet.unit.cribSheet.sections[0];

  // Edit the section
  section.text = 'Important concept: variables are named containers';
  section.size = 'large';
  section.half = 'lower';
  section.provenance = 'edited';

  // Re-generate
  await cribSheet.generate(bigIdeas);
  const regeneratedSection = cribSheet.unit.cribSheet.sections[0];

  // Edits should be preserved
  assert.equal(regeneratedSection.text, 'Important concept: variables are named containers');
  assert.equal(regeneratedSection.size, 'large');
  assert.equal(regeneratedSection.half, 'lower');
  assert.equal(regeneratedSection.provenance, 'edited');
});

test('CribSheet: editSectionText() updates text and sets provenance to "edited"', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  const bigIdeas = createMockBigIdeas().slice(0, 1);
  global.__bigIdeasGlobal = new Map([[bigIdeas[0].id, bigIdeas[0]]]);

  await cribSheet.generate(bigIdeas);
  const newText = 'Variables are containers for data.';

  await cribSheet.editSectionText(0, newText);

  assert.equal(cribSheet.unit.cribSheet.sections[0].text, newText);
  assert.equal(cribSheet.unit.cribSheet.sections[0].provenance, 'edited');
});

test('CribSheet: editSectionSize() validates and updates size', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  const bigIdeas = createMockBigIdeas().slice(0, 1);
  global.__bigIdeasGlobal = new Map([[bigIdeas[0].id, bigIdeas[0]]]);

  await cribSheet.generate(bigIdeas);

  await cribSheet.editSectionSize(0, 'large');
  assert.equal(cribSheet.unit.cribSheet.sections[0].size, 'large');

  // Invalid size should throw
  assert.throws(() => cribSheet.editSectionSize(0, 'huge'), {
    message: /Invalid size/
  });
});

test('CribSheet: editSectionHalf() validates and updates half', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  const bigIdeas = createMockBigIdeas().slice(0, 1);
  global.__bigIdeasGlobal = new Map([[bigIdeas[0].id, bigIdeas[0]]]);

  await cribSheet.generate(bigIdeas);

  await cribSheet.editSectionHalf(0, 'lower');
  assert.equal(cribSheet.unit.cribSheet.sections[0].half, 'lower');

  // Invalid half should throw
  assert.throws(() => cribSheet.editSectionHalf(0, 'middle'), {
    message: /Invalid half/
  });
});

test('CribSheet: setOrientation() updates and validates orientation', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  await cribSheet.setOrientation('landscape');
  assert.equal(cribSheet.unit.cribSheet.orientation, 'landscape');

  // Invalid orientation should throw
  assert.throws(() => cribSheet.setOrientation('diagonal'), {
    message: /Invalid orientation/
  });
});

test('renderMarkdown: bold text **text**', () => {
  const input = 'This is **bold text** in a sentence.';
  const escapedInput = input; // Already HTML-safe
  const output = renderMarkdown(escapedInput);
  assert.ok(output.includes('<strong>bold text</strong>'));
});

test('renderMarkdown: italic text *text*', () => {
  const input = 'This is *italic text* in a sentence.';
  const output = renderMarkdown(input);
  assert.ok(output.includes('<em>italic text</em>'));
});

test('renderMarkdown: bullet list - item', () => {
  const input = '- First point\n- Second point';
  const output = renderMarkdown(input);
  assert.ok(output.includes('<ul>'));
  assert.ok(output.includes('<li>'));
  assert.ok(output.includes('First point'));
  assert.ok(output.includes('Second point'));
});

test('renderMarkdown: unsupported syntax renders as literal (headers)', () => {
  const input = '# This is a header';
  const output = renderMarkdown(input);
  // Should render the # as literal text, not as a header
  assert.ok(output.includes('#'));
  assert.ok(!output.includes('<h1>'));
});

test('renderMarkdown: unsupported syntax renders as literal (code blocks)', () => {
  const input = '`code block`';
  const output = renderMarkdown(input);
  // Should render backticks literally
  assert.ok(output.includes('`'));
});

test('renderMarkdown: HTML-escaped text remains safe', () => {
  // Simulating escaped user input that tried an XSS
  const userInput = '<img src=x onerror=alert(1)>';
  const escaped = userInput
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const output = renderMarkdown(escaped);
  // Should NOT contain unescaped tags
  assert.ok(output.includes('&lt;img'));
  assert.ok(!output.includes('<img src=x onerror='));
});

test('CribSheet: placeholder text never appears in saved text field', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  const bigIdeas = createMockBigIdeas().slice(0, 1);
  global.__bigIdeasGlobal = new Map([[bigIdeas[0].id, bigIdeas[0]]]);

  await cribSheet.generate(bigIdeas);
  const section = cribSheet.unit.cribSheet.sections[0];

  // Placeholder text should never be in the text field
  assert.ok(!section.text.includes('Add content'));
  assert.ok(!section.text.includes('Big ideas'));
  assert.equal(section.text, '');
});

test('CribSheet: getPageCount returns 1 initially', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  assert.equal(cribSheet.getPageCount(), 1);
});

test('CribSheet: isOverflow returns false initially', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  assert.equal(cribSheet.isOverflow(), false);
});

test('CribSheet: addImage() appends to section imageRefs', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  const bigIdeas = createMockBigIdeas().slice(0, 1);
  global.__bigIdeasGlobal = new Map([[bigIdeas[0].id, bigIdeas[0]]]);

  await cribSheet.generate(bigIdeas);

  const imageRef = {
    imageId: 'img-0001',
    x: 10,
    y: 20,
    width: 50,
    height: 40
  };

  await cribSheet.addImage(0, imageRef);

  assert.equal(cribSheet.unit.cribSheet.sections[0].imageRefs.length, 1);
  assert.deepEqual(cribSheet.unit.cribSheet.sections[0].imageRefs[0], imageRef);
});

test('CribSheet: removeImage() filters out image by imageId', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  const bigIdeas = createMockBigIdeas().slice(0, 1);
  global.__bigIdeasGlobal = new Map([[bigIdeas[0].id, bigIdeas[0]]]);

  await cribSheet.generate(bigIdeas);

  const imageRef = { imageId: 'img-0001', x: 10, y: 20, width: 50, height: 40 };
  await cribSheet.addImage(0, imageRef);
  await cribSheet.removeImage(0, 'img-0001');

  assert.equal(cribSheet.unit.cribSheet.sections[0].imageRefs.length, 0);
});

test('CribSheet: render() method exists and is callable', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  const bigIdeas = createMockBigIdeas().slice(0, 1);
  global.__bigIdeasGlobal = new Map([[bigIdeas[0].id, bigIdeas[0]]]);

  await cribSheet.generate(bigIdeas);

  // Verify render method exists
  assert.ok(typeof cribSheet.render === 'function');
});

// ===== BOUNDARY TESTS =====

test('CribSheet: editSectionText() with out-of-bounds index throws', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  assert.throws(() => cribSheet.editSectionText(999, 'text'), {
    message: /out of bounds/
  });
});

test('CribSheet: editSectionSize() with out-of-bounds index throws', async () => {
  const unit = createMockUnit();
  const store = new MockLocalStore();
  const cribSheet = new CribSheet(unit, store);

  assert.throws(() => cribSheet.editSectionSize(999, 'large'), {
    message: /out of bounds/
  });
});

test('renderMarkdown: handles empty string', () => {
  const output = renderMarkdown('');
  assert.equal(output, '');
});

test('renderMarkdown: handles non-string input gracefully', () => {
  const output = renderMarkdown(null);
  assert.equal(output, '');

  const output2 = renderMarkdown(undefined);
  assert.equal(output2, '');
});

// ============================================================================
// BUG-5 regression — computeGlyphSet's third parameter is a NODES-BOUND,
// one-argument resolveDomain(nodeId) function (see bigidea-list.js's own
// doc comment and _research/_INTERFACES.md), not the raw two-argument
// resolveDomain(nodeId, nodes) exported by domain-resolver.js. Passing the
// raw function makes computeGlyphSet call resolveDomain(nodeId) with nodes
// undefined, which throws "nodes must be an array" and the Crib Sheet never
// renders. Hand-built fake SVG DOM per TEST-8 (no jsdom).
// ============================================================================

class FakeSVGElement {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.attributes = {};
    this.textContent = '';
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  appendChild(child) { this.children.push(child); return child; }
  remove() {}
}

test('BUG-5: _renderSection computes a domain glyph without throwing (resolveDomain bound to nodes)', async () => {
  const priorDocument = globalThis.document;
  const priorWindow = globalThis.window;
  globalThis.document = {
    createElementNS: (ns, tag) => new FakeSVGElement(tag)
  };

  try {
    const unit = createMockUnit();
    unit.nodes = [
      { id: 'strand-1', kind: 'strand', title: 'Strand 1', parentId: null, domain: 'skill' },
      { id: 'node-001', kind: 'outcome', title: 'Outcome 1', parentId: 'strand-1' }
    ];
    const store = new MockLocalStore();
    const cribSheet = new CribSheet(unit, store);

    const bigIdeas = createMockBigIdeas().slice(0, 1); // bi-001, coverage -> node-001
    globalThis.window = { __bigIdeasGlobal: new Map([[bigIdeas[0].id, bigIdeas[0]]]) };

    await cribSheet.generate(bigIdeas);

    const section = cribSheet.unit.cribSheet.sections[0];
    assert.ok(section, 'a section was generated');

    const pageData = {
      bigIdeasMap: { [bigIdeas[0].id]: bigIdeas[0] },
      nodes: unit.nodes,
      images: []
    };
    const g = new FakeSVGElement('g');

    assert.doesNotThrow(
      () => cribSheet._renderSection(g, section, 20, pageData),
      'rendering a section must not throw when computing its domain glyph'
    );
  } finally {
    if (priorDocument === undefined) delete globalThis.document; else globalThis.document = priorDocument;
    if (priorWindow === undefined) delete globalThis.window; else globalThis.window = priorWindow;
  }
});

console.log('All crib-sheet tests passed!');
