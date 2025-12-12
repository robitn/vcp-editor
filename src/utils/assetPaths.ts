import { convertFileSrc } from "@tauri-apps/api/core";

/**
 * Normalize a filesystem path for use with Tauri's asset protocol.
 * Converts Windows backslashes to forward slashes, collapses multiple slashes,
 * and strips any existing file:// prefix.
 * 
 * @param path - Filesystem path (can be absolute or relative, Windows or POSIX)
 * @returns Normalized path suitable for convertFileSrc
 */
export function normalizePath(path: string): string {
  if (!path) return '';
  
  let normalized = path.replace(/\\/g, '/');
  normalized = normalized.replace(/\/+/g, '/');
  normalized = normalized.trim();
  
  // Strip file:// prefix if present
  if (normalized.startsWith('file://')) {
    normalized = normalized.replace(/^file:+\/*/, '');
  }
  
  return normalized;
}

/**
 * Convert a filesystem path to an asset URL suitable for use in img src attributes.
 * Normalizes the path and passes it to Tauri's convertFileSrc.
 * 
 * @param path - Filesystem path to convert
 * @returns Asset URL (e.g., http://asset.localhost/...) or empty string if conversion fails
 */
export function toAssetUrl(path: string): string {
  if (!path) return '';
  
  try {
    const normalized = normalizePath(path);
    return convertFileSrc(normalized);
  } catch (err) {
    console.error('Failed to convert path to asset URL:', path, err);
    return '';
  }
}

/**
 * Build a path to an image asset in the VCP resources folder.
 * 
 * @param vcpResourcesFolder - Base VCP resources folder path
 * @param imageName - Name of the image file (with or without extension)
 * @param extension - File extension (default: 'svg')
 * @returns Full filesystem path to the image
 */
export function getImagePath(
  vcpResourcesFolder: string,
  imageName: string,
  extension: string = 'svg'
): string {
  if (!vcpResourcesFolder || !imageName) return '';
  
  const name = imageName.replace(/\.[^/.]+$/, ''); // strip existing extension
  return `${vcpResourcesFolder}/images/${name}.${extension}`;
}

/**
 * Build a path to a button asset in the VCP resources folder.
 * 
 * @param vcpResourcesFolder - Base VCP resources folder path
 * @param buttonName - Name of the button folder
 * @param fileName - Name of the file within the button folder
 * @returns Full filesystem path to the button asset
 */
export function getButtonAssetPath(
  vcpResourcesFolder: string,
  buttonName: string,
  fileName: string
): string {
  if (!vcpResourcesFolder || !buttonName || !fileName) return '';
  return `${vcpResourcesFolder}/Buttons/${buttonName}/${fileName}`;
}

/**
 * Build an asset URL for an image in the VCP resources folder.
 * 
 * @param vcpResourcesFolder - Base VCP resources folder path
 * @param imageName - Name of the image file (with or without extension)
 * @param extension - File extension (default: 'svg')
 * @returns Asset URL suitable for img src attribute
 */
export function getImageUrl(
  vcpResourcesFolder: string,
  imageName: string,
  extension: string = 'svg'
): string {
  const path = getImagePath(vcpResourcesFolder, imageName, extension);
  return toAssetUrl(path);
}

/**
 * Build an asset URL for a button asset in the VCP resources folder.
 * 
 * @param vcpResourcesFolder - Base VCP resources folder path
 * @param buttonName - Name of the button folder
 * @param fileName - Name of the file within the button folder
 * @returns Asset URL suitable for img src attribute
 */
export function getButtonAssetUrl(
  vcpResourcesFolder: string,
  buttonName: string,
  fileName: string
): string {
  const path = getButtonAssetPath(vcpResourcesFolder, buttonName, fileName);
  return toAssetUrl(path);
}
