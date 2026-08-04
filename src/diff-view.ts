import type { Theme } from "@earendil-works/pi-coding-agent"
import { matchesKey, truncateToWidth, visibleWidth, type Component, type TUI } from "@earendil-works/pi-tui"

const GUTTER = 4
const SEPARATOR = 4

interface DiffViewOptions {
  path: string
  before: string[]
  after: string[]
  done: () => void
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
  return fitToWidth(theme.fg("dim", lineNumber) + " " + theme.fg("muted", content), paneWidth)
}

export class DiffView implements Component {
  private readonly theme: Theme
  private readonly tui: TUI
  private readonly done: () => void
  private readonly path: string
  private before: string[]
  private after: string[]
  private scroll = 0

  constructor(theme: Theme, tui: TUI, options: DiffViewOptions) {
    this.theme = theme
    this.tui = tui
    this.done = options.done
    this.path = options.path
    this.before = options.before
    this.after = options.after
  }

  invalidate(): void { }

  private renderHeader(layout: PaneLayout): string {
    const left = fitToWidth(this.theme.fg("dim", this.path), layout.leftWidth)
    const sep = this.theme.fg("borderMuted", " ".repeat(layout.separatorWidth))
    const right = fitToWidth(this.theme.fg("dim", this.path), layout.rightWidth)
    return left + sep + right
  }

  private renderRow(i: number, layout: PaneLayout): string {
    const left = renderPaneCell(this.before, this.scroll + i, layout.leftWidth, layout.gutterWidth, this.theme)
    const sep = this.theme.fg("borderMuted", " ".repeat(layout.separatorWidth))
    const right = renderPaneCell(this.after, this.scroll + i, layout.rightWidth, layout.gutterWidth, this.theme)
    return left + sep + right
  }
  private renderFooter(width: number): string {
    return fitToWidth(this.theme.fg("muted", "j/k: scroll | pgUp/pgDown: page scroll | Esc: exit"), width)
  }

  private paneHeight(): number {
    return computeLayout(this.tui.terminal.columns, this.tui.terminal.rows).height - 2
  }

  private scrollBy(delta: number): void {
    const n = Math.max(this.before.length, this.after.length)
    const maxScroll = Math.max(0, n - this.paneHeight())
    this.scroll = Math.max(0, Math.min(maxScroll, this.scroll + delta))
    this.tui.requestRender()
  }

  handleInput(key: string): void {
    if (matchesKey(key, "up") || matchesKey(key, "k")) {
      this.scrollBy(-1)
    } else if (matchesKey(key, "down") || matchesKey(key, "j")) {
      this.scrollBy(1)
    } else if (matchesKey(key, "escape")) {
      this.done()
    }
  }

  render(width: number): string[] {
    const layout = computeLayout(width, this.tui.terminal.rows)
    const lines: string[] = []

    lines.push(this.renderHeader(layout))

    for (let i = 0; i < layout.height - 2; i++) {
      lines.push(this.renderRow(i, layout))
    }
    lines.push(this.renderFooter(width))
    return lines
  }
}


