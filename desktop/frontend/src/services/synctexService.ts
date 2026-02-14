import { GET, getWailsApp } from "./api";
import { isWails } from "../utils/env";

export interface ViewResult {
  page: number;
  x: number;
  y: number;
  file: string;
  line: number;
}

export interface EditResult {
  file: string;
  line: number;
  col: number;
}

export const viewSync = async (
  buildId: string | null,
  file: string,
  line: number,
  col: number = 0
): Promise<ViewResult | null> => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.SyncTeXView(file, line, col) ?? null;
  }
  if (!buildId) {
    console.warn("viewSync: no buildId available for web mode");
    return null;
  }
  return GET(
    `/build/${buildId}/synctex/view?file=${encodeURIComponent(file)}&line=${line}&col=${col}`
  );
};

export const editSync = async (
  buildId: string | null,
  page: number,
  x: number,
  y: number
): Promise<EditResult | null> => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.SyncTeXEdit(page, x, y) ?? null;
  }
  if (!buildId) {
    console.warn("editSync: no buildId available for web mode");
    return null;
  }
  return GET(`/build/${buildId}/synctex/edit?page=${page}&x=${x}&y=${y}`);
};
