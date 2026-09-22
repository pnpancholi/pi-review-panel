import { truncateToWidth, type Component, type TUI } from "@earendil-works/pi-tui"
import type { Theme } from "@earendil-works/pi-coding-agent"

const MAX_FILE_ROWS = 8

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
  private selectedFilePath: string | null = null
  private active = false

  // Viewport state - file-centric
  private firstVisibleFileIdx = 0
  private fileRenderIndices: (number | undefined)[] = []
  private renderEntries: RenderEntry[] = []

  constructor(
    private readonly theme: Theme,
    private readonly tui: TUI,
    private readonly hasNerdFontInstalled: boolean,
  ) { }

  invalidate(): void { }

  setSelectedFilePath(path: string): void {
    this.selectedFilePath = path
    const idx = this.files.findIndex(f => f.path === path)
    if (idx >= 0) {
      this.selected = idx
    }
  }

  getSelectedFile(): ReviewFile | null {
    return this.selectedFilePath
      ? this.files.find(f => f.path === this.selectedFilePath) ?? null
      : this.files[this.selected] ?? null
  }

  setFiles(files: ReviewFile[]): void {
    this.files = files

    // Restore selection by file path
    if (this.selectedFilePath) {
      const idx = files.findIndex(f => f.path === this.selectedFilePath)
      if (idx >= 0) {
        this.selected = idx
      } else {
        this.selected = 0
        this.selectedFilePath = null
      }
    } else {
      this.selected = Math.min(this.selected, Math.max(0, files.length - 1))
    }

    this.renderEntries = []
    const groups = groupFilesByDirectory(files)

    let flatFileIdx = 0
    for (const group of groups) {
      this.renderEntries.push({ type: "dir", directory: group.directory })
      for (const file of group.files) {
        this.renderEntries.push({
          type: "file",
          file,
          fileIdx: flatFileIdx++,
        })
      }
    }

    // Build fileIdx -> renderEntries index mapping
    this.fileRenderIndices = new Array(files.length)
    for (let i = 0; i < this.renderEntries.length; i++) {
      const entry = this.renderEntries[i]
      if (entry.type === "file") {
        this.fileRenderIndices[entry.fileIdx] = i
      }
    }

    this.firstVisibleFileIdx = 0
    this.tui.requestRender()
  }

  moveSelection(delta: number): void {
    if (this.files.length === 0) return
    const newSelected = Math.max(0, Math.min(this.files.length - 1, this.selected + delta))
    if (newSelected === this.selected) return
    this.selected = newSelected
    this.selectedFilePath = this.files[newSelected]?.path ?? null
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

    const totalAdded = this.files.reduce((sum, f) => sum + f.added, 0)
    const totalRemoved = this.files.reduce((sum, f) => sum + f.removed, 0)

    const pipe = this.hasNerdFontInstalled
      ? theme.fg("borderMuted", " │ ")
      : theme.fg("borderMuted", " | ")

    const activeDot = this.active
      ? theme.fg("accent", " ● ")
      : theme.fg("muted", " ○ ")

    const title = theme.fg("accent", " Review Panel") + activeDot

    let stats: string
    let hints: string

    if (this.files.length === 0) {
      stats = theme.fg("muted", " No changes yet")
      hints = theme.fg("muted", " alt+r: focus ")
    } else {
      stats = theme.fg("accent", ` ${this.files.length} files `) +
        theme.fg("success", ` +${totalAdded} `) +
        theme.fg("error", ` −${totalRemoved} `)

      hints = this.active
        ? theme.fg("muted", " ↑/↓ j/k: navigate  |  Esc: back ")
        : theme.fg("muted", " alt+r: focus ")
    }

    const header = [title, stats, hints].join(pipe)
    lines.push(truncateToWidth(header, width))
    lines.push(truncateToWidth(theme.fg("borderMuted", "─".repeat(width)), width))

    if (this.files.length === 0) {
      return lines
    }

    // File-centric viewport: exactly MAX_FILE_ROWS files with their dir headers
    const lastVisibleFileIdx = Math.min(
      this.files.length - 1,
      this.firstVisibleFileIdx + MAX_FILE_ROWS - 1
    )

    // Handle edge case where firstVisibleFileIdx is beyond file count
    if (this.firstVisibleFileIdx >= this.files.length) {
      this.firstVisibleFileIdx = Math.max(0, this.files.length - MAX_FILE_ROWS)
    }

    const [startRenderIdx, endRenderIdx] = this.getRenderSliceForFiles(
      this.firstVisibleFileIdx,
      lastVisibleFileIdx
    )
    const visible = this.renderEntries.slice(startRenderIdx, endRenderIdx)

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
        icon = icon ? icon + " " : ""
        const filename = entry.file.path.split("/").pop() || ""
        const path = theme.fg(
          highlighted ? "accent" : "muted",
          " " + marker + " " + icon + filename
        )
        const stats = theme.fg("success", `+${entry.file.added}`) + " " + theme.fg("error", `−${entry.file.removed}`)
        lines.push(truncateToWidth(path + " " + stats, width))
      }
    }

    // Bottom scroll indicator: hidden files below last visible file
    const hiddenFilesBelow = this.files.length - lastVisibleFileIdx - 1
    if (hiddenFilesBelow > 0) {
      lines.push(truncateToWidth(
        theme.fg("dim", `  ... ${hiddenFilesBelow} more file${hiddenFilesBelow === 1 ? "" : "s"}`),
        width
      ))
    }

    return lines
  }

  private getRenderSliceForFiles(firstFileIdx: number, lastFileIdx: number): [number, number] {
    // Validate inputs
    if (firstFileIdx > lastFileIdx || firstFileIdx >= this.files.length || lastFileIdx < 0) {
      return [0, 0]
    }

    // Clamp to valid range
    const clampedFirst = Math.max(0, Math.min(firstFileIdx, this.files.length - 1))
    const clampedLast = Math.max(0, Math.min(lastFileIdx, this.files.length - 1))

    const firstRenderIdx = this.fileRenderIndices[clampedFirst]
    const lastRenderIdx = this.fileRenderIndices[clampedLast]

    // Mapping should always exist now, but defensive check
    if (firstRenderIdx === undefined || lastRenderIdx === undefined) {
      console.warn('[getRenderSliceForFiles] Missing render index mapping')
      return [0, 0]
    }

    // Include preceding dir header for first file
    const start = (firstRenderIdx > 0 && this.renderEntries[firstRenderIdx - 1].type === "dir")
      ? firstRenderIdx - 1
      : firstRenderIdx

    const end = lastRenderIdx + 1

    return [start, end]
  }

  private scrollToSelection(): void {
    if (this.files.length === 0) return

    // Keep selected in [firstVisibleFileIdx, firstVisibleFileIdx + MAX_FILE_ROWS - 1]
    if (this.selected < this.firstVisibleFileIdx) {
      this.firstVisibleFileIdx = this.selected
    } else if (this.selected > this.firstVisibleFileIdx + MAX_FILE_ROWS - 1) {
      this.firstVisibleFileIdx = this.selected - MAX_FILE_ROWS + 1
    }

    // Clamp to valid range
    const maxFirstVisible = Math.max(0, this.files.length - MAX_FILE_ROWS)
    this.firstVisibleFileIdx = Math.min(this.firstVisibleFileIdx, maxFirstVisible)
  }
}
