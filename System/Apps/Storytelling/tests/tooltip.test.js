import test from "node:test";
import assert from "node:assert/strict";

import { setTip, tipPosition, mountTooltips, TIP_ATTR } from "../app/shared/tooltip.js";

/** Just enough document for the tooltip: created nodes, a body, and listeners we can fire by hand. */
function fakeDoc() {
  const listeners = {};
  const node = (tag) => ({
    tag, className: "", hidden: false, textContent: "", style: {}, attrs: {},
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; },
    removeAttribute(name) { delete this.attrs[name]; },
    getBoundingClientRect() { return { left: 100, right: 160, top: 50, bottom: 70, width: 60, height: 20 }; },
    contains(other) { return other === this; },
    closest(selector) { return selector === `[${TIP_ATTR}]` && this.attrs[TIP_ATTR] ? this : null; },
    remove() { this.removed = true; },
  });
  const doc = {
    body: { appended: [], appendChild(child) { this.appended.push(child); } },
    defaultView: { innerWidth: 800, innerHeight: 600 },
    createElement: node,
    addEventListener(name, handler) { (listeners[name] ??= []).push(handler); },
    removeEventListener(name, handler) { listeners[name] = (listeners[name] ?? []).filter((h) => h !== handler); },
    fire(name, event) { for (const handler of listeners[name] ?? []) handler(event); },
    listeners,
  };
  return { doc, node };
}

test("setTip sets the text and removes it when empty", () => {
  const { node } = fakeDoc();
  const n = node("button");
  setTip(n, "hello");
  assert.equal(n.getAttribute(TIP_ATTR), "hello");
  setTip(n, "");
  assert.equal(n.getAttribute(TIP_ATTR), null);
});

test("tipPosition: below the target, above when there is no room, inside the viewport", () => {
  const view = { width: 400, height: 300 };
  assert.deepEqual(tipPosition({ left: 20, right: 80, top: 50, bottom: 70 }, { width: 100, height: 40 }, view), { left: 20, top: 78 });
  assert.equal(tipPosition({ left: 380, right: 400, top: 50, bottom: 70 }, { width: 100, height: 40 }, view).left, 292);
  assert.equal(tipPosition({ left: 20, right: 80, top: 250, bottom: 280 }, { width: 100, height: 40 }, view).top, 202);
});

test("shows on hover and focus, hides on leave, blur and Escape; ignores nodes with no tip", () => {
  const { doc, node } = fakeDoc();
  const handle = mountTooltips(doc);
  const tip = doc.body.appended[0];
  assert.equal(tip.hidden, true);
  const withTip = node("button");
  setTip(withTip, "line one\nline two");
  doc.fire("mouseover", { target: withTip });
  assert.equal(tip.hidden, false);
  assert.equal(tip.textContent, "line one\nline two");
  assert.equal(tip.style.top, "78px");
  doc.fire("mouseout", { target: withTip, relatedTarget: null });
  assert.equal(tip.hidden, true);
  doc.fire("focusin", { target: withTip });
  assert.equal(tip.hidden, false);
  doc.fire("keydown", { key: "Escape" });
  assert.equal(tip.hidden, true);
  doc.fire("mouseover", { target: node("div") });
  assert.equal(tip.hidden, true);
  handle.destroy();
  assert.equal(tip.removed, true);
  assert.equal(doc.listeners.mouseover.length, 0);
});
