import { truncateToWidth, type Component, type TUI } from "@earendil-works/pi-tui"
import type { Theme } from "@earendil-works/pi-coding-agent"


const MAX_FILE_ROWS = 10

const FILE_ICONS: Record<string, string> = {
  ts: '\u{e8ca}', tsx: '\u{e8ca}',
  js: '\u{e74e}', jsx: '\u{e74e}',
  py: '\u{e73c}',
  go: '\u{e627}',
  rs: '\u{e7a8}',
  java: '\u{e738}',
  c: '\u{e61e}', h: '\u{e61e}',
  cpp: '\u{e61d}', hpp: '\u{e61d}',
  rb: '\u{e739}',
  php: '\u{e73d}',
  swift: '\u{e755}',
  kt: '\u{e634}',
  md: '\u{e73e}',
  json: '\u{e60b}',
  yml: '\u{e6a8}', yaml: '\u{e6a8}',
  html: '\u{e736}',
  css: '\u{e749}',
  sh: '\u{e795}', bash: '\u{e795}',
  lua: '\u{e620}',
  vim: '\u{e62b}',
  sql: '\u{e7c4}',
  xml: '\u{e710}',
  txt: '\u{f15c}',
  Dockerfile: '\u{e70b}',
  '.gitignore': '\u{f15c}',
  '.gitconfig': '\u{f15c}',
  '.gitmodules': '\u{f15c}',
  '.env': '\u{f15c}',
  '.editorconfig': '\u{f15c}',
  Makefile: '\u{f15c}',
  'CMakeLists.txt': '\u{f15c}',
}
export interface ReviewFile {
  path: string
  added: number
  removed: number
}

function getFileIcon(path: string): string {
  const filename = path.split("/").pop() || ""

  //edge case handle docker
  const lowercaseFileName = filename.toLowerCase()
  if (lowercaseFileName === "dockerfile") return FILE_ICONS["Dockerfile"]

  if (FILE_ICONS[filename]) return FILE_ICONS[filename]

  const ext = filename.split(".").pop()?.toLowerCase() || ""
  return FILE_ICONS[ext] || ""
}


export class ReviewPanel implements Component {
  private files: ReviewFile[] = []
  private selected = 0
  private active = false

  constructor(
    private readonly theme: Theme,
    private readonly tui: TUI,
    private readonly hasNerdFontInstalled: boolean,
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
      theme.fg("accent", " Review Panel") +
      theme.fg("dim", ` - ${this.files.length} ${fileWord}, ${total} ${lineWord} `)
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
      let icon = this.hasNerdFontInstalled ? getFileIcon(file.path) : ""
      icon = icon ? theme.fg("accent", icon) + "  " : ""
      const path = theme.fg(highlighted ? "accent" : i === this.selected ? "text" : "muted", marker + " " + icon + file.path)
      const stats = theme.fg("success", `+${file.added}`) + " " + theme.fg("error", `−${file.removed}`)
      lines.push(truncateToWidth(path + "  " + stats, width))
    }
    if (this.files.length > MAX_FILE_ROWS) {
      lines.push(truncateToWidth(theme.fg("dim", `  … ${this.files.length - MAX_FILE_ROWS} more`), width))
    }
    return lines
  }
}
