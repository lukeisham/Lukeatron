// The command bar's matching and ordering. Mirrors: static/filter.js
// Run: node --test tests/test_filter.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { rank } from "../static/filter.js";

const apps = [
  { name: "Psychometric", title: "Psychometric", blurb: "Practice items, with clue", context: "Teaching" },
  { name: "Riddle", title: "Riddle", blurb: "A riddle, with a clue", context: "Teaching" },
  { name: "Storytelling", title: "Storytelling", blurb: "Story maps", context: "Personal Research" },
  { name: "ProjectDashboard", title: "Project Dashboard", blurb: "Every tracked project", context: "Lukeatron" },
  { name: "LukeatronWiki", title: "LukeatronWiki", blurb: "Long-Term memory", context: "Lukeatron" },
];
const titles = (query) => rank(apps, query).map((i) => apps[i].title);

test("nothing typed keeps every app in context order", () => {
  assert.deepEqual(rank(apps, "  "), [0, 1, 2, 3, 4]);
});

test("name matches come before blurb-only matches (AC-3a)", () => {
  assert.deepEqual(titles("wi"), ["LukeatronWiki", "Psychometric", "Riddle"]);
});

test("three bands: name starts, name contains, blurb only", () => {
  assert.deepEqual(titles("p"), ["Psychometric", "Project Dashboard", "Storytelling"]);
});

test("the folder name still finds an app shown under a display title", () => {
  assert.deepEqual(titles("projectdash"), ["Project Dashboard"]);
});

test("context words match", () => {
  assert.deepEqual(titles("lukeatron"), ["LukeatronWiki", "Project Dashboard"]);
});

test("case-insensitive, and no match gives an empty list", () => {
  assert.deepEqual(titles("STO"), ["Storytelling"]);
  assert.deepEqual(titles("zzz"), []);
});
