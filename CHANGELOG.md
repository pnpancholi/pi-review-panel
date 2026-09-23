# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-09-23

### Added

- Review panel — interactive, keyboard-navigable TUI listing every file changed
  during the current pi session, grouped by directory, with add/remove line
  counts and Nerd Font file-type icons.
- Side-by-side diff view — before/after two-pane comparison with add/remove
  gutters, line numbers, vertical/horizontal scrolling, and theme-aware syntax
  highlighting.
- Session-aware tracking — changes are tied to a session ID via before/after
  tool-call snapshots, so sessions can be resumed or run in parallel without
  cross-contamination.
- Git baseline integration — a `git stash create` baseline plus untracked-file
  capture at session start surfaces bash-driven and manual changes.
- `/review` command — toggles the panel; it also opens by default at session
  start. `Alt+r` toggles focus between editor and panel.
- Vim-style keybindings — `j`/`k`/`h`/`l`, arrow keys, `Page Up`/`Page Down`,
  `Enter`, and `Esc`.
- Nerd Font support — file-type icons with auto-detection, installer, and
  per-terminal configuration hints.
- Hand-rolled LCS diff engine — zero runtime dependencies.
- GitHub Actions CI — typecheck gate, npm publish and GitHub release on version
  tags.
- Documentation — README (install, usage, scenarios, caveats, roadmap),
  `DECISIONS.md` design rationale, and `git-edit-issue.md` root-cause analysis.
