import { useCallback, useEffect } from "react";
import { useFileStore } from "../stores/fileStore";
import {
  listFiles,
  readFile,
  writeFile,
  fsCreate,
  fsRename,
  fsMove,
  fsCopy,
  fsDuplicate,
  fsDelete,
  fsUploadFiles,
} from "../services/fsService";
import { createLogger } from "../utils/logger";

const log = createLogger("Files");

// Helper function to get parent directory path
const getParentDir = (path: string): string => {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
};

export function useFiles() {
  const {
    entries,
    currentDir,
    currentFile,
    isBinary,
    fileContent,
    setEntries,
    setCurrentDir,
    setCurrentFile,
    setIsBinary,
    setFileContent,
    cacheFolderContents,
    clearFolderCache,
    clear,
  } = useFileStore();

  const loadEntries = useCallback(
    async (dir: string) => {
      try {
        const data = await listFiles(dir || ".");
        setEntries(data);
        setCurrentDir(dir);
        
        // Cache the loaded folder contents for nested folder access
        // This ensures that when we navigate to a subfolder, its contents are cached
        if (dir !== "" && dir !== ".") {
          cacheFolderContents(dir, data);
        }
      } catch (err) {
        log.error("Failed to load files", { dir, error: err });
      }
    },
    [setEntries, setCurrentDir, cacheFolderContents]
  );

  const openFile = useCallback(
    async (path: string) => {
      try {
        setCurrentFile(path);
        const data = await readFile(path);
        setIsBinary(data.isBinary);
        setFileContent(data.content || "");
      } catch (err) {
        log.error("Failed to open file", { path, error: err });
      }
    },
    [setCurrentFile, setIsBinary, setFileContent]
  );

  const saveFile = useCallback(
    async (path: string, content: string) => {
      try {
        await writeFile(path, content);
      } catch (err) {
        log.error("Failed to save file", { path, error: err });
        throw err;
      }
    },
    []
  );

  const createFile = useCallback(
    async (path: string, type: "file" | "dir") => {
      try {
        await fsCreate(path, type);
        // Get parent directory and reload it to show the new file/folder
        const parentDir = getParentDir(path);
        const dirToReload = parentDir || currentDir;
        clearFolderCache(dirToReload);
        await loadEntries(dirToReload);
        // Also reload current dir if we're in the directory where the file was created
        if (currentDir !== dirToReload) {
          clearFolderCache(currentDir);
          await loadEntries(currentDir);
        }
      } catch (err) {
        log.error("Failed to create file/dir", { path, type, error: err });
        throw err;
      }
    },
    [currentDir, loadEntries, clearFolderCache]
  );

  const renameFile = useCallback(
    async (from: string, to: string) => {
      try {
        await fsRename(from, to);
        // Both old and new paths might be in different parent directories
        const oldParent = getParentDir(from);
        const newParent = getParentDir(to);
        
        clearFolderCache(oldParent || currentDir);
        if (newParent !== oldParent) {
          clearFolderCache(newParent || currentDir);
        }
        await loadEntries(currentDir);
        
        if (currentFile === from) {
          setCurrentFile(to);
          await openFile(to);
        }
      } catch (err) {
        log.error("Failed to rename file", { from, to, error: err });
        throw err;
      }
    },
    [currentDir, currentFile, loadEntries, openFile, setCurrentFile, clearFolderCache]
  );

  const moveFile = useCallback(
    async (from: string, toDir: string) => {
      try {
        await fsMove(from, toDir);
        // Clear cache for source and destination directories
        const sourceParent = getParentDir(from);
        clearFolderCache(sourceParent || currentDir);
        clearFolderCache(toDir || currentDir);
        await loadEntries(currentDir);
        
        const fileName = from.split("/").pop() || "";
        const newPath = toDir ? `${toDir}/${fileName}` : fileName;
        if (currentFile === from) {
          setCurrentFile(newPath);
          await openFile(newPath);
        }
      } catch (err) {
        log.error("Failed to move file", { from, toDir, error: err });
        throw err;
      }
    },
    [currentDir, currentFile, loadEntries, openFile, setCurrentFile, clearFolderCache]
  );

  const copyFile = useCallback(
    async (from: string, to: string) => {
      try {
        await fsCopy(from, to);
        // Clear cache for destination directory
        const destParent = getParentDir(to);
        clearFolderCache(destParent || currentDir);
        await loadEntries(currentDir);
        log.info("File copied successfully", { from, to });
      } catch (err) {
        log.error("Failed to copy file", { from, to, error: err });
        throw err;
      }
    },
    [currentDir, loadEntries, clearFolderCache]
  );

  const duplicateFile = useCallback(
    async (from: string, to: string) => {
      try {
        await fsDuplicate(from, to);
        // Clear cache for the directory containing the duplicate
        const destParent = getParentDir(to);
        clearFolderCache(destParent || currentDir);
        await loadEntries(currentDir);
      } catch (err) {
        log.error("Failed to duplicate file", { from, to, error: err });
        throw err;
      }
    },
    [currentDir, loadEntries, clearFolderCache]
  );

  const deleteFile = useCallback(
    async (path: string, recursive: boolean) => {
      try {
        await fsDelete(path, recursive);
        // Get parent directory and invalidate its cache
        const parentDir = getParentDir(path);
        const dirToReload = parentDir || currentDir;
        clearFolderCache(dirToReload);
        // Also clear cache for the deleted path itself (in case it's a directory)
        clearFolderCache(path);
        await loadEntries(dirToReload);
        
        if (currentFile === path) {
          setCurrentFile("");
          setFileContent("");
        }
      } catch (err) {
        log.error("Failed to delete file", { path, recursive, error: err });
        throw err;
      }
    },
    [currentDir, currentFile, loadEntries, setCurrentFile, setFileContent, clearFolderCache]
  );

  const uploadFiles = useCallback(
    async (files: File[], targetPath: string) => {
      try {
        await fsUploadFiles(files, targetPath);
        // Clear cache for the target directory
        clearFolderCache(targetPath || currentDir);
        await loadEntries(currentDir);
        log.info("Files uploaded successfully", { 
          count: files.length, 
          target: targetPath 
        });
      } catch (err) {
        log.error("Failed to upload files", { count: files.length, target: targetPath, error: err });
        throw err;
      }
    },
    [currentDir, loadEntries, clearFolderCache]
  );

  const refresh = useCallback(async () => {
    await loadEntries(currentDir);
  }, [currentDir, loadEntries]);

  return {
    entries,
    currentDir,
    currentFile,
    isBinary,
    fileContent,
    loadEntries,
    openFile,
    saveFile,
    createFile,
    renameFile,
    moveFile,
    copyFile,
    duplicateFile,
    deleteFile,
    uploadFiles,
    refresh,
    clear,
  };
}
