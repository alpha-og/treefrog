package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	goruntime "runtime"
	"strings"
	"sync"
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
	UserID       string `json:"userId"`
	UserEmail    string `json:"userEmail"`
	UserName     string `json:"userName"`
}

// callbackServer handles OAuth callbacks on localhost
type callbackServer struct {
	server   *http.Server
	port     int
	tokenCh  chan string
	errorCh  chan error
	stopOnce sync.Once
}

var globalCallbackServer *callbackServer

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

// GetAuthSignInURL returns the sign-in URL for browser auth
// Redirects to the hosted website for a consistent auth experience
func (a *App) GetAuthSignInURL() string {
	// Start callback server if not running
	if globalCallbackServer == nil {
		globalCallbackServer = startCallbackServer()
	}

	// Determine the website URL based on environment
	websiteURL := os.Getenv("TREEFROG_WEBSITE_URL")
	if websiteURL == "" {
		// Check if we're in development mode
		if os.Getenv("TREEFROG_DEV") == "true" {
			websiteURL = "http://localhost:3000"
		} else {
			websiteURL = "https://treefrog.vercel.app"
		}
	}

	// Use localhost callback URL
	redirectURL := fmt.Sprintf("http://localhost:%d/callback", globalCallbackServer.port)

	return fmt.Sprintf(
		"%s/sign-in?redirect_url=%s",
		websiteURL,
		url.QueryEscape(redirectURL),
	)
}

// GetAuthSignUpURL returns the sign-up URL for browser auth
func (a *App) GetAuthSignUpURL() string {
	if globalCallbackServer == nil {
		globalCallbackServer = startCallbackServer()
	}

	websiteURL := os.Getenv("TREEFROG_WEBSITE_URL")
	if websiteURL == "" {
		if os.Getenv("TREEFROG_DEV") == "true" {
			websiteURL = "http://localhost:3000"
		} else {
			websiteURL = "https://treefrog.vercel.app"
		}
	}

	redirectURL := fmt.Sprintf("http://localhost:%d/callback", globalCallbackServer.port)

	return fmt.Sprintf(
		"%s/sign-up?redirect_url=%s",
		websiteURL,
		url.QueryEscape(redirectURL),
	)
}

// startCallbackServer starts a localhost HTTP server to receive OAuth callbacks
func startCallbackServer() *callbackServer {
	tokenCh := make(chan string, 1)
	errorCh := make(chan error, 1)

	// Use fixed port for easier Clerk configuration
	port := 54321
	var server *http.Server

	addr := fmt.Sprintf("127.0.0.1:%d", port)

	mux := http.NewServeMux()
	srv := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	// Handler for OAuth callback
	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		Logger.WithField("url", r.URL.String()).Info("Received OAuth callback")

		// Extract token from query params - various auth providers use different param names
		token := r.URL.Query().Get("access_token")
		if token == "" {
			token = r.URL.Query().Get("session_token")
		}
		if token == "" {
			token = r.URL.Query().Get("token")
		}

		Logger.WithField("hasToken", token != "").Info("Processing callback")

		if token != "" {
			w.Header().Set("Content-Type", "text/html")
			io.WriteString(w, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Treefrog - Authenticated</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #e2e8f0;
    }
    .container {
      text-align: center;
      padding: 3rem;
      max-width: 400px;
    }
    .logo {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(34, 197, 94, 0.3);
    }
    .logo svg {
      width: 32px;
      height: 32px;
      fill: white;
    }
    .checkmark {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(34, 197, 94, 0.3);
      animation: pulse 2s ease-in-out infinite;
    }
    .checkmark svg {
      width: 40px;
      height: 40px;
      stroke: white;
      stroke-width: 3;
      fill: none;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #f8fafc;
    }
    p {
      color: #94a3b8;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .footer {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
    }
    .footer p {
      font-size: 0.75rem;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">
      <svg viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <h1>Authentication Successful</h1>
    <p>You're now signed in to Treefrog.<br>You can close this window.</p>
    <div class="footer">
      <p>Treefrog LaTeX Editor</p>
    </div>
  </div>
  <script>setTimeout(() => window.close(), 2000);</script>
</body>
</html>`)
			select {
			case tokenCh <- token:
				Logger.Info("Token sent to channel")
			default:
				Logger.Warn("Token channel full or closed")
			}
		} else {
			w.Header().Set("Content-Type", "text/html")
			io.WriteString(w, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Treefrog - Authentication Failed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #e2e8f0;
    }
    .container {
      text-align: center;
      padding: 3rem;
      max-width: 400px;
    }
    .error-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(239, 68, 68, 0.3);
    }
    .error-icon svg {
      width: 40px;
      height: 40px;
      stroke: white;
      stroke-width: 3;
      fill: none;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #f8fafc;
    }
    p {
      color: #94a3b8;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .retry {
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .retry:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
    }
    .footer {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
    }
    .footer p {
      font-size: 0.75rem;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">
      <svg viewBox="0 0 24 24">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
    <h1>Authentication Failed</h1>
    <p>No authentication token received.<br>Please try again.</p>
    <button class="retry" onclick="window.close()">Close</button>
    <div class="footer">
      <p>Treefrog LaTeX Editor</p>
    </div>
  </div>
</body>
</html>`)
			select {
			case errorCh <- fmt.Errorf("no token in callback"):
			default:
			}
		}
	})

	// Try to start server
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		Logger.WithError(err).Error("Failed to start callback server")
		return nil
	}

	server = srv
	go func() {
		if err := server.Serve(ln); err != http.ErrServerClosed {
			Logger.WithError(err).Error("Callback server error")
		}
	}()
	Logger.WithField("port", port).Info("OAuth callback server started")

	return &callbackServer{
		server:  server,
		port:    port,
		tokenCh: tokenCh,
		errorCh: errorCh,
	}
}

