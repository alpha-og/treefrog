package auth

import (
	"context"
	"crypto/rsa"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/sirupsen/logrus"
)

var log = logrus.WithField("component", "auth/supabase")

type contextKey string

const (
	UserIDKey    contextKey = "userID"
	UserTierKey  contextKey = "userTier"
	UserIsAdmin  contextKey = "userIsAdmin"
	UserEmailKey contextKey = "userEmail"
)

var (
	dbInstance *sql.DB
	jwksClient *JWKSClient
)

type UserInfo struct {
	ID    string
	Tier  string
	Admin bool
	Email string
}

type JWKSClient struct {
	jwksURL     string
	httpClient  *http.Client
	keys        map[string]*rsa.PublicKey
	keysMu      sync.RWMutex
	lastRefresh time.Time
	cacheTTL    time.Duration
	refreshing  bool
	refreshMu   sync.Mutex
}

type JWKS struct {
	Keys []JWK `json:"keys"`
}

type JWK struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
	Alg string `json:"alg"`
}

func NewJWKSClient(supabaseURL string) *JWKSClient {
	jwksURL := strings.TrimSuffix(supabaseURL, "/") + "/auth/v1/.well-known/jwks.json"
	return &JWKSClient{
		jwksURL: jwksURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		keys:     make(map[string]*rsa.PublicKey),
		cacheTTL: 10 * time.Minute,
	}
}

func (c *JWKSClient) GetKey(kid string) (*rsa.PublicKey, error) {
	c.keysMu.RLock()
	if key, ok := c.keys[kid]; ok && time.Since(c.lastRefresh) < c.cacheTTL {
		c.keysMu.RUnlock()
		return key, nil
	}
	c.keysMu.RUnlock()

	c.refreshMu.Lock()
	if c.refreshing {
		c.refreshMu.Unlock()
		c.keysMu.RLock()
		defer c.keysMu.RUnlock()
		if key, ok := c.keys[kid]; ok {
			return key, nil
		}
		return nil, fmt.Errorf("key with kid %s not found", kid)
	}
	c.refreshing = true
	c.refreshMu.Unlock()

	err := c.refreshKeys()

	c.refreshMu.Lock()
	c.refreshing = false
	c.refreshMu.Unlock()

	if err != nil {
		return nil, err
	}

	c.keysMu.RLock()
	defer c.keysMu.RUnlock()
	if key, ok := c.keys[kid]; ok {
		return key, nil
	}
	return nil, fmt.Errorf("key with kid %s not found", kid)
}

func (c *JWKSClient) refreshKeys() error {
	c.keysMu.Lock()
	defer c.keysMu.Unlock()

	if time.Since(c.lastRefresh) < c.cacheTTL {
		return nil
	}

	resp, err := c.httpClient.Get(c.jwksURL)
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned status %d", resp.StatusCode)
	}

	var jwks JWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("failed to decode JWKS: %w", err)
	}

	newKeys := make(map[string]*rsa.PublicKey)
	for _, jwk := range jwks.Keys {
		if jwk.Kty != "RSA" {
			continue
		}

		pubKey, err := jwk.ToRSAPublicKey()
		if err != nil {
			log.WithError(err).WithField("kid", jwk.Kid).Warn("Failed to parse JWK")
			continue
		}
		newKeys[jwk.Kid] = pubKey
	}

	c.keys = newKeys
	c.lastRefresh = time.Now()
	log.WithField("key_count", len(newKeys)).Debug("JWKS keys refreshed")
	return nil
}

func (jwk *JWK) ToRSAPublicKey() (*rsa.PublicKey, error) {
	n, err := decodeBase64URL(jwk.N)
	if err != nil {
		return nil, fmt.Errorf("failed to decode n: %w", err)
	}
	e, err := decodeBase64URL(jwk.E)
	if err != nil {
		return nil, fmt.Errorf("failed to decode e: %w", err)
	}

	eInt := 0
	for _, b := range e {
		eInt = eInt<<8 | int(b)
	}

	return &rsa.PublicKey{
		N: new(big.Int).SetBytes(n),
		E: eInt,
	}, nil
}

