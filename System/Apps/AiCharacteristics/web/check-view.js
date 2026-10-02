/** The "Check text" tab: the paste card, the word count and the results table. */

import { byRole, el, setBusy, setStatus } from "./dom.js";
import { MAX_WORDS, countWords, isCheckable, percent, summarise } from "./logic.js";

const resultRow = (row) => {
  const seen = row.answer === "yes";
  const fill = el("i", { class: "bar-fill" });
  fill.style.width = `${percent(row.confidence)}%`;
  return el("tr", { class: seen ? "result-row seen" : "result-row" },
    el("td", {}, el("details", { class: "result-details" },
      el("summary", { class: "result-summary" }, row.title),
      el("p", { class: "why" }, row.plain))),
    el("td", { class: seen ? "answer" : "answer no" }, seen ? "Yes" : "No"),
    el("td", {}, el("span", { class: seen ? "bar" : "bar no" }, fill), `${percent(row.confidence)}%`));
};

export function renderAvailability(root, liveCount) {
  byRole(root, "check-empty").hidden = liveCount > 0;
  byRole(root, "check-body").hidden = liveCount === 0;
  byRole(root, "check-count").textContent = String(liveCount);
  byRole(root, "results").hidden = true;
}

/** Updates the word count and the Check button for the current text; returns whether it can be checked. */
export function updateWordCount(root, text) {
  const words = countWords(text);
  const label = byRole(root, "word-count");
  label.textContent = `${words} / ${MAX_WORDS} words`;
  label.classList.toggle("over-limit", words > MAX_WORDS);
  const checkable = isCheckable(text);
  byRole(root, "check-button").disabled = !checkable;
  return checkable;
}

export function renderResults(root, rows) {
  const { seen, total } = summarise(rows);
  byRole(root, "summary").replaceChildren(el("b", {}, `${seen} of ${total}`), " criteria seen");
  byRole(root, "results-body").replaceChildren(...rows.map(resultRow));
  byRole(root, "results").hidden = false;
}

export const hideResults = (root) => { byRole(root, "results").hidden = true; };

export const setCheckBusy = (root, busy) => {
  const button = byRole(root, "check-button");
  setBusy(button, busy, "Checking…", "Check text");
  if (!busy) button.disabled = !isCheckable(byRole(root, "check-form").elements.text.value);
};

export const setCheckStatus = (root, text, failed = false) => setStatus(byRole(root, "check-status"), text, failed);
