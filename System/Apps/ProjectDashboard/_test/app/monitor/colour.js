// The colour toggle's two modes (FR-20): `colour = project` (hue by quadrant,
// lightness by project) and `colour = kind` (the five kind colours). Every raw
// value comes from tokens.css (documentation spec, "colours live in exactly one
// file") — this module only reads tokens and does the arithmetic STYLE.md
// describes ("Project colour — generated, not listed"), never invents a value
// of its own.

import { token } from "../shared/dom.js";

const QUADRANT_HUE_TOKEN = Object.freeze({
  Church: "--hue-CH",
  "Personal Productivity": "--hue-PP",
  Teaching: "--hue-TE",
  "Personal Research": "--hue-PR",
});

function numberToken(name) {
  return parseFloat(token(name));
}

/** The golden-angle step, folded into [0, 1) — irrational-angle stepping keeps
 * neighbouring projects from landing near each other in the ramp, the way
 * phyllotaxis spacing avoids repeats without a lookup table to maintain. */
function stepFraction(indexInQuadrant, stepDeg) {
  return ((indexInQuadrant * stepDeg) % 360) / 360;
}

/**
 * A project's fill under `colour = project` (STYLE.md, "Project colour —
 * generated, not listed"): `hsl(hue ± variance, sat ± variance, lo→hi)`, hue
 * and lightness stepped by the golden angle across the quadrant's projects so
 * neighbours differ and no list needs maintaining as projects come and go.
 */
export function projectColour(context, indexInQuadrant) {
  const hueToken = QUADRANT_HUE_TOKEN[context];
  const baseHue = numberToken(hueToken ?? "--hue-CH");
  const hueVariance = numberToken("--hue-variance");
  const satVariance = numberToken("--sat-variance");
  const baseSat = numberToken("--sat");
  const lightLo = numberToken("--light-lo");
  const lightHi = numberToken("--light-hi");
  const stepDeg = numberToken("--hue-step");

  const frac = stepFraction(indexInQuadrant, stepDeg);
  const hue = baseHue + (frac * 2 - 1) * hueVariance;
  const sat = baseSat + (frac * 2 - 1) * satVariance;
  const lightness = lightLo + frac * (lightHi - lightLo);
  return `hsl(${hue.toFixed(1)}deg ${sat.toFixed(1)}% ${lightness.toFixed(1)}%)`;
}

/** A cube's fill under `colour = kind` — the five kind tokens, unmodified. */
export function kindColour(kind) {
  return token(`--k${kind}`);
}
