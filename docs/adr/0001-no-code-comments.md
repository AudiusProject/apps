# 0001. No code comments

- Status: Accepted
- Date: 2026-11-21

## Context

The apps repo had about 11,400 hand-written comment blocks (about 24,000 lines, 4.3% of its JS/TS) outside generated code. Most restated the code, described systems that no longer exist, or excused hacks that never got fixed. Agents and people copy the patterns they read, so excuse comments ended up spreading the hacks they described.

## Decision

- Code does not carry comments. Names, types and small functions say _what_.
- A non-obvious _why_ (platform quirks, ordering constraints, money/security reasoning, deliberate fallbacks) goes in an ADR under `docs/adr/`.
- Unfinished work goes in a GitHub issue, not a TODO.
- Exempt: tool directives (`eslint-disable`, `@ts-expect-error`, `prettier-ignore`, bundler magic comments, `@format`, and JSDoc type annotations such as `@type {...}` in plain JS files, which TypeScript checks, `@deprecated` tags, which editors and TypeScript surface, and "DO NOT EDIT" headers written by generators), generated code, vendored files under `public/` and `*.min.js`, tutorial comments in `examples/` directories, license headers, and `/** */` JSDoc in the public-API packages `sdk`, `harmony`, `fixed-decimal` and `spl`, where it is shipped documentation.

## Enforcement

`scripts/comment-ratchet.cjs` counts the non-exempt comments in each file. `.comment-baseline.json` holds the per-file budget. CI (`.github/workflows/comments.yml`) fails when a file goes over its budget, and also when a file falls below it until the budget is lowered with `npm run lint:comments:update`. Budgets only ever go down.

The `/delete-comment` skill (`.claude/skills/delete-comment/`) runs the purge for a path.

## Consequences

- All packages were purged in November 2026 and the baseline is empty, so any new non-exempt comment fails CI.
- Reviewers look for decision records in `docs/adr/` instead of inline.
