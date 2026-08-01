# pi-review-panel

Session-aware review panel for the [pi coding agent](https://pi.dev). See exactly which files the agent changed during your session and navigate the diffs — before you commit.

## What it solves

Coding agents change files. Reviewing *what changed this session* is harder than it sounds: a plain `git diff` mixes in your pre-existing uncommitted work, and stale edits pile up across turns. `pi-review-panel` tracks the changes pi made during the current session and presents them in an interactive, keyboard-navigable panel — the same "changes review" experience that Cursor, Codex, and opencode ship, inside pi.

## Features

- **Session-aware tracking** — records before/after content for every `write` and `edit` tool call
- **Interactive two-pane panel** — file list on the left, diff on the right
- **Keyboard navigation** — Tab to switch panes, arrow keys to move through files, the diff updates as you navigate
- **Readable diffs** — added lines in green, removed lines in red, with line numbers
- **Git-baseline catch-all** — also picks up file changes made via `bash` or manually since the session started
- **Commit-time nudge** — notifies you when the agent has modified files so you can review before committing

## Requirements

- [pi](https://pi.dev) coding agent CLI (0.83+)
- [Bun](https://bun.sh) — only needed for local development (tests, typechecking)

## Installation

```bash
# Published package
pi install npm:@scope/pi-review-panel

# From a local checkout
pi install ./pi-review-panel

# Quick test without installing
pi -e .  # from inside the package directory
```

## Usage

Run `/review` inside a pi session to open the panel.

| Key | Action |
| --- | --- |
| `Tab` | Switch between the file list and the diff pane |
| `↑` / `↓` (or `j` / `k`) | Move through the file list; the diff pane updates live |
| `Enter` | Refresh / reload the selected file's diff |
| `PgUp` / `PgDn` | Scroll long diffs |
| `Esc` / `q` | Close the panel |

## Development

```bash
bun install
bun test          # run tests
bunx tsc --noEmit # strong-TS typecheck gate
```

```
src/
├── extensions/index.ts   # pi entry: session hooks + /review command
├── diff.ts               # hand-rolled LCS line diff
├── git.ts                # git status / diff / HEAD content
├── session.ts            # session change log
└── panel.ts              # two-pane TUI component
```

## Security

pi packages run with full system access. Review the source before installing.

## License

[GPL-3.0-or-later](./LICENSE)
