# API Reference

## Overview

All API endpoints (except webhooks) require Clerk JWT authentication via the `Authorization: Bearer <token>` header.

## Base URL

```
http://localhost:9000/api
```

## Authentication

Include JWT token in header:
```
Authorization: Bearer <clerk_jwt_token>
```

## Build Endpoints

### Create Build

**POST** `/build`

Create a new LaTeX build.

**Request:**
- Form data:
  - `file` (multipart/form-data, required): ZIP file containing LaTeX source
  - `engine` (string, optional): Compilation engine - `pdflatex`, `xelatex`, or `lualatex`. Default: `pdflatex`
  - `main_file` (string, optional): Main LaTeX file. Default: `main.tex`
  - `shell_escape` (boolean, optional): Enable shell escape. Default: `false`

**Response:**
```json
{
  "id": "bld_1234567890",
  "status": "pending",
  "engine": "pdflatex",
  "main_file": "main.tex",
  "created_at": "2024-01-15T10:30:00Z",
  "expires_at": "2024-01-16T10:30:00Z"
}
```

**Status Codes:**
- 201: Build created successfully
- 400: Invalid input (file too large, invalid engine, path traversal detected)
- 403: Build limit exceeded or subscription paused
- 413: File too large
- 503: Insufficient disk space

---

### List Builds

**GET** `/build`

List all builds for the authenticated user.

**Query Parameters:**
- `page` (integer, optional): Page number. Default: 1
- `page_size` (integer, optional): Results per page (max 100). Default: 20

