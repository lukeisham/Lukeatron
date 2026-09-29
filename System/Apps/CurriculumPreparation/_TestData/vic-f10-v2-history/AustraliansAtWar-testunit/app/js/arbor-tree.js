// arbor-tree.js — Horizontal family tree renderer for curriculum map (FR-ATB-*)
// Implements: arbor tree layout (FR-ATB-1), coverage chips (FR-ATB-7/8/9), domain glyphs (FR-ATB-10)
// No editing; read-only renderer over local-store data

import { layoutTree, buildEdgeList } from './tidy-tree.js';
import {
  deriveLessonCoverage,
  deriveAssessmentCoverage,
  deriveTopicCoverage,
  deriveBigIdeaCoverage
} from './coverage-derivers.js';
import { resolveDomain } from './domain-resolver.js';
import { TIERS, DocumentShell } from './document-shell.js';
import { renderCode } from './traceability.js';

/**
 * ArborTree — Renders horizontal curriculum family tree
 * - A4 landscape SVG + HTML edit view
 * - Node cards with three independent coverage chip types
 * - Domain glyphs (skill/knowledge)
 * - Big-idea list side panel
 * - Curriculum description header
 */
export class ArborTree {
  constructor(localStore) {
    this.localStore = localStore;
    this.unit = null;
    this.documentShell = null;

    // Card dimensions (px); stable for tidy-tree layout freezing (AD-ATB-1)
    this.cardWidth = 140;
    this.cardHeight = 80;

    // SVG viewBox dims for A4 landscape at 96 dpi: 297×210 mm → 1123×794 px
    this.svgWidth = 1123;
    this.svgHeight = 794;

    // Coverage maps
    this.lessonCoverage = new Map();
    this.assessmentCoverage = new Map();
    this.topicCoverage = new Map();
    this.bigIdeaCoverage = new Map();

    // Node positions from layout
    this.nodePositions = [];
  }

  /**
   * Load unit and set up document shell for rendering
   */
  async init() {
    try {
      this.unit = this.localStore.unit;
      if (!this.unit) {
        console.warn('No unit loaded');
        return;
      }

      // Derive all coverage types fresh on load (AD-ATB-2)
      this.deriveCoverage();

      // Create document shell with landscape orientation
      this.documentShell = new DocumentShell(
        { pages: [{ content: {} }] },
        this.renderPage.bind(this),
        'landscape'
      );
    } catch (err) {
      console.error('ArborTree init error:', err);
    }
  }

  /**
   * Derive all coverage types fresh from unit data
   */
  deriveCoverage() {
    if (!this.unit || !this.unit.nodes) return;

    const nodes = this.unit.nodes;
    this.lessonCoverage = deriveLessonCoverage(nodes, this.unit.lessons || []);
    this.assessmentCoverage = deriveAssessmentCoverage(nodes, this.unit.unitAssessment);
    this.topicCoverage = deriveTopicCoverage(nodes, this.unit.topics || []);
    this.bigIdeaCoverage = deriveBigIdeaCoverage(nodes, this.unit.bigIdeas || []);
  }

  /**
   * Render SVG page (called by DocumentShell)
   * @param {Object} pageData - page data from shell
   * @param {SVGElement} svgElement - target SVG to draw into
   */
  renderPage(pageData, svgElement) {
    if (!this.unit) return;

    // Set SVG viewBox and dimensions
    svgElement.setAttribute('viewBox', `0 0 ${this.svgWidth} ${this.svgHeight}`);

    // Clear any existing content
    while (svgElement.firstChild) {
      svgElement.removeChild(svgElement.firstChild);
    }

    // Render white background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', String(this.svgWidth));
    bg.setAttribute('height', String(this.svgHeight));
    bg.setAttribute('fill', 'var(--color-bg-white)');
    svgElement.appendChild(bg);

    let yOffset = 30; // Top margin

    // Render curriculum description if set (FR-ATB-6)
    if (this.unit.curriculum && this.unit.curriculum.description) {
      yOffset = this._renderDescription(svgElement, this.unit.curriculum.description, yOffset);
    }

    // Render tree layout
    this._renderTree(svgElement, yOffset);

    // Render big-idea list as side panel (FR-ATB-5, FR-ATB-13)
    this._renderBigIdeaPanel(svgElement, yOffset);
  }

