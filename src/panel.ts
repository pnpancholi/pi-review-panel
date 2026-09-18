import { truncateToWidth, type Component, type TUI } from "@earendil-works/pi-tui"
import type { Theme } from "@earendil-works/pi-coding-agent"

const MAX_FILE_ROWS = 20

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

interface FileGroup {
  directory: string
  files: ReviewFile[]
}

type RenderEntry =
  | { type: "dir"; directory: string }
  | { type: "file"; file: ReviewFile; fileIdx: number }

function groupFilesByDirectory(files: ReviewFile[]): FileGroup[] {
  const groups = new Map<string, ReviewFile[]>()

  for (const file of files) {
    const parts = file.path.split("/")
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "."
    if (!groups.has(dir)) {
      groups.set(dir, [])
    }
    groups.get(dir)!.push(file)
  }

  return Array.from(groups.entries()).map(([directory, files]) => {
    return { directory, files }
  })
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

  // Viewport state 
  private scrollOffset = 0
  private renderEntries: RenderEntry[] = []

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

    this.renderEntries = []
    const groups = groupFilesByDirectory(files)

    for (const group of groups) {
      this.renderEntries.push({ type: "dir", directory: group.directory })
      for (const file of group.files) {
        this.renderEntries.push({
          type: "file",
          file,
          fileIdx: this.files.indexOf(file),
        })
      }
    }
    this.scrollOffset = 0
    this.tui.requestRender()
  }

  moveSelection(delta: number): void {
    if (this.files.length === 0) return
    this.selected = Math.max(0, Math.min(this.files.length - 1, this.selected + delta))
    this.scrollToSelection()
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

    //Viewport
    const visible = this.renderEntries.slice(
      this.scrollOffset,
      this.scrollOffset + MAX_FILE_ROWS
    )

    const showUpArrow = this.scrollOffset > 0
    const showDownArrow = this.scrollOffset + MAX_FILE_ROWS < this.renderEntries.length

    // Up arrow indicator
    if (showUpArrow) {
      lines.push(truncateToWidth(theme.fg("dim", "  ▲"), width))
    }

    for (const entry of visible) {
      if (entry.type === "dir") {
        const dirIcon = this.hasNerdFontInstalled
          ? theme.fg("accent", "\u{e5ff}") + " "
          : " "
        lines.push(truncateToWidth(
          theme.fg("dim", "  " + dirIcon + entry.directory + "/"),
          width
        ))
      } else {
        const highlighted = this.active && entry.fileIdx === this.selected
        const marker = entry.fileIdx === this.selected ? "▸" : " "
        let icon = this.hasNerdFontInstalled ? getFileIcon(entry.file.path) : ""
        icon = icon ? theme.fg("accent", icon) + " " : ""
        const filename = entry.file.path.split("/").pop() || ""
        const path = theme.fg(
          highlighted ? "accent" : "muted",
          " " + marker + " " + icon + filename
        )
        const stats = theme.fg("success", `+${entry.file.added}`) + " " + theme.fg("error", `−${entry.file.removed}`)
        lines.push(truncateToWidth(path + " " + stats, width))
      }
    }


    // Bottom scroll indicator
    if (showDownArrow) {
      lines.push(truncateToWidth(theme.fg("dim", "  ▼"), width))
    }
    //-------------------//
    return lines
  }

  private scrollToSelection(): void {
    // Find the renderEntries index for the currently selected file
    const selectedRenderIndex = this.renderEntries.findIndex(
      e => e.type === "file" && e.fileIdx === this.selected
    )
    if (selectedRenderIndex === -1) return

    // Scroll down if selection is below viewport
    if (selectedRenderIndex >= this.scrollOffset + MAX_FILE_ROWS) {
      this.scrollOffset = selectedRenderIndex - MAX_FILE_ROWS + 1
    }
    // Scroll up if selection is above viewport
    else if (selectedRenderIndex < this.scrollOffset) {
      this.scrollOffset = selectedRenderIndex
    }
  }

  pageBy(delta: number): void {
    if (this.files.length === 0) return
    this.selected = Math.max(0, Math.min(this.files.length - 1, this.selected + delta))
    this.scrollToSelection()
    this.tui.requestRender()
  }
}
