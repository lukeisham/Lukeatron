// fake-dom.mjs — a small hand-built fake DOM for JS UI-module tests (TEST-8).
// NOT jsdom, NOT any DOM library — implements only what the two consumers'
// real source actually calls: getElementById, createElement, createRange,
// createTextNode, a minimal attribute-selector matcher for
// querySelector(All), event listener registration/dispatch for
// click/keydown, and a plain-string innerHTML store (no HTML parsing).
//
// SHARED per vibe-coding-rules.md SR-4 ("share, don't copy-paste"): this
// file is the single canonical copy. It originated in
// _modules/Spelling/tests/ (for _modules/Spelling/src/ui.js, TEST-8) and
// was extracted here — _shell/tests/js/ — during the 2026-08-10
// test-and-refine pass so _shell/src/ui.js's own new test file
// (test-ui.mjs, TEST-8 gap closed) could reuse it instead of a second
// hand-rolled copy. _modules/Spelling/tests/test-ui.mjs imports this file
// by relative path; do not fork it back into a per-module copy — a bug
// fixed in one consumer's needs (e.g. the innerHTML addition below, needed
// by _shell/src/ui.js but not by the Spelling module's own ui.js, which
// deliberately never uses innerHTML per AD-2) must be fixed here, once.

function hasClass(el, className) {
  return (el.className || "").split(/\s+/).includes(className);
}

// Supports the handful of selector shapes this repo's tests actually write:
// tagName, #id, [attr]/[attr="value"], .class, and tag.class /
// tag#id combos (checked left-to-right, each segment independently).
function matchesSelector(el, selector) {
  const attrMatch = selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
  if (attrMatch) {
    const [, attr, value] = attrMatch;
    const actual = el.getAttribute(attr);
    return value === undefined ? actual !== null : actual === value;
  }
  const segments = selector.match(/(^[a-zA-Z][\w-]*)|(\.[\w-]+)|(#[\w-]+)/g);
  if (!segments) return el.tagName === selector;
  return segments.every((seg) => {
    if (seg.startsWith(".")) return hasClass(el, seg.slice(1));
    if (seg.startsWith("#")) return el.id === seg.slice(1);
    return el.tagName === seg;
  });
}

function walk(el, selector, results) {
  for (const child of el.children || []) {
    // Skip non-element nodes (e.g. createTextNode()'s {nodeType:3,...}),
    // which carry no .children array of their own.
    if (!child || !Array.isArray(child.children)) continue;
    if (matchesSelector(child, selector)) results.push(child);
    walk(child, selector, results);
  }
}

function createFakeElement(tagName, doc, register) {
  const listeners = {};
  let idValue = "";
  const el = {
    tagName,
    get id() {
      return idValue;
    },
    set id(value) {
      idValue = value;
      register?.(value, el);
    },
    className: "",
    style: {},
    children: [],
    parentNode: null,
    ownerDocument: doc,
    _attrs: {},
    _text: "",

    setAttribute(name, value) {
      this._attrs[name] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null;
    },
    removeAttribute(name) {
      delete this._attrs[name];
    },
    get textContent() {
      return this._text;
    },
    set textContent(value) {
      this._text = value;
      this.children = [];
    },
    // innerText is distinct from textContent in a real DOM (layout-aware);
    // this fake has no layout, so it is a plain alias -- good enough for
    // _shell/src/ui.js's getInputText(), the only caller.
    get innerText() {
      return this._text;
    },
    set innerText(value) {
      this._text = value;
    },
    // No HTML parsing (this is not jsdom, TEST-8): stores the raw string
    // only. A consumer that both writes innerHTML and then walks children
    // (e.g. _shell/src/ui.js's buildFocusBar()) will find no children from
    // an innerHTML write alone -- tests against that pattern assert on the
    // stored HTML string's content instead of on derived child elements.
    get innerHTML() {
      return this._html ?? "";
    },
    set innerHTML(value) {
      this._html = value;
      // Real DOM: any innerHTML write discards the previous child elements.
      // Mirror that much (without parsing `value` into new elements, TEST-8)
      // so the common "container.innerHTML = ''; container.appendChild(x)"
      // clear-and-replace idiom behaves the same as it does in a browser.
      this.children = [];
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      return child;
    },
    get firstChild() {
      return this.children[0] ?? null;
    },
    get parentElement() {
      return this.parentNode;
    },
    replaceWith(node) {
      const parent = this.parentNode;
      if (!parent) return;
      const idx = parent.children.indexOf(this);
      if (idx !== -1) parent.children[idx] = node;
      node.parentNode = parent;
      this.parentNode = null;
    },
    get nextElementSibling() {
      const siblings = this.parentNode?.children ?? [];
      return siblings[siblings.indexOf(this) + 1] ?? null;
    },
    get previousElementSibling() {
      const siblings = this.parentNode?.children ?? [];
      return siblings[siblings.indexOf(this) - 1] ?? null;
    },
    querySelector(selector) {
      const results = [];
      walk(this, selector, results);
      return results[0] ?? null;
    },
    querySelectorAll(selector) {
      const results = [];
      walk(this, selector, results);
      return results;
    },
    addEventListener(type, handler) {
      (listeners[type] ??= []).push(handler);
    },
    removeEventListener(type, handler) {
      listeners[type] = (listeners[type] ?? []).filter((h) => h !== handler);
    },
    click() {
      for (const h of listeners.click ?? []) h({ type: "click", currentTarget: this, target: this });
    },
    dispatchKeydown(key) {
      for (const h of listeners.keydown ?? []) {
        h({ key, currentTarget: this, target: this, preventDefault() {} });
      }
    },
    focus() {
      this._focused = true;
    },
    contains() {
      return false;
    },
    getBoundingClientRect() {
      return { top: 0, left: 0, bottom: 20, right: 100, width: 100, height: 20 };
    },
  };
  return el;
}

export function createFakeDOM() {
  const registry = {};
  const doc = {
    body: null,
    getElementById(id) {
      return registry[id] ?? null;
    },
    createElement(tagName) {
      const el = createFakeElement(tagName, doc, (id, node) => {
        if (id) registry[id] = node;
      });
      const originalSetAttr = el.setAttribute.bind(el);
      el.setAttribute = (name, value) => {
        originalSetAttr(name, value);
        if (name === "id") el.id = value; // routes through the id setter's register() too
      };
      return el;
    },
    createTextNode(text) {
      return { nodeType: 3, nodeValue: text };
    },
    createRange() {
      return {
        _start: 0,
        _end: 0,
        setStart(node, offset) {
          this._start = offset;
          this._node = node;
        },
        setEnd(node, offset) {
          this._end = offset;
        },
        collapse() {},
        cloneRange() {
          return this;
        },
        getBoundingClientRect() {
          return { top: 10, left: 5, bottom: 30, right: 50, width: 45, height: 20 };
        },
        deleteContents() {
          this._deleted = true;
        },
        insertNode(node) {
          this._inserted = node;
        },
      };
    },
    querySelector(sel) {
      return doc.body?.querySelector(sel) ?? null;
    },
    querySelectorAll(sel) {
      return doc.body?.querySelectorAll(sel) ?? [];
    },
    getSelection() {
      return {
        rangeCount: 0,
        getRangeAt: () => doc.createRange(),
        removeAllRanges() {},
        addRange() {},
      };
    },
    addEventListener() {},
    removeEventListener() {},
  };
  doc.body = doc.createElement("body");
  doc.body.id = "body";
  registry.body = doc.body;
  doc.head = doc.createElement("head");
  return doc;
}
