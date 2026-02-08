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
