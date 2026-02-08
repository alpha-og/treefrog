import { create } from "zustand";
import { FileEntry } from "../types";

interface FileState {
  entries: FileEntry[];
  currentDir: string;
  currentFile: string;
  isBinary: boolean;
  fileContent: string;
  setEntries: (entries: FileEntry[]) => void;
  setCurrentDir: (dir: string) => void;
  setCurrentFile: (path: string) => void;
  setIsBinary: (isBinary: boolean) => void;
  setFileContent: (content: string) => void;
  clear: () => void;
}

export const useFileStore = create<FileState>((set) => ({
  entries: [],
  currentDir: "",
  currentFile: "",
  isBinary: false,
  fileContent: "",
  setEntries: (entries) => set({ entries }),
  setCurrentDir: (dir) => set({ currentDir: dir }),
  setCurrentFile: (path) => set({ currentFile: path }),
  setIsBinary: (isBinary) => set({ isBinary }),
  setFileContent: (content) => set({ fileContent: content }),
  clear: () =>
    set({
      entries: [],
      currentDir: "",
      currentFile: "",
      isBinary: false,
      fileContent: "",
    }),
}));
