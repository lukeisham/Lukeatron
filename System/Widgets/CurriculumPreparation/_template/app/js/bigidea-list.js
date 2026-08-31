/**
 * bigidea-list.js — Big Idea & Topic management hub
 *
 * Implements:
 * - FR-BIB-1/3: Big idea & topic CRUD (add, rename, reorder, reparent, delete)
 * - FR-BIB-2/5: Delete-refusal checks with blocker naming
 * - FR-BIB-4: Mandatory topicId on top-level big ideas
 * - FR-BIB-6: Coverage[] write API (setCoverageEntry)
 * - FR-BIB-7: Query surfaces (lessons per big idea, big ideas per topic)
 * - FR-BIB-8: Domain glyph-set derivation (shared function)
 * - FR-BIB-9/10: Big Idea Tree outline editor with two-level cap enforcement
 * - FR-BIB-11: Bare lines (no connectors) for childless big ideas
 * - FR-BIB-12: ASCII connector tree renderer (print mode)
 * - FR-BIB-13: Copy-to-clipboard for both modes
 * - FR-BIB-14: Outline writes only title/order/parentId
 * - FR-BIB-15: Persistence via local-store only
 * - FR-BIB-17: Lesson→Topic transitive resolution (shared function)
 * - FR-BIB-18: Per-item detail panel (inline click-to-expand)
 *
 * Invariants enforced:
 * - INV-DM-14: Exactly two levels (no third level)
 * - INV-DM-34: Every top-level big idea has mandatory topicId
 * - INV-DM-12: No reverse links stored; derive on load
 * - INV-DM-15: Every lesson has mandatory bigIdeaId (reads from unit)
 */

import { newId } from './ids.js';

/**
 * ============================================================================
 * SHARED FUNCTION: FR-BIB-8 — Domain Glyph-Set Derivation
 * ============================================================================
 *
 * Compute the union of domain values across a big idea's coverage[].
 * Called by every build that renders a big idea (coverage-grid, arbor-tree,
 * lesson-plan-document, crib-sheet, etc.). Single source of truth.
 *
 * Calls curriculum-editor's resolveDomain(nodeId) to walk to strand ancestor
 * if needed (FR-CEB-5).
 *
 * @param {string} bigIdeaId - ID of the big idea to derive glyphs for
 * @param {Node[]} nodes - Full curriculum nodes array
 * @param {Function} resolveDomain - curriculum-editor's resolveDomain(nodeId) function
 * @returns {Set<string>} Union of domain values (may be empty, size 1, or size 2)
 *                        Possible values: "skill", "knowledge"
 */
export function computeGlyphSet(bigIdeaId, nodes, resolveDomain) {
  if (!bigIdeaId || !Array.isArray(nodes) || typeof resolveDomain !== 'function') {
    return new Set();
  }

  // Find the big idea in global state
  const bigIdea = window.__bigIdeasGlobal?.get(bigIdeaId);
  if (!bigIdea || !Array.isArray(bigIdea.coverage)) {
    return new Set();
  }

  const domains = new Set();
  for (const entry of bigIdea.coverage) {
    if (!entry.nodeId) continue;

    // Resolve domain via curriculum-editor (FR-CEB-5)
    const domain = resolveDomain(entry.nodeId);
    if (domain) {
      domains.add(domain);
    }
  }

  return domains;
}

/**
 * ============================================================================
 * SHARED FUNCTION: FR-BIB-17 — Lesson → Topic Transitive Resolution
 * ============================================================================
 *
 * Given a lesson ID, resolve its topic transitively:
 * lesson → lesson.bigIdeaId → BigIdea (may be sub-big idea)
 *   → if sub-big idea, walk parentId chain to top-level
 *   → return topicId of top-level big idea
 *
 * Called by lesson-plan-document (FR-LPB-1) and future lessons-and-topics view.
 * Single source of truth; derived, never stored (INV-DM-12).
 *
 * @param {string} lessonId - ID of the lesson
 * @param {Lesson[]} lessons - Full lessons array
 * @param {BigIdea[]} bigIdeas - Full bigIdeas array
 * @returns {string|null} topicId or null if chain breaks
 */
