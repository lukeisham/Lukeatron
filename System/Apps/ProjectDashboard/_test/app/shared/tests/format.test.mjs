// Smoke tests for format.js: the depot text cleaning (FR-1h) and stem grouping
// (styleguide FR-0a / monitor FR-6a), tested against the spec's own CH-06
// worked example so a regression here is caught against the case that matters.
// Mirrors: app/shared/format.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { stripMarkdown, groupByStem, effortWeight, kindName } from "../format.js";

test("stripMarkdown: bold and inline code are removed, plain text is untouched", () => {
  assert.equal(
    stripMarkdown("**Keith Foster email bouncing**: check `agentmail.py` logs"),
    "Keith Foster email bouncing: check agentmail.py logs"
  );
  assert.equal(stripMarkdown("plain sentence, nothing to strip"), "plain sentence, nothing to strip");
});

test("groupByStem: CH-06's worked example — eight of twelve share a stem, differing only in the last word", () => {
  const stem = "Find the contact person / procedure to change the church's name with";
  const shared = ["Xero", "City of Port Phillip", "the council", "Glen Eira Council", "ATO", "ABN", "electricity", "FES"];
  const items = [
    ...shared.map((who, i) => ({ id: `s${i}`, text: `${stem} ${who}` })),
    { id: "gmail", text: "Change Gmail labels and separate out email accounts (personal and work)" },
    { id: "roster", text: "Update the roster spreadsheet for next quarter" },
    { id: "keys", text: "Return the spare keys to the office" },
    { id: "minutes", text: "File the AGM minutes" },
  ];
  const groups = groupByStem(items);
  const grouped = groups.find((g) => g.type === "group");
  assert.ok(grouped, "expected one group to form");
  assert.equal(grouped.stem, stem);
  assert.equal(grouped.entries.length, 8);
  assert.deepEqual(
    grouped.entries.map((e) => e.suffix).sort(),
    [...shared].sort()
  );
  const singles = groups.filter((g) => g.type === "single");
  assert.equal(singles.length, 4);
});

test("groupByStem: fewer than three sharing a stem stays ungrouped", () => {
  const items = [
    { id: "a", text: "Email the vestry about the fence" },
    { id: "b", text: "Email the vestry about the roof" },
    { id: "c", text: "Book the hall for Sunday" },
  ];
  const groups = groupByStem(items);
  assert.ok(groups.every((g) => g.type === "single"));
});

test("effortWeight: heaviest ranks above lightest, and no-next-action ranks below both", () => {
  assert.ok(effortWeight("🏔️ a session") > effortWeight("🔨 an hour"));
  assert.ok(effortWeight("🔨 an hour") > effortWeight("⚡ minutes"));
  assert.ok(effortWeight(undefined) < effortWeight("⚡ minutes"));
});

test("kindName: the five stated names, verbatim from the glossary", () => {
  assert.equal(kindName(1), "waiting");
  assert.equal(kindName(3), "mine");
  assert.equal(kindName(4), "hand-over");
});
