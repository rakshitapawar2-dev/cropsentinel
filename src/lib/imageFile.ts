/** Shared guard for crop photos, applied by both data sources. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export function assertUsableImage(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG or PNG).')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('That photo is larger than 10 MB. Please choose a smaller photo.')
  }
}
