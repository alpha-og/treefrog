import { create } from "zustand";

interface PaneState {
  sidebar: boolean;
  editor: boolean;
  preview: boolean;
  isResizing: boolean;
  toggle: (pane: "sidebar" | "editor" | "preview") => void;
  setIsResizing: (resizing: boolean) => void;
}

interface DimensionState {
  sidebarWidth: number;
  editorWidth: number;
  setSidebarWidth: (width: number) => void;
  setEditorWidth: (width: number) => void;
}

export const usePaneStore = create<PaneState>((set) => ({
  sidebar: true,
  editor: true,
  preview: true,
  isResizing: false,
  toggle: (pane) =>
    set((state) => {
      const newState = { ...state, [pane]: !state[pane] };
      // Ensure at least sidebar is visible
      const visibleCount = [newState.sidebar, newState.editor, newState.preview].filter(Boolean).length;
      if (visibleCount === 0) {
        return { ...newState, sidebar: true };
      }
      return newState;
    }),
  setIsResizing: (resizing) => set({ isResizing: resizing }),
}));

export const useDimensionStore = create<DimensionState>((set) => ({
  sidebarWidth: 280,
  editorWidth: 400,
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setEditorWidth: (width) => set({ editorWidth: width }),
}));
