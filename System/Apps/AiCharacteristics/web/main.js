/** Wires the page together: loads the saved criteria, switches tabs, runs Scrape and Check. */

import * as api from "./api.js";
import { renderAvailability, renderResults, hideResults, setCheckBusy, setCheckStatus, updateWordCount } from "./check-view.js";
import { renderCriteria, setScrapeBusy, setScrapeStatus } from "./criteria-view.js";
import { byRole } from "./dom.js";
import { joinVerdicts, scrapeFailure, scrapeStatus, sentence, splitCriteria } from "./logic.js";

const root = document.body;
let saved = { criteria: [] };

function selectTab(name) {
  for (const tab of root.querySelectorAll("[data-tab]")) {
    const selected = tab.dataset.tab === name;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  for (const panel of root.querySelectorAll("[data-panel]")) panel.hidden = panel.dataset.panel !== name;
}

function render() {
  renderCriteria(root, saved);
  renderAvailability(root, splitCriteria(saved.criteria).live.length);
}

async function load() {
  try {
    saved = await api.loadCriteria();
  } catch (error) {
    console.warn("Could not load the saved criteria", error);
    setScrapeStatus(root, error.message, true);
  }
  render();
  if (saved.criteria.length === 0) selectTab("criteria");
}

async function runScrape() {
  setScrapeBusy(root, true);
  setScrapeStatus(root, "");
  try {
    const { summary } = await api.scrape();
    saved = await api.loadCriteria();
    render();
    setScrapeStatus(root, scrapeStatus(summary));
  } catch (error) {
    setScrapeStatus(root, scrapeFailure(error.message), true);
  } finally {
    setScrapeBusy(root, false);
  }
}

async function runCheck(event) {
  event.preventDefault();
  const text = byRole(root, "check-form").elements.text.value;
  if (!updateWordCount(root, text)) return;
  setCheckBusy(root, true);
  setCheckStatus(root, "");
  hideResults(root);
  try {
    const { verdicts } = await api.check(text);
    renderResults(root, joinVerdicts(splitCriteria(saved.criteria).live, verdicts));
  } catch (error) {
    setCheckStatus(root, sentence(error.message), true);
  } finally {
    setCheckBusy(root, false);
  }
}

for (const tab of root.querySelectorAll("[data-tab]")) {
  tab.addEventListener("click", () => selectTab(tab.dataset.tab));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const tabs = [...root.querySelectorAll("[data-tab]")];
    const next = tabs[(tabs.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    selectTab(next.dataset.tab);
    next.focus();
  });
}
byRole(root, "scrape-button").addEventListener("click", runScrape);
byRole(root, "check-form").addEventListener("submit", runCheck);
byRole(root, "check-form").elements.text.addEventListener("input", (event) => updateWordCount(root, event.target.value));
load();
