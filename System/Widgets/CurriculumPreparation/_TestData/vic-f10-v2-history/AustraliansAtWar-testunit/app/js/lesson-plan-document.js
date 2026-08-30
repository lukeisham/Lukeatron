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
    let y = 20;

    // Lesson number
    if (this.lesson.number) {
      this._text(g, 10, y, `Lesson ${this.lesson.number}`, 'lesson-number');
      y += 15;
    }

    // Topic
    const topicId = resolveTopic(this.lesson.id, this.allLessons, this.allBigIdeas);
    const topic = topicId ? this.topicsMap[topicId] : null;
    if (topic) {
      this._text(g, 10, y, topic.title || '', 'topic-label text-secondary');
      y += 15;
    }

    // Big idea box
    const bi = this.bigIdeasMap[this.lesson.bigIdeaId];
    if (bi) {
      const count = this.allLessons.filter(l => l.bigIdeaId === this.lesson.bigIdeaId).length;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '10');
      rect.setAttribute('y', y);
      rect.setAttribute('width', '190');
      rect.setAttribute('height', '18');
      rect.setAttribute('fill', 'var(--color-bg-light)');
      rect.setAttribute('stroke', 'var(--color-border-light)');
      rect.setAttribute('stroke-width', '0.5');
      g.appendChild(rect);

      let biText = bi.title || '(untitled)';
      if (count > 0) biText += ` · ${count} lesson${count !== 1 ? 's' : ''}`;
      this._text(g, 12, y + 13, biText, 'big-idea-name text-tertiary');
      y += 25;
    }

    // Curriculum nodes
    if (this.lesson.nodeIds && this.lesson.nodeIds.length > 0) {
      this._text(g, 10, y, 'Curriculum:', 'section-label');
      y += 8;
      for (const nodeId of this.lesson.nodeIds) {
        const node = this.nodesMap[nodeId];
        if (node) {
          const codeStr = renderCode(node.code || '—', false);
          const text = `${codeStr} ${node.title || ''}`.trim();
          this._text(g, 12, y, text, 'node-citation text-tertiary text-sm');
          y += 6;
        }
      }
      y += 6;
    }

    // Key example & practice question
    if (this.lesson.keyExample) {
      this._text(g, 10, y, 'Key Example:', 'section-label');
      this._text(g, 12, y + 6, this.lesson.keyExample, 'key-example');
      y += 20;
    }

    if (this.lesson.practiceQuestion) {
      this._text(g, 10, y, 'Practice Question:', 'section-label');
      this._text(g, 12, y + 6, this.lesson.practiceQuestion, 'practice-question');
      y += 20;
    }

    // Assessment links
    if (this.lesson.assessmentLink) {
      this._text(g, 10, y, 'Assessments:', 'section-label');
      y += 6;
      if (this.lesson.assessmentLink.miniAssessmentIds) {
        for (const miniId of this.lesson.assessmentLink.miniAssessmentIds) {
          const mini = (this.unitAssessment?.miniAssessments || []).find(m => m.id === miniId);
          if (mini) {
            this._text(g, 12, y, `• ${mini.name}`, 'mini-assessment text-sm');
            y += 5;
          }
        }
      }
      if (this.lesson.assessmentLink.finalAssessment && this.unitAssessment?.title) {
        this._text(g, 12, y, `• ${this.unitAssessment.title}`, 'final-assessment text-sm');
      }
    }

    // Tier key
    y = 220;
    this._text(g, 10, y, 'Tiers:', 'section-label');
    let x = 40;
    for (const [tierName, colors] of Object.entries(TIERS)) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y - 3);
      rect.setAttribute('width', '4');
      rect.setAttribute('height', '4');
      rect.setAttribute('fill', colors.line);
      g.appendChild(rect);
      this._text(g, x + 6, y + 1, tierName.charAt(0).toUpperCase() + tierName.slice(1), 'tier-label text-xs');
      x += 35;
    }

    // Sidebar (if not empty)
    if (this.lesson.sidebar?.trim()) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '130');
      rect.setAttribute('y', '10');
      rect.setAttribute('width', '70');
      rect.setAttribute('height', '190');
      rect.setAttribute('fill', 'var(--color-bg-very-light)');
      rect.setAttribute('stroke', 'var(--color-border-dashed)');
      rect.setAttribute('stroke-width', '0.5');
      rect.setAttribute('stroke-dasharray', '2,2');
      g.appendChild(rect);
      this._text(g, 133, 15, 'Notes:', 'sidebar-label');
      this._text(g, 133, 23, this.lesson.sidebar, 'sidebar-text text-sm');
    }

    // Page number
    this._text(g, 180, 290, `page 1 of ${pageCount}`, 'page-number text-secondary text-sm');
  }

  _renderTier(g, tierName) {
    const tier = this.lesson.tiers?.[tierName];
    if (!tier) return;

    const pageCount = this.computePageCount();
    const tierIndex = ['pass', 'intermediate', 'advanced'].indexOf(tierName) + 1;
    const colors = TIERS[tierName];

    // Left accent bar
    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bar.setAttribute('x', '0');
    bar.setAttribute('y', '0');
    bar.setAttribute('width', '5');
    bar.setAttribute('height', '297');
    bar.setAttribute('fill', colors.line);
    g.appendChild(bar);

    this._text(g, 10, 20, tierName.toUpperCase(), 'tier-name text-md text-bold');

    let y = 35;

    // Material
    if (tier.material) {
      this._text(g, 10, y, 'Material:', 'material-label');
      this._text(g, 12, y + 5, tier.material, 'material-body');
      y += 25;
    }

    // Student task
    if (tier.studentTask) {
      this._text(g, 10, y, 'Task:', 'student-task-label');
      this._text(g, 12, y + 5, tier.studentTask, 'student-task-body');
      y += 25;
    }

    // Workspace lines
    if (tier.workspaceLines && tier.workspaceLines > 0) {
      this._text(g, 10, y, 'Workspace:', 'workspace-label');
      y += 6;
      const spacing = (240 - y) / tier.workspaceLines;
      for (let i = 0; i < tier.workspaceLines; i++) {
        const lineY = y + i * spacing;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '10');
        line.setAttribute('y1', lineY);
        line.setAttribute('x2', '200');
        line.setAttribute('y2', lineY);
        line.setAttribute('stroke', 'var(--color-border-light)');
        line.setAttribute('stroke-width', '0.5');
        g.appendChild(line);
      }
    }

    this._text(g, 180, 290, `page ${tierIndex + 1} of ${pageCount}`, 'page-number text-secondary text-sm');
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
