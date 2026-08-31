#!/usr/bin/env node
/**
 * test_app.js — Smoke tests for the bootstrap script (app.js)
 *
 * Stdlib only (node:test, node:assert/strict). Hand-built fake DOM (TEST-8:
 * no jsdom, no library) — exposes only what app.js's exported helpers touch:
 * createElement, appendChild, textContent, dataset, classList, setAttribute,
 * getElementById, querySelectorAll.
 *
 * app.js calls boot() at import time only when `window` exists (guarded),
 * so importing it here under node:test never triggers a real fetch().
 */

import assert from 'node:assert/strict';
import test from 'node:test';

// ===== Minimal fake DOM =====

function makeElement(tag) {
  return {
    tagName: tag,
    children: [],
    attributes: {},
    dataset: {},
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      toggle(c, on) { if (on) this._set.add(c); else this._set.delete(c); },
      has(c) { return this._set.has(c); }
    },
    _text: '',
    get textContent() { return this._text; },
    set textContent(v) {
      this._text = v;
      // Setting textContent clears children, mirroring real DOM semantics.
      this.children = [];
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name]; },
    addEventListener() {},
    querySelectorAll() { return this._queryTargets || []; }
  };
}

async function withFakeBrowserGlobals(fn, { nav, main } = {}) {
  const priorDocument = globalThis.document;
  const priorWindow = globalThis.window;

  const navEl = nav || makeElement('nav');
  const mainEl = main || makeElement('main');

  globalThis.document = {
    readyState: 'complete',
    createElement(tag) { return makeElement(tag); },
    createElementNS(_ns, tag) { return makeElement(tag); },
    getElementById(id) {
      if (id === 'app-nav') return navEl;
      if (id === 'app-content') return mainEl;
      return null;
    },
    addEventListener() {}
  };
  // `window` intentionally NOT defined as globalThis.window: app.js's guarded
  // boot() only auto-runs `if (typeof window !== 'undefined')`, and we don't
  // want a real fetch() firing during import. arbor-tree.js's own top-level
  // auto-init (a pre-existing side effect independent of this bootstrap —
  // see the closing report) reads `window.arborTree`/`window.localStore`
  // defensively inside a try/catch, so leaving window undefined there is
  // safe: it throws ReferenceError, which its own catch swallows.
  globalThis.window = globalThis.window; // no-op; documents intent above

  try {
    return await fn({ navEl, mainEl });
  } finally {
    if (priorDocument === undefined) delete globalThis.document;
    else globalThis.document = priorDocument;
    if (priorWindow === undefined) delete globalThis.window;
    else globalThis.window = priorWindow;
  }
}

// ===== Tests =====

test('TEST-1: app.js imports cleanly and exposes the six-part-plus nav', async () => {
  const mod = await withFakeBrowserGlobals(() => import('../app/js/app.js'));
  assert.ok(Array.isArray(mod.PARTS), 'PARTS should be an array');
  assert.ok(mod.PARTS.length >= 8, 'nav should cover curriculum map + coverage grid + lessons&topics + lesson plans + unit assessment + marking matrix + crib sheet + resources');
  for (const part of mod.PARTS) {
    assert.equal(typeof part.mount, 'function', `part ${part.id} must have a mount function`);
  }
});

test('happy path: adoptShellPages moves a DocumentShell\'s pages into the given container', async () => {
  await withFakeBrowserGlobals(async () => {
    const { adoptShellPages } = await import('../app/js/app.js');
    const container = makeElement('div');
    const page1 = makeElement('svg');
    const page2 = makeElement('svg');
    const fakeShell = { svgPages: [page1, page2] };

    adoptShellPages(fakeShell, container);

    assert.equal(container.children.length, 2, 'both pages should be appended');
    assert.equal(container.children[0], page1);
    assert.equal(container.children[1], page2);
  });
});

test('guard: adoptShellPages tolerates a missing/malformed shell without throwing', async () => {
  await withFakeBrowserGlobals(async () => {
    const { adoptShellPages } = await import('../app/js/app.js');
    const container = makeElement('div');

    assert.doesNotThrow(() => adoptShellPages(null, container), 'null shell should be a no-op');
    assert.doesNotThrow(() => adoptShellPages({}, container), 'shell without svgPages should be a no-op');
    assert.equal(container.children.length, 0, 'nothing should have been appended');
  });
});

test('ensureSingleH1 appends exactly one heading with the part label (HTML-3)', async () => {
  await withFakeBrowserGlobals(async () => {
    const { ensureSingleH1 } = await import('../app/js/app.js');
    const main = makeElement('main');

    const heading = ensureSingleH1(main, 'Marking Matrix');

    assert.equal(main.children.length, 1, 'exactly one heading element should be appended');
    assert.equal(heading.tagName, 'h2', 'part heading is h2, so the page-level h1 stays unique');
    assert.equal(heading.textContent, 'Marking Matrix', 'heading text must not be HTML-escaped garbage or blank');
  });
});

test('buildNav renders one button per part into #app-nav', async () => {
  await withFakeBrowserGlobals(async ({ navEl }) => {
    const { buildNav, PARTS } = await import('../app/js/app.js');
    buildNav();

    assert.equal(navEl.children.length, 1, 'nav should contain a single <ul> list');
    const list = navEl.children[0];
    assert.equal(list.children.length, PARTS.length, 'one <li> per nav part');
  });
});
