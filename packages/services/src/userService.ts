import type { User, AuthSession, UserProfile } from '@treefrog/types';
import { apiClient } from './apiClient';

export class UserService {
  async getCurrentUser() {
    const response = await apiClient.get<User>('/users/me');
    return response.data.data;
  }

  async getProfile() {
    const response = await apiClient.get<UserProfile>('/users/profile');
    return response.data.data;
  }

  async updateProfile(profile: Partial<UserProfile>) {
    const response = await apiClient.put<UserProfile>(
      '/users/profile',
      profile
    );
    return response.data.data;
  }

  async logout() {
    await apiClient.post('/auth/logout', {});
    localStorage.removeItem('treefrog-auth');
  }

  async refreshToken() {
    const response = await apiClient.post<AuthSession>('/auth/refresh', {});
    return response.data.data;
  }
}

export const userService = new UserService();
export default userService;
