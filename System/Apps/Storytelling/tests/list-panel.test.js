import test from "node:test";
import assert from "node:assert/strict";
import { mountListPanel } from "../app/lists/list-panel.js";
import { listText } from "../app/lists/list-text.js";
import { CATEGORIES } from "../app/data/elements.js";
import { EVT_OPEN_LISTS } from "../app/shared/events.js";
import { createFakeDocument, findDescendant } from "./helpers/fake-dom-list.js";

/** Records what the panel asked output.js to do; `copyOk` lets a test make the copy fail. */
function createOutputRecorder({ copyOk = true } = {}) {
	const recorder = {
		copiedText: null,
		printCalls: [],
		copyText: async (text) => {
			recorder.copiedText = text;
			return copyOk ? { ok: true } : { ok: false, error: "denied" };
		},
		setPrintTarget: (target, tone) => {
			recorder.printCalls.push([target, tone]);
			return { ok: true };
		},
	};
	return recorder;
}

/** Mounts the REAL panel (real data) into a fake host. */
function setup({ copyOk = true } = {}) {
	const doc = createFakeDocument();
	const host = doc.createElement("aside");
	host.id = "list-panel";
	const output = createOutputRecorder({ copyOk });
	const panel = mountListPanel(host, { doc, output });
	const part = (name) => findDescendant(host, `st-list-panel__${name}`);
	return {
		doc,
		host,
		panel,
		output,
		select: part("category-select"),
		checkbox: part("examples-checkbox"),
		preview: part("preview"),
		printBlock: part("print"),
		status: part("status"),
		copyButton: part("copy-button"),
		printButton: part("print-button"),
		closeButton: part("close-button"),
		openLists: () => doc._dispatch(EVT_OPEN_LISTS, {}),
		pressKey: (key) => doc._dispatch("keydown", { key }),
	};
}

test("mounts hidden with role dialog and the panel class, keeping the host's own attributes", () => {
	const { host, panel } = setup();
	assert.ok(host.hasAttribute("hidden"));
	assert.equal(panel.isOpen(), false);
	assert.equal(host.getAttribute("role"), "dialog");
	assert.ok(host.classList.contains("st-list-panel"));
});

test("chooser lists All categories first, then the twelve in CATEGORIES order", () => {
	const { select } = setup();
	assert.equal(select.children.length, 13);
	assert.deepEqual(
		select.children.map((option) => [option.value, option.textContent]),
		[["all", "All categories"], ...CATEGORIES.map((category) => [category.key, category.label])],
	);
});

test("examples checkbox starts unticked and the first preview is the real all-categories text without examples", () => {
	const { checkbox, preview } = setup();
	assert.equal(checkbox.checked, false);
	assert.equal(preview.textContent, listText("all", { examples: false }));
	assert.equal(preview.hasAttribute("data-print-list"), false);
});

test("opens on EVT_OPEN_LISTS and focuses the category chooser", () => {
	const { host, panel, select, doc, openLists } = setup();
	openLists();
	assert.equal(host.hasAttribute("hidden"), false);
	assert.equal(panel.isOpen(), true);
	assert.equal(doc.activeElement, select);
});

test("changing the category or the checkbox updates the preview at once (FR-K2)", () => {
	const { select, checkbox, preview } = setup();
	select._change("heroes");
	assert.equal(preview.textContent, listText("heroes", { examples: false }));
	checkbox._check();
	assert.equal(preview.textContent, listText("heroes", { examples: true }));
	assert.ok(preview.textContent.includes("Example:"));
	checkbox._check();
	assert.equal(preview.textContent.includes("Example:"), false);
});

test("Copy sends the preview text, character for character, and confirms (FR-K5)", async () => {
	const { select, checkbox, preview, copyButton, output, status } = setup();
	select._change("villains");
	checkbox._check();
	await copyButton._dispatch("click");
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(output.copiedText, preview.textContent);
	assert.equal(output.copiedText, listText("villains", { examples: true }));
	assert.equal(status.textContent, "Copied");
	assert.ok(status.classList.contains("is-shown"));
});

