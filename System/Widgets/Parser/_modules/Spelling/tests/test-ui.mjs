import { test } from "node:test";
import assert from "node:assert/strict";
// Shared per vibe-coding-rules.md SR-4 -- see _shell/tests/js/fake-dom.mjs's
// own header for why this lives there now instead of a per-module copy.
import { createFakeDOM } from "../../../_shell/tests/js/fake-dom.mjs";
import { renderHighlights, showSuggestions, supportsHighlightAPI, replaceWord } from "../src/ui.js";

test("ui.js imports cleanly and supportsHighlightAPI() is false under Node (no CSS.highlights global)", () => {
  assert.equal(supportsHighlightAPI(), false);
});

test("AC-5: renderHighlights() on a fake DOM without CSS.highlights falls back to the overlay path without throwing", () => {
  const doc = createFakeDOM();
  const input = doc.createElement("div");
  doc.body.appendChild(input);
  const tokens = [{ text: "quikk", start: 4, end: 9 }];

  assert.doesNotThrow(() => renderHighlights(input, tokens, { document: doc }));

  const overlay = doc.getElementById("spelling-overlay");
  assert.ok(overlay, "overlay element should have been created");
  assert.equal(overlay.children.length, 1);
});

test("renderHighlights(): guards on a missing inputEl without throwing (JS-2)", () => {
  assert.doesNotThrow(() => renderHighlights(null, []));
});

test("showSuggestions(): renders an accessible role=listbox popover with suggestions + Ignore + Add to dictionary", () => {
  const doc = createFakeDOM();
  const anchor = doc.createElement("span");
  doc.body.appendChild(anchor);

  let replaced = null;
  let ignored = null;
  let learned = null;

  showSuggestions(
    "quikk",
    anchor,
    {
      onReplace: (w) => { replaced = w; },
      onIgnore: (w) => { ignored = w; },
      onLearn: (w) => { learned = w; },
    },
    { document: doc, getSuggestions: () => ["quick", "quirk"] }
  );

  const popover = doc.getElementById("spelling-suggestions");
  assert.ok(popover);
  assert.equal(popover.getAttribute("role"), "listbox");
  assert.equal(popover.getAttribute("aria-label"), "Spelling suggestions");

  const options = popover.querySelectorAll('[role="option"]');
  assert.equal(options.length, 4); // 2 suggestions + Ignore + Add to dictionary
  assert.equal(options[0].textContent, "quick");
  assert.equal(options[0].getAttribute("tabindex"), "0");

  options[0].click();
  assert.equal(replaced, "quick");

  options[2].click(); // "Ignore"
  assert.equal(ignored, "quikk");

  options[3].click(); // "Add to dictionary"
  assert.equal(learned, "quikk");
});

test("showSuggestions(): ArrowDown/Enter keyboard navigation activates an option", () => {
  const doc = createFakeDOM();
  const anchor = doc.createElement("span");
  doc.body.appendChild(anchor);
  let replaced = null;

  showSuggestions(
    "quikk",
    anchor,
    { onReplace: (w) => { replaced = w; } },
    { document: doc, getSuggestions: () => ["quick", "quirk"] }
  );

  const popover = doc.getElementById("spelling-suggestions");
  popover.dispatchKeydown("ArrowDown"); // move from option[0] to option[1] ("quirk")
  popover.dispatchKeydown("Enter");
  assert.equal(replaced, "quirk");
});

test("replaceWord(): uses Range deleteContents + insertNode(textNode), never innerHTML", () => {
  const doc = createFakeDOM();
  const range = doc.createRange();
  replaceWord(range, "quick", doc);
  assert.equal(range._deleted, true);
  assert.equal(range._inserted.nodeValue, "quick");
});

test("replaceWord(): guards on an invalid range without throwing (JS-2)", () => {
  assert.doesNotThrow(() => replaceWord(null, "quick"));
  assert.doesNotThrow(() => replaceWord({}, "quick"));
});
