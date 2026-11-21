# Architecture decision records

Non-obvious decisions about the code live here instead of in code comments (see [0001](0001-no-code-comments.md)).

## Template

```markdown
# NNNN. <Topic>

- Status: Accepted
- Date: YYYY-MM-DD

## Context

What area this covers and why its decisions are easy to get wrong.

## Decisions

### `path/to/file.ts`

- `functionName` does X because Y. ([L42](permalink to the line before the purge))
```

Extend the existing ADR for a topic rather than starting a new one.

## Index

- [0001. No code comments](0001-no-code-comments.md)
- [0002. Data fetching and caching in common](0002-common-data-fetching.md)
- [0003. Chat and DMs in common](0003-common-chat.md)
- [0004. Payments, wallets and tokens in common](0004-common-payments-and-wallets.md)
- [0005. Playback in common](0005-common-playback.md)
- [0006. Auth and account in common](0006-common-auth-and-account.md)
- [0007. Tracks, collections, uploads and contests in common](0007-common-tracks-and-collections.md)
- [0008. Notifications, analytics and flags in common](0008-common-notifications-and-analytics.md)
- [0009. Redux state and shared utilities in common](0009-common-state-and-utilities.md)