  /**
   * Render curriculum description at top
   * @returns {number} new y offset
   */
  _renderDescription(svgElement, description, yOffset) {
    const maxWidth = 600;
    const fontSize = 12;
    const lineHeight = 14;

    // Split description into lines (simple word-wrap)
    const words = description.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      // Rough estimate: ~5 chars per 30px at 12px
      if (testLine.length > Math.floor(maxWidth / 2)) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Render lines
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'description-header');

    for (let i = 0; i < lines.length && i < 3; i++) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '30');
      text.setAttribute('y', String(yOffset + (i * lineHeight)));
      text.setAttribute('font-size', String(fontSize));
      text.setAttribute('font-family', 'var(--font-system)');
      text.setAttribute('fill', 'var(--color-text-primary)');
      text.setAttribute('font-weight', 'bold');
      text.textContent = lines[i];
      group.appendChild(text);
    }

    svgElement.appendChild(group);
    return yOffset + (Math.min(lines.length, 3) * lineHeight) + 15;
  }

  /**
   * Render the tree (layout + cards)
   */
  _renderTree(svgElement, startY) {
    if (!this.unit.nodes || this.unit.nodes.length === 0) {
      // Empty state (OQ-BT-1 resolved)
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '50');
      text.setAttribute('y', String(startY + 100));
      text.setAttribute('font-size', '14');
      text.setAttribute('fill', 'var(--color-text-secondary)');
      text.textContent = 'No curriculum nodes yet. Add nodes to see the tree.';
      svgElement.appendChild(text);
      return;
    }

    // Compute layout
    const edges = buildEdgeList(this.unit.nodes);
    this.nodePositions = layoutTree(this.unit.nodes, edges, this.cardWidth, this.cardHeight);

    // Create group for tree
    const treeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    treeGroup.setAttribute('class', 'arbor-tree');
    treeGroup.setAttribute('transform', `translate(20, ${startY + 30})`);

    // Render edges (lines between parent and child)
    this._renderEdges(treeGroup, edges);

    // Render node cards
    for (const pos of this.nodePositions) {
      const node = this.unit.nodes.find(n => n.id === pos.nodeId);
      if (node) {
        this._renderNodeCard(treeGroup, node, pos);
      }
    }

    svgElement.appendChild(treeGroup);
  }

  /**
   * Render edges (parent-child lines)
   */
  _renderEdges(group, edges) {
    const edgeMap = {};
    for (const edge of edges) {
      edgeMap[edge.childId] = edge.parentId;
    }

    const posMap = {};
    for (const pos of this.nodePositions) {
      posMap[pos.nodeId] = pos;
    }

    for (const childId of Object.keys(edgeMap)) {
      const parentId = edgeMap[childId];
      const parentPos = posMap[parentId];
      const childPos = posMap[childId];

      if (parentPos && childPos) {
        // Draw a line from parent right edge to child left edge
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(parentPos.x + parentPos.width));
        line.setAttribute('y1', String(parentPos.y + parentPos.height / 2));
        line.setAttribute('x2', String(childPos.x));
        line.setAttribute('y2', String(childPos.y + childPos.height / 2));
        line.setAttribute('stroke', 'var(--color-border-light)');
        line.setAttribute('stroke-width', '1');
        group.insertBefore(line, group.firstChild); // Paint behind cards
      }
    }
  }

  /**
   * Render one node card with chips and glyph
   */
  _renderNodeCard(group, node, pos) {
    // Card background
    const card = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    card.setAttribute('x', String(pos.x));
    card.setAttribute('y', String(pos.y));
    card.setAttribute('width', String(pos.width));
    card.setAttribute('height', String(pos.height));
    card.setAttribute('rx', '4');
    card.setAttribute('fill', 'var(--color-bg-white)');
    card.setAttribute('stroke', 'var(--color-border-medium)');
    card.setAttribute('stroke-width', '1');
    group.appendChild(card);

    // Card content group
    const cardContent = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    cardContent.setAttribute('class', 'card-content');

    let textY = pos.y + 12;

    // Domain glyph + node code (FR-ATB-10)
    const codeLine = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    codeLine.setAttribute('x', String(pos.x + 6));
    codeLine.setAttribute('y', String(textY));
    codeLine.setAttribute('font-size', '9');
    codeLine.setAttribute('font-family', 'var(--font-monospace)');
    codeLine.setAttribute('fill', 'var(--color-text-primary)');

    // Build code with glyph
    const codeStr = renderCode(node.code || '', false);
    let codeText = codeStr;
    const domain = resolveDomain(node.id, this.unit.nodes);

    if (domain === 'skill') {
      codeText = '✎ ' + codeText;
      codeLine.setAttribute('fill', 'var(--color-skill-glyph)');
    } else if (domain === 'knowledge') {
      codeText = '📓 ' + codeText;
      codeLine.setAttribute('fill', 'var(--color-knowledge-glyph)');
    }

    // FR-ATB-3 / INV-DM-2: code renders verbatim, never truncated. Long codes are
    // handled as a layout problem, not a content problem — condense the glyph
    // spacing to fit the card's available width via SVG's own textLength/
    // lengthAdjust mechanism, which reflows the SAME characters into the space
    // rather than cutting any of them.
    codeLine.textContent = codeText;
    this._fitTextToWidth(codeLine, codeText, pos.width - 12, 5.4);
    cardContent.appendChild(codeLine);

    textY += 14;

    // Node title (if room) — also verbatim, never truncated (FR-ATB-3 / INV-DM-2).
    if (node.title) {
      const titleLine = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleLine.setAttribute('x', String(pos.x + 6));
      titleLine.setAttribute('y', String(textY));
      titleLine.setAttribute('font-size', '8');
      titleLine.setAttribute('fill', 'var(--color-text-secondary)');
      titleLine.textContent = node.title;
      this._fitTextToWidth(titleLine, node.title, pos.width - 12, 4.5);
      cardContent.appendChild(titleLine);
      textY += 11;
    }

    // Render coverage chips (FR-ATB-7/8/9)
    textY += 2;
    this._renderChips(cardContent, node, pos, textY);

    group.appendChild(cardContent);
  }

  /**
   * Render three independent coverage chip types
   * (AD-ATB-3: independent rendering, not merged)
   */
  _renderChips(group, node, pos, startY) {
    let chipX = pos.x + 4;
    let chipY = startY;
    const chipHeight = 10;
    const chipGap = 3;

    // Big-idea coverage chips (FR-ATB-7)
    const biChips = this.bigIdeaCoverage.get(node.id) || [];
    for (const entry of biChips) {
      if (chipX + 30 > pos.x + pos.width - 4) {
        chipX = pos.x + 4;
        chipY += chipHeight + 1;
      }
      this._renderChip(group, entry.name, entry.coverage, chipX, chipY, 28, chipHeight, '#185FA5');
      chipX += 30;
    }

    // Assessment coverage chips (FR-ATB-8)
    const assessChips = this.assessmentCoverage.get(node.id) || [];
    for (const entry of assessChips) {
      if (chipX + 30 > pos.x + pos.width - 4) {
        chipX = pos.x + 4;
        chipY += chipHeight + 1;
      }
      this._renderChip(group, entry.name, entry.coverage, chipX, chipY, 28, chipHeight, '#9A4E12');
      chipX += 30;
    }

    // Topic coverage chips (FR-ATB-9, display-only)
    const topicChips = this.topicCoverage.get(node.id) || [];
    for (const entry of topicChips) {
      if (chipX + 30 > pos.x + pos.width - 4) {
        chipX = pos.x + 4;
        chipY += chipHeight + 1;
      }
      this._renderChip(group, entry.name, entry.coverage, chipX, chipY, 28, chipHeight, '#703508');
      chipX += 30;
    }
  }

  /**
   * Render one coverage chip (full or partial)
   */
  _renderChip(group, label, coverageType, x, y, width, height, color) {
    const chip = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    chip.setAttribute('x', String(x));
    chip.setAttribute('y', String(y));
    chip.setAttribute('width', String(width));
    chip.setAttribute('height', String(height));
    chip.setAttribute('rx', '2');

    if (coverageType === 'full') {
      chip.setAttribute('fill', color);
      chip.setAttribute('stroke', color);
    } else if (coverageType === 'partial') {
      // Gradient for partial
      const grad = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const linearGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      linearGrad.setAttribute('id', `grad-${Math.random().toString(36).substr(2, 9)}`);
      linearGrad.setAttribute('x1', '0%');
      linearGrad.setAttribute('y1', '0%');
      linearGrad.setAttribute('x2', '100%');
      linearGrad.setAttribute('y2', '100%');

      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '50%');
      stop1.setAttribute('stop-color', color);
      stop1.setAttribute('stop-opacity', '0.6');
      linearGrad.appendChild(stop1);

      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', '#fff');
      linearGrad.appendChild(stop2);

      // Just use solid light colour for simplicity; full vs partial visual distinction
      chip.setAttribute('fill', '#f0f0f0');
      chip.setAttribute('stroke', color);
      chip.setAttribute('stroke-width', '0.5');
    }

    group.appendChild(chip);

    // Chip label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(x + width / 2));
    text.setAttribute('y', String(y + height / 2 + 2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '6');
    text.setAttribute('fill', coverageType === 'full' ? '#fff' : color);
    text.setAttribute('font-weight', 'bold');
    text.textContent = this._truncate(label, 8);
    group.appendChild(text);
  }

  /**
   * Render big-idea list as side panel (FR-ATB-5, FR-ATB-13)
   */
  _renderBigIdeaPanel(svgElement, startY) {
    if (!this.unit.bigIdeas || this.unit.bigIdeas.length === 0) {
      return; // No big ideas to render
    }

    // Panel on right side of tree
    const panelX = 850;
    const panelY = startY + 30;
    const panelWidth = 260;
    const panelHeight = 700;

    // Panel background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', String(panelX));
    bg.setAttribute('y', String(panelY));
    bg.setAttribute('width', String(panelWidth));
    bg.setAttribute('height', String(panelHeight));
    bg.setAttribute('fill', 'var(--color-bg-very-light)');
    bg.setAttribute('stroke', 'var(--color-border-light)');
    bg.setAttribute('stroke-width', '1');
    bg.setAttribute('rx', '4');
    svgElement.appendChild(bg);

    // Panel title
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', String(panelX + 10));
    title.setAttribute('y', String(panelY + 18));
    title.setAttribute('font-size', '11');
    title.setAttribute('font-weight', 'bold');
    title.setAttribute('fill', 'var(--color-text-primary)');
    title.textContent = 'Big Ideas';
    svgElement.appendChild(title);

    // List big ideas
    let ideaY = panelY + 32;
    for (const idea of this.unit.bigIdeas) {
      if (ideaY + 12 > panelY + panelHeight - 5) break; // Stop if out of space

      // Idea name
      const ideaText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      ideaText.setAttribute('x', String(panelX + 10));
      ideaText.setAttribute('y', String(ideaY));
      ideaText.setAttribute('font-size', '9');
      ideaText.setAttribute('fill', 'var(--color-text-primary)');
      ideaText.textContent = this._truncate(idea.title, 30);
      svgElement.appendChild(ideaText);

      ideaY += 12;
    }
  }

  /**
   * Fit a single-line SVG text element into an available card width without
   * cutting any characters (FR-ATB-3 / INV-DM-2 forbid truncation). If the
   * text is estimated to overflow, condense the glyph spacing via SVG's own
   * textLength/lengthAdjust mechanism — the same characters reflow into the
   * space, nothing is removed. This is a rendering/layout adjustment only;
   * `textContent` above already carries the full, untruncated string.
   */
  _fitTextToWidth(textEl, text, availableWidth, estCharWidth) {
    if (!text) return;
    const estimatedWidth = text.length * estCharWidth;
    if (estimatedWidth > availableWidth) {
      textEl.setAttribute('textLength', String(availableWidth));
      textEl.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    }
  }

  /**
   * Truncate text to max length
   */
  _truncate(text, maxLen) {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen - 1) + '…' : text;
  }

  /**
   * Get SVG export (FR-DS-7)
   */
  exportSVG() {
    if (this.documentShell) {
      return this.documentShell.exportSVG();
    }
    return '';
  }
}

export default ArborTree;
