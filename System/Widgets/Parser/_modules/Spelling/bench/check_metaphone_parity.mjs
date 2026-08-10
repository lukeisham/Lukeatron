// check_metaphone_parity.mjs — verifies src/metaphone.js and build/metaphone.py
// produce IDENTICAL codes on a word sample. Run after editing either file:
//   node bench/check_metaphone_parity.mjs <path-to-python-codes.json>
// The companion `dump_metaphone_py.py` produces that JSON from the same word list.
import { readFileSync } from "node:fs";
import { metaphone } from "../src/metaphone.js";

const wordsPath = process.argv[2];
const pyCodesPath = process.argv[3];
if (!wordsPath || !pyCodesPath) {
  console.error("usage: node check_metaphone_parity.mjs <words.json> <py-codes.json>");
  process.exit(1);
}

const words = JSON.parse(readFileSync(wordsPath, "utf8"));
const pyCodes = JSON.parse(readFileSync(pyCodesPath, "utf8"));

let mismatches = 0;
for (const w of words) {
  const jsCode = metaphone(w);
  const pyCode = pyCodes[w];
  if (jsCode !== pyCode) {
    mismatches++;
    if (mismatches <= 20) {
      console.log(`MISMATCH ${w}: js="${jsCode}" py="${pyCode}"`);
    }
  }
}

console.log(`Checked ${words.length} words, ${mismatches} mismatches.`);
process.exit(mismatches > 0 ? 1 : 0);
