// traceability.js — Reverse-link index, shared code-rendering component, and navigation
// Wave 5 final build (FR-TRB-1…9, AD-TRB-1…4)
// Exports: buildReverseIndex, renderCode, canDeleteAssessment, findUnreferencedAssessments, NavigationTracker
// Imports: resolveDomain (from domain-resolver), computeGlyphSet, resolveTopic (from bigidea-list)
// Invariant: INV-DM-12 — reverse links are NEVER stored, rebuilt fresh on every load

import { resolveDomain } from './domain-resolver.js';
import { computeGlyphSet, resolveTopic } from './bigidea-list.js';

/**
 * Build the complete reverse-link index from a unit's forward references.
 * INV-DM-12: never persisted, rebuilt fresh on load.
 *
 * @param {Object} unit - The loaded unit.json
 * @returns {Object} Reverse-link index with five Maps
 *   {
 *     nodeToLessons: Map<nodeId, [lessonId, ...]>,
 *     unitAssessmentToLessons: Map<assessmentId, [lessonId, ...]>,
 *     bigIdeaToLessons: Map<bigIdeaId, [lessonId, ...]>,
 *     topicToBigIdeas: Map<topicId, [bigIdeaId, ...]>,
 *     lessonToTopic: Map<lessonId, topicId>
 *   }
 *
 * @throws {Error} If a stored forward reference is dangling (breaks INV-DM-4)
 */
