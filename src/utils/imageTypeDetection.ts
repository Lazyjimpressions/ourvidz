/**
 * Image type detection utility using magic bytes
 * Fixes iOS Safari issue where file.type is empty
 */

export interface DetectedImageType {
  mime: string;
  extension: string;
}

/**
 * Detect image type from magic bytes (first few bytes of file)
 * This is more reliable than file.type on iOS Safari
 */
export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }
  
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return { mime: 'image/png', extension: 'png' };
  }
  
  // GIF: 47 49 46 38 (GIF8)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return { mime: 'image/gif', extension: 'gif' };
  }
  
  // WebP: RIFF....WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { mime: 'image/webp', extension: 'webp' };
  }
  
  // HEIC/HEIF: ftyp box at offset 4 with heic/heif/mif1/msf1
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    // Check for heic, heif, mif1, msf1
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === 'heic' || brand === 'heix' || brand === 'hevc' || brand === 'hevx') {
      return { mime: 'image/heic', extension: 'heic' };
    }
    if (brand === 'heif' || brand === 'heim' || brand === 'heis' || brand === 'hevs') {
      return { mime: 'image/heif', extension: 'heif' };
    }
    if (brand === 'mif1' || brand === 'msf1') {
      return { mime: 'image/heif', extension: 'heif' };
    }
  }
  
  return null;
}

/**
 * Check if a file looks like an image based on type, extension, or magic bytes
 */
export function looksLikeImage(file: File): boolean {
  // If type is set and starts with image/, trust it
  if (file.type && file.type.startsWith('image/')) {
    return true;
  }
  
  // Fallback to extension check
  const imageExtensions = /\.(png|jpe?g|webp|gif|heic|heif)$/i;
  return imageExtensions.test(file.name);
}

/**
 * Async version that reads bytes to detect image type
 */
export async function detectImageTypeAsync(file: File): Promise<DetectedImageType | null> {
  try {
    // Read first 16 bytes for magic byte detection
    const slice = file.slice(0, 16);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return detectImageType(bytes);
  } catch (error) {
    console.error('Failed to read file bytes for type detection:', error);
    return null;
  }
}

/**
 * Get a normalized MIME type for a file, using magic bytes if file.type is empty
 */
export async function getNormalizedMimeType(file: File): Promise<string | null> {
  // If file.type is valid, use it
  if (file.type && file.type.startsWith('image/')) {
    return file.type;
  }
  
  // Try magic byte detection
  const detected = await detectImageTypeAsync(file);
  if (detected) {
    return detected.mime;
  }
  
  // Fallback to extension-based guess
  const ext = file.name.split('.').pop()?.toLowerCase();
  const extMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'heif': 'image/heif'
  };
  
  return ext ? extMap[ext] || null : null;
}

/**
 * Check if detected type indicates HEIC/HEIF (requires conversion)
 */
export function isHeicType(mime: string | null): boolean {
  return mime === 'image/heic' || mime === 'image/heif';
}

/**
 * Normalize file extension based on MIME type
 */
export function normalizeExtension(filename: string, mime: string): string {
  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif'
  };
  
  const newExt = extMap[mime];
  if (!newExt) return filename;
  
  // Replace existing extension or add new one
  const baseName = filename.replace(/\.[^.]+$/, '');
  return baseName + newExt;
}
