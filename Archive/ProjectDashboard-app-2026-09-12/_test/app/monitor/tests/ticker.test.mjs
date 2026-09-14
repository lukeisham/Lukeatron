// ticker.js — smoke tests (TEST-1, TEST-2, TEST-8: fake DOM, not jsdom).
// Run: node app/monitor/tests/ticker.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { installFakeDom, FakeNode } from "./fake-dom.mjs";

installFakeDom({ "--tick-rest-below": "8" });

const here = path.dirname(fileURLToPath(import.meta.url));
const { renderTicker } = await import(path.join(here, "..", "ticker.js"));

function depotJob(kind, task, source) {
  return { kind, task, source };
}

test("ticker: imports cleanly and splits the depot into the two lanes at rest", () => {
  const container = new FakeNode("div");
  const board = {
    depot: [depotJob(3, "Bookkeeping — pay invoice", "PP-01"), depotJob(4, "Draft reply", "CH-02"), depotJob(4, "File receipt", "CH-02")],
  };

  renderTicker(container, board);

  const root = container.children[0];
  assert.equal(root.className, "depot-ticker");
  const [lukeLane, agentLane] = root.children;
  assert.equal(lukeLane.className, "ticker-lane ticker-lane-left");
  assert.equal(agentLane.className, "ticker-lane ticker-lane-right");
  assert.equal(lukeLane.children[0].textContent, "1 yours");
  assert.equal(agentLane.children[0].textContent, "2 an agent can take");
  // At rest (below --tick-rest-below): the track is not doubled (FR-1i).
  const track = agentLane.children[1].children[0];
  assert.ok(!track.className.includes("ticker-track-rolling"));
  assert.equal(track.children.length, 2);
});

test("ticker: a lane at or above the rest threshold rolls, doubling its chips (FR-1i)", () => {
  const container = new FakeNode("div");
  const jobs = Array.from({ length: 8 }, (_, i) => depotJob(3, `Job ${i}`));
  renderTicker(container, { depot: jobs });

  const [lukeLane] = container.children[0].children;
  const track = lukeLane.children[1].children[0];
  assert.ok(track.className.includes("ticker-track-rolling"));
  assert.equal(track.children.length, jobs.length * 2);
});

test("ticker: opening a chip shows its job detail, stripped of markdown", () => {
  const container = new FakeNode("div");
  renderTicker(container, { depot: [depotJob(3, "**Call** `James`", "PP-03")] });

  const [lukeLane] = container.children[0].children;
  const detail = container.children[0].children[2];
  assert.equal(detail.hidden, true);

  const chip = lukeLane.children[1].children[0].children[0];
  chip.dispatch("click");

  assert.equal(detail.hidden, false);
  const [strong, p, source] = detail.children[0].children;
  assert.equal(strong.textContent, "mine");
  assert.equal(p.textContent, "Call James");
  assert.equal(source.textContent, "Source: PP-03");
});
