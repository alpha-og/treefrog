import { GET } from "./api";

export const viewSync = (
  file: string,
  line: number,
  col: number
) =>
  GET(
    `/synctex/view?file=${encodeURIComponent(file)}&line=${line}&col=${col}`
  );

export const editSync = (page: number, x: number, y: number) =>
  GET(`/synctex/edit?page=${page}&x=${x}&y=${y}`);
