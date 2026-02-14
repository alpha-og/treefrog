import { ModalState } from "../types";
import { joinPath } from "./path";

export function clampZoom(z: number) {
  return Math.min(2.4, Math.max(0.6, Math.round(z * 10) / 10));
}

export function clampPage(p: number, max: number) {
  if (!p || Number.isNaN(p)) return 1;
  return Math.min(Math.max(1, p), Math.max(1, max));
}

export function modalTitle(modal: ModalState) {
  switch (modal.kind) {
    case "create":
      return modal.type === "file"
        ? "Create file"
        : "Create folder";
    case "rename":
      return "Rename";
    case "move":
      return "Move";
    case "duplicate":
      return "Duplicate";
    case "delete":
      return "Delete";
  }
}

export function modalPlaceholder(
  modal: ModalState,
  currentDir: string
) {
  switch (modal.kind) {
    case "create":
      return joinPath(
        currentDir,
        modal.type === "file"
          ? "new.tex"
          : "new-folder"
      );
    case "rename":
      return modal.path;
    case "move":
      return currentDir || "";
    case "duplicate":
      return modal.path + " copy";
    default:
      return "";
  }
}

export function modalHint(modal: ModalState) {
  switch (modal.kind) {
    case "create":
      return "Enter a relative path.";
    case "rename":
      return "Enter the new relative path.";
    case "move":
      return "Enter the destination directory path.";
    case "duplicate":
      return "Enter the new relative path.";
    case "delete":
      return modal.isDir
        ? "Delete folder recursively?"
        : "Delete this file?";
  }
}