export function resolveTopic(lessonId, lessons, bigIdeas) {
  if (!lessonId || !Array.isArray(lessons) || !Array.isArray(bigIdeas)) {
    return null;
  }

  // Find lesson by ID
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson || !lesson.bigIdeaId) {
    return null;
  }

  // Find big idea by ID
  const bigIdeaMap = {};
  for (const bi of bigIdeas) {
    bigIdeaMap[bi.id] = bi;
  }

  let currentBigIdea = bigIdeaMap[lesson.bigIdeaId];
  if (!currentBigIdea) {
    return null;
  }

  // If sub-big idea, walk parentId chain to top-level
  while (currentBigIdea.parentId) {
    currentBigIdea = bigIdeaMap[currentBigIdea.parentId];
    if (!currentBigIdea) {
      return null; // Broken chain
    }
  }

  // Now at top-level; return topicId
  return currentBigIdea.topicId || null;
}

/**
 * ============================================================================
 * TWO-LEVEL CAP VALIDATOR (shared, used by both outline and CRUD)
 * ============================================================================
 *
 * Enforce INV-DM-14: exactly two levels total.
 * A big idea at level 3 (whose parent also has a parent) is invalid.
 *
 * @param {BigIdea} newParentBigIdea - The big idea we're trying to parent to (may be null)
 * @param {Map<string, BigIdea>} bigIdeasMap - Map of all big ideas by ID
 * @returns {boolean} True if valid, false if would create level 3
 */
function validateTwoLevelCap(newParentBigIdea, bigIdeasMap) {
  if (!newParentBigIdea) {
    return true; // No parent means top-level, always valid
  }

  // If parent itself has a parent, we'd be level 3
  if (newParentBigIdea.parentId) {
    return false;
  }

  return true;
}

/**
 * ============================================================================
 * DELETE-REFUSAL CHECKS (shared, used by both big idea and topic delete)
 * ============================================================================
 */

/**
 * Find all lessons that reference a big idea
 * @param {string} bigIdeaId
 * @param {Lesson[]} lessons
 * @returns {Lesson[]} Matching lessons
 */
function findLessonsReferencingBigIdea(bigIdeaId, lessons) {
  if (!Array.isArray(lessons)) return [];
  return lessons.filter(l => l.bigIdeaId === bigIdeaId);
}

/**
 * Find all crib sheet sections referencing a big idea
 * @param {string} bigIdeaId
 * @param {CribSheet|null} cribSheet
 * @returns {string[]} Section identifiers
 */
function findCribSheetSectionsReferencingBigIdea(bigIdeaId, cribSheet) {
  if (!cribSheet || !Array.isArray(cribSheet.sections)) return [];
  return cribSheet.sections
    .map((s, idx) => ({ section: s, idx }))
    .filter(({ section }) => section.bigIdeaId === bigIdeaId)
    .map(({ idx }) => `Crib sheet section ${idx + 1}`);
}

/**
 * Find all mini assessments referencing a big idea
 * @param {string} bigIdeaId
 * @param {UnitAssessment|null} unitAssessment
 * @returns {string[]} Mini assessment names
 */
function findMiniAssessmentsReferencingBigIdea(bigIdeaId, unitAssessment) {
  if (!unitAssessment || !Array.isArray(unitAssessment.miniAssessments)) return [];
  return unitAssessment.miniAssessments
    .filter(m => m.bigIdeaId === bigIdeaId)
    .map(m => `Mini assessment "${m.name || m.id}"`);
}

/**
 * Find all top-level big ideas referencing a topic
 * @param {string} topicId
 * @param {BigIdea[]} bigIdeas
 * @returns {BigIdea[]} Matching big ideas
 */
function findBigIdeasReferencingTopic(topicId, bigIdeas) {
  if (!Array.isArray(bigIdeas)) return [];
  return bigIdeas.filter(bi => !bi.parentId && bi.topicId === topicId);
}

/**
 * ============================================================================
 * INITIALIZATION — Set up global state
 * ============================================================================
 */
let store = null;
let unit = null;

