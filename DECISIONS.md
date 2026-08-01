# Decisions

## Why This Exists

The dominant failure mode of agentic coding isn't capability — it's **trust**. An agent edits files in a blur, and by the time you go to commit you no longer know what changed, why it changed, or whether a stray edit slipped in. Every coding agent's own community agrees: the review step is where confidence is won or lost.

`pi-review-panel` exists to answer one question that nothing in pi answers today: **"What did the agent change during this session?"** — and to present that answer as an interactive, keyboard-navigable diff panel before you commit.

## Problems It Solves (vs. plain `git diff`)

A review tool that is "just `git diff`" fails in specific, demonstrable ways:

- **Not session-scoped.** `git diff` shows *everything* uncommitted in the working tree — including changes you made yourself, or that were sitting there before the agent ever ran. It cannot answer "what did the agent do this session?"
- **Stale changes mix in.** Edits from past turns and past sessions pile up. Reviewing "the agent's work" silently becomes reviewing a pile of unrelated pre-existing modifications.
- **No navigation, no structure.** `git diff` is a read-only firehose of text. There's no file list, no jumping between files, no live preview of one file while scanning another.
- **No commit-time flow.** Nothing reminds you to review after the agent finishes — the natural checkpoint is missed until something breaks.

The panel fixes all four: it tracks the session's `write`/`edit` calls (before/after content), records a git baseline at session start to catch `bash`-driven and manual changes, and surfaces everything in a two-pane navigable UI with a post-turn nudge.

## The Competitive Landscape (we are not inventing this problem)

Every major coding agent either ships this or has users demanding it:

| Agent | Status |
|---|---|
| **opencode** | Ships `ReviewPanelV2` — a right-side panel of session diffs, file list with add/del kinds, unified/split view, line comments. The closest analogue to what we're building. |
| **Cursor** | Ships diff review + accept/reject. Forum threads with **6K views / 386 likes** begging for per-turn, session-scoped review panels — its #1 complaint is stale/old-chat changes leaking into review. |
| **Claude Code** | Per-edit approval (y/n/d/e) + Desktop diff viewer. Open feature requests (#31888, #33932) explicitly ask for **batch diff review scoped to what the agent did**. A community tool (`diffpane`) exists purely to give it session-baseline diffs — direct evidence of unmet demand. |
| **Codex** | Ships `/diff` + `/review` + a review pane with stage/revert per file/hunk. |
| **GitHub Copilot** | Ships "Edits Review" — inline per-change accept/reject (cited as the gold standard). |

The specific refinement users everywhere are asking for — **session-scoping** ("show me only what the agent did this session, nothing else") — is exactly our differentiator. In pi's ecosystem, existing packages show diffs only inside allow/deny permission prompts; **none offers a pre-commit review panel**. This is the gap.

## Key Decisions

**1. A review panel, not a permission gate.** Permission packages already exist (`pi-permissions`, `pi-security-gates`, `pi-permission-system`); the whitespace is review-before-commit. A gate without a review panel protects nothing; a review panel with a later gate is a natural extension.

**2. TUI via `ctx.ui.custom()`, not a web UI.** pi has no sidebar layout and no browser surface. A full-screen two-pane panel (file list | diff) built on pi-tui primitives gives the opencode-style experience inside the terminal — no Vite, no bundler, no server.

**3. Session tracking = `tool_call`/`tool_result` snapshots + git baseline.** Before/after content is captured around every `write`/`edit`; a `git status` baseline at session start catches bash-driven and manual changes. One diff engine (hand-rolled LCS) renders everything uniformly.

**4. Zero runtime dependencies.** The diff is a hand-rolled LCS — no `diff` library. Low maintenance, trivially distributable, and the algorithm is the teaching core of the project.

**5. Bun as dev toolchain, no build step.** pi loads extension TS directly via jiti. Bun is dev-only (`bun test`, `bunx tsc --noEmit`); Vite is not applicable — there is nothing to bundle and nothing browser-rendered.

**6. Full npm package for distribution.** Not a single-file extension: versioned, `pi install`-able, gallery-discoverable (`pi-package` keyword), with tests + typecheck gate. Name: `pi-review-panel` (the preferred `pi-review` is taken on npm); publish under `@scope/pi-review-panel`.

**7. GPL-3.0-or-later.** A firm copyleft license. Anyone may use or sell it, but any distributed fork must remain open and source-available. Deliberately chosen over permissive (MIT) and over source-available-with-commercial-restriction licenses — see the full rationale in the README.

## Status

Active development. Scaffold complete; modules built in order: `diff.ts` → `git.ts` → `session.ts` → `panel.ts` → `extensions/index.ts`.
