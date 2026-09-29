// The command bar (ARIA combobox), the widget slots and the verse. The app rows arrive already in
// the HTML (routes/page.py renders them); this script only filters, orders, selects and opens.
import { rank } from "./filter.js";
import { mount as mountInbox } from "./slots/inbox.js";
import { mount as mountNews } from "./slots/news.js";
import { mount as mountLarder } from "./panels/larder.js";

const plane = document.getElementById("plane");
const input = document.getElementById("query");
const list = document.getElementById("apps");
const empty = document.getElementById("empty");
const rows = [...list.querySelectorAll("li.row")];
const apps = rows.map(({ dataset: d }) => ({ name: d.app, title: d.title, blurb: d.blurb, context: d.context }));
const GLYPHS = { live: "●", file: "●", stopped: "○", none: "○", build: "◌" };

let shown = rows;
let selected = -1;

const isOpen = () => plane.classList.contains("open");
const choosable = (row) => row.getAttribute("aria-disabled") !== "true";

function select(index) {
  rows.forEach((row) => row.setAttribute("aria-selected", "false"));
  selected = index;
  const row = shown[index];
  if (!row) {
    input.removeAttribute("aria-activedescendant");
    return;
  }
  row.setAttribute("aria-selected", "true");
  input.setAttribute("aria-activedescendant", row.id);
  row.scrollIntoView({ block: "nearest" });
}

function firstChoosable() {
  return shown.findIndex(choosable);
}

function applyFilter() {
  const order = rank(apps, input.value);
  const visible = new Set(order);
  rows.forEach((row, i) => {
    row.hidden = !visible.has(i);
    row.style.order = "";
  });
  order.forEach((appIndex, position) => {
    rows[appIndex].style.order = String(position);
  });
  shown = order.map((i) => rows[i]);
  empty.hidden = shown.length > 0;
  list.scrollTop = 0;
  select(input.value.trim() ? firstChoosable() : -1);
}

async function refreshStates() {
  try {
    const response = await fetch("/apps.json", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const { apps: fresh } = await response.json();
    for (const app of fresh) {
      const row = rows.find((r) => r.dataset.app === app.name);
      if (!row || row.dataset.state === app.state) continue;
      row.classList.replace(row.dataset.state, app.state);
      row.dataset.state = app.state;
      row.querySelector(".glyph").textContent = GLYPHS[app.state];
    }
  } catch {
    // A failed refresh leaves the states as rendered; nothing on screen depends on it succeeding.
  }
}

function open() {
  if (isOpen()) return;
  plane.classList.add("open");
  input.setAttribute("aria-expanded", "true");
  refreshStates();
}

function close() {
  plane.classList.remove("open");
  input.setAttribute("aria-expanded", "false");
  if (input.value) input.value = "";
  applyFilter();
}

// Apps open in a new tab so Home stays put (Luke, 2026-09-29). Called only from a click or a key
// press, so the browser treats window.open as user-initiated and does not block it.
function go(row) {
  if (!row || !choosable(row)) return;
  if (row.dataset.panel) {
    // A hosted panel opens in-page; its onClose hands focus back to the bar (Larder AC-5).
    const panel = panels[row.dataset.panel];
    close();
    if (panel) panel.open();
    else console.warn(`Home: no panel mounted for "${row.dataset.panel}"`);
    return;
  }
  window.open(row.dataset.openUrl, "_blank", "noopener");
  close();
}

function move(step) {
  if (!shown.length) return;
  let index = selected;
  for (let tries = 0; tries < shown.length; tries += 1) {
    index = (index + step + shown.length) % shown.length;
    if (choosable(shown[index])) break;
  }
  select(index);
}

input.addEventListener("click", open);
input.addEventListener("input", () => {
  open();
  applyFilter();
});
input.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      if (!isOpen()) open();
      else move(1);
      break;
    case "ArrowUp":
      event.preventDefault();
      if (isOpen()) move(-1);
      break;
    case "Enter":
      if (isOpen()) {
        event.preventDefault();
        go(shown[selected]);
      }
      break;
    case "Escape":
      close();
      break;
    default:
  }
});
list.addEventListener("click", (event) => {
  const row = event.target.closest("li.row");
  if (!row) return;
  event.preventDefault();
  go(row);
});
document.addEventListener("click", (event) => {
  if (isOpen() && !plane.contains(event.target)) close();
});

async function showVerse() {
  const figure = document.getElementById("verse");
  try {
    const response = await fetch("/api/verse");
    if (!response.ok) return;
    const verse = await response.json();
    if (!verse.text) return;
    figure.querySelector(".verse-text").textContent = `“${verse.text}”`;
    const when = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
    figure.querySelector(".verse-cite").textContent = `${verse.reference} · ${verse.label} · ${when}`;
    figure.querySelector(".verse-notice p").textContent = verse.notice;
    figure.hidden = false;
  } catch {
    // No verse today: the figure stays hidden, which is the designed offline-and-no-BSB outcome.
  }
}

document.getElementById("signout").addEventListener("click", async () => {
  await fetch("/auth/signout", { method: "POST" });
  window.location.reload();
});

// Panels are modal dialogs that handle their own Esc and backdrop; the bar's outside-click handler
// only closes the bar, so the two do not fight.
const panels = { Larder: mountLarder(document.getElementById("panel-host"), { onClose: () => input.focus() }) };
mountInbox(document.querySelector('[data-slot="inbox"]'));
mountNews(document.querySelector('[data-slot="news"]'));
applyFilter();
requestAnimationFrame(() => setTimeout(showVerse, 0));
