export interface User {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
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
export interface UserProfile extends User {
    preferences?: {
        theme?: 'light' | 'dark' | 'system';
        notifications?: boolean;
        defaultEngine?: string;
    };
}
//# sourceMappingURL=user.d.ts.map