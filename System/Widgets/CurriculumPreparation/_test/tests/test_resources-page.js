/**
 * Smoke tests for resources-page.js (TEST-1/TEST-2/TEST-7)
 *
 * Implements TEST-1 (stdlib only), TEST-2 (3 assertions per module),
 * TEST-6 (assert on actual output), TEST-7 (gate tests for security).
 *
 * Tests:
 * 1. Module imports cleanly
 * 2. Happy path: add items (link, image, text), edit, delete, reorder
 * 3. URL scheme validation (blocked paths + permitted paths)
 * 4. HTML escaping (XSS prevention)
 * 5. No outbound requests (gate test)
 */

import { strict as assert } from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { ResourcesPage, validateURLScheme, htmlEscape } from '../app/js/resources-page.js';

// Mock LocalStore for testing (no real network)
class MockLocalStore {
  constructor() {
    this.lastSavedUnit = null;
  }

  async saveUnit(unit) {
    this.lastSavedUnit = JSON.parse(JSON.stringify(unit)); // Deep copy
    return Promise.resolve();
  }

  async loadUnit() {
    return Promise.resolve(this.lastSavedUnit || {});
  }

  hasUnsavedChanges() {
    return false;
  }
}

// ===== Minimal mock DOM for render() tests (hand-built, no jsdom) =====
// Mirrors the mock used by tests/test_document-shell.js, extended with
// removeChild/lastElementChild/parentNode so the placeholder-swap logic in
// resources-page.js's _renderImageItem can be exercised.
class MockSVGElement {
  constructor(tag) {
    this.tag = tag;
    this.attributes = {};
    this.attributesNS = {};
    this.children = [];
    this.classList = { add: () => {} };
    this.textContent = '';
    this.parentNode = null;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  setAttributeNS(ns, name, value) {
    this.attributesNS[`${ns}:${name}`] = value;
  }

  getAttributeNS(ns, name) {
    return this.attributesNS[`${ns}:${name}`];
  }

  appendChild(child) {
    if (child) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
  }

  get lastElementChild() {
    return this.children[this.children.length - 1] || null;
  }

  remove() {
    // no-op for mock
  }
}

function installMockDom() {
  global.document = {
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
    createElementNS: (ns, tag) => new MockSVGElement(tag),
    createElement: (tag) => new MockSVGElement(tag),
    createTextNode: (text) => ({ textContent: text }),
    getElementById: () => null
  };
  global.URL = {
    createObjectURL: () => 'blob:mock-url',
    revokeObjectURL: () => {}
  };
}

describe('resources-page', () => {
  // ===== Import Test =====
  test('module imports cleanly', () => {
    assert.ok(typeof ResourcesPage === 'function', 'ResourcesPage class should export');
    assert.ok(typeof validateURLScheme === 'function', 'validateURLScheme should export');
    assert.ok(typeof htmlEscape === 'function', 'htmlEscape should export');
  });

  // ===== URL Scheme Validation (TEST-7 gate tests) =====
  describe('validateURLScheme', () => {
    test('allows http:// URLs (permitted path)', () => {
      const result = validateURLScheme('http://example.com');
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.protocol, 'http:');
    });

    test('allows https:// URLs (permitted path)', () => {
      const result = validateURLScheme('https://example.com');
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.protocol, 'https:');
    });

    test('blocks javascript: URLs (blocked path)', () => {
      const result = validateURLScheme('javascript:alert(1)');
      assert.strictEqual(result.isValid, false);
    });

    test('blocks data: URLs (blocked path)', () => {
      const result = validateURLScheme('data:text/html,<img src=x onerror=alert(1)>');
      assert.strictEqual(result.isValid, false);
    });

    test('blocks file: URLs', () => {
      const result = validateURLScheme('file:///etc/passwd');
      assert.strictEqual(result.isValid, false);
    });

    test('blocks bare strings and invalid URLs', () => {
      const result = validateURLScheme('not a url');
      assert.strictEqual(result.isValid, false);
    });

    test('rejects empty strings', () => {
      const result = validateURLScheme('');
      assert.strictEqual(result.isValid, false);
    });
  });

