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
        console.error("Failed to load files:", err);
      }
    },
    [setEntries, setCurrentDir]
  );

  const openFile = useCallback(
    async (path: string) => {
      try {
        console.log("[useFiles] Opening file:", path);
        setCurrentFile(path);
        const data = await readFile(path);
        console.log("[useFiles] File read response:", { isBinary: data.isBinary, contentLength: data.content?.length || 0 });
        setIsBinary(data.isBinary);
        setFileContent(data.content || "");
        console.log("[useFiles] Store updated with file content");
      } catch (err) {
        console.error("Failed to open file:", err);
      }
    },
    [setCurrentFile, setIsBinary, setFileContent]
  );

  const saveFile = useCallback(
    async (path: string, content: string) => {
      try {
        await writeFile(path, content);
      } catch (err) {
        console.error("Failed to save file:", err);
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
        console.error("Failed to create file/dir:", err);
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
        console.error("Failed to rename file:", err);
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
        console.error("Failed to move file:", err);
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
        console.error("Failed to duplicate file:", err);
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
        console.error("Failed to delete file:", err);
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
