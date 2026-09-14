// auto-refresh — smoke tests (TEST-1: node:test + node:assert/strict) for
// wishlist #5. createPoller() takes every real dependency (poll/doc/win) as
// an injectable option, so these tests drive discrete ticks directly rather
// than waiting on a real setInterval/fetch/reload — no fake DOM needed
// beyond a plain object standing in for `document`/`window`.
//
// Run: node tests/test_auto-refresh.mjs

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleUrl = path.join(here, "..", "app", "controls", "auto-refresh.js");
const autoRefresh = await import(moduleUrl);

function fakeWin() {
  let reloadCalls = 0;
  return {
    setInterval: () => 1, // never used directly by tick() — start()/stop() are exercised separately below
    clearInterval: () => {},
    location: {
      reload: () => {
        reloadCalls += 1;
      },
    },
    get reloadCalls() {
      return reloadCalls;
    },
  };
}

function fakeDoc(activeElement = null) {
  return { activeElement };
}

function queue(...values) {
  let i = 0;
  return async () => values[Math.min(i++, values.length - 1)];
}

test("shouldReload: false when the mtime is unchanged", () => {
  assert.equal(autoRefresh.shouldReload(1000, 1000, null), false);
});

test("shouldReload: false when the polled mtime is older or the fetch failed (null)", () => {
  assert.equal(autoRefresh.shouldReload(1000, 500, null), false);
  assert.equal(autoRefresh.shouldReload(1000, null, null), false);
  assert.equal(autoRefresh.shouldReload(null, 1000, null), false);
});

test("shouldReload: true when the mtime advanced and focus isn't in a form control", () => {
  assert.equal(autoRefresh.shouldReload(1000, 2000, null), true);
  assert.equal(autoRefresh.shouldReload(1000, 2000, { tagName: "DIV" }), true);
});

for (const tag of ["INPUT", "TEXTAREA", "SELECT"]) {
  test(`shouldReload: deferred while focus is in a <${tag.toLowerCase()}>`, () => {
    assert.equal(autoRefresh.shouldReload(1000, 2000, { tagName: tag }), false);
  });
}

test("shouldReload: deferred while focus is on a contenteditable element", () => {
  assert.equal(autoRefresh.shouldReload(1000, 2000, { tagName: "DIV", isContentEditable: true }), false);
});

test("createPoller: the first successful tick only establishes the baseline — never reloads on page load", async () => {
  const win = fakeWin();
  const poller = autoRefresh.createPoller({ poll: queue(1000), doc: fakeDoc(), win });
  await poller.tick();
  assert.equal(win.reloadCalls, 0);
});

test("createPoller: no reload across repeated ticks when the mtime never changes", async () => {
  const win = fakeWin();
  const poller = autoRefresh.createPoller({ poll: queue(1000, 1000, 1000), doc: fakeDoc(), win });
  await poller.tick(); // baseline
  await poller.tick();
  await poller.tick();
  assert.equal(win.reloadCalls, 0);
});

test("createPoller: reloads once the mtime changes and focus isn't in a form control", async () => {
  const win = fakeWin();
  const poller = autoRefresh.createPoller({ poll: queue(1000, 2000), doc: fakeDoc(null), win });
  await poller.tick(); // baseline
  await poller.tick(); // sees the change
  assert.equal(win.reloadCalls, 1);
});

test("createPoller: defers (does not reload) while focus is in a form control, then reloads once focus moves on", async () => {
  const win = fakeWin();
  const doc = fakeDoc({ tagName: "INPUT" });
  const poller = autoRefresh.createPoller({ poll: queue(1000, 2000, 2000), doc, win });
  await poller.tick(); // baseline
  await poller.tick(); // change seen, but deferred — focus is in the input
  assert.equal(win.reloadCalls, 0);
  doc.activeElement = null; // focus moves on; the mtime the server reports is still 2000
  await poller.tick();
  assert.equal(win.reloadCalls, 1);
});

test("createPoller: a failed poll (null) this tick never reloads and never disturbs the baseline", async () => {
  const win = fakeWin();
  const poller = autoRefresh.createPoller({ poll: queue(1000, null, 2000), doc: fakeDoc(), win });
  await poller.tick(); // baseline = 1000
  await poller.tick(); // fetch failed — no-op
  assert.equal(win.reloadCalls, 0);
  await poller.tick(); // now sees the real change
  assert.equal(win.reloadCalls, 1);
});

test("createPoller: start() schedules tick() on win.setInterval and stop() clears it", () => {
  const calls = [];
  const win = {
    setInterval: (fn, ms) => {
      calls.push(["set", ms]);
      return 42;
    },
    clearInterval: (id) => calls.push(["clear", id]),
    location: { reload: () => {} },
  };
  const poller = autoRefresh.createPoller({ poll: queue(1000), doc: fakeDoc(), win, intervalMs: 5000 });
  poller.start();
  assert.deepEqual(calls[0], ["set", 5000]);
  poller.stop();
  assert.deepEqual(calls[1], ["clear", 42]);
});
