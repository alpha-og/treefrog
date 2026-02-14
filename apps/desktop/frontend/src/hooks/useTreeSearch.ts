import { useState, useCallback, useMemo } from "react";
import { TreeNode, filterTree } from "../utils/treeUtils";
import { createLogger } from "../utils/logger";

const log = createLogger("TreeSearch");

interface UseTreeSearchOptions {
  treeNodes: TreeNode[];
}

interface UseTreeSearchReturn {
  query: string;
  results: TreeNode[];
  resultCount: number;
  setQuery: (query: string) => void;
  clearQuery: () => void;
  isSearching: boolean;
  highlightedPaths: Set<string>;
}

export function useTreeSearch(options: UseTreeSearchOptions): UseTreeSearchReturn {
  const { treeNodes } = options;
  const [query, setQueryState] = useState("");

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    if (newQuery) {
      log.debug("Search query updated", { query: newQuery });
    }
  }, []);

  const clearQuery = useCallback(() => {
    setQueryState("");
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) {
      return treeNodes;
    }
    return filterTree(treeNodes, query);
  }, [treeNodes, query]);

  const resultCount = useMemo(() => {
    let count = 0;
    function countNodes(nodes: TreeNode[]) {
      nodes.forEach((node) => {
        count++;
        if (node.children) {
          countNodes(node.children);
        }
      });
    }
    countNodes(results);
    return count;
  }, [results]);

  const highlightedPaths = useMemo(() => {
    const paths = new Set<string>();
    
    if (!query.trim()) {
      return paths;
    }
    
    const lowerQuery = query.toLowerCase();
    
    function collectMatchingPaths(nodes: TreeNode[]) {
      nodes.forEach((node) => {
        if (node.name.toLowerCase().includes(lowerQuery)) {
          paths.add(node.path);
        }
        if (node.children) {
          collectMatchingPaths(node.children);
        }
      });
    }
    
    collectMatchingPaths(results);
    return paths;
  }, [results, query]);

  return {
    query,
    results,
    resultCount,
    setQuery,
    clearQuery,
    isSearching: query.trim().length > 0,
    highlightedPaths,
  };
}
