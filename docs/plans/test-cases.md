# Test Cases

## Session-Aware File Tracking

### TC-01: New Session — Track Writes
**Steps:**
1. Start pi in fresh directory
2. Create `file1.ts` via agent write
3. Edit `file1.ts` via agent edit
4. Run `/review`
**Expected:** Panel shows `file1.ts` with correct `+`/`-` counts

### TC-02: New Session — Track Multiple Files
**Steps:**
1. Start pi in fresh directory
2. Create `file1.ts`, `file2.ts`, `file3.ts` via agent write
3. Run `/review`
**Expected:** Panel shows all 3 files

### TC-03: Session Resume — Restores Modified Files
**Steps:**
1. Complete TC-02
2. Exit pi
3. Resume session (`pi -r` or `/resume`)
4. Run `/review`
**Expected:** Panel shows same 3 files with same counts

### TC-04: New Session After Resume — Isolated Changes
**Steps:**
1. Complete TC-03 (session has 3 files tracked)
2. `/new` to start fresh session
3. Create `file4.ts` via agent write
4. Run `/review`
**Expected:** Panel shows ONLY `file4.ts` (not the 3 from previous session)

### TC-05: Switch Back to Original Session
**Steps:**
1. Complete TC-04
2. `/resume` to original session
3. Run `/review`
**Expected:** Panel shows original 3 files (not `file4.ts`)

### TC-06: Bash Deletion — Not Tracked (Current Gap)
**Steps:**
1. Create `file1.ts` via write
2. Delete via `bash`: `rm file1.ts`
4. Run `/review`
**Expected:** Panel should show `file1.ts` as deleted — **currently fails**

### TC-07: Bash Rename — Not Tracked
**Steps:**
1. Create `file1.ts` via write
2. Rename via `bash`: `mv file1.ts file2.ts`
3. Run `/review`
**Expected:** Panel shows both old and new — **currently fails**

---

## Diff View

### TC-08: Open Diff for Modified File
**Steps:**
1. Edit `file1.ts` via edit
2. `/review`
3. Select `file1.ts`, press Enter
**Expected:** Diff view opens with correct before/after, scroll works, Esc closes

### TC-09: Open Diff for New File
**Steps:**
1. Create `file1.ts` via write
2. `/review`
3. Select `file1.ts`, press Enter
**Expected:** Diff view shows empty before, full after

### TC-10: Open Diff for Deleted File
**Steps:**
1. Create `file1.ts` via write
2. Delete via bash
3. `/review`
4. Select `file1.ts`, press Enter
**Expected:** Diff view shows full before, empty after

---

## Keyboard Navigation

### TC-11: Alt+R Toggles Panel Focus
**Steps:**
1. `/review` (panel visible, not focused)
2. Press `alt+r`
**Expected:** Hint changes to "↑/↓: navigate · Esc: back", selection highlighted

### TC-12: Alt+R Unfocuses Panel
**Steps:**
1. Complete TC-11 (panel focused)
2. Press `alt+r`
**Expected:** Hint changes to "alt+r: focus panel", selection unhighlighted

### TC-13: Up/Down Navigation
**Steps:**
1. Complete TC-11 (panel focused, multiple files)
2. Press `down`, `down`, `up`
**Expected:** Selection moves correctly, wraps at boundaries

### TC-14: Enter Opens Diff
**Steps:**
1. Complete TC-11 (panel focused)
2. Press `enter`
**Expected:** Diff view opens for selected file

### TC-15: Escape Closes Diff
**Steps:**
1. Complete TC-08 (diff view open)
2. Press `esc`
**Expected:** Diff view closes, panel focused

### TC-16: Escape Unfocuses Panel
**Steps:**
1. Complete TC-11 (panel focused)
2. Press `esc`
**Expected:** Panel unfocused, hint returns to "alt+r: focus panel"

---

## Widget Placement

### TC-17: Panel Opens Above Editor
**Steps:**
1. `/review`
**Expected:** Panel renders above editor (default placement)

### TC-18: Panel Renders Below Editor
**Steps:**
1. Modify panel to use `belowEditor` placement
2. `/review`
**Expected:** Panel renders below editor, above footer

---

## Persistence

### TC-19: Snapshot Saved on Session Start
**Steps:**
1. Start new session
2. Check session file for `session-snapshot` entry
**Expected:** Entry exists with `cwd`, `baseline`, `untrackedFilesAtStart`, `modifiedFiles: []`

### TC-20: Snapshot Updated on Tool Call
**Steps:**
1. Start session
2. Create file via write
3. Check session file for latest `session-snapshot` entry
**Expected:** New entry with `modifiedFiles: ["path/to/file"]`

### TC-21: Untracked Files at Start Captured
**Steps:**
1. Create `untracked.txt` before starting session
2. Start pi
3. Check snapshot for `untrackedFilesAtStart`
**Expected:** Entry includes `untracked.txt` with content

---

## Edge Cases

### TC-22: Empty Session
**Steps:**
1. Start pi, don't modify anything
2. `/review`
**Expected:** Shows "No files changed this session yet."

### TC-23: Large File List (> MAX_FILE_ROWS)
**Steps:**
1. Create 15 files via write
2. `/review`
**Expected:** Shows first 10, then "… 5 more" line

### TC-24: Path with Spaces/Special Chars
**Steps:**
1. Create file `my file.ts` via write
2. `/review`
**Expected:** Path renders correctly, diff opens correctly

### TC-25: Binary File
**Steps:**
1. Create `image.png` via write
2. `/review`
**Expected:** Shows in list, diff handles gracefully (shows binary or skips)

### TC-26: Very Long Lines in Diff
**Steps:**
1. Create file with 500-char line
2. Edit line
3. Open diff
**Expected:** Horizontal scroll or truncation works, no layout break

### TC-27: Rapid Tool Calls
**Steps:**
1. Agent makes 10 rapid write/edit calls
2. `/review`
**Expected:** All files shown, no duplicates, counts correct

---

## Regression

### TC-28: Typecheck Passes
**Steps:**
1. Run `bunx tsc --noEmit`
**Expected:** No errors

### TC-29: Multiple Sessions Parallel
**Steps:**
1. Open two terminals
2. Start pi in both with different cwd
3. Modify files in both
**Expected:** Each session tracks independently, no cross-contamination