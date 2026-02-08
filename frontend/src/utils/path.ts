export function joinPath(base: string, name: string) {
  if (!base) return name;
  if (!name) return base;
  return `${base}/${name}`;
}

export function baseName(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

export function parentDir(path: string) {
  if (!path) return "";
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

