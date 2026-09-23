<div align="center">
<img src="./assets/header.png" alt="pi-review-panel">

[![X/Twitter](https://img.shields.io/badge/X-@knowpradhumna-4B0082.svg)](https://x.com/knowpradhumna)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Last Commit](https://img.shields.io/github/last-commit/pnpancholi/pi-review-panel)](https://github.com/pnpancholi/pi-review-panel/commits/main)
</div>

A session-aware review panel for the [pi coding agent](https://pi.dev). See exactly which files the agent changed during your session and navigate the diffs — before you commit.

## Installation

```bash
pi install npm:pi-review-panel
```

## Features

- **Review panel** — see every file changed during the current session in one place
- **Session-aware tracking** — changes are tied to your session ID, so you can resume or start fresh without conflicts
- **`/review` command** — toggle the panel open or closed from anywhere in your session
- **Side-by-side diff view** — clean before/after comparison with add/remove markers and line numbers
- **Theme-aware syntax highlighting** — code highlights match your terminal theme
- **Nerd Font support** — file-type icons for a better visual experience, with a built-in installer if you don't have one
- **Vim keybindings** — navigate with `j`/`k`, `h`/`l`, and other familiar vim motions, in addition to arrow keys

