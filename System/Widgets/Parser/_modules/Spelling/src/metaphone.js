/**
 * metaphone.js — classic (single-key) Metaphone phonetic encoding.
 *
 * Implements Lawrence Philips' 1990 Metaphone algorithm (a public-domain
 * rule set, independently implemented here from the published rule
 * description — no code copied from any licensed implementation). Used to
 * catch irregular spellings ("necessery" -> "necessary") that plain
 * edit-distance misses.
 *
 * IMPORTANT: this file is mirrored rule-for-rule in
 * `build/build_spelling_db.py`'s `metaphone()` function so the phonetic
 * codes computed at dictionary-build time (Python) match the codes computed
 * at suggestion time (this file, in the browser) — they must join on equal
 * strings. If you change a rule here, change it there too;
 * `bench/check_metaphone_parity.mjs` verifies parity against a word sample
 * and must be re-run after any edit to either side.
 */

const VOWELS = new Set(["A", "E", "I", "O", "U"]);
const isVowel = (ch) => VOWELS.has(ch);

/**
 * metaphone(word) -> string
 * Returns the classic Metaphone code for `word` — letters only, uppercase,
 * variable length (not truncated to 4 chars: this module only needs the
 * code for equality matching, not display).
 */
function metaphone(word) {
  if (typeof word !== "string") return "";

  let raw = word.toUpperCase().replace(/[^A-Z]/g, "");
  if (raw.length === 0) return "";

  // Initial-letter drops (rule 2).
  if (/^(KN|GN|PN|AE|WR)/.test(raw)) {
    raw = raw.slice(1);
  } else if (raw[0] === "X") {
    raw = "S" + raw.slice(1);
  } else if (/^WH/.test(raw)) {
    raw = "W" + raw.slice(2);
  }
  if (raw.length === 0) return "";

  // Collapse duplicate adjacent letters, except CC (rule 1).
  let w = raw[0];
  for (let i = 1; i < raw.length; i++) {
    if (raw[i] === raw[i - 1] && raw[i] !== "C") continue;
    w += raw[i];
  }

  const n = w.length;
  let out = "";
  let skip = 0; // number of upcoming characters already consumed by a digraph

  for (let i = 0; i < n; i++) {
    if (skip > 0) {
      skip--;
      continue;
    }
    const c = w[i];
    const prev = i > 0 ? w[i - 1] : "";
    const next = i + 1 < n ? w[i + 1] : "";
    const next2 = i + 2 < n ? w[i + 2] : "";
    const isFirst = i === 0;

    if (isVowel(c)) {
      if (isFirst) out += c; // rule 20
      continue;
    }

    switch (c) {
      case "B":
        if (!(i === n - 1 && prev === "M")) out += "B"; // rule 3
        break;

      case "C":
        if (next === "I" && next2 === "A") {
          out += "X";
        } else if (next === "H") {
          out += prev === "S" ? "" : "X";
          skip = 1;
        } else if (next === "I" || next === "E" || next === "Y") {
          out += "S";
        } else {
          out += "K";
        }
        break;

      case "D":
        if (next === "G" && (next2 === "E" || next2 === "Y" || next2 === "I")) {
          out += "J";
          skip = 1;
        } else {
          out += "T";
        }
        break;

      case "G": {
        if (next === "H") {
          const afterH = i + 2 < n ? w[i + 2] : "";
          if (!isVowel(afterH)) {
            skip = 1; // silent GH
            break;
          }
          out += "K";
          skip = 1;
          break;
        }
        if (next === "N") {
          const rest = w.slice(i + 2);
          if (rest === "" || rest === "ED") {
            skip = rest.length + 1; // silent GN / GNED at end
            break;
          }
        }
        if ((next === "I" || next === "E" || next === "Y") && prev !== "G") {
          out += "J";
        } else {
          out += "K";
        }
        break;
      }

      case "H":
        if (isVowel(prev) && !isVowel(next)) {
          // silent — vowel-H-consonant
        } else if ("CSPTG".includes(prev)) {
          // silent after these (already folded into their own rules mostly)
        } else {
          out += "H";
        }
        break;

      case "K":
        if (prev !== "C") out += "K";
        break;

      case "P":
        if (next === "H") {
          out += "F";
          skip = 1;
        } else {
          out += "P";
        }
        break;

      case "Q":
        out += "K";
        break;

      case "S":
        if (next === "I" && (next2 === "O" || next2 === "A")) {
          out += "X";
        } else if (next === "H") {
          out += "X";
          skip = 1;
        } else {
          out += "S";
        }
        break;

      case "T":
        if (next === "I" && (next2 === "O" || next2 === "A")) {
          out += "X";
        } else if (next === "H") {
          out += "0"; // theta
          skip = 1;
        } else {
          out += "T";
        }
        break;

      case "V":
        out += "F";
        break;

      case "W":
        if (isVowel(next)) out += "W";
        break;

      case "X":
        out += "KS";
        break;

      case "Y":
        if (isVowel(next)) out += "Y";
        break;

      case "Z":
        out += "S";
        break;

      default: // F J L M N R
        out += c;
        break;
    }
  }

  return out;
}

export { metaphone };
