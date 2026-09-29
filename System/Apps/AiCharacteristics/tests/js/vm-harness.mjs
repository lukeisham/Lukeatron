// Shared VM-sandbox loader for AiCharacteristics's ENGINE/EXPLAINER tests
// (SR-4 — one loader, not copy-pasted into every test file). Cartridge JS
// is written as `var ENGINE = (function(){...})();` expecting CONFIG/
// CONTENT/console as ambient globals (exactly how the assembled HTML wires
// them in) — vm.createContext gives each test file its own isolated
// global object instead of polluting Node's real global scope.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BUILD_DIR = path.resolve(HERE, "../../cartridge/build");
export const FIXTURES_DIR = path.resolve(HERE, "../fixtures");

export function loadContent() {
  return JSON.parse(fs.readFileSync(path.join(BUILD_DIR, "content.json"), "utf8"));
}

export function loadCartridge(configOverrides = {}) {
  const content = loadContent();
  const sandbox = {
    CONFIG: Object.assign(
      { name: "AI Characteristics", version: "1.0.0", cap: 700, tentativeThreshold: 0.55 },
      configOverrides
    ),
    CONTENT: content,
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(BUILD_DIR, "engine.js"), "utf8"), sandbox, { filename: "engine.js" });
  vm.runInContext(fs.readFileSync(path.join(BUILD_DIR, "explainer.js"), "utf8"), sandbox, { filename: "explainer.js" });
  return sandbox;
}

export function readFixture(name) {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8");
}
