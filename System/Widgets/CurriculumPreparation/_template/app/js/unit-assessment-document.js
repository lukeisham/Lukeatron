/**
 * unit-assessment-document.js — Assessment document renderer (FR-UAB-1…16)
 *
 * Renders unit assessments (one final + many minis) as 4-page A4 portrait documents.
 * Each assessment: 1 header page + 3 tier pages (Pass/Intermediate/Advanced).
 * Binds to big ideas, links to curriculum nodes, shows referencing lessons.
 */

import { TIERS, DocumentShell, pxToUserUnits } from './document-shell.js';
import { shouldRenderTierPage } from './tier-page-emission.js';
import { renderAssessmentTierPage } from './assessment-tier-page.js';
import { findReferencingLessons, formatLessonCitation } from './assessment-lesson-links.js';
import { renderCode } from './traceability.js';

/**
 * Word-wrap plain text into up to maxLines lines that fit maxWidth (mm) at
 * the given SVG user-unit font size, ellipsising if it still doesn't fit.
 * SVG <text> never wraps on its own (JS-6) — tier prompt/task text is long
 * enough to overrun the page width at the correct (post px->mm) font size,
 * so it must be wrapped manually. Estimate-based, not measured (matches the
 * approach already used in arbor-tree.js and resources-page.js).
 */
