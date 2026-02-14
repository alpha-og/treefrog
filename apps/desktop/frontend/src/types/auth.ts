export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: AuthUser;
}