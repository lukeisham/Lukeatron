// image-loader.js — Decode pasted image blobs to read true pixel dimensions
// Exports: decodeImageDimensions, getDefaultPosition

/**
 * Decode a pasted image blob to read its true pixel dimensions.
 * Uses Image API or createImageBitmap for reliable dimension extraction.
 * Implements: FR-IMP-3 (read width/height from decoded image, never from clipboard metadata)
 *
 * @param {Blob} imageBlob - The pasted image blob
 * @returns {Promise<{width: number, height: number}>} Pixel dimensions
 * @throws {Error} If blob cannot be decoded
 */
export async function decodeImageDimensions(imageBlob) {
  if (!imageBlob || !(imageBlob instanceof Blob)) {
    throw new Error('imageBlob must be a Blob object');
  }

  // Create object URL for decoding
  const objectUrl = URL.createObjectURL(imageBlob);

  try {
    // Use Image API for dimension reading (reliable, no decode overhead)
    const dimensions = await new Promise((resolve, reject) => {
      const img = new Image();

      // Set up handlers before assigning src
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to decode image: invalid format or corrupted data'));
      };

      // CORS: object URLs from clipboard are same-origin, no CORS issue
      img.crossOrigin = '';
      img.src = objectUrl;
    });

    return dimensions;
  } finally {
    // Always clean up the object URL
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Compute a sensible default position for a newly pasted image.
 * Defaults to top-left corner (0, 0) or a specified offset within a target element.
 * Implements: FR-IMP-4 (position at sensible default)
 *
 * @param {number} targetX - X position (mm) of paste target area, default 0
 * @param {number} targetY - Y position (mm) of paste target area, default 0
 * @param {number} targetWidth - Width (mm) of available space, default 100
 * @param {number} targetHeight - Height (mm) of available space, default 100
 * @returns {{x: number, y: number}} Default position in mm
 */
export function getDefaultPosition(targetX = 0, targetY = 0, targetWidth = 100, targetHeight = 100) {
  // Default: top-left corner of target area with small margin
  const margin = 5; // mm
  return {
    x: targetX + margin,
    y: targetY + margin
  };
}
