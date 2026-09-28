// Hand-built fake DOM for viewport.js and selection.js (TEST-8). It exposes only what those two modules touch:
// attributes, classList, children, closest/querySelector for simple selectors, bubbling events, focus.

/** True when `el` matches one simple compound selector: tag, .class, [attr] and [attr="v"], in any mix. */
function matchesSimple(el, selector) {
  const parts = selector.match(/[.#]?[\w-]+|\[[^\]]+\]/g) ?? [];
  return parts.every((part) => {
    if (part.startsWith(".")) return el.classList.contains(part.slice(1));
    if (part.startsWith("[")) {
      const [name, value] = part.slice(1, -1).split("=");
      if (!el.hasAttribute(name)) return false;
      return value === undefined || el.getAttribute(name) === value.replace(/"/g, "");
    }
    return el.tagName.toLowerCase() === part.toLowerCase();
  });
}

function matchesAny(el, selector) {
  return selector.split(",").some((s) => matchesSimple(el, s.trim()));
}

export class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.parentNode = null;
    this.ownerDocument = null;
    this.children = [];
    this.style = {};
    this.hidden = false;
    this.disabled = false;
    this.rect = { left: 0, top: 0, width: 100, height: 100 };
    this.captured = new Set();
    this._attrs = new Map();
    this._listeners = new Map();
    this._text = "";
    const owner = this;
    this.classList = {
      _set: new Set(),
      add(...names) { names.forEach((n) => this._set.add(n)); owner._syncClass(); },
      remove(...names) { names.forEach((n) => this._set.delete(n)); owner._syncClass(); },
      contains(name) { return this._set.has(name); },
      toggle(name, force) {
        const on = force ?? !this._set.has(name);
        if (on) this._set.add(name); else this._set.delete(name);
        owner._syncClass();
        return on;
      },
    };
  }

  _syncClass() {
    this._attrs.set("class", [...this.classList._set].join(" "));
  }

  get className() { return this._attrs.get("class") ?? ""; }
  set className(value) {
    this.classList._set = new Set(String(value).split(/\s+/).filter(Boolean));
    this._syncClass();
  }

  get textContent() {
    return this._text + this.children.map((c) => c.textContent).join("");
  }
  set textContent(value) {
    this.children.forEach((c) => { c.parentNode = null; });
    this.children = [];
    this._text = String(value);
  }

  setAttribute(name, value) {
    if (name === "class") this.className = value;
    else this._attrs.set(name, String(value));
  }
  getAttribute(name) { return this._attrs.has(name) ? this._attrs.get(name) : null; }
  hasAttribute(name) { return this._attrs.has(name); }
  removeAttribute(name) {
    this._attrs.delete(name);
    if (name === "class") this.classList._set.clear();
  }

  append(...nodes) {
    for (const node of nodes) {
      if (typeof node === "string") { this._text += node; continue; }
      node.parentNode?.removeChild(node);
      node.parentNode = this;
      this.children.push(node);
    }
  }
  appendChild(node) { this.append(node); return node; }
  removeChild(node) {
    this.children = this.children.filter((c) => c !== node);
    node.parentNode = null;
    return node;
  }
  remove() { this.parentNode?.removeChild(this); }

  contains(other) {
    for (let n = other; n; n = n.parentNode) if (n === this) return true;
    return false;
  }
  closest(selector) {
    for (let n = this; n instanceof FakeElement; n = n.parentNode) {
      if (matchesAny(n, selector)) return n;
    }
    return null;
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (matchesAny(child, selector)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }

  getBoundingClientRect() {
    return { ...this.rect, right: this.rect.left + this.rect.width, bottom: this.rect.top + this.rect.height };
  }
  setPointerCapture(id) { this.captured.add(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }

  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this._listeners.get(type)?.delete(fn); }
  listenerCount(type) { return this._listeners.get(type)?.size ?? 0; }

  /**
   * Bubbling dispatch of an event. Real CustomEvents are copied to a plain object, since their fields are
   * read-only. Returns false when a listener called preventDefault, as the real API does.
   */
  dispatchEvent(event) {
    const ev = {
      ...event,
      type: event.type,
      detail: event.detail,
      bubbles: event.bubbles ?? false,
      target: this,
      defaultPrevented: false,
      propagationStopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.propagationStopped = true; },
    };
    for (let n = this; n && !ev.propagationStopped; n = ev.bubbles ? n.parentNode : null) {
      ev.currentTarget = n;
      for (const fn of [...(n._listeners?.get(ev.type) ?? [])]) fn(ev);
    }
    return !ev.defaultPrevented;
  }
}

/** A fake document: the root of the tree, so bubbling reaches it, and the target of application events. */
export class FakeDocument extends FakeElement {
  constructor() {
    super("#document");
    this.activeElement = null;
    this.ownerDocument = this;
    this.documentElement = this.createElement("html");
    this.body = this.createElement("body");
    this.append(this.documentElement);
    this.documentElement.append(this.body);
  }
  createElement(tag) {
    const el = new FakeElement(tag);
    el.ownerDocument = this;
    return el;
  }
  createElementNS(_ns, tag) { return this.createElement(tag); }
}

/** Installs a fresh fake document on globalThis; returns it plus a restore function. */
export function installFakeDocument() {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  const doc = new FakeDocument();
  Object.defineProperty(globalThis, "document", { value: doc, configurable: true, writable: true });
  const restore = () => {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else delete globalThis.document;
  };
  return { doc, restore };
}

/** Builds host > svg[viewBox] > g.tile[data-element-id] and returns the pieces. The svg renders at 500x400 px. */
export function buildDiagram(doc, { viewBox = "0 0 1000 800", ids = ["A", "B"] } = {}) {
  const host = doc.createElement("div");
  const svg = doc.createElement("svg");
  svg.setAttribute("viewBox", viewBox);
  svg.rect = { left: 0, top: 0, width: 500, height: 400 };
  const tiles = ids.map((id) => {
    const tile = doc.createElement("g");
    tile.classList.add("tile");
    tile.setAttribute("data-element-id", id);
    tile.setAttribute("tabindex", "0");
    tile.append(doc.createElement("text"));
    svg.append(tile);
    return tile;
  });
  host.append(svg);
  doc.body.append(host);
  return { host, svg, tiles };
}

/** Dispatches a pointer/keyboard/wheel event at `target` with sensible defaults. */
export function fire(target, type, props = {}) {
  const defaults = { bubbles: true, pointerId: 1, pointerType: "mouse", button: 0, clientX: 0, clientY: 0, key: "" };
  return target.dispatchEvent({ type, ...defaults, ...props });
}

/** Collects the `detail` of application events dispatched on the fake document. */
export function recordEvents(doc, type) {
  const seen = [];
  doc.addEventListener(type, (e) => seen.push(e.detail));
  return seen;
}

/** In-memory Storage double. */
export function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

/** Storage double whose every call throws, like a blocked or full store. */
export function throwingStorage() {
  const fail = () => { throw new Error("storage unavailable"); };
  return { getItem: fail, setItem: fail, removeItem: fail };
}
