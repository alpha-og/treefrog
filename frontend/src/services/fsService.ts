import { GET, POST, PUT } from "./api";

export const listFiles = (path: string) =>
  GET(`/files?path=${encodeURIComponent(path)}`);

export const readFile = (path: string) =>
  GET(`/file?path=${encodeURIComponent(path)}`);

export const writeFile = (
  path: string,
  content: string
) =>
  PUT(`/file?path=${encodeURIComponent(path)}`, {
    content,
    isBinary: false,
  });

export const fsCreate = (
  path: string,
  type: "file" | "dir"
) =>
  POST("/fs/create", { path, type });

export const fsRename = (from: string, to: string) =>
  POST("/fs/rename", { from, to });

export const fsMove = (from: string, toDir: string) =>
  POST("/fs/move", { from, toDir });

export const fsDuplicate = (from: string, to: string) =>
  POST("/fs/duplicate", { from, to });

export const fsDelete = (path: string, recursive: boolean) =>
  POST("/fs/delete", { path, recursive });

