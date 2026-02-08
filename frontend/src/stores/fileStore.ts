import { create } from "zustand";
import { FileEntry } from "../types";

interface FileState {
  entries: FileEntry[];
  currentDir: string;
  currentFile: string;
  isBinary: boolean;
  fileContent: string;
  folderCache: Map<string, FileEntry[]>;
  setEntries: (entries: FileEntry[]) => void;
  setCurrentDir: (dir: string) => void;
  setCurrentFile: (path: string) => void;
  setIsBinary: (isBinary: boolean) => void;
  setFileContent: (content: string) => void;
  cacheFolderContents: (path: string, entries: FileEntry[]) => void;
  getCachedFolderContents: (path: string) => FileEntry[] | undefined;
  clear: () => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  entries: [],
  currentDir: "",
  currentFile: "",
  isBinary: false,
  fileContent: "",
  folderCache: new Map(),
  setEntries: (entries) => set({ entries }),
  setCurrentDir: (dir) => set({ currentDir: dir }),
  setCurrentFile: (path) => set({ currentFile: path }),
  setIsBinary: (isBinary) => set({ isBinary }),
  setFileContent: (content) => set({ fileContent: content }),
  cacheFolderContents: (path: string, entries: FileEntry[]) => {
    const state = get();
    const newCache = new Map(state.folderCache);
    newCache.set(path, entries);
    set({ folderCache: newCache });
  },
  getCachedFolderContents: (path: string) => {
    return get().folderCache.get(path);
  },
  clear: () =>
    set({
      entries: [],
      currentDir: "",
      currentFile: "",
      isBinary: false,
      fileContent: "",
      folderCache: new Map(),
    }),
}));
