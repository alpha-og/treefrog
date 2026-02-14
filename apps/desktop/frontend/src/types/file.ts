export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modTime: string;
  entries?: FileEntry[];
}

export interface FileContent {
  content: string;
  isBinary: boolean;
}