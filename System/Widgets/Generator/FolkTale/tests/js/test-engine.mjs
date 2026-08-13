// Smoke tests for FolkTale's present-mode ENGINE (TEST-1/TEST-2/TEST-9 —
// stdlib node:test, three things per module, imports the real engine.js).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.resolve(HERE, "../../cartridge/build");

// engine.js references the shell-injected globals CONTENT/CONFIG; give it
// minimal stand-ins before require() runs the IIFE (mirrors how the
// assembled HTML defines these globals ahead of ENGINE_JS).
const pool = JSON.parse(readFileSync(path.join(BUILD_DIR, "pool.json"), "utf8"));
global.CONTENT = pool;
global.CONFIG = {
  clausePalette: [
    { h100: "#9FE1CB", h800: "#085041" },
    { h100: "#FAC775", h800: "#633806" },
    { h100: "#F3B8AB", h800: "#7A2C1C" },
  ],
};

const ENGINE = require(path.join(BUILD_DIR, "engine.js"));

test("imports cleanly and exposes the present-mode contract", () => {
  assert.equal(typeof ENGINE.getPool, "function");
  assert.equal(typeof ENGINE.render, "function");
});

test("getPool returns the full 40-tale pool, each item id-unique", () => {
  // 2026-08-13 (Luke's instruction): Turkey/Middle East (4) removed, Persia
  // (Pre-Islamic) (3), American Gothic (3), and Australian Gothic (2) added.
  const items = ENGINE.getPool();
  assert.equal(items.length, 40);
  const ids = new Set(items.map((it) => it.id));
  assert.equal(ids.size, 40);
});

test("render() highlights three distinct beats with a legend and plain canonicalText", () => {
  const item = pool["aesop-001"];
  const result = ENGINE.render(item);
  assert.match(result.html, /ft-legend/);
  assert.match(result.html, /data-beat="setup"/);
  assert.match(result.html, /data-beat="twist"/);
  assert.match(result.html, /data-beat="result"/);
  assert.equal(result.canonicalText, item.tale);
});

test("guard path: an item with no stored spans falls back to the cue detector, not a crash", () => {
  const bare = {
    id: "unseen-001",
    title: "An Unseen Tale",
    tale: "Once upon a time there lived a poor woodcutter. But one day a stranger appeared and demanded his last coin. So the woodcutter learned to guard his trust and lived carefully ever after.",
  };
  const result = ENGINE.render(bare);
  assert.match(result.html, /ft-beat/);
  assert.equal(result.canonicalText, bare.tale);
});
