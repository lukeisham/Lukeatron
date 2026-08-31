// local-store.js — Browser-side data layer for local persistence
// Owns: load/save unit.json, validate all invariants, manage unsaved changes
// Exports: ServerClient, validateUnit, LocalStore

const API_BASE = 'http://127.0.0.1';
const SCHEMA_VERSION = '1.0.0';
const AUTOSAVE_DEBOUNCE_MS = 500;

/**
 * ServerClient — Centralized place for all fetch() calls to bundle-server
 * Ensures all requests stay on localhost and handles loading/error states
 * Implements: FR-LS-9, JS-5, FR-LS-10, FR-LS-11
 */
class ServerClient {
  constructor(port = 8800, uiCallbacks = {}) {
    this.port = port;
    this.baseUrl = `${API_BASE}:${port}`;
    this.uiCallbacks = uiCallbacks;
  }

  /**
   * Show loading state before a request
   * @param {string} message - Description of what's loading
   */
  _showLoading(message) {
    if (this.uiCallbacks.onLoading) {
      this.uiCallbacks.onLoading(message);
    }
  }

  /**
   * Hide loading state after a request
   */
  _hideLoading() {
    if (this.uiCallbacks.onLoadingDone) {
      this.uiCallbacks.onLoadingDone();
    }
  }

  /**
   * Show error state
   * @param {string} message - Error description
   */
  _showError(message) {
    if (this.uiCallbacks.onError) {
      this.uiCallbacks.onError(message);
    }
  }

