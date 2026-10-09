// A hand-built DOM exposing only what render.js uses (TEST-8): elements with classList-free
// className, dataset, attributes, style.setProperty, children, and text nodes.
class FakeNode {
  constructor(tag) {
    this.tag = tag;
    this.className = '';
    this.dataset = {};
    this.attributes = {};
    this.style = { props: {}, setProperty(name, value) { this.props[name] = value; } };
    this.children = [];
    this._text = '';
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  appendChild(child) { this.children.push(child); return child; }
  append(...kids) { kids.forEach((kid) => this.appendChild(kid)); }
  replaceChildren(...kids) { this.children = kids; }
  set textContent(value) { this._text = value; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
}

export const fakeDoc = {
  createElement: (tag) => new FakeNode(tag),
  createTextNode: (text) => Object.assign(new FakeNode('#text'), { _text: text }),
};

export function findAll(node, predicate, found = []) {
  if (predicate(node)) found.push(node);
  node.children.forEach((child) => findAll(child, predicate, found));
  return found;
}

export const withClass = (name) => (node) => node.className.split(' ').includes(name);