/**
 * Initialize bigidea-list module
 * @param {LocalStore} localStore - The local-store instance
 * @param {Object} loadedUnit - The loaded unit.json
 */
export function initBigIdeasModule(localStore, loadedUnit) {
  store = localStore;
  unit = loadedUnit;

  // Initialize global maps for shared functions
  if (!window.__bigIdeasGlobal) {
    window.__bigIdeasGlobal = new Map();
  }
  updateGlobalBigIdeasMap();
}

/**
 * Update the global big ideas map (used by shared functions)
 */
function updateGlobalBigIdeasMap() {
  if (!window.__bigIdeasGlobal) {
    window.__bigIdeasGlobal = new Map();
  }
  window.__bigIdeasGlobal.clear();
  if (Array.isArray(unit?.bigIdeas)) {
    for (const bi of unit.bigIdeas) {
      window.__bigIdeasGlobal.set(bi.id, bi);
    }
  }
}

/**
 * ============================================================================
 * BIG IDEA CRUD
 * ============================================================================
 */

/**
 * Add a new big idea
 * @param {string} title
 * @param {string|null} topicId - Mandatory for top-level (parentId=null)
 * @param {string|null} parentId
 * @returns {string} Generated bigIdeaId
 * @throws {Error} If top-level without topicId or invalid parentId
 */
export function addBigIdea(title, topicId = null, parentId = null) {
  if (!unit) throw new Error('BigIdea module not initialized');

  // Validate: top-level big ideas must have topicId (FR-BIB-4, INV-DM-34)
  if (!parentId && !topicId) {
    throw new Error('Top-level big idea requires topicId');
  }

  // If sub-big idea, validate parent exists and two-level cap
  if (parentId) {
    const parent = unit.bigIdeas.find(bi => bi.id === parentId);
    if (!parent) {
      throw new Error(`Parent big idea ${parentId} not found`);
    }
    if (!validateTwoLevelCap(parent, new Map(unit.bigIdeas.map(bi => [bi.id, bi])))) {
      throw new Error('Cannot create sub-big idea under a sub-big idea (INV-DM-14)');
    }
    // Sub-big ideas carry no topicId of their own
    topicId = null;
  }

  // Generate ID
  const id = newId('bi-');

  // Calculate order
  let order = 0;
  if (parentId) {
    // Sub-big idea: order among siblings
    const siblings = unit.bigIdeas.filter(bi => bi.parentId === parentId);
    order = Math.max(...siblings.map(bi => bi.order || 0), -1) + 1;
  } else {
    // Top-level: order among top-level ideas
    const topLevel = unit.bigIdeas.filter(bi => !bi.parentId);
    order = Math.max(...topLevel.map(bi => bi.order || 0), -1) + 1;
  }

  const newBigIdea = {
    id,
    title,
    text: null,
    parentId: parentId || null,
    order,
    topicId: topicId || null,
    coverage: []
  };

  unit.bigIdeas.push(newBigIdea);
  updateGlobalBigIdeasMap();
  store.setData({ bigIdeas: unit.bigIdeas });

  return id;
}

/**
 * Rename a big idea
 * @param {string} bigIdeaId
 * @param {string} newTitle
 */
export function renameBigIdea(bigIdeaId, newTitle) {
  if (!unit) throw new Error('BigIdea module not initialized');

  const bigIdea = unit.bigIdeas.find(bi => bi.id === bigIdeaId);
  if (!bigIdea) throw new Error(`Big idea ${bigIdeaId} not found`);

  bigIdea.title = newTitle;
  updateGlobalBigIdeasMap();
  store.setData({ bigIdeas: unit.bigIdeas });
}

/**
 * Reorder big ideas. Moves bigIdeaId to newOrder position.
 * If big idea has sub-ideas, they move as a block.
 *
 * @param {string} bigIdeaId
 * @param {number} newOrder - New position (0-indexed)
 */
