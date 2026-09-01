/**
 * test_toolbar-actions.js — Smoke tests for the Print/Copy/Export CSV toolbar
 *
 * Uses node:test (stdlib), no external dependencies.
 * Hand-built fake DOM (no jsdom), matching the convention already used by
 * test_document-shell.js and test_unit-assessment-document.js.
 *
 * Tests: extractSurfaceText() SVG-page and plain-HTML extraction, button
 * construction/labels, clipboard success/rejection handling, CSV button
 * gating, print() invocation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// ===== Fake DOM =====
class FakeElement {
  constructor(tag) {
    this.tag = tag;
    this.attributes = {};
    this.children = [];
    this._classes = new Set();
    this.textContent = '';
    this._listeners = {};
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(type, handler) {
    this._listeners[type] = handler;
  }

  click() {
    if (this._listeners.click) this._listeners.click();
  }

  get classList() {
    const set = this._classes;
    return {
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      toggle: (c, on) => (on ? set.add(c) : set.delete(c)),
      contains: (c) => set.has(c)
    };
  }

  set className(value) {
    this._classes = new Set(value.split(' ').filter(Boolean));
  }

  get className() {
    return Array.from(this._classes).join(' ');
  }

  // Minimal querySelectorAll: supports "svg.document-page" and "text" only,
  // which is all extractSurfaceText() needs.
  querySelectorAll(selector) {
    const results = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (matches(child, selector)) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }

  get innerText() {
    return collectText(this);
  }
}

function matches(el, selector) {
  if (selector === 'svg.document-page') {
    return el.tag === 'svg' && el.classList.contains('document-page');
  }
  if (selector === 'text') {
    return el.tag === 'text';
  }
  return false;
}

function collectText(el) {
  let out = el.textContent || '';
  for (const child of el.children) out += collectText(child);
  return out;
}

global.document = {
  createElement: (tag) => new FakeElement(tag)
};

let printCalls = 0;
global.window = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  print: () => { printCalls += 1; }
};

let clipboardResult = { ok: true, written: null };
// Node 26+ defines a read-only global `navigator` getter (Web-standard API
// surface), so it can't be reassigned with `global.navigator = ...` the way
// `document`/`window` above can — redefine the property instead.
Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: (text) => {
        clipboardResult.written = text;
        return clipboardResult.ok ? Promise.resolve() : Promise.reject(new Error('denied'));
      }
    }
  },
  configurable: true
});

const { extractSurfaceText, mountToolbar } = await import('../app/js/toolbar-actions.js');

// ===== extractSurfaceText =====
test('extractSurfaceText: extracts and groups text from SVG document pages', () => {
  const container = new FakeElement('div');
  const svg = new FakeElement('svg');
  svg.className = 'document-page';
  const t1 = new FakeElement('text');
  t1.textContent = 'Line one';
  const t2 = new FakeElement('text');
  t2.textContent = 'Line two';
  svg.appendChild(t1);
  svg.appendChild(t2);
  container.appendChild(svg);

  const result = extractSurfaceText(container);
  assert.equal(result, 'Line one\nLine two');
});

test('extractSurfaceText: joins multiple pages with a separator', () => {
  const container = new FakeElement('div');
  for (const content of ['Page 1 text', 'Page 2 text']) {
    const svg = new FakeElement('svg');
    svg.className = 'document-page';
    const t = new FakeElement('text');
    t.textContent = content;
    svg.appendChild(t);
    container.appendChild(svg);
  }

  const result = extractSurfaceText(container);
  assert.equal(result, 'Page 1 text\n\n---\n\nPage 2 text');
});

test('extractSurfaceText: falls back to innerText when there are no SVG pages', () => {
  const container = new FakeElement('div');
  const p = new FakeElement('p');
  p.textContent = 'Plain HTML content';
  container.appendChild(p);

  const result = extractSurfaceText(container);
  assert.equal(result, 'Plain HTML content');
});

test('extractSurfaceText: returns empty string for a null/undefined container', () => {
  assert.equal(extractSurfaceText(null), '');
  assert.equal(extractSurfaceText(undefined), '');
});

// ===== mountToolbar =====
test('mountToolbar: builds Print and Copy buttons with accessible names, no CSV button by default', () => {
  const toolbar = mountToolbar({ getText: () => 'hello', label: 'Test Surface' });
  assert.equal(toolbar.children.length, 2, 'only Print and Copy by default');

  const [printBtn, copyBtn] = toolbar.children;
  assert.equal(printBtn.getAttribute('aria-label'), 'Print Test Surface');
  assert.equal(copyBtn.getAttribute('aria-label'), 'Copy Test Surface to clipboard');
  assert.equal(toolbar.getAttribute('role'), 'toolbar');
  assert.ok(toolbar.classList.contains('screen-only'), 'toolbar is hidden by the existing print CSS');
});

test('mountToolbar: adds an Export CSV button when getCSVSource is provided', () => {
  const toolbar = mountToolbar({
    getText: () => '',
    getCSVSource: () => ({ unit: {}, markingMatrix: {} }),
    label: 'Marking Matrix'
  });
  assert.equal(toolbar.children.length, 3, 'Print, Copy, and Export CSV');
  assert.equal(toolbar.children[2].getAttribute('aria-label'), 'Export Marking Matrix as CSV');
});

test('mountToolbar: Print button calls window.print()', () => {
  printCalls = 0;
  const toolbar = mountToolbar({ getText: () => '', label: 'X' });
  toolbar.children[0].click();
  assert.equal(printCalls, 1);
});

test('mountToolbar: Copy button writes getText() output to the clipboard', async () => {
  clipboardResult = { ok: true, written: null };
  const toolbar = mountToolbar({ getText: () => 'copy this text', label: 'X' });
  toolbar.children[1].click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(clipboardResult.written, 'copy this text');
});

test('mountToolbar: Copy button handles clipboard rejection gracefully (no throw)', async () => {
  clipboardResult = { ok: false, written: null };
  const toolbar = mountToolbar({ getText: () => 'will fail', label: 'X' });
  assert.doesNotThrow(() => toolbar.children[1].click());
  await new Promise((r) => setTimeout(r, 0));
});
