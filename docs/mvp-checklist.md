# MVP Checklist

This is the shortest sensible path to a testable beta for Social Finance Copilot.

## Already in place

- Android notification-listener scaffold
- Lightweight device identity registration
- Google sign-in scaffold linked to backend device identity
- UPI notification ingestion API
- Merchant/VPA memory graph scaffold
- Snap upload contract
- Local media upload target
- Heuristic snap extraction draft API
- Editable extracted-items review flow on Android
- Ledger creation API
- Basic ledger listing API and Android history screen scaffold
- Bounty verification scaffold
- Bounty submission UI on Android
- Ephemeral share lifecycle scaffold
- Postgres-backed persistence adapter with in-memory fallback

## Remaining for MVP

### Critical

- OCR-grade snap extraction pipeline that turns uploaded media into reliable draft items
- Real merchant mapping persistence across app restarts

### Important

- Friend graph / share recipients
- Real object storage instead of local `uploads/`
- Retry and offline sync for uploads
- Abuse controls for duplicate and spam bounty uploads
- Deeper auth and onboarding beyond the current Google-linked device profile

### Nice next

- OCR/vision model integration
- Streaks, retention loops, and prompt analytics
- Menu parsing and merchant price index views

## Suggested build order

1. Server-side OCR
2. Real storage + background sync
3. Normalized Postgres models and migrations
4. Auth and onboarding polish
5. Friend graph
6. Social loop refinement
