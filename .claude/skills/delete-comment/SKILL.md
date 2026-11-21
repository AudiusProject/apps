---
name: delete-comment
description: Purge code comments from a package or directory of the apps repo. Classifies each comment as tautology, stale, excuse or decision record, deletes them, files GitHub issues for excuses, moves decision records into docs/adr/, and ratchets .comment-baseline.json down. Use when asked to delete comments, run the comment purge, or continue the comment ratchet on a path.
argument-hint: <path, e.g. packages/web/src/pages>
---

# /delete-comment

Policy: [docs/adr/0001-no-code-comments.md](../../../docs/adr/0001-no-code-comments.md). Code explains _what_; non-obvious _why_ lives in an ADR; unfinished work lives in an issue.

Target: `$ARGUMENTS` (a path under the repo root). If empty, pick the path with the most budgeted comments from `.comment-baseline.json` and confirm it with the user.

## 1. Inventory

Work in a fresh worktree branched from `origin/main`.

```bash
node scripts/comment-ratchet.cjs --stats $ARGUMENTS
node scripts/comment-ratchet.cjs --list $ARGUMENTS > /tmp/comments.jsonl
```

Each line is `{file, line, endLine, ownLine, isLine, body}`. Consecutive `//` lines are already merged into one block. Directives (`eslint-disable`, `@ts-expect-error`, `prettier-ignore`, ...), generated code, vendored `public/` and `*.min.js` files, `examples/` tutorials, license headers and `/** */` JSDoc in public-API packages (`sdk`, `harmony`, `fixed-decimal`, `spl`) are exempt and never listed.

## 2. Classify

For every listed comment, read it with the surrounding code and pick exactly one:

| Category  | Meaning                                                                                                                                                      | Action         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| tautology | Restates the code, names or types; section headers; step narration                                                                                           | delete         |
| stale     | Commented-out code, or describes code, systems or behaviour that no longer exist (sagas, libs, discovery/content/creator nodes...)                           | delete         |
| excuse    | Admits our code is hacky, incomplete or temporary (TODO, "for now", "hack", missing types, "fix these deps")                                                 | delete + issue |
| decision  | Non-obvious _why_ a reader would get wrong without it: platform/library quirks, ordering or race constraints, money/security reasoning, deliberate fallbacks | delete + ADR   |

A correct workaround for a third-party bug is a decision, not an excuse. Be strict with decisions: if a competent reader would work it out from the code in a minute, it is a tautology.

For more than ~300 comments, split the inventory into batches of ~400 and hand each batch to a `worker` subagent (a `directive` category catches pragmas the exemption regex missed; widen the regex in `scripts/comment-ratchet.cjs` for those) with snippets of the code around each comment. Have each one write a verdicts JSONL rather than edit files. Each verdict keeps the inventory fields and adds `cat`, `reason`, plus `issue` (excuse) or `topic` + `record` (decision).

Spot-check at least 30 verdicts yourself before applying, weighted toward `decision` and `excuse`.

## 3. Issues for excuses

Before deleting, file excuses as GitHub issues in `AudiusProject/apps`, grouped by area (one issue per directory or feature, never one per comment). Each issue gets a checklist of `- [ ] <issue sentence> — <permalink to file#Lline at the pre-purge commit SHA>`, and the `tech-debt` label if it exists. Confirm the number of issues with the user before creating them.

## 4. ADRs for decisions

Group decision verdicts by `topic`. For each topic, add or extend `docs/adr/NNNN-<topic>.md` using the template in [docs/adr/README.md](../../../docs/adr/README.md): one `### <file or function>` subsection per record, written as a plain decision with its reason. Add every new ADR to the index in `docs/adr/README.md`. Extend an existing topic ADR instead of creating a duplicate.

## 5. Delete and ratchet

```bash
node .claude/skills/delete-comment/apply.cjs /tmp/verdicts.jsonl
npx prettier --write <touched files>
npm run lint:comments:update
npm run lint:comments
```

Then run lint and typecheck for each package you touched (`npx turbo run lint typecheck --filter=<pkg>`). Deleting a comment must never change behaviour. If lint flags a removed `eslint-disable` or similar, the exemption regex in `scripts/comment-ratchet.cjs` missed a directive: restore it and widen the regex.

Commit `.comment-baseline.json` with the deletions. The PR body reports comments and lines removed, issues filed and ADRs added or extended.
