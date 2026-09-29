/**
 * lesson-plan-document.js — Lesson plan document class & rendering
 *
 * Exports: LessonPlanDocument class, renderLessonPlan function.
 * Implements: FR-LPB-1…12 (front page, tier pages, bindings, sidebar, images).
 */

import { TIERS } from './document-shell.js';
import { shouldRenderTierPage } from './tier-page-emission.js';
import { resolveTopic } from './bigidea-list.js';
import { renderCode } from './traceability.js';

// Estimate-based word wrap for SVG <text>, which never wraps on its own
// (JS-6). Same approach as arbor-tree.js, resources-page.js and
// assessment-tier-page.js — each document renderer keeps its own copy
// rather than sharing one, per this codebase's existing convention.
function wrapToLines(text, maxWidth, fontSize, maxLines = 2) {
  if (!text) return [''];
  const avgCharWidth = fontSize * 0.55;
  const maxChars = Math.max(1, Math.floor(maxWidth / avgCharWidth));
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines) break;
    } else {
      currentLine = testLine;
    }
  }
  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine);
  }

  if (lines.length === maxLines) {
    const consumed = lines.join(' ').length;
    if (consumed < text.length) {
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.{3}$/, '...');
    }
  }
  return lines;
}

export class LessonPlanDocument {
  constructor(lesson, allLessons, allBigIdeas, allTopics, allNodes, unitAssessment) {
    this.lesson = lesson;
    this.allLessons = allLessons;
    this.allBigIdeas = allBigIdeas;
    this.allTopics = allTopics;
    this.allNodes = allNodes;
    this.unitAssessment = unitAssessment;

    // Build lookup maps
    this.nodesMap = Object.fromEntries((allNodes || []).map(n => [n.id, n]));
    this.topicsMap = Object.fromEntries((allTopics || []).map(t => [t.id, t]));
    this.bigIdeasMap = Object.fromEntries((allBigIdeas || []).map(bi => [bi.id, bi]));
  }

  computePageCount() {
    let count = 1; // front always
    const tiers = this.lesson.tiers || {};
    if (shouldRenderTierPage(tiers.pass)) count++;
    if (shouldRenderTierPage(tiers.intermediate)) count++;
    if (shouldRenderTierPage(tiers.advanced)) count++;
    return count;
  }

  render(pageData, svgElement) {
    const g = this._createGroup(svgElement, pageData.type === 'front' ? 'front-page' : `tier-${pageData.tierName}`);

    if (pageData.type === 'front') {
      this._renderFront(g);
    } else {
      this._renderTier(g, pageData.tierName);
    }
  }

