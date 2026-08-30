// curriculum-editor.js — Node CRUD, tree integrity, domain editing, persistence
// Implements: FR-CEB-1 through FR-CEB-11
// Owns: unit.nodes[], unit.curriculum.description, unit.curriculum.labels

import { newId } from './ids.js';
import { LocalStore } from './local-store.js';
import { resolveDomain } from './domain-resolver.js';

/**
 * CurriculumEditor — Main API for editing a curriculum node tree
 * Manages: node CRUD, tree integrity checks, reference tracking, persistence
 */
export class CurriculumEditor {
  constructor(store = null) {
    this.store = store || new LocalStore();
    this.unit = null;
  }

  /**
   * Load the unit into memory
   * @throws {Error} On load failure
   */
  async loadUnit() {
    await this.store.loadUnit();
    this.unit = this.store.unit;
  }

  /**
   * Validate tree shape: exactly one root, no cycles, all parentIds resolve
   * Implements: INV-DM-3, FR-CEB-3
   * @param {Array} nodes - The unit.nodes[] array to validate
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateTreeShape(nodes) {
    const errors = [];

    if (!Array.isArray(nodes)) {
      return { valid: false, errors: ['nodes must be an array'] };
    }

    // Special case: empty tree is valid (OQ-BT-1 resolved)
    if (nodes.length === 0) {
      return { valid: true, errors: [] };
    }

    // Build nodeMap for O(1) lookup
    const nodeMap = {};
    const parentMap = {};

    for (const node of nodes) {
      if (!node.id) {
        errors.push('Node missing id');
        continue;
      }
      nodeMap[node.id] = node;
      if (node.parentId) {
        parentMap[node.id] = node.parentId;
      }
    }

    // Check exactly one root
    const roots = nodes.filter((n) => !n.parentId);
    if (roots.length !== 1) {
      errors.push(`Expected exactly 1 root node, found ${roots.length}`);
    }

    // Check all non-root parentIds resolve
    for (const node of nodes) {
      if (node.parentId && !nodeMap[node.parentId]) {
        errors.push(`Node ${node.id} references non-existent parentId ${node.parentId}`);
      }
    }

    // Check for cycles using DFS
    const visited = new Set();
    const rec = new Set();

    const hasCycle = (nodeId) => {
      if (visited.has(nodeId)) return false;
      if (rec.has(nodeId)) return true;

      rec.add(nodeId);
      const parentId = parentMap[nodeId];
      if (parentId && hasCycle(parentId)) return true;
      rec.delete(nodeId);
      visited.add(nodeId);
      return false;
    };

    for (const nodeId of Object.keys(parentMap)) {
      if (hasCycle(nodeId)) {
        errors.push('Cycle detected in node tree');
        break;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Find all references to a node in lessons, bigIdeas, topics, and assessments
   * Implements: FR-CEB-9
   * @param {string} nodeId - The node.id to check
   * @param {Object} unit - The full unit object
   * @returns {Array} List of reference descriptions (e.g., "Lesson 1: L1")
   */
  checkNodeReferences(nodeId, unit) {
    const references = [];

    // Check lessons
    if (Array.isArray(unit.lessons)) {
      for (const lesson of unit.lessons) {
        if (Array.isArray(lesson.nodeIds) && lesson.nodeIds.includes(nodeId)) {
          references.push(`Lesson ${lesson.number} (${lesson.id})`);
        }
      }
    }

    // Check big ideas
    if (Array.isArray(unit.bigIdeas)) {
      for (const bigIdea of unit.bigIdeas) {
        if (Array.isArray(bigIdea.coverage)) {
          for (const cov of bigIdea.coverage) {
            if (cov.nodeId === nodeId) {
              references.push(`Big Idea (${bigIdea.id})`);
              break;
            }
          }
        }
      }
    }

    // Check topics
    if (Array.isArray(unit.topics)) {
      for (const topic of unit.topics) {
        if (Array.isArray(topic.coverage)) {
          for (const cov of topic.coverage) {
            if (cov.nodeId === nodeId) {
              references.push(`Topic (${topic.id})`);
              break;
            }
          }
        }
      }
    }

    // Check unit assessment
    if (unit.unitAssessment) {
      if (Array.isArray(unit.unitAssessment.coverage)) {
        for (const cov of unit.unitAssessment.coverage) {
          if (cov.nodeId === nodeId) {
            references.push('Unit Assessment');
            break;
          }
        }
      }

      if (Array.isArray(unit.unitAssessment.miniAssessments)) {
        for (const mini of unit.unitAssessment.miniAssessments) {
          if (Array.isArray(mini.coverage)) {
            for (const cov of mini.coverage) {
              if (cov.nodeId === nodeId) {
                references.push(`Mini Assessment (${mini.name})`);
                break;
              }
            }
          }
        }
      }
    }

    return references;
  }

