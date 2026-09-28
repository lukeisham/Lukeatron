/** Hand-built fake page for agent-api.test.js (TEST-8): only what mountAgentApi touches. */

class FakeNode {
  constructor(tag, parent) {
    this.tagName = tag.toUpperCase();
    this.attributes = {};
    this.textContent = "";
    this.parent = parent;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  remove() {
    this.parent.children = this.parent.children.filter((child) => child !== this);
  }
}

/** A document with a head, node creation and a record of every dispatched event. */
export function createFakeDoc() {
  const head = { children: [], appendChild(node) { node.parent = head; head.children.push(node); return node; } };
  return {
    head,
    events: [],
    createElement: (tag) => new FakeNode(tag, null),
    dispatchEvent(event) {
      this.events.push(event);
      return true;
    },
    getElementById: (id) => head.children.find((node) => node.attributes.id === id) ?? null,
    findMeta: (name) => head.children.find((node) => node.tagName === "META" && node.attributes.name === name) ?? null,
  };
}
