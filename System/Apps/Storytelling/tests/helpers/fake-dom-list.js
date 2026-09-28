/**
 * Hand-built fake DOM for list-panel testing.
 * Provides minimal DOM element API with event support.
 */

class FakeElement {
	constructor(tag, ownerDocument = null) {
		this.tag = tag;
		this.ownerDocument = ownerDocument;
		this.classes = new Set();
		this.classList = {
			add: (name) => this.classes.add(name),
			toggle: (name, force) => {
				if (force) this.classes.add(name);
				else this.classes.delete(name);
			},
			contains: (name) => this.classes.has(name),
		};
		this.attributes = new Map();
		this.listeners = new Map();
		this.children = [];
		this.parent = null;
		this._textContent = "";
		this._type = "";
		this._checked = false;
		this._value = "";
		this._className = "";
		this._id = "";
	}

	get textContent() {
		return this._textContent;
	}

	set textContent(text) {
		this._textContent = text;
	}

	get type() {
		return this._type;
	}

	set type(t) {
		this._type = t;
	}

	get checked() {
		return this._checked;
	}

	set checked(c) {
		this._checked = c;
	}

	get value() {
		return this._value;
	}

	set value(v) {
		this._value = v;
	}

	get className() {
		return this._className;
	}

	set className(c) {
		this._className = c;
	}

	get id() {
		return this._id;
	}

	set id(i) {
		this._id = i;
	}

	get htmlFor() {
		return this.attributes.get("for") || "";
	}

	set htmlFor(v) {
		this.setAttribute("for", v);
	}

	createElement(tag) {
		return new FakeElement(tag, this.ownerDocument);
	}

	createElementNS(ns, tag) {
		return new FakeElement(tag, this.ownerDocument);
	}

	appendChild(child) {
		if (child.parent) {
			child.parent.children = child.parent.children.filter(c => c !== child);
		}
		child.parent = this;
		this.children.push(child);
		return child;
	}

	get lastChild() {
		return this.children[this.children.length - 1] ?? null;
	}

	replaceChildren(...nodes) {
		this.children = [];
		for (const node of nodes) this.appendChild(node);
	}

	prepend(child) {
		if (child.parent) {
			child.parent.children = child.parent.children.filter(c => c !== child);
		}
		child.parent = this;
		this.children.unshift(child);
		return child;
	}

	setAttribute(name, value) {
		this.attributes.set(name, value);
	}

	removeAttribute(name) {
		this.attributes.delete(name);
	}

	getAttribute(name) {
		return this.attributes.get(name) || null;
	}

	hasAttribute(name) {
		return this.attributes.has(name);
	}

	addEventListener(event, handler) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event).push(handler);
	}

	removeEventListener(event, handler) {
		if (this.listeners.has(event)) {
			const handlers = this.listeners.get(event);
			const idx = handlers.indexOf(handler);
			if (idx > -1) {
				handlers.splice(idx, 1);
			}
		}
	}

	focus() {
		this._hasFocus = true;
		if (this.ownerDocument) this.ownerDocument.activeElement = this;
	}

	_dispatch(eventName, eventObj = {}) {
		const handlers = this.listeners.get(eventName) || [];
		const evt = { type: eventName, target: this, ...eventObj };
		handlers.forEach(h => h(evt));
	}

	_change(value) {
		this.value = value;
		this._dispatch("change");
	}

	_check() {
		this.checked = !this.checked;
		this._dispatch("change");
	}

	_click() {
		this._dispatch("click");
	}

	_keydown(key) {
		this._dispatch("keydown", { key });
	}
}

/**
 * Create a fake document with minimal DOM API.
 */
export function createFakeDocument() {
	const doc = new FakeElement("document");
	doc.ownerDocument = doc;
	doc.toolbarButtons = {};
	doc.querySelector = (selector) => {
		const match = /^\[data-action="(.+)"\]$/.exec(selector);
		return match ? (doc.toolbarButtons[match[1]] ?? null) : null;
	};

	// Track event listeners on document itself
	doc.listeners = new Map();
	doc.body = new FakeElement("body", doc);
	doc.activeElement = doc.body;

	doc.createElement = (tag) => new FakeElement(tag, doc);
	doc.createElementNS = (ns, tag) => new FakeElement(tag, doc);

	// Support addEventListener on document
	doc.addEventListener = function(event, handler) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event).push(handler);
	};

	doc.removeEventListener = function(event, handler) {
		if (this.listeners.has(event)) {
			const handlers = this.listeners.get(event);
			const idx = handlers.indexOf(handler);
			if (idx > -1) {
				handlers.splice(idx, 1);
			}
		}
	};

	// Dispatch event on document
	doc._dispatch = function(eventName, eventObj = {}) {
		const handlers = this.listeners.get(eventName) || [];
		const evt = { type: eventName, target: null, ...eventObj };
		handlers.forEach(h => h(evt));
	};

	return doc;
}

/**
 * Utility: get all options from a select element.
 */
export function getSelectOptions(select) {
	return select.children;
}

/**
 * Utility: find a child element by class name.
 */
export function findByClassName(element, className) {
	return element.children.find(child => child.className === className);
}

/**
 * Utility: find a child element by tag.
 */
export function findByTag(element, tag) {
	return element.children.find(child => child.tag === tag);
}

/**
 * Utility: depth-first search for the first descendant whose class list holds `className`.
 */
export function findDescendant(element, className) {
	if (element.classes.has(className) || element.className.split(/\s+/).includes(className)) return element;
	for (const child of element.children) {
		const found = findDescendant(child, className);
		if (found) return found;
	}
	return null;
}
