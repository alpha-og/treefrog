import {
  File,
  Folder,
  FileText,
  FileCode,
  FileJson
} from "lucide-react";

export function getFileIcon(
  name: string,
  isDir: boolean
) {
  if (isDir) return <Folder size={14} />;

  const ext =
    name.split(".").pop()?.toLowerCase() || "";

  switch (ext) {
    case "tex":
    case "txt":
      return <FileText size={14} />;
    case "json":
      return <FileJson size={14} />;
    case "js":
    case "ts":
    case "tsx":
    case "jsx":
    case "py":
    case "rs":
    case "go":
      return <FileCode size={14} />;
    default:
      return <File size={14} />;
  }
}
