import { truncateToWidth, type Component, type TUI } from "@earendil-works/pi-tui"
import type { Theme } from "@earendil-works/pi-coding-agent"

export interface ReviewFile {
  path: string
  added: number
  removed: number
}

const MAX_FILE_ROWS = 10

export class ReviewPanel implements Component {
  private files: ReviewFile[] = []
  private selected = 0
  private active = false

  constructor(
    private readonly theme: Theme,
    private readonly tui: TUI,
  ) { }

  invalidate(): void { }

  getSelectedFile(): ReviewFile | null {
    return this.files[this.selected]
  }
  setFiles(files: ReviewFile[]): void {
    this.files = files
    this.selected = Math.min(this.selected, Math.max(0, files.length - 1))
    this.tui.requestRender()
  }

  moveSelection(delta: number): void {
    if (this.files.length === 0) return
    this.selected = Math.max(0, Math.min(this.files.length - 1, this.selected + delta))
    this.tui.requestRender()
  }

  setActive(active: boolean): void {
    this.active = active
    this.tui.requestRender()
  }

  render(width: number): string[] {
    const theme = this.theme
    const lines: string[] = []

    const total = this.files.reduce((sum, f) => sum + f.added + f.removed, 0)
    const fileWord = this.files.length === 1 ? "file modified" : "files modified"
    const lineWord = total === 1 ? "line changed" : "lines changed"
    const hint = this.active ? "↑/↓: navigate · Esc: back" : "alt+r: focus panel"
    const title =
      theme.fg("accent", " Review ") +
      theme.fg("dim", `· ${this.files.length} ${fileWord}, ${total} ${lineWord} `)
    lines.push(truncateToWidth(title + "  " + theme.fg("muted", hint), width))
    lines.push(truncateToWidth(theme.fg("borderMuted", "─".repeat(width)), width))

    if (this.files.length === 0) {
      lines.push(truncateToWidth(theme.fg("dim", "  No files changed this session yet."), width))
      return lines
    }

    for (let i = 0; i < Math.min(this.files.length, MAX_FILE_ROWS); i++) {
      const file = this.files[i]
      if (!file) continue
      const highlighted = this.active && i === this.selected
      const marker = i === this.selected ? "▸" : " "
      const path = theme.fg(highlighted ? "accent" : i === this.selected ? "text" : "muted", marker + " " + file.path)
      const stats = theme.fg("success", `+${file.added}`) + " " + theme.fg("error", `−${file.removed}`)
      lines.push(truncateToWidth(path + "  " + stats, width))
    }
    if (this.files.length > MAX_FILE_ROWS) {
      lines.push(truncateToWidth(theme.fg("dim", `  … ${this.files.length - MAX_FILE_ROWS} more`), width))
    }
    return lines
  }
}
