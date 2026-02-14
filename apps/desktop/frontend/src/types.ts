export type FileEntry = {
  name: string;
  isDir: boolean;
  size: number;
  modTime: string;
};

export type BuildStatus = {
  id: string;
  state: string;
  message: string;
  startedAt?: string;
  endedAt?: string;
};

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

