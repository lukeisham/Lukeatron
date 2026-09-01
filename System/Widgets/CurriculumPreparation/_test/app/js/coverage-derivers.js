// coverage-derivers.js — Pure functions to derive coverage per node (AD-ATB-2)
// Implements: FR-ATB-4 (lesson coverage), FR-ATB-8 (assessment), FR-ATB-9 (topic)
// No UI; pure functions used by arbor-tree and coverage-grid

/**
 * Derive which nodes have at least one lesson serving them.
 * Walks lesson.nodeIds[] fresh on every call; never stored.
 *
 * Implements: INV-DM-12 (derive, don't duplicate).
 * @param {Array} nodes - Unit.nodes[] array
 * @param {Array} lessons - Unit.lessons[] array
 * @returns {Map<string, boolean>} nodeId → true if covered by at least one lesson
 */
export function deriveLessonCoverage(nodes, lessons) {
  const coverage = new Map();

  // Initialize all nodes as uncovered
  for (const node of nodes) {
    coverage.set(node.id, false);
  }

  // Walk every lesson's nodeIds[], mark covered
  if (Array.isArray(lessons)) {
    for (const lesson of lessons) {
      if (Array.isArray(lesson.nodeIds)) {
        for (const nodeId of lesson.nodeIds) {
          if (coverage.has(nodeId)) {
            coverage.set(nodeId, true);
          }
        }
      }
    }
  }

  return coverage;
}

/**
 * Derive assessment coverage per node.
 * Union of unitAssessment.coverage[] and all miniAssessment.coverage[] entries.
 * Groups by nodeId; returns coverage[] arrays per node.
 *
 * Implements: FR-ATB-8 (assessment coverage chips).
 * @param {Array} nodes - Unit.nodes[] array
 * @param {Object} unitAssessment - unit.unitAssessment { majorAssessment?: { coverage: [] }, miniAssessments: [] }
 * @returns {Map<string, Array>} nodeId → coverage[] (each entry: { full|partial, assessmentId?, name? })
 */
export function deriveAssessmentCoverage(nodes, unitAssessment = {}) {
  const coverage = new Map();

  // Initialize all nodes with empty coverage
  for (const node of nodes) {
    coverage.set(node.id, []);
  }

  if (!unitAssessment) {
    return coverage;
  }

  // Process major assessment
  if (unitAssessment.majorAssessment && Array.isArray(unitAssessment.majorAssessment.coverage)) {
    for (const entry of unitAssessment.majorAssessment.coverage) {
      if (entry.nodeId && coverage.has(entry.nodeId)) {
        const arr = coverage.get(entry.nodeId);
        arr.push({
          coverage: entry.coverage || 'full',
          assessmentId: unitAssessment.majorAssessment.id,
          name: unitAssessment.majorAssessment.title || 'Major Assessment'
        });
      }
    }
  }

  // Process mini assessments
  if (Array.isArray(unitAssessment.miniAssessments)) {
    for (const mini of unitAssessment.miniAssessments) {
      if (Array.isArray(mini.coverage)) {
        for (const entry of mini.coverage) {
          if (entry.nodeId && coverage.has(entry.nodeId)) {
            const arr = coverage.get(entry.nodeId);
            arr.push({
              coverage: entry.coverage || 'full',
              assessmentId: mini.id,
              name: mini.title || 'Mini Assessment'
            });
          }
        }
      }
    }
  }

  return coverage;
}

/**
 * Derive topic coverage per node.
 * Union of topic.coverage[] arrays across all topics.
 * Groups by nodeId; returns coverage[] arrays per node.
 *
 * Implements: FR-ATB-9 (topic coverage chips, display-only).
 * @param {Array} nodes - Unit.nodes[] array
 * @param {Array} topics - Unit.topics[] array
 * @returns {Map<string, Array>} nodeId → coverage[] (each entry: { full|partial, topicId?, name? })
 */
export function deriveTopicCoverage(nodes, topics = []) {
  const coverage = new Map();

  // Initialize all nodes with empty coverage
  for (const node of nodes) {
    coverage.set(node.id, []);
  }

  if (!Array.isArray(topics)) {
    return coverage;
  }

  // Walk every topic's coverage[] array
  for (const topic of topics) {
    if (Array.isArray(topic.coverage)) {
      for (const entry of topic.coverage) {
        if (entry.nodeId && coverage.has(entry.nodeId)) {
          const arr = coverage.get(entry.nodeId);
          arr.push({
            coverage: entry.coverage || 'full',
            topicId: topic.id,
            name: topic.title || 'Topic'
          });
        }
      }
    }
  }

  return coverage;
}

/**
 * Derive big-idea coverage per node.
 * Walks bigIdea.coverage[] arrays (already stored, not re-derived).
 * Groups by nodeId; returns coverage[] arrays per node.
 *
 * Called by arbor-tree to render big-idea chips.
 * @param {Array} nodes - Unit.nodes[] array
 * @param {Array} bigIdeas - Unit.bigIdeas[] array (with coverage[] per idea)
 * @returns {Map<string, Array>} nodeId → coverage[] (each entry: { full|partial, bigIdeaId, name })
 */
export function deriveBigIdeaCoverage(nodes, bigIdeas = []) {
  const coverage = new Map();

  // Initialize all nodes with empty coverage
  for (const node of nodes) {
    coverage.set(node.id, []);
  }

  if (!Array.isArray(bigIdeas)) {
    return coverage;
  }

  // Walk every big idea's coverage[] array
  for (const idea of bigIdeas) {
    if (Array.isArray(idea.coverage)) {
      for (const entry of idea.coverage) {
        if (entry.nodeId && coverage.has(entry.nodeId)) {
          const arr = coverage.get(entry.nodeId);
          arr.push({
            coverage: entry.coverage || 'full',
            bigIdeaId: idea.id,
            name: idea.title || 'Big Idea'
          });
        }
      }
    }
  }

  return coverage;
}

/**
 * Check if a node has any coverage of a given type.
 * @param {Array} coverageArray - coverage[] from the Map
 * @param {string} type - 'full' or 'partial'
 * @returns {boolean}
 */
export function hasCoverageType(coverageArray, type) {
  return Array.isArray(coverageArray) && coverageArray.some((e) => e.coverage === type);
}

/**
 * Get all coverage entries of a given type.
 * @param {Array} coverageArray - coverage[] from the Map
 * @param {string} type - 'full' or 'partial'
 * @returns {Array} Filtered coverage entries
 */
export function getCoverageByType(coverageArray, type) {
  if (!Array.isArray(coverageArray)) return [];
  return coverageArray.filter((e) => e.coverage === type);
}
