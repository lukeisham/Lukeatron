import test from "node:test";
import assert from "node:assert/strict";
import { listText } from "../app/lists/list-text.js";
import { CATEGORIES as REAL_CATEGORIES, ELEMENTS as REAL_ELEMENTS } from "../app/data/elements.js";

// Test fixture: minimal CATEGORIES and ELEMENTS
const fixtureCats = [
	{ key: "structure", label: "Structure" },
	{ key: "setting", label: "Setting, laws, plots" },
	{ key: "storymod", label: "Story modifiers" },
];

const fixtureEls = [
	// Structure elements
	{ id: "C", name: "Conflict", group: "structure", category: "structure", description: "A central conflict drives the story.", example: "Romeo and Juliet" },
	{ id: "Pro", name: "Prologue", group: "structure", category: "structure", added: true, order: 0, description: "An opening scene before the main plot.", example: null },
	{ id: "3as", name: "Three Act Structure", group: "structure", category: "structure", description: "Setup, confrontation, resolution.", example: null },

	// Setting elements (includes the highlight tile Cal)
	{ id: "Cal", name: "Calling", group: "setting", category: "setting", description: "A moment of choice or revelation.", example: "The call to adventure." },

	// Story modifiers
	{ id: "Anv", name: "Anvilicious", group: "storymod", category: "storymod", description: "A message delivered too bluntly.", example: "Heavy-handed morals." },

	// Villain group (poster element)
	{ id: "V1", name: "Villain", group: "villains", category: "villains", description: "The primary antagonist." },

	// Paler villain tile: colour group differs from its category (category is data, never derived from group)
	{ id: "V2", name: "Villain Type 2", group: "villains2", category: "villains", description: "A secondary antagonist type." },

	// Heroes category (tests 5ma mapping)
	{ id: "5ma", name: "Five Man Band", group: "heroes", category: "heroes", description: "The leader, lancer, smart guy, big guy, chick." },
];

test("imports cleanly", () => {
	assert.ok(typeof listText === "function");
});

test("single category with examples", () => {
	const data = { CATEGORIES: fixtureCats, ELEMENTS: fixtureEls };
	const result = listText("structure", { examples: true }, data);

	// Should contain structure heading
	assert.match(result, /^Structure\n/);

	// Should contain three bullets for structure elements
	assert.match(result, /• Conflict — A central conflict drives the story\.\n    Example: Romeo and Juliet/);
	assert.match(result, /• Prologue † — An opening scene before the main plot\./);
	assert.match(result, /• Three Act Structure — Setup, confrontation, resolution\./);

	// Prologue should have example line omitted (no example)
	assert.ok(!result.includes("Example: null"));

	// Should end with credit line
	assert.match(result, /Descriptions and examples adapted from TV Tropes/);

	// Should have † footnote because Prologue is added
	assert.match(result, /† Added for this app/);
});

test("single category without examples", () => {
	const data = { CATEGORIES: fixtureCats, ELEMENTS: fixtureEls };
	const result = listText("structure", { examples: false }, data);

	// Should not contain "Example:" lines
	assert.ok(!result.includes("Example:"));

	// Should contain the bullets
	assert.match(result, /• Conflict — A central conflict drives the story\./);

	// Should end with credit
	assert.match(result, /Descriptions and examples adapted from TV Tropes/);
});

test("all categories in order with blank-line separation", () => {
	const data = { CATEGORIES: fixtureCats, ELEMENTS: fixtureEls };
	const result = listText("all", { examples: false }, data);

	// Should contain all three category headings in order
	const structIdx = result.indexOf("Structure");
	const settIdx = result.indexOf("Setting, laws, plots");
	const storymodIdx = result.indexOf("Story modifiers");

	assert.ok(structIdx > -1, "Structure heading missing");
	assert.ok(settIdx > -1, "Setting heading missing");
	assert.ok(storymodIdx > -1, "Story modifiers heading missing");
	assert.ok(structIdx < settIdx, "Structure should come before Setting");
	assert.ok(settIdx < storymodIdx, "Setting should come before Story modifiers");

	// Should have blank lines between categories
	const structToSetting = result.substring(structIdx, settIdx);
	assert.match(structToSetting, /\n\n/, "Should have blank line between Structure and Setting");
});

test("added elements marked with †", () => {
	const data = { CATEGORIES: fixtureCats, ELEMENTS: fixtureEls };
	const result = listText("structure", { examples: false }, data);

	// Prologue is added, should have †
	assert.match(result, /• Prologue †/);

	// Other elements should not have †
	assert.match(result, /• Conflict[^†]/);
	assert.match(result, /• Three Act Structure[^†]/);
});

