import { createLogger } from "./logger";

const log = createLogger("TreePersistence");

const STORAGE_KEYS = {
  EXPANDED_FOLDERS: "treefrog:sidebar:expanded",
  EXPANDED_PROJECT: "treefrog:sidebar:expandedProject",
  SCROLL_POSITION: "treefrog:sidebar:scroll",
  FILTER_HIDDEN: "treefrog:sidebar:filterHidden",
  SORT_BY: "treefrog:sidebar:sortBy",
  SORT_ORDER: "treefrog:sidebar:sortOrder",
};

/**
 * Persist expanded folders to localStorage
 */
export function persistExpandedFolders(folders: Set<string>, projectRoot?: string): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.EXPANDED_FOLDERS,
      JSON.stringify([...folders])
    );
    if (projectRoot) {
      localStorage.setItem(STORAGE_KEYS.EXPANDED_PROJECT, projectRoot);
    }
  } catch (err) {
    log.error("Failed to persist expanded folders", err);
  }
}

/**
 * Load expanded folders from localStorage
 * Returns empty set if project root has changed
 */
export function loadExpandedFolders(projectRoot?: string): Set<string> {
  try {
    // Check if project has changed - if so, clear stale expanded folders
    const storedProject = localStorage.getItem(STORAGE_KEYS.EXPANDED_PROJECT);
    if (projectRoot && storedProject && storedProject !== projectRoot) {
      log.debug("Project changed, clearing stale expanded folders", { 
        oldProject: storedProject, 
        newProject: projectRoot 
      });
      localStorage.removeItem(STORAGE_KEYS.EXPANDED_FOLDERS);
      localStorage.removeItem(STORAGE_KEYS.EXPANDED_PROJECT);
      return new Set();
    }
    
    const data = localStorage.getItem(STORAGE_KEYS.EXPANDED_FOLDERS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (err) {
    log.error("Failed to load expanded folders", err);
  }
  return new Set();
}

/**
 * Persist scroll position
 */
export function persistScrollPosition(position: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCROLL_POSITION, String(position));
  } catch (err) {
    log.error("Failed to persist scroll position", err);
  }
}

/**
 * Load scroll position
 */
export function loadScrollPosition(): number {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCROLL_POSITION);
    if (data) {
      const parsed = parseInt(data, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    log.error("Failed to load scroll position", err);
  }
  return 0;
}

/**
 * Persist filter settings
 */
export function persistFilterSettings(settings: {
  hidden: boolean;
  sortBy: "name" | "size" | "date";
  sortOrder: "asc" | "desc";
}): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FILTER_HIDDEN, String(settings.hidden));
    localStorage.setItem(STORAGE_KEYS.SORT_BY, settings.sortBy);
    localStorage.setItem(STORAGE_KEYS.SORT_ORDER, settings.sortOrder);
  } catch (err) {
    log.error("Failed to persist filter settings", err);
  }
}

/**
 * Load filter settings
 */
export function loadFilterSettings(): {
  hidden: boolean;
  sortBy: "name" | "size" | "date";
  sortOrder: "asc" | "desc";
} {
  try {
    const hidden = localStorage.getItem(STORAGE_KEYS.FILTER_HIDDEN) === "true";
    const sortBy = (localStorage.getItem(STORAGE_KEYS.SORT_BY) as "name" | "size" | "date") || "name";
    const sortOrder = (localStorage.getItem(STORAGE_KEYS.SORT_ORDER) as "asc" | "desc") || "asc";
    
    return { hidden, sortBy, sortOrder };
  } catch (err) {
    log.error("Failed to load filter settings", err);
  }
  
  return { hidden: false, sortBy: "name", sortOrder: "asc" };
}

/**
 * Clear all persisted sidebar state
 */
export function clearSidebarState(): void {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (err) {
    log.error("Failed to clear sidebar state", err);
  }
}

/**
 * Clear expanded folders for a specific project
 */
export function clearExpandedFolders(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.EXPANDED_FOLDERS);
    localStorage.removeItem(STORAGE_KEYS.EXPANDED_PROJECT);
  } catch (err) {
    log.error("Failed to clear expanded folders", err);
  }
}
