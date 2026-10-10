import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { escapeHtml } from "../escape-html.js";

const CANONICAL_PATH = fileURLToPath(new URL("../escape-html.js", import.meta.url));
const SYSTEM_DIR = fileURLToPath(new URL("../../../", import.meta.url));
const SKIPPED_DIRS = new Set(["node_modules", ".git", "__pycache__"]);

function findCopies(dir) {
  const copies = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && !SKIPPED_DIRS.has(entry.name)) copies.push(...findCopies(path));
    else if (entry.isFile() && entry.name === "escape-html.js" && path !== CANONICAL_PATH) copies.push(path);
  }
  return copies;
}

test("escapes every character that can break out of text or a quoted attribute", () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
});

test("null and undefined render as empty text, numbers as their digits", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
  assert.equal(escapeHtml(42), "42");
});

test("every app copy matches the canonical file byte for byte", () => {
  const canonical = readFileSync(CANONICAL_PATH, "utf8");
  for (const copy of findCopies(SYSTEM_DIR)) {
    assert.equal(readFileSync(copy, "utf8"), canonical, `${copy} has drifted from System/Tools/web-shared/escape-html.js`);
  }
});
