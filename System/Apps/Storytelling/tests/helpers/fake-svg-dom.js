/** Hand-built fake SVG DOM for diagram-svg.test.js (TEST-8): only what diagram-svg.js touches, plus a tiny selector engine for assertions. */

class FakeSvgNode {
  constructor(tag, doc) {
    this.tagName = tag;
    this.ownerDocument = doc;
    this.children = [];
    this.attributes = {};
    this.ownText = "";
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return name in this.attributes ? this.attributes[name] : null;
  }

  hasAttribute(name) {
    return name in this.attributes;
  }

  get classes() {
    return (this.attributes.class ?? "").split(/\s+/).filter(Boolean);
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

  replaceChildren(...nodes) {
    this.children = [...nodes];
  }

  querySelectorAll(selector) {
    return queryAll(this, selector);
  }

  querySelector(selector) {
    return queryAll(this, selector)[0] ?? null;
  }
}

/** A document whose only job is createElementNS; `host()` makes a host element for drawDiagram. */
export function makeFakeSvgDocument() {
  const doc = {
    createdWithNamespace: [],
    createElementNS(namespace, tag) {
      doc.createdWithNamespace.push(namespace);
      return new FakeSvgNode(tag, doc);
    },
    createElement(tag) {
      return new FakeSvgNode(tag, doc);
    },
  };
  doc.host = () => doc.createElement("main");
  return doc;
}

function parseCompound(text) {
  const tag = /^[a-zA-Z][\w-]*/.exec(text)?.[0];
  const classes = [...text.matchAll(/\.([\w-]+)/g)].map((match) => match[1]);
  const attributes = [...text.matchAll(/\[([\w-]+)(?:=(?:"([^"]*)"|([^\]]*)))?\]/g)].map((match) => ({
    name: match[1],
    value: match[2] ?? match[3],
  }));
  return { tag, classes, attributes };
}

function matches(node, compound) {
  if (compound.tag && node.tagName !== compound.tag) return false;
  if (!compound.classes.every((name) => node.classes.includes(name))) return false;
  return compound.attributes.every(({ name, value }) => (value === undefined ? node.hasAttribute(name) : node.getAttribute(name) === value));
}

function descendants(root) {
  const out = [];
  const walk = (node) => {
    for (const child of node.children) {
      out.push(child);
      walk(child);
    }
  };
  walk(root);
  return out;
}

/** Supports `tag.class[attr="v"]` compounds joined by spaces (descendant combinator). */
function queryAll(root, selector) {
  const parts = selector.trim().split(/\s+/).map(parseCompound);
  let scope = [root];
  for (const part of parts) {
    const found = new Set();
    for (const base of scope) for (const node of descendants(base)) if (matches(node, part)) found.add(node);
    scope = [...found];
  }
  return scope;
}
