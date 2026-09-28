/**
 * Hand-built fake DOM for drag-drop testing (TEST-8): only what drag-drop.js uses.
 * Elements form a tree with classes, attributes, listeners, rects, closest/querySelector for simple
 * selectors (tag, .class, [attr], comma lists), cloneNode, and a recording animate().
 */

const SIMPLE_SELECTOR = /^([a-z][a-z0-9]*)?((?:\.[\w-]+)*)((?:\[[\w-]+\])*)$/i;

export class FakeAnimation {
  constructor(keyframes, timing) {
    this.keyframes = keyframes;
    this.timing = timing;
    this.finished = new Promise((resolve) => {
      this.finish = resolve;
    });
  }
}

export class FakeElement {
  constructor(tagName, namespaceURI = null) {
    this.tagName = tagName;
    this.namespaceURI = namespaceURI;
    this.attributes = new Map();
    this.classes = new Set();
    this.children = [];
    this.parentNode = null;
    this.listeners = new Map();
    this.style = {};
    this.rect = { left: 0, top: 0, width: 0, height: 0 };
    this.scrollLeft = 0;
    this.scrollTop = 0;
    this.animations = [];
    const owner = this;
    this.classList = {
      add: (...names) => names.forEach((name) => owner.classes.add(name)),
      remove: (...names) => names.forEach((name) => owner.classes.delete(name)),
      contains: (name) => owner.classes.has(name),
    };
  }

  setAttribute(name, value) {
    if (name === "class") this.classes = new Set(String(value).split(/\s+/).filter(Boolean));
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    if (name === "class") return [...this.classes].join(" ");
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  appendChild(child) {
    child.remove();
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  matches(selector) {
    return selector.split(",").some((part) => this.matchesSimple(part.trim()));
  }

  matchesSimple(part) {
    const match = SIMPLE_SELECTOR.exec(part);
    if (!match) throw new Error(`fake DOM cannot match selector "${part}"`);
    const [, tag, classPart, attrPart] = match;
    if (tag && this.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    const classNames = classPart.split(".").filter(Boolean);
    if (!classNames.every((name) => this.classes.has(name))) return false;
    const attributeNames = [...attrPart.matchAll(/\[([\w-]+)\]/g)].map((m) => m[1]);
    return attributeNames.every((name) => this.attributes.has(name));
  }

  closest(selector) {
    for (let node = this; node; node = node.parentNode) if (node.matches(selector)) return node;
    return null;
  }

  querySelectorAll(selector) {
    const found = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  cloneNode(deep) {
    const copy = new FakeElement(this.tagName, this.namespaceURI);
    for (const [name, value] of this.attributes) copy.attributes.set(name, value);
    copy.classes = new Set(this.classes);
    copy.rect = { ...this.rect };
    if (deep) for (const child of this.children) copy.appendChild(child.cloneNode(true));
    return copy;
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }

  removeEventListener(type, handler) {
    this.listeners.get(type)?.delete(handler);
  }

  listenerCount() {
    return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0);
  }

  getBoundingClientRect() {
    const { left, top, width, height } = this.rect;
    return { left, top, width, height, right: left + width, bottom: top + height };
  }

  animate(keyframes, timing) {
    const animation = new FakeAnimation(keyframes, timing);
    this.animations.push(animation);
    return animation;
  }
}

/** Sets the rect of an element and returns it. */
export function placed(element, left, top, width, height) {
  element.rect = { left, top, width, height };
  return element;
}

export function makeElement(tagName, classes = [], attributes = {}) {
  const element = new FakeElement(tagName);
  element.classes = new Set(classes);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

/** A document that also owns the event target `window` role for tests: dispatch helpers bubble. */
export class FakeDocument extends FakeElement {
  constructor() {
    super("#document");
    this.body = new FakeElement("body");
    this.documentElement = new FakeElement("html");
    this.dispatched = [];
  }

  createElement(tag) {
    return new FakeElement(tag);
  }

  createElementNS(ns, tag) {
    return new FakeElement(tag, ns);
  }

  dispatchEvent(event) {
    this.dispatched.push(event);
    return true;
  }
}

/** Fake window: listener registry plus the two media/computed-style hooks the module reads. */
export class FakeWindow extends FakeElement {
  constructor({ reducedMotion = false, durationMs = "150ms" } = {}) {
    super("#window");
    this.reducedMotion = reducedMotion;
    this.durationMs = durationMs;
  }

  matchMedia() {
    return { matches: this.reducedMotion };
  }

  getComputedStyle() {
    return { getPropertyValue: () => this.durationMs };
  }
}

/**
 * Dispatch an event to `target`, bubbling through its parents, then on to `tail` (the document). Capture
 * listeners on the window run first when `capture` targets are given.
 */
export function fire(target, type, props = {}, { doc = null, win = null } = {}) {
  const event = {
    type,
    target,
    button: 0,
    isPrimary: true,
    pointerId: 1,
    clientX: 0,
    clientY: 0,
    stopped: false,
    prevented: false,
    stopPropagation() {
      event.stopped = true;
    },
    preventDefault() {
      event.prevented = true;
    },
    ...props,
  };
  const chain = [];
  for (let node = target; node; node = node.parentNode) chain.push(node);
  if (doc && !chain.includes(doc)) chain.push(doc);
  for (const node of [win, ...chain]) {
    if (!node || event.stopped) continue;
    for (const handler of [...(node.listeners.get(type) ?? [])]) handler(event);
  }
  return event;
}
