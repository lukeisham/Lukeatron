import test from "node:test";
import assert from "node:assert/strict";
import { storyText } from "../app/story/story-text.js";
import { layout } from "../app/story/story-layout.js";

/* ---------- Test fixtures and helpers ---------- */

/** A minimal lookup for testing. */
function makeLookup(elements = {}) {
  const defaults = {
    A: { id: "A", name: "Alpha" },
    B: { id: "B", name: "Beta" },
    C: { id: "C", name: "Charlie" },
    D: { id: "D", name: "Delta" },
    E: { id: "E", name: "Echo" },
    Rg: { id: "Rg", name: "Rogue card" },
  };
  const merged = { ...defaults, ...elements };
  return (elementId) => merged[elementId];
}

/** Build a hand-crafted layout result for testing. */
function makeLayout(order, stepNumbers = {}) {
  const sn = {};
  order.forEach((uid, i) => {
    sn[uid] = stepNumbers[uid] ?? i + 1;
  });
  return {
    order,
    stepNumbers: sn,
    positions: {},
    ribbonPaths: [],
    loopRibbons: [],
    width: 0,
    height: 0,
  };
}

/** Make a bead with just uid and elementId. */
function makeBead(uid, elementId) {
  return { uid, elementId };
}

/* ---------- Import and basic tests ---------- */

test("imports cleanly", () => {
  assert.ok(typeof storyText === "function");
});

/* ---------- Straight chain ---------- */

test("straight chain with no branches", () => {
  const beads = [
    makeBead("b1", "A"),
    makeBead("b2", "B"),
    makeBead("b3", "C"),
  ];
  const ribbons = [["b1", "b2"], ["b2", "b3"]];
  const layoutResult = makeLayout(["b1", "b2", "b3"]);
  const lookup = makeLookup();

  const result = storyText("My chain", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines[0], "My chain");
  assert.equal(lines[1], "1. A — Alpha");
  assert.equal(lines[2], "2. B — Beta");
  assert.equal(lines[3], "3. C — Charlie");
  // No arrows in a straight chain
  assert.ok(!lines[1].includes(" → "));
  assert.ok(!lines[2].includes(" → "));
  assert.ok(!lines[3].includes(" → "));
});

/* ---------- Fork ---------- */

