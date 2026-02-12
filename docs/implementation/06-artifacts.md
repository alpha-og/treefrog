# Phase 6.5: Artifact Download & Signed URLs

## Goal

Secure, time-bound artifact delivery (already implemented in backend Phase 4).

---

## Signed URL Flow

**Backend generates URL** (Phase 4 - already done):
```
GET /api/builds/{buildId}/artifacts/pdf/signed-url?expires=300
Response: { url: "http://backend/artifacts/...?signature=xyz&expires=..." }
```

**Frontend downloads**:
```typescript
const downloadArtifact = async (buildId: string, type: 'pdf' | 'logs') => {
  const { url } = await fetch(`/api/builds/${buildId}/artifacts/${type}/signed-url`)
    .then(r => r.json())
  window.open(url, '_blank')  // Browser downloads file
}
```

**Backend verifies & streams** (Phase 4 - already done):
```
GET /artifacts/{buildId}/pdf?signature=xyz&expires=...
- Verify HMAC-SHA256 signature
- Check expiry
- Stream file with Content-Disposition: attachment
```

---

## Key Files

```
📝 frontend/src/pages/Build.tsx (Add download buttons)
📝 frontend/src/components/BuildHistoryTable.tsx (Add action links)
```

---

## Implementation

In Build details page:

```typescript
const downloadArtifact = async (buildId: string, type: 'pdf' | 'logs') => {
  try {
    const response = await fetch(`/api/builds/${buildId}/artifacts/${type}/signed-url`)
    const { url } = await response.json()
    window.open(url, '_blank')
  } catch (err) {
    toast.error('Download failed')
  }
}

return (
  <div className="space-y-4">
    <button onClick={() => downloadArtifact(buildId, 'pdf')}>
      Download PDF
    </button>
    <button onClick={() => downloadArtifact(buildId, 'logs')}>
      View Logs
    </button>
  </div>
)
```

---

## Testing

```
- Build project → Generate artifact
- Navigate to /build/{id}
- Click "Download PDF" → Browser downloads build.pdf
- Wait 5+ minutes → Click again → Get 401 (expired)
- Generate new signed URL → Download works
```

---

## Next Step

→ Continue to [06-testing.md](06-testing.md) (Testing & Regression Prevention)
