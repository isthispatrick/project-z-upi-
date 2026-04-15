# API Contract

This document is the handoff contract between the backend and the Android client scaffold.

## Notification ingestion

### `POST /api/notifications/ingest`

Use this as soon as a supported UPI notification is captured.

Request:

```json
{
  "sourceApp": "PhonePe",
  "rawText": "Rs.150 debited from a/c XX1234 via UPI to newcafe.blr@icici on 15-Apr-2026 14:30 Ref 903221",
  "capturedAt": "2026-04-15T14:31:00.000Z"
}
```

Response shape:

```json
{
  "parsed": {
    "sourceApp": "PhonePe",
    "rawText": "Rs.150 debited from a/c XX1234 via UPI to newcafe.blr@icici on 15-Apr-2026 14:30 Ref 903221",
    "amountPaise": 15000,
    "occurredAt": "2026-04-15T14:30:00.000Z",
    "merchantVpa": "newcafe.blr@icici",
    "confidence": 1
  },
  "transaction": {
    "id": "txn_xxx",
    "category": "CAFE",
    "merchantLabel": "New Cafe"
  },
  "merchant": {
    "vpa": "newcafe.blr@icici",
    "displayName": "New Cafe",
    "categoryHint": "CAFE",
    "locationName": "Koramangala 5th Block",
    "city": "Bengaluru"
  },
  "prompt": {
    "headline": "Rs.150 dropped at New Cafe.",
    "subtext": "You're back near Koramangala 5th Block. Snap the order and keep the ledger sharp."
  }
}
```

## Device registration

### `POST /api/devices/register`

Use this once per install launch so the backend can associate transactions and ledger entries with a stable Android device profile.

Request:

```json
{
  "deviceId": "device_2d8bc3a0",
  "platform": "ANDROID",
  "label": "Pixel 8"
}
```

Response:

```json
{
  "id": "device_2d8bc3a0",
  "platform": "ANDROID",
  "label": "Pixel 8",
  "createdAt": "2026-04-15T05:20:00.000Z",
  "lastSeenAt": "2026-04-15T05:20:00.000Z"
}
```

## Google auth

### `POST /api/auth/google`

Use this after Android Google sign-in returns an ID token. The backend verifies the token against `GOOGLE_WEB_CLIENT_ID`, creates or updates a user profile, and links that user to the current device.

Request:

```json
{
  "deviceId": "device_2d8bc3a0",
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

Response:

```json
{
  "user": {
    "id": "user_xxx",
    "email": "shrey@example.com",
    "displayName": "Shrey",
    "photoUrl": "https://lh3.googleusercontent.com/a/example",
    "authProvider": "GOOGLE",
    "providerUserId": "109876543210987654321",
    "createdAt": "2026-04-15T05:25:00.000Z",
    "lastSeenAt": "2026-04-15T05:25:00.000Z"
  },
  "device": {
    "id": "device_2d8bc3a0",
    "platform": "ANDROID",
    "userId": "user_xxx",
    "createdAt": "2026-04-15T05:20:00.000Z",
    "lastSeenAt": "2026-04-15T05:25:00.000Z"
  }
}
```

## Friend graph

### `GET /api/friends?userId=user_xxx`

Returns the directed friend links for the current user.

Response:

```json
[
  {
    "id": "friend_xxx",
    "userId": "user_xxx",
    "friendUserId": "user_friend_yyy",
    "displayName": "Vishesh",
    "email": "vishesh@example.com",
    "photoUrl": "https://lh3.googleusercontent.com/a/example",
    "createdAt": "2026-04-15T07:10:00.000Z"
  }
]
```

### `POST /api/friends`

Request:

```json
{
  "userId": "user_xxx",
  "friendUserId": "user_friend_yyy"
}
```

Response:

```json
{
  "id": "friend_xxx",
  "userId": "user_xxx",
  "friendUserId": "user_friend_yyy",
  "createdAt": "2026-04-15T07:10:00.000Z"
}
```

## Media upload

### `POST /api/media/upload-intents`

Use this before posting `/api/snaps` or a bounty submission, so the client has a stable `mediaRef`.

Request:

```json
{
  "purpose": "SNAP",
  "fileName": "snap-1713182332.jpg",
  "mimeType": "image/jpeg"
}
```

Response:

```json
{
  "id": "media_xxx",
  "purpose": "SNAP",
  "fileName": "snap-1713182332.jpg",
  "mimeType": "image/jpeg",
  "uploadUrl": "http://localhost:3000/uploads/media_xxx?token=secret_upload_token",
  "mediaRef": "media://media_xxx/snap-1713182332.jpg",
  "status": "pending"
}
```

### `PUT /uploads/:uploadIntentId?token=...`

Use the returned `uploadUrl` as the direct upload target. When R2 is configured, this is a presigned Cloudflare R2 URL so the Android client uploads bytes straight to object storage without proxying through the Node.js API. The relative `/uploads/...` route remains only for local development.

Request body:

- raw image bytes
- `Content-Type` should match the mime type from the upload intent

### `POST /api/media/confirm`

Request:

```json
{
  "uploadIntentId": "media_xxx"
}
```

The backend verifies that the uploaded file exists in the configured storage backend and then marks the intent as uploaded.

## Snap extraction

### `POST /api/vision/extract-snap`

Use this after upload confirmation and before the final snap submission. The backend now sends the uploaded image to an OpenAI vision model when `OPENAI_API_KEY` is configured and falls back to lightweight merchant heuristics when the API is unavailable.

Request:

```json
{
  "mediaRef": "media://media_xxx/snap-1713182332.jpg",
  "merchantLabel": "Rao's Cafe",
  "amountPaise": 4000
}
```

Response:

```json
{
  "items": [
    {
      "name": "Coffee",
      "pricePaise": 4000
    }
  ],
  "confidence": 0.91,
  "notes": ["openai-vision-primary"]
}
```

## Snap upload

### `POST /api/snaps`

Use this after the user has taken a snap and the app has extracted provisional item information.

Request:

```json
{
  "deviceId": "device_2d8bc3a0",
  "transactionId": "txn_xxx",
  "photoRef": "media://media_xxx/snap-1713182332.jpg",
  "gps": {
    "lat": 12.9279,
    "lng": 77.6271,
    "accuracyMeters": 18
  },
  "locationName": "Koramangala 5th Block",
  "city": "Bengaluru",
  "items": [
    {
      "name": "Cold Coffee",
      "pricePaise": 15000
    }
  ],
  "shareWith": ["vishesh"],
  "ttlSeconds": 1800
}
```

Response:

```json
{
  "ledgerEntry": {
    "id": "ledger_xxx",
    "merchantLabel": "New Cafe",
    "category": "CAFE",
    "totalAmountPaise": 15000
  },
  "shareId": "share_xxx"
}
```

## Merchant lookup

### `GET /api/merchants/resolve?vpa=newcafe.blr@icici`

Returns the stored merchant memory for a known VPA.

## Ledger history

### `GET /api/ledger?deviceId=device_2d8bc3a0`

Returns device-scoped ledger entries for the Android client history screen.

## Bounty submission

### `POST /api/bounties/submissions`

Use this for menu and QR stand data acquisition flows.

Request:

```json
{
  "merchantVpa": "newcafe.blr@icici",
  "type": "QR_STAND",
  "photoRef": "media://media_xxx/qr-1.jpg",
  "gps": {
    "lat": 12.9279,
    "lng": 77.6271,
    "accuracyMeters": 14
  },
  "locationName": "Koramangala 5th Block",
  "city": "Bengaluru",
  "aiSignals": {
    "qualityScore": 0.91,
    "duplicateLikely": false,
    "detectedTargets": ["merchant qr stand", "branding"],
    "textCoverage": 0.45
  }
}
```

Response:

```json
{
  "submission": {
    "id": "bounty_xxx",
    "merchantVpa": "newcafe.blr@icici",
    "type": "QR_STAND",
    "payoutPaise": 200,
    "status": "approved",
    "reasons": ["eligible-for-micro-bounty"]
  }
}
```

## Share lifecycle

### `POST /api/shares/:shareId/view`

Request:

```json
{
  "viewerId": "vishesh"
}
```

When all intended viewers have opened the share, the backend marks it as wiped while the ledger entry remains intact.

## Android snap flow

1. Register the current device with `/api/devices/register`.
2. Optionally sign in with Google and exchange the ID token through `/api/auth/google`.
3. Capture payment notification.
4. Call `/api/notifications/ingest`.
5. Open snap composer.
6. Capture photo locally with `FileProvider`.
7. Queue draft preparation with WorkManager so upload, confirm, and extraction retry automatically on bad networks.
8. Let the user edit extracted draft items after the queued job succeeds.
9. Optionally open the friend picker and select recipients from `/api/friends`.
10. Submit `/api/snaps` with the returned `mediaRef`, reviewed items, and selected recipients.

## Source of truth

The canonical request schemas live in `src/contracts/api.ts`. If this document and code ever disagree, follow the code first and then update the docs immediately.