**Response:**
```json
{
  "builds": [
    {
      "id": "bld_1234567890",
      "status": "completed",
      "engine": "pdflatex",
      "main_file": "main.tex",
      "created_at": "2024-01-15T10:30:00Z",
      "expires_at": "2024-01-16T10:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

---

### Get Build

**GET** `/build/{buildId}`

Get details for a specific build.

**Response:**
```json
{
  "id": "bld_1234567890",
  "user_id": "user_xxx",
  "status": "completed",
  "engine": "pdflatex",
  "main_file": "main.tex",
  "pdf_path": "/path/to/output.pdf",
  "synctex_path": "/path/to/output.synctex.gz",
  "build_log": "...",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:35:00Z",
  "expires_at": "2024-01-16T10:30:00Z",
  "storage_bytes": 1024000
}
```

**Status Codes:**
- 200: Success
- 404: Build not found
- 403: Access denied

---

### Get Build Status

**GET** `/build/{buildId}/status`

Get the current status of a build.

**Response:**
```json
{
  "id": "bld_1234567890",
  "status": "compiling",
  "message": "Compilation in progress",
  "engine": "pdflatex",
  "progress": 45,
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": null
}
```

---

### Delete Build

**DELETE** `/build/{buildId}`

Delete a build (soft delete, then hard delete after grace period).

**Response:**
```json
{
  "status": "deleted",
  "message": "Build will be permanently deleted shortly"
}
```

---

### Get PDF Download URL

**GET** `/build/{buildId}/pdf/url`

Get a signed URL for downloading the PDF (valid for 5 minutes).

**Response:**
```json
{
  "url": "/build/bld_1234567890/pdf?token=...",
  "expires_in": 300,
  "build_id": "bld_1234567890",
  "resource": "pdf"
}
```

**Status Codes:**
- 200: Success
- 400: Build not compiled
- 404: Build not found

---

### Download PDF

**GET** `/build/{buildId}/pdf`

Download the compiled PDF file using signed URL.

**Query Parameters:**
- `token` (string, required): Signed URL token from `/pdf/url` endpoint

**Response:**
- Binary PDF file

**Status Codes:**
- 200: Success
- 403: Invalid or expired token
- 404: File not found

---

## Subscription Endpoints

### Create Subscription

**POST** `/subscription/create`

Create a subscription for the user.

**Request:**
```json
{
  "plan_id": "pro"
}
```

**Response:**
```json
{
  "checkout_url": "https://rzp.io/i/...",
  "plan": "pro"
}
```

---

### Cancel Subscription

**POST** `/subscription/cancel`

Cancel the user's subscription (takes effect at end of billing period).

**Response:**
```json
{
  "status": "canceled",
  "message": "Subscription will be canceled at end of billing period"
}
```

---

### Get Subscription Status

**GET** `/subscription/status`

Get the current subscription status.

**Response:**
```json
{
  "tier": "pro",
  "status": "active",
  "current_start": "2024-01-01T00:00:00Z",
  "current_end": "2024-02-01T00:00:00Z",
  "paid_count": 1,
  "total_count": 12,
  "canceled_at": null,
  "paused": false
}
```

---

## Coupon Endpoints

### Redeem Coupon

**POST** `/coupon/redeem`

Apply a coupon code to create a subscription.

**Request:**
```json
{
  "coupon_code": "SAVE20",
  "plan_id": "pro"
}
```

**Response:**
```json
{
  "checkout_url": "https://rzp.io/i/...",
  "discount_percent": 20,
  "plan": "pro"
}
```

**Status Codes:**
- 200: Success
- 400: Invalid coupon or plan mismatch
- 410: Coupon expired or usage limit exceeded

---

## User Endpoints

### Get Usage Statistics

**GET** `/user/usage`

Get current usage statistics for the authenticated user.

**Response:**
```json
{
  "tier": "pro",
  "monthly_used": 15,
  "monthly_limit": 500,
  "monthly_reset_at": "2024-02-01T00:00:00Z",
  "concurrent_used": 2,
  "concurrent_limit": 10,
  "storage_used_gb": 2.5,
  "storage_limit_gb": 10
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "code": "rate_limited",
  "message": "Rate limit exceeded",
  "details": "Please try again in 60 seconds"
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `invalid_input` | 400 | Invalid request parameters |
| `not_found` | 404 | Resource not found |
| `unauthorized` | 401 | Missing or invalid authentication |
| `forbidden` | 403 | Access denied |
| `conflict` | 409 | Resource conflict |
| `rate_limited` | 429 | Rate limit exceeded |
| `limit_exceeded` | 403 | Usage limit exceeded |
| `compilation_failed` | 400 | LaTeX compilation failed |
| `server_error` | 500 | Internal server error |

---

## Rate Limits

Rate limits are per authenticated user:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Build creation | 10 requests | 1 minute |
| Download | 60 requests | 1 minute |
| Status check | 30 requests | 1 minute |
| Other endpoints | 100 requests | 1 minute |

Rate limit info is included in response headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1234567890
Retry-After: 60
```

---

## Webhooks

### Razorpay Webhook

**POST** `/webhooks/razorpay`

Receives payment events from Razorpay. Signature verified with `X-Razorpay-Signature` header.

**No authentication required** (verified by signature)

**Events:**
- `subscription.activated`
- `subscription.cancelled`
- `subscription.paused`
- `subscription.resumed`
- `payment.authorized`
- `payment.failed`
- `subscription.completed`

---

## Example Usage

### Create and compile a LaTeX document

```bash
# 1. Create a build
curl -X POST http://localhost:9000/api/build \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@project.zip" \
  -F "engine=pdflatex" \
  -F "main_file=main.tex"

# Response: { "id": "bld_123...", "status": "pending", ... }

# 2. Check status
curl http://localhost:9000/api/build/bld_123/status \
  -H "Authorization: Bearer $TOKEN"

# 3. Download PDF
curl http://localhost:9000/api/build/bld_123/pdf/url \
  -H "Authorization: Bearer $TOKEN"
# Response: { "url": "/build/bld_123/pdf?token=...", ... }

curl http://localhost:9000/api/build/bld_123/pdf?token=... \
  -o output.pdf
```

---

## Performance Considerations

1. **Build Timeout**: 5 minutes maximum per build
2. **File Size Limit**: 100MB per upload
3. **Pagination**: Default 20 items per page, max 100
4. **Log Size Limit**: 10MB truncation for build logs
5. **Storage Cleanup**: Automatic after 24 hours (with 1 hour grace period)
