# Sidebar

## Idea

Make the review panel a persistent sidebar on the right side of the terminal, similar to opencode's ReviewPanelV2. The panel would always be visible (or toggleable) and show session changes in real-time.

## Current State

- Review panel is a widget rendered via `setWidget("review", ...)`
- Widget placement options are limited to `"aboveEditor"` or `"belowEditor"` (no sidebar placement)
- Panel is toggled with `/review` command
- Diff view opens as a separate widget

## What pi Provides

```ts
type WidgetPlacement = "aboveEditor" | "belowEditor"

interface ExtensionWidgetOptions {
  placement?: WidgetPlacement
}

// Custom component (overlay/modal style)
ctx.ui.custom<T>(factory, options?: { overlay?: boolean, ... })
```

No built-in sidebar support. Widget system is top/bottom only.

## Possible Approaches

### 1. Right-side overlay via `ctx.ui.custom()`

Use `custom()` to create a persistent overlay on the right side.

**Pros:** True sidebar feel, persistent
**Cons:** `custom()` is designed for modals/dialogs, may not support persistent non-modal overlays

### 2. Footer-based panel

Use `ctx.ui.setFooter()` to render the review panel in the footer area.

**Pros:** Persistent, built-in support
**Cons:** Footer is below the editor, not right-side

### 3. Custom TUI layout

Build a component that uses pi's TUI primitives to create a two-column layout (editor left, sidebar right).

**Pros:** Full control over layout
**Cons:** Most complex, requires understanding pi's TUI internals

### 4. Keep current approach, enhance UX

Keep the widget-based approach but make it more sidebar-like:
- Auto-show panel when session has changes
- Use `setWidget("review", ...)` with inline file list
- Diff view opens in the same widget (replace file list with diff)

**Pros:** Simplest, works with current pi API
**Cons:** Not a true sidebar, requires toggling

## Recommendation

Start with **Option 4** (enhance current approach) for now. It works with the existing API and gives a good UX. Explore Options 1-3 when pi adds sidebar support or when we understand the TUI internals better.

## Features for Enhanced Panel

- Auto-show when `sessionTracker.hasChanges()` is true
- Show file list with change stats (already works)
- Inline diff view (replace file list with diff when file is selected)
- Keyboard navigation (already works)
- Real-time updates on tool execution (already works)

## Implementation Notes

- `setWidget` replaces the widget content — can swap between file list and diff view
- `setHeader` / `setFooter` could show a persistent summary line
- `custom()` could create a right-side panel if pi supports non-modal overlays
