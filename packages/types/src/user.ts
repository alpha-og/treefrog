// User-related types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  tier: string;
  storageUsedBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthSession {
  user: User;
  token: AuthToken;
  isAuthenticated: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  tier: string;
  storageUsedBytes: number;
  createdAt: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    notifications?: boolean;
    defaultEngine?: string;
  };
}
