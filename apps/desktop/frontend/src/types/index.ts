export * from "./auth";
export * from "./build";
export * from "./config";
export * from "./file";
export * from "./git";
export * from "./project";
export * from "./renderer";
export * from "./synctex";
export * from "./wails";

export type SyncView = {
  page: number;
  x: number;
  y: number;
  file: string;
  line: number;
};

export type SyncEdit = {
  file: string;
  line: number;
  col: number;
};

export type ModalState =
  | { kind: "create"; type: "file" | "dir" }
  | { kind: "rename"; path: string }
  | { kind: "move"; path: string }
  | { kind: "duplicate"; path: string }
  | { kind: "delete"; path: string; isDir: boolean }
  | { kind: "commit" };