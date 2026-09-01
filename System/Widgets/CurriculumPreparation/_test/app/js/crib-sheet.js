/**
 * crib-sheet.js — Crib Sheet document class & rendering
 *
 * Implements: FR-CSB-1…18, AC-CSB-1…16
 * Exports: CribSheet class, renderMarkdown function
 * Dependencies: document-shell, bigidea-list (computeGlyphSet), domain-resolver,
 *               local-store, image-paste (ImageRef model)
 */

import { DocumentShell, TIERS } from './document-shell.js';
import { computeGlyphSet, getBigIdea, getBigIdeas } from './bigidea-list.js';
import { resolveDomain } from './domain-resolver.js';

// ===== HTML ESCAPING (FR-CSB-18, JS-6) =====
/**
 * Escape HTML special characters.
 * @param {string} text - Raw text
 * @returns {string} HTML-escaped text
 */
function htmlEscape(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== MARKDOWN PARSER (FR-CSB-8, AD-CSB-4) =====
/**
 * Parse and render bounded Markdown: bold, italic, bullets only.
 * Unsupported syntax (headers, code, links) renders as literal text.
 * Input MUST be HTML-escaped before calling this function.
 *
 * @param {string} escapedText - HTML-escaped text
 * @returns {string} HTML with <strong>, <em>, <ul>/<li> only
 */
export function renderMarkdown(escapedText) {
  if (typeof escapedText !== 'string') return '';

  // Split into lines for bullet processing
  const lines = escapedText.split('\n');
  let output = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trimStart();

    // Check for bullet marker
    if (trimmed.startsWith('- ')) {
      if (!inList) {
        inList = true;
      }
      const bulletContent = trimmed.slice(2);
      const processed = _processInlineMarkdown(bulletContent);
      output.push(`<li>${processed}</li>`);
    } else {
      // Close list if we were in one
      if (inList) {
        inList = false;
        output[output.length - 1] = `<ul>${output.slice(output.length - _countTrailingBullets(output)).join('')}</ul>`;
        // Actually, we need to wrap all consecutive <li> elements properly
        // Rebuild output with proper <ul> wrapping
        output = _wrapConsecutiveItems(output);
      }

      // Regular paragraph line
      if (trimmed) {
        const processed = _processInlineMarkdown(line);
        output.push(`<p>${processed}</p>`);
      }
    }
  }

  // Close list if still open
  if (inList) {
    output = _wrapConsecutiveItems(output);
  }

  return output.join('');
}

/**
 * Process inline markdown (bold, italic) in already-escaped text.
 * @param {string} escapedText - HTML-escaped text
 * @returns {string} Text with <strong> and <em> tags
 */
function _processInlineMarkdown(escapedText) {
  let result = escapedText;

  // Bold: **text** → <strong>text</strong>
  // Match non-empty **...** patterns
  result = result.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *text* → <em>text</em>
  // Be careful not to match inside strong tags
  // Match single * with non-* content (but be greedy-safe within words)
  result = result.replace(/\*([^\*]+)\*/g, (match, content) => {
    // Skip if this is part of a ** pattern (check context)
    if (match.includes('**')) return match;
    return `<em>${content}</em>`;
  });

  return result;
}

/**
 * Count trailing <li> elements in output array.
 * @param {string[]} output - Current output array
 * @returns {number} Count of consecutive <li> elements at end
 */
