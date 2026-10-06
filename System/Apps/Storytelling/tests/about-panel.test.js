import assert from "node:assert/strict";
import { test } from "node:test";
import { EVT_OPEN_ABOUT } from "../app/shared/events.js";
import { mountAboutPanel } from "../app/detail/about-panel.js";
import { APP_VERSION } from "../app/data/version.js";
import { createFakeDocument } from "./helpers/fake-dom-about.js";

const FAKE_ABOUT = {
  appName: "Test App",
  versionLabel: "Version",
  statements: [
    { id: "one", text: "First statement" },
    { id: "two", text: "Second statement" },
    { id: "three", text: "Third statement" },
    { id: "four", text: "Fourth statement" },
  ],
};

function setup(extra = {}) {
  const doc = createFakeDocument();
  const host = doc.createElement("aside");
  const panel = mountAboutPanel(host, {
    doc,
    about: FAKE_ABOUT,
    version: "1.0.0",
    ...extra,
  });
  const open = () => doc.dispatchEvent({ type: EVT_OPEN_ABOUT });
  const keyDown = (key) => doc.dispatchEvent({ type: "keydown", key });
  return { doc, host, panel, open, keyDown };
}

test("starts hidden", () => {
  const { host } = setup();
  const panelEl = host.find("st-about");
  assert.equal(panelEl.hidden, true);
});

test("opens on EVT_OPEN_ABOUT event", () => {
  const { host, panel, open } = setup();
  const panelEl = host.find("st-about");
  open();
  assert.equal(panelEl.hidden, false);
  assert.equal(panel.isOpen(), true);
});

test("shows app name in heading", () => {
  const { host, open } = setup();
  open();
  const name = host.find("st-about__name");
  assert.equal(name.textContent, "Test App");
});

test("shows version in correct format", () => {
  const { host, open } = setup();
  open();
  const version = host.find("st-about__version");
  assert.equal(version.textContent, "Version 1.0.0");
});

test("shows all four statements", () => {
  const { host, open } = setup();
  open();
  const statements = host.find("st-about__statements").children;
  assert.equal(statements.length, 4);
  assert.equal(statements[0].textContent, "First statement");
  assert.equal(statements[1].textContent, "Second statement");
  assert.equal(statements[2].textContent, "Third statement");
  assert.equal(statements[3].textContent, "Fourth statement");
});

test("closes on Escape key when open", () => {
  const { host, panel, open, keyDown } = setup();
  const panelEl = host.find("st-about");
  open();
  assert.equal(panelEl.hidden, false);
  keyDown("Escape");
  assert.equal(panelEl.hidden, true);
  assert.equal(panel.isOpen(), false);
});

test("Close button closes the panel", () => {
  const { host, panel, open } = setup();
  const panelEl = host.find("st-about");
  open();
  assert.equal(panelEl.hidden, false);
  const closeBtn = host.find("st-about__close");
  const handlers = closeBtn.listeners.click || [];
  for (const handler of handlers) handler({});
  assert.equal(panelEl.hidden, true);
  assert.equal(panel.isOpen(), false);
});

test("uses APP_VERSION from version.js when version option not supplied", () => {
  const { host, open } = setup({ version: undefined });
  open();
  // Explicitly pass APP_VERSION in setup won't work as expected in mount, so test with explicit version
  const panel2 = createFakeDocument();
  const host2 = panel2.createElement("aside");
  const mnt = mountAboutPanel(host2, { doc: panel2, about: FAKE_ABOUT });
  panel2.dispatchEvent({ type: EVT_OPEN_ABOUT });
  const versionEl = host2.find("st-about__version");
  assert.ok(versionEl.textContent.includes(APP_VERSION));
});

test("version text matches APP_VERSION export", () => {
  const { host, open } = setup({ version: APP_VERSION });
  open();
  const version = host.find("st-about__version");
  assert.ok(version.textContent.includes(APP_VERSION));
});

