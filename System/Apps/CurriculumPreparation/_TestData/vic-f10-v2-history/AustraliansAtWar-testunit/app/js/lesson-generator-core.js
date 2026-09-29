/**
 * lesson-generator-core.js — Pure generator logic for lesson creation
 *
 * Implements: FR-LPG-2 through FR-LPG-6
 * - Generate a new lesson from selected nodes + big idea
 * - Regenerate an existing "generated" lesson
 * - Template-driven text composition (never model call per AD-9)
 * - Contiguous numbering (never gaps per INV-DM-32)
 *
 * No DOM, no side effects, no persistence (caller saves via local-store).
 * Throws on guard violations: no nodes selected, no big idea, provenance !== "generated".
 */

import { newId } from './ids.js';

/**
 * Generate a new lesson from selected nodes and big idea.
 *
 * @param {string[]} selectedNodeIds - Node IDs to bind (must be non-empty)
 * @param {string} selectedBigIdeaId - Big idea ID (must be truthy)
 * @param {Object[]} allLessons - All existing lessons (for numbering)
 * @param {Object[]} allNodes - All curriculum nodes (for text composition)
 * @param {Object[]} allBigIdeas - All big ideas (not strictly needed here, but kept for symmetry)
 * @returns {Object} New Lesson record with provenance="generated"
 * @throws {Error} If selectedNodeIds empty, selectedBigIdeaId falsy, or inputs invalid
 */
export function generateLesson(
  selectedNodeIds,
  selectedBigIdeaId,
  allLessons,
  allNodes,
  allBigIdeas
) {
  // Guard: nodes required (FR-LPG-1, INV-DM-15)
  if (!Array.isArray(selectedNodeIds) || selectedNodeIds.length === 0) {
    throw new Error('At least one curriculum node must be selected');
  }

  // Guard: big idea required (FR-LPG-1, INV-DM-15)
  if (!selectedBigIdeaId || typeof selectedBigIdeaId !== 'string') {
    throw new Error('A big idea must be selected');
  }

  // Guard: allLessons array required
  if (!Array.isArray(allLessons)) {
    throw new Error('allLessons must be an array');
  }

  // Guard: allNodes array required
  if (!Array.isArray(allNodes)) {
    throw new Error('allNodes must be an array');
  }

  // Compute next contiguous number (FR-LPG-2, INV-DM-32)
  const nextNumber =
    allLessons.length > 0
      ? Math.max(...allLessons.map((l) => l.number || 0)) + 1
      : 1;

  // Build nodeMap for text composition
  const nodeMap = {};
  for (const node of allNodes) {
    if (node.id) {
      nodeMap[node.id] = node;
    }
  }

  // Compose keyExample and practiceQuestion from selected nodes (FR-LPG-5, FR-LPG-11)
  const keyExample = _composeText(selectedNodeIds, nodeMap, 'keyExample');
  const practiceQuestion = _composeText(
    selectedNodeIds,
    nodeMap,
    'practiceQuestion'
  );

  // Create new lesson record (FR-LPG-3, FR-LPG-4, FR-LPG-6)
  const lesson = {
    id: newId('les-'),
    number: nextNumber,
    nodeIds: [...selectedNodeIds], // Copy array
    bigIdeaId: selectedBigIdeaId,
    keyExample: keyExample,
    practiceQuestion: practiceQuestion,
    assessmentLink: {
      miniAssessmentIds: [],
      majorAssessment: false,
      note: null
    },
    tiers: {
      pass: {
        material: '',
        studentTask: '',
        workspaceLines: 0,
        imageRefs: []
      },
      intermediate: {
        material: '',
        studentTask: '',
        workspaceLines: 0,
        imageRefs: []
      },
      advanced: {
        material: '',
        studentTask: '',
        workspaceLines: 0,
        imageRefs: []
      }
    },
    sidebar: null,
    completed: false,
    date: null,
    lessonPeriod: null,
    provenance: 'generated', // FR-LPG-4: always "generated" on create
    bigIdeaNote: null,
    imageRefs: []
  };

  return lesson;
}

