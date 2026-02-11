import React from "react";
import {
  File,
  Folder,
  FileText,
  FileCode,
  FileJson,
  FileImage,
  FileType,
  FileSpreadsheet,
  FileArchive,
  FileAudio,
  FileVideo,
  Settings,
  GitBranch,
} from "lucide-react";

interface FileIconConfig {
  icon: React.ReactNode;
  color: string;
}

const fileTypeMap: Record<string, FileIconConfig> = {
  // LaTeX
  tex: { icon: <FileType size={14} />, color: "text-emerald-500" },
  sty: { icon: <FileType size={14} />, color: "text-emerald-400" },
  cls: { icon: <FileType size={14} />, color: "text-emerald-400" },
  bib: { icon: <FileText size={14} />, color: "text-amber-500" },
  bst: { icon: <FileCode size={14} />, color: "text-amber-400" },
  
  // Programming
  js: { icon: <FileCode size={14} />, color: "text-yellow-400" },
  jsx: { icon: <FileCode size={14} />, color: "text-cyan-400" },
  ts: { icon: <FileCode size={14} />, color: "text-blue-400" },
  tsx: { icon: <FileCode size={14} />, color: "text-cyan-400" },
  py: { icon: <FileCode size={14} />, color: "text-yellow-300" },
  rs: { icon: <FileCode size={14} />, color: "text-orange-400" },
  go: { icon: <FileCode size={14} />, color: "text-cyan-300" },
  cpp: { icon: <FileCode size={14} />, color: "text-blue-500" },
  c: { icon: <FileCode size={14} />, color: "text-blue-400" },
  h: { icon: <FileCode size={14} />, color: "text-blue-300" },
  java: { icon: <FileCode size={14} />, color: "text-orange-500" },
  
  // Web
  html: { icon: <FileCode size={14} />, color: "text-orange-400" },
  css: { icon: <FileCode size={14} />, color: "text-blue-300" },
  scss: { icon: <FileCode size={14} />, color: "text-pink-400" },
  sass: { icon: <FileCode size={14} />, color: "text-pink-400" },
  
  // Data
  json: { icon: <FileJson size={14} />, color: "text-yellow-200" },
  yaml: { icon: <FileText size={14} />, color: "text-red-300" },
  yml: { icon: <FileText size={14} />, color: "text-red-300" },
  xml: { icon: <FileCode size={14} />, color: "text-orange-300" },
  csv: { icon: <FileSpreadsheet size={14} />, color: "text-green-400" },
  
  // Images
  jpg: { icon: <FileImage size={14} />, color: "text-purple-400" },
  jpeg: { icon: <FileImage size={14} />, color: "text-purple-400" },
  png: { icon: <FileImage size={14} />, color: "text-purple-400" },
  gif: { icon: <FileImage size={14} />, color: "text-purple-400" },
  svg: { icon: <FileImage size={14} />, color: "text-orange-300" },
  webp: { icon: <FileImage size={14} />, color: "text-purple-300" },
  bmp: { icon: <FileImage size={14} />, color: "text-purple-300" },
  ico: { icon: <FileImage size={14} />, color: "text-blue-200" },
  
  // Archives
  zip: { icon: <FileArchive size={14} />, color: "text-yellow-500" },
  tar: { icon: <FileArchive size={14} />, color: "text-yellow-500" },
  gz: { icon: <FileArchive size={14} />, color: "text-yellow-500" },
  rar: { icon: <FileArchive size={14} />, color: "text-yellow-500" },
  "7z": { icon: <FileArchive size={14} />, color: "text-yellow-500" },
  
  // Audio
  mp3: { icon: <FileAudio size={14} />, color: "text-cyan-300" },
  wav: { icon: <FileAudio size={14} />, color: "text-cyan-300" },
  ogg: { icon: <FileAudio size={14} />, color: "text-cyan-300" },
  flac: { icon: <FileAudio size={14} />, color: "text-cyan-300" },
  
  // Video
  mp4: { icon: <FileVideo size={14} />, color: "text-pink-400" },
  avi: { icon: <FileVideo size={14} />, color: "text-pink-400" },
  mkv: { icon: <FileVideo size={14} />, color: "text-pink-400" },
  mov: { icon: <FileVideo size={14} />, color: "text-pink-400" },
  
  // Documents
  pdf: { icon: <FileText size={14} />, color: "text-red-500" },
  doc: { icon: <FileText size={14} />, color: "text-blue-500" },
  docx: { icon: <FileText size={14} />, color: "text-blue-500" },
  xls: { icon: <FileSpreadsheet size={14} />, color: "text-green-500" },
  xlsx: { icon: <FileSpreadsheet size={14} />, color: "text-green-500" },
  ppt: { icon: <FileText size={14} />, color: "text-orange-500" },
  pptx: { icon: <FileText size={14} />, color: "text-orange-500" },
  
  // Text
  txt: { icon: <FileText size={14} />, color: "text-gray-400" },
  md: { icon: <FileText size={14} />, color: "text-blue-300" },
  log: { icon: <FileText size={14} />, color: "text-gray-500" },
};

