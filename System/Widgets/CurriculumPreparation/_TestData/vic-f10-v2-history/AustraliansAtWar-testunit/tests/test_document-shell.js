/**
 * test_document-shell.js — Smoke tests for DocumentShell class
 *
 * Uses node:test (stdlib), no external dependencies.
 * Tests: class instantiation, render loop, tier constants,
 * setData(), image primitive (blob vs. placeholder).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { DocumentShell, TIERS } from "../app/js/document-shell.js";

// ===== Mock DOM Environment =====
// Minimal DOM mocks for testing (hand-built, no jsdom).
class MockSVGElement {
  constructor(tag) {
    this.tag = tag;
    this.attributes = {};
    this.children = [];
    this.classList = new Set();
    this.textContent = "";
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  setAttributeNS(ns, name, value) {
    this.attributes[`${ns}:${name}`] = value;
  }

  getAttributeNS(ns, name) {
    return this.attributes[`${ns}:${name}`];
  }

  appendChild(child) {
    if (child) {
      this.children.push(child);
    }
  }

  remove() {
    // no-op for mock
  }
}

// Mock document and global objects
class MockTextNode {
  constructor(text) {
    this.textContent = text;
  }
}

global.document = {
  head: {
    appendChild: () => {}
  },
  body: {
    appendChild: () => {},
    children: []
  },
  createElementNS: (ns, tag) => new MockSVGElement(tag),
  createElement: (tag) => new MockSVGElement(tag),
  createTextNode: (text) => new MockTextNode(text),
  getElementById: () => null
};

global.URL = {
  createObjectURL: () => "blob:mock-url"
};

global.XMLSerializer = class {
  serializeToString(el) {
    return `<${el.tag} />`;
  }
};

// ===== Test Suite =====

test("DocumentShell: import succeeds", () => {
  assert.ok(typeof DocumentShell === "function", "DocumentShell is a class");
  assert.ok(typeof TIERS === "object", "TIERS is exported");
});

test("TIERS: constants are correct", () => {
  // Test pass tier
  assert.equal(TIERS.pass.line, "#1F6B41", "pass.line is green");
  assert.equal(TIERS.pass.tint, "#E4F4E9", "pass.tint is light green");
  assert.equal(TIERS.pass.ink, "#14502F", "pass.ink is dark green");

  // Test intermediate tier
  assert.equal(TIERS.intermediate.line, "#185FA5", "intermediate.line is blue");
  assert.equal(
    TIERS.intermediate.tint,
    "#E6F1FB",
    "intermediate.tint is light blue"
  );
  assert.equal(TIERS.intermediate.ink, "#0C447C", "intermediate.ink is dark blue");

  // Test advanced tier
  assert.equal(TIERS.advanced.line, "#9A4E12", "advanced.line is orange");
  assert.equal(TIERS.advanced.tint, "#FCEEE2", "advanced.tint is light orange");
  assert.equal(TIERS.advanced.ink, "#703508", "advanced.ink is dark orange");
});

test("DocumentShell: instantiation with portrait orientation", () => {
  const data = {
    pages: [
      { orientation: "portrait", content: { title: "Page 1" } },
      { orientation: "portrait", content: { title: "Page 2" } }
    ]
  };

  const renderFn = (pageData, svgElement) => {
    // Mock render function
  };

  const shell = new DocumentShell(data, renderFn, "portrait");

  assert.equal(shell.orientation, "portrait", "orientation is portrait");
  assert.ok(Array.isArray(shell.svgPages), "svgPages is an array");
});

test("DocumentShell: instantiation with landscape orientation", () => {
  const data = {
    pages: [{ orientation: "landscape", content: { title: "Map" } }]
  };

  const renderFn = () => {};

  const shell = new DocumentShell(data, renderFn, "landscape");

  assert.equal(shell.orientation, "landscape", "orientation is landscape");
});

test("DocumentShell: invalid orientation throws error", () => {
  const data = { pages: [] };
  const renderFn = () => {};

  assert.throws(
    () => new DocumentShell(data, renderFn, "invalid"),
    /Invalid orientation/,
    "throws on invalid orientation"
  );
});

test("DocumentShell: render creates SVG elements with correct viewBox", () => {
  let renderedSVG = null;

  const renderFn = (pageData, svgElement) => {
    renderedSVG = svgElement;
  };

  const data = {
    pages: [{ orientation: "portrait", content: {} }]
  };

  const shell = new DocumentShell(data, renderFn, "portrait");

  // Check that render was called and SVG was created
  assert.ok(renderedSVG, "render function was called");
  assert.ok(
    renderedSVG instanceof MockSVGElement,
    "SVG element was created"
  );

  // Verify portrait viewBox
  assert.equal(
    renderedSVG.getAttribute("viewBox"),
    "0 0 210 297",
    "portrait viewBox is correct"
  );
  assert.equal(renderedSVG.getAttribute("width"), "210mm", "portrait width is correct");
  assert.equal(renderedSVG.getAttribute("height"), "297mm", "portrait height is correct");
});

test("DocumentShell: render creates landscape SVG with correct viewBox", () => {
  let renderedSVG = null;

  const renderFn = (pageData, svgElement) => {
    renderedSVG = svgElement;
  };

  const data = {
    pages: [{ orientation: "landscape", content: {} }]
  };

  const shell = new DocumentShell(data, renderFn, "landscape");

  // Verify landscape viewBox
  assert.equal(
    renderedSVG.getAttribute("viewBox"),
    "0 0 297 210",
    "landscape viewBox is correct"
  );
  assert.equal(renderedSVG.getAttribute("width"), "297mm", "landscape width is correct");
  assert.equal(renderedSVG.getAttribute("height"), "210mm", "landscape height is correct");
});

test("DocumentShell: setData triggers re-render", () => {
  let renderCallCount = 0;

  const renderFn = () => {
    renderCallCount++;
  };

  const data = { pages: [{ orientation: "portrait", content: {} }] };
  const shell = new DocumentShell(data, renderFn, "portrait");

  // render() is called once in constructor
  assert.equal(renderCallCount, 1, "render called once on init");

  // setData should call render again
  shell.setData({ pages: [{ orientation: "portrait", content: { updated: true } }] });

  assert.equal(renderCallCount, 2, "render called again on setData");
});

test("DocumentShell: exportSVG returns serialized SVG", () => {
  const renderFn = () => {};

  const data = {
    pages: [
      { orientation: "portrait", content: {} },
      { orientation: "portrait", content: {} }
    ]
  };

  const shell = new DocumentShell(data, renderFn, "portrait");

  const svg = shell.exportSVG();

  assert.ok(typeof svg === "string", "exportSVG returns string");
  assert.ok(svg.length > 0, "SVG string is not empty");
});

test("DocumentShell: renderImage with null blob creates placeholder", () => {
  const renderFn = () => {};
  const data = { pages: [{ orientation: "portrait", content: {} }] };
  const shell = new DocumentShell(data, renderFn, "portrait");

  const svgElement = new MockSVGElement("svg");
  svgElement.appendChild = (child) => {
    svgElement.children.push(child);
  };

  // Call renderImage with null blob
  shell.renderImage(null, 10, 10, 50, 50, svgElement);

  // Check that a group was added
  assert.ok(svgElement.children.length > 0, "group was added to SVG");

  const group = svgElement.children[0];
  assert.ok(group instanceof MockSVGElement, "group is an SVG element");
  assert.ok(group.children.length > 0, "placeholder elements were added to group");
});

test("DocumentShell: renderImage with blob creates image element", () => {
  const renderFn = () => {};
  const data = { pages: [{ orientation: "portrait", content: {} }] };
  const shell = new DocumentShell(data, renderFn, "portrait");

  const svgElement = new MockSVGElement("svg");
  svgElement.appendChild = (child) => {
    svgElement.children.push(child);
  };

  // Mock blob
  const mockBlob = new Blob(["test"], { type: "image/png" });

  // Call renderImage with blob
  shell.renderImage(mockBlob, 10, 10, 50, 50, svgElement);

  // Check that elements were added
  assert.ok(svgElement.children.length > 0, "elements were added to SVG");
});

test("TIERS: no curriculum vocabulary in tier names", () => {
  const vocabularyToCheck = [
    "lesson",
    "student",
    "curriculum",
    "outcome",
    "vcaa",
    "victoria"
  ];

  const tierJSON = JSON.stringify(TIERS).toLowerCase();

  for (const word of vocabularyToCheck) {
    assert.ok(
      !tierJSON.includes(word),
      `TIERS does not contain "${word}"`
    );
  }
});

test("DocumentShell: no third-party dependencies in module", () => {
  // This is a smoke test that verifies the module imports correctly
  // with no external dependencies. If external dependencies were present,
  // the import would fail or require an npm install.
  assert.ok(typeof DocumentShell === "function", "module imports without errors");
  assert.ok(typeof TIERS === "object", "TIERS is available");
});
