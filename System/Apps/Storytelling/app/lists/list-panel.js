import { CATEGORIES } from "../data/elements.js";
import { listText } from "./list-text.js";
import { EVT_OPEN_LISTS } from "../shared/events.js";
import { copyText, setPrintTarget } from "../shared/output.js";

const LISTS_BUTTON_SELECTOR = '[data-action="lists"]';
const COPY_DONE_TEXT = "Copied";
const COPY_FAILED_TEXT = "Copy failed — select the text above and copy it by hand";

/**
 * Mounts the Lists panel: category chooser, Include examples checkbox,
 * live read-only preview, Copy, Print and Close. Opens on EVT_OPEN_LISTS, closes on Esc or Close,
 * and returns focus to the toolbar Lists button.
 *
 * @param {HTMLElement} host the `#list-panel` element; the panel is built inside it and hidden with `hidden`
 * @param {{ doc?: Document, output?: { copyText: Function, setPrintTarget: Function } }} [options] test overrides
 * @returns {{ open: () => void, close: () => void, isOpen: () => boolean }}
 */
export function mountListPanel(host, { doc, output } = {}) {
	const document = doc || globalThis.document;
	const outputApi = output || { copyText, setPrintTarget };

	let selectedCategory = "all";
	let includeExamples = false;
	let opener = null;

	host.classList.add("st-list-panel");
	host.setAttribute("role", "dialog");
	host.setAttribute("aria-label", "Lists");
	host.setAttribute("hidden", "");

	const categorySelect = document.createElement("select");
	categorySelect.className = "st-list-panel__category-select";
	categorySelect.id = "list-panel-category";
	for (const { value, label } of [{ value: "all", label: "All categories" }, ...CATEGORIES.map(({ key, label }) => ({ value: key, label }))]) {
		const option = document.createElement("option");
		option.value = value;
		option.textContent = label;
		categorySelect.appendChild(option);
	}

	const categoryLabel = document.createElement("label");
	categoryLabel.className = "st-list-panel__category-label";
	categoryLabel.htmlFor = "list-panel-category";
	categoryLabel.textContent = "Category: ";
	categoryLabel.appendChild(categorySelect);

	const examplesCheckbox = document.createElement("input");
	examplesCheckbox.type = "checkbox";
	examplesCheckbox.className = "st-list-panel__examples-checkbox";
	examplesCheckbox.id = "list-panel-examples";
	examplesCheckbox.checked = false;

	const examplesLabel = document.createElement("label");
	examplesLabel.className = "st-list-panel__examples-label";
	examplesLabel.htmlFor = "list-panel-examples";
	examplesLabel.textContent = "Include examples";
	examplesLabel.prepend(examplesCheckbox);

	// Focusable so a keyboard user can scroll a long list. It is the Copy source and the on-screen view only; print uses `printBlock`.
	const preview = document.createElement("pre");
	preview.className = "st-list-panel__preview";
	preview.setAttribute("tabindex", "0");
	preview.setAttribute("aria-label", "List preview");

	// Print-only twin of the preview: real headings and bullets so print.css can start each category on a new page.
	const printBlock = document.createElement("div");
	printBlock.className = "st-list-panel__print";
	printBlock.setAttribute("data-print-list", "");
	printBlock.setAttribute("aria-hidden", "true");

	const status = document.createElement("p");
	status.className = "st-list-panel__status";
	status.setAttribute("role", "status");

	const buttons = document.createElement("div");
	buttons.className = "st-list-panel__buttons";
	const copyButton = makeListPanelButton(document, "copy-button", "Copy");
	const printButton = makeListPanelButton(document, "print-button", "Print");
	const closeButton = makeListPanelButton(document, "close-button", "Close");
	buttons.appendChild(copyButton);
	buttons.appendChild(printButton);
	buttons.appendChild(closeButton);

	host.appendChild(categoryLabel);
	host.appendChild(examplesLabel);
	host.appendChild(preview);
	host.appendChild(printBlock);
	host.appendChild(status);
	host.appendChild(buttons);

	function isOpen() {
		return !host.hasAttribute("hidden");
	}

	function showStatus(text) {
		status.textContent = text;
		status.classList.toggle("is-shown", text !== "");
	}

	function updatePreview() {
		const text = listText(selectedCategory, { examples: includeExamples });
		preview.textContent = text;
		printBlock.replaceChildren(...structuredListNodes(document, text));
		showStatus("");
	}

	async function handleCopy() {
		const result = await outputApi.copyText(preview.textContent);
		showStatus(result && result.ok ? COPY_DONE_TEXT : COPY_FAILED_TEXT);
	}

	// The toolbar announces on `document`, so the event's target is never the button: remember what
	// had focus, and fall back to the toolbar button where the browser gives a clicked button none (Safari).
	function rememberOpener() {
		const active = document.activeElement;
		const isRealFocus = active && active !== document.body && typeof active.focus === "function";
		opener = isRealFocus ? active : document.querySelector(LISTS_BUTTON_SELECTOR);
	}

	function open() {
		rememberOpener();
		host.removeAttribute("hidden");
		updatePreview();
		categorySelect.focus();
	}

	function close() {
		if (!isOpen()) return;
		host.setAttribute("hidden", "");
		if (opener && typeof opener.focus === "function") opener.focus();
		else console.warn("list-panel: no element to return focus to after closing");
		opener = null;
	}

	categorySelect.addEventListener("change", () => {
		selectedCategory = categorySelect.value;
		updatePreview();
	});
	examplesCheckbox.addEventListener("change", () => {
		includeExamples = examplesCheckbox.checked;
		updatePreview();
	});
	copyButton.addEventListener("click", handleCopy);
	printButton.addEventListener("click", () => outputApi.setPrintTarget("list", "colour"));
	closeButton.addEventListener("click", close);
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && isOpen()) close();
	});
	document.addEventListener(EVT_OPEN_LISTS, open);

	updatePreview();

	return { open, close, isOpen };
}

