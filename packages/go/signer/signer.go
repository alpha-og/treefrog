package signer

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"
)

type SignedURLSigner struct {
	SecretKey []byte
	URLExpiry time.Duration
}

type SignedURLData struct {
	BuildID  string `json:"build_id"`
	Resource string `json:"resource"`
	Expires  int64  `json:"expires"`
	UserID   string `json:"user_id"`
}

func NewSignedURLSigner() (*SignedURLSigner, error) {
	secretKey := os.Getenv("COMPILER_SIGNING_KEY")
	if secretKey == "" {
		var err error
		secretKey, err = generateSecureRandomKey(32)
		if err != nil {
			return nil, fmt.Errorf("failed to generate signing key: %w", err)
		}
	}

	if len(secretKey) < 32 {
		return nil, fmt.Errorf("COMPILER_SIGNING_KEY must be at least 32 bytes")
	}

	expiryStr := os.Getenv("COMPILER_URL_EXPIRY")
	if expiryStr == "" {
		expiryStr = "5m"
	}

	expiry, err := time.ParseDuration(expiryStr)
	if err != nil {
		return nil, fmt.Errorf("invalid COMPILER_URL_EXPIRY: %w", err)
	}

	return &SignedURLSigner{
		SecretKey: []byte(secretKey),
		URLExpiry: expiry,
	}, nil
}

func generateSecureRandomKey(length int) (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate random key: %w", err)
	}

	result := make([]byte, length)
	for i := 0; i < length; i++ {
		result[i] = charset[b[i]%byte(len(charset))]
	}
	return string(result), nil
}

func (s *SignedURLSigner) generateTokenData(buildID, resource, userID string) (string, string, error) {
	if buildID == "" || resource == "" || userID == "" {
		return "", "", fmt.Errorf("buildID, resource, and userID required")
	}

	expires := time.Now().Add(s.URLExpiry).Unix()

	data := SignedURLData{
		BuildID:  buildID,
		Resource: resource,
		Expires:  expires,
		UserID:   userID,
	}

	dataJSON, err := json.Marshal(data)
	if err != nil {
		return "", "", fmt.Errorf("failed to encode data: %w", err)
	}

	dataB64 := base64.URLEncoding.EncodeToString(dataJSON)
	payload := fmt.Sprintf("%s.%d", dataB64, expires)
	h := hmac.New(sha256.New, s.SecretKey)
	h.Write([]byte(payload))
	sig := base64.URLEncoding.EncodeToString(h.Sum(nil))

	token := fmt.Sprintf("%s.%s", dataB64, sig)
	return token, dataB64, nil
}

func (s *SignedURLSigner) GenerateURL(buildID, resource, userID string) (string, error) {
	token, _, err := s.generateTokenData(buildID, resource, userID)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("/api/build/%s/%s?token=%s", url.QueryEscape(buildID), url.QueryEscape(resource),
		url.QueryEscape(token)), nil
}

func (s *SignedURLSigner) VerifyURL(token, buildID, resource, userID string) (bool, error) {
	if token == "" || buildID == "" || resource == "" || userID == "" {
		return false, fmt.Errorf("all parameters required")
	}

	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return false, fmt.Errorf("invalid token format")
	}

	dataJSON, err := base64.URLEncoding.DecodeString(parts[0])
	if err != nil {
		return false, fmt.Errorf("invalid token data: %w", err)
	}

	var data SignedURLData
	if err := json.Unmarshal(dataJSON, &data); err != nil {
		return false, fmt.Errorf("invalid token payload: %w", err)
	}

	if data.BuildID != buildID || data.Resource != resource {
		return false, fmt.Errorf("token mismatch")
	}

	if data.UserID != userID {
		return false, fmt.Errorf("unauthorized user")
	}

	if time.Now().Unix() > data.Expires {
		return false, fmt.Errorf("token expired")
	}

	expectedPayload := fmt.Sprintf("%s.%d", parts[0], data.Expires)
	h := hmac.New(sha256.New, s.SecretKey)
	h.Write([]byte(expectedPayload))
	expectedSig := base64.URLEncoding.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(parts[1]), []byte(expectedSig)) {
		return false, fmt.Errorf("invalid signature")
	}

	return true, nil
}

func (s *SignedURLSigner) VerifyToken(token string) (*SignedURLData, error) {
	if token == "" {
		return nil, fmt.Errorf("token required")
	}

	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid token format")
	}

	dataJSON, err := base64.URLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid token data: %w", err)
	}

	var data SignedURLData
	if err := json.Unmarshal(dataJSON, &data); err != nil {
		return nil, fmt.Errorf("invalid token payload: %w", err)
	}

	if time.Now().Unix() > data.Expires {
		return nil, fmt.Errorf("token expired")
	}

	expectedPayload := fmt.Sprintf("%s.%d", parts[0], data.Expires)
	h := hmac.New(sha256.New, s.SecretKey)
	h.Write([]byte(expectedPayload))
	expectedSig := base64.URLEncoding.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(parts[1]), []byte(expectedSig)) {
		return nil, fmt.Errorf("invalid signature")
	}

	return &data, nil
}

func (s *SignedURLSigner) GetExpirationTime() time.Duration {
	return s.URLExpiry
}
