import { highlightCode, getLanguageFromPath, type Theme } from "@earendil-works/pi-coding-agent"
import { truncateToWidth, visibleWidth, type Component, type TUI } from "@earendil-works/pi-tui"
import { computeDiff, type DiffColor } from "./diff"

const SEPARATOR = 4
const DIFF_VISIBLE_LINES = 20

interface DiffViewOptions {
  path: string
  before: string[]
  after: string[]
  hasNerdFontInstalled?: boolean
}

interface PaneLayout {
  height: number
  leftWidth: number
  rightWidth: number
  separatorWidth: number
}

function computeLayout(width: number, _terminalRows: number): PaneLayout {
  const height = DIFF_VISIBLE_LINES
  const leftWidth = Math.floor((width - SEPARATOR) / 2)
  return {
    height,
    leftWidth,
    rightWidth: width - SEPARATOR - leftWidth,
    separatorWidth: SEPARATOR
  }
}

// to make sure each line / pane cell fits the pane width
function fitToWidth(text: string, width: number): string {
  const truncated = truncateToWidth(text, width)
  const sanitized = truncated + " ".repeat(Math.max(0, width - visibleWidth(truncated)))
  return sanitized
}

// Slice a string starting from `offset` visible characters, preserving ANSI escape sequences
function sliceFromVisibleOffset(str: string, offset: number): string {
  let visibleCount = 0
  let inEscape = false
  let result = ""
  let pendingAnsi = ""

  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (ch === "\x1b") {
      inEscape = true
      pendingAnsi += ch
      continue
    }
    if (inEscape) {
      pendingAnsi += ch
      if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z")) {
        inEscape = false
      }
      continue
    }
    if (visibleCount >= offset) {
      if (visibleCount === offset) {
        result = pendingAnsi
      }
      result += ch
    }
    visibleCount++
  }
  return result
}

