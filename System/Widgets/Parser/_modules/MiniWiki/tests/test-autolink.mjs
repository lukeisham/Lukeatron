import { test } from "node:test";
import assert from "node:assert/strict";
import { isExcludedTitle, buildLinkCatalogue, autolinkHtml } from "../src/autolink.js";

test("autolink.js imports cleanly and isExcludedTitle() matches the fit-report blocklist", () => {
  assert.equal(isExcludedTitle("Style"), true);
  assert.equal(isExcludedTitle("Example"), true);
  assert.equal(isExcludedTitle("Twelve"), true);
  assert.equal(isExcludedTitle("Existential Fallacy"), false);
});

test("happy path: buildLinkCatalogue() + autolinkHtml() link a known title once, whole-word", () => {
  const articles = {
    "3.1": { id: "3.1", title: "Affirming the Consequent" },
    "3.2": { id: "3.2", title: "Denying the Antecedent" },
  };
  const catalogue = buildLinkCatalogue(articles);
  const html = "<p>See Affirming the Consequent for details; Affirming the Consequent again.</p>";
  const linked = autolinkHtml(html, catalogue, "3.2");
  const matches = linked.match(/class="wikilink"/g) || [];
  assert.equal(matches.length, 1); // first occurrence only
  assert.match(linked, /data-article-id="3\.1"/);
});

test("guard path: a title collision across two ids excludes BOTH from the catalogue", () => {
  const articles = {
    "a": { id: "a", title: "Ethos" },
    "b": { id: "b", title: "ethos" }, // case-insensitive collision with "a"
  };
  const catalogue = buildLinkCatalogue(articles);
  assert.equal(catalogue.length, 0);
});

test("guard path: an excluded generic title never enters the catalogue", () => {
  const articles = { "5.1": { id: "5.1", title: "One" } };
  const catalogue = buildLinkCatalogue(articles);
  assert.equal(catalogue.length, 0);
});