export function buildReverseIndex(unit) {
  if (!unit || typeof unit !== 'object') {
    throw new Error('unit must be a valid unit object');
  }

  const nodeToLessons = new Map();
  const unitAssessmentToLessons = new Map();
  const bigIdeaToLessons = new Map();
  const topicToBigIdeas = new Map();
  const lessonToTopic = new Map();

  // Build helper maps for lookups
  const nodeMap = {};
  const bigIdeaMap = {};
  const topicMap = {};
  const lessonMap = {};
  const assessmentMap = {};

  if (unit.nodes && Array.isArray(unit.nodes)) {
    for (const node of unit.nodes) {
      nodeMap[node.id] = node;
    }
  }

  if (unit.bigIdeas && Array.isArray(unit.bigIdeas)) {
    for (const bi of unit.bigIdeas) {
      bigIdeaMap[bi.id] = bi;
    }
  }

  if (unit.topics && Array.isArray(unit.topics)) {
    for (const topic of unit.topics) {
      topicMap[topic.id] = topic;
    }
  }

  if (unit.lessons && Array.isArray(unit.lessons)) {
    for (const lesson of unit.lessons) {
      lessonMap[lesson.id] = lesson;
    }
  }

  // Map assessments for quick lookup
  if (unit.unitAssessment) {
    if (unit.unitAssessment.majorAssessment) {
      assessmentMap[unit.unitAssessment.id] = unit.unitAssessment.majorAssessment;
    }
    if (unit.unitAssessment.miniAssessments && Array.isArray(unit.unitAssessment.miniAssessments)) {
      for (const mini of unit.unitAssessment.miniAssessments) {
        assessmentMap[mini.id] = mini;
      }
    }
  }

  // Process lessons: extract forward refs and build reverse indices
  if (unit.lessons && Array.isArray(unit.lessons)) {
    for (const lesson of unit.lessons) {
      if (!lesson.id) continue;

      // lesson.nodeIds[] → nodeToLessons
      if (lesson.nodeIds && Array.isArray(lesson.nodeIds)) {
        for (const nodeId of lesson.nodeIds) {
          if (!nodeMap[nodeId]) {
            throw new Error(`Dangling reference: lesson ${lesson.id} references non-existent node ${nodeId} (INV-DM-4 violated)`);
          }
          if (!nodeToLessons.has(nodeId)) {
            nodeToLessons.set(nodeId, []);
          }
          nodeToLessons.get(nodeId).push(lesson.id);
        }
      }

      // lesson.bigIdeaId → bigIdeaToLessons
      if (lesson.bigIdeaId) {
        if (!bigIdeaMap[lesson.bigIdeaId]) {
          throw new Error(`Dangling reference: lesson ${lesson.id} references non-existent bigIdea ${lesson.bigIdeaId} (INV-DM-4, INV-DM-15 violated)`);
        }
        if (!bigIdeaToLessons.has(lesson.bigIdeaId)) {
          bigIdeaToLessons.set(lesson.bigIdeaId, []);
        }
        bigIdeaToLessons.get(lesson.bigIdeaId).push(lesson.id);

        // lesson.bigIdeaId → topic (transitive: bigIdea → topic)
        const bigIdea = bigIdeaMap[lesson.bigIdeaId];
        if (bigIdea) {
          // If this is a top-level big idea, use its topicId
          if (!bigIdea.parentId && bigIdea.topicId) {
            lessonToTopic.set(lesson.id, bigIdea.topicId);
          } else if (bigIdea.parentId) {
            // This is a sub-big idea; walk up to parent
            const parent = bigIdeaMap[bigIdea.parentId];
            if (parent && parent.topicId) {
              lessonToTopic.set(lesson.id, parent.topicId);
            }
          }
        }
      }

      // lesson.assessmentLink → unitAssessmentToLessons
      if (lesson.assessmentLink) {
        // Major assessment link
        if (lesson.assessmentLink.majorAssessment === true) {
          if (!unit.unitAssessment || !unit.unitAssessment.id) {
            throw new Error(`Dangling reference: lesson ${lesson.id} links to major assessment but no majorAssessment exists (INV-DM-4 violated)`);
          }
          const assessmentId = unit.unitAssessment.id;
          if (!unitAssessmentToLessons.has(assessmentId)) {
            unitAssessmentToLessons.set(assessmentId, []);
          }
          unitAssessmentToLessons.get(assessmentId).push(lesson.id);
        }

        // Mini assessment links
        if (lesson.assessmentLink.miniAssessmentIds && Array.isArray(lesson.assessmentLink.miniAssessmentIds)) {
          for (const miniId of lesson.assessmentLink.miniAssessmentIds) {
            if (!unit.unitAssessment || !unit.unitAssessment.miniAssessments) {
              throw new Error(`Dangling reference: lesson ${lesson.id} references mini assessment ${miniId} but no miniAssessments exist (INV-DM-4 violated)`);
            }
            const mini = unit.unitAssessment.miniAssessments.find(m => m.id === miniId);
            if (!mini) {
              throw new Error(`Dangling reference: lesson ${lesson.id} references non-existent mini assessment ${miniId} (INV-DM-4, INV-DM-27 violated)`);
            }
            if (!unitAssessmentToLessons.has(miniId)) {
              unitAssessmentToLessons.set(miniId, []);
            }
            unitAssessmentToLessons.get(miniId).push(lesson.id);
          }
        }
      }
    }
  }

  // Process big ideas: extract topicId → bigIdeas (topic.coverage reverse)
  if (unit.bigIdeas && Array.isArray(unit.bigIdeas)) {
    for (const bi of unit.bigIdeas) {
      if (!bi.id) continue;

      // Only top-level big ideas have topicId
      if (!bi.parentId && bi.topicId) {
        if (!topicMap[bi.topicId]) {
          throw new Error(`Dangling reference: bigIdea ${bi.id} references non-existent topic ${bi.topicId} (INV-DM-4, INV-DM-34 violated)`);
        }
        if (!topicToBigIdeas.has(bi.topicId)) {
          topicToBigIdeas.set(bi.topicId, []);
        }
        topicToBigIdeas.get(bi.topicId).push(bi.id);
      }
    }
  }

  return {
    nodeToLessons,
    unitAssessmentToLessons,
    bigIdeaToLessons,
    topicToBigIdeas,
    lessonToTopic
  };
}

/**
 * Navigation tracker for back affordance (FR-TRB-4).
 * Stores the document and scroll position when a code is clicked,
 * allowing return to that exact position.
 */
export class NavigationTracker {
  constructor() {
    this.history = null;
  }

  /**
   * Save current position before navigation
   * @param {string} documentId - The source document (e.g., 'lesson-plan', 'unit-assessment')
   * @param {number} scrollX - Horizontal scroll position
   * @param {number} scrollY - Vertical scroll position
   */
  savePosition(documentId, scrollX, scrollY) {
    if (typeof documentId !== 'string' || documentId.length === 0) {
      throw new Error('documentId must be a non-empty string');
    }
    if (typeof scrollX !== 'number' || typeof scrollY !== 'number') {
      throw new Error('scrollX and scrollY must be numbers');
    }
    this.history = { documentId, scrollX, scrollY };
  }