test("opening moves focus to Close; closing returns it to the element that had focus (viewport-detail FR-V10)", () => {
  const { doc, host, open, keyDown } = setup();
  const aboutButton = doc.createElement("button");
  doc.activeElement = aboutButton;
  open();
  assert.equal(doc.activeElement, host.find("st-about__close"));
  keyDown("Escape");
  assert.equal(doc.activeElement, aboutButton);
});

test("Close button also returns focus to the opener", () => {
  const { doc, host, open } = setup();
  const aboutButton = doc.createElement("button");
  doc.activeElement = aboutButton;
  open();
  for (const handler of host.find("st-about__close").listeners.click) handler({});
  assert.equal(doc.activeElement, aboutButton);
});

test("Safari case: a clicked button holds no focus, so focus returns to the toolbar About button", () => {
  const { doc, open, keyDown } = setup();
  const aboutButton = doc.createElement("button");
  doc.toolbarButtons.about = aboutButton;
  assert.equal(doc.activeElement, doc.body);
  open();
  keyDown("Escape");
  assert.equal(doc.activeElement, aboutButton);
});

test("guard: Escape while closed does nothing and steals no focus", () => {
  const { doc, keyDown } = setup();
  const somewhere = doc.createElement("input");
  doc.activeElement = somewhere;
  keyDown("Escape");
  assert.equal(doc.activeElement, somewhere);
});

test("real wording (FR-X7): app name and version, then exactly the three statements, licenceNotes not shown", () => {
  const doc = createFakeDocument();
  const host = doc.createElement("aside");
  mountAboutPanel(host, { doc });
  doc.dispatchEvent({ type: EVT_OPEN_ABOUT });
  const statements = host.find("st-about__statements").children;
  assert.equal(host.find("st-about__name").textContent, "Storytelling");
  assert.equal(host.find("st-about__version").textContent, `Version ${APP_VERSION}`);
  assert.deepEqual(
    statements.map((paragraph) => paragraph.textContent),
    [
      "Poster chart: The Periodic Table of Storytelling by ComputerSherpa, via TV Tropes — this app re-draws it, re-arranges it and adds 36 elements",
      "Descriptions and examples adapted from TV Tropes (tvtropes.org), licensed CC BY-NC-SA 3.0 — for personal, non-commercial sharing; not affiliated with TV Tropes",
      "Everything stays on your device — nothing is sent anywhere; stories are saved in this browser only",
    ],
  );
});

test("the poster's attribution lines show in the About panel, after the statements", () => {
  const doc = createFakeDocument();
  const host = doc.createElement("aside");
  mountAboutPanel(host, { doc });
  const lines = host.find("st-about__credits").children.map((paragraph) => paragraph.textContent);
  assert.equal(lines.length, 4);
  assert.equal(lines[0], "Chart by ComputerSherpa");
  assert.equal(lines[3], "Permalink for this chart: goo.gl/yvSM4");
});

test("the poster title is set in <em> as furniture.js asks, using text nodes only", () => {
  const doc = createFakeDocument();
  const host = doc.createElement("aside");
  mountAboutPanel(host, { doc });
  const first = host.find("st-about__statements").children[0];
  const em = first.children.find((child) => typeof child !== "string");
  assert.equal(em.tagName, "EM");
  assert.equal(em.textContent, "The Periodic Table of Storytelling");
});

test("version.js exports a semantic APP_VERSION", () => {
  assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/);
});

test("the host itself is shown and hidden (index.html hands it over hidden), and it takes the panel class and dialog role", () => {
  const doc = createFakeDocument();
  const host = doc.createElement("div");
  host.hidden = true;
  mountAboutPanel(host, { doc, about: FAKE_ABOUT, version: "1.0.0" });
  assert.equal(host.hidden, true);
  assert.equal(host.getAttribute("role"), "dialog");
  assert.ok(host.classes.has("st-about"));
  doc.dispatchEvent({ type: EVT_OPEN_ABOUT });
  assert.equal(host.hidden, false, "the outer element becomes visible, not just an inner wrapper");
});