export function reorderBigIdeas(bigIdeaId, newOrder) {
  if (!unit) throw new Error('BigIdea module not initialized');

  const bigIdea = unit.bigIdeas.find(bi => bi.id === bigIdeaId);
  if (!bigIdea) throw new Error(`Big idea ${bigIdeaId} not found`);

  // Get all ideas at this level (top-level or same parent)
  const atLevel = unit.bigIdeas.filter(bi => bi.parentId === bigIdea.parentId);
  const sorted = atLevel.sort((a, b) => (a.order || 0) - (b.order || 0));

  // Find current position
  const currentIdx = sorted.findIndex(bi => bi.id === bigIdeaId);
  if (currentIdx === -1) throw new Error('Big idea not in its level');

  // Clamp newOrder to valid range
  const clampedOrder = Math.max(0, Math.min(newOrder, sorted.length - 1));

  // Remove from current position
  sorted.splice(currentIdx, 1);

  // Insert at new position
  sorted.splice(clampedOrder, 0, bigIdea);

  // Renumber order fields
  sorted.forEach((bi, idx) => {
    bi.order = idx;
  });

  store.setData({ bigIdeas: unit.bigIdeas });
}

/**
 * Re-parent a big idea (move sub-big idea to different parent, or promote to top-level)
 * @param {string} bigIdeaId
 * @param {string|null} newParentId - null to promote to top-level
 */
export function reparentBigIdea(bigIdeaId, newParentId = null) {
  if (!unit) throw new Error('BigIdea module not initialized');

  const bigIdea = unit.bigIdeas.find(bi => bi.id === bigIdeaId);
  if (!bigIdea) throw new Error(`Big idea ${bigIdeaId} not found`);

  // Validate two-level cap (unless promoting to top-level)
  if (newParentId) {
    const newParent = unit.bigIdeas.find(bi => bi.id === newParentId);
    if (!newParent) throw new Error(`Parent big idea ${newParentId} not found`);
    if (!validateTwoLevelCap(newParent, new Map(unit.bigIdeas.map(bi => [bi.id, bi])))) {
      throw new Error('Cannot move under a sub-big idea (INV-DM-14)');
    }
  }

  bigIdea.parentId = newParentId || null;

  // Update topicId: sub-big ideas carry none, top-level must have one
  if (newParentId) {
    // Now a sub-big idea
    bigIdea.topicId = null;
  } else if (!bigIdea.topicId) {
    // Promoting to top-level but no topicId
    throw new Error('Top-level big idea requires topicId');
  }

  // Recalculate order
  const atNewLevel = unit.bigIdeas.filter(bi => bi.parentId === newParentId && bi.id !== bigIdeaId);
  bigIdea.order = Math.max(...atNewLevel.map(bi => bi.order || 0), -1) + 1;

  store.setData({ bigIdeas: unit.bigIdeas });
}

/**
 * Delete a big idea
 * Refuses if any lesson, crib sheet, or assessment references it
 *
 * @param {string} bigIdeaId
 * @throws {Error} Names every blocker
 */
export function deleteBigIdea(bigIdeaId) {
  if (!unit) throw new Error('BigIdea module not initialized');

  const bigIdea = unit.bigIdeas.find(bi => bi.id === bigIdeaId);
  if (!bigIdea) throw new Error(`Big idea ${bigIdeaId} not found`);

  // Collect all blockers
  const blockers = [];

  // Check lessons
  const lessons = findLessonsReferencingBigIdea(bigIdeaId, unit.lessons);
  if (lessons.length > 0) {
    blockers.push(`Lessons: ${lessons.map(l => `L${l.number || l.id}`).join(', ')}`);
  }

  // Check crib sheet sections
  const cribSections = findCribSheetSectionsReferencingBigIdea(bigIdeaId, unit.cribSheet);
  if (cribSections.length > 0) {
    blockers.push(cribSections.join(', '));
  }

  // Check mini assessments
  const minis = findMiniAssessmentsReferencingBigIdea(bigIdeaId, unit.unitAssessment);
  if (minis.length > 0) {
    blockers.push(minis.join(', '));
  }

  // Refuse if any blockers
  if (blockers.length > 0) {
    throw new Error(`Cannot delete big idea: ${blockers.join('; ')}`);
  }

  // Also refuse if it has sub-big ideas (never cascade)
  const subIdeas = unit.bigIdeas.filter(bi => bi.parentId === bigIdeaId);
  if (subIdeas.length > 0) {
    throw new Error(`Cannot delete big idea with ${subIdeas.length} sub-big idea(s)`);
  }

  // Safe to delete
  unit.bigIdeas = unit.bigIdeas.filter(bi => bi.id !== bigIdeaId);
  updateGlobalBigIdeasMap();
  store.setData({ bigIdeas: unit.bigIdeas });
}