  // ===== HTML Escaping (XSS Prevention) =====
  describe('htmlEscape', () => {
    test('escapes HTML special characters', () => {
      const xssAttempt = '<img src=x onerror="alert(1)">';
      const escaped = htmlEscape(xssAttempt);
      // Escaped version should not contain actual HTML tags
      assert.ok(!escaped.includes('<img'), 'Should escape img tag');
      assert.ok(escaped.includes('&lt;'), 'Should convert < to &lt;');
      assert.ok(escaped.includes('&gt;'), 'Should convert > to &gt;');
    });

    test('escapes ampersands', () => {
      const text = 'Tom & Jerry';
      const escaped = htmlEscape(text);
      assert.strictEqual(escaped, 'Tom &amp; Jerry');
    });

    test('handles empty strings gracefully', () => {
      const escaped = htmlEscape('');
      assert.strictEqual(escaped, '');
    });

    test('handles non-string input', () => {
      const escaped = htmlEscape(null);
      assert.strictEqual(escaped, '');
    });
  });

  // ===== ResourcesPage Class Tests =====
  describe('ResourcesPage', () => {
    let store;
    let unit;
    let page;

    before(() => {
      store = new MockLocalStore();
      unit = {
        id: 'unit-test-1',
        resourcesPage: null
      };
      page = new ResourcesPage(store, unit);
    });

    test('initializes resourcesPage if missing', () => {
      assert.ok(page.unit.resourcesPage, 'resourcesPage should be created');
      assert.ok(page.unit.resourcesPage.id, 'resourcesPage should have an id');
      assert.deepStrictEqual(page.unit.resourcesPage.items, [], 'items should start empty');
    });

    test('throws if localStore is missing', () => {
      assert.throws(() => {
        new ResourcesPage(null, unit);
      });
    });

    test('throws if unit is missing', () => {
      assert.throws(() => {
        new ResourcesPage(store, null);
      });
    });

    // ===== Add Link Item =====
    test('adds a link item (happy path)', async () => {
      await page.addLink('https://example.com', 'Example');
      const items = page.getItems();
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].kind, 'link');
      assert.strictEqual(items[0].url, 'https://example.com');
      assert.strictEqual(items[0].label, 'Example');
    });

    test('defaults link label to URL if label is blank', async () => {
      const newPage = new ResourcesPage(store, { id: 'unit-2', resourcesPage: null });
      await newPage.addLink('https://test.com', '');
      const items = newPage.getItems();
      assert.strictEqual(items[0].label, 'https://test.com');
    });

    test('rejects link without URL', () => {
      assert.throws(() => {
        page.addLink('', 'Label');
      });
    });