  /**
   * Load unit.json from bundle-server
   * @returns {Promise<Object>} Parsed unit.json object
   * @throws {Error} With descriptive message on failure
   */
  async load() {
    const url = `${this.baseUrl}/api/unit`;

    // Verify localhost constraint (FR-LS-8)
    if (!url.includes('127.0.0.1') && !url.includes('localhost')) {
      throw new Error('FATAL: Request is not on localhost (FR-LS-8 violated)');
    }

    this._showLoading('Loading unit...');

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorJson.code || errorText;
        } catch {
          // Not JSON; use text as-is
        }
        throw new Error(`Failed to load unit (${response.status}): ${errorMsg}`);
      }

      const unit = await response.json();
      this._hideLoading();
      return unit;
    } catch (err) {
      // Guard against silent failures (JS-2)
      const message = err.message || 'Unknown error loading unit';
      this._showError(`Cannot reach server: ${message}`);
      throw err;
    }
  }

  /**
   * Save unit.json to bundle-server
   * @param {Object} unit - The entire unit.json object
   * @returns {Promise<Object>} Response from server
   * @throws {Error} With descriptive message on failure
   */
  async save(unit) {
    const url = `${this.baseUrl}/api/unit`;

    // Verify localhost constraint (FR-LS-8)
    if (!url.includes('127.0.0.1') && !url.includes('localhost')) {
      throw new Error('FATAL: Request is not on localhost (FR-LS-8 violated)');
    }

    this._showLoading('Saving...');

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unit),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorJson.code || errorText;
        } catch {
          // Not JSON; use text as-is
        }
        throw new Error(`Failed to save unit (${response.status}): ${errorMsg}`);
      }

      const result = await response.json();
      this._hideLoading();
      return result;
    } catch (err) {
      // Guard against silent failures (JS-2)
      const message = err.message || 'Unknown error saving unit';
      this._showError(`Cannot save: ${message}`);
      throw err;
    }
  }

  /**
   * Upload an image file to bundle-server
   * Implements: FR-IMP-2, FR-IMP-11 (image upload through centralized fetch module)
   * @param {Blob} imageBlob - The image blob to upload
   * @param {string} mimeType - MIME type of the image
   * @returns {Promise<Object>} Response {id, filename}
   * @throws {Error} With descriptive message on failure
   */
  async uploadImage(imageBlob, mimeType) {
    const url = `${this.baseUrl}/api/images`;

    // Verify localhost constraint (FR-LS-8)
    if (!url.includes('127.0.0.1') && !url.includes('localhost')) {
      throw new Error('FATAL: Request is not on localhost (FR-LS-8 violated)');
    }

    this._showLoading('Uploading image...');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: imageBlob,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorJson.code || errorText;
        } catch {
          // Not JSON; use text as-is
        }
        throw new Error(`Failed to upload image (${response.status}): ${errorMsg}`);
      }

      const result = await response.json();
      this._hideLoading();
      return result;
    } catch (err) {
      // Guard against silent failures (JS-2)
      const message = err.message || 'Unknown error uploading image';
      this._showError(`Cannot upload image: ${message}`);
      throw err;
    }
  }

  /**
   * Delete an image file from bundle-server
   * Implements: FR-IMP-10 (orphan cleanup deletes files)
   * @param {string} imageId - The image ID to delete
   * @returns {Promise<Object>} Response {status}
   * @throws {Error} With descriptive message on failure
   */
  async deleteImage(imageId) {
    const url = `${this.baseUrl}/api/images/${imageId}`;

    // Verify localhost constraint (FR-LS-8)
    if (!url.includes('127.0.0.1') && !url.includes('localhost')) {
      throw new Error('FATAL: Request is not on localhost (FR-LS-8 violated)');
    }

    this._showLoading('Deleting image...');

    try {
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorJson.code || errorText;
        } catch {
          // Not JSON; use text as-is
        }
        throw new Error(`Failed to delete image (${response.status}): ${errorMsg}`);
      }

      const result = await response.json();
      this._hideLoading();
      return result;
    } catch (err) {
      // Guard against silent failures (JS-2)
      const message = err.message || 'Unknown error deleting image';
      this._showError(`Cannot delete image: ${message}`);
      throw err;
    }
  }

  /**
   * Fetch an image blob from bundle-server
   * Returns null blob if file is missing (placeholder handling by document-shell)
   * Implements: FR-DS-9 (image primitive rendering)
   * @param {string} imageId - The image ID to fetch
   * @returns {Promise<Blob|null>} Image blob or null if file missing
   */
  async fetchImage(imageId) {
    const url = `${this.baseUrl}/api/images/${imageId}`;

    // Verify localhost constraint (FR-LS-8)
    if (!url.includes('127.0.0.1') && !url.includes('localhost')) {
      throw new Error('FATAL: Request is not on localhost (FR-LS-8 violated)');
    }

    try {
      const response = await fetch(url);

      if (!response.ok) {
        // 404 or other error: return null to trigger placeholder (FR-IMP-7)
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch image (${response.status})`);
      }

      return await response.blob();
    } catch (err) {
      // On any error, return null to render placeholder (never silent fail)
      console.error(`Error fetching image ${imageId}:`, err);
      return null;
    }
  }
}

/**
 * Validate a unit against all data-model invariants (INV-DM-*)
 * Returns validation result; throws on first critical error only if gate logic applies
 * Implements: FR-LS-3, FR-LS-6, AD-LS-2, AD-LS-4
 * @param {Object} unit - The unit.json to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateUnit(unit) {
  const errors = [];

  // Guard: unit must be an object
  if (!unit || typeof unit !== 'object') {
    return { valid: false, errors: ['Unit must be a non-null object'] };
  }

  // INV-DM-9: Schema version check — refuse if higher (FR-LS-6)
  if (unit.schemaVersion && unit.schemaVersion > SCHEMA_VERSION) {
    return {
      valid: false,
      errors: [`Schema version ${unit.schemaVersion} is newer than supported ${SCHEMA_VERSION}. Cannot open.`],
    };
  }

  // Build lookup tables for reference resolution
  const nodeMap = {};
  const topicMap = {};
  const bigIdeaMap = {};
  const lessonMap = {};
  const miniAssessmentMap = {};
  const imageMap = {};
  const studentMap = {};
  const criterionMap = {};

  // Index all nodes (INV-DM-3: tree structure)
  if (Array.isArray(unit.nodes)) {
    for (const node of unit.nodes) {
      if (!node.id) {
        errors.push('INV-DM-18: node missing id');
        continue;
      }
      nodeMap[node.id] = node;
    }
  }

  // Index all topics
  if (Array.isArray(unit.topics)) {
    for (const topic of unit.topics) {
      if (!topic.id) {
        errors.push('INV-DM-18: topic missing id');
        continue;
      }
      topicMap[topic.id] = topic;
    }
  }

  // Index all big ideas
  if (Array.isArray(unit.bigIdeas)) {
    for (const bigIdea of unit.bigIdeas) {
      if (!bigIdea.id) {
        errors.push('INV-DM-18: big idea missing id');
        continue;
      }
      bigIdeaMap[bigIdea.id] = bigIdea;
    }
  }

  // Index all lessons
  if (Array.isArray(unit.lessons)) {
    for (const lesson of unit.lessons) {
      if (!lesson.id) {
        errors.push('INV-DM-18: lesson missing id');
        continue;
      }
      lessonMap[lesson.id] = lesson;
    }
  }

  // Index mini assessments
  if (unit.unitAssessment && Array.isArray(unit.unitAssessment.miniAssessments)) {
    for (const mini of unit.unitAssessment.miniAssessments) {
      if (!mini.id) {
        errors.push('INV-DM-18: mini assessment missing id');
        continue;
      }
      miniAssessmentMap[mini.id] = mini;
    }
  }

  // Index images
  if (Array.isArray(unit.images)) {
    for (const img of unit.images) {
      if (!img.id) {
        errors.push('INV-DM-18: image missing id');
        continue;
      }
      imageMap[img.id] = img;
    }
  }

  // Index students
  if (Array.isArray(unit.students)) {
    for (const student of unit.students) {
      if (!student.id) {
        errors.push('INV-DM-18: student missing id');
        continue;
      }
      studentMap[student.id] = student;
    }
  }

  // Index matrix criteria
  if (unit.matrixTemplate && Array.isArray(unit.matrixTemplate.criteria)) {
    for (const crit of unit.matrixTemplate.criteria) {
      if (!crit.id) {
        errors.push('INV-DM-18: criterion missing id');
        continue;
      }
      criterionMap[crit.id] = crit;
    }
  }

  // INV-DM-3: Nodes form a tree (exactly one root, no cycles, every non-root has resolvable parentId)
  const nodeParents = {};
  for (const node of unit.nodes || []) {
    if (node.parentId) {
      if (!nodeMap[node.parentId]) {
        errors.push(`INV-DM-3: node ${node.id} references non-existent parentId ${node.parentId}`);
      }
      nodeParents[node.id] = node.parentId;
    }
  }

  // Check for exactly one root
  // OQ-BT-1 (RESOLVED 2026-08-29): an empty nodes[] is a valid pre-ingest
  // state — the "exactly one root" rule binds only once the first node
  // exists, not before.
  if ((unit.nodes || []).length > 0) {
    const roots = (unit.nodes || []).filter((n) => !n.parentId);
    if (roots.length !== 1) {
      errors.push(`INV-DM-3: expected 1 root node, found ${roots.length}`);
    }
  }

  // Check for cycles using DFS
  const visited = new Set();
  const rec = new Set();

  const hasCycle = (nodeId) => {
    if (visited.has(nodeId)) return false;
    if (rec.has(nodeId)) return true;

    rec.add(nodeId);
    const parentId = nodeParents[nodeId];
    if (parentId && hasCycle(parentId)) return true;
    rec.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  for (const nodeId of Object.keys(nodeParents)) {
    if (hasCycle(nodeId)) {
      errors.push(`INV-DM-3: cycle detected in node tree involving ${nodeId}`);
      break;
    }
  }

  // INV-DM-4: Every stored reference resolves
  // Check lesson.nodeIds
  for (const lesson of unit.lessons || []) {
    if (Array.isArray(lesson.nodeIds)) {
      for (const nodeId of lesson.nodeIds) {
        if (!nodeMap[nodeId]) {
          errors.push(`INV-DM-4: lesson ${lesson.id} references non-existent nodeId ${nodeId}`);
        }
      }
    }
    // Check lesson.bigIdeaId
    if (lesson.bigIdeaId && !bigIdeaMap[lesson.bigIdeaId]) {
      errors.push(`INV-DM-4: lesson ${lesson.id} references non-existent bigIdeaId ${lesson.bigIdeaId}`);
    }
    // Check lesson.assessmentLink.miniAssessmentIds
    if (lesson.assessmentLink && Array.isArray(lesson.assessmentLink.miniAssessmentIds)) {
      for (const miniId of lesson.assessmentLink.miniAssessmentIds) {
        if (!miniAssessmentMap[miniId]) {
          errors.push(`INV-DM-4: lesson ${lesson.id} references non-existent miniAssessmentId ${miniId}`);
        }
      }
    }
  }

  // Check big idea coverage nodeIds and topicId
  for (const bigIdea of unit.bigIdeas || []) {
    if (Array.isArray(bigIdea.coverage)) {
      for (const cov of bigIdea.coverage) {
        if (!nodeMap[cov.nodeId]) {
          errors.push(`INV-DM-4: bigIdea ${bigIdea.id} coverage references non-existent nodeId ${cov.nodeId}`);
        }
      }
    }
    // INV-DM-34: top-level big ideas must have topicId
    if (!bigIdea.parentId && bigIdea.topicId && !topicMap[bigIdea.topicId]) {
      errors.push(`INV-DM-4: bigIdea ${bigIdea.id} references non-existent topicId ${bigIdea.topicId}`);
    }
  }

  // Check topic coverage nodeIds
  for (const topic of unit.topics || []) {
    if (Array.isArray(topic.coverage)) {
      for (const cov of topic.coverage) {
        if (!nodeMap[cov.nodeId]) {
          errors.push(`INV-DM-4: topic ${topic.id} coverage references non-existent nodeId ${cov.nodeId}`);
        }
      }
    }
  }

  // Check unitAssessment and miniAssessments
  if (unit.unitAssessment) {
    if (unit.unitAssessment.bigIdeaId && !bigIdeaMap[unit.unitAssessment.bigIdeaId]) {
      errors.push(`INV-DM-4: unitAssessment references non-existent bigIdeaId ${unit.unitAssessment.bigIdeaId}`);
    }
    if (Array.isArray(unit.unitAssessment.coverage)) {
      for (const cov of unit.unitAssessment.coverage) {
        if (!nodeMap[cov.nodeId]) {
          errors.push(`INV-DM-4: unitAssessment coverage references non-existent nodeId ${cov.nodeId}`);
        }
      }
    }
    for (const mini of unit.unitAssessment.miniAssessments || []) {
      if (mini.bigIdeaId && !bigIdeaMap[mini.bigIdeaId]) {
        errors.push(`INV-DM-4: miniAssessment ${mini.id} references non-existent bigIdeaId ${mini.bigIdeaId}`);
      }
      if (Array.isArray(mini.coverage)) {
        for (const cov of mini.coverage) {
          if (!nodeMap[cov.nodeId]) {
            errors.push(`INV-DM-4: miniAssessment ${mini.id} coverage references non-existent nodeId ${cov.nodeId}`);
          }
        }
      }
    }
  }

  // Check cribSheet sections
  if (unit.cribSheet && Array.isArray(unit.cribSheet.sections)) {
    for (const section of unit.cribSheet.sections) {
      if (section.bigIdeaId && !bigIdeaMap[section.bigIdeaId]) {
        errors.push(`INV-DM-4: cribSheet section references non-existent bigIdeaId ${section.bigIdeaId}`);
      }
    }
  }

  // Check resourcesPage items for imageId
  if (unit.resourcesPage && Array.isArray(unit.resourcesPage.items)) {
    for (const item of unit.resourcesPage.items) {
      if (item.kind === 'image' && item.imageId && !imageMap[item.imageId]) {
        errors.push(`INV-DM-4: resourcesPage item references non-existent imageId ${item.imageId}`);
      }
    }
  }

  // INV-DM-17: Every ImageRef.imageId resolves to images[] manifest entry (FR-IMP-8)
  // Walk lesson tier pages and lesson-level imageRefs
  const checkImageRef = (imageRef, context) => {
    if (imageRef && imageRef.imageId && !imageMap[imageRef.imageId]) {
      errors.push(`INV-DM-17: ImageRef references non-existent imageId ${imageRef.imageId} (${context})`);
    }
  };

  for (const lesson of unit.lessons || []) {
    // Check lesson-level imageRefs
    if (Array.isArray(lesson.imageRefs)) {
      for (const ref of lesson.imageRefs) {
        checkImageRef(ref, `lesson ${lesson.id}`);
      }
    }
    // Check tier-level imageRefs
    if (lesson.tiers && typeof lesson.tiers === 'object') {
      for (const [tierName, tier] of Object.entries(lesson.tiers)) {
        if (Array.isArray(tier.imageRefs)) {
          for (const ref of tier.imageRefs) {
            checkImageRef(ref, `lesson ${lesson.id} tier ${tierName}`);
          }
        }
      }
    }
  }

  // Check unit assessment finalAssessment and miniAssessments
  if (unit.unitAssessment) {
    if (unit.unitAssessment.finalAssessment && unit.unitAssessment.finalAssessment.tiers) {
      for (const [tierName, tier] of Object.entries(unit.unitAssessment.finalAssessment.tiers)) {
        if (Array.isArray(tier.imageRefs)) {
          for (const ref of tier.imageRefs) {
            checkImageRef(ref, `finalAssessment tier ${tierName}`);
          }
        }
      }
    }

    if (Array.isArray(unit.unitAssessment.miniAssessments)) {
      for (const mini of unit.unitAssessment.miniAssessments) {
        if (mini.tiers && typeof mini.tiers === 'object') {
          for (const [tierName, tier] of Object.entries(mini.tiers)) {
            if (Array.isArray(tier.imageRefs)) {
              for (const ref of tier.imageRefs) {
                checkImageRef(ref, `miniAssessment ${mini.id} tier ${tierName}`);
              }
            }
          }
        }
      }
    }
  }

  // Check crib-sheet sections
  if (unit.cribSheet && Array.isArray(unit.cribSheet.sections)) {
    for (const section of unit.cribSheet.sections) {
      if (Array.isArray(section.imageRefs)) {
        for (const ref of section.imageRefs) {
          checkImageRef(ref, `cribSheet section for bigIdea ${section.bigIdeaId}`);
        }
      }
    }
  }

  // Check matrix scores reference criteria
  for (const matrix of unit.matrices || []) {
    if (matrix.studentId && !studentMap[matrix.studentId]) {
      errors.push(`INV-DM-6: matrix references non-existent studentId ${matrix.studentId}`);
    }
    if (Array.isArray(matrix.scores)) {
      for (const score of matrix.scores) {
        if (!criterionMap[score.criterionId]) {
          errors.push(`INV-DM-19: matrix score references non-existent criterionId ${score.criterionId}`);
        }
      }
    }
  }

  // INV-DM-6: Exactly one matrix per unit, exactly one per student
  const studentMatrices = {};
  if (Array.isArray(unit.matrices)) {
    for (const matrix of unit.matrices) {
      if (studentMatrices[matrix.studentId]) {
        errors.push(`INV-DM-6: duplicate matrix for student ${matrix.studentId}`);
      }
      studentMatrices[matrix.studentId] = matrix;
    }
  }

  // INV-DM-7: Matrix rows cover all three tiers
  // Same empty-state reading as INV-DM-3 (OQ-BT-1): a matrixTemplate with no
  // criteria yet is a valid pre-ingest state. The all-three-tiers rule binds
  // once at least one criterion exists.
  if (unit.matrixTemplate && Array.isArray(unit.matrixTemplate.criteria) && unit.matrixTemplate.criteria.length > 0) {
    const tiersCovered = new Set();
    for (const crit of unit.matrixTemplate.criteria) {
      tiersCovered.add(crit.tier);
    }
    const required = ['pass', 'intermediate', 'advanced'];
    if (!required.every((t) => tiersCovered.has(t))) {
      errors.push('INV-DM-7: matrix criteria do not cover all three tiers');
    }
  }

  // INV-DM-1: Exactly three tiers in fixed tier pages
  const tierCheck = (tierObj, entityId, type) => {
    if (!tierObj || typeof tierObj !== 'object') return; // Not present, that's ok
    const required = ['pass', 'intermediate', 'advanced'];
    if (!required.every((t) => t in tierObj)) {
      errors.push(`INV-DM-1: ${type} ${entityId} missing one of three tiers`);
    }
  };

  for (const lesson of unit.lessons || []) {
    if (lesson.tiers) tierCheck(lesson.tiers, lesson.id, 'lesson');
  }
  if (unit.unitAssessment) {
    if (unit.unitAssessment.finalAssessment) {
      tierCheck(unit.unitAssessment.finalAssessment.tiers, 'unitAssessment.finalAssessment', 'finalAssessment');
    }
    for (const mini of unit.unitAssessment.miniAssessments || []) {
      tierCheck(mini.tiers, mini.id, 'miniAssessment');
    }
  }

  // INV-DM-2: A node with edited: true must have original object
  for (const node of unit.nodes || []) {
    if (node.edited && !node.original) {
      errors.push(`INV-DM-2: node ${node.id} has edited: true but missing original object`);
    }
  }

  // INV-DM-12: No reverse links stored (check for fields that should only be derived)
  for (const node of unit.nodes || []) {
    if (node.lessonIds) {
      errors.push(`INV-DM-12: node ${node.id} stores reverse link lessonIds (should be derived)`);
    }
  }
  for (const bigIdea of unit.bigIdeas || []) {
    if (bigIdea.lessonIds) {
      errors.push(`INV-DM-12: bigIdea ${bigIdea.id} stores reverse link lessonIds (should be derived)`);
    }
  }

  // INV-DM-14: Big ideas exactly two levels (if a big idea has parentId pointing to another big idea that also has a parentId, fail)
  for (const bigIdea of unit.bigIdeas || []) {
    if (bigIdea.parentId) {
      const parent = bigIdeaMap[bigIdea.parentId];
      if (parent && parent.parentId) {
        errors.push(`INV-DM-14: big idea ${bigIdea.id} is at level 3 (max is 2 levels total)`);
      }
    }
  }

  // INV-DM-15: Every lesson has bigIdeaId
  for (const lesson of unit.lessons || []) {
    if (!lesson.bigIdeaId) {
      errors.push(`INV-DM-15: lesson ${lesson.id} is missing required bigIdeaId`);
    }
  }

  // INV-DM-18: Singular objects present and non-null
  if (!unit.cribSheet) {
    errors.push('INV-DM-18: cribSheet must be present');
  }
  if (!unit.unitAssessment) {
    errors.push('INV-DM-18: unitAssessment must be present');
  }
  if (!unit.resourcesPage) {
    errors.push('INV-DM-18: resourcesPage must be present');
  }
  if (!unit.matrixTemplate) {
    errors.push('INV-DM-18: matrixTemplate must be present');
  }

  // INV-DM-16: cribSheet pageCount is 1 or 2
  if (unit.cribSheet && unit.cribSheet.pageCount && ![1, 2].includes(unit.cribSheet.pageCount)) {
    errors.push(`INV-DM-16: cribSheet pageCount must be 1 or 2, got ${unit.cribSheet.pageCount}`);
  }

  // INV-DM-22: coverage[].coverage is "full" or "partial"
  const checkCoverageValues = (coverage, entityId, type) => {
    if (Array.isArray(coverage)) {
      for (const cov of coverage) {
        if (cov.coverage && !['full', 'partial'].includes(cov.coverage)) {
          errors.push(`INV-DM-22: ${type} ${entityId} has invalid coverage value "${cov.coverage}"`);
        }
      }
    }
  };

  for (const bigIdea of unit.bigIdeas || []) {
    checkCoverageValues(bigIdea.coverage, bigIdea.id, 'bigIdea');
  }
  for (const topic of unit.topics || []) {
    checkCoverageValues(topic.coverage, topic.id, 'topic');
  }
  if (unit.unitAssessment) {
    checkCoverageValues(unit.unitAssessment.coverage, 'unitAssessment', 'unitAssessment');
    for (const mini of unit.unitAssessment.miniAssessments || []) {
      checkCoverageValues(mini.coverage, mini.id, 'miniAssessment');
    }
  }

  // INV-DM-29: resourceItem.kind is "link", "image", or "text"
  if (unit.resourcesPage && Array.isArray(unit.resourcesPage.items)) {
    for (const item of unit.resourcesPage.items) {
      if (item.kind && !['link', 'image', 'text'].includes(item.kind)) {
        errors.push(`INV-DM-29: resourceItem ${item.id} has invalid kind "${item.kind}"`);
      }
    }
  }

  // INV-DM-31: cribSheet.sections[].half is "upper" or "lower"
  if (unit.cribSheet && Array.isArray(unit.cribSheet.sections)) {
    for (const section of unit.cribSheet.sections) {
      if (section.half && !['upper', 'lower'].includes(section.half)) {
        errors.push(`INV-DM-31: cribSheet section has invalid half "${section.half}"`);
      }
    }
  }

  // Return validation result
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * LocalStore — Main API for managing the in-memory unit
 * Handles: load, save, validation, unsaved-changes tracking, debounced auto-save
 * Implements: FR-LS-1 through FR-LS-12, most AC-LS-* criteria
 */
export class LocalStore {
  constructor(serverClient = null, uiCallbacks = {}) {
    this.serverClient = serverClient || new ServerClient(8800, uiCallbacks);
    this.uiCallbacks = uiCallbacks;
    this.unit = null;
    this.lastSaved = null;
    this.saveTimeout = null;
  }

  /**
   * Load unit from server, validate it, store in memory
   * Implements: FR-LS-1, FR-LS-3, FR-LS-6
   * @throws {Error} With message naming the offending id on validation failure
   */
  async loadUnit() {
    try {
      const unit = await this.serverClient.load();

      // Validate schema version (FR-LS-6)
      if (unit.schemaVersion && unit.schemaVersion > SCHEMA_VERSION) {
        throw new Error(`Schema version ${unit.schemaVersion} is not supported. This app supports up to ${SCHEMA_VERSION}.`);
      }

      // Validate all invariants (FR-LS-3)
      const validation = validateUnit(unit);
      if (!validation.valid) {
        throw new Error(`Invalid unit: ${validation.errors[0] || 'Unknown validation error'}`);
      }

      // Store in memory
      this.unit = unit;
      this.lastSaved = JSON.stringify(unit);

      if (this.uiCallbacks.onUnitLoaded) {
        this.uiCallbacks.onUnitLoaded(unit);
      }
    } catch (err) {
      if (this.uiCallbacks.onError) {
        this.uiCallbacks.onError(`Failed to load unit: ${err.message}`);
      }
      throw err;
    }
  }

  /**
   * Update part of the unit, mark as unsaved, trigger debounced auto-save
   * Implements: FR-LS-4, FR-LS-5
   * @param {Object} partialUnit - Partial update to merge into this.unit
   */
  setData(partialUnit) {
    if (!this.unit) {
      console.warn('setData called before unit loaded');
      return;
    }

    // Merge partial update (shallow merge)
    Object.assign(this.unit, partialUnit);

    // Update dateModified to current UTC time (AD-BOSS-2)
    if (!this.unit.meta) {
      this.unit.meta = {};
    }
    this.unit.meta.dateModified = new Date().toISOString();

    // Mark dirty and debounce save
    this._debounce();
  }

  /**
   * Debounced save: cancel pending save, reschedule for ~500ms from now
   * @private
   */
  _debounce() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveUnit().catch((err) => {
        // Error already shown by ServerClient; don't repeat
        if (this.uiCallbacks.onError) {
          this.uiCallbacks.onError(`Auto-save failed: ${err.message}`);
        }
      });
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  /**
   * Save unit to server atomically
   * Implements: FR-LS-2, FR-LS-4, FR-LS-10
   * Sets dateCreated on first save, dateModified on all saves (AD-BOSS-2)
   * @throws {Error} On save failure
   */
  async saveUnit() {
    if (!this.unit) {
      console.warn('saveUnit called before unit loaded');
      return;
    }

    // Check if there are unsaved changes
    const current = JSON.stringify(this.unit);
    if (current === this.lastSaved) {
      return; // No changes, skip save
    }

    // Ensure meta exists
    if (!this.unit.meta) {
      this.unit.meta = {};
    }

    // Set dateCreated on first write (AD-BOSS-2)
    if (!this.unit.meta.dateCreated) {
      this.unit.meta.dateCreated = new Date().toISOString();
    }

    // Always update dateModified to current time (AD-BOSS-2)
    this.unit.meta.dateModified = new Date().toISOString();

    try {
      await this.serverClient.save(this.unit);

      // Update lastSaved only on successful save
      this.lastSaved = JSON.stringify(this.unit);

      if (this.uiCallbacks.onSaved) {
        this.uiCallbacks.onSaved();
      }
    } catch (err) {
      // Re-throw to let caller handle; error state already shown by ServerClient
      throw err;
    }
  }

  /**
   * Check if there are unsaved changes
   * Implements: FR-LS-5
   * @returns {boolean}
   */
  hasUnsavedChanges() {
    if (!this.unit || !this.lastSaved) {
      return false;
    }
    return JSON.stringify(this.unit) !== this.lastSaved;
  }

  /**
   * Handler for beforeunload event — warn if unsaved changes
   * Implements: FR-LS-5, AC-LS-5
   * @param {Event} event
   */
  onBeforeUnload(event) {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = '';
      return '';
    }
  }
}

// Export all public symbols
export { ServerClient, SCHEMA_VERSION, AUTOSAVE_DEBOUNCE_MS };
