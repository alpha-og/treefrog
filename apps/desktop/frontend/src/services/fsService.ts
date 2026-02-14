import { GET, POST, PUT, getWailsApp } from "./api";
import { isWails } from "../utils/env";

export const listFiles = async (path: string) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.ListFiles(path);
  }
  return GET(`/files?path=${encodeURIComponent(path)}`);
};

export const readFile = async (path: string) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.ReadFile(path);
  }
  return GET(`/file?path=${encodeURIComponent(path)}`);
};

export const writeFile = async (path: string, content: string) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.WriteFile(path, content);
  }
  return PUT(`/file?path=${encodeURIComponent(path)}`, {
    content,
    isBinary: false,
  });
};

export const fsCreate = async (path: string, type: "file" | "dir") => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.CreateFile(path, type);
  }
  return POST("/fs/create", { path, type });
};

export const fsRename = async (from: string, to: string) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.RenameFile(from, to);
  }
  return POST("/fs/rename", { from, to });
};

export const fsMove = async (from: string, toDir: string) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.MoveFile(from, toDir);
  }
  return POST("/fs/move", { from, toDir });
};

export const fsCopy = async (from: string, to: string) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.DuplicateFile(from, to);
  }
  return POST("/fs/copy", { from, to });
};

export const fsDuplicate = async (from: string, to: string) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.DuplicateFile(from, to);
  }
  return POST("/fs/duplicate", { from, to });
};

export const fsDelete = async (path: string, recursive: boolean) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.DeleteFile(path, recursive);
  }
  return POST("/fs/delete", { path, recursive });
};

/**
 * Upload files from external drag-and-drop
 * @param files - Array of File objects from drag event
 * @param targetPath - Target directory path
 */
export const fsUploadFiles = async (
  files: File[],
  targetPath: string
): Promise<void> => {
  if (isWails()) {
    // In Wails mode, we need to read file contents and write them
    const app = getWailsApp();
    if (!app) throw new Error("Wails app not available");

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const content = btoa(binary);
      const targetFilePath = targetPath
        ? `${targetPath}/${file.name}`
        : file.name;

      await app.WriteFile(targetFilePath, content);
    }
  } else {
    // In web mode, use FormData
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("targetPath", targetPath);

    await POST("/fs/upload", formData);
  }
};
