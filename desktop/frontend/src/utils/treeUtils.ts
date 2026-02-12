import { FileEntry } from "../types";

export interface TreeNode extends FileEntry {
  path: string;
  children?: TreeNode[];
  depth: number;
}

/**
 * Build tree structure from cached folder contents
 */
export function buildTree(
  parentPath: string,
  depth: number,
  getCachedFolderContents: (path: string) => FileEntry[] | undefined,
  expandedFolders: Set<string>
): TreeNode[] {
  const contents = getCachedFolderContents(parentPath);

  if (!contents || !Array.isArray(contents)) {
    return [];
  }

  return contents.map((entry) => {
    const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    const isExpanded = expandedFolders.has(path);

    return {
      ...entry,
      path,
      depth,
      children:
        entry.isDir && isExpanded
          ? buildTree(path, depth + 1, getCachedFolderContents, expandedFolders)
          : undefined,
    };
  });
}

/**
 * Flatten tree to array for keyboard navigation
 */
export function flattenTree(nodes: TreeNode[]): string[] {
  const result: string[] = [];
  
  function traverse(node: TreeNode) {
    result.push(node.path);
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  nodes.forEach(traverse);
  return result;
}

/**
 * Find node by path in tree
 */
export function findNodeByPath(
  nodes: TreeNode[],
  path: string
): TreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Check if path is a descendant of ancestor
 */
export function isDescendant(path: string, ancestor: string): boolean {
  if (!ancestor) return false;
  return path.startsWith(ancestor + "/");
}

/**
 * Check if drop is valid (not dropping on self or descendant)
 */
export function isValidDrop(source: string, target: string): boolean {
  if (source === target) return false;
  if (isDescendant(target, source)) return false;
  return true;
}

/**
 * Get all descendant paths of a node
 */
export function getDescendantPaths(node: TreeNode): string[] {
  const paths: string[] = [];
  
  function collect(n: TreeNode) {
    if (n.children) {
      n.children.forEach((child) => {
        paths.push(child.path);
        collect(child);
      });
    }
  }
  
  collect(node);
  return paths;
}

/**
 * Filter tree nodes based on search query
 */
export function filterTree(
  nodes: TreeNode[],
  query: string
): TreeNode[] {
  const lowerQuery = query.toLowerCase();
  
  return nodes
    .map((node) => {
      const matches = node.name.toLowerCase().includes(lowerQuery);
      
      if (node.children) {
        const filteredChildren = filterTree(node.children, query);
        if (filteredChildren.length > 0 || matches) {
          return {
            ...node,
            children: filteredChildren,
          };
        }
      }
      
      if (matches) {
        return node;
      }
      
      return null;
    })
    .filter(Boolean) as TreeNode[];
}

/**
 * Sort tree nodes
 */
export function sortTree(
  nodes: TreeNode[],
  sortBy: "name" | "size" | "date",
  order: "asc" | "desc"
): TreeNode[] {
  const sorted = [...nodes].sort((a, b) => {
    // Folders always come first
    if (a.isDir !== b.isDir) {
      return a.isDir ? -1 : 1;
    }
    
    let comparison = 0;
    
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "size":
        comparison = a.size - b.size;
        break;
      case "date":
        comparison = new Date(a.modTime).getTime() - new Date(b.modTime).getTime();
        break;
    }
    
    return order === "asc" ? comparison : -comparison;
  });
  
  // Recursively sort children
  return sorted.map((node) => {
    if (node.children) {
      return {
        ...node,
        children: sortTree(node.children, sortBy, order),
      };
    }
    return node;
  });
}

/**
 * Filter tree by file type
 */
export function filterByType(
  nodes: TreeNode[],
  type: "all" | "latex" | "image" | "code"
): TreeNode[] {
  if (type === "all") return nodes;
  
  const typeMatchers: Record<string, (name: string) => boolean> = {
    latex: (name) => /\.(tex|sty|cls|bib)$/i.test(name),
    image: (name) => /\.(jpg|jpeg|png|gif|svg|webp|bmp)$/i.test(name),
    code: (name) => /\.(js|ts|jsx|tsx|py|go|rs|cpp|c|h|java)$/i.test(name),
  };
  
  const matcher = typeMatchers[type];
  if (!matcher) return nodes;
  
  return nodes
    .map((node) => {
      const matches = node.isDir || matcher(node.name);
      
      if (node.children) {
        const filteredChildren = filterByType(node.children, type);
        if (filteredChildren.length > 0 || matches) {
          return {
            ...node,
            children: filteredChildren,
          };
        }
      }
      
      if (matches) {
        return node;
      }
      
      return null;
    })
    .filter(Boolean) as TreeNode[];
}

/**
 * Filter out hidden files
 */
export function filterHiddenNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .filter((node) => !node.name.startsWith("."))
    .map((node) => {
      if (node.children) {
        return {
          ...node,
          children: filterHiddenNodes(node.children),
        };
      }
      return node;
    });
}
