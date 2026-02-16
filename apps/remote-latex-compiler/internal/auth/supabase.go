package auth

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
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
	dbInstance  *sql.DB
	jwksClient  *JWKSClient
	supabaseURL string
)

type UserInfo struct {
	ID    string
	Tier  string
	Admin bool
	Email string
}

type JWKSClient struct {
	jwksURL     string
	supabaseURL string
	httpClient  *http.Client
	rsaKeys     map[string]*rsa.PublicKey
	ecKeys      map[string]*ecdsa.PublicKey
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
	N   string `json:"n,omitempty"`
	E   string `json:"e,omitempty"`
	Crv string `json:"crv,omitempty"`
	X   string `json:"x,omitempty"`
	Y   string `json:"y,omitempty"`
	Alg string `json:"alg"`
}

func NewJWKSClient(supabaseURL string) *JWKSClient {
	jwksURL := strings.TrimSuffix(supabaseURL, "/") + "/auth/v1/.well-known/jwks.json"
	return &JWKSClient{
		jwksURL:     jwksURL,
		supabaseURL: strings.TrimSuffix(supabaseURL, "/"),
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		rsaKeys:  make(map[string]*rsa.PublicKey),
		ecKeys:   make(map[string]*ecdsa.PublicKey),
		cacheTTL: 10 * time.Minute,
	}
}

type SigningKey struct {
	RSA *rsa.PublicKey
	EC  *ecdsa.PublicKey
}

func (c *JWKSClient) GetKey(kid string) (*SigningKey, error) {
	c.keysMu.RLock()
	if rsaKey, ok := c.rsaKeys[kid]; ok && time.Since(c.lastRefresh) < c.cacheTTL {
		c.keysMu.RUnlock()
		return &SigningKey{RSA: rsaKey}, nil
	}
	if ecKey, ok := c.ecKeys[kid]; ok && time.Since(c.lastRefresh) < c.cacheTTL {
		c.keysMu.RUnlock()
		return &SigningKey{EC: ecKey}, nil
	}
	c.keysMu.RUnlock()

	c.refreshMu.Lock()
	if c.refreshing {
		c.refreshMu.Unlock()
		c.keysMu.RLock()
		defer c.keysMu.RUnlock()
		if rsaKey, ok := c.rsaKeys[kid]; ok {
			return &SigningKey{RSA: rsaKey}, nil
		}
		if ecKey, ok := c.ecKeys[kid]; ok {
			return &SigningKey{EC: ecKey}, nil
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
	if rsaKey, ok := c.rsaKeys[kid]; ok {
		return &SigningKey{RSA: rsaKey}, nil
	}
	if ecKey, ok := c.ecKeys[kid]; ok {
		return &SigningKey{EC: ecKey}, nil
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

	newRSAKeys := make(map[string]*rsa.PublicKey)
	newECKeys := make(map[string]*ecdsa.PublicKey)
	for _, jwk := range jwks.Keys {
		switch jwk.Kty {
		case "RSA":
			pubKey, err := jwk.ToRSAPublicKey()
			if err != nil {
				log.WithError(err).WithField("kid", jwk.Kid).Warn("Failed to parse RSA JWK")
				continue
			}
			newRSAKeys[jwk.Kid] = pubKey
		case "EC":
			pubKey, err := jwk.ToECPublicKey()
			if err != nil {
				log.WithError(err).WithField("kid", jwk.Kid).Warn("Failed to parse EC JWK")
				continue
			}
			newECKeys[jwk.Kid] = pubKey
		}
	}

	c.rsaKeys = newRSAKeys
	c.ecKeys = newECKeys
	c.lastRefresh = time.Now()
	log.WithFields(logrus.Fields{
		"rsa_keys": len(newRSAKeys),
		"ec_keys":  len(newECKeys),
	}).Debug("JWKS keys refreshed")
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

func (jwk *JWK) ToECPublicKey() (*ecdsa.PublicKey, error) {
	x, err := decodeBase64URL(jwk.X)
	if err != nil {
		return nil, fmt.Errorf("failed to decode x: %w", err)
	}
	y, err := decodeBase64URL(jwk.Y)
	if err != nil {
		return nil, fmt.Errorf("failed to decode y: %w", err)
	}

	var curve elliptic.Curve
	switch jwk.Crv {
	case "P-256":
		curve = elliptic.P256()
	case "P-384":
		curve = elliptic.P384()
	case "P-521":
		curve = elliptic.P521()
	default:
		return nil, fmt.Errorf("unsupported curve: %s", jwk.Crv)
	}

	return &ecdsa.PublicKey{
		Curve: curve,
		X:     new(big.Int).SetBytes(x),
		Y:     new(big.Int).SetBytes(y),
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

func InitSupabase(supabaseURLParam string, db *sql.DB) error {
	if supabaseURLParam == "" {
		return fmt.Errorf("SUPABASE_URL is required")
	}
	supabaseURL = strings.TrimSuffix(supabaseURLParam, "/")
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
	if c.Issuer != "" && jwksClient != nil {
		expectedIssuer := jwksClient.supabaseURL + "/auth/v1"
		if c.Issuer != expectedIssuer {
			return fmt.Errorf("invalid token issuer: expected %s, got %s", expectedIssuer, c.Issuer)
		}
	}
	return nil
}

func validateToken(tokenString string) (*SupabaseClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &SupabaseClaims{}, func(token *jwt.Token) (interface{}, error) {
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("missing kid in token header")
		}

		signingKey, err := jwksClient.GetKey(kid)
		if err != nil {
			return nil, err
		}

		// Return the appropriate key based on signing method
		switch token.Method.(type) {
		case *jwt.SigningMethodRSA:
			if signingKey.RSA != nil {
				return signingKey.RSA, nil
			}
			return nil, fmt.Errorf("RSA key not found for kid %s", kid)
		case *jwt.SigningMethodECDSA:
			if signingKey.EC != nil {
				return signingKey.EC, nil
			}
			return nil, fmt.Errorf("EC key not found for kid %s", kid)
		default:
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
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
		log.WithError(err).Error("Database error in getUserInfo, returning default free tier")
		return nil, fmt.Errorf("database error: %w", err)
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