/**
 * Regenerate an existing lesson by replacing mutable fields.
 *
 * Only allowed if lesson.provenance === "generated" (FR-LPG-7).
 * Replaces: nodeIds, bigIdeaId, keyExample, practiceQuestion.
 * Leaves unchanged: number, tiers, sidebar, assessmentLink, imageRefs, date, lessonPeriod, completed, provenance, bigIdeaNote.
 *
 * @param {string} lessonId - Lesson ID to regenerate
 * @param {string[]} selectedNodeIds - New selected node IDs
 * @param {string} selectedBigIdeaId - New big idea ID
 * @param {Object[]} allLessons - All lessons (to find the one to update)
 * @param {Object[]} allNodes - All curriculum nodes (for text composition)
 * @param {Object[]} allBigIdeas - All big ideas (kept for symmetry)
 * @returns {Object} Updated Lesson record
 * @throws {Error} If lesson not found, provenance !== "generated", or guards fail
 */
export function regenerateLesson(
  lessonId,
  selectedNodeIds,
  selectedBigIdeaId,
  allLessons,
  allNodes,
  allBigIdeas
) {
  // Guard: nodes required
  if (!Array.isArray(selectedNodeIds) || selectedNodeIds.length === 0) {
    throw new Error('At least one curriculum node must be selected');
  }

  // Guard: big idea required
  if (!selectedBigIdeaId || typeof selectedBigIdeaId !== 'string') {
    throw new Error('A big idea must be selected');
  }

  // Guard: allLessons array required
  if (!Array.isArray(allLessons)) {
    throw new Error('allLessons must be an array');
  }

  // Guard: allNodes array required
  if (!Array.isArray(allNodes)) {
    throw new Error('allNodes must be an array');
  }

  // Find the lesson to regenerate
  const lesson = allLessons.find((l) => l.id === lessonId);
  if (!lesson) {
    throw new Error(`Lesson ${lessonId} not found`);
  }

  // Guard: provenance must be "generated" (AD-LPG-2, FR-LPG-7)
  if (lesson.provenance !== 'generated') {
    throw new Error(
      `Cannot regenerate lesson with provenance="${lesson.provenance}". Only lessons with provenance="generated" can be regenerated.`
    );
  }

  // Build nodeMap for text composition
  const nodeMap = {};
  for (const node of allNodes) {
    if (node.id) {
      nodeMap[node.id] = node;
    }
  }

  // Compose new text
  const keyExample = _composeText(selectedNodeIds, nodeMap, 'keyExample');
  const practiceQuestion = _composeText(
    selectedNodeIds,
    nodeMap,
    'practiceQuestion'
  );

  // Update only mutable fields (FR-LPG-7)
  const updated = {
    ...lesson, // Spread existing
    nodeIds: [...selectedNodeIds],
    bigIdeaId: selectedBigIdeaId,
    keyExample: keyExample,
    practiceQuestion: practiceQuestion
    // number, tiers, sidebar, assessmentLink, imageRefs, date, lessonPeriod, completed, provenance, bigIdeaNote unchanged
  };

  return updated;
}

/**
 * Compose keyExample or practiceQuestion text from selected nodes.
 *
 * Single node: direct quote/adaptation of node.text.
 * Multiple nodes: concatenate each node's text, separated by node code (FR-LPG-11).
 * Fallback: use node.title if node.text is blank.
 * Never paraphrase or summarise (AD-LPG-3).
 *
 * @private
 * @param {string[]} selectedNodeIds - Node IDs to compose from
 * @param {Object} nodeMap - Map of node.id → Node
 * @param {string} fieldName - For debug messages only (not rendered)
 * @returns {string} Composed text (never blank if nodes exist)
 */
function _composeText(selectedNodeIds, nodeMap, fieldName) {
  const parts = [];

  for (const nodeId of selectedNodeIds) {
    const node = nodeMap[nodeId];
    if (!node) {
      continue; // Skip missing nodes
    }

    // Use node.text if available, fallback to node.title
    const content = (node.text || '').trim() || (node.title || '').trim();

    if (content) {
      // For multiple nodes, prefix with node code (FR-LPG-11)
      if (selectedNodeIds.length > 1 && node.code) {
        parts.push(`**${node.code}:** ${content}`);
      } else {
        parts.push(content);
      }
    }
  }

  // Join with double newline for readability (FR-LPG-11)
  return parts.length > 0 ? parts.join('\n\n') : '(No text provided)';
}