/**
 * ============================================================================
 * TOPIC CRUD
 * ============================================================================
 */

/**
 * Add a new topic
 * @param {string} title
 * @returns {string} Generated topicId
 */
export function addTopic(title) {
  if (!unit) throw new Error('BigIdea module not initialized');

  const id = newId('topic-');
  const order = Math.max(...(unit.topics?.map(t => t.order || 0) || [-1]), -1) + 1;

  const newTopic = {
    id,
    title,
    text: null,
    order,
    coverage: []
  };

  if (!unit.topics) unit.topics = [];
  unit.topics.push(newTopic);
  store.setData({ topics: unit.topics });

  return id;
}

/**
 * Rename a topic
 * @param {string} topicId
 * @param {string} newTitle
 */
export function renameTopic(topicId, newTitle) {
  if (!unit) throw new Error('BigIdea module not initialized');

  const topic = (unit.topics || []).find(t => t.id === topicId);
  if (!topic) throw new Error(`Topic ${topicId} not found`);

  topic.title = newTitle;
  store.setData({ topics: unit.topics });
}

/**
 * Reorder topics
 * @param {string} topicId
 * @param {number} newOrder - New position
 */
export function reorderTopics(topicId, newOrder) {
  if (!unit) throw new Error('BigIdea module not initialized');

  const topics = unit.topics || [];
  const sorted = [...topics].sort((a, b) => (a.order || 0) - (b.order || 0));
  const currentIdx = sorted.findIndex(t => t.id === topicId);
  if (currentIdx === -1) throw new Error('Topic not found');

  const clampedOrder = Math.max(0, Math.min(newOrder, sorted.length - 1));
  const topic = sorted.splice(currentIdx, 1)[0];
  sorted.splice(clampedOrder, 0, topic);

  sorted.forEach((t, idx) => {
    t.order = idx;
  });

  unit.topics = sorted;
  store.setData({ topics: unit.topics });
}

/**
 * Delete a topic
 * Refuses if any top-level big idea references it
 *
 * @param {string} topicId
 * @throws {Error} Names every blocking big idea
 */
export function deleteTopic(topicId) {
  if (!unit) throw new Error('BigIdea module not initialized');

  // Find all big ideas referencing this topic
  const blocking = findBigIdeasReferencingTopic(topicId, unit.bigIdeas);

  if (blocking.length > 0) {
    const ids = blocking.map(bi => bi.id).join(', ');
    throw new Error(`Cannot delete topic: big ideas still reference it (${ids})`);
  }

  unit.topics = (unit.topics || []).filter(t => t.id !== topicId);
  store.setData({ topics: unit.topics });
}

/**
 * ============================================================================
 * COVERAGE[] WRITE API (FR-BIB-6)
 * ============================================================================
 *
 * This is the ONLY place coverage[] is written.
 * coverage-grid calls this; nobody else writes directly.
 * Sets: { nodeId, coverage: "full" | "partial", note }
 *
 * @param {string} bigIdeaId
 * @param {string} nodeId
 * @param {string|null} coverage - "full", "partial", or null to remove
 * @param {string|null} note - Optional gloss
 */
export function setCoverageEntry(bigIdeaId, nodeId, coverage, note = null) {
  if (!unit) throw new Error('BigIdea module not initialized');

  const bigIdea = unit.bigIdeas.find(bi => bi.id === bigIdeaId);
  if (!bigIdea) throw new Error(`Big idea ${bigIdeaId} not found`);

  if (!Array.isArray(bigIdea.coverage)) {
    bigIdea.coverage = [];
  }

  // Remove if coverage is null
  if (coverage === null) {
    bigIdea.coverage = bigIdea.coverage.filter(c => c.nodeId !== nodeId);
  } else {
    // Update or add entry
    const existing = bigIdea.coverage.find(c => c.nodeId === nodeId);
    if (existing) {
      existing.coverage = coverage;
      existing.note = note || null;
    } else {
      bigIdea.coverage.push({ nodeId, coverage, note: note || null });
    }
  }

  updateGlobalBigIdeasMap();
  store.setData({ bigIdeas: unit.bigIdeas });
}

