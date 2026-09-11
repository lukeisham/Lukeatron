// A minimal hand-built fake DOM (TEST-8) for the monitor modules that build
// through shared/dom.js's `el`/`svgEl` — real createElement/createElementNS
// calls, never innerHTML (JS-6). Exposes only what `el`/`svgEl`'s own
// applyAttrs/appendChildren and this module's listeners actually touch;
// mirrors the FakeElement pattern tests/test_unblock.mjs already established
// for render.js (TEST-9), extended with createElementNS, addEventListener and
// getComputedStyle since the monitor modules need all three and render.js
// needed none of them.

export class FakeNode {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.attrs = {};
    this._classes = new Set();
    this._listeners = {};
    this.dataset = {};
    this.hidden = false;
  }

  get className() {
    return [...this._classes].join(" ");
  }
  set className(value) {
    this._classes = new Set(String(value).split(/\s+/).filter(Boolean));
  }
  get classList() {
    const classes = this._classes;
    return {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
      contains: (c) => classes.has(c),
    };
  }

  setAttribute(name, value) {
    if (name === "class") {
      this.className = value;
      return;
    }
    if (name === "hidden") {
      // Reflects the same way the real DOM's `hidden` IDL property does —
      // week-view.js and ticker.js both toggle `.hidden` directly afterward.
      this.hidden = true;
      return;
    }
    this.attrs[name] = String(value);
  }
  getAttribute(name) {
    return name === "class" ? this.className : this.attrs[name] ?? null;
  }
  removeAttribute(name) {
    if (name === "class") this._classes = new Set();
    else delete this.attrs[name];
  }

  addEventListener(type, fn) {
    (this._listeners[type] ??= []).push(fn);
  }
  removeEventListener(type, fn) {
    this._listeners[type] = (this._listeners[type] || []).filter((f) => f !== fn);
  }
  /** Test helper, not a real DOM method: fire every listener registered for `type`. */
  dispatch(type) {
    for (const fn of this._listeners[type] || []) fn();
  }

  /** Deep clone only — cube-defs.js's `<use>` instancing is the one caller,
   * and it always clones whole (never shallow). */
  cloneNode(_deep = true) {
    const copy = new FakeNode(this.tagName);
    copy.attrs = { ...this.attrs };
    copy._classes = new Set(this._classes);
    copy.children = this.children.map((c) => (c && typeof c.cloneNode === "function" ? c.cloneNode(true) : c));
    return copy;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter((c) => c !== child);
    return child;
  }
  get firstChild() {
    return this.children[0] ?? null;
  }

  get textContent() {
    if (this._text !== undefined) return this._text;
    return this.children.map((c) => (c && c.nodeType === 3 ? c.textContent : c?.textContent ?? "")).join("");
  }
  set textContent(value) {
    this._text = value;
    this.children = [];
  }

  /** Flat-subtree class search — enough for these smoke tests, not a CSS engine. */
  querySelectorAll(selector) {
    const className = selector.replace(/^\./, "");
    const found = [];
    const walk = (node) => {
      for (const child of node.children || []) {
        if (child._classes?.has(className)) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }
}

/** Installs `document`/`getComputedStyle` globals a monitor module's `import`
 * touches at load time or render time. `tokens` seeds whatever CSS custom
 * properties this test's modules read via shared/dom.js's `token()`. */
export function installFakeDom(tokens = {}) {
  const documentElement = new FakeNode("html");
  globalThis.document = {
    createElement: (tag) => new FakeNode(tag),
    createElementNS: (_ns, tag) => new FakeNode(tag),
    createTextNode: (text) => ({ nodeType: 3, textContent: text }),
    documentElement,
  };
  globalThis.getComputedStyle = (_node) => ({
    getPropertyValue: (name) => tokens[name] ?? "",
  });
}