test("guard: a failed copy says so, and the message clears when the preview changes", async () => {
	const { select, copyButton, status } = setup({ copyOk: false });
	copyButton._click();
	await new Promise((resolve) => setImmediate(resolve));
	assert.match(status.textContent, /^Copy failed/);
	select._change("genre");
	assert.equal(status.textContent, "");
	assert.equal(status.classList.contains("is-shown"), false);
});

test("Print asks output.js for the list target in colour, nothing else (FR-K6)", () => {
	const { printButton, output } = setup();
	printButton._click();
	assert.deepEqual(output.printCalls, [["list", "colour"]]);
});

test("Esc closes the panel wherever focus is, and only while it is open", () => {
	const { host, openLists, pressKey, panel } = setup();
	openLists();
	pressKey("Escape");
	assert.equal(panel.isOpen(), false);
	assert.ok(host.hasAttribute("hidden"));
});

test("Close button closes the panel", () => {
	const { openLists, closeButton, panel } = setup();
	openLists();
	closeButton._click();
	assert.equal(panel.isOpen(), false);
});

test("focus returns to the element that had it when the panel opened (FR-V10); the event target is the document, not the button", () => {
	const { doc, openLists, closeButton } = setup();
	const listsButton = doc.createElement("button");
	doc.activeElement = listsButton;
	openLists();
	closeButton._click();
	assert.equal(doc.activeElement, listsButton);
});

test("Safari case: no focused button on open, so focus returns to the toolbar Lists button", () => {
	const { doc, openLists, pressKey } = setup();
	const listsButton = doc.createElement("button");
	doc.toolbarButtons.lists = listsButton;
	assert.equal(doc.activeElement, doc.body);
	openLists();
	pressKey("Escape");
	assert.equal(doc.activeElement, listsButton);
});

test("guard: Esc while closed does nothing and steals no focus", () => {
	const { doc, pressKey } = setup();
	const somewhere = doc.createElement("input");
	doc.activeElement = somewhere;
	pressKey("Escape");
	assert.equal(doc.activeElement, somewhere);
});

test("preview is filled through textContent (never markup)", () => {
	const { preview } = setup();
	assert.ok(preview.textContent.startsWith("Structure\n"));
});

/** Text of one print-block child as the printed page would show it: bullets are their own text plus any example line. */
const bulletTexts = (list) => list.children.map((li) => [li.textContent, ...li.children.map((child) => child.textContent)]);

test("the print block is the data-print-list element and is rebuilt as headings and bullets from the same text", () => {
	const { select, printBlock } = setup();
	assert.equal(printBlock.hasAttribute("data-print-list"), true);
	assert.equal(printBlock.getAttribute("aria-hidden"), "true");
	select._change("heroes");
	const [heading, list, ...closing] = printBlock.children;
	assert.equal(heading.tag, "h2");
	assert.equal(heading.textContent, CATEGORIES.find((category) => category.key === "heroes").label);
	assert.equal(list.tag, "ul");
	const expectedBullets = listText("heroes").split("\n\n")[0].split("\n").slice(1).map((line) => line.slice(2));
	assert.deepEqual(list.children.map((li) => li.textContent), expectedBullets);
	assert.ok(closing.every((node) => node.tag === "p") && closing.length >= 1);
});

test("All categories gives one h2 and one ul per category, in order, then only the closing lines as paragraphs", () => {
	const { printBlock } = setup();
	const headings = printBlock.children.filter((node) => node.tag === "h2").map((node) => node.textContent);
	assert.deepEqual(headings, CATEGORIES.map((category) => category.label));
	assert.equal(printBlock.children.filter((node) => node.tag === "ul").length, CATEGORIES.length);
	const paragraphs = printBlock.children.filter((node) => node.tag === "p").map((node) => node.textContent);
	assert.ok(paragraphs.some((line) => line.includes("TV Tropes")));
});

test("Include examples puts each Example line inside its own bullet, and none appear without it", () => {
	const { select, checkbox, printBlock } = setup();
	select._change("heroes");
	assert.ok(bulletTexts(printBlock.children[1]).every((parts) => parts.length === 1));
	checkbox._check();
	const withExamples = bulletTexts(printBlock.children[1]).filter((parts) => parts.length > 1);
	assert.ok(withExamples.length > 0);
	assert.ok(withExamples.every((parts) => parts[1].startsWith("Example: ")));
});
