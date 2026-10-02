/** The "criteria, explained" tab: source line, the live list, and the Retired category. */

import { byRole, el, setBusy, setStatus } from "./dom.js";
import { sourceLine, splitCriteria } from "./logic.js";

const criterionItem = (criterion, level) =>
  el("li", {},
    el(`h${level}`, { class: "criterion-title" }, criterion.title),
    el("p", { class: "criterion-plain" }, criterion.plain || criterion.description),
    criterion.source ? el("span", { class: "criterion-source" }, `From the section “${criterion.source}”`) : "");

export function renderCriteria(root, saved) {
  const { live, retired } = splitCriteria(saved.criteria);
  const scraped = saved.criteria.length > 0;
  byRole(root, "source-line").textContent = sourceLine(saved);
  byRole(root, "criteria-empty").hidden = scraped;
  byRole(root, "criteria-list").replaceChildren(...live.map((criterion) => criterionItem(criterion, 2)));
  byRole(root, "retired-block").hidden = !scraped;
  byRole(root, "retired-empty").hidden = retired.length > 0;
  byRole(root, "retired-list").replaceChildren(...retired.map((criterion) => criterionItem(criterion, 3)));
}

export const setScrapeBusy = (root, busy) => setBusy(byRole(root, "scrape-button"), busy, "Scraping…", "Scrape");

export const setScrapeStatus = (root, text, failed = false) => setStatus(byRole(root, "scrape-status"), text, failed);