function renderPaneCell(
  lines: string[],
  colors: DiffColor[],
  index: number,
  paneWidth: number,
  theme: Theme,
  isLeftPane: boolean,
  scrollX: number = 0): string {
  const lineNumber = String(index + 1)
  const content = lines[index] ?? " "
  const color = colors[index]

  let gutterMarker = " "
  if (color === "added") gutterMarker = isLeftPane ? " " : "+"
  else if (color === "removed") gutterMarker = isLeftPane ? "-" : " "

  const lineNumVisible = visibleWidth(lineNumber)
  const markerVisible = 1
  const actualGutterWidth = lineNumVisible + 1 + markerVisible + 1

  let styledContent = content
  if (color === "added" || color === "removed") {
    const themeColor = color === "added" ? "toolSuccessBg" : "toolErrorBg"
    const sample = theme.bg(themeColor, " ")
    const bgPrefix = sample.substring(0, sample.indexOf(" "))
    const bgSuffix = sample.substring(sample.indexOf(" ") + 1)

    const visibleLen = visibleWidth(content)
    const padLen = Math.max(0, paneWidth - actualGutterWidth - visibleLen)
    const paddedContent = content + " ".repeat(padLen)

    styledContent = bgPrefix + paddedContent.replace(/\x1b\[0m/g, `\x1b[0m${bgPrefix}`) + bgSuffix
  }

  const gutter = theme.fg("dim", lineNumber) + " " +
    theme.fg(color === "added" ? "success" : color === "removed" ? "error" : "muted", gutterMarker) + " "

  const scrolledContent = sliceFromVisibleOffset(styledContent, scrollX)
  return fitToWidth(gutter + scrolledContent, paneWidth)
}

export class DiffView implements Component {
  private readonly theme: Theme
  private readonly tui: TUI
  private readonly path: string
  private leftPane: string[] = []
  private rightPane: string[] = []
  private leftColors: DiffColor[] = []
  private rightColors: DiffColor[] = []
  private scroll = 0
  private scrollX = 0
  private readonly hasNerdFont: boolean

  constructor(theme: Theme, tui: TUI, options: DiffViewOptions) {
    this.theme = theme
    this.tui = tui
    this.path = options.path
    this.hasNerdFont = options.hasNerdFontInstalled ?? false
    const lang = getLanguageFromPath(this.path)
    
    const beforeHighlighted = highlightCode(options.before.join("\n"), lang)
    const afterHighlighted = highlightCode(options.after.join("\n"), lang)
    const diff = computeDiff(options.before, options.after)

    for (const line of diff) {
      switch (line.type) {
        case "match":
          this.leftPane.push(beforeHighlighted[line.oldIdx] ?? "")
          this.leftColors.push("match")
          this.rightPane.push(afterHighlighted[line.newIdx] ?? "")
          this.rightColors.push("match")
          break
        case "added":
          this.leftPane.push(" ")
          this.leftColors.push("added")
          this.rightPane.push(afterHighlighted[line.idx] ?? "")
          this.rightColors.push("added")
          break
        case "removed":
          this.leftPane.push(beforeHighlighted[line.idx] ?? "")
          this.leftColors.push("removed")
          this.rightPane.push(" ")
          this.rightColors.push("removed")
      }
    }
  }

  invalidate(): void { }

  private renderHeader(layout: PaneLayout): string[] {
    const width = layout.leftWidth + layout.separatorWidth + layout.rightWidth
    const lines: string[] = []

    const pipe = this.hasNerdFont
      ? this.theme.fg("borderMuted", " │ ")
      : this.theme.fg("borderMuted", " | ")

    const title = this.theme.fg("accent", " Diff View")

    const addedCount = this.rightColors.filter(c => c === "added").length
    const removedCount = this.leftColors.filter(c => c === "removed").length

    const stats = this.theme.fg("accent", ` ${addedCount + removedCount} changes `) +
      (addedCount > 0 ? this.theme.fg("success", ` +${addedCount} `) : "") +
      (removedCount > 0 ? this.theme.fg("error", ` -${removedCount} `) : "")

    const hints = this.hasNerdFont
      ? this.theme.fg("muted", " ↑↓/j/k : v-scroll │ ←→/h/l : h-scroll │ Esc : close ")
      : this.theme.fg("muted", " ↑↓/j/k : v-scroll | ←→/h/l : h-scroll | Esc : close ")

    const header = [title, stats, hints].join(pipe)
    lines.push(truncateToWidth(header, width))
    lines.push(truncateToWidth(this.theme.fg("borderMuted", "─".repeat(width)), width))
    lines.push(truncateToWidth(this.theme.fg("dim", " " + this.path), width))
    return lines
  }

  private renderRow(i: number, layout: PaneLayout): string {
    const left = renderPaneCell(this.leftPane, this.leftColors, this.scroll + i, layout.leftWidth, this.theme, true, this.scrollX)
    const sep = this.theme.fg("borderMuted", " | ")
    const right = renderPaneCell(this.rightPane, this.rightColors, this.scroll + i, layout.rightWidth, this.theme, false, this.scrollX)
    return left + sep + right
  }

  private paneHeight(): number {
    return computeLayout(this.tui.terminal.columns, this.tui.terminal.rows).height - 3
  }

  scrollBy(delta: number): void {
    const n = this.leftPane.length
    const maxScroll = Math.max(0, n - this.paneHeight())
    this.scroll = Math.max(0, Math.min(maxScroll, this.scroll + delta))
    this.tui.requestRender()
  }

  scrollByPage(count: number): void {
    this.scrollBy(count * this.paneHeight())
  }

  scrollByX(delta: number): void {
    let maxContentWidth = 0
    for (const line of this.leftPane) {
      const w = visibleWidth(line)
      if (w > maxContentWidth) maxContentWidth = w
    }
    const paneContentWidth = computeLayout(this.tui.terminal.columns, this.tui.terminal.rows).leftWidth - 6
    const maxScrollX = Math.max(0, maxContentWidth - paneContentWidth)
    this.scrollX = Math.max(0, Math.min(maxScrollX, this.scrollX + delta))
    this.tui.requestRender()
  }

  render(width: number): string[] {
    const layout = computeLayout(width, this.tui.terminal.rows)
    const lines: string[] = []

    lines.push(...this.renderHeader(layout))

    for (let i = 0; i < layout.height - 3; i++) {
      lines.push(this.renderRow(i, layout))
    }
    lines.push(this.theme.bg("selectedBg", ""))

    return lines
  }
}


