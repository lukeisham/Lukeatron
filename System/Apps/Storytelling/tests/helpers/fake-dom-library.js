// A small hand-built fake DOM for the library panel and story-highlight tests (TEST-8).
// It exposes only what those two modules touch: elements with attributes, classList, children,
// text, event listeners that bubble, simple selectors, focus, and a document that is an event target.

class FakeClassList {
  constructor() {
    this.names = new Set();
  }
  add(...names) { names.forEach((name) => this.names.add(name)); }
  remove(...names) { names.forEach((name) => this.names.delete(name)); }
  contains(name) { return this.names.has(name); }
  toggle(name, force) {
    const on = force === undefined ? !this.names.has(name) : Boolean(force);
    if (on) this.names.add(name);
    else this.names.delete(name);
    return on;
  }
}

/** Matches `tag`, `.class`, `tag.class` and an optional `[attr]` or `[attr=value]`. */
function matches(element, selector) {
  const parsed = /^([a-zA-Z0-9]*)((?:\.[\w-]+)*)(?:\[([\w-]+)(?:="?([^"\]]*)"?)?\])?$/.exec(selector);
  if (!parsed) throw new Error(`fake dom: unsupported selector ${selector}`);
  const [, tag, classes, attr, value] = parsed;
  if (tag && element.tagName.toLowerCase() !== tag.toLowerCase()) return false;
  for (const name of classes.split(".").filter(Boolean)) {
    if (!element.classList.contains(name)) return false;
  }
  if (attr) {
    if (!element.hasAttribute(attr)) return false;
    if (value !== undefined && element.getAttribute(attr) !== value) return false;
  }
  return true;
}

export class FakeElement {
  constructor(tagName, doc) {
    this.tagName = tagName;
    this.ownerDocument = doc;
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.listeners = new Map();
    this.ownText = "";
    this.hidden = false;
  }

  get className() { return [...this.classList.names].join(" "); }
  set className(value) { this.classList.names = new Set(String(value).split(/\s+/).filter(Boolean)); }

  get textContent() { return this.ownText + this.children.map((child) => child.textContent).join(""); }
  set textContent(value) {
    this.children = [];
    this.ownText = String(value);
  }

  setAttribute(name, value) {
    if (name === "class") this.className = value;
    else this.attributes.set(name, String(value));
  }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  append(...children) { children.forEach((child) => this.appendChild(child)); }
  replaceChildren(...children) {
    this.children = [];
    this.ownText = "";
    this.append(...children);
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((l) => l !== listener));
  }
  /** Runs listeners on this node, then on each ancestor (bubbling), unless propagation is stopped. */
  dispatchEvent(event) {
    event.target ??= this;
    event.defaultPrevented ??= false;
    event.preventDefault ??= () => { event.defaultPrevented = true; };
    let stopped = false;
    event.stopPropagation ??= () => { stopped = true; };
    for (let node = this; node && !stopped; node = node.parentNode) {
      for (const listener of node.listeners.get(event.type) ?? []) listener(event);
    }
    return !event.defaultPrevented;
  }
  click() { this.dispatchEvent({ type: "click" }); }
  focus() { this.ownerDocument.activeElement = this; }

  querySelectorAll(selector) {
    const found = [];
    for (const child of this.children) {
      if (matches(child, selector)) found.push(child);
      found.push(...child.querySelectorAll(selector));
    }
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

export class FakeDocument extends FakeElement {
  constructor() {
    super("#document", null);
    this.ownerDocument = this;
    this.activeElement = null;
    this.body = new FakeElement("body", this);
    this.appendChild(this.body);
  }
  createElement(tag) { return new FakeElement(tag, this); }
  createElementNS(_namespace, tag) { return new FakeElement(tag, this); }
}

export function makeDocument() { return new FakeDocument(); }

/** Sends a key press from `target` (bubbles to the document like a real one). */
export function pressKey(target, key) {
  const event = { type: "keydown", key };
  target.dispatchEvent(event);
  return event;
}

/** Builds one SVG tile group as the diagram generator would: `g.tile[data-element-id]` (+ a badge). */
export function makeTile(doc, elementId, { withBadge = true } = {}) {
  const tile = doc.createElementNS("http://www.w3.org/2000/svg", "g");
  tile.setAttribute("class", "tile tile-test");
  tile.setAttribute("data-element-id", elementId);
  if (withBadge) {
    const badge = doc.createElementNS("http://www.w3.org/2000/svg", "text");
    badge.setAttribute("class", "step-badge");
    badge.setAttribute("hidden", "");
    tile.appendChild(badge);
  }
  return tile;
}
