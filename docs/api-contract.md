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
  "uploadUrl": "https://uploads.example.com/media_xxx/snap-1713182332.jpg",
  "mediaRef": "media://media_xxx/snap-1713182332.jpg",
  "status": "pending"
}
```

### `PUT /uploads/:uploadIntentId?token=...`

Use the returned `uploadUrl` as the direct upload target. The current scaffold writes bytes into the backend's local `uploads/` folder.

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

The current scaffold verifies that the uploaded file exists on local storage and then marks the intent as uploaded. In production, this should be backed by object storage confirmation.

## Snap extraction

### `POST /api/vision/extract-snap`

Use this after upload confirmation and before the final snap submission.

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
  "confidence": 0.52,
  "notes": ["heuristic-cafe-default"]
}
```

## Snap upload

### `POST /api/snaps`

Use this after the user has taken a snap and the app has extracted provisional item information.

Request:

```json
{
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

1. Capture payment notification.
2. Call `/api/notifications/ingest`.
3. Open snap composer.
4. Capture photo locally with `FileProvider`.
5. Call `/api/media/upload-intents`.
6. `PUT` the media bytes to the returned target.
7. Call `/api/media/confirm`.
8. Call `/api/vision/extract-snap`.
9. Submit `/api/snaps` with the returned `mediaRef` and extracted items.

## Source of truth

The canonical request schemas live in `src/contracts/api.ts`. If this document and code ever disagree, follow the code first and then update the docs immediately.