  _renderFront(g) {
    const pageCount = this.computePageCount();
    const hasSidebar = !!this.lesson.sidebar?.trim();
    const right = hasSidebar ? 142 : 196;

    // Masthead: big numeral + topic, black rule beneath
    const topicId = resolveTopic(this.lesson.id, this.allLessons, this.allBigIdeas);
    const topic = topicId ? this.topicsMap[topicId] : null;
    const hasNumber = !!this.lesson.number;
    const topicX = hasNumber ? 42 : 10;
    if (hasNumber) {
      this._text(g, 10, 12, 'Lesson', 'studio-eyebrow');
      this._text(g, 10, 32, String(this.lesson.number), 'studio-numeral');
    }
    if (topic) {
      this._text(g, topicX, hasNumber ? 20 : 16, topic.title || '', 'studio-kicker');
    }
    this._rule(g, 10, 40, right);

    let y = 50;

    // Big idea
    const bi = this.bigIdeasMap[this.lesson.bigIdeaId];
    if (bi) {
      const count = this.allLessons.filter(l => l.bigIdeaId === this.lesson.bigIdeaId).length;
      this._bar(g, 10, y, 22);
      this._text(g, 16, y + 5, 'Big idea', 'studio-section-label');
      const titleY = y + 11;
      const lines = this._wrappedText(g, 16, titleY, bi.title || '(untitled)', 'studio-title', right - 20, 3.31, 2);
      if (count > 0) {
        const countY = titleY + (lines - 1) * 4.3 + 6;
        this._text(g, 16, countY, `${count} lesson${count !== 1 ? 's' : ''} build toward this idea`, 'studio-body-sm');
      }
      y += 30;
    }

    // Curriculum nodes
    if (this.lesson.nodeIds && this.lesson.nodeIds.length > 0) {
      const rowCount = this.lesson.nodeIds.length;
      this._bar(g, 10, y, 12 + rowCount * 6);
      this._text(g, 16, y + 5, 'Curriculum', 'studio-section-label');
      let rowY = y + 13;
      for (const nodeId of this.lesson.nodeIds) {
        const node = this.nodesMap[nodeId];
        if (node) {
          this._text(g, 16, rowY, renderCode(node.code || '—', false), 'studio-code');
          this._text(g, 38, rowY, node.title || '', 'studio-body-sm');
          rowY += 6;
        }
      }
      y += 18 + rowCount * 6;
    }

    // Key example / practice question — side by side when both present
    const hasKey = !!this.lesson.keyExample;
    const hasQuestion = !!this.lesson.practiceQuestion;
    if (hasKey && hasQuestion) {
      const colWidth = (right - 10 - 8) / 2;
      const col2X = 10 + colWidth + 8;
      this._rule(g, 10, y, 10 + colWidth);
      this._text(g, 10, y + 5, 'Example', 'studio-section-label');
      this._wrappedText(g, 10, y + 11, this.lesson.keyExample, 'studio-body', colWidth - 4, 3.04, 3);
      this._rule(g, col2X, y, col2X + colWidth);
      this._text(g, col2X, y + 5, 'Question', 'studio-section-label');
      this._wrappedText(g, col2X, y + 11, this.lesson.practiceQuestion, 'studio-body', colWidth - 4, 3.04, 3);
      y += 34;
    } else if (hasKey || hasQuestion) {
      this._rule(g, 10, y, right);
      this._text(g, 10, y + 5, hasKey ? 'Example' : 'Question', 'studio-section-label');
      this._wrappedText(g, 10, y + 11, hasKey ? this.lesson.keyExample : this.lesson.practiceQuestion, 'studio-body', right - 10, 3.04, 2);
      y += 26;
    }

    // Assessment links
    if (this.lesson.assessmentLink) {
      const miniIds = this.lesson.assessmentLink.miniAssessmentIds || [];
      const minis = miniIds
        .map(id => (this.unitAssessment?.miniAssessments || []).find(m => m.id === id))
        .filter(Boolean);
      const hasMajor = !!(this.lesson.assessmentLink.majorAssessment && this.unitAssessment?.title);
      const rowCount = minis.length + (hasMajor ? 1 : 0);
      if (rowCount > 0) {
        this._bar(g, 10, y, 12 + rowCount * 5);
        this._text(g, 16, y + 5, 'Assessments', 'studio-section-label');
        let rowY = y + 13;
        for (const mini of minis) {
          this._text(g, 16, rowY, `— ${mini.name}`, 'studio-body-sm');
          rowY += 5;
        }
        if (hasMajor) {
          this._text(g, 16, rowY, `— ${this.unitAssessment.title}`, 'studio-body-sm');
        }
      }
    }

    // Sidebar / notes column
    if (hasSidebar) {
      this._bar(g, 150, 48, 196);
      this._text(g, 156, 55, 'Notes', 'studio-section-label');
      this._wrappedText(g, 156, 62, this.lesson.sidebar, 'studio-body-sm', 40, 2.65, 10);
    }

    // Tier key
    this._rule(g, 10, 246, right);
    this._text(g, 10, 252, 'Tiers', 'studio-section-label');
    let x = 34;
    for (const [tierName, colors] of Object.entries(TIERS)) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', 249.6);
      rect.setAttribute('width', '6');
      rect.setAttribute('height', '1.6');
      rect.setAttribute('fill', colors.line);
      g.appendChild(rect);
      this._text(g, x + 8, 252.6, tierName.charAt(0).toUpperCase() + tierName.slice(1), 'studio-tier-key-label');
      x += 38;
    }

