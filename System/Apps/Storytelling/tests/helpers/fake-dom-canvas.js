/**
 * Hand-built fake DOM for story-canvas.test.js (TEST-8): only what story-canvas.js touches.
 * Elements bubble events up to `document`; selectors support `.a.b`, `[attr]`, `[attr="v"]` and a tag,
 * comma-separated, no descendants.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

function parseSimpleSelector(text) {
  const checks = [];
  for (const match of text.trim().matchAll(/\.([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]|^([a-zA-Z][\w-]*)/g)) {
    if (match[1]) checks.push((el) => el.classList.contains(match[1]));
    else if (match[2]) {
      checks.push((el) => (match[3] === undefined ? el.hasAttribute(match[2]) : el.getAttribute(match[2]) === match[3]));
    } else if (match[4]) checks.push((el) => el.tagName.toLowerCase() === match[4].toLowerCase());
  }
  return (el) => checks.every((check) => check(el));
}

const compileSelector = (selector) => {
  const alternatives = selector.split(",").map(parseSimpleSelector);
  return (el) => alternatives.some((matches) => matches(el));
};

export class FakeElement {
  constructor(tag, doc, namespace = null) {
    this.tagName = namespace ? tag : tag.toUpperCase();
    this.namespaceURI = namespace;
    this.ownerDocument = doc;
    this.parentNode = null;
    this.childNodes = [];
    this.attributes = new Map();
    this.listeners = {};
    this.classNames = new Set();
    this.style = { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } };
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.ownText = "";
    const classNames = this.classNames;
    this.classList = {
      add: (...names) => names.forEach((name) => classNames.add(name)),
      remove: (...names) => names.forEach((name) => classNames.delete(name)),
      contains: (name) => classNames.has(name),
      toggle: (name, force) => {
        const on = force === undefined ? !classNames.has(name) : Boolean(force);
        if (on) classNames.add(name);
        else classNames.delete(name);
        return on;
      },
    };
  }

  set className(value) {
    this.classNames.clear();
    String(value).split(/\s+/).filter(Boolean).forEach((name) => this.classNames.add(name));
  }

  get className() {
    return [...this.classNames].join(" ");
  }

  get children() {
    return this.childNodes;
  }

  get firstChild() {
    return this.childNodes[0] ?? null;
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }

  set textContent(value) {
    this.childNodes.forEach((child) => { child.parentNode = null; });
    this.childNodes = [];
    this.ownText = String(value);
  }

  get textContent() {
    return this.ownText + this.childNodes.map((child) => child.textContent).join("");
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "class") this.className = value;
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  detach(node) {
    if (node.parentNode) node.parentNode.childNodes.splice(node.parentNode.childNodes.indexOf(node), 1);
    node.parentNode = null;
  }

  appendChild(node) {
    this.detach(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  append(...nodes) {
    nodes.forEach((node) => this.appendChild(node));
  }

  insertBefore(node, reference) {
    this.detach(node);
    node.parentNode = this;
    const index = reference ? this.childNodes.indexOf(reference) : -1;
    if (index < 0) this.childNodes.push(node);
    else this.childNodes.splice(index, 0, node);
    return node;
  }

  replaceChildren(...nodes) {
    this.childNodes.forEach((child) => { child.parentNode = null; });
    this.childNodes = [];
    this.ownText = "";
    nodes.forEach((node) => this.appendChild(node));
  }

  remove() {
    this.detach(this);
  }

  contains(node) {
    for (let cursor = node; cursor; cursor = cursor.parentNode) if (cursor === this) return true;
    return false;
  }

  matches(selector) {
    return compileSelector(selector)(this);
  }

  closest(selector) {
    const matches = compileSelector(selector);
    for (let cursor = this; cursor && cursor.tagName; cursor = cursor.parentNode) if (matches(cursor)) return cursor;
    return null;
  }

  querySelectorAll(selector) {
    const matches = compileSelector(selector);
    const found = [];
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (matches(child)) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  addEventListener(type, handler) {
    (this.listeners[type] ??= []).push(handler);
  }

  removeEventListener(type, handler) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((fn) => fn !== handler);
  }

  dispatchEvent(event) {
    if (event.target == null) {
      try {
        Object.defineProperty(event, "target", { value: this, configurable: true });
      } catch {
        /* a real Event: the target stays null, which the canvas never reads */
      }
    }
    for (let cursor = this; cursor; cursor = cursor.parentNode) {
      for (const handler of (cursor.listeners[event.type] ?? []).slice()) handler(event);
      if (event.propagationStopped) break;
    }
    return true;
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  blur() {
    if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = null;
  }

  select() {}
}

/** A document with a body; `document` is the top of every bubble path. */
export function createFakeDocument() {
  const doc = new FakeElement("document", null);
  doc.tagName = "";
  doc.ownerDocument = doc;
  doc.activeElement = null;
  doc.createElement = (tag) => new FakeElement(tag, doc);
  doc.createElementNS = (namespace, tag) => new FakeElement(tag, doc, namespace);
  doc.body = new FakeElement("body", doc);
  doc.appendChild(doc.body);
  return doc;
}

/** Builds a plain event that bubbles and can be stopped. */
export function makeEvent(type, target, props = {}) {
  return {
    type,
    target,
    preventDefault() {},
    stopPropagation() { this.propagationStopped = true; },
    ...props,
  };
}

/** Dispatches a plain event on `target`. */
export function fire(target, type, props = {}) {
  const event = makeEvent(type, target, props);
  target.dispatchEvent(event);
  return event;
}

/** Timer fake: `setTimer` records; `run(id)` fires it (no real waiting, TEST-5). */
export function createFakeTimers() {
  const pending = new Map();
  let nextId = 1;
  return {
    pending,
    setTimer(fn, ms) {
      const id = nextId++;
      pending.set(id, { fn, ms });
      return id;
    },
    clearTimer(id) {
      pending.delete(id);
    },
    run(id) {
      const entry = pending.get(id);
      pending.delete(id);
      entry.fn();
    },
  };
}

export { SVG_NS };
