import { highlightCode, getLanguageFromPath, type Theme } from "@earendil-works/pi-coding-agent"
import { truncateToWidth, visibleWidth, type Component, type TUI } from "@earendil-works/pi-tui"

const GUTTER = 4
const SEPARATOR = 4

interface DiffViewOptions {
  path: string
  before: string[]
  after: string[]
}

interface PaneLayout {
  height: number
  leftWidth: number
  rightWidth: number
  separatorWidth: number
  gutterWidth: number
}

function computeLayout(width: number, terminalRows: number): PaneLayout {
  const height = Math.floor(terminalRows / 2)
  const leftWidth = Math.floor((width - SEPARATOR) / 2)
  return {
    height,
    leftWidth,
    rightWidth: width - SEPARATOR - leftWidth,
    separatorWidth: SEPARATOR,
    gutterWidth: GUTTER
  }
}

// to make sure each line / pane cell fits the pane width
function fitToWidth(text: string, width: number): string {
  const truncated = truncateToWidth(text, width)
  const sanitized = truncated + " ".repeat(Math.max(0, width - visibleWidth(truncated)))
  return sanitized
}

function renderPaneCell(lines: string[], index: number, paneWidth: number, gutterWidth: number, theme: Theme): string {
  const lineNumber = String(index + 1).padStart(gutterWidth, " ")
  const content = lines[index] ?? " "
  return fitToWidth(theme.fg("dim", lineNumber) + " " + content, paneWidth)
}

export class DiffView implements Component {
  private readonly theme: Theme
  private readonly tui: TUI
  private readonly path: string
  private before: string[]
  private after: string[]
  private scroll = 0

  constructor(theme: Theme, tui: TUI, options: DiffViewOptions) {
    this.theme = theme
    this.tui = tui
    this.path = options.path
    const lang = getLanguageFromPath(this.path)
    this.before = highlightCode(options.before.join("\n"), lang)
    this.after = highlightCode(options.after.join("\n"), lang)
  }

  invalidate(): void { }

  private renderHeader(layout: PaneLayout): string[] {
    const width = layout.leftWidth + layout.separatorWidth + layout.rightWidth
    const header = fitToWidth(
      this.theme.fg("accent", this.theme.bold(" Diff View ")) +
      " " +
      this.theme.fg("dim", "-") +
      " " +
      this.theme.fg("dim", "j/k: scroll · PgUp/PgDn: page · Esc: close"),
      width
    )
    return [
      this.theme.bg("selectedBg", header),
      this.theme.bg("selectedBg", ""),
      fitToWidth(this.theme.fg("dim", " " + this.path), width)
    ]
  }

  private renderRow(i: number, layout: PaneLayout): string {
    const left = renderPaneCell(this.before, this.scroll + i, layout.leftWidth, layout.gutterWidth, this.theme)
    const sep = this.theme.fg("borderMuted", " ".repeat(layout.separatorWidth))
    const right = renderPaneCell(this.after, this.scroll + i, layout.rightWidth, layout.gutterWidth, this.theme)
    return left + sep + right
  }

  private paneHeight(): number {
    return computeLayout(this.tui.terminal.columns, this.tui.terminal.rows).height - 3
  }

  scrollBy(delta: number): void {
    const n = Math.max(this.before.length, this.after.length)
    const maxScroll = Math.max(0, n - this.paneHeight())
    this.scroll = Math.max(0, Math.min(maxScroll, this.scroll + delta))
    this.tui.requestRender()
  }

  scrollByPage(count: number): void {
    this.scrollBy(count * this.paneHeight())
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


