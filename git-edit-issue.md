# git-edit-issue

## Problem statement

A file that already existed when the pi session started: edits made to it during the
session are **not reflected in the review panel**, even though the recompute runs.

Repro: `/review` → ask pi to rewrite an existing file via `write` (e.g. replace the
contents of `test/test3.ts`) → the panel stays empty.

Not in scope here: the **delete** case is already fixed (the skip line in
`getChangeSize` was commented out + the hot-reload handler now listens to all tool
calls, not just `write`/`edit`/`bash`).

## Root cause

`getChangeSize` Part 2 (`src/git.ts`) records only the **existence** of untracked
files at session start (`untrackedFilesAtStart: Set<string>`), never their
**content**. The guard

```ts
if (untrackedFilesAtStart.has(path)) continue
```

skips any pre-existing untracked file unconditionally — so a rewritten pre-existing
file is never surfaced.

Part 1 (`git diff <baseline> --`) cannot catch it either:

- the file is untracked, so it appears in no git diff; and
- in a zero-commit repo `baseline` is `null` (`git stash create` and `HEAD` both
  fail), so tracked diffs do not exist at all.

Note: commenting out the skip line makes **every** pre-existing untracked file show
up — including unchanged ones — which conflates "existed at session start" with
"changed this session". The proper fix needs a content comparison.

## Potential solutions

### A. Content snapshot + in-memory line diff (recommended)

- At `session_start`, snapshot the contents of all untracked files as
  `Map<path, content>`.
- At review, for each current untracked file:
  - not in snapshot → brand-new → `added` (existing behavior);
  - in snapshot, content unchanged → skip;
  - in snapshot, content changed → report it with accurate `+N/−M` via a small LCS
    line diff (pulls the planned `src/diff.ts` forward).
- Pros: accurate, no temp files, diff logic is reusable for the future per-file diff
  view.
- Cons: most code; needs a correct line-diff implementation.

### B. Content snapshot + `git diff --no-index --numstat`

- Same snapshot, but for a changed file write old/new content to temp files and run
  `git diff --no-index --numstat` to get exact numbers.
- Pros: reuses git's diff engine, no hand-written diff algorithm.
- Cons: spawns git + temp-file cleanup per changed file.

### C. Line-count delta

- Snapshot line counts at session start; compare against current count.
- Pros: cheapest.
- Cons: misses same-length edits, and shows rough numbers (a 1-line change in a
  50-line file reads as ±48).

### Shared concerns

- Reset the snapshot in `session_shutdown` (alongside `baseline` and
  `untrackedFilesAtStart`).
- Snapshot memory: store full content (accurate, memory-heavy) vs a content hash
  (cheap, but cannot produce stats without a second read / the line diff).
- Where the diff helper lives: `src/diff.ts` vs inline in `src/git.ts`.

## Open questions for tomorrow

1. Which solution: A, B, or C?
2. Snapshot as full content or hash?
3. Where should the diff helper live?
