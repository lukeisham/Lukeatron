/**
 * assessment-tier-page.js — Shared tier page rendering for assessments
 *
 * Renders a single tier page (Pass/Intermediate/Advanced) within an assessment document.
 * Shared between unit-assessment-document and lesson-plan-document.
 * Single source of truth; imported by both builds, never duplicated.
 *
 * Uses TierPage shape: { tier: "pass"|"intermediate"|"advanced", material, studentTask, workspaceLines, imageRefs[] }
 */

import { TIERS } from './document-shell.js';

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
  band.setAttribute('width', '714');
  band.setAttribute('height', '5');
  band.setAttribute('fill', tierInfo.line);
  headerGroup.appendChild(band);

  // Tier label
  const tierLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  tierLabel.setAttribute('x', '50');
  tierLabel.setAttribute('y', '45');
  tierLabel.setAttribute('font-size', '13');
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
    promptLabel.setAttribute('font-size', '10');
    promptLabel.setAttribute('font-weight', 'bold');
    promptLabel.setAttribute('fill', 'var(--color-text-tertiary)');
    promptLabel.setAttribute('class', 'prompt-label');
    promptLabel.textContent = 'Prompt';
    svgElement.appendChild(promptLabel);

    yPos += 15;
    const promptText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    promptText.setAttribute('x', '50');
    promptText.setAttribute('y', yPos);
    promptText.setAttribute('font-size', '11');
    promptText.setAttribute('fill', 'var(--color-text-primary)');
    promptText.setAttribute('class', 'prompt-text');
    promptText.textContent = tierPage.material.substring(0, 200); // Truncate for SVG
    svgElement.appendChild(promptText);
    yPos += 40;
  }

  // Render task if present
  if (tierPage.studentTask) {
    const taskLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    taskLabel.setAttribute('x', '50');
    taskLabel.setAttribute('y', yPos);
    taskLabel.setAttribute('font-size', '10');
    taskLabel.setAttribute('font-weight', 'bold');
    taskLabel.setAttribute('fill', 'var(--color-text-tertiary)');
    taskLabel.setAttribute('class', 'task-label');
    taskLabel.textContent = 'Task';
    svgElement.appendChild(taskLabel);

    yPos += 15;
    const taskText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    taskText.setAttribute('x', '50');
    taskText.setAttribute('y', yPos);
    taskText.setAttribute('font-size', '11');
    taskText.setAttribute('fill', 'var(--color-text-primary)');
    taskText.setAttribute('class', 'task-text');
    taskText.textContent = tierPage.studentTask.substring(0, 200); // Truncate for SVG
    svgElement.appendChild(taskText);
    yPos += 40;
  }

  // Render workspace lines
  if (tierPage.workspaceLines && tierPage.workspaceLines > 0) {
    const spacing = 30; // Pixels between lines
    for (let i = 0; i < tierPage.workspaceLines; i++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '50');
      line.setAttribute('x2', '754');
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