// Special file names
const specialFileMap: Record<string, FileIconConfig> = {
  ".gitignore": { icon: <GitBranch size={14} />, color: "text-orange-500" },
  ".gitattributes": { icon: <GitBranch size={14} />, color: "text-orange-400" },
  ".env": { icon: <Settings size={14} />, color: "text-yellow-500" },
  ".env.local": { icon: <Settings size={14} />, color: "text-yellow-400" },
  ".env.production": { icon: <Settings size={14} />, color: "text-red-400" },
  ".env.development": { icon: <Settings size={14} />, color: "text-green-400" },
  ".eslintrc": { icon: <Settings size={14} />, color: "text-purple-400" },
  ".prettierrc": { icon: <Settings size={14} />, color: "text-pink-300" },
  "package.json": { icon: <FileJson size={14} />, color: "text-green-400" },
  "tsconfig.json": { icon: <Settings size={14} />, color: "text-blue-400" },
  "readme.md": { icon: <FileText size={14} />, color: "text-blue-300" },
  "README.md": { icon: <FileText size={14} />, color: "text-blue-300" },
  "LICENSE": { icon: <FileText size={14} />, color: "text-yellow-300" },
  "Dockerfile": { icon: <Settings size={14} />, color: "text-blue-400" },
  "docker-compose.yml": { icon: <Settings size={14} />, color: "text-blue-400" },
  "Makefile": { icon: <Settings size={14} />, color: "text-gray-400" },
  "CMakeLists.txt": { icon: <Settings size={14} />, color: "text-gray-400" },
};

export function getFileIcon(name: string, isDir: boolean): React.ReactNode {
  if (isDir) {
    return <Folder size={16} className="text-amber-500" />;
  }

  // Check special files first
  const specialConfig = specialFileMap[name];
  if (specialConfig) {
    return React.cloneElement(specialConfig.icon as React.ReactElement, {
      className: specialConfig.color,
    });
  }

  // Check by extension
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const config = fileTypeMap[ext];

  if (config) {
    return React.cloneElement(config.icon as React.ReactElement, {
      className: config.color,
    });
  }

  // Default file icon
  return <File size={14} className="text-gray-400" />;
}

export function getFileIconColor(name: string, isDir: boolean): string {
  if (isDir) return "text-amber-500";

  // Check special files
  const specialConfig = specialFileMap[name];
  if (specialConfig) {
    return specialConfig.color;
  }

  // Check by extension
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const config = fileTypeMap[ext];

  if (config) {
    return config.color;
  }

  return "text-gray-400";
}

export function getFileIconComponent(name: string, isDir: boolean): React.ReactNode {
  return getFileIcon(name, isDir);
}
