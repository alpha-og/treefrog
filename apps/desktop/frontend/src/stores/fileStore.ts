import { create } from "zustand";
import { FileEntry } from "../types";

interface FileState {
  // Core file state
  entries: FileEntry[];
  currentDir: string;
  currentFile: string;
  isBinary: boolean;
  fileContent: string;
  folderCache: Map<string, FileEntry[]>;
  
  // Filtering state
  searchQuery: string;
  filterHidden: boolean;
  filterType: "all" | "latex" | "image" | "code";
  sortBy: "name" | "size" | "date";
  sortOrder: "asc" | "desc";
  
  // Actions
  setEntries: (entries: FileEntry[]) => void;
  setCurrentDir: (dir: string) => void;
  setCurrentFile: (path: string) => void;
  setIsBinary: (isBinary: boolean) => void;
  setFileContent: (content: string) => void;
  cacheFolderContents: (path: string, entries: FileEntry[]) => void;
  getCachedFolderContents: (path: string) => FileEntry[] | undefined;
  clearFolderCache: (path: string) => void;
  clearAllFolderCache: () => void;
  clear: () => void;
  
  // Filtering actions
  setSearchQuery: (query: string) => void;
  toggleFilterHidden: () => void;
  setFilterType: (type: "all" | "latex" | "image" | "code") => void;
  setSortBy: (by: "name" | "size" | "date") => void;
  toggleSortOrder: () => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  // Core file state
  entries: [],
  currentDir: "",
  currentFile: "",
  isBinary: false,
  fileContent: "",
  folderCache: new Map(),
  
  // Filtering state
  searchQuery: "",
  filterHidden: false,
  filterType: "all",
  sortBy: "name",
  sortOrder: "asc",

  // Core actions
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
  
  clearFolderCache: (path: string) => {
    const state = get();
    const newCache = new Map(state.folderCache);
    newCache.delete(path);
    set({ folderCache: newCache });
  },
  
  clearAllFolderCache: () => {
    set({ folderCache: new Map() });
  },
  
  clear: () =>
    set({
      entries: [],
      currentDir: "",
      currentFile: "",
      isBinary: false,
      fileContent: "",
      folderCache: new Map(),
      searchQuery: "",
      filterHidden: false,
      filterType: "all",
      sortBy: "name",
      sortOrder: "asc",
    }),

  // Filtering actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  toggleFilterHidden: () => {
    set((state) => ({ filterHidden: !state.filterHidden }));
  },
  
  setFilterType: (type) => set({ filterType: type }),
  
  setSortBy: (by) => set({ sortBy: by }),
  
  toggleSortOrder: () => {
    set((state) => ({ 
      sortOrder: state.sortOrder === "asc" ? "desc" : "asc" 
    }));
  },
}));
