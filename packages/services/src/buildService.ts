import type {
  BuildRequest,
  BuildStatus,
  BuildHistory,
  DeltaSyncRequest,
} from '@treefrog/types';
import { apiClient } from './apiClient';
import { supabase } from '@treefrog/supabase';

export class BuildService {
  async triggerBuild(request: BuildRequest) {
    const response = await apiClient.post<BuildStatus>('/builds', request);
    return response.data.data;
  }

  async getBuildStatus(buildId: string) {
    const response = await apiClient.get<BuildStatus>(`/builds/${buildId}`);
    return response.data.data;
  }

  async getBuildHistory(userId: string, page = 1, limit = 10): Promise<BuildHistory[]> {
    const offset = (page - 1) * limit;
    
    const { data, error } = await supabase
      .from('builds')
      .select('id, status, engine, main_file, created_at, expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) return [];
    
    return (data || []).map((build: { id: string; status: string; engine: string; main_file: string | null; created_at: string; expires_at: string | null }) => ({
      id: build.id,
      projectId: '',
      status: build.status,
      engine: build.engine,
      shellEscape: false,
      artifacts: [],
      createdAt: build.created_at,
      completedAt: build.expires_at ?? undefined,
    }));
  }

  async initDeltaSync(request: DeltaSyncRequest & { projectName: string; mainFile: string; engine: string; shellEscape: boolean }) {
    const response = await apiClient.post<{ buildId: string; existingFiles: Record<string, { checksum: string; size: number }> }>(
      `/builds/init`,
      request
    );
    return response.data.data;
  }

  async uploadFiles(buildId: string, formData: FormData) {
    const response = await apiClient.post(
      `/builds/${buildId}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  }

  async downloadArtifact(buildId: string, artifactType: string) {
    const response = await apiClient.get(
      `/builds/${buildId}/artifacts/${artifactType}/download`
    );
    return response.data.data;
  }

  async getSignedUrl(buildId: string, artifactType: string) {
    const response = await apiClient.get<{ url: string; expiresAt: string }>(
      `/builds/${buildId}/artifacts/${artifactType}/signed-url`
    );
    return response.data.data;
  }
}

export const buildService = new BuildService();
export default buildService;
