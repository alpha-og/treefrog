import * as CryptoJS from 'crypto-js';

/**
 * Compute SHA256 checksum for a file
 * @param file The file to compute checksum for
 * @returns Promise resolving to hex-encoded SHA256 hash
 */
export async function computeFileChecksum(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
  return CryptoJS.SHA256(wordArray).toString();
}

/**
 * Generate deterministic project ID from project path
 * @param projectPath The root path of the project
 * @returns SHA256 hash of the project path (serves as stable project identifier)
 */
export function generateProjectId(projectPath: string): string {
  return CryptoJS.SHA256(projectPath).toString();
}

/**
 * Interface for file information with checksums
 */
export interface FileWithChecksum {
  path: string;
  checksum: string;
  size: number;
}

/**
 * Compute checksums for multiple files
 * @param files Array of files to compute checksums for
 * @returns Promise resolving to array of FileWithChecksum objects
 */
export async function computeMultipleChecksums(
  files: File[]
): Promise<FileWithChecksum[]> {
  const checksums = await Promise.all(
    files.map(async (file) => ({
      path: file.name,
      checksum: await computeFileChecksum(file),
      size: file.size,
    }))
  );
  return checksums;
}
