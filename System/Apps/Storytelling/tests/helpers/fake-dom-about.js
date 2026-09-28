/** Hand-built fake DOM for about-panel.test.js (TEST-8): only what about-panel.js touches. */

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
    // Add find method to support test queries
    this.find = (selector) => findByClass(this, selector);
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
    return this.ownText + this.children.map((child) => (typeof child === "string" ? child : child.textContent)).join("");
  }

  focus() {
    this.ownerDocument.activeElement = this;
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

  createElement(tag) {
    return new FakeElement(tag, this.ownerDocument);
  }

  createElementNS() {
    return new FakeElement("svg", this.ownerDocument);
  }
}

class FakeDocument extends FakeElement {
  constructor() {
    super("document", null);
    this.ownerDocument = this;
    this.body = new FakeElement("body", this);
    this.activeElement = this.body;
    this.toolbarButtons = {};
  }

  /** Stands in for document.querySelector: only `[data-action="x"]` lookups, answered from `toolbarButtons`. */
  querySelector(selector) {
    const match = /^\[data-action="(.+)"\]$/.exec(selector);
    return match ? (this.toolbarButtons[match[1]] ?? null) : null;
  }

  addEventListener(type, handler) {
    (this.listeners[type] ??= []).push(handler);
  }

  removeEventListener(type, handler) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((fn) => fn !== handler);
  }

  dispatchEvent(event) {
    const handlers = this.listeners[event.type] ?? [];
    for (const handler of handlers) handler(event);
  }

  find(selector) {
    return findByClass(this, selector);
  }
}

function findByClass(node, className) {
  if (node.classes?.has(className)) return node;
  for (const child of node.children ?? []) {
    if (typeof child === "string") continue;
    const found = findByClass(child, className);
    if (found) return found;
  }
  return null;
}

export function createFakeDocument() {
  const doc = new FakeDocument();
  doc.createElement = (tag) => {
    const el = new FakeElement(tag, doc);
    el.find = (selector) => findByClass(el, selector);
    return el;
  };
  doc.createElementNS = () => {
    const el = new FakeElement("svg", doc);
    el.find = (selector) => findByClass(el, selector);
    return el;
  };
  doc.find = (selector) => findByClass(doc, selector);
  return doc;
}