function makeListPanelButton(document, part, label) {
	const button = document.createElement("button");
	button.className = `st-list-panel__button st-list-panel__${part}`;
	button.type = "button";
	button.textContent = label;
	return button;
}

const BULLET_PREFIX = "• ";
const EXAMPLE_INDENT_PATTERN = /^\s+/;

/**
 * Rebuilds `listText` output as print markup, so the printed list and the preview cannot disagree.
 * The text is blank-line-separated blocks: category blocks (heading line, then bullet lines, each bullet optionally
 * followed by an indented Example line), and one closing block of footnote and credit lines, which is the last block.
 * Returns `h2` + `ul` per category and a `p` per closing line.
 */
function structuredListNodes(document, text) {
	const blocks = text.trim().split("\n\n");
	const closingBlock = blocks.pop();
	const nodes = [];
	for (const block of blocks) nodes.push(...categoryNodes(document, block.split("\n")));
	for (const line of closingBlock.split("\n")) nodes.push(textNode(document, "p", line));
	return nodes;
}

function categoryNodes(document, lines) {
	const [heading, ...bulletLines] = lines;
	const list = document.createElement("ul");
	for (const line of bulletLines) {
		if (line.startsWith(BULLET_PREFIX)) {
			list.appendChild(textNode(document, "li", line.slice(BULLET_PREFIX.length)));
		} else if (EXAMPLE_INDENT_PATTERN.test(line) && list.lastChild) {
			list.lastChild.appendChild(textNode(document, "div", line.trim()));
		} else {
			console.warn(`list-panel: unexpected line in the list text, left out of the printed list: "${line}"`);
		}
	}
	return [textNode(document, "h2", heading), list];
}

function textNode(document, tag, text) {
	const node = document.createElement(tag);
	node.textContent = text;
	return node;
}
