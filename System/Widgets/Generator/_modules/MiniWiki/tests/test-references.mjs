import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMlaReference, formatReferences } from "../src/references.js";

test("references.js imports cleanly and formatMlaReference() renders title + container", () => {
  const text = formatMlaReference({
    title: "Logic — Content Source",
    container: "Exhaustive taxonomy of formal/informal fallacies",
    note: "",
  });
  assert.equal(text, "Logic — Content Source. Exhaustive taxonomy of formal/informal fallacies.");
});

test("happy path: formatReferences() maps an article's references array", () => {
  const article = { references: [{ title: "Rhetoric — Content Source", container: "Compiled catalog", note: "" }] };
  const refs = formatReferences(article);
  assert.equal(refs.length, 1);
  assert.match(refs[0], /^Rhetoric — Content Source\./);
});

test("guard path: an article with no references never fabricates one", () => {
  assert.deepEqual(formatReferences({}), []);
  assert.deepEqual(formatReferences({ references: [] }), []);
});
