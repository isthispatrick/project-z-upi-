# MVP Checklist

This is the shortest sensible path to a testable beta for Social Finance Copilot.

## Already in place

- Android notification-listener scaffold
- Lightweight device identity registration
- Google sign-in scaffold linked to backend device identity
- UPI notification ingestion API
- Merchant/VPA memory graph scaffold
- Friend graph backend scaffold
- Friend recipient picker UI on Android
- Snap upload contract
- Cloudflare R2-backed media upload path with local-dev fallback
- OpenAI vision-backed snap extraction with heuristic fallback
- WorkManager-backed queued snap draft preparation for offline-prone networks
- Editable extracted-items review flow on Android
- Ledger creation API
- Basic ledger listing API and Android history screen scaffold
- Bounty verification scaffold
- Bounty submission UI on Android
- Ephemeral share lifecycle scaffold
- Postgres-backed persistence adapter with Postgres-required mode for beta

## Remaining for MVP

### Critical

- Better prompt/schema tuning for the vision extraction pipeline so uploaded media turns into reliable draft items
- Final reviewed snap submission retry and offline sync
- Friend creation and management UI on Android so recipients can be maintained in-app

### Important

- Abuse controls for duplicate and spam bounty uploads
- Deeper auth and onboarding beyond the current Google-linked device profile
- Move from JSON-payload Postgres rows to normalized tables and migrations

### Nice next

- Streaks, retention loops, and prompt analytics
- Menu parsing and merchant price index views

## Suggested build order

1. Final submit retry and offline sync for reviewed snaps
2. Friend creation and management UI
3. Normalized Postgres models and migrations
4. Auth and onboarding polish
5. Abuse controls and payout trust scoring
6. Social loop refinement