    // ===== Add Image Item =====
    test('adds an image item (happy path)', async () => {
      const newPage = new ResourcesPage(store, { id: 'unit-3', resourcesPage: null });
      await newPage.addImage({ imageId: 'img-0001', x: 10, y: 10, width: 50, height: 50 });
      const items = newPage.getItems();
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].kind, 'image');
      assert.strictEqual(items[0].imageId, 'img-0001');
    });

    test('rejects image without imageId', () => {
      assert.throws(() => {
        page.addImage({ x: 10, y: 10, width: 50, height: 50 });
      });
    });

    // ===== Add Text Item =====
    test('adds a text item (happy path)', async () => {
      const newPage = new ResourcesPage(store, { id: 'unit-4', resourcesPage: null });
      await newPage.addText('A note about resources');
      const items = newPage.getItems();
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].kind, 'text');
      assert.strictEqual(items[0].text, 'A note about resources');
    });

    test('accepts empty text (unbounded, no length cap)', async () => {
      const newPage = new ResourcesPage(store, { id: 'unit-5', resourcesPage: null });
      await newPage.addText('');
      const items = newPage.getItems();
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].text, '');
    });

    // ===== Edit Item =====
    test('edits an item in place', async () => {
      const newPage = new ResourcesPage(store, { id: 'unit-6', resourcesPage: null });
      await newPage.addLink('https://old.com', 'Old Label');
      const items = newPage.getItems();
      const itemId = items[0].id;

      await newPage.editItem(itemId, { label: 'New Label', url: 'https://new.com' });
      const updated = newPage.getItems();
      assert.strictEqual(updated[0].label, 'New Label');
      assert.strictEqual(updated[0].url, 'https://new.com');
    });

    test('rejects editing link URL to invalid scheme', async () => {
      const newPage = new ResourcesPage(store, { id: 'unit-7', resourcesPage: null });
      await newPage.addLink('https://safe.com');
      const items = newPage.getItems();
      const itemId = items[0].id;

      assert.throws(() => {
        newPage.editItem(itemId, { url: 'javascript:alert(1)' });
      });
    });

    // ===== Delete Item =====
    test('deletes an item', async () => {
      const newPage = new ResourcesPage(store, { id: 'unit-8', resourcesPage: null });
      await newPage.addText('To delete');
      let items = newPage.getItems();
      const itemId = items[0].id;

      await newPage.deleteItem(itemId);
      items = newPage.getItems();
      assert.strictEqual(items.length, 0);
    });

    test('throws on deleting non-existent item', () => {
      assert.throws(() => {
        page.deleteItem('nonexistent-id');
      });
    });

    // ===== Reorder Item =====
    test('reorders items up/down', async () => {
      const newPage = new ResourcesPage(store, { id: 'unit-9', resourcesPage: null });
      await newPage.addText('First');
      await newPage.addText('Second');
      await newPage.addText('Third');

      let items = newPage.getItems();
      const secondId = items[1].id;

      // Move second item up
      await newPage.reorderItem(secondId, 'up');
      items = newPage.getItems();
      assert.strictEqual(items[0].text, 'Second');
      assert.strictEqual(items[1].text, 'First');
    });

    test('ignores reorder up when already at top', async () => {
      const newPage = new ResourcesPage(store, { id: 'unit-10', resourcesPage: null });
      await newPage.addText('Only');
      let items = newPage.getItems();

      await newPage.reorderItem(items[0].id, 'up');
      items = newPage.getItems();
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].text, 'Only');
    });

    // ===== Optional Note/Caption =====
    test('adds optional note to any item kind', async () => {
      const newPage = new ResourcesPage(store, { id: 'unit-11', resourcesPage: null });
      await newPage.addLink('https://example.com', 'Example', 'This is useful');
      const items = newPage.getItems();
      assert.strictEqual(items[0].note, 'This is useful');
    });

    // ===== Persistence =====
    test('persists through local-store on every change', async () => {
      const testStore = new MockLocalStore();
      const testUnit = { id: 'unit-persist', resourcesPage: null };
      const testPage = new ResourcesPage(testStore, testUnit);

      await testPage.addLink('https://persist.com', 'Persist Test');

      // Verify saved data
      assert.ok(testStore.lastSavedUnit, 'Should have called saveUnit');
      assert.strictEqual(testStore.lastSavedUnit.resourcesPage.items.length, 1);
      assert.strictEqual(testStore.lastSavedUnit.resourcesPage.items[0].url, 'https://persist.com');
    });
  });

  // ===== No Outbound Requests Test (FR-RESB-12, AC-RESB-8) =====
  describe('network safety (no outbound requests)', () => {
    test('never makes fetch requests during normal operations', async () => {
      const store = new MockLocalStore();
      const unit = { id: 'unit-network', resourcesPage: null };
      const page = new ResourcesPage(store, unit);

      // Track if fetch was called (though this test environment has no network)
      let fetchCalled = false;
      const originalFetch = global.fetch;
      global.fetch = () => {
        fetchCalled = true;
        return Promise.reject(new Error('Fetch should not be called'));
      };

      try {
        // Perform operations that could trigger fetches
        await page.addLink('https://example.com', 'Test');
        await page.addText('Some text');

        // Restore original fetch
        global.fetch = originalFetch;

        // Verify fetch was never called
        assert.strictEqual(fetchCalled, false, 'No fetch requests should be made');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  // ===== Image Rendering Regression (bundle-server storage model) =====
  // unit.images[] is a manifest only ({id, filename, mimeType, width, height,
  // byteSize, addedAt}) — it never carries the bytes. Bytes are fetched from
  // GET /api/images/<id> via localStore.serverClient.fetchImage(). Guards
  // against regressing to the old (always-undefined) img.blob lookup.
  describe('image rendering (manifest + lazy fetch, not img.blob)', () => {
    let savedDocument;
    let savedURL;
    let savedImage;

    before(() => {
      savedDocument = global.document;
      savedURL = global.URL;
      savedImage = global.Image;
      installMockDom();
    });

    after(() => {
      global.document = savedDocument;
      global.URL = savedURL;
      global.Image = savedImage;
    });

    test('getImagesMap returns manifest rows, not a blob field', () => {
      const store = new MockLocalStore();
      const unit = {
        id: 'unit-img-map',
        resourcesPage: null,
        images: [{ id: 'aif-poster', filename: 'aif-poster.png', mimeType: 'image/png', width: 40, height: 30 }]
      };
      const page = new ResourcesPage(store, unit);
      const map = page.getImagesMap();

      assert.ok(map['aif-poster'], 'manifest row should be present under its id');
      assert.strictEqual(map['aif-poster'].filename, 'aif-poster.png');
      assert.strictEqual(map['aif-poster'].blob, undefined, 'manifest rows never carry a blob field');
    });

    test('renders a placeholder immediately and never fetches for an item with no manifest row', async () => {
      const store = new MockLocalStore();
      const unit = {
        id: 'unit-img-noentry',
        images: [],
        resourcesPage: {
          id: 'rp-1',
          items: [{ id: 'ri-1', kind: 'image', order: 1, imageId: 'ghost', x: 10, y: 10, width: 50, height: 50, note: '' }]
        }
      };
      let fetchCalled = false;
      store.serverClient = { fetchImage: async () => { fetchCalled = true; return null; } };
      const page = new ResourcesPage(store, unit);

      const shell = page.render();
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.strictEqual(fetchCalled, false, 'should never fetch bytes for an id absent from the manifest');
      const svg = shell.svgPages[0];
      const group = svg.children.find(c => c.tag === 'g');
      assert.ok(group, 'an image group should be rendered');
      const placeholderRect = group.children.find(c => c.classList && c.attributes.stroke === 'var(--color-border-dashed)');
      assert.ok(placeholderRect, 'placeholder box should render for a missing manifest row');
    });

    test('fetches bytes via localStore.serverClient.fetchImage and swaps the placeholder for the real image', async () => {
      const store = new MockLocalStore();
      const unit = {
        id: 'unit-img-real',
        images: [{ id: 'aif-poster', filename: 'aif-poster.png', mimeType: 'image/png', width: 40, height: 30 }],
        resourcesPage: {
          id: 'rp-2',
          items: [{ id: 'ri-2', kind: 'image', order: 1, imageId: 'aif-poster', x: 10, y: 10, width: 50, height: 50, note: '' }]
        }
      };

      const fakeBlob = new Blob(['real-bytes']);
      let fetchedId = null;
      store.serverClient = {
        fetchImage: async (id) => {
          fetchedId = id;
          return fakeBlob;
        }
      };

      // Real (non-1x1) decoded dimensions for the fetched blob.
      global.Image = class {
        set src(_v) {
          queueMicrotask(() => this.onload && this.onload());
        }
        get naturalWidth() { return 40; }
        get naturalHeight() { return 30; }
      };

      const page = new ResourcesPage(store, unit);
      const shell = page.render();
      await new Promise(resolve => setTimeout(resolve, 10));

      assert.strictEqual(fetchedId, 'aif-poster', 'should fetch the item\'s own imageId');
      const svg = shell.svgPages[0];
      const group = svg.children.find(c => c.tag === 'g');
      const imageEl = group.children.find(c => c.tag === 'image');
      assert.ok(imageEl, 'real <image> element should replace the placeholder once bytes arrive');
      const placeholderRect = group.children.find(c => c.attributes && c.attributes.stroke === 'var(--color-border-dashed)');
      assert.strictEqual(placeholderRect, undefined, 'placeholder should be removed once the real image renders');
    });

    test('treats the server\'s silent 1x1 fallback as missing and keeps the placeholder', async () => {
      // bundle-server's GET /api/images/<id> never 404s on a missing file — it
      // returns a 1x1 transparent PNG instead (serve.py _send_placeholder_image).
      // A manifest row whose file is absent from disk must still show the
      // visible "Image not loaded" box, not a blank stretched 1x1 image.
      const store = new MockLocalStore();
      const unit = {
        id: 'unit-img-serverfallback',
        images: [{ id: 'missing-file', filename: 'missing-file.png', mimeType: 'image/png', width: 40, height: 30 }],
        resourcesPage: {
          id: 'rp-3',
          items: [{ id: 'ri-3', kind: 'image', order: 1, imageId: 'missing-file', x: 10, y: 10, width: 50, height: 50, note: '' }]
        }
      };

      const serverPlaceholderBlob = new Blob(['1x1-png-bytes']);
      store.serverClient = { fetchImage: async () => serverPlaceholderBlob };

      // Server's 1x1 transparent-PNG fallback decodes to exactly 1x1.
      global.Image = class {
        set src(_v) {
          queueMicrotask(() => this.onload && this.onload());
        }
        get naturalWidth() { return 1; }
        get naturalHeight() { return 1; }
      };

      const page = new ResourcesPage(store, unit);
      const shell = page.render();
      await new Promise(resolve => setTimeout(resolve, 10));

      const svg = shell.svgPages[0];
      const group = svg.children.find(c => c.tag === 'g');
      const imageEl = group.children.find(c => c.tag === 'image');
      assert.strictEqual(imageEl, undefined, 'the 1x1 server fallback must not render as a real image');
      const placeholderRect = group.children.find(c => c.attributes && c.attributes.stroke === 'var(--color-border-dashed)');
      assert.ok(placeholderRect, 'the visible placeholder should remain for a genuinely missing file');
    });
  });
});
