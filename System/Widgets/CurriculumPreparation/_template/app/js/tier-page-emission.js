/**
 * tier-page-emission.js — Shared tier-page emission logic (FR-LPB-4, AD-LPB-1)
 *
 * Implements: INV-DM-33 emptiness test to decide whether a tier page should be rendered.
 * Shared between lesson-plan-document and unit-assessment-document.
 * Single source of truth; imported by both builds, never duplicated.
 */

/**
 * Test whether a tier has content worth rendering as a page.
 *
 * Per INV-DM-33, a tier is empty if ALL of these are true:
 * - tier.material is null or empty string
 * - tier.studentTask is null or empty string
 * - tier.workspaceLines is null or 0
 * - tier.imageRefs[] is empty array (or missing)
 *
 * @param {Object} tier - { material, studentTask, workspaceLines, imageRefs[] }
 * @returns {boolean} True if tier should render (has content); false if skip (empty)
 */
export function shouldRenderTierPage(tier) {
  if (!tier) return false;

  const hasMaterial = tier.material && tier.material.trim().length > 0;
  const hasStudentTask = tier.studentTask && tier.studentTask.trim().length > 0;
  const hasWorkspaceLines = tier.workspaceLines && tier.workspaceLines > 0;
  const hasImages = Array.isArray(tier.imageRefs) && tier.imageRefs.length > 0;

  return hasMaterial || hasStudentTask || hasWorkspaceLines || hasImages;
}
