import { useCallback, useEffect } from "react";
import { useFileStore } from "../stores/fileStore";
import {
  listFiles,
  readFile,
  writeFile,
  fsCreate,
  fsRename,
  fsMove,
  fsDuplicate,
  fsDelete,
} from "../services/fsService";
import { createLogger } from "../utils/logger";

const log = createLogger("Files");

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
    clear,
  } = useFileStore();

  const loadEntries = useCallback(
    async (dir: string) => {
      try {
        const data = await listFiles(dir || ".");
        setEntries(data);
        setCurrentDir(dir);
      } catch (err) {
        log.error("Failed to load files", { dir, error: err });
      }
    },
    [setEntries, setCurrentDir]
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
        await loadEntries(currentDir);
      } catch (err) {
        log.error("Failed to create file/dir", { path, type, error: err });
        throw err;
      }
    },
    [currentDir, loadEntries]
  );

  const renameFile = useCallback(
    async (from: string, to: string) => {
      try {
        await fsRename(from, to);
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
    [currentDir, currentFile, loadEntries, openFile, setCurrentFile]
  );

  const moveFile = useCallback(
    async (from: string, toDir: string) => {
      try {
        await fsMove(from, toDir);
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
    [currentDir, currentFile, loadEntries, openFile, setCurrentFile]
  );

  const duplicateFile = useCallback(
    async (from: string, to: string) => {
      try {
        await fsDuplicate(from, to);
        await loadEntries(currentDir);
      } catch (err) {
        log.error("Failed to duplicate file", { from, to, error: err });
        throw err;
      }
    },
    [currentDir, loadEntries]
  );

  const deleteFile = useCallback(
    async (path: string, recursive: boolean) => {
      try {
        await fsDelete(path, recursive);
        await loadEntries(currentDir);
        if (currentFile === path) {
          setCurrentFile("");
          setFileContent("");
        }
      } catch (err) {
        log.error("Failed to delete file", { path, recursive, error: err });
        throw err;
      }
    },
    [currentDir, currentFile, loadEntries, setCurrentFile, setFileContent]
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
    duplicateFile,
    deleteFile,
    refresh,
    clear,
  };
}
