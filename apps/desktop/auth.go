package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	goruntime "runtime"
	"strconv"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// AuthUser represents an authenticated user
type AuthUser struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	ImageURL  string `json:"imageUrl"`
}

// AuthState holds the current authentication state
type AuthState struct {
	IsAuthenticated bool      `json:"isAuthenticated"`
	User            *AuthUser `json:"user,omitempty"`
}

// authConfig holds authentication configuration (internal)
type authConfig struct {
	SessionToken string `json:"sessionToken"`
	RefreshToken string `json:"refreshToken"`
	UserID       string `json:"userId"`
	UserEmail    string `json:"userEmail"`
	UserName     string `json:"userName"`
	TokenExpiry  int64  `json:"tokenExpiry"` // Unix timestamp
}

// initAuth initializes authentication state
func (a *App) initAuth() {
	a.authConfig = &authConfig{}
	a.loadAuthConfig()
}

// getAuthConfigPath returns the path to the auth config file
func (a *App) getAuthConfigPath() string {
	configDir, _ := os.UserConfigDir()
	return fmt.Sprintf("%s/treefrog/auth.json", configDir)
}

// loadAuthConfig loads auth config from disk
func (a *App) loadAuthConfig() {
	configPath := a.getAuthConfigPath()

	data, err := os.ReadFile(configPath)
	if err != nil {
		return
	}

	var config authConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return
	}

	a.authMu.Lock()
	a.authConfig = &config
	a.authMu.Unlock()

	Logger.WithFields(logrus.Fields{
		"hasToken": config.SessionToken != "",
		"userId":   config.UserID,
	}).Debug("Auth config loaded")
}

// saveAuthConfig saves auth config to disk
func (a *App) saveAuthConfig() error {
	configPath := a.getAuthConfigPath()
	dir := strings.TrimSuffix(configPath, "/auth.json")

	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	a.authMu.RLock()
	config := a.authConfig
	a.authMu.RUnlock()

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(configPath, data, 0600)
}

// GetAuthState returns the current authentication state
func (a *App) GetAuthState() AuthState {
	a.authMu.RLock()
	defer a.authMu.RUnlock()

	if a.authConfig == nil || a.authConfig.SessionToken == "" {
		return AuthState{IsAuthenticated: false}
	}

	return AuthState{
		IsAuthenticated: true,
		User: &AuthUser{
			ID:        a.authConfig.UserID,
			Email:     a.authConfig.UserEmail,
			FirstName: a.authConfig.UserName,
		},
	}
}

// getWebsiteURL returns the website URL based on environment
func (a *App) getWebsiteURL() string {
	websiteURL := os.Getenv("TREEFROG_WEBSITE_URL")
	if websiteURL == "" {
		if os.Getenv("TREEFROG_DEV") == "true" {
			websiteURL = "http://localhost:3000"
		} else {
			websiteURL = "https://treefrog.vercel.app"
		}
	}
	return websiteURL
}

// GetAuthSignInURL returns the sign-in URL with custom protocol callback
func (a *App) GetAuthSignInURL() string {
	websiteURL := a.getWebsiteURL()
	callbackURL := "treefrog://auth/callback"

	return fmt.Sprintf(
		"%s/sign-in?redirect_url=%s",
		websiteURL,
		url.QueryEscape(callbackURL),
	)
}

// GetAuthSignUpURL returns the sign-up URL with custom protocol callback
func (a *App) GetAuthSignUpURL() string {
	websiteURL := a.getWebsiteURL()
	callbackURL := "treefrog://auth/callback"

	return fmt.Sprintf(
		"%s/sign-up?redirect_url=%s",
		websiteURL,
		url.QueryEscape(callbackURL),
	)
}

// OpenAuthURL opens the browser for authentication
func (a *App) OpenAuthURL() error {
	signInURL := a.GetAuthSignInURL()
	Logger.WithField("url", signInURL).Info("Opening auth URL in browser")

	var cmd *exec.Cmd
	switch goruntime.GOOS {
	case "darwin":
		cmd = exec.Command("open", signInURL)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", signInURL)
	case "linux":
		cmd = exec.Command("xdg-open", signInURL)
	default:
		return fmt.Errorf("unsupported platform: %s", goruntime.GOOS)
	}

	if err := cmd.Start(); err != nil {
		Logger.WithError(err).Error("Failed to open browser")
		return err
	}

	Logger.Info("Browser opened for authentication")
	return nil
}

