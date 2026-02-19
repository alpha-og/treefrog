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

const EMPTY_SET = new Set<string>();

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: EMPTY_SET,
  lastSelectedId: null,

  select: (id) => {
    set((state) => {
      if (state.selectedIds.has(id)) {
        return { lastSelectedId: id };
      }
      const newSelected = new Set(state.selectedIds);
      newSelected.add(id);
      return { selectedIds: newSelected, lastSelectedId: id };
    });
  },

  deselect: (id) => {
    set((state) => {
      if (!state.selectedIds.has(id)) {
        return state;
      }
      const newSelected = new Set(state.selectedIds);
      newSelected.delete(id);
      return { 
        selectedIds: newSelected.size === 0 ? EMPTY_SET : newSelected, 
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
    set((state) => {
      const newSet = new Set(ids);
      if (setsEqual(state.selectedIds, newSet)) {
        return state;
      }
      return { selectedIds: newSet, lastSelectedId: ids[ids.length - 1] || null };
    });
  },

  clear: () => {
    set((state) => {
      if (state.selectedIds.size === 0 && state.lastSelectedId === null) {
        return state;
      }
      return { selectedIds: EMPTY_SET, lastSelectedId: null };
    });
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
