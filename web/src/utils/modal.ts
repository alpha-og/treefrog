import { ModalState } from "../types";
import { joinPath } from "./path";

export function getModalTitle(modal: ModalState): string {
  switch (modal.kind) {
    case "create":
      return modal.type === "file" ? "Create file" : "Create folder";
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

export function getModalPlaceholder(modal: ModalState, currentDir: string): string {
  switch (modal.kind) {
    case "create":
      return joinPath(currentDir, modal.type === "file" ? "new.tex" : "new-folder");
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

export function getModalHint(modal: ModalState): string {
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
      return modal.isDir ? "Delete folder recursively?" : "Delete this file?";
  }
}