test("fork shows arrows from branching bead", () => {
  const beads = [
    makeBead("b1", "A"),
    makeBead("b2", "B"),
    makeBead("b3", "C"),
  ];
  const ribbons = [["b1", "b2"], ["b1", "b3"]];
  const layoutResult = makeLayout(["b1", "b2", "b3"]);
  const lookup = makeLookup();

  const result = storyText("Fork test", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  // First bead (b1) leads to both b2 and b3, not just b2
  assert.equal(lines[1], "1. A — Alpha → 2, 3");
  // b2 and b3 have no outgoing ribbons
  assert.ok(!lines[2].includes(" → "));
  assert.ok(!lines[3].includes(" → "));
});

/* ---------- Merge ---------- */

test("merge shows arrows from both sources", () => {
  const beads = [
    makeBead("b1", "A"),
    makeBead("b2", "B"),
    makeBead("b3", "C"),
    makeBead("b4", "D"),
  ];
  const ribbons = [["b1", "b2"], ["b1", "b3"], ["b2", "b4"], ["b3", "b4"]];
  const layoutResult = makeLayout(["b1", "b2", "b3", "b4"]);
  const lookup = makeLookup();

  const result = storyText("Merge test", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  // b1 leads to both b2 and b3, not just to step 2
  assert.equal(lines[1], "1. A — Alpha → 2, 3");
  // b2 leads only to b4 (step 4), but next step is 3, so it skips—needs arrow
  assert.equal(lines[2], "2. B — Beta → 4");
  // b3 leads only to b4 (step 4), which is the next step, so no arrow
  assert.ok(!lines[3].includes(" → "));
});

/* ---------- Loop ---------- */

test("loop shows arrow from loop-closing bead", () => {
  const beads = [
    makeBead("b1", "A"),
    makeBead("b2", "B"),
    makeBead("b3", "C"),
  ];
  const ribbons = [["b1", "b2"], ["b2", "b3"], ["b3", "b1"]];
  const layoutResult = makeLayout(["b1", "b2", "b3"]);
  const lookup = makeLookup();

  const result = storyText("Loop test", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  // b3 leads to b1, which is not the next step
  assert.equal(lines[3], "3. C — Charlie → 1");
});

/* ---------- Tandem ---------- */

test("tandem shows both symbols and names", () => {
  const beads = [
    { uid: "b1", elementId: "A", with: "B" },
    makeBead("b2", "C"),
  ];
  const ribbons = [["b1", "b2"]];
  const layoutResult = makeLayout(["b1", "b2"]);
  const lookup = makeLookup();

  const result = storyText("Tandem test", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines[1], "1. A + B — Alpha + Beta");
  assert.equal(lines[2], "2. C — Charlie");
});

/* ---------- Rogue ---------- */

test("rogue card with default label", () => {
  const beads = [
    { uid: "b1", elementId: "Rg", label: "Custom Label" },
    makeBead("b2", "A"),
  ];
  const ribbons = [["b1", "b2"]];
  const layoutResult = makeLayout(["b1", "b2"]);
  const lookup = makeLookup();

  const result = storyText("Rogue test", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines[1], "1. Rg — Custom Label");
  assert.equal(lines[2], "2. A — Alpha");
});

test("rogue as second half of tandem", () => {
  const beads = [
    { uid: "b1", elementId: "A", with: "Rg", withLabel: "Twist" },
  ];
  const ribbons = [];
  const layoutResult = makeLayout(["b1"]);
  const lookup = makeLookup();

  const result = storyText("Tandem rogue", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines[1], "1. A + Rg — Alpha + Twist");
});

/* ---------- Notes ---------- */

test("note on a bead is indented after the element name", () => {
  const beads = [
    { uid: "b1", elementId: "A", note: "This is the opening scene" },
    makeBead("b2", "B"),
  ];
  const ribbons = [["b1", "b2"]];
  const layoutResult = makeLayout(["b1", "b2"]);
  const lookup = makeLookup();

  const result = storyText("Note test", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines[1], "1. A — Alpha");
  assert.equal(lines[2], "  This is the opening scene");
  assert.equal(lines[3], "2. B — Beta");
});

test("note with arrow on the bead line", () => {
  const beads = [
    { uid: "b1", elementId: "A", note: "First event" },
    makeBead("b2", "B"),
    makeBead("b3", "C"),
  ];
  const ribbons = [["b1", "b2"], ["b1", "b3"]];
  const layoutResult = makeLayout(["b1", "b2", "b3"]);
  const lookup = makeLookup();

  const result = storyText("Arrow + note", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  // Line with arrow should not include the note itself
  assert.equal(lines[1], "1. A — Alpha → 2, 3");
  assert.equal(lines[2], "  First event");
});

/* ---------- Blank name ---------- */

test("blank name defaults to 'My story map'", () => {
  const beads = [makeBead("b1", "A")];
  const ribbons = [];
  const layoutResult = makeLayout(["b1"]);
  const lookup = makeLookup();

  const result = storyText("", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines[0], "My story map");
});

test("null name defaults to 'My story map'", () => {
  const beads = [makeBead("b1", "A")];
  const ribbons = [];
  const layoutResult = makeLayout(["b1"]);
  const lookup = makeLookup();

  const result = storyText(null, beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines[0], "My story map");
});

/* ---------- Real layout function ---------- */

test("works with real layout() function", () => {
  const beads = [
    makeBead("b1", "A"),
    makeBead("b2", "B"),
    makeBead("b3", "C"),
  ];
  const ribbons = [["b1", "b2"], ["b2", "b3"]];

  // Use the real layout function
  const layoutResult = layout(beads, ribbons);

  const lookup = makeLookup();
  const result = storyText("Real layout test", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines[0], "Real layout test");
  // Should have beads in layout order
  assert.ok(lines.some((l) => l.includes("Alpha")));
  assert.ok(lines.some((l) => l.includes("Beta")));
  assert.ok(lines.some((l) => l.includes("Charlie")));
});

/* ---------- Default lookup ---------- */

test("uses default lookup when none provided", () => {
  const beads = [makeBead("b1", "C")]; // Use an actual element id from ELEMENTS
  const ribbons = [];
  const layoutResult = makeLayout(["b1"]);

  // Don't provide a lookup function
  const result = storyText("Default lookup", beads, ribbons, layoutResult);

  const lines = result.split("\n");
  assert.equal(lines[0], "Default lookup");
  // Should find the real element
  assert.match(lines[1], /^1\. C — Conflict$/);
});

/* ---------- Edge cases ---------- */

test("empty beads and ribbons", () => {
  const beads = [];
  const ribbons = [];
  const layoutResult = makeLayout([]);
  const lookup = makeLookup();

  const result = storyText("Empty story", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines[0], "Empty story");
  // Only the title, no beads
  assert.equal(lines.length, 1);
});

test("bead with no matching layout entry is skipped", () => {
  const beads = [
    makeBead("b1", "A"),
    makeBead("b2", "B"),
  ];
  const ribbons = [["b1", "b2"]];
  // Layout only includes b1, not b2
  const layoutResult = makeLayout(["b1"]);
  const lookup = makeLookup();

  const result = storyText("Partial layout", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines.length, 2); // Title + b1 only
  assert.ok(lines[1].includes("Alpha"));
});

/* ---------- Multiple arrows ---------- */

test("multiple arrows are listed lowest step number first, whatever order the ribbons were made in", () => {
  const beads = [
    makeBead("b1", "A"),
    makeBead("b2", "B"),
    makeBead("b3", "C"),
    makeBead("b4", "D"),
  ];
  const ribbons = [["b1", "b2"], ["b1", "b4"], ["b1", "b3"]];
  const layoutResult = makeLayout(["b1", "b2", "b3", "b4"]);
  const lookup = makeLookup();

  const result = storyText("Multi-arrow", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines[1], "1. A — Alpha → 2, 3, 4");
  const reordered = storyText("Multi-arrow", beads, [["b1", "b3"], ["b1", "b4"], ["b1", "b2"]], layoutResult, lookup);
  assert.equal(reordered, result, "same map, same text");
});

/* ---------- Symbol display ---------- */

test("uses symbol field if provided by lookup", () => {
  const beads = [makeBead("b1", "A")];
  const ribbons = [];
  const layoutResult = makeLayout(["b1"]);
  const lookup = makeLookup({
    A: { id: "A", name: "Alpha", symbol: "α" },
  });

  const result = storyText("Symbol test", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines[1], "1. α — Alpha");
});

test("defaults to id when symbol not provided", () => {
  const beads = [makeBead("b1", "A")];
  const ribbons = [];
  const layoutResult = makeLayout(["b1"]);
  const lookup = makeLookup({
    A: { id: "A", name: "Alpha" }, // No symbol field
  });

  const result = storyText("No symbol", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines[1], "1. A — Alpha");
});

/* ---------- Exact output format (AC-C8, AC-C13) ---------- */

test("exact format: straight chain matches FR-C13", () => {
  const beads = [
    makeBead("b1", "A"),
    makeBead("b2", "B"),
  ];
  const ribbons = [["b1", "b2"]];
  const layoutResult = makeLayout(["b1", "b2"]);
  const lookup = makeLookup();

  const result = storyText("Story", beads, ribbons, layoutResult, lookup);

  const expected = "Story\n1. A — Alpha\n2. B — Beta";
  assert.equal(result, expected);
});

test("exact format: tandem with note matches FR-C13", () => {
  const beads = [
    { uid: "b1", elementId: "A", with: "B", note: "Opening" },
  ];
  const ribbons = [];
  const layoutResult = makeLayout(["b1"]);
  const lookup = makeLookup();

  const result = storyText("Story", beads, ribbons, layoutResult, lookup);

  const expected = "Story\n1. A + B — Alpha + Beta\n  Opening";
  assert.equal(result, expected);
});

test("exact format: rogue with branching arrow", () => {
  const beads = [
    { uid: "b1", elementId: "Rg", label: "Mystery" },
    makeBead("b2", "A"),
    makeBead("b3", "B"),
  ];
  const ribbons = [["b1", "b2"], ["b1", "b3"]];
  const layoutResult = makeLayout(["b1", "b2", "b3"]);
  const lookup = makeLookup();

  const result = storyText("Story", beads, ribbons, layoutResult, lookup);

  const lines = result.split("\n");
  assert.equal(lines[0], "Story");
  assert.equal(lines[1], "1. Rg — Mystery → 2, 3");
  assert.equal(lines[2], "2. A — Alpha");
  assert.equal(lines[3], "3. B — Beta");
});

/* ---------- FR-C13 details found in review ---------- */

test("a rogue card that is the FIRST half of a tandem prints both halves", () => {
  const beads = [{ uid: "b1", elementId: "Rg", label: "Twist", with: "A" }];
  const result = storyText("Story", beads, [], makeLayout(["b1"]), makeLookup());
  assert.equal(result, "Story\n1. Rg + A — Twist + Alpha");
});

test("two rogue cards in one tandem each keep their own label", () => {
  const beads = [{ uid: "b1", elementId: "Rg", label: "One", with: "Rg", withLabel: "Two" }];
  assert.equal(storyText("Story", beads, [], makeLayout(["b1"]), makeLookup()), "Story\n1. Rg + Rg — One + Two");
});

test("a rogue card with no label prints the default 'Rogue'", () => {
  const beads = [{ uid: "b1", elementId: "Rg" }];
  assert.equal(storyText("Story", beads, [], makeLayout(["b1"]), makeLookup()), "Story\n1. Rg — Rogue");
});

test("a loop back to an element used twice names the step number, so it is not ambiguous", () => {
  const beads = [makeBead("b1", "A"), makeBead("b2", "B"), makeBead("b3", "A")];
  const ribbons = [["b1", "b2"], ["b2", "b3"], ["b3", "b1"]];
  const result = storyText("Loop", beads, ribbons, layout(beads, ribbons), makeLookup());
  assert.equal(result, "Loop\n1. A — Alpha\n2. B — Beta\n3. A — Alpha → 1");
});

test("a fork and merge through the real layout(): exact copy text", () => {
  const beads = [makeBead("b1", "A"), makeBead("b2", "B"), makeBead("b3", "C"), makeBead("b4", "D")];
  const ribbons = [["b1", "b2"], ["b2", "b4"], ["b1", "b3"], ["b3", "b4"]];
  const result = storyText("Fork", beads, ribbons, layout(beads, ribbons), makeLookup());
  assert.equal(result, "Fork\n1. A — Alpha → 2, 3\n2. B — Beta → 4\n3. C — Charlie\n4. D — Delta");
});

test("guard: a ribbon to a bead that is not in the map is ignored rather than printed as a broken target", () => {
  const beads = [makeBead("b1", "A"), makeBead("b2", "B")];
  const result = storyText("Story", beads, [["b1", "b2"], ["b1", "ghost"]], makeLayout(["b1", "b2"]), makeLookup());
  assert.equal(result, "Story\n1. A — Alpha\n2. B — Beta");
});

test("guard: an unknown element id is reported and printed by id, never as undefined", () => {
  const original = console.warn;
  const warnings = [];
  console.warn = (message) => warnings.push(message);
  let result;
  try {
    result = storyText("Story", [makeBead("b1", "Nope")], [], makeLayout(["b1"]), makeLookup());
  } finally {
    console.warn = original;
  }
  assert.equal(result, "Story\n1. Nope — Nope");
  assert.equal(warnings.length, 1);
});

test("real data: the Five Man Band 'Hero' sub-tile prints its display symbol H, not its id 5maH", () => {
  const result = storyText("Story", [makeBead("b1", "5maH")], [], makeLayout(["b1"]));
  assert.match(result, /^Story\n1\. H — /);
});

test("a note is indented by two spaces on the line after its bead, and after the arrow line", () => {
  const beads = [{ uid: "b1", elementId: "A", note: "Why" }, makeBead("b2", "B"), makeBead("b3", "C")];
  const result = storyText("Story", beads, [["b1", "b3"]], makeLayout(["b1", "b2", "b3"]), makeLookup());
  assert.equal(result, "Story\n1. A — Alpha → 3\n  Why\n2. B — Beta\n3. C — Charlie");
});