  /**
   * Add a new node to the tree
   * Implements: FR-CEB-1
   * @param {Object} options - { kind, title, text, code, parentId, domain }
   * @returns {Object} The new node object
   * @throws {Error} If tree validation fails or parentId doesn't resolve
   */
  addNode(options) {
    const { kind, title, text, code, parentId, domain } = options;

    if (!['strand', 'outcome', 'task'].includes(kind)) {
      throw new Error('kind must be "strand", "outcome", or "task"');
    }

    if (!title || typeof title !== 'string') {
      throw new Error('title is required and must be a non-empty string');
    }

    // parentId must resolve (or be null for root)
    if (parentId && !this.unit.nodes.some((n) => n.id === parentId)) {
      throw new Error(`parentId ${parentId} does not exist`);
    }

    // Only one root allowed
    if (!parentId && this.unit.nodes.some((n) => !n.parentId)) {
      throw new Error('Tree already has a root node');
    }

    const newNode = {
      id: newId('node'),
      code: code || '',
      title: title,
      text: text || '',
      kind: kind,
      parentId: parentId || null,
      confidence: 'high',
      edited: false,
      original: {},
    };

    // Only strands can have domain
    if (kind === 'strand') {
      newNode.domain = domain || null;
    }

    // Add to nodes array
    this.unit.nodes.push(newNode);

    // Validate tree integrity
    const validation = this.validateTreeShape(this.unit.nodes);
    if (!validation.valid) {
      // Revert
      this.unit.nodes.pop();
      throw new Error(`Tree validation failed: ${validation.errors[0]}`);
    }

    // Persist
    this.store.setData({ nodes: this.unit.nodes });

    return newNode;
  }

  /**
   * Edit a node's title, text, or code
   * Sets edited: true, snapshots original, clears confidence
   * Implements: FR-CEB-2, FR-CEB-4
   * @param {string} nodeId - The node to edit
   * @param {Object} updates - { title, text, code } (partial)
   * @throws {Error} If node not found
   */
  editNode(nodeId, updates) {
    const node = this.unit.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Snapshot original if not already done
    if (!node.edited) {
      node.original = {
        code: node.code,
        title: node.title,
        text: node.text,
      };
    }

    // Apply updates
    if (updates.title !== undefined) {
      node.title = updates.title;
    }
    if (updates.text !== undefined) {
      node.text = updates.text;
    }
    if (updates.code !== undefined) {
      node.code = updates.code;
    }

    // Set flags
    node.edited = true;
    node.confidence = undefined; // Clear confidence flag

    // Persist
    this.store.setData({ nodes: this.unit.nodes });
  }

  /**
   * Edit a strand's domain
   * Sets edited: true, snapshots original, follows same discipline as title/text
   * Implements: FR-CEB-6
   * @param {string} nodeId - The strand node to edit
   * @param {string|null} domain - "skill" | "knowledge" | null
   * @throws {Error} If node not found or is not a strand
   */
  editStrandDomain(nodeId, domain) {
    const node = this.unit.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    if (node.kind !== 'strand') {
      throw new Error(`Node ${nodeId} is not a strand`);
    }

    // Snapshot original if not already done
    if (!node.edited) {
      node.original = {
        code: node.code,
        title: node.title,
        text: node.text,
        domain: node.domain,
      };
    } else if (!node.original.domain) {
      node.original.domain = node.domain;
    }

    // Apply update
    node.domain = domain || null;

    // Set flags
    node.edited = true;

    // Persist
    this.store.setData({ nodes: this.unit.nodes });
  }

  /**
   * Re-parent a node to a new parent
   * Validates no cycles introduced, persists on success
   * Implements: FR-CEB-1, FR-CEB-3
   * @param {string} nodeId - The node to re-parent
   * @param {string|null} newParentId - The new parent (or null for root)
   * @throws {Error} If operation would violate tree integrity
   */
  reparentNode(nodeId, newParentId) {
    const node = this.unit.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Prevent self-parenting
    if (nodeId === newParentId) {
      throw new Error('Cannot re-parent a node to itself');
    }

    // Prevent making a node parent to its ancestor (cycle check)
    if (newParentId) {
      const newParent = this.unit.nodes.find((n) => n.id === newParentId);
      if (!newParent) {
        throw new Error(`New parent ${newParentId} does not exist`);
      }

      // Check if newParent is a descendant of nodeId
      let current = newParent;
      while (current.parentId) {
        if (current.parentId === nodeId) {
          throw new Error('Cannot re-parent: would create a cycle');
        }
        current = this.unit.nodes.find((n) => n.id === current.parentId);
        if (!current) break;
      }
    } else {
      // Moving to root; check only one root allowed
      if (this.unit.nodes.some((n) => n !== node && !n.parentId)) {
        throw new Error('Tree already has a root node');
      }
    }

    // Apply change
    node.parentId = newParentId || null;

    // Validate tree
    const validation = this.validateTreeShape(this.unit.nodes);
    if (!validation.valid) {
      // Revert
      throw new Error(`Tree validation failed: ${validation.errors[0]}`);
    }

    // Persist
    this.store.setData({ nodes: this.unit.nodes });
  }

