/**
 * assessment-tier-page.js — Shared tier page rendering for assessments
 *
 * Renders a single tier page (Pass/Intermediate/Advanced) within an assessment document.
 * Shared between unit-assessment-document and lesson-plan-document.
 * Single source of truth; imported by both builds, never duplicated.
 *
 * Uses TierPage shape: { tier: "pass"|"intermediate"|"advanced", material, studentTask, workspaceLines, imageRefs[] }
 */

import { TIERS, pxToUserUnits } from './document-shell.js';

/**
 * Word-wrap plain text into up to maxLines lines that fit maxWidth (mm) at
 * the given SVG user-unit font size, ellipsising if it still doesn't fit.
 * SVG <text> never wraps on its own (JS-6). Estimate-based, matching the
 * approach used in arbor-tree.js and resources-page.js.
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

  if (lines.length === maxLines) {
    const consumed = lines.join(' ').length;
    if (consumed < text.length) {
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.{3}$/, '...');
    }
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Append wrapped tspans to an SVG text element and return the vertical
 * space (mm) the wrapped block occupies beyond its first line.
 */
function appendWrappedLines(textEl, text, x, maxWidth, fontSize, maxLines = 2) {
  const lineHeight = fontSize * 1.3;
  const lines = wrapToLines(text, maxWidth, fontSize, maxLines);
  lines.forEach((line, i) => {
    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    tspan.setAttribute('x', String(x));
    tspan.setAttribute('dy', i === 0 ? '0' : String(lineHeight));
    tspan.textContent = line;
    textEl.appendChild(tspan);
  });
  return (lines.length - 1) * lineHeight;
}

/**
 * Render a single tier page into SVG.
 *
 * @param {Object} tierPage - Assessment tier page data
 * @param {string} tierPage.tier - "pass"|"intermediate"|"advanced"
 * @param {string} tierPage.material - Material/prompt text for this tier
 * @param {string} tierPage.studentTask - Student task description
 * @param {number} tierPage.workspaceLines - Number of ruled lines
 * @param {Array} tierPage.imageRefs - Array of {imageId, x, y, width, height}
 * @param {SVGElement} svgElement - SVG to draw into
 * @param {Object} documentShell - DocumentShell instance for renderImage()
 * @param {Object} imagesData - Mapping of imageId -> blob data
 */
export function renderAssessmentTierPage(tierPage, svgElement, documentShell, imagesData = {}) {
  if (!tierPage || !tierPage.tier) return;

  const tierKey = tierPage.tier.toLowerCase();
  const tierInfo = TIERS[tierKey];
  if (!tierInfo) return;

  // Render tier band header (colour swatch + name)
  const headerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  headerGroup.setAttribute('class', `tier-header tier-${tierKey}`);

  // Colour band (top border)
  const band = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  band.setAttribute('x', '40');
  band.setAttribute('y', '20');
  band.setAttribute('width', '150'); // x=40 -> right edge 190mm, within 210mm page width (was 714, a leftover px-scale value)
  band.setAttribute('height', '5');
  band.setAttribute('fill', tierInfo.line);
  headerGroup.appendChild(band);

  // Tier label
  const tierLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  tierLabel.setAttribute('x', '50');
  tierLabel.setAttribute('y', '45');
  tierLabel.setAttribute('font-size', String(pxToUserUnits(13)));
  tierLabel.setAttribute('font-weight', 'bold');
  tierLabel.setAttribute('fill', tierInfo.ink);
  tierLabel.setAttribute('class', `tier-name tier-${tierKey}`);
  tierLabel.textContent = tierKey.charAt(0).toUpperCase() + tierKey.slice(1);
  headerGroup.appendChild(tierLabel);

  svgElement.appendChild(headerGroup);

  // Render prompt/material if present
  let yPos = 70;
  if (tierPage.material) {
    const promptLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    promptLabel.setAttribute('x', '50');
    promptLabel.setAttribute('y', yPos);
    promptLabel.setAttribute('font-size', String(pxToUserUnits(10)));
    promptLabel.setAttribute('font-weight', 'bold');
    promptLabel.setAttribute('fill', 'var(--color-text-tertiary)');
    promptLabel.setAttribute('class', 'prompt-label');
    promptLabel.textContent = 'Prompt';
    svgElement.appendChild(promptLabel);

    yPos += 15;
    const promptText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    promptText.setAttribute('x', '50');
    promptText.setAttribute('y', yPos);
    promptText.setAttribute('font-size', String(pxToUserUnits(11)));
    promptText.setAttribute('fill', 'var(--color-text-primary)');
    promptText.setAttribute('class', 'prompt-text');
    appendWrappedLines(promptText, tierPage.material.substring(0, 400), 50, 140, pxToUserUnits(11));
    svgElement.appendChild(promptText);
    yPos += 40;
  }

  // Render task if present
  if (tierPage.studentTask) {
    const taskLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    taskLabel.setAttribute('x', '50');
    taskLabel.setAttribute('y', yPos);
    taskLabel.setAttribute('font-size', String(pxToUserUnits(10)));
    taskLabel.setAttribute('font-weight', 'bold');
    taskLabel.setAttribute('fill', 'var(--color-text-tertiary)');
    taskLabel.setAttribute('class', 'task-label');
    taskLabel.textContent = 'Task';
    svgElement.appendChild(taskLabel);

    yPos += 15;
    const taskText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    taskText.setAttribute('x', '50');
    taskText.setAttribute('y', yPos);
    taskText.setAttribute('font-size', String(pxToUserUnits(11)));
    taskText.setAttribute('fill', 'var(--color-text-primary)');
    taskText.setAttribute('class', 'task-text');
    appendWrappedLines(taskText, tierPage.studentTask.substring(0, 400), 50, 140, pxToUserUnits(11));
    svgElement.appendChild(taskText);
    yPos += 40;
  }

  // Render workspace lines
  if (tierPage.workspaceLines && tierPage.workspaceLines > 0) {
    const spacing = 30; // Pixels between lines
    for (let i = 0; i < tierPage.workspaceLines; i++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '50');
      line.setAttribute('x2', '190'); // was 754, a leftover px-scale value; page is 210mm wide
      line.setAttribute('y1', yPos);
      line.setAttribute('y2', yPos);
      line.setAttribute('stroke', 'var(--color-border-medium)');
      line.setAttribute('stroke-width', '0.5');
      line.setAttribute('class', 'workspace-line');
      svgElement.appendChild(line);
      yPos += spacing;
    }
  }

  // Render images
  if (Array.isArray(tierPage.imageRefs) && tierPage.imageRefs.length > 0) {
    for (const imgRef of tierPage.imageRefs) {
      if (documentShell && documentShell.renderImage) {
        const blob = imagesData[imgRef.imageId] || null;
        documentShell.renderImage(
          blob,
          imgRef.x,
          imgRef.y,
          imgRef.width,
          imgRef.height,
          svgElement
        );
      }
    }
  }
}
