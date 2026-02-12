import { GET, getWailsApp } from "./api";
import { isWails } from "../utils/env";

export const viewSync = (file: string, line: number, col: number) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.SyncTeXView(file, line, col);
  }
  return GET(
    `/synctex/view?file=${encodeURIComponent(file)}&line=${line}&col=${col}`
  );
};

export const editSync = (page: number, x: number, y: number) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.SyncTeXEdit(page, x, y);
  }
  return GET(`/synctex/edit?page=${page}&x=${x}&y=${y}`);
};
