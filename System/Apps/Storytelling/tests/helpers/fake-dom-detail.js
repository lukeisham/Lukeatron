/** Hand-built fake DOM for detail-panel.test.js (TEST-8): only what detail-panel.js touches. */

class FakeElement {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = doc;
    this.children = [];
    this.attributes = {};
    this.hidden = false;
    this.listeners = {};
    this.ownText = "";
    this.classes = new Set();
    this.classList = { add: (name) => this.classes.add(name) };
  }

  set className(value) {
    this.classes = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  get className() {
    return [...this.classes].join(" ");
  }

  set textContent(value) {
    this.children = [];
    this.ownText = String(value);
  }

  get textContent() {
    return this.ownText + this.children.map((child) => child.textContent).join("");
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  addEventListener(type, handler) {
    (this.listeners[type] ??= []).push(handler);
  }

  removeEventListener(type, handler) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((fn) => fn !== handler);
  }

  dispatch(type, event = {}) {
    const dispatched = { type, target: this, preventDefault() {}, ...event };
    (this.listeners[type] ?? []).slice().forEach((handler) => handler(dispatched));
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  /** First descendant carrying the class (depth-first). */
  find(className) {
    for (const child of this.children) {
      if (child.classes.has(className)) return child;
      const inner = child.find(className);
      if (inner) return inner;
    }
    return null;
  }
}

/** A document fake: createElement, an event target, and activeElement. */
export function createFakeDocument() {
  const doc = new FakeElement("document", null);
  doc.ownerDocument = doc;
  doc.activeElement = null;
  doc.createElement = (tag) => new FakeElement(tag, doc);
  doc.dispatchEvent = (event) => doc.dispatch(event.type, event);
  return doc;
}