test("† footnote only appears when list contains added elements", () => {
	const data = { CATEGORIES: fixtureCats, ELEMENTS: fixtureEls };

	// Structure category has an added element (Prologue)
	const resultWithAdded = listText("structure", { examples: false }, data);
	assert.match(resultWithAdded, /† Added for this app/);

	// Setting category has no added elements (Cal is not added)
	const resultNoAdded = listText("setting", { examples: false }, data);
	assert.ok(!resultNoAdded.includes("† Added for this app"));
});

test("TV Tropes credit line always appears", () => {
	const data = { CATEGORIES: fixtureCats, ELEMENTS: fixtureEls };

	const singleCat = listText("structure", { examples: false }, data);
	assert.match(singleCat, /Descriptions and examples adapted from TV Tropes \(tvtropes\.org\), CC BY-NC-SA 3\.0\.\n$/);

	const allCats = listText("all", { examples: false }, data);
	assert.match(allCats, /Descriptions and examples adapted from TV Tropes \(tvtropes\.org\), CC BY-NC-SA 3\.0\.\n$/);
});

test("unknown category key throws clear error", () => {
	const data = { CATEGORIES: fixtureCats, ELEMENTS: fixtureEls };

	assert.throws(
		() => listText("nonexistent", { examples: false }, data),
		/Unknown category key: "nonexistent"/
	);
});

test("highlight tile Cal appears under Setting", () => {
	const data = { CATEGORIES: fixtureCats, ELEMENTS: fixtureEls };
	const result = listText("setting", { examples: false }, data);

	// Cal should appear in the Setting category
	assert.match(result, /• Calling — A moment of choice or revelation\./);
});

test("option { examples } defaults to false", () => {
	const data = { CATEGORIES: fixtureCats, ELEMENTS: fixtureEls };
	const result = listText("structure", {}, data);

	// Should not include examples even though some elements have them
	assert.ok(!result.includes("Example:"));
});

test("credit line is the last line of output", () => {
	const data = { CATEGORIES: fixtureCats, ELEMENTS: fixtureEls };
	const result = listText("structure", { examples: false }, data);

	const lines = result.split("\n");
	const lastLine = lines[lines.length - 1];
	assert.equal(lastLine, "");

	const secondLastLine = lines[lines.length - 2];
	assert.match(secondLastLine, /Descriptions and examples adapted from TV Tropes/);
});

test("element with no description is listed by name alone", () => {
	// Add an element with no description to test
	const testEls = [
		{ id: "X", name: "Test Element", group: "structure", category: "structure" },
	];
	const data = { CATEGORIES: fixtureCats, ELEMENTS: testEls };
	const result = listText("structure", { examples: false }, data);

	// Should be "• Test Element" without a dash
	assert.match(result, /• Test Element\n/);
	assert.ok(!result.includes("• Test Element —"));
});

test("examples are indented beneath their bullet", () => {
	const data = { CATEGORIES: fixtureCats, ELEMENTS: fixtureEls };
	const result = listText("structure", { examples: true }, data);

	// Conflict has an example, should be indented
	assert.match(result, /• Conflict — .*\n    Example: Romeo and Juliet/);
});

const CREDIT = "Descriptions and examples adapted from TV Tropes (tvtropes.org), CC BY-NC-SA 3.0.";
const FOOTNOTE = "† Added for this app — not on the original chart.";

test("exact text: one category, examples on, added element, footnote then credit", () => {
	const els = [
		{ id: "A", name: "Alpha", category: "structure", description: "First.", example: "Ex A" },
		{ id: "B", name: "Beta", category: "structure", added: true, description: "Second." },
	];
	const data = { CATEGORIES: fixtureCats, ELEMENTS: els };
	assert.equal(
		listText("structure", { examples: true }, data),
		`Structure\n• Alpha — First.\n    Example: Ex A\n• Beta † — Second.\n\n${FOOTNOTE}\n${CREDIT}\n`,
	);
});

test("exact text: no added element means a blank line then the credit, no footnote (FR-K3)", () => {
	const els = [{ id: "A", name: "Alpha", category: "structure", description: "First." }];
	const data = { CATEGORIES: fixtureCats, ELEMENTS: els };
	assert.equal(listText("structure", {}, data), `Structure\n• Alpha — First.\n\n${CREDIT}\n`);
});