  /**
   * Delete a node
   * Two-gate check: references, then descendants
   * Implements: FR-CEB-9, FR-CEB-10
   * @param {string} nodeId - The node to delete
   * @param {boolean} confirmCascade - True if user confirmed cascade delete
   * @returns {Object} { success: boolean, message: string, requiresConfirmation: boolean }
   */
  deleteNode(nodeId, confirmCascade = false) {
    const node = this.unit.nodes.find((n) => n.id === nodeId);
    if (!node) {
      return { success: false, message: `Node ${nodeId} not found`, requiresConfirmation: false };
    }

    // Gate 1: Check references
    const references = this.checkNodeReferences(nodeId, this.unit);
    if (references.length > 0) {
      return {
        success: false,
        message: `Cannot delete: referenced by ${references.join(', ')}`,
        requiresConfirmation: false,
      };
    }

    // Gate 2: Check descendants
    const descendants = this.getDescendants(nodeId);
    if (descendants.length > 0 && !confirmCascade) {
      return {
        success: false,
        message: `Node has ${descendants.length} descendant${descendants.length !== 1 ? 's' : ''}. Confirm cascade delete?`,
        requiresConfirmation: true,
      };
    }

    // Delete node and descendants
    const nodesToDelete = new Set([nodeId, ...descendants.map((n) => n.id)]);
    this.unit.nodes = this.unit.nodes.filter((n) => !nodesToDelete.has(n.id));

    // Persist
    this.store.setData({ nodes: this.unit.nodes });

    return { success: true, message: 'Node deleted', requiresConfirmation: false };
  }

  /**
   * Get all descendants of a node
   * @private
   * @param {string} nodeId - The node ID
   * @returns {Array} Array of descendant nodes
   */
  getDescendants(nodeId) {
    const descendants = [];
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift();
      const children = this.unit.nodes.filter((n) => n.parentId === current);
      descendants.push(...children);
      queue.push(...children.map((n) => n.id));
    }

    return descendants;
  }

  /**
   * Edit curriculum.description (optional free text)
   * Implements: FR-CEB-7
   * @param {string|null} description - New description text, or null to clear
   */
  editCurriculumDescription(description) {
    if (!this.unit.curriculum) {
      this.unit.curriculum = {};
    }

    // Store null for unset, not empty string (INV-DM-*)
    this.unit.curriculum.description = description || null;

    // Persist
    this.store.setData({ curriculum: this.unit.curriculum });
  }

  /**
   * Edit curriculum.labels (for generic profile)
   * Implements: FR-CEB-8, FR-CEB-13
   * @param {Object} updates - { strand, outcome, task } (partial)
   * @throws {Error} If not a generic profile (but allows anyway per FR-CEB-13)
   */
  editCurriculumLabels(updates) {
    if (!this.unit.curriculum) {
      this.unit.curriculum = {};
    }

    if (!this.unit.curriculum.labels) {
      this.unit.curriculum.labels = {};
    }

    // Allow editing regardless of profile (FR-CEB-13)
    if (updates.strand !== undefined) {
      this.unit.curriculum.labels.strand = updates.strand;
    }
    if (updates.outcome !== undefined) {
      this.unit.curriculum.labels.outcome = updates.outcome;
    }
    if (updates.task !== undefined) {
      this.unit.curriculum.labels.task = updates.task;
    }

    // Persist
    this.store.setData({ curriculum: this.unit.curriculum });
  }

  /**
   * Get the effective label for a node kind
   * Returns curriculum.labels[kind] if set, else the kind itself
   * @param {string} kind - "strand" | "outcome" | "task"
   * @returns {string} The display label
   */
  getKindLabel(kind) {
    if (
      this.unit.curriculum &&
      this.unit.curriculum.labels &&
      this.unit.curriculum.labels[kind]
    ) {
      return this.unit.curriculum.labels[kind];
    }
    return kind;
  }

  /**
   * Get tree as hierarchical structure for display
   * @returns {Object} Root node with children array recursively
   */
  getTreeStructure() {
    const nodeMap = {};
    for (const node of this.unit.nodes) {
      nodeMap[node.id] = { ...node, children: [] };
    }

    const roots = [];
    for (const id in nodeMap) {
      const node = this.unit.nodes.find((n) => n.id === id);
      if (!node.parentId) {
        roots.push(nodeMap[id]);
      } else {
        const parent = nodeMap[node.parentId];
        if (parent) {
          parent.children.push(nodeMap[id]);
        }
      }
    }

    return roots.length > 0 ? roots[0] : null;
  }
}
