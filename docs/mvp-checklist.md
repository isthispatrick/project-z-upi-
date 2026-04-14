# MVP Checklist

This is the shortest sensible path to a testable beta for Social Finance Copilot.

## Already in place

- Android notification-listener scaffold
- Lightweight device identity registration
- UPI notification ingestion API
- Merchant/VPA memory graph scaffold
- Snap upload contract
- Local media upload target
- Heuristic snap extraction draft API
- Ledger creation API
- Basic ledger listing API and Android history screen scaffold
- Bounty verification scaffold
- Ephemeral share lifecycle scaffold

## Remaining for MVP

### Critical

- User auth beyond device identity
- Persistent database instead of in-memory state
- OCR-grade snap extraction pipeline that turns uploaded media into reliable draft items
- Android flow that shows extracted draft items before submit
- Real merchant mapping persistence across app restarts

### Important

- Friend graph / share recipients
- Real object storage instead of local `uploads/`
- Retry and offline sync for uploads
- Bounty submission UI on Android
- Abuse controls for duplicate and spam bounty uploads

### Nice next

- OCR/vision model integration
- Streaks, retention loops, and prompt analytics
- Menu parsing and merchant price index views

## Suggested build order

1. Persistent storage
2. User auth
3. Snap extraction draft flow
4. Ledger history UI
5. Bounty UI
6. Real storage + background sync
