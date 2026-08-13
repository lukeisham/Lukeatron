import { test } from "node:test";
import assert from "node:assert/strict";
import { copyToClipboard, legacyCopy } from "../src/clipboard.js";

function fakeDoc(execResult) {
  const elements = [];
  const body = {
    appendChild: (el) => elements.push(el),
    removeChild: (el) => elements.splice(elements.indexOf(el), 1),
  };
  return {
    body,
    execCommand: () => execResult,
    createElement: () => ({
      setAttribute() {},
      select() {},
      style: {},
    }),
  };
}

test("clipboard.js imports cleanly and copyToClipboard() resolves true via navigator.clipboard", async () => {
  // globalThis.navigator is a getter-only accessor in modern Node — a plain
  // assignment throws. Redefine the property instead, then restore it.
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    value: { clipboard: { writeText: async () => {} } },
    configurable: true,
  });
  try {
    const ok = await copyToClipboard("hello", fakeDoc(true));
    assert.equal(ok, true);
  } finally {
    if (originalDescriptor) Object.defineProperty(globalThis, "navigator", originalDescriptor);
  }
});

test("happy path: legacyCopy() uses document.execCommand when clipboard API is absent", () => {
  assert.equal(legacyCopy("hello", fakeDoc(true)), true);
});

test("guard path: legacyCopy() returns false, never throws, when execCommand fails", () => {
  assert.equal(legacyCopy("hello", fakeDoc(false)), false);
  assert.equal(legacyCopy("hello", null), false);
});
