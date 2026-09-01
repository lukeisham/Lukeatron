// domain-glyph-renderer.js — Render domain glyphs by calling bigidea-list's shared FR-BIB-8 function
// Never computes glyph logic locally (mirrors AD-BI-2)

import { computeGlyphSet } from './bigidea-list.js';
import { resolveDomain } from './domain-resolver.js';

/**
 * Render domain glyphs for a big idea.
 * Calls bigidea-list's shared FR-BIB-8 function (computeGlyphSet).
 *
 * @param {string} bigIdeaId - The big idea.id
 * @param {Array} allBigIdeas - unit.bigIdeas[]
 * @param {Array} allNodes - unit.nodes[] (for domain resolution)
 * @returns {string} HTML string of glyph indicators (SVG or Unicode symbols)
 */
export function renderDomainGlyphs(bigIdeaId, allBigIdeas, allNodes) {
  if (!bigIdeaId || !allBigIdeas || !allNodes) {
    return '';
  }

  try {
    // Call bigidea-list's shared function to get the glyph set
    const glyphSet = computeGlyphSet(bigIdeaId, allNodes, resolveDomain);

    // computeGlyphSet returns a Set<string> of domain values, NOT an object
    // with boolean flags. This used to read glyphSet.skill / .knowledge, which
    // are always undefined on a Set — so no glyph ever rendered, and the
    // catch below meant it failed silently. crib-sheet.js reads the same
    // value correctly via .has()/.size; match it.
    if (!glyphSet || typeof glyphSet.has !== 'function') {
      return '';
    }

    const glyphs = [];

    if (glyphSet.has('skill')) {
      glyphs.push('<span class="glyph-skill" aria-label="Skill" title="Skill">⬟</span>');
    }
    if (glyphSet.has('knowledge')) {
      glyphs.push('<span class="glyph-knowledge" aria-label="Knowledge" title="Knowledge">●</span>');
    }

    return glyphs.join(' ');
  } catch (error) {
    console.error('Error rendering domain glyphs:', error);
    return '';
  }
}

/**
 * Escape HTML special characters (for safe interpolation in innerHTML contexts where permitted)
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, char => map[char]);
}
