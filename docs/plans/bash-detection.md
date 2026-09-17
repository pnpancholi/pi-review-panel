# Bash Deletion Detection

## Problem

The session-aware review panel tracks modified files via `tool_result` for `write` and `edit` tools only. Files deleted via `bash` (e.g., `rm file.ts`) don't appear in the panel because:

1. `bash` tool calls aren't tracked in `modifiedFiles`
2. `getChangeSize` detects deletions via git diff, but the `onlyPaths` filter excludes them (path not in `modifiedFiles`)

## Current Tracking

| Tool | Tracked? | Notes |
|------|----------|-------|
| `write` | ✓ | New/modified files |
| `edit` | ✓ | Modified files |
| `bash` | ✗ | Deletions, moves, renames, external tool edits |

## Detection Approaches

### Option 1: Parse bash commands for `rm`

In `tool_result` handler, check for `bash` tool with `rm` command:

```typescript
pi.on("tool_result", async (event, _ctx) => {
  if (event.isError) return
  
  if (event.toolName === "write" || event.toolName === "edit") {
    const path = (event.input as any)?.path
    if (path) sessionTracker.trackFile(path)
  }
  
  if (event.toolName === "bash") {
    const cmd = (event.input as any)?.command || ""
    // Match: rm, rm -rf, rm -f, unlink, rmdir
    const rmMatch = cmd.match(/\b(rm|unlink|rmdir)\b/)
    if (rmMatch) {
      // Extract paths from command
      const paths = extractPathsFromRmCommand(cmd)
      for (const path of paths) sessionTracker.trackFile(path)
    }
  }
})
```

**Pros:** Catches explicit deletions
**Cons:** Fragile regex, misses `mv` renames, misses external tool edits (e.g., `sed -i`, `prettier --write`)

---

### Option 2: Track all `bash` tool calls, diff later

Track any file that bash touches by diffing working tree before/after bash execution. Requires snapshotting before bash runs.

**Pros:** Catches all file mutations from bash
**Cons:** Performance hit, complex state management

---

### Option 3: Git status as source of truth

Replace tool-call tracking with `git status --porcelain` comparison:

```typescript
async function getSessionChanges(cwd: string, baseline: string): Promise<GitChange[]> {
  const status = await git(cwd, ["status", "--porcelain"])
  // Parse status, filter by baseline comparison
}
```

**Pros:** 100% accurate, catches all changes (bash, external tools, manual edits)
**Cons:** Heavier git call, loses "session-scoped" semantic (shows all uncommitted changes since baseline, not just this session's)

---

### Option 4: Hybrid — tool calls + git diff for deletions

Keep tool-call tracking for additions/modifications, but show deletions from git diff unfiltered:

```typescript
// In getChangeSize, when onlyPaths provided:
if (onlyPaths) {
  const additions = changes.filter(c => onlyPaths.has(c.path))
  const deletions = changes.filter(c => c.status === "deleted")
  return [...additions, ...deletions]
}
```

**Pros:** Panel shows all session writes/edits + all deletions
**Cons:** Deletions shown even if not from this session (if baseline differs)

---

## Recommendation

**Option 4 (Hybrid)** for quick win: panel shows tracked files + all deletions.

For full accuracy, **Option 3 (Git status)** long-term — replace tool-call tracking with git-based session diff. More reliable, simpler code, but changes semantics.

## Implementation Plan

1. Add hybrid filter to `getChangeSize` (Option 4) — immediate fix
2. Evaluate Option 3 if hybrid feels insufficient
3. Consider `mv`/`cp` tracking in bash parser if Option 1 chosen