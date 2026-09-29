// The recipe page's Copy list (AC-4, AC-5), SVG-as-image-only (AC-7) and blob cleanup.
// Mirrors: web/recipe-view.js   Run: node --test tests/test_recipe_view.mjs
// The fake DOM below exposes only what recipe-view.js touches (TEST-8).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { renderRecipe } from "../web/recipe-view.js";

class FakeElement {
  constructor(doc, tagName) {
    Object.assign(this, { ownerDocument: doc, tagName, children: [], attributes: {}, listeners: {}, textContent: "", className: "" });
  }
  set innerHTML(value) { this.ownerDocument.innerHtmlWrites.push(value); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(type, handler) { (this.listeners[type] ??= []).push(handler); }
  click() { return Promise.all((this.listeners.click ?? []).map((handler) => handler({ target: this }))); }
}

function makeDocument() {
  const selection = { ranges: [], removeAllRanges() { this.ranges = []; }, addRange(range) { this.ranges.push(range); } };
  const doc = {
    innerHtmlWrites: [],
    createElement: (tag) => new FakeElement(doc, tag),
    createRange: () => ({ selectNodeContents(node) { this.node = node; } }),
    defaultView: { getSelection: () => selection },
    selection,
  };
  return doc;
}

const all = (node) => [node, ...node.children.flatMap(all)];
const find = (root, predicate) => all(root).find(predicate);
const byClass = (root, name) => find(root, (n) => n.className.split(" ").includes(name));

const recipe = (fields = {}) => ({
  slug: "curry", title: "Curry", source: "own", mode: "thermomix", time_total: "20 min", serves: "6",
  saved: "2026-01-01", based_on: "", ingredients: ["1 onion", "2 tbsp curry paste", "400 g coconut milk"],
  has_svg: false, equipment: [], method: "Chop.\nCook.", notes: "", svg: "", ...fields,
});

let blobs;
let revoked;
beforeEach(() => {
  blobs = [];
  revoked = [];
  URL.createObjectURL = (blob) => { blobs.push(blob); return `blob:fake-${blobs.length}`; };
  URL.revokeObjectURL = (url) => { revoked.push(url); };
});

function render(fields, clipboard) {
  const doc = makeDocument();
  const container = new FakeElement(doc, "div");
  const handle = renderRecipe(container, recipe(fields), { recipes: [], onBack() {}, onOpen() {}, clipboard });
  return { doc, container, handle };
}

test("AC-4: Copy list writes exactly the ingredient lines, newline-joined", async () => {
  const written = [];
  const { container, handle } = render({}, { writeText: async (text) => { written.push(text); } });
  const button = byClass(container, "larder-copy");
  await button.click();
  assert.deepEqual(written, ["1 onion\n2 tbsp curry paste\n400 g coconut milk"]);
  assert.equal(byClass(container, "larder-copy-status").textContent, "Copied ✓");
  assert.equal(button.textContent, "Copy list");
  handle.destroy();
});

test("AC-5: a rejecting clipboard turns the button into Select and copy and selects the list", async () => {
  const { doc, container, handle } = render({}, { writeText: async () => { throw new Error("blocked"); } });
  const button = byClass(container, "larder-copy");
  await button.click();
  assert.equal(button.textContent, "Select and copy");
  assert.equal(doc.selection.ranges.length, 1);
  assert.equal(doc.selection.ranges[0].node, byClass(container, "larder-ingredients"));
  handle.destroy();
});

test("AC-7: SVG text is only ever an <img> blob URL, never element text or markup", async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
  const { doc, container, handle } = render({ svg, has_svg: true });
  const images = all(container).filter((n) => n.tagName === "img");
  assert.equal(images.length, 1);
  assert.equal(images[0].src, "blob:fake-1");
  assert.equal(blobs[0].type, "image/svg+xml");
  assert.equal(await blobs[0].text(), svg);
  assert.deepEqual(doc.innerHtmlWrites, []);
  for (const node of all(container)) {
    assert.ok(!node.textContent.includes("<script"), `${node.tagName} text holds SVG`);
    assert.ok(!Object.values(node.attributes).some((v) => String(v).includes("<script")));
  }
  handle.destroy();
});

test("destroy() revokes the blob URL", () => {
  const { handle } = render({ svg: "<svg/>" });
  assert.deepEqual(revoked, []);
  handle.destroy();
  assert.deepEqual(revoked, ["blob:fake-1"]);
});