// HandleAuthCallback handles the custom protocol callback (treefrog://auth/callback?...)
func (a *App) HandleAuthCallback(callbackURL string) error {
	Logger.WithField("url", callbackURL).Info("Handling auth callback")

	parsedURL, err := url.Parse(callbackURL)
	if err != nil {
		Logger.WithError(err).Error("Failed to parse callback URL")
		return err
	}

	// Extract tokens from query parameters
	accessToken := parsedURL.Query().Get("access_token")
	refreshToken := parsedURL.Query().Get("refresh_token")
	expiresInStr := parsedURL.Query().Get("expires_in")

	if accessToken == "" {
		accessToken = parsedURL.Query().Get("session_token")
	}
	if accessToken == "" {
		accessToken = parsedURL.Query().Get("token")
	}

	if accessToken == "" {
		err := fmt.Errorf("no session token in callback URL")
		Logger.Error(err)
		wailsRuntime.EventsEmit(a.ctx, "auth:callback", map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return err
	}

	// Calculate expiry time (default 1 hour if not provided)
	var expiresAt int64
	if expiresInStr != "" {
		if expiresIn, err := strconv.ParseInt(expiresInStr, 10, 64); err == nil {
			expiresAt = time.Now().Add(time.Duration(expiresIn) * time.Second).Unix()
		}
	}
	if expiresAt == 0 {
		expiresAt = time.Now().Add(1 * time.Hour).Unix()
	}

	// Store the tokens
	a.authMu.Lock()
	if a.authConfig == nil {
		a.authConfig = &authConfig{}
	}
	a.authConfig.SessionToken = accessToken
	a.authConfig.RefreshToken = refreshToken
	a.authConfig.TokenExpiry = expiresAt
	a.authMu.Unlock()

	// Fetch user info from backend
	userInfo, err := a.fetchUserInfo(accessToken)
	if err != nil {
		Logger.WithError(err).Warn("Failed to fetch user info, but token stored")
	} else if userInfo != nil {
		a.authMu.Lock()
		a.authConfig.UserID = userInfo.ID
		a.authConfig.UserEmail = userInfo.Email
		a.authConfig.UserName = userInfo.FirstName
		a.authMu.Unlock()
	}

	if err := a.saveAuthConfig(); err != nil {
		Logger.WithError(err).Error("Failed to save auth config")
		wailsRuntime.EventsEmit(a.ctx, "auth:callback", map[string]interface{}{
			"success": false,
			"error":   "failed to save token",
		})
		return err
	}

	Logger.Info("Authentication successful")

	wailsRuntime.EventsEmit(a.ctx, "auth:callback", map[string]interface{}{
		"success": true,
		"token":   accessToken,
		"user": map[string]string{
			"id":    a.authConfig.UserID,
			"email": a.authConfig.UserEmail,
			"name":  a.authConfig.UserName,
		},
	})

	return nil
}

// fetchUserInfo fetches user info from the backend
func (a *App) fetchUserInfo(sessionToken string) (*AuthUser, error) {
	// Use remote compiler URL for user info - local compiler doesn't have /api/user/me
	compilerURL := a.getRemoteCompilerURL()
	if compilerURL == "" {
		compilerURL = a.getCompilerURL()
	}

	// Skip if still pointing to localhost (no remote configured)
	if strings.HasPrefix(compilerURL, "http://127.0.0.1") || strings.HasPrefix(compilerURL, "http://localhost") {
		Logger.Warn("No remote compiler configured, skipping user info fetch")
		return nil, nil
	}

	req, err := http.NewRequest("GET", compilerURL+"/api/user/me", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+sessionToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("backend returned status %d", resp.StatusCode)
	}

	var result struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
		Tier  string `json:"tier"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &AuthUser{
		ID:        result.ID,
		Email:     result.Email,
		FirstName: result.Name,
	}, nil
}

// SignOut clears the authentication state
func (a *App) SignOut() error {
	Logger.Info("Signing out")

	a.authMu.Lock()
	if a.authConfig != nil {
		a.authConfig.SessionToken = ""
		a.authConfig.UserID = ""
		a.authConfig.UserEmail = ""
		a.authConfig.UserName = ""
	}
	a.authMu.Unlock()

	if err := a.saveAuthConfig(); err != nil {
		Logger.WithError(err).Error("Failed to save cleared auth config")
		return err
	}

	wailsRuntime.EventsEmit(a.ctx, "auth:signout", map[string]interface{}{
		"success": true,
	})

	Logger.Info("Sign out complete")
	return nil
}

// GetSessionToken returns the current session token, refreshing if necessary
func (a *App) GetSessionToken() string {
	a.authMu.Lock()
	defer a.authMu.Unlock()

	if a.authConfig == nil {
		return ""
	}

	// Check if token needs refresh (5 minutes before expiry)
	if time.Now().Unix() > a.authConfig.TokenExpiry-300 {
		if a.authConfig.RefreshToken != "" {
			newToken, newRefreshToken, newExpiry, err := a.refreshToken(a.authConfig.RefreshToken)
			if err != nil {
				Logger.WithError(err).Warn("Failed to refresh token, user needs to re-authenticate")
				// Clear auth config since refresh failed
				a.authConfig.SessionToken = ""
				a.authConfig.RefreshToken = ""
				a.authConfig.TokenExpiry = 0
				a.saveAuthConfig()
				// Emit event to frontend to prompt re-auth
				if a.ctx != nil {
					wailsRuntime.EventsEmit(a.ctx, "auth:session_expired", map[string]interface{}{
						"error": "Session expired. Please sign in again.",
					})
				}
				return ""
			}
			a.authConfig.SessionToken = newToken
			a.authConfig.RefreshToken = newRefreshToken
			a.authConfig.TokenExpiry = newExpiry
			a.saveAuthConfig()
			Logger.Info("Token refreshed successfully")
			return newToken
		}
		// No refresh token, session expired
		if a.ctx != nil {
			wailsRuntime.EventsEmit(a.ctx, "auth:session_expired", map[string]interface{}{
				"error": "Session expired. Please sign in again.",
			})
		}
		return ""
	}

	return a.authConfig.SessionToken
}

// refreshToken exchanges a refresh token for a new access token
func (a *App) refreshToken(refreshToken string) (accessToken, newRefreshToken string, expiresAt int64, err error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		supabaseURL = "https://pmlqyqkitngxqmqfevke.supabase.co"
	}

	// Use publishable key (public-safe, can be embedded)
	supabasePublishableKey := os.Getenv("SUPABASE_PUBLISHABLE_KEY")
	if supabasePublishableKey == "" {
		supabasePublishableKey = "sb_publishable_vyUbGPkiA8_hDT74wuf4sg_KvTdxPUq"
	}

	reqBody := fmt.Sprintf(`{"refresh_token":"%s"}`, refreshToken)
	req, err := http.NewRequest("POST", supabaseURL+"/auth/v1/token?grant_type=refresh_token", strings.NewReader(reqBody))
	if err != nil {
		return "", "", 0, fmt.Errorf("failed to create refresh request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", supabasePublishableKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", 0, fmt.Errorf("refresh request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", "", 0, fmt.Errorf("refresh failed with status %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", 0, fmt.Errorf("failed to parse refresh response: %w", err)
	}

	expiresAt = time.Now().Add(time.Duration(result.ExpiresIn) * time.Second).Unix()
	return result.AccessToken, result.RefreshToken, expiresAt, nil
}

// IsAuthenticated returns whether the user is authenticated
func (a *App) IsAuthenticated() bool {
	a.authMu.RLock()
	defer a.authMu.RUnlock()

	if a.authConfig == nil {
		return false
	}
	return a.authConfig.SessionToken != ""
}

// GetAuthUser returns the current authenticated user
func (a *App) GetAuthUser() *AuthUser {
	a.authMu.RLock()
	defer a.authMu.RUnlock()

	if a.authConfig == nil || a.authConfig.SessionToken == "" {
		return nil
	}

	return &AuthUser{
		ID:        a.authConfig.UserID,
		Email:     a.authConfig.UserEmail,
		FirstName: a.authConfig.UserName,
	}
}