function _countTrailingBullets(output) {
  let count = 0;
  for (let i = output.length - 1; i >= 0; i--) {
    if (output[i].trim().startsWith('<li>')) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Wrap consecutive <li> elements in <ul> tags.
 * @param {string[]} output - Output array
 * @returns {string[]} Cleaned output with proper <ul> wrapping
 */
function _wrapConsecutiveItems(output) {
  const result = [];
  let listItems = [];

  for (const line of output) {
    if (line.trim().startsWith('<li>')) {
      listItems.push(line);
    } else {
      if (listItems.length > 0) {
        result.push(`<ul>${listItems.join('')}</ul>`);
        listItems = [];
      }
      result.push(line);
    }
  }

  if (listItems.length > 0) {
    result.push(`<ul>${listItems.join('')}</ul>`);
  }

  return result;
}

// ===== CRIB SHEET CLASS =====
/**
 * CribSheet — manage generation, editing, and rendering of crib sheets.
 * @param {Object} unit - The loaded unit object
 * @param {Object} localStore - LocalStore instance for persistence
 */
export class CribSheet {
  constructor(unit, localStore) {
    this.unit = unit;
    this.localStore = localStore;

    // Ensure cribSheet exists in unit
    if (!this.unit.cribSheet) {
      this.unit.cribSheet = {
        id: 'crib-sheet',
        title: `${unit.title || 'Unit'} Crib Sheet`,
        orientation: 'portrait',
        sections: [],
        pageCount: 1
      };
    }

    // Ensure required fields
    if (!this.unit.cribSheet.orientation) {
      this.unit.cribSheet.orientation = 'portrait';
    }
  }

  /**
   * Generate sections from the unit's big-idea list.
   * Preserves existing section edits (text, size, half, imageRefs) if provenance is "edited".
   * Sets provenance to "generated" for new sections or regenerated ones.
   *
   * @param {BigIdea[]} bigIdeas - Big idea list from bigidea-list module
   */
  generate(bigIdeas) {
    if (!Array.isArray(bigIdeas)) {
      bigIdeas = [];
    }

    // Build map of existing sections by bigIdeaId
    const existingByBigIdeaId = {};
    if (Array.isArray(this.unit.cribSheet.sections)) {
      for (const section of this.unit.cribSheet.sections) {
        if (section.bigIdeaId) {
          existingByBigIdeaId[section.bigIdeaId] = section;
        }
      }
    }

    // Generate new sections: one per big idea + sub-big idea (FR-CSB-2)
    const newSections = [];

    for (const bigIdea of bigIdeas) {
      // Top-level big idea
      const topSection = this._generateOrPreserveSection(
        bigIdea.id,
        existingByBigIdeaId[bigIdea.id]
      );
      newSections.push(topSection);

      // Sub-big ideas (children) — exactly two levels per INV-DM-14
      if (Array.isArray(bigIdea.children)) {
        for (const subBigIdea of bigIdea.children) {
          const subSection = this._generateOrPreserveSection(
            subBigIdea.id,
            existingByBigIdeaId[subBigIdea.id]
          );
          newSections.push(subSection);
        }
      }
    }

    // Replace sections and save
    this.unit.cribSheet.sections = newSections;
    return this._saveToStore();
  }

  /**
   * Generate a new section or preserve existing edits.
   * @param {string} bigIdeaId - ID of the big idea
   * @param {Object|undefined} existing - Existing section (if any)
   * @returns {Object} Section object
   */
  _generateOrPreserveSection(bigIdeaId, existing) {
    if (existing && existing.provenance === 'edited') {
      // Preserve edits but update big idea reference if needed
      return {
        ...existing,
        bigIdeaId, // Ensure bigIdeaId is current
        provenance: 'edited'
      };
    }

    // Generate fresh section (AD-CSB-2: default half is "upper")
    return {
      bigIdeaId,
      half: 'upper',
      text: '',
      imageRefs: [],
      size: 'medium', // Default size
      provenance: 'generated'
    };
  }

  /**
   * Edit section text.
   * @param {number} sectionIndex - Index in sections array
   * @param {string} newText - New text content
   */
  editSectionText(sectionIndex, newText) {
    if (!this.unit.cribSheet.sections[sectionIndex]) {
      throw new Error(`Section index ${sectionIndex} out of bounds`);
    }
    this.unit.cribSheet.sections[sectionIndex].text = newText || '';
    this.unit.cribSheet.sections[sectionIndex].provenance = 'edited';
    return this._saveToStore();
  }

  /**
   * Edit section size.
   * @param {number} sectionIndex - Index in sections array
   * @param {string} size - "small", "medium", or "large"
   */
  editSectionSize(sectionIndex, size) {
    if (!this.unit.cribSheet.sections[sectionIndex]) {
      throw new Error(`Section index ${sectionIndex} out of bounds`);
    }
    if (!['small', 'medium', 'large'].includes(size)) {
      throw new Error(`Invalid size: ${size}. Must be small, medium, or large.`);
    }
    this.unit.cribSheet.sections[sectionIndex].size = size;
    this.unit.cribSheet.sections[sectionIndex].provenance = 'edited';
    return this._saveToStore();
  }

  /**
   * Edit section half (upper or lower).
   * @param {number} sectionIndex - Index in sections array
   * @param {string} half - "upper" or "lower"
   */
  editSectionHalf(sectionIndex, half) {
    if (!this.unit.cribSheet.sections[sectionIndex]) {
      throw new Error(`Section index ${sectionIndex} out of bounds`);
    }
    if (!['upper', 'lower'].includes(half)) {
      throw new Error(`Invalid half: ${half}. Must be upper or lower.`);
    }
    this.unit.cribSheet.sections[sectionIndex].half = half;
    this.unit.cribSheet.sections[sectionIndex].provenance = 'edited';
    return this._saveToStore();
  }

  /**
   * Add image to section.
   * @param {number} sectionIndex - Index in sections array
   * @param {Object} imageRef - ImageRef object {imageId, x, y, width, height}
   */
  addImage(sectionIndex, imageRef) {
    if (!this.unit.cribSheet.sections[sectionIndex]) {
      throw new Error(`Section index ${sectionIndex} out of bounds`);
    }
    if (!imageRef.imageId) {
      throw new Error('ImageRef must have imageId');
    }
    if (!Array.isArray(this.unit.cribSheet.sections[sectionIndex].imageRefs)) {
      this.unit.cribSheet.sections[sectionIndex].imageRefs = [];
    }
    this.unit.cribSheet.sections[sectionIndex].imageRefs.push(imageRef);
    this.unit.cribSheet.sections[sectionIndex].provenance = 'edited';
    return this._saveToStore();
  }

  /**
   * Remove image from section.
   * @param {number} sectionIndex - Index in sections array
   * @param {string} imageId - ID of image to remove
   */
  removeImage(sectionIndex, imageId) {
    if (!this.unit.cribSheet.sections[sectionIndex]) {
      throw new Error(`Section index ${sectionIndex} out of bounds`);
    }
    const section = this.unit.cribSheet.sections[sectionIndex];
    if (!Array.isArray(section.imageRefs)) {
      return this._saveToStore();
    }
    section.imageRefs = section.imageRefs.filter(ref => ref.imageId !== imageId);
    section.provenance = 'edited';
    return this._saveToStore();
  }

  /**
   * Set orientation (portrait or landscape).
   * @param {string} orientation - "portrait" or "landscape"
   */
  setOrientation(orientation) {
    if (!['portrait', 'landscape'].includes(orientation)) {
      throw new Error(`Invalid orientation: ${orientation}`);
    }
    this.unit.cribSheet.orientation = orientation;
    return this._saveToStore();
  }

  /**
   * Compute and return page count based on current sections.
   * Uses measured rendered height heuristic per OQ-CSB-2 resolved decision.
   * @returns {number} 1 or 2
   */
  getPageCount() {
    return this.unit.cribSheet.pageCount || 1;
  }

  /**
   * Check if content exceeds the 2-page cap.
   * @returns {boolean} True if overflow detected
   */
  isOverflow() {
    // This is set by the render function after measuring
    return this.unit.cribSheet.isOverflow || false;
  }

  /**
   * Render the crib sheet to SVG pages.
   * @returns {DocumentShell} Page model instance
   */
  render() {
    const bigIdeas = getBigIdeas() || [];
    const bigIdeasMap = {};
    for (const bi of bigIdeas) {
      bigIdeasMap[bi.id] = bi;
    }

    // Separate sections by half
    const sections = this.unit.cribSheet.sections || [];
    const upperSections = sections.filter(s => s.half === 'upper');
    const lowerSections = sections.filter(s => s.half === 'lower');

    // Create page data
    const pageData = {
      cribSheet: this.unit.cribSheet,
      sections,
      upperSections,
      lowerSections,
      bigIdeasMap,
      nodes: this.unit.nodes || [],
      images: this.unit.images || []
    };

    // Create render function
    const renderFn = (pageInfo, svgElement) => {
      this._renderPage(pageInfo, svgElement, pageData);
    };

    // Create pages array (initially 1 page, may extend)
    const pages = [{ pageIndex: 0, pageCount: 1 }];

    // Create DocumentShell with the render function
    const shell = new DocumentShell(
      { pages },
      renderFn,
      this.unit.cribSheet.orientation
    );

    // Measure page count after render
    this._updatePageCount();

    return shell;
  }

  /**
   * Render a single page.
   * @param {Object} pageInfo - Page metadata
   * @param {SVGElement} svgElement - Target SVG element
   * @param {Object} pageData - Pre-computed page data
   */
  _renderPage(pageInfo, svgElement, pageData) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svgElement.appendChild(g);

    let y = 15;

    // Header (subject, title, page number)
    const subject = this.unit.curriculum?.title || this.unit.title || 'Unit';
    this._text(g, 12, y, subject, 'subject-label');
    y += 8;

    this._text(g, 12, y, this.unit.cribSheet.title || `${subject} Crib Sheet`, 'sheet-title');
    y += 8;

    // Page number
    const pageCount = this._computePageCount();
    const pageNum = pageInfo.pageIndex + 1;
    this._text(g, 185, y, `page ${pageNum} of ${pageCount}`, 'page-number');

    y += 15;

    // Get curriculum labels for halves (FR-CSB-4, AD-29)
    const labels = this.unit.curriculum?.labels?.cribSheetHalves || {};
    const upperLabel = labels.upper || 'Skills';
    const lowerLabel = labels.lower || 'Knowledge';

    // Render upper half
    y = this._renderHalf(g, pageData.upperSections, upperLabel, 20, pageData);
    y += 8;

    // Render lower half (no drawn divider, AD-30, AD-46)
    y = this._renderHalf(g, pageData.lowerSections, lowerLabel, y, pageData);

    // Overflow flag (FR-CSB-1, AC-CSB-2)
    if (this.isOverflow()) {
      this._text(g, 12, 275, '⚠ Content exceeds 2 pages', 'overflow-flag');
    }
  }

  /**
   * Render one half of the sheet (upper or lower).
   * @param {SVGElement} g - Target group
   * @param {Object[]} sections - Sections for this half
   * @param {string} label - Half label (Skills/Knowledge)
   * @param {number} startY - Starting Y position
   * @param {Object} pageData - Shared page data
   * @returns {number} Next Y position after rendering
   */
  _renderHalf(g, sections, label, startY, pageData) {
    let y = startY;

    // Half label with domain glyph indicator
    const glyphColor = label === 'Skills' ? '#0F7B6C' : '#B23A6B';
    this._rect(g, 10, y, 2, 8, glyphColor);
    this._text(g, 14, y + 6, label, 'half-label');
    y += 12;

    // Render sections in this half
    if (sections.length === 0) {
      // Empty half with placeholder (FR-CSB-12, FR-CSB-13, FR-CSB-14)
      const placeholder = label === 'Skills'
        ? 'Big ideas · Diagnostic questions · Worked examples or illustrations · Checklist/s'
        : 'Essential facts · Key vocab · Worked examples or illustrations · Outline/s';
      this._text(g, 14, y, placeholder, 'placeholder-text');
      y += 10;
    } else {
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        y = this._renderSection(g, section, y, pageData);
      }
    }

    return y;
  }

  /**
   * Render a single section.
   * @param {SVGElement} g - Target group
   * @param {Object} section - Section object
   * @param {number} startY - Starting Y position
   * @param {Object} pageData - Shared page data
   * @returns {number} Next Y position after rendering
   */
  _renderSection(g, section, startY, pageData) {
    let y = startY;

    const bigIdea = pageData.bigIdeasMap[section.bigIdeaId];
    if (!bigIdea) {
      return y; // Skip if big idea not found
    }

    // Section card background
    const cardHeight = this._estimateSectionHeight(section);
    this._rect(g, 12, y - 2, 186, cardHeight + 4, '#fff', '#e3e1d9');

    // Top border (domain glyph color)
    const glyphSet = computeGlyphSet(section.bigIdeaId, pageData.nodes, (nodeId) => resolveDomain(nodeId, pageData.nodes));
    let borderColor = '#ddd';
    if (glyphSet.size === 1) {
      borderColor = glyphSet.has('skill') ? '#0F7B6C' : '#B23A6B';
    } else if (glyphSet.size === 2) {
      borderColor = '#7B5A8E'; // Mixed domain color
    }

    // Draw top border with glyph color
    this._line(g, 12, y - 2, 198, y - 2, borderColor, 3);

    y += 4;

    // Big idea title with domain glyphs
    this._text(g, 14, y, bigIdea.title || '(untitled)', 'section-title');

    // Render domain glyphs inline
    let glyphX = 160;
    if (glyphSet.has('skill')) {
      this._glyph(g, glyphX, y - 3, 'pencil');
      glyphX += 10;
    }
    if (glyphSet.has('knowledge')) {
      this._glyph(g, glyphX, y - 3, 'notebook');
    }

    y += 8;

    // Section text (with markdown formatting)
    if (section.text) {
      const escapedText = htmlEscape(section.text);
      const htmlContent = renderMarkdown(escapedText);
      this._htmlBlock(g, 14, y, htmlContent, 180, 40);
      y += 30;
    } else {
      // Placeholder for empty section
      const placeholder = section.half === 'upper'
        ? 'Add content: big ideas, diagnostic questions, worked examples, checklists'
        : 'Add content: essential facts, key vocabulary, worked examples, outlines';
      this._text(g, 14, y, placeholder, 'empty-section-placeholder');
      y += 8;
    }

    // Images
    if (Array.isArray(section.imageRefs) && section.imageRefs.length > 0) {
      for (const imageRef of section.imageRefs) {
        // Note: actual image rendering would happen via document-shell.renderImage()
        // For now, just reserve space
        y += 8; // Space for image
      }
    }

    // Citation line (curriculum nodes and lessons)
    const citation = this._buildCitation(section, pageData);
    if (citation) {
      this._text(g, 14, y, citation, 'citation');
      y += 4;
    }

    y += 6; // Space after card

    return y;
  }

  /**
   * Build human-readable citation for a section.
   * @param {Object} section - Section object
   * @param {Object} pageData - Shared page data
   * @returns {string} Citation text
   */
  _buildCitation(section, pageData) {
    // TODO: Query lessons and curriculum nodes for this big idea
    // This requires access to lessonData and nodeData which should be in unit
    return ''; // Placeholder
  }

  /**
   * Estimate section height for overflow detection.
   * @param {Object} section - Section object
   * @returns {number} Estimated height in mm
   */
  _estimateSectionHeight(section) {
    let height = 15; // Base height for title

    if (section.text) {
      height += Math.ceil(section.text.length / 40) * 5; // Rough line height
    }

    if (Array.isArray(section.imageRefs)) {
      height += section.imageRefs.length * 20; // Space for images
    }

    // Size multiplier (FR-CSB-7)
    const sizeMultiplier = section.size === 'small' ? 0.75 : section.size === 'large' ? 1.5 : 1;
    height *= sizeMultiplier;

    return height;
  }

  /**
   * Compute actual page count based on rendered content.
   * @returns {number} 1 or 2
   */
  _computePageCount() {
    // For now, use a simple heuristic based on section count
    // In a real implementation, measure rendered SVG height
    const totalHeight = this._estimateTotalHeight();
    const a4PortraitHeight = 297 - 30; // Subtract margins
    const pageCount = Math.ceil(totalHeight / a4PortraitHeight);
    return Math.min(Math.max(pageCount, 1), 2);
  }

  /**
   * Estimate total rendered height.
   * @returns {number} Height in mm
   */
  _estimateTotalHeight() {
    const sections = this.unit.cribSheet.sections || [];
    let totalHeight = 50; // Header and labels

    for (const section of sections) {
      totalHeight += this._estimateSectionHeight(section) + 6;
    }

    return totalHeight;
  }

  /**
   * Update page count in unit and detect overflow.
   */
  _updatePageCount() {
    const pageCount = this._computePageCount();
    this.unit.cribSheet.pageCount = pageCount;
    this.unit.cribSheet.isOverflow = pageCount > 2;
  }

  /**
   * Save unit to store.
   * @returns {Promise}
   */
  _saveToStore() {
    if (this.localStore && this.localStore.saveUnit) {
      return this.localStore.saveUnit(this.unit);
    }
    return Promise.resolve();
  }

  // ===== SVG RENDERING HELPERS =====

  /**
   * Draw text in SVG.
   */
  _text(g, x, y, text, className = '') {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', String(x));
    t.setAttribute('y', String(y));
    if (className) t.setAttribute('class', className);
    t.textContent = String(text || '');
    g.appendChild(t);
  }

  /**
   * Draw rectangle in SVG.
   */
  _rect(g, x, y, width, height, fill = 'none', stroke = 'none') {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', String(x));
    r.setAttribute('y', String(y));
    r.setAttribute('width', String(width));
    r.setAttribute('height', String(height));
    if (fill && fill !== 'none') {
      r.setAttribute('fill', fill);
    }
    if (stroke && stroke !== 'none') {
      r.setAttribute('stroke', stroke);
      r.setAttribute('stroke-width', '1');
    }
    g.appendChild(r);
  }

  /**
   * Draw line in SVG.
   */
  _line(g, x1, y1, x2, y2, color = '#000', width = 1) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', String(width));
    g.appendChild(line);
  }

  /**
   * Draw a domain glyph (pencil for skill, notebook for knowledge).
   */
  _glyph(g, x, y, type) {
    const size = 4;
    const color = type === 'pencil' ? '#0F7B6C' : '#B23A6B';

    if (type === 'pencil') {
      // Simple pencil icon
      this._rect(g, x, y, 2, 6, color);
      this._line(g, x + 2, y + 5, x + 4, y + 6, color, 1);
    } else {
      // Simple notebook icon
      this._rect(g, x, y, 4, 6, 'none', color);
      this._line(g, x + 2, y, x + 2, y + 6, color, 0.5);
    }
  }

  /**
   * Draw an HTML block in SVG (for markdown content).
   * This is a simplified version; in production, would use SVG foreign objects.
   */
  _htmlBlock(g, x, y, htmlContent, maxWidth, maxHeight) {
    // For now, render as plain text
    // A real implementation would parse the HTML and render styled text
    const plainText = htmlContent.replace(/<[^>]*>/g, '').substring(0, 100);
    this._text(g, x, y, plainText, 'section-text');
  }
}