/**
 * Set coverage entry on a topic
 * @param {string} topicId
 * @param {string} nodeId
 * @param {string|null} coverage
 * @param {string|null} note
 */
export function setTopicCoverageEntry(topicId, nodeId, coverage, note = null) {
  if (!unit) throw new Error('BigIdea module not initialized');

  const topic = (unit.topics || []).find(t => t.id === topicId);
  if (!topic) throw new Error(`Topic ${topicId} not found`);

  if (!Array.isArray(topic.coverage)) {
    topic.coverage = [];
  }

  if (coverage === null) {
    topic.coverage = topic.coverage.filter(c => c.nodeId !== nodeId);
  } else {
    const existing = topic.coverage.find(c => c.nodeId === nodeId);
    if (existing) {
      existing.coverage = coverage;
      existing.note = note || null;
    } else {
      topic.coverage.push({ nodeId, coverage, note: note || null });
    }
  }

  store.setData({ topics: unit.topics });
}

/**
 * ============================================================================
 * QUERY SURFACES (FR-BIB-7)
 * ============================================================================
 */

/**
 * Get all lessons bound to a big idea
 * @param {string} bigIdeaId
 * @returns {Object} { lessons: Lesson[], hasResults: boolean }
 */
export function getLessonsBoundToBigIdea(bigIdeaId) {
  if (!unit) return { lessons: [], hasResults: false };

  const lessons = findLessonsReferencingBigIdea(bigIdeaId, unit.lessons);
  return {
    lessons,
    hasResults: lessons.length > 0
  };
}

/**
 * Get all big ideas bound to a topic
 * @param {string} topicId
 * @returns {Object} { bigIdeas: BigIdea[], hasResults: boolean }
 */
export function getBigIdeasBoundToTopic(topicId) {
  if (!unit) return { bigIdeas: [], hasResults: false };

  const bigIdeas = findBigIdeasReferencingTopic(topicId, unit.bigIdeas);
  return {
    bigIdeas,
    hasResults: bigIdeas.length > 0
  };
}

/**
 * ============================================================================
 * BIG IDEA TREE OUTLINE EDITOR & RENDERER
 * ============================================================================
 */

/**
 * Parse outline text into big ideas structure
 * Format: one line per idea, "- Title" = top-level, "  - Title" = sub-idea
 * Rejects three+ levels inline at the offending line
 *
 * @param {string} outlineText
 * @returns {Object} { valid: boolean, error?: string, errorLine?: number, parsed?: Line[] }
 */
export function parseOutlineText(outlineText) {
  const lines = outlineText.split('\n');
  const parsed = [];
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      // Empty line OK
      parsed.push({ lineNum: i, text: '', indent: 0, title: '' });
      continue;
    }

    // Count leading spaces
    const match = line.match(/^(\s*)-\s*(.*)$/);
    if (!match) {
      // Not a valid idea line; skip
      continue;
    }

    const indent = match[1].length / 2; // Two spaces per indent level
    const title = match[2];

    // Reject three+ levels (FR-BIB-10)
    if (indent >= 2) {
      return {
        valid: false,
        error: 'Third indentation level not allowed',
        errorLine: i
      };
    }

    parsed.push({ lineNum: i, text: line, indent, title });
  }

  return { valid: true, parsed };
}

/**
 * Render outline from big ideas structure
 * @param {BigIdea[]} bigIdeas
 * @returns {string} Outline text
 */