  /**
   * Get the saved position (and clear it for single-step back)
   * @returns {Object|null} { documentId, scrollX, scrollY } or null if no history
   */
  getBackPosition() {
    const pos = this.history;
    this.history = null; // Clear after retrieval (single-step back only)
    return pos;
  }
}

/**
 * Render a curriculum code as either a clickable link (edit view) or plain text (print view).
 * Implements FR-TRB-2 (shared code-rendering component), FR-TRB-3, FR-TRB-5.
 * Replaces six earlier builds' ad hoc code rendering (SR-4).
 *
 * @param {string} code - Curriculum code to render (e.g., node code, lesson number, assessment id)
 * @param {boolean} [isClickable=true] - true in edit view (renders clickable link), false in print
 * @param {Object} [options={}] - Optional: { navTracker, codeLinkFn }
 *   navTracker: NavigationTracker instance for back affordance
 *   codeLinkFn: callback(code) when link is clicked (for navigation)
 * @returns {HTMLElement|string} Clickable <a> in edit view, plain <span> in print
 */
export function renderCode(code, isClickable = true, options = {}) {
  if (typeof code !== 'string') {
    throw new Error('code must be a string');
  }

  if (!isClickable) {
    // Print view: return plain text node (no styling, not clickable)
    return code;
  }

  // Edit view: return clickable link element
  const span = document.createElement('a');
  span.className = 'code-link';
  span.textContent = code;
  span.href = '#'; // Prevent default link behavior

  const { navTracker, codeLinkFn } = options;

  span.addEventListener('click', (e) => {
    e.preventDefault();

    // Save position for back affordance (FR-TRB-4)
    if (navTracker) {
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      const documentId = document.body.getAttribute('data-document') || 'unknown';
      navTracker.savePosition(documentId, scrollX, scrollY);
    }

    // Call the navigation callback
    if (codeLinkFn && typeof codeLinkFn === 'function') {
      codeLinkFn(code);
    }
  });

  return span;
}

/**
 * Find all assessments (major and mini) not referenced by any lesson.
 * Implements FR-TRB-7 (unreferenced assessment detection).
 *
 * @param {Object} unit - The loaded unit.json
 * @returns {Array<string>} Array of assessment IDs not referenced by any lesson
 */
export function findUnreferencedAssessments(unit) {
  if (!unit || typeof unit !== 'object') {
    throw new Error('unit must be a valid unit object');
  }

  const unreferenced = [];
  const reverseIndex = buildReverseIndex(unit);

  // Check major assessment
  if (unit.unitAssessment && unit.unitAssessment.id) {
    const majorId = unit.unitAssessment.id;
    if (!reverseIndex.unitAssessmentToLessons.has(majorId)) {
      unreferenced.push(majorId);
    }
  }

  // Check mini assessments
  if (unit.unitAssessment && unit.unitAssessment.miniAssessments) {
    for (const mini of unit.unitAssessment.miniAssessments) {
      if (!reverseIndex.unitAssessmentToLessons.has(mini.id)) {
        unreferenced.push(mini.id);
      }
    }
  }

  return unreferenced;
}

/**
 * Check if an assessment can be deleted, or if lessons still reference it.
 * Implements FR-TRB-8 (deletion refusal pattern), coordinates with unit-assessment-document.
 *
 * @param {string} assessmentId - The assessment to check
 * @param {Object} unit - The loaded unit.json
 * @returns {Object} { canDelete: boolean, blockingLessonIds: [...], message: string }
 */
export function canDeleteAssessment(assessmentId, unit) {
  if (typeof assessmentId !== 'string' || assessmentId.length === 0) {
    throw new Error('assessmentId must be a non-empty string');
  }

  if (!unit || typeof unit !== 'object') {
    throw new Error('unit must be a valid unit object');
  }

  const reverseIndex = buildReverseIndex(unit);
  const blockingLessonIds = reverseIndex.unitAssessmentToLessons.get(assessmentId) || [];

  if (blockingLessonIds.length > 0) {
    // Assessment is referenced; refuse delete
    const lessonNumbers = blockingLessonIds.map(lid => {
      const lesson = unit.lessons?.find(l => l.id === lid);
      return lesson?.number || lid;
    });

    return {
      canDelete: false,
      blockingLessonIds,
      message: `Cannot delete: this assessment is linked by lesson(s) ${lessonNumbers.join(', ')}`
    };
  }

  // No lessons reference this assessment; allow delete
  return {
    canDelete: true,
    blockingLessonIds: [],
    message: null
  };
}
