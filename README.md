# Social Finance Copilot

Social Finance Copilot is an India-first consumer finance product built around a simple insight: standard UPI rails tell you where money went, but not what the user actually bought. This repo is the working starter for the product vision you mapped out, combining a TypeScript backend with an Android notification-listener client scaffold.

## Vision

The app is not trying to be a spreadsheet with prettier charts. It is trying to become the behavioral layer on top of UPI:

- catch a payment event the moment it happens
- convert that event into a low-friction camera prompt
- extract real-world purchase detail from a snap instead of manual typing
- let users share that moment socially without compromising private ledger history
- crowdsource merchant menus and QR stands to map the offline economy

The long-term moat is the merchant intelligence graph:

- VPA -> merchant identity
- VPA -> first trusted GPS location
- VPA -> average ticket size
- VPA -> likely category and vibe
- VPA -> crowd-verified menu and QR context

## Product Loop

1. A user pays via UPI.
2. The Android app listens for a bank, wallet, or UPI notification.
3. The backend parses amount, time, and merchant handle from the raw text.
4. If the VPA is already known, the product returns a contextual prompt.
5. The user snaps the purchase instead of manually typing an expense.
6. The snap metadata is stored in the ledger, while the social image can be wiped after view.
7. Menu and QR bounties gradually build an offline commerce dataset.

## Current Stack

### Backend

- Runtime: Node.js 24
- Language: TypeScript
- API: Express
- Validation/contracts: Zod
- Persistence: Postgres-ready adapter with in-memory fallback
- SMS parser: `transaction-sms-parser` for Indian bank SMS coverage plus local fallback logic
- Tests: Vitest
- Storage today: Postgres when `DATABASE_URL` is set, otherwise in-memory fallback
- Storage later: Postgres + Redis/job queue

### Android client scaffold

- Language: Kotlin
- Build: Gradle Kotlin DSL
- Background jobs: WorkManager
- Networking: OkHttp
- Serialization: kotlinx.serialization
- Location: Fused Location Provider
- Camera handoff: `FileProvider` + `TakePicture`
- Listener path: `NotificationListenerService`

## What Exists In This Repo

### Backend capabilities

- `POST /api/notifications/ingest`
  Parses raw notification text, classifies the payment, resolves known merchants, and returns a snap prompt.
- `POST /api/devices/register`
  Registers a stable Android installation ID and keeps the device heartbeat fresh.
- `POST /api/auth/google`
  Verifies a Google ID token server-side and links the signed-in user to the current device profile.
- `POST /api/media/upload-intents`
  Creates a media upload intent for snap and bounty images and returns a stable `mediaRef`.
- `POST /api/media/confirm`
  Marks a client-side upload as completed before the ledger references that media.
- `PUT /uploads/:uploadIntentId?token=...`
  Accepts the uploaded image bytes and stores them in the local `uploads/` folder as a stand-in for object storage.
- `POST /api/vision/extract-snap`
  Returns heuristic draft line items from the uploaded snap so the mobile client can prefill the expense.
- `POST /api/snaps`
  Accepts the snap draft contract, creates a ledger entry, and optionally creates an ephemeral share.
- `GET /api/merchants/resolve?vpa=...`
  Looks up a known VPA in the merchant memory graph.
- `POST /api/bounties/submissions`
  Scores a menu or QR submission for fraud and payout eligibility.
- `GET /api/shares/:shareId`
  Reads current share state.
- `POST /api/shares/:shareId/view`
  Marks a recipient view and wipes the share when appropriate.

### Android scaffold

- A launcher activity that helps testers enable the notification listener and permissions
- Google sign-in wiring that exchanges an Android ID token for a backend user session primitive
- A notification-listener service that filters supported UPI-related packages
- A worker that sends raw notification text to the backend
- A local prompt notification that opens a snap composer screen
- A snap composer activity that captures a photo, uploads it, requests extracted draft items, lets the user edit them, and then submits `/api/snaps`
- A basic ledger history screen
- A bounty submission screen for menu and QR-stand capture

## Key Concepts Future Teammates Need To Understand

### 1. We are not reading NPCI directly

The product assumes no banking license and no direct NPCI transaction feed. The safe mobile-side strategy is:

- notification listener first
- direct SMS access only if policy and distribution constraints allow it later

### 2. The VPA graph matters more than any single receipt

The core intelligence is not OCR alone. OCR is a feature. The moat is that every good snap and every approved bounty teaches the system more about the merchant behind a UPI handle.

### 3. Ledger durability and media ephemerality are different systems

The user's finance data should persist. Shared media should not. The architecture deliberately separates them.

### 4. Bounties are data acquisition, not just engagement

The `Rs.1-Rs.2` bounty logic is effectively customer acquisition spend being redirected into merchant graph creation.

## Folder Guide

- `src/`
  Backend application code.
- `src/contracts/`
  Shared request schemas for backend endpoints. This is the source of truth for API payload shapes.
- `docs/architecture.md`
  Product and systems architecture overview.
- `docs/api-contract.md`
  Concrete request/response examples for the mobile client.
- `docs/mvp-checklist.md`
  High-signal view of what is done versus what still remains for beta.
- `docs/repo-integration-notes.md`
  What was integrated from external repos versus what was used as architecture reference only.
- `android/`
  Android notification-listener client scaffold.
- `tests/`
  Focused tests around parsing, categorization, bounty validation, media contract flow, and merchant intelligence.

## Local Development

### Backend

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3000`.

The backend automatically loads a repo-root `.env` file during local development.

To enable Postgres persistence:

```bash
DATABASE_URL=postgres://username:password@localhost:5432/social_finance_copilot
```

To enable Google sign-in verification:

```bash
GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

### Android

Open the `android/` folder in Android Studio. The scaffold currently points to:

- `http://10.0.2.2:3000/` for the Android emulator

If you use a physical device, update `API_BASE_URL` in `android/app/build.gradle.kts`.

If you want Google sign-in to work in the Android client, also set this in `android/gradle.properties`:

```properties
GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

## Recommended Next Milestones

1. Move from the current JSON-payload Postgres adapter to normalized Postgres models for transactions, merchants, shares, bounties, media uploads, and users.
2. Replace the heuristic extraction route with a real server-side OCR and vision pipeline.
3. Replace local upload storage with Cloudinary or another object store plus signed upload URLs.
4. Add image compression, retry logic, and background media sync on Android.
5. Deepen auth from Google-linked device identity into real user sessions and onboarding.
6. Add trust/risk scoring for fraudulent bounty submissions.
7. Add friend graph, social opens, and prompt conversion analytics.

## Important Caveats

- The Android scaffold is created but not compiled in this environment because no Android SDK/Gradle wrapper was set up here.
- Google sign-in requires a valid `GOOGLE_WEB_CLIENT_ID` in both the backend environment and Android Gradle properties.
- The backend is verified with tests and a live HTTP smoke request.
- The current persistence layer is intentionally temporary.
- The Android client now captures a local image and performs a real local upload against the backend, but production object storage still needs to replace the local `uploads/` folder.

## If Someone New Takes Over

Start here:

1. Read this file.
2. Read `docs/architecture.md`.
3. Read `docs/api-contract.md`.
4. Inspect `src/services/copilot.ts` to understand the core product loop.
5. Inspect `android/app/src/main/java/com/socialfinance/copilot/` to understand the notification-listener client path.

That sequence will get a new engineer productive fastest.