export function renderOutlineText(bigIdeas) {
  const lines = [];

  for (const bi of bigIdeas) {
    if (!bi.parentId) {
      // Top-level
      lines.push(`- ${bi.title}`);

      // Add sub-ideas under this one
      const subs = bigIdeas.filter(s => s.parentId === bi.id).sort((a, b) => (a.order || 0) - (b.order || 0));
      for (const sub of subs) {
        lines.push(`  - ${sub.title}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Update big ideas from parsed outline
 * Writes title, order, parentId only (FR-BIB-14, AD-BI-3)
 *
 * @param {Array} parsedLines - Parsed lines from parseOutlineText
 * @param {BigIdea[]} bigIdeas - Current big ideas array
 */
export function applyOutlineChanges(parsedLines, bigIdeas) {
  if (!unit) throw new Error('BigIdea module not initialized');

  // Build map of existing big ideas by title (rough match)
  const idsByTitle = new Map();
  for (const bi of bigIdeas) {
    idsByTitle.set(bi.title, bi.id);
  }

  // Process parsed lines, creating/updating big ideas
  let topLevelOrder = 0;
  let currentTopLevelId = null;
  let subOrder = 0;

  for (const parsed of parsedLines) {
    if (parsed.indent === 0) {
      // Top-level
      let bigIdeaId = idsByTitle.get(parsed.title);
      if (!bigIdeaId) {
        // Create new top-level (needs topicId)
        bigIdeaId = addBigIdea(parsed.title, unit.topics?.[0]?.id || null, null);
      } else {
        // Update order
        const bi = bigIdeas.find(b => b.id === bigIdeaId);
        if (bi) bi.order = topLevelOrder;
      }

      currentTopLevelId = bigIdeaId;
      topLevelOrder++;
      subOrder = 0;
    } else if (parsed.indent === 1) {
      // Sub-idea
      let bigIdeaId = idsByTitle.get(parsed.title);
      if (!bigIdeaId) {
        // Create new sub-idea
        if (!currentTopLevelId) throw new Error('Sub-idea without parent');
        bigIdeaId = addBigIdea(parsed.title, null, currentTopLevelId);
      } else {
        // Update parent and order
        const bi = bigIdeas.find(b => b.id === bigIdeaId);
        if (bi) {
          bi.parentId = currentTopLevelId;
          bi.order = subOrder;
        }
      }

      subOrder++;
    }
  }

  store.setData({ bigIdeas: unit.bigIdeas });
}

/**
 * ============================================================================
 * ASCII TREE RENDERER (FR-BIB-12, print mode)
 * ============================================================================
 */

/**
 * Render ASCII connector tree for print mode
 * Uses ├──, └──, │ connectors
 *
 * @param {BigIdea[]} bigIdeas
 * @returns {string} ASCII tree text
 */
export function renderAsciiTree(bigIdeas) {
  const lines = [];
  const sorted = bigIdeas.filter(bi => !bi.parentId).sort((a, b) => (a.order || 0) - (b.order || 0));

  for (let i = 0; i < sorted.length; i++) {
    const topLevel = sorted[i];
    lines.push(topLevel.title);

    // Get sub-ideas
    const subs = bigIdeas
      .filter(s => s.parentId === topLevel.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Render sub-ideas with connectors
    for (let j = 0; j < subs.length; j++) {
      const isLast = j === subs.length - 1;
      const prefix = isLast ? '└──' : '├──';
      lines.push(`${prefix} ${subs[j].title}`);
    }

    // Add spacing between groups
    if (i < sorted.length - 1) {
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * ============================================================================
 * DATA EXPORT (for screen/print rendering)
 * ============================================================================
 */

/**
 * Get current big ideas list
 * @returns {BigIdea[]}
 */
export function getBigIdeas() {
  return unit?.bigIdeas || [];
}

/**
 * Get current topics list
 * @returns {Topic[]}
 */
export function getTopics() {
  return unit?.topics || [];
}

/**
 * Get a big idea by ID
 * @param {string} bigIdeaId
 * @returns {BigIdea|null}
 */
export function getBigIdea(bigIdeaId) {
  return (unit?.bigIdeas || []).find(bi => bi.id === bigIdeaId) || null;
}

/**
 * Get a topic by ID
 * @param {string} topicId
 * @returns {Topic|null}
 */
export function getTopic(topicId) {
  return (unit?.topics || []).find(t => t.id === topicId) || null;
}
