export interface BuildRequest {
    mainFile: string;
    engine: 'pdflatex' | 'xelatex' | 'lualatex';
    shellEscape: boolean;
    projectId?: string;
}
export interface BuildStatus {
    id: string;
    projectId?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
    error?: string;
    createdAt: string;
    completedAt?: string;
}
export interface BuildArtifact {
    id: string;
    buildId: string;
    type: 'pdf' | 'log' | 'aux';
    size: number;
    url?: string;
    signedUrl?: string;
    expiresAt?: string;
}
export interface BuildHistory {
    id: string;
    projectId: string;
    engine: string;
    shellEscape: boolean;
    status: string;
    error?: string;
    artifacts: BuildArtifact[];
    createdAt: string;
    completedAt?: string;
    duration?: number;
}
export interface DeltaSyncRequest {
    projectId: string;
    fileChecksums: Record<string, string>;
}
export interface DeltaSyncResponse {
    cachedFiles: string[];
    newFiles: string[];
    modifiedFiles: string[];
}
//# sourceMappingURL=build.d.ts.map