# Publish Checklist for pi-review-panel

## Target: npm publish as `pi-review-panel`

### Step 1: Finalize package.json

Add missing fields before publish:

```json
{
  "name": "pi-review-panel",
  "version": "1.0.0",
  "description": "Session-aware review panel for the pi coding agent...",
  "type": "module",
  "keywords": ["pi-package", "pi-extension", "review", "diff", "tui", "code-review"],
  "license": "GPL-3.0-or-later",
  "author": "Pradhumna Pancholi",
  "repository": {
    "type": "git",
    "url": "https://github.com/pnpancholi/pi-review-panel.git"
  },
  "engines": { "node": ">=20" },
  "files": ["src", "README.md", "LICENSE", "CHANGELOG.md"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-tui": "*",
    "typebox": "*"
  },
  "devDependencies": {
    "@earendil-works/pi-coding-agent": "latest",
    "@earendil-works/pi-tui": "latest",
    "@types/bun": "latest",
    "@types/node": "^22",
    "typebox": "latest",
    "typescript": "^5.6"
  },
  "pi": {
    "extensions": ["./src/extensions"]
  }
}
```

**Changes:**
- Bump `version` to `1.0.0`
- Add `author`, `repository`, `engines`, `publishConfig`
- Expand `files` to include docs

---

### Step 2: Create README.md

```markdown
# pi-review-panel

Session-aware review panel for the [pi coding agent](https://github.com/earendil-works/pi-coding-agent).

Tracks every file modified during a session and presents an interactive, keyboard-navigable diff view so you can review changes before committing.

## Features

- **Session Tracking** — automatically detects file changes across tool calls
- **Directory Grouping** — files organized by directory with folder icons
- **Two-Pane Diff View** — side-by-side aligned diff with colored backgrounds
- **Keyboard Navigation** — arrow keys, Enter to open diff, Esc to close
- **Nerd Font Icons** — optional file type icons (auto-detects font support)

## Install

```bash
pi install pi-review-panel
```

## Usage

1. Start a session with pi
2. Press `Alt+R` to focus the review panel (auto-opens)
3. Navigate with `↑/↓` to select a file
4. Press `Enter` to open the diff view
5. Press `Esc` to close the diff

## Configuration

No configuration needed — auto-detects Nerd Font support.

If your terminal isn't detected, check [terminal font config](#terminal-setup) below.

### Terminal Setup

Ensure Nerd Font is installed and configured in your terminal:

| Terminal | Config File |
|----------|-------------|
| Ghostty | `~/.config/ghostty/config` |
| Alacritty | `~/.config/alacritty/alacritty.toml` |
| Kitty | `~/.config/kitty/kitty.conf` |
| WezTerm | `~/.config/wezterm/wezterm.lua` |
| iTerm2 | `~/Library/Application Support/iTerm2/DynamicProfiles/pi-fonts.json` |
| Windows Terminal | `%LOCALAPPDATA%/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json` |

## Development

```bash
git clone https://github.com/pnpancholi/pi-review-panel.git
cd pi-review-panel
bun install
bun run typecheck
bun test
```

## License

GPL-3.0-or-later
```

---

### Step 3: Create LICENSE file

Copy the full text of GPL-3.0-or-later from https://www.gnu.org/licenses/gpl-3.0.txt

---

### Step 4: Create CHANGELOG.md

```markdown
# Changelog

## 1.0.0

- Session-aware file tracking
- Directory grouping with Nerd Font icons
- Two-pane aligned diff view
- Keyboard navigation (↑/↓/Enter/Esc)
- Auto-open on session start
- Auto-detect Nerd Font support
- File-centric viewport (20 files visible, auto-scroll)
```

---

### Step 5: CI Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

jobs:
  check:
    runs-on: ubuntu-slim
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run typecheck
```

---

### Step 6: Pre-publish Verification

```bash
# Typecheck
bunx tsc --noEmit

# Dry-run pack to verify contents
bun pack --dry-run

# Verify:
# ✅ LICENSE included
# ✅ README.md included
# ✅ CHANGELOG.md included
# ✅ src/** included
# ✅ No dev files (node_modules, dist, etc.)
```

---

### Step 7: Publish

```bash
npm publish --access public
```

---

## Summary

| Step | File | Action |
|------|------|--------|
| 1 | `package.json` | Add author, repository, engines, publishConfig, bump to 1.0.0 |
| 2 | `README.md` | Create with install, usage, terminal config, dev instructions |
| 3 | `LICENSE` | Add GPL-3.0-or-later full text |
| 4 | `CHANGELOG.md` | Create v1.0.0 changelog |
| 5 | `.github/workflows/ci.yml` | CI typecheck on push/PR to main+dev |
| 6 | Verify | `bunx tsc --noEmit && bun pack --dry-run` |
| 7 | Publish | `npm publish --access public` |
