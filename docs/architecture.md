# Architecture Blueprint

## Product loop

1. The Android app receives a UPI payment notification from a bank or wallet app.
2. The backend parses the raw text to extract amount, timestamp, merchant label, and VPA.
3. Merchant intelligence checks whether the VPA is already mapped to a known place.
4. The API returns a snap prompt that feels contextual instead of generic.
5. The user uploads a snap of the purchase. AI extracts line items and price hints.
6. The ledger keeps the structured metadata forever, while the social image expires after view or TTL.
7. Separate bounty submissions build the offline pricing graph for menus and QR stands.

## Why the VPA graph is the moat

A VPA is the only durable merchant handle consistently exposed in many UPI payment flows. GPS is transient, but once a trusted first snap or bounty links a VPA to a place, the system can:

- recognize that merchant instantly on future payments
- infer likely category and average ticket size
- generate localized prompts
- crowd-build an offline pricing dataset that delivery platforms often do not expose

## Service boundaries in this starter

### Notification ingestion

- Input: app name, raw notification text, capture time
- Output: parsed payment, auto-category, merchant resolution, snap prompt
- Main logic: regex-first parsing with a fallback-friendly partial parse mode

### Merchant intelligence

- Maintains a VPA keyed merchant graph
- Learns location from first successful snap or bounty
- Applies category rules for known handles like `@swiggy`, `@zomato`, `irctc@`, and `uber@`

### Snap logging

- Accepts AI-extracted items, GPS, and the related transaction id
- Creates a durable ledger entry
- Updates merchant memory if this was the first location-confirming snap
- Creates an ephemeral share if recipients are attached

### Social sharing

- Media is modeled as time-bound and wipeable
- The ledger entry survives even after the media is marked wiped
- A share is wiped when every intended recipient has viewed it or the TTL expires

### Bounties

- Accepts submission type, merchant VPA, GPS, and AI validation metadata
- Scores image quality, fraud hints, duplicate risk, and target-object detection
- Releases a micro-payout in the `₹1-₹2` range when the evidence looks legitimate

## Android client contract

The backend is designed for the Play Store-safe notification listener path:

- Read notification text from GPay, PhonePe, Paytm, or bank apps
- Send raw text plus source app and capture time to `/api/notifications/ingest`
- Show the returned prompt immediately
- After camera capture and OCR, send the enriched snap payload to `/api/snaps`

The backend does not assume direct SMS access or NPCI integration.

## Production upgrades after this starter

- Postgres for transactions, merchants, and bounties
- Redis or Kafka for async prompting and media-wipe jobs
- Object storage with lifecycle rules for snap deletion
- Vision model service for OCR, menu parsing, and QR/menu legitimacy checks
- Trust and safety layer for repeated low-quality bounty submissions
