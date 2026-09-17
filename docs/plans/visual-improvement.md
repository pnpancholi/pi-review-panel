# Visual Improvements Plan

## Overview
Aesthetic enhancements for the review panel and diff view to improve usability, visual hierarchy, and overall polish.

---

## ReviewPanel Improvements

### 1. File Type Icons
**Description:** Add emoji/icons before filenames based on extension (📄 `.ts`/`.js`, 📝 `.md`, ⚙️ `.json`/`.config`, 🖼️ `.png`/`.svg`, 📁 directories).

**Reason:** Instant visual categorization without reading extensions. Reduces cognitive load when scanning file lists.

**Implementation:** Add `getFileIcon(path: string): string` helper, prepend to path in render.

---

### 2. Status-Colored Markers
**Description:** Replace generic `▸` marker with status-specific colored markers:
- `+` (green) — newly created files
- `~` (yellow) — modified files
- `−` (red) — deleted files
- `▸` (accent) — selected file indicator

**Reason:** Communicates file state at a glance. User doesn't need to parse `+N −M` stats to understand what happened.

**Implementation:** `ReviewFile` needs `status: "added" | "modified" | "deleted"` field. Update marker logic in render.

---

### 3. Box-Drawing Borders
**Description:** Replace plain `─` separators with Unicode box-drawing characters:
```
╭─ Review ──────────────╮
│ ▸ src/main.ts    +12 −3│
│   src/utils.ts   +5  −1│
╰────────────────────────╯
```

**Reason:** Defines panel boundaries clearly. Looks more polished and intentional than a single separator line.

**Implementation:** Use `box-drawing` chars (`╭`, `╮`, `╰`, `╯`, `│`, `─`) for top/bottom/side borders.

---

### 4. Directory Grouping
**Description:** Group files by parent directory with collapsible sections:
```
src/
  ▸ main.ts      +12 −3
  ▸ utils.ts     +5  −1
test/
  ▸ main.test.ts +8  −0
```

**Reason:** Large changesets become navigable. Mental grouping by module/folder matches how developers think about codebases.

**Implementation:** Build a tree from file paths, render grouped with indentation. Add collapse/expand on directory click (optional).

---

### 5. Mini Bar Chart
**Description:** Visual ratio of additions vs deletions per file or globally:
```
main.ts     ████████░░ +12 −3
utils.ts    ███░░░░░░░ +5  −1
```
Or global summary: `Added ████████████  Deleted ████░░░░`

**Reason:** Quantitative comparison without reading numbers. Brain processes bar length faster than digit comparison.

**Implementation:** Calculate ratio `added / (added + removed)`, render with `█` and `░` blocks.

---

### 6. Better Empty State
**Description:** Replace dim "No files changed" with an illustrated empty state:
```
  ┌─────────────────────┐
  │  ✨  No changes yet │
  │  Start coding!      │
  └─────────────────────┘
```

**Reason:** Friendly, encourages action. Current dim text feels like an error state.

**Implementation:** Conditional render when `files.length === 0` with box drawing and emoji.

---

### 7. Smart Path Display
**Description:** Adapt path display based on context:
- All files in same dir → show only filename
- Multiple dirs → show relative path with directory highlighting
- Long paths → truncate middle with `…` (e.g., `src/very/…/deep/file.ts`)

**Reason:** Reduces visual noise when redundant. Shows full context when useful.

**Implementation:** Compute common prefix, truncate with `…` for paths > N chars.

---

## DiffView Improvements

### 8. Scroll Indicators
**Description:** Show `▲`/`▼` arrows in header when content scrolls beyond viewport:
```
 Diff View ─── ▲ ─────────── j/k: scroll · PgUp/PgDn: page · Esc: close
```
Or side indicators: `│▲` left margin when scrolled down.

**Reason:** Users need to know there's more content. Current header doesn't indicate scroll position.

**Implementation:** Track `scroll > 0` and `scroll + paneHeight < totalLines`, render indicators in header.

---

### 9. Wider Separator
**Description:** Replace empty-space separator with visible vertical line:
```
 │
```
Or double line `║` for emphasis.

**Reason:** Clear visual separation between "before" and "after" panes. Current 4-space gap is subtle.

**Implementation:** Change `separatorWidth` and render `theme.fg("borderMuted", "│")` instead of spaces.

---

### 10. Line Count & Change Summary in Header
**Description:** Header shows context:
```
 Diff View · 42 lines · 12 changes · src/main.ts
```

**Reason:** Immediate context without counting. Helps assess diff size before scrolling.

**Implementation:** Compute totals during construction, render in header.

---

### 11. Hunk Headers
**Description:** Show git-style hunk context lines:
```
@@ -10,5 +10,8 @@ function processData()
```

**Reason:** Standard diff convention. Helps locate changes in original file structure.

**Implementation:** Parse diff output for `@@` lines, render as dim separators between hunks.

---

### 15. GitHub-Style Empty Line Backgrounds
**Description:** Render empty (placeholder) lines in diff panes with GitHub-like backgrounds:
- **Removed pane:** Empty lines → light red/white striped or solid background (`toolErrorBg` with low opacity)
- **Added pane:** Empty lines → light green/white background (`toolSuccessBg` with low opacity)
- **Context lines:** Empty lines → neutral/transparent

This matches GitHub's diff view where placeholder lines in the "before" column show a subtle red tint and "after" column shows green, making the shape of changes immediately visible.

**Reason:** Current diff shows empty placeholder lines as blank space. GitHub-style coloring makes the diff structure (added/removed blocks) instantly recognizable without reading line numbers.

**Implementation:** In `renderPaneCell`, when `content === " "` (placeholder), apply `theme.bg("toolErrorBg", ...)` for left pane and `theme.bg("toolSuccessBg", ...)` for right pane instead of transparent. Use existing theme colors for consistency.

---

## Cross-Cutting

### 12. Session/Branch Context in Header
**Description:** Persistent header line showing:
```
 Review · session: "feature/auth" · branch: main · 3 files · 27 lines
```

**Reason:** Orients user in multi-session workflow. Identifies which session's changes they're viewing.

**Implementation:** Pass session name/branch to panel, render in title line.

---

### 13. Consistent Color Scheme
**Description:** Use theme colors consistently:
- `accent` — primary actions, headers, selection
- `success` — additions, positive states
- `error` — deletions, negative states
- `warning` — modifications, warnings
- `muted` — hints, secondary info
- `dim` — less important metadata

**Reason:** Coherent visual language. Reduces arbitrary color choices.

**Implementation:** Audit all `theme.fg/bg` calls, standardize on semantic color names.

---

### 14. Smooth Focus Transitions
**Description:** When panel gains/loses focus, animate hint text change with subtle highlight flash instead of instant swap.

**Reason:** Polished feel. Draws attention to state change.

**Implementation:** Track previous `active` state, render transition frame(s) in `setActive()`.

---

## Priority Order

| Priority | Items | Effort |
|----------|-------|--------|
| **High** | 1, 2, 3, 6, 8, 9, 15 | Low — localized render changes |
| **Medium** | 4, 5, 7, 10, 11 | Medium — require data restructuring |
| **Low** | 12, 13, 14 | Medium — cross-cutting consistency |

---

## Implementation Notes

- All changes are render-only — no logic changes needed
- Use existing `theme` object for colors (no hardcoded hex)
- Maintain `truncateToWidth` for terminal safety
- Test at various terminal widths (80, 120, 200+)
- Preserve keyboard navigation behavior exactly