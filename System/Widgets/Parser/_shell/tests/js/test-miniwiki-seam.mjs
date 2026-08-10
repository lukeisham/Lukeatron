// test-miniwiki-seam.mjs — coverage for _shell/src/miniwiki-seam.js, which
// (per Luke's correction) opens MiniWiki as its OWN standalone document in
// a new browser tab rather than an in-page panel. Runs the REAL, unmodified
// source via node:vm against mocked globals (window.open, Blob, URL,
// document.write) — not a re-typed copy (TEST-9).
//
// Covers: document-string builder produces a complete document with no
// unreplaced placeholders; the preferred Blob+createObjectURL path; the
// document.write fallback when Blob is unavailable; the popup-blocked path
// returning false (never throwing) so the caller can surface a message.

import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEAM_SRC = fs.readFileSync(path.join(__dirname, "..", "..", "src", "miniwiki-seam.js"), "utf-8");

const SAMPLE_BUNDLE_SRC = "window.createMiniWikiModule = function(opts){ return { mount: function(){} }; };";
const SAMPLE_ARTICLES = [
  { id: "1", title: "Alpha", level: 1, role: "article", lead: "Alpha lead.", body_html: "<p>Alpha body.</p>", parent: null, children: [], siblings: [] },
];

function fakeWindow(openResult) {
  const calls = [];
  return {
    calls,
    open(url, target) {
      calls.push({ url, target });
      return typeof openResult === "function" ? openResult(url, target) : openResult;
    },
  };
}

function makeSandbox({ bundleSrc = SAMPLE_BUNDLE_SRC, articles = SAMPLE_ARTICLES, cartridgeName = "Test Wiki", windowOpen = () => ({ addEventListener() {} }), blob = true } = {}) {
  const sandbox = {
    MINIWIKI_BUNDLE_SRC: bundleSrc,
    MINIWIKI_ARTICLES: articles,
    MINIWIKI_CARTRIDGE_NAME: cartridgeName,
    console,
    JSON,
    String,
    setTimeout,
  };
  sandbox.window = { open: windowOpen };
  if (blob) {
    sandbox.Blob = function (parts) {
      this.parts = parts;
    };
    sandbox.URL = {
      createObjectURL(b) {
        return "blob:fake-url";
      },
      revokeObjectURL() {},
    };
  }
  vm.createContext(sandbox);
  vm.runInContext(SEAM_SRC, sandbox, { filename: "miniwiki-seam.js" });
  return sandbox;
}

test("isAvailable(): false when MINIWIKI_BUNDLE_SRC is empty (miniwiki.enabled absent, DEFAULT OFF)", () => {
  const sandbox = makeSandbox({ bundleSrc: "" });
  assert.equal(sandbox.MiniWikiSeam.isAvailable(), false);
});

test("isAvailable(): false when MINIWIKI_ARTICLES is empty even if the bundle is present", () => {
  const sandbox = makeSandbox({ articles: [] });
  assert.equal(sandbox.MiniWikiSeam.isAvailable(), false);
});

test("isAvailable(): true when both the bundle source and articles are populated", () => {
  const sandbox = makeSandbox();
  assert.equal(sandbox.MiniWikiSeam.isAvailable(), true);
});

test("open() via Blob path: calls window.open with a blob: URL and returns true", () => {
  const win = fakeWindow((url) => ({ url, addEventListener() {} }));
  const sandbox = makeSandbox({ windowOpen: win.open });
  const ok = sandbox.MiniWikiSeam.open();
  assert.equal(ok, true);
  assert.equal(win.calls.length, 1);
  assert.equal(win.calls[0].url, "blob:fake-url");
  assert.equal(win.calls[0].target, "_blank");
});

test("open() falls back to document.write when Blob/URL.createObjectURL is unavailable", () => {
  let written = null;
  const fakeDoc = {
    open() {},
    write(html) { written = html; },
    close() {},
  };
  const win = fakeWindow(() => ({ document: fakeDoc }));
  const sandbox = makeSandbox({ blob: false, windowOpen: win.open });
  const ok = sandbox.MiniWikiSeam.open();
  assert.equal(ok, true);
  assert.equal(win.calls.length, 1);
  assert.equal(win.calls[0].url, ""); // window.open("", "_blank") -- the fallback signature
  assert.ok(written, "expected document.write() to have been called with the standalone document");
  assert.ok(written.startsWith("<!DOCTYPE html>"), "expected a complete document, not a fragment");
});

test("open(): popup-blocked (window.open returns null/undefined) surfaces as false, never throws", () => {
  const sandbox = makeSandbox({ windowOpen: () => null });
  let ok;
  assert.doesNotThrow(() => {
    ok = sandbox.MiniWikiSeam.open();
  });
  assert.equal(ok, false);
});

test("open(): unavailable module (bundle absent) returns false without calling window.open at all", () => {
  const win = fakeWindow(() => ({ addEventListener() {} }));
  const sandbox = makeSandbox({ bundleSrc: "", windowOpen: win.open });
  const ok = sandbox.MiniWikiSeam.open();
  assert.equal(ok, false);
  assert.equal(win.calls.length, 0);
});

test("the built standalone document has no unreplaced placeholders and inlines the bundle + articles JSON", () => {
  let written = null;
  const fakeDoc = { open() {}, write(html) { written = html; }, close() {} };
  const win = fakeWindow(() => ({ document: fakeDoc }));
  const sandbox = makeSandbox({ blob: false, windowOpen: win.open });
  sandbox.MiniWikiSeam.open();

  assert.ok(written.includes("<!DOCTYPE html>"));
  assert.ok(written.includes("<html"));
  assert.ok(written.includes("</html>"));
  assert.ok(written.includes(SAMPLE_BUNDLE_SRC), "expected the bundle source inlined verbatim");
  assert.ok(written.includes('"title":"Alpha"'), "expected the articles JSON embedded");
  assert.ok(written.includes("Test Wiki"), "expected the cartridge name embedded");
  assert.ok(written.includes("createMiniWikiModule("), "expected the bootstrap script to call the factory");
  assert.ok(written.includes('id="miniwiki-nav"') || written.includes('id="mw-nav"'), "expected a nav mount point");
  // No leftover build-time placeholder syntax escaped into the runtime doc.
  assert.equal((written.match(/__[A-Z_]+__/g) || []).length, 0);
});

test("the built document is independent: it wires its own hash-agnostic mount call, not the parser page's DOM", () => {
  let written = null;
  const fakeDoc = { open() {}, write(html) { written = html; }, close() {} };
  const win = fakeWindow(() => ({ document: fakeDoc }));
  const sandbox = makeSandbox({ blob: false, windowOpen: win.open });
  sandbox.MiniWikiSeam.open();
  assert.ok(written.includes("document.getElementById"), "expected the bootstrap to look up ITS OWN document's mount points");
  assert.ok(!written.includes("__MINIWIKI"), "no shell-build placeholder text should leak into the runtime document");
});
