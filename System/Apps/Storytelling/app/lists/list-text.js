import { CATEGORIES, ELEMENTS } from "../data/elements.js";

const ADDED_FOOTNOTE = "† Added for this app — not on the original chart.";
const LIST_CREDIT = "Descriptions and examples adapted from TV Tropes (tvtropes.org), CC BY-NC-SA 3.0.";
const EXAMPLE_INDENT = "    ";

/**
 * Formats storytelling elements for a category (or all categories) as a dot-point list (FR-K3, FR-K4).
 * One pure function feeds the preview, Copy and Print so they cannot disagree (AD-K2).
 *
 * @param {string} categoryKey - A CATEGORIES key, or "all" for all categories
 * @param {{ examples?: boolean }} [options] - `examples` adds each element's example line (default false)
 * @param {{ CATEGORIES: Array<{key: string, label: string}>, ELEMENTS: Array<object> }} [data] - Test fixture; defaults to the real data
 * @returns {string} Formatted list as plain text
 * @throws {Error} when categoryKey is neither "all" nor a known key
 */
export function listText(categoryKey, { examples = false } = {}, data) {
	const { CATEGORIES: allCategories, ELEMENTS: allElements } = data || { CATEGORIES, ELEMENTS };

	const isAll = categoryKey === "all";
	if (!isAll && !allCategories.some((category) => category.key === categoryKey)) {
		throw new Error(`Unknown category key: "${categoryKey}"`);
	}

	const shown = isAll ? allCategories : allCategories.filter((category) => category.key === categoryKey);
	const sections = shown.map((category) => ({ category, elements: elementsInCategory(category.key, allElements) }));

	const body = sections.map(({ category, elements }) => categoryBlock(category, elements, examples)).join("\n\n");
	const hasAdded = sections.some(({ elements }) => elements.some((element) => element.added));

	const closing = hasAdded ? [ADDED_FOOTNOTE, LIST_CREDIT] : [LIST_CREDIT];
	return `${body}\n\n${closing.join("\n")}\n`;
}

/**
 * Elements of one category: poster elements first, then added ones, each in ELEMENTS array order
 * (the array is already in poster reading order, and added elements in placement order, FR-D11).
 * Elements with no name are skipped so the text never holds an empty bullet.
 */
function elementsInCategory(categoryKey, elements) {
	const members = elements.filter((element) => {
		if (element.rogue || element.category !== categoryKey) return false;
		if (typeof element.name !== "string" || element.name.trim() === "") {
			console.warn(`list-text: element "${element.id}" has no name and is left out of the list`);
			return false;
		}
		return true;
	});
	return [...members.filter((element) => !element.added), ...members.filter((element) => element.added)];
}

function categoryBlock(category, elements, examples) {
	return [category.label, ...elements.map((element) => bulletFor(element, examples))].join("\n");
}

function bulletFor(element, examples) {
	const added = element.added ? " †" : "";
	const description = nonEmptyText(element.description);
	const example = nonEmptyText(element.example);

	let bullet = `• ${element.name}${added}`;
	if (description) bullet += ` — ${description}`;
	if (examples && example) bullet += `\n${EXAMPLE_INDENT}Example: ${example}`;
	return bullet;
}

function nonEmptyText(value) {
	return typeof value === "string" && value.trim() !== "" ? value : "";
}