    // Page number
    this._text(g, 180, 290, `page 1 of ${pageCount}`, 'studio-page-number');
  }

  _renderTier(g, tierName) {
    const tier = this.lesson.tiers?.[tierName];
    if (!tier) return;

    const pageCount = this.computePageCount();
    const tierIndex = ['pass', 'intermediate', 'advanced'].indexOf(tierName) + 1;
    const colors = TIERS[tierName];
    g.setAttribute('class', g.getAttribute('class') + ' lesson-tier-page');

    // Left accent bar — tier colour stays confined to this thin strip
    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bar.setAttribute('x', '0');
    bar.setAttribute('y', '0');
    bar.setAttribute('width', '5');
    bar.setAttribute('height', '297');
    bar.setAttribute('fill', colors.line);
    g.appendChild(bar);

    // Masthead: big tier-index numeral + tier name, black rule beneath
    this._text(g, 10, 12, 'Tier', 'studio-eyebrow');
    this._text(g, 10, 32, String(tierIndex), 'studio-numeral');
    this._text(g, 42, 20, tierName.toUpperCase(), 'studio-tier-name');
    this._rule(g, 10, 40, 196);

    let y = 50;

    if (tier.material) {
      this._bar(g, 10, y, 30);
      this._text(g, 16, y + 5, 'Material', 'studio-section-label');
      this._wrappedText(g, 16, y + 11, tier.material, 'studio-body', 178, 3.04, 3);
      y += 38;
    }

    if (tier.studentTask) {
      this._bar(g, 10, y, 30);
      this._text(g, 16, y + 5, 'Task', 'studio-section-label');
      this._wrappedText(g, 16, y + 11, tier.studentTask, 'studio-body', 178, 3.04, 3);
      y += 38;
    }

    if (tier.workspaceLines && tier.workspaceLines > 0) {
      this._text(g, 10, y, 'Workspace', 'studio-section-label');
      y += 8;
      const spacing = (250 - y) / tier.workspaceLines;
      for (let i = 0; i < tier.workspaceLines; i++) {
        const lineY = y + i * spacing;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '10');
        line.setAttribute('y1', lineY);
        line.setAttribute('x2', '196');
        line.setAttribute('y2', lineY);
        line.setAttribute('stroke', 'var(--color-border-light)');
        line.setAttribute('stroke-width', '0.35');
        g.appendChild(line);
      }
    }

    this._text(g, 180, 290, `page ${tierIndex + 1} of ${pageCount}`, 'studio-page-number');
  }

  _createGroup(svg, className) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', className);
    svg.appendChild(g);
    return g;
  }

  _text(g, x, y, text, className = '') {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    if (className) t.setAttribute('class', className);
    t.textContent = String(text || '');
    g.appendChild(t);
  }

  // Wrapped multi-line text (studio grid needs this far more than the old
  // single-line layout did, since sections are now narrower — side-by-side
  // columns, a right-hand notes rail). Returns the number of lines drawn.
  _wrappedText(g, x, y, text, className, maxWidth, fontSizeMm, maxLines) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    if (className) t.setAttribute('class', className);
    const lines = wrapToLines(String(text || ''), maxWidth, fontSizeMm, maxLines);
    const lineHeight = fontSizeMm * 1.5;
    lines.forEach((line, i) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', String(x));
      tspan.setAttribute('dy', i === 0 ? '0' : String(lineHeight));
      tspan.textContent = line;
      t.appendChild(tspan);
    });
    g.appendChild(t);
    return lines.length;
  }

  // Thick left-border accent bar — the studio grid's structural marker for
  // every non-tier section (big idea, curriculum, assessments, notes).
  // Tier colour is deliberately never used here; only the tier key and each
  // tier page's own accent bar carry tier colour, per FR-DS-11.
  _bar(g, x, y, height) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', '1.6');
    rect.setAttribute('height', height);
    rect.setAttribute('fill', 'var(--color-border-strong)');
    g.appendChild(rect);
  }

  // Thin horizontal rule — the studio grid's structural marker for the
  // masthead and the key-example/practice-question columns.
  _rule(g, x1, y, x2) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x1);
    rect.setAttribute('y', y);
    rect.setAttribute('width', x2 - x1);
    rect.setAttribute('height', '0.5');
    rect.setAttribute('fill', 'var(--color-border-strong)');
    g.appendChild(rect);
  }

  setData(updatedLesson) {
    this.lesson = updatedLesson;
  }

  /**
   * markEdited — FR-LPB-13 provenance transition.
   *
   * On the first genuine manual edit to a "generated" lesson, flip
   * provenance to "edited". Once flipped, never flips back. Lessons that
   * are already "manual" or "edited" are left untouched — this method
   * never writes "generated" or "manual" (those are owned by
   * lesson-plan-generator and external creation respectively).
   *
   * @returns {boolean} true if provenance was changed by this call
   */
  markEdited() {
    if (this.lesson && this.lesson.provenance === 'generated') {
      this.lesson.provenance = 'edited';
      return true;
    }
    return false;
  }

  /**
   * applyFieldEdit — apply a manual edit to a lesson field and run the
   * FR-LPB-13 provenance transition before returning the updated lesson
   * for the caller to persist via local-store.
   *
   * Every field-edit handler on this document (big idea binding, sidebar,
   * key example, practice question, assessment links, tier fields) must
   * route through this method so the transition is never missed.
   *
   * @param {string} field - Property name on the lesson to update.
   * @param {*} value - New value for that field.
   * @returns {Object} The updated lesson (also stored as this.lesson).
   */
  applyFieldEdit(field, value) {
    this.lesson[field] = value;
    this.markEdited();
    return this.lesson;
  }

  exportSVG() {
    return '';
  }
}

export function renderLessonPlan(lesson, allLessons, allBigIdeas, allTopics, allNodes, unitAssessment) {
  const pages = [{ type: 'front', pageIndex: 0 }];

  const tiers = lesson.tiers || {};
  for (const tierName of ['pass', 'intermediate', 'advanced']) {
    if (shouldRenderTierPage(tiers[tierName])) {
      pages.push({ type: 'tier', tierName, pageIndex: pages.length });
    }
  }

  const doc = new LessonPlanDocument(lesson, allLessons, allBigIdeas, allTopics, allNodes, unitAssessment);
  return {
    pages,
    renderFn: (pageData, svg) => doc.render(pageData, svg),
    doc
  };
}
