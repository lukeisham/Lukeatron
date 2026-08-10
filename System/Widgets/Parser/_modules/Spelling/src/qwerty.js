/**
 * qwerty.js — QWERTY key-adjacency map used to weight substitution/
 * transposition cost in suggest.js's edit-distance scoring (spec §6,
 * `fuzzy-matching.md` §4). ~200 bytes as a plain object per the research.
 */
const QWERTY_NEIGHBOURS = {
  a: ["q", "s", "w"],
  b: ["v", "g", "h", "n"],
  c: ["x", "d", "f", "v"],
  d: ["s", "e", "r", "f", "c", "x"],
  e: ["w", "d", "r"],
  f: ["d", "r", "t", "g", "c", "v"],
  g: ["f", "t", "y", "h", "v", "b"],
  h: ["g", "y", "u", "j", "b", "n"],
  i: ["u", "k", "o"],
  j: ["h", "u", "i", "k", "m", "n"],
  k: ["j", "i", "o", "l", "m"],
  l: ["k", "o", "p"],
  m: ["n", "j", "k"],
  n: ["b", "h", "j", "m"],
  o: ["i", "k", "l", "p"],
  p: ["o", "l"],
  q: ["w", "a"],
  r: ["e", "d", "f", "t"],
  s: ["a", "w", "e", "d", "x", "z"],
  t: ["r", "f", "g", "y"],
  u: ["y", "h", "j", "i"],
  v: ["c", "f", "g", "b"],
  w: ["q", "a", "s", "e"],
  x: ["z", "s", "d", "c"],
  y: ["t", "g", "h", "u"],
  z: ["x", "s", "a"],
};

function areAdjacent(a, b) {
  const neighbours = QWERTY_NEIGHBOURS[a.toLowerCase()];
  return !!neighbours && neighbours.includes(b.toLowerCase());
}

export { QWERTY_NEIGHBOURS, areAdjacent };
