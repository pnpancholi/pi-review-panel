import { highlightCode, getLanguageFromPath, type Theme } from "@earendil-works/pi-coding-agent"
import { truncateToWidth, visibleWidth, type Component, type TUI } from "@earendil-works/pi-tui"
import { computeDiff, type DiffColor } from "./diff"

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

function renderPaneCell(
  lines: string[],
  colors: DiffColor[],
  index: number,
  paneWidth: number,
  gutterWidth: number,
  theme: Theme): string {
  const lineNumber = String(index + 1).padStart(gutterWidth, " ")
  const content = lines[index] ?? " "
  const color = colors[index]

  let styled = content

  if (color === "added") {
    styled = content === " "
      ? theme.bg("toolSuccessBg", " ".repeat(paneWidth - gutterWidth - 1))
      : theme.bg("toolSuccessBg", theme.fg("toolDiffAdded", content))
  } else if (color === "removed") {
    styled = content === " "
      ? theme.bg("toolErrorBg", " ".repeat(paneWidth - gutterWidth - 1))
      : theme.bg("toolErrorBg", theme.fg("toolDiffRemoved", content))
  }
  return fitToWidth(theme.fg("dim", lineNumber) + " " + styled, paneWidth)
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

  constructor(theme: Theme, tui: TUI, options: DiffViewOptions) {
    this.theme = theme
    this.tui = tui
    this.path = options.path
    const lang = getLanguageFromPath(this.path)
    const beforeHighlighted = highlightCode(options.before.join("\n"), lang)
    const afterHighlighted = highlightCode(options.after.join("\n"), lang)
    const diff = computeDiff(beforeHighlighted, afterHighlighted)

    for (const line of diff) {
      switch (line.type) {
        case "match":
          this.leftPane.push(beforeHighlighted[line.oldIdx])
          this.leftColors.push("match")
          this.rightPane.push(afterHighlighted[line.newIdx])
          this.rightColors.push("match")
          break
        case "added":
          this.leftPane.push(" ")
          this.leftColors.push("added")
          this.rightPane.push(afterHighlighted[line.idx])
          this.rightColors.push("added")
          break
        case "removed":
          this.leftPane.push(beforeHighlighted[line.idx])
          this.leftColors.push("removed")
          this.rightPane.push(" ")
          this.rightColors.push("removed")
      }
    }
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
    const left = renderPaneCell(this.leftPane, this.leftColors, this.scroll + i, layout.leftWidth, layout.gutterWidth, this.theme)
    const sep = this.theme.fg("borderMuted", " ".repeat(layout.separatorWidth))
    const right = renderPaneCell(this.rightPane, this.rightColors, this.scroll + i, layout.rightWidth, layout.gutterWidth, this.theme)
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


