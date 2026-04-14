# Repo Integration Notes

This project was updated using the repositories below.

## Directly integrated

### `saurabhgupta050890/transaction-sms-parser`

Integrated as an npm dependency:

- package: `transaction-sms-parser`
- purpose: first-pass parsing for Indian transactional SMS formats across many banks
- integration point: `src/domain/notifications/parser.ts`

Current behavior:

- try the library first for amount and merchant extraction
- keep local regex/date/VPA fallback logic in place
- preserve our own product-specific categorization and prompting behavior

## Cloned for reference

### `sarim2000/pennywiseai-tracker`

Cloned under `references/pennywiseai-tracker/`.

Used as reference for:

- SMS-first ingestion architecture
- local/on-device processing mindset
- separation between parsing and categorization

### `sudokoi/expense-buddy`

Cloned under `references/expense-buddy/`.

Used as reference for:

- review-first import flow
- deterministic regex-first parsing before OCR/ML
- staging imported transactions before confirmation

## Why the latter two are references instead of direct dependencies

They are full applications, not focused libraries. Pulling them directly into this repo would create more rewrite work than value. The right move was:

- integrate the parser library where it cleanly fits
- borrow architecture patterns from the larger apps
- keep this codebase focused on the Social Finance Copilot flow