func decodeBase64URL(s string) ([]byte, error) {
	s = strings.ReplaceAll(s, "-", "+")
	s = strings.ReplaceAll(s, "_", "/")
	switch len(s) % 4 {
	case 2:
		s += "=="
	case 3:
		s += "="
	}
	return base64.StdEncoding.DecodeString(s)
}

func InitSupabase(supabaseURL string, db *sql.DB) error {
	if supabaseURL == "" {
		return fmt.Errorf("SUPABASE_URL is required")
	}
	jwksClient = NewJWKSClient(supabaseURL)
	dbInstance = db
	log.WithField("jwks_url", jwksClient.jwksURL).Info("Supabase auth initialized with JWKS")
	return nil
}

type SupabaseClaims struct {
	jwt.RegisteredClaims
	Email        string                 `json:"email"`
	Role         string                 `json:"role"`
	AppMetaData  map[string]interface{} `json:"app_metadata"`
	UserMetaData map[string]interface{} `json:"user_metadata"`
}

func (c *SupabaseClaims) Valid() error {
	now := time.Now()
	if c.ExpiresAt != nil && now.After(c.ExpiresAt.Time) {
		return fmt.Errorf("token is expired")
	}
	if c.NotBefore != nil && now.Before(c.NotBefore.Time) {
		return fmt.Errorf("token is not valid yet")
	}
	if c.IssuedAt != nil && now.Before(c.IssuedAt.Time) {
		return fmt.Errorf("token issued in the future")
	}
	return nil
}

func validateToken(tokenString string) (*SupabaseClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &SupabaseClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("missing kid in token header")
		}

		return jwksClient.GetKey(kid)
	})
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*SupabaseClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, fmt.Errorf("invalid token claims")
}

func getUserInfo(userID string) (*UserInfo, error) {
	info := &UserInfo{ID: userID, Tier: "free", Admin: false}
	if dbInstance == nil {
		return info, nil
	}

	err := dbInstance.QueryRow(`
		SELECT tier, is_admin, email FROM users WHERE id = $1`, userID).Scan(
		&info.Tier, &info.Admin, &info.Email)
	if err != nil {
		if err == sql.ErrNoRows {
			return info, nil
		}
		return info, err
	}
	return info, nil
}

func AuthMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Missing authorization header", http.StatusUnauthorized)
				return
			}

			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			if tokenString == authHeader {
				http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
				return
			}

			claims, err := validateToken(tokenString)
			if err != nil {
				log.WithError(err).Debug("Token validation failed")
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			userID := claims.RegisteredClaims.Subject
			if userID == "" {
				http.Error(w, "Invalid token: missing user ID", http.StatusUnauthorized)
				return
			}

			userInfo, err := getUserInfo(userID)
			if err != nil {
				log.WithError(err).Error("Failed to get user info")
			}

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, UserTierKey, userInfo.Tier)
			ctx = context.WithValue(ctx, UserIsAdmin, userInfo.Admin)
			ctx = context.WithValue(ctx, UserEmailKey, userInfo.Email)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func AdminMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			isAdmin, ok := r.Context().Value(UserIsAdmin).(bool)
			if !ok || !isAdmin {
				http.Error(w, "Admin access required", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func GetUserID(r *http.Request) (string, bool) {
	userID, ok := r.Context().Value(UserIDKey).(string)
	if !ok || userID == "" {
		return "", false
	}
	return userID, true
}

func GetUserTier(r *http.Request) string {
	tier, ok := r.Context().Value(UserTierKey).(string)
	if !ok {
		return "free"
	}
	return tier
}

func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, UserIDKey, userID)
}

func GetUserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	if !ok || userID == "" {
		return "", false
	}
	return userID, true
}

func IsAdmin(r *http.Request) bool {
	isAdmin, ok := r.Context().Value(UserIsAdmin).(bool)
	return ok && isAdmin
}

func GetUserEmail(r *http.Request) string {
	email, ok := r.Context().Value(UserEmailKey).(string)
	if !ok {
		return ""
	}
	return email
}