test("exact text: all categories are separated by exactly one blank line", () => {
	const els = [
		{ id: "A", name: "Alpha", category: "structure", description: "First." },
		{ id: "S", name: "Sigma", category: "setting", description: "Second." },
		{ id: "M", name: "Mu", category: "storymod", description: "Third." },
	];
	const data = { CATEGORIES: fixtureCats, ELEMENTS: els };
	assert.equal(
		listText("all", {}, data),
		`Structure\n• Alpha — First.\n\nSetting, laws, plots\n• Sigma — Second.\n\nStory modifiers\n• Mu — Third.\n\n${CREDIT}\n`,
	);
});

test("poster elements come first in array order, then added elements in array order (ignoring `order` across blocks)", () => {
	const els = [
		{ id: "N1", name: "New one", category: "structure", added: true, order: 0 },
		{ id: "P1", name: "Poster one", category: "structure" },
		{ id: "N2", name: "New two", category: "structure", added: true, order: 0 },
		{ id: "P2", name: "Poster two", category: "structure" },
	];
	const data = { CATEGORIES: fixtureCats, ELEMENTS: els };
	const names = listText("structure", {}, data).split("\n").filter((line) => line.startsWith("•"));
	assert.deepEqual(names, ["• Poster one", "• Poster two", "• New one †", "• New two †"]);
});

test("guard: missing or blank description/example never yields undefined, null, an empty bullet or a bare dash", () => {
	const els = [
		{ id: "A", name: "Alpha", category: "structure", description: "   ", example: "" },
		{ id: "B", name: "Beta", category: "structure", description: undefined, example: null },
		{ id: "C", name: "", category: "structure", description: "Nameless." },
		{ id: "D", name: "Delta", category: "structure" },
	];
	const data = { CATEGORIES: fixtureCats, ELEMENTS: els };
	const originalWarn = console.warn;
	const warnings = [];
	console.warn = (message) => warnings.push(message);
	let text;
	try {
		text = listText("structure", { examples: true }, data);
	} finally {
		console.warn = originalWarn;
	}
	assert.equal(text, `Structure\n• Alpha\n• Beta\n• Delta\n\n${CREDIT}\n`);
	assert.doesNotMatch(text, /undefined|null|• \n|—\s*\n/);
	assert.equal(warnings.length, 1, "the nameless element is reported, not silently dropped");
});

test("guard: the rogue card and elements with no category are never listed", () => {
	const els = [
		{ id: "Rg", name: "Rogue element", category: "structure", rogue: true },
		{ id: "X", name: "Homeless", group: "structure" },
		{ id: "A", name: "Alpha", category: "structure" },
	];
	const data = { CATEGORIES: fixtureCats, ELEMENTS: els };
	assert.equal(listText("all", {}, data).includes("Rogue"), false);
	assert.equal(listText("all", {}, data).includes("Homeless"), false);
});

test("real data: All categories lists all 217 elements exactly once, each under its own category (AC-K1, AC-K3)", () => {
	const text = listText("all", { examples: false });
	assert.equal(text.split("\n").filter((line) => line.startsWith("• ")).length, 217);
	for (const category of REAL_CATEGORIES) {
		const expected = REAL_ELEMENTS.filter((el) => el.category === category.key).map((el) => el.name);
		const block = listText(category.key, {}).split("\n").filter((line) => line.startsWith("• "));
		assert.equal(block.length, expected.length, category.key);
		assert.ok(block[0].startsWith(`• ${expected[0]}`), `${category.key} starts with its first poster element`);
	}
	assert.doesNotMatch(text, /undefined|null/);
});

test("real data: the seven edge tiles sit under their block's category (AC-K3)", () => {
	const inList = (key, id) => {
		const el = REAL_ELEMENTS.find((candidate) => candidate.id === id);
		return listText(key, {}).includes(`• ${el.name}`);
	};
	assert.ok(inList("setting", "Cal"));
	assert.ok(inList("heroes", "5ma"));
	assert.ok(inList("metatropes", "4wl"));
	for (const el of REAL_ELEMENTS.filter((candidate) => candidate.group === "villains2")) {
		assert.ok(inList("villains", el.id), el.id);
	}
});

test("real data: the added Genre elements list in placement order (column 16 then 17), after the poster ones", () => {
	const lines = listText("genre", {}).split("\n").filter((line) => line.endsWith("†") || line.includes(" † — "));
	const addedNames = REAL_ELEMENTS.filter((el) => el.category === "genre" && el.added).map((el) => `• ${el.name} †`);
	assert.deepEqual(lines.map((line) => line.split(" — ")[0]), addedNames);
});
