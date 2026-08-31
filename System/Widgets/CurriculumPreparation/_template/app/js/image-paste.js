// image-paste.js — Clipboard paste listener, file upload, manifest management
// Exports: ImagePasteManager, initImagePaste

import { decodeImageDimensions, getDefaultPosition } from './image-loader.js';

/**
 * ImagePasteManager — Centralizes paste event handling and image upload flow.
 * Listens for clipboard paste on document, extracts images, writes to bundle-server,
 * creates manifest entries, and notifies receiving documents.
 * Implements: FR-IMP-1, FR-IMP-2, FR-IMP-3, FR-IMP-4, FR-IMP-11
 */
export class ImagePasteManager {
  constructor(localStore, uiCallbacks = {}) {
    if (!localStore) {
      throw new Error('localStore is required');
    }
    this.localStore = localStore;
    this.uiCallbacks = uiCallbacks;
    this.pasteListeners = new Map(); // Map of element → callback
    this.pasteListenerSetup = false;
  }

  /**
   * Set up paste event listener on the document.
   * Called lazily on first use to avoid accessing document during construction.
   * Implements: FR-IMP-1 (listen for clipboard paste on the page)
   */
  setupPasteListener() {
    if (this.pasteListenerSetup) return;

    // Guard against non-browser environments (for testing)
    if (typeof document === 'undefined') {
      return;
    }

    document.addEventListener('paste', (event) => {
      this._handlePaste(event);
    });

    this.pasteListenerSetup = true;
  }

  /**
   * Handle a paste event: extract image from clipboard, initiate upload.
   * @private
   * @param {ClipboardEvent} event
   */
  async _handlePaste(event) {
    // Check if there are items in the clipboard
    const items = event.clipboardData?.items;
    if (!items) return;

    // Look for image items
    for (const item of items) {
      if (item.kind !== 'file') continue;

      const mimeType = item.type;
      if (!mimeType.startsWith('image/')) continue;

      // Found an image; prevent default paste (we handle it)
      event.preventDefault();

      // Get the blob
      const blob = item.getAsFile();
      if (!blob) continue;

      try {
        // Upload image to bundle-server (FR-IMP-2)
        const imageRef = await this._uploadImage(blob, mimeType);

        // Notify any registered paste listeners (e.g., lesson-plan-document, crib-sheet)
        this._notifyPasteListeners(event.target, imageRef);

        if (this.uiCallbacks.onImagePasted) {
          this.uiCallbacks.onImagePasted(imageRef);
        }
      } catch (err) {
        if (this.uiCallbacks.onError) {
          this.uiCallbacks.onError(`Failed to paste image: ${err.message}`);
        }
      }

      // Process only first image in paste event
      break;
    }
  }

  /**
   * Upload a pasted image to bundle-server and create manifest entry.
   * Implements: FR-IMP-2 (send pasted image to bundle-server), FR-IMP-3 (create manifest entry)
   *
   * @param {Blob} imageBlob - The pasted image blob
   * @param {string} mimeType - MIME type of the image
   * @returns {Promise<Object>} ImageRef object {imageId, x, y, width, height}
   * @throws {Error} On upload or decode failure
   * @private
   */
  async _uploadImage(imageBlob, mimeType) {
    if (!this.localStore.unit) {
      throw new Error('Unit not loaded');
    }

    // Decode image to read true dimensions (FR-IMP-3: read from decoded image, not clipboard)
    const { width, height } = await decodeImageDimensions(imageBlob);

    // Get byte size
    const byteSize = imageBlob.size;

    // Upload to bundle-server via local-store.serverClient (FR-IMP-11: route through local-store)
    const uploadResponse = await this.localStore.serverClient.uploadImage(imageBlob, mimeType);

    // uploadResponse has: { id, filename }
    const { id: imageId, filename } = uploadResponse;

    // Create manifest entry (FR-IMP-3: append to unit.images[])
    if (!this.localStore.unit.images) {
      this.localStore.unit.images = [];
    }

    const imageEntry = {
      id: imageId,
      filename: filename,
      mimeType: mimeType,
      width: width,
      height: height,
      byteSize: byteSize,
      addedAt: new Date().toISOString()
    };

    this.localStore.unit.images.push(imageEntry);

    // Save unit to persist manifest entry (FR-IMP-3)
    await this.localStore.saveUnit();

    // Create and return ImageRef for placement (FR-IMP-4)
    const { x, y } = getDefaultPosition();
    const imageRef = {
      imageId: imageId,
      x: x,
      y: y,
      width: width,
      height: height
    };

    return imageRef;
  }

  /**
   * Register a paste event listener for a specific element.
   * When an image is pasted, the callback is invoked with the ImageRef.
   *
   * @param {HTMLElement} element - Element to listen on
   * @param {Function} callback - (imageRef) => void
   */
  registerPasteListener(element, callback) {
    if (!element || typeof callback !== 'function') {
      throw new Error('registerPasteListener requires element and callback');
    }
    this.pasteListeners.set(element, callback);

    // Set up global paste listener on first registration
    this.setupPasteListener();
  }

  /**
   * Notify all registered paste listeners of a pasted image.
   * Receiving documents use this to add the ImageRef to their own structure.
   *
   * @param {EventTarget} pasteTarget - The element that was pasted into
   * @param {Object} imageRef - The pasted ImageRef
   * @private
   */
  _notifyPasteListeners(pasteTarget, imageRef) {
    // Notify all registered listeners (each document can decide if it was the target)
    for (const [element, callback] of this.pasteListeners) {
      try {
        callback(imageRef, pasteTarget);
      } catch (err) {
        console.error('Error in paste listener callback:', err);
      }
    }
  }

  /**
   * Remove an image from a document (local only; does not delete file or manifest).
   * Implements: FR-IMP-6 (remove from document, not the file)
   *
   * @param {Object} imageRef - The ImageRef to remove
   */
  removeImageFromDocument(imageRef) {
    // This is a no-op in this module; it's handled by the receiving document.
    // The document calls this when removing an ImageRef from its structure.
    // The manifest entry and file are intentionally left untouched.
  }
}

/**
 * Initialize image-paste on page load.
 * Creates and returns the ImagePasteManager instance.
 *
 * @param {LocalStore} localStore - The data store
 * @param {Object} uiCallbacks - Optional callbacks {onImagePasted, onError}
 * @returns {ImagePasteManager}
 */
export function initImagePaste(localStore, uiCallbacks = {}) {
  return new ImagePasteManager(localStore, uiCallbacks);
}
