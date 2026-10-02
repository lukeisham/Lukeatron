// The DOM helper against a fake document (TEST-8): text goes in as text, never as markup.
import { test } from "node:test";
import assert from "node:assert/strict";

function fakeNode(tag) {
  return {
    tag, attributes: {}, children: [], classes: new Set(),
    setAttribute(name, value) { this.attributes[name] = value; },
    append(...items) { this.children.push(...items); },
    set innerHTML(_) { throw new Error("innerHTML must never be used"); },
  };
}
globalThis.document = { createElement: fakeNode };
const { el } = await import("../../web/dom.js");

test("children are appended as given, so markup in text stays text", () => {
  const node = el("p", { class: "x" }, "<b>bold</b> & more", el("span"));
  assert.equal(node.children[0], "<b>bold</b> & more");
  assert.equal(node.children[1].tag, "span");
});

test("attributes are set, with booleans as empty attributes and false or null skipped", () => {
  const node = el("button", { class: "primary", disabled: true, hidden: false, title: null, type: "button" });
  assert.deepEqual(node.attributes, { class: "primary", disabled: "", type: "button" });
});
