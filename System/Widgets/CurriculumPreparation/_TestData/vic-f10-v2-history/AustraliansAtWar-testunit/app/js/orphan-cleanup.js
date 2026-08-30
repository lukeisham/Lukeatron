// orphan-cleanup.js — Find unreferenced images and provide deletion UI
// Exports: computeOrphanImages, showOrphanCleanupDialog

/**
 * Walk every document in the unit and collect all referenced imageIds.
 * Implements: AD-IMP-3 (derive referenced-id set by walking every document at run time)
 *
 * @param {Object} unit - The unit.json object
 * @returns {Set<string>} Set of all imageIds referenced anywhere in the unit
 */
export function getReferencedImageIds(unit) {
  const referencedIds = new Set();

  // Walk lesson tier pages and lesson-level imageRefs
  if (Array.isArray(unit.lessons)) {
    for (const lesson of unit.lessons) {
      // Lesson-level imageRefs
      if (Array.isArray(lesson.imageRefs)) {
        for (const ref of lesson.imageRefs) {
          if (ref.imageId) {
            referencedIds.add(ref.imageId);
          }
        }
      }
      // Tier-level imageRefs (pass, intermediate, advanced)
      if (lesson.tiers && typeof lesson.tiers === 'object') {
        for (const tier of Object.values(lesson.tiers)) {
          if (Array.isArray(tier.imageRefs)) {
            for (const ref of tier.imageRefs) {
              if (ref.imageId) {
                referencedIds.add(ref.imageId);
              }
            }
          }
        }
      }
    }
  }

  // Walk unit assessment finalAssessment tiers and miniAssessments tiers
  if (unit.unitAssessment) {
    if (unit.unitAssessment.finalAssessment && unit.unitAssessment.finalAssessment.tiers) {
      for (const tier of Object.values(unit.unitAssessment.finalAssessment.tiers)) {
        if (Array.isArray(tier.imageRefs)) {
          for (const ref of tier.imageRefs) {
            if (ref.imageId) {
              referencedIds.add(ref.imageId);
            }
          }
        }
      }
    }

    // Walk miniAssessments
    if (Array.isArray(unit.unitAssessment.miniAssessments)) {
      for (const mini of unit.unitAssessment.miniAssessments) {
        if (mini.tiers && typeof mini.tiers === 'object') {
          for (const tier of Object.values(mini.tiers)) {
            if (Array.isArray(tier.imageRefs)) {
              for (const ref of tier.imageRefs) {
                if (ref.imageId) {
                  referencedIds.add(ref.imageId);
                }
              }
            }
          }
        }
      }
    }
  }

  // Walk crib-sheet sections
  if (unit.cribSheet && Array.isArray(unit.cribSheet.sections)) {
    for (const section of unit.cribSheet.sections) {
      if (Array.isArray(section.imageRefs)) {
        for (const ref of section.imageRefs) {
          if (ref.imageId) {
            referencedIds.add(ref.imageId);
          }
        }
      }
    }
  }

  // Walk resources page items (kind: "image" has imageId)
  if (unit.resourcesPage && Array.isArray(unit.resourcesPage.items)) {
    for (const item of unit.resourcesPage.items) {
      if (item.kind === 'image' && item.imageId) {
        referencedIds.add(item.imageId);
      }
    }
  }

  return referencedIds;
}

/**
 * Compute the set of orphaned images (in manifest but not referenced anywhere).
 * Implements: FR-IMP-10 (compute orphan set)
 *
 * @param {Object} unit - The unit.json object
 * @returns {Array<Object>} Array of orphaned image manifest entries
 */
export function computeOrphanImages(unit) {
  if (!Array.isArray(unit.images)) {
    return [];
  }

  const referencedIds = getReferencedImageIds(unit);
  const orphans = [];

  for (const imageEntry of unit.images) {
    if (!referencedIds.has(imageEntry.id)) {
      orphans.push(imageEntry);
    }
  }

  return orphans;
}

/**
 * Show a confirmation dialog for deleting orphaned images.
 * Implements: FR-IMP-10 (UI confirmation dialog), AD-IMP-4 (never automatic)
 *
 * @param {Array<Object>} orphanImages - Array of orphaned image manifest entries
 * @returns {Promise<boolean>} true if user confirms, false if cancels
 */
export async function showOrphanCleanupDialog(orphanImages) {
  if (!orphanImages || orphanImages.length === 0) {
    // No orphans to clean up
    return false;
  }

  // Build HTML for confirmation dialog
  const dialogHtml = `
    <div id="orphan-cleanup-dialog" class="orphan-cleanup-dialog">
      <div class="orphan-cleanup-content">
        <h2>Clean up unused images</h2>
        <p>${orphanImages.length} image${orphanImages.length !== 1 ? 's' : ''} ${orphanImages.length !== 1 ? 'are' : 'is'} not used anywhere in this unit.</p>

        <div class="orphan-cleanup-list">
          <strong>Files to delete:</strong>
          <ul>
            ${orphanImages.map(img => `
              <li>
                <code>${img.filename}</code>
                <span class="file-size">(${formatFileSize(img.byteSize)})</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="orphan-cleanup-warning">
          <strong>Warning:</strong> This action cannot be undone. Deleted files are permanently removed.
        </div>

        <div class="orphan-cleanup-buttons">
          <button id="orphan-cleanup-cancel" class="button button-secondary">Cancel</button>
          <button id="orphan-cleanup-confirm" class="button button-primary">Delete unused images</button>
        </div>
      </div>
    </div>
  `;

  // Inject dialog into DOM
  const dialogContainer = document.createElement('div');
  dialogContainer.innerHTML = dialogHtml;
  const dialog = dialogContainer.querySelector('#orphan-cleanup-dialog');
  document.body.appendChild(dialog);

  // Wait for user choice
  return new Promise((resolve) => {
    const confirmBtn = dialog.querySelector('#orphan-cleanup-confirm');
    const cancelBtn = dialog.querySelector('#orphan-cleanup-cancel');

    const cleanup = () => {
      dialog.remove();
      dialogContainer.remove();
    };

    confirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    // Also allow ESC key to cancel
    const escHandler = (event) => {
      if (event.key === 'Escape') {
        document.removeEventListener('keydown', escHandler);
        cleanup();
        resolve(false);
      }
    };
    document.addEventListener('keydown', escHandler);
  });
}

/**
 * Format bytes as human-readable file size.
 * @private
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Delete a batch of orphaned images from the unit.
 * Implements: FR-IMP-10 (batch delete orphans)
 *
 * @param {Object} unit - The unit.json object
 * @param {Array<string>} imageIds - IDs of images to delete
 * @param {Object} serverClient - ServerClient instance for HTTP calls
 * @returns {Promise<{deleted: string[], failed: Array<{id: string, error: string}>}>}
 */
export async function deleteOrphanImages(unit, imageIds, serverClient) {
  const deleted = [];
  const failed = [];

  for (const imageId of imageIds) {
    try {
      // Delete file from bundle-server (FR-IMP-10)
      await serverClient.deleteImage(imageId);
      deleted.push(imageId);
    } catch (err) {
      failed.push({
        id: imageId,
        error: err.message
      });
    }
  }

  // Remove deleted entries from manifest (FR-IMP-10)
  if (!Array.isArray(unit.images)) {
    unit.images = [];
  }

  unit.images = unit.images.filter(img => !deleted.includes(img.id));

  return { deleted, failed };
}