function wrapToLines(text, maxWidth, fontSize, maxLines = 2) {
  if (!text) return [''];
  const avgCharWidth = fontSize * 0.55; // rough average glyph width
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

  // If more content remains than fits, ellipsise the last visible line.
  if (lines.length === maxLines) {
    const consumed = lines.join(' ').length;
    if (consumed < text.length) {
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.{3}$/, '...');
    }
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * UnitAssessmentDocument — Page model for assessment rendering
 *
 * @param {Object} unitAssessment - { finalAssessment, miniAssessments[] }
 * @param {Array} allLessons - All lessons (for deriving referencing-lessons list)
 * @param {Array} allBigIdeas - All big ideas (for title lookups)
 * @param {Array} allNodes - All curriculum nodes (for coverage link rendering)
 * @param {string} mode - "final" | "mini"
 * @param {number} miniIndex - Which mini to render (if mode="mini")
 */
export class UnitAssessmentDocument {
  constructor(
    unitAssessment,
    allLessons = [],
    allBigIdeas = [],
    allNodes = [],
    mode = 'final',
    miniIndex = 0
  ) {
    this.unitAssessment = unitAssessment;
    this.allLessons = allLessons;
    this.allBigIdeas = allBigIdeas;
    this.allNodes = allNodes;
    this.mode = mode;
    this.miniIndex = miniIndex;
  }

  /**
   * Get the assessment being rendered (final or one mini).
   */
  getAssessment() {
    if (this.mode === 'final') {
      return this.unitAssessment.finalAssessment;
    } else {
      return this.unitAssessment.miniAssessments[this.miniIndex];
    }
  }

  /**
   * Get the assessment kind ("final" | "mini").
   */
  getAssessmentKind() {
    return this.mode;
  }

  /**
   * Get the assessment ID.
   */
  getAssessmentId() {
    const assessment = this.getAssessment();
    if (this.mode === 'final') {
      return 'final';  // Final assessment doesn't have an ID; use "final" as sentinel
    }
    return assessment ? assessment.id : null;
  }

  /**
   * Render all pages into an SVG.
   * (Called by document-shell for each page.)
   */
  render(svgElement) {
    const assessment = this.getAssessment();
    if (!assessment) return;

    // Page 1: Header page
    this.renderHeaderPage(assessment, svgElement);

    // Pages 2–4: Tier pages.
    // Per the data model, unitAssessment.finalAssessment IS the tier map
    // (pass/intermediate/advanced directly), while each miniAssessment
    // carries an explicit .tiers wrapper. getTierMap() resolves either shape.
    const tierMap = this.getTierMap(assessment);
    for (const tierKey of ['pass', 'intermediate', 'advanced']) {
      const tierData = tierMap[tierKey];
      if (tierData && shouldRenderTierPage(tierData)) {
        this.renderTierPageContent(tierData, tierKey, svgElement);
      }
    }
  }

  /**
   * Resolve the { pass, intermediate, advanced } tier map for an assessment,
   * regardless of whether it's a final assessment (tier map at the top level)
   * or a mini assessment (tier map under .tiers).
   */
  getTierMap(assessment) {
    return assessment.tiers || assessment;
  }

  /**
   * Render the header/binding page.
   */
  renderHeaderPage(assessment, svgElement) {
    // Title
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', '50');
    title.setAttribute('y', '60');
    title.setAttribute('font-size', String(pxToUserUnits(18)));
    title.setAttribute('font-weight', 'bold');
    title.setAttribute('fill', 'var(--color-text-primary)');
    title.setAttribute('class', 'assessment-title');
    if (this.mode === 'final') {
      title.textContent = 'Final Assessment';
    } else {
      title.textContent = assessment.name || 'Mini Assessment';
    }
    svgElement.appendChild(title);

    let yPos = 100;

    // Big idea binding
    const bigIdea = this.allBigIdeas.find(bi => bi.id === assessment.bigIdeaId);
    if (bigIdea) {
      const biLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      biLabel.setAttribute('x', '50');
      biLabel.setAttribute('y', yPos);
      biLabel.setAttribute('font-size', String(pxToUserUnits(10)));
      biLabel.setAttribute('font-weight', 'bold');
      biLabel.setAttribute('fill', 'var(--color-text-tertiary)');
      biLabel.setAttribute('class', 'big-idea-label');
      biLabel.textContent = 'Big Idea';
      svgElement.appendChild(biLabel);

      yPos += 15;
      const biValue = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      biValue.setAttribute('x', '50');
      biValue.setAttribute('y', yPos);
      biValue.setAttribute('font-size', String(pxToUserUnits(12)));
      biValue.setAttribute('fill', 'var(--color-text-primary)');
      biValue.setAttribute('class', 'big-idea-value');
      biValue.textContent = bigIdea.title || '(untitled)';
      svgElement.appendChild(biValue);
      yPos += 30;
    }

    // Coverage links
    if (Array.isArray(assessment.coverage) && assessment.coverage.length > 0) {
      const covLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      covLabel.setAttribute('x', '50');
      covLabel.setAttribute('y', yPos);
      covLabel.setAttribute('font-size', String(pxToUserUnits(10)));
      covLabel.setAttribute('font-weight', 'bold');
      covLabel.setAttribute('fill', 'var(--color-text-tertiary)');
      covLabel.setAttribute('class', 'coverage-label');
      covLabel.textContent = 'Curriculum Coverage';
      svgElement.appendChild(covLabel);
      yPos += 15;

      for (const link of assessment.coverage) {
        const node = this.allNodes.find(n => n.id === link.nodeId);
        const codeStr = node ? renderCode(node.code || node.id, false) : link.nodeId;
        const nodeText = node ? `${codeStr}: ${node.title || ''}` : link.nodeId;
        const covStr = link.coverage === 'full' ? '[Full]' : '[Partial]';
        const text = `${covStr} ${nodeText}`;

        const covEntry = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        covEntry.setAttribute('x', '60');
        covEntry.setAttribute('y', yPos);
        covEntry.setAttribute('font-size', String(pxToUserUnits(10)));
        covEntry.setAttribute('fill', 'var(--color-text-primary)');
        covEntry.setAttribute('class', 'coverage-entry');
        covEntry.textContent = text.substring(0, 100); // Truncate
        svgElement.appendChild(covEntry);
        yPos += 12;
      }
      yPos += 15;
    }

    // Referencing lessons
    const assessmentId = this.getAssessmentId();
    const refLessons = findReferencingLessons(assessmentId, this.mode, this.allLessons);
    if (refLessons.length > 0) {
      const lessonsLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lessonsLabel.setAttribute('x', '50');
      lessonsLabel.setAttribute('y', yPos);
      lessonsLabel.setAttribute('font-size', String(pxToUserUnits(10)));
      lessonsLabel.setAttribute('font-weight', 'bold');
      lessonsLabel.setAttribute('fill', 'var(--color-text-tertiary)');
      lessonsLabel.setAttribute('class', 'lessons-label');
      lessonsLabel.textContent = 'Lessons Using This Assessment';
      svgElement.appendChild(lessonsLabel);
      yPos += 15;

      for (const lesson of refLessons) {
        const citation = formatLessonCitation(lesson);
        const lessonEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lessonEl.setAttribute('x', '60');
        lessonEl.setAttribute('y', yPos);
        lessonEl.setAttribute('font-size', String(pxToUserUnits(10)));
        lessonEl.setAttribute('fill', 'var(--color-text-primary)');
        lessonEl.setAttribute('class', 'lesson-entry');
        lessonEl.textContent = citation.substring(0, 100); // Truncate
        svgElement.appendChild(lessonEl);
        yPos += 12;
      }
      yPos += 15;
    }

    // Matrix pointer (passive citation)
    if (refLessons.length > 0) {
      const matrixLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      matrixLabel.setAttribute('x', '50');
      matrixLabel.setAttribute('y', yPos);
      matrixLabel.setAttribute('font-size', String(pxToUserUnits(10)));
      matrixLabel.setAttribute('fill', 'var(--color-text-tertiary)');
      matrixLabel.setAttribute('class', 'matrix-label');
      matrixLabel.textContent = 'Marked against: Marking matrix (unit level)';
      svgElement.appendChild(matrixLabel);
    }
  }

  /**
   * Render one tier page content.
   */
  renderTierPageContent(tierData, tierKey, svgElement) {
    const tierInfo = TIERS[tierKey];
    if (!tierInfo) return;

    // Colour band
    const band = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    band.setAttribute('x', '40');
    band.setAttribute('y', '20');
    band.setAttribute('width', '150'); // x=40 -> right edge 190mm, within 210mm page width (was 714, a leftover px-scale value)
    band.setAttribute('height', '5');
    band.setAttribute('fill', tierInfo.line);
    svgElement.appendChild(band);

    // Tier name
    const tierLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tierLabel.setAttribute('x', '50');
    tierLabel.setAttribute('y', '45');
    tierLabel.setAttribute('font-size', String(pxToUserUnits(13)));
    tierLabel.setAttribute('font-weight', 'bold');
    tierLabel.setAttribute('fill', tierInfo.ink);
    tierLabel.setAttribute('class', `tier-name tier-${tierKey}`);
    tierLabel.textContent = tierKey.charAt(0).toUpperCase() + tierKey.slice(1);
    svgElement.appendChild(tierLabel);

    let yPos = 70;

    // Render prompt/material
    if (tierData.material) {
      const promptLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      promptLabel.setAttribute('x', '50');
      promptLabel.setAttribute('y', yPos);
      promptLabel.setAttribute('font-size', String(pxToUserUnits(10)));
      promptLabel.setAttribute('font-weight', 'bold');
      promptLabel.setAttribute('fill', 'var(--color-text-tertiary)');
      promptLabel.textContent = 'Prompt';
      svgElement.appendChild(promptLabel);
      yPos += 12;

      const promptFontSize = pxToUserUnits(11);
      const promptText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      promptText.setAttribute('x', '50');
      promptText.setAttribute('y', yPos);
      promptText.setAttribute('font-size', String(promptFontSize));
      promptText.setAttribute('fill', 'var(--color-text-primary)');
      const promptLines = wrapToLines(tierData.material.substring(0, 400), 140, promptFontSize, 2);
      const promptLineHeight = promptFontSize * 1.3;
      promptLines.forEach((line, i) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', '50');
        tspan.setAttribute('dy', i === 0 ? '0' : String(promptLineHeight));
        tspan.textContent = line;
        promptText.appendChild(tspan);
      });
      svgElement.appendChild(promptText);
      yPos += 14 + (promptLines.length - 1) * promptLineHeight;
    }

    // Render task
    if (tierData.studentTask) {
      const taskLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      taskLabel.setAttribute('x', '50');
      taskLabel.setAttribute('y', yPos);
      taskLabel.setAttribute('font-size', String(pxToUserUnits(10)));
      taskLabel.setAttribute('font-weight', 'bold');
      taskLabel.setAttribute('fill', 'var(--color-text-tertiary)');
      taskLabel.textContent = 'Task';
      svgElement.appendChild(taskLabel);
      yPos += 12;

      const taskFontSize = pxToUserUnits(11);
      const taskText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      taskText.setAttribute('x', '50');
      taskText.setAttribute('y', yPos);
      taskText.setAttribute('font-size', String(taskFontSize));
      taskText.setAttribute('fill', 'var(--color-text-primary)');
      const taskLines = wrapToLines(tierData.studentTask.substring(0, 400), 140, taskFontSize, 2);
      const taskLineHeight = taskFontSize * 1.3;
      taskLines.forEach((line, i) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', '50');
        tspan.setAttribute('dy', i === 0 ? '0' : String(taskLineHeight));
        tspan.textContent = line;
        taskText.appendChild(tspan);
      });
      svgElement.appendChild(taskText);
      yPos += 14 + (taskLines.length - 1) * taskLineHeight;
    }

    // Render workspace lines
    if (tierData.workspaceLines && tierData.workspaceLines > 0) {
      const spacing = 30;
      for (let i = 0; i < tierData.workspaceLines; i++) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '50');
        line.setAttribute('x2', '190'); // was 754, a leftover px-scale value; page is 210mm wide
        line.setAttribute('y1', yPos);
        line.setAttribute('y2', yPos);
        line.setAttribute('stroke', 'var(--color-border-medium)');
        line.setAttribute('stroke-width', '0.5');
        svgElement.appendChild(line);
        yPos += spacing;
      }
    }
  }

  /**
   * Update internal data and trigger re-render.
   */
  setData(updatedUnitAssessment) {
    this.unitAssessment = updatedUnitAssessment;
  }

  /**
   * Export SVG source (for testing/debugging).
   */
  exportSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 210 297');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    this.render(svg);
    return svg.outerHTML;
  }
}
