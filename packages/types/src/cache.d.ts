export interface CacheEntry {
    projectId: string;
    fileHash: string;
    lastModified: number;
    size: number;
}
export interface ProjectCache {
    projectId: string;
    files: Record<string, CacheEntry>;
    lastSynced: number;
    buildCount: number;
}
export interface CacheStats {
    totalSize: number;
    totalProjects: number;
    cacheHitRate: number;
    payloadReduction: number;
}
//# sourceMappingURL=cache.d.ts.map