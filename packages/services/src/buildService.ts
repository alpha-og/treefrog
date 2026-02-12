import type {
  BuildRequest,
  BuildStatus,
  BuildHistory,
  DeltaSyncRequest,
  DeltaSyncResponse,
} from '@treefrog/types';
import { apiClient } from './apiClient';

export class BuildService {
  async triggerBuild(request: BuildRequest) {
    const response = await apiClient.post<BuildStatus>('/builds', request);
    return response.data.data;
  }

  async getBuildStatus(buildId: string) {
    const response = await apiClient.get<BuildStatus>(`/builds/${buildId}`);
    return response.data.data;
  }

  async getBuildHistory(projectId: string, page = 1, limit = 10) {
    const response = await apiClient.get<BuildHistory[]>(
      `/projects/${projectId}/builds`,
      {
        params: { page, limit },
      }
    );
    return response.data.data;
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
