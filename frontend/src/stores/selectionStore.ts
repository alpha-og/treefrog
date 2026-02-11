import { create } from "zustand";

interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  
  // Actions
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string) => void;
  selectRange: (startId: string, endId: string, allIds: string[]) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  has: (id: string) => boolean;
  getSelectedCount: () => number;
  isEmpty: () => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: new Set(),
  lastSelectedId: null,

  select: (id) => {
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      newSelected.add(id);
      return { selectedIds: newSelected, lastSelectedId: id };
    });
  },

  deselect: (id) => {
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      newSelected.delete(id);
      return { 
        selectedIds: newSelected, 
        lastSelectedId: state.lastSelectedId === id ? null : state.lastSelectedId 
      };
    });
  },

  toggle: (id) => {
    const { has, select, deselect } = get();
    if (has(id)) {
      deselect(id);
    } else {
      select(id);
    }
  },

  selectRange: (startId, endId, allIds) => {
    const startIndex = allIds.indexOf(startId);
    const endIndex = allIds.indexOf(endId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const rangeIds = allIds.slice(start, end + 1);
    
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      rangeIds.forEach((id) => newSelected.add(id));
      return { selectedIds: newSelected, lastSelectedId: endId };
    });
  },

  selectAll: (ids) => {
    set({ selectedIds: new Set(ids), lastSelectedId: ids[ids.length - 1] || null });
  },

  clear: () => {
    set({ selectedIds: new Set(), lastSelectedId: null });
  },

  has: (id) => {
    return get().selectedIds.has(id);
  },

  getSelectedCount: () => {
    return get().selectedIds.size;
  },

  isEmpty: () => {
    return get().selectedIds.size === 0;
  },
}));