// stopCallbackServer stops the localhost callback server
func (s *callbackServer) stop() {
	if s == nil || s.server == nil {
		return
	}
	s.stopOnce.Do(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		s.server.Shutdown(ctx)
		Logger.Info("OAuth callback server stopped")
	})
}

// waitForToken waits for the OAuth callback and returns the token
func (s *callbackServer) waitForToken(timeout time.Duration) (string, error) {
	if s == nil {
		return "", fmt.Errorf("callback server not running")
	}

	select {
	case token := <-s.tokenCh:
		return token, nil
	case err := <-s.errorCh:
		return "", err
	case <-time.After(timeout):
		return "", fmt.Errorf("timeout waiting for OAuth callback")
	}
}

// OpenAuthURL opens the browser for authentication and waits for callback
func (a *App) OpenAuthURL() error {
	// Ensure callback server is running
	if globalCallbackServer == nil {
		globalCallbackServer = startCallbackServer()
	}
	if globalCallbackServer == nil {
		return fmt.Errorf("failed to start callback server")
	}

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

	// Wait for callback in background
	go func() {
		token, err := globalCallbackServer.waitForToken(5 * time.Minute)
		if err != nil {
			Logger.WithError(err).Error("Failed to get auth token")
			wailsRuntime.EventsEmit(a.ctx, "auth:callback", map[string]interface{}{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		// Store the token
		a.authMu.Lock()
		if a.authConfig == nil {
			a.authConfig = &authConfig{}
		}
		a.authConfig.SessionToken = token
		a.authMu.Unlock()

		// Fetch user info from backend
		userInfo, err := a.fetchUserInfo(token)
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
			return
		}

		Logger.Info("Authentication successful")
		wailsRuntime.EventsEmit(a.ctx, "auth:callback", map[string]interface{}{
			"success": true,
			"token":   token,
			"user": map[string]string{
				"id":    a.authConfig.UserID,
				"email": a.authConfig.UserEmail,
				"name":  a.authConfig.UserName,
			},
		})
	}()

	return nil
}

func (a *App) fetchUserInfo(sessionToken string) (*AuthUser, error) {
	compilerURL := a.getCompilerURL()

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

// HandleAuthCallback handles the custom protocol callback from browser
func (a *App) HandleAuthCallback(callbackURL string) error {
	Logger.WithField("url", callbackURL).Info("Handling auth callback")

	parsedURL, err := url.Parse(callbackURL)
	if err != nil {
		Logger.WithError(err).Error("Failed to parse callback URL")
		return err
	}

	// Extract session token from query parameters
	token := parsedURL.Query().Get("access_token")
	if token == "" {
		token = parsedURL.Query().Get("session_token")
	}
	if token == "" {
		token = parsedURL.Query().Get("token")
	}

	if token == "" {
		err := fmt.Errorf("no session token in callback URL")
		Logger.Error(err)
		return err
	}

	a.authMu.Lock()
	if a.authConfig == nil {
		a.authConfig = &authConfig{}
	}
	a.authConfig.SessionToken = token
	a.authMu.Unlock()

	if err := a.saveAuthConfig(); err != nil {
		Logger.WithError(err).Error("Failed to save auth config")
		return err
	}

	Logger.Info("Authentication successful, token stored")

	wailsRuntime.EventsEmit(a.ctx, "auth:callback", map[string]interface{}{
		"success": true,
		"token":   token,
	})

	return nil
}

// HandleAuthCallbackWithUser handles callback with user info
func (a *App) HandleAuthCallbackWithUser(token, userID, email, name string) error {
	Logger.WithFields(logrus.Fields{
		"userId": userID,
		"email":  email,
		"name":   name,
	}).Info("Handling auth callback with user info")

	a.authMu.Lock()
	if a.authConfig == nil {
		a.authConfig = &authConfig{}
	}
	a.authConfig.SessionToken = token
	a.authConfig.UserID = userID
	a.authConfig.UserEmail = email
	a.authConfig.UserName = name
	a.authMu.Unlock()

	if err := a.saveAuthConfig(); err != nil {
		Logger.WithError(err).Error("Failed to save auth config")
		return err
	}

	wailsRuntime.EventsEmit(a.ctx, "auth:callback", map[string]interface{}{
		"success": true,
		"user": map[string]string{
			"id":    userID,
			"email": email,
			"name":  name,
		},
	})

	return nil
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

// GetSessionToken returns the current session token
func (a *App) GetSessionToken() string {
	a.authMu.RLock()
	defer a.authMu.RUnlock()

	if a.authConfig == nil {
		return ""
	}
	return a.authConfig.SessionToken
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

// SetAuthUser sets the authenticated user info
func (a *App) SetAuthUser(userID, email, name string) error {
	a.authMu.Lock()
	if a.authConfig == nil {
		a.authConfig = &authConfig{}
	}
	a.authConfig.UserID = userID
	a.authConfig.UserEmail = email
	a.authConfig.UserName = name
	a.authMu.Unlock()

	return a.saveAuthConfig()
}
