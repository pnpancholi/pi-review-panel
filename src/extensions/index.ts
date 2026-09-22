import { isKeyRelease, matchesKey, type TUI } from "@earendil-works/pi-tui"
import type { ExtensionAPI, ExtensionUIContext, Theme } from "@earendil-works/pi-coding-agent"
import { ReviewPanel, type ReviewFile } from "../panel"
import { getChangeSize, getFileContent } from "../git"
import { DiffView } from "../diff-view"
import { readFile } from "fs/promises"
import { join } from "path"
import { SessionTracker } from "../session"
import { getTerminalHintForFontConfig, installNerdFont, isNerdFontConfiguredInTerminal, isNerdFontInstalled } from "../fonts"

let ui: ExtensionUIContext
let diffView: DiffView | null = null
let diffPanelVisible = false
let diffPanelActive = false
let pendingDiff: { path: string, before: string[], after: string[] } | null = null
let panel: ReviewPanel | null = null
let panelVisible = false
let panelActive = false
let hasNerdFontInstalled = false
let selectedFilePath: string | null = null

let sessionTracker = new SessionTracker()

async function updatePanelFiles(): Promise<void> {
  if (!panel) return
  const changes = await getChangeSize(
    sessionTracker.getCWD(),
    sessionTracker.getBaseline(),
    sessionTracker.getUntrackedFilesAtStart(),
    sessionTracker.getModifiedFiles()
  )
  const files: ReviewFile[] = changes.map(c => ({ path: c.path, added: c.added, removed: c.removed }))
  panel.setFiles(files)
  if (selectedFilePath) panel.setSelectedFilePath(selectedFilePath)
}

function createReviewWidget(tui: TUI, theme: Theme): ReviewPanel {
  if (!panel) {
    panel = new ReviewPanel(theme, tui, hasNerdFontInstalled)
    updatePanelFiles().catch(console.error)
  }
  return panel
}

export default function(pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
    // setting up nerd font for a nice look 
    hasNerdFontInstalled = isNerdFontInstalled()
    if (!hasNerdFontInstalled && ctx.mode === "tui") {
      const install = await ctx.ui.confirm(
        "Nerd Font is missing",
        "Nerd Font is recommended for better experience, Would you like to install it now?"
      )
      if (install) {
        ctx.ui.setStatus("fonts", "Installing Nerd Font...")
        const result = await installNerdFont()
        ctx.ui.notify(result.message, result.success ? "info" : "error")
        if (result.success) {
          ctx.ui.notify(getTerminalHintForFontConfig(), "info")
          hasNerdFontInstalled = true
        }
        ctx.ui.setStatus("fonts", undefined)
      }
    } else if (hasNerdFontInstalled && ctx.mode === "tui") {
      const configured = await isNerdFontConfiguredInTerminal()
      if (!configured) {
        ctx.ui.notify("⚠ Nerd Font detected but may not be active in your terminal", "warning")
        ctx.ui.notify(getTerminalHintForFontConfig(), "info")
      }
    }
    // end of nerd font setup
    ui = ctx.ui
    if (ctx.mode === "tui") {
      ctx.ui.onTerminalInput(handleTerminalInput)
    }
    if (event.reason === "resume") {
      const entries = ctx.sessionManager.getEntries()
      sessionTracker.restoreFromSnapshot(entries)
    } else {
      await sessionTracker.init(ctx)
      pi.appendEntry("session-snapshot", sessionTracker.getSnapshot())
    }
    if (ctx.mode === "tui") {
      await openReviewPanel(ctx.ui, ctx.cwd)
    }
  })

  pi.on("session_shutdown", (_event, ctx) => {
    if (ctx.mode === "tui") {
      ctx.ui.setWidget("review", undefined)
    }
    panel = null
    panelVisible = false
    panelActive = false
    selectedFilePath = null
  })

  // this helps with hot-reloading the panel content
  pi.on("tool_execution_end", async (_event, _ctx) => {
    if (!panel || !panelVisible) return
    await updatePanelFiles()
  })

  pi.on("tool_result", async (event, ctx) => {
    if (event.isError) return
    if (event.toolName !== "write" && event.toolName !== "edit") return
    const rawPath = (event.input as any)?.path as string | undefined
    if (rawPath) {
      // Normalize path to be relative to cwd (git diff --relative uses relative paths)
      const path = rawPath.startsWith(ctx.cwd) ? rawPath.slice(ctx.cwd.length + 1) : rawPath
      sessionTracker.trackFile(path)
      pi.appendEntry("session-snapshot", sessionTracker.getSnapshot())
      if (panel && panelVisible) {
        await updatePanelFiles()
      }
    }
  })

  pi.registerCommand("review", {
    description: "Toggle the session review panel",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("/review requires interactive mode", "error")
        return
      }
      if (panelVisible) {
        ctx.ui.setWidget("review", undefined)
        panel = null
        panelVisible = false
        panelActive = false
        selectedFilePath = null
      } else {
        await openReviewPanel(ctx.ui, ctx.cwd)
      }
    },
  })
}

function handleTerminalInput(data: string): { consume?: boolean } | undefined {
  // NOTE: Kitty keyboard protocol sends both press and release events for special keys
  // (arrows, modifiers). Without this check, the release re-triggers navigation.
  // this would cause navigation issue with arrow keys if removed
  if (isKeyRelease(data)) return undefined
  //--------------------------------------//
  if (diffPanelActive && diffView) {
    if (matchesKey(data, "up") || matchesKey(data, "k")) diffView.scrollBy(-1)
    else if (matchesKey(data, "down") || matchesKey(data, "j")) diffView.scrollBy(1)
    else if (matchesKey(data, "pageUp")) diffView.scrollByPage(-1)
    else if (matchesKey(data, "pageDown")) diffView.scrollByPage(1)
    else if (matchesKey(data, "left") || matchesKey(data, "h")) diffView.scrollByX(-5)
    else if (matchesKey(data, "right") || matchesKey(data, "l")) diffView.scrollByX(5)
    else if (matchesKey(data, "escape")) {
      diffPanelVisible = false; diffPanelActive = false; pendingDiff = null
      refreshWidgets(ui)
      panelActive = true; panel?.setActive(true)
    }
    else return undefined
    return { consume: true }
  }

  if (!panelVisible || !panel) return undefined

  if (matchesKey(data, "alt+r")) {
    panelActive = !panelActive
    panel.setActive(panelActive)
    return { consume: true }
  }

  if (!panelActive) return undefined

  if (matchesKey(data, "up") || matchesKey(data, "k")) {
    panel.moveSelection(-1)
    selectedFilePath = panel.getSelectedFile()?.path ?? null
    return { consume: true }
  }
  if (matchesKey(data, "down") || matchesKey(data, "j")) {
    panel.moveSelection(1)
    selectedFilePath = panel.getSelectedFile()?.path ?? null
    return { consume: true }
  }
  if (matchesKey(data, "escape")) {
    panelActive = false
    panel.setActive(false)
    return { consume: true }
  }

  if (matchesKey(data, "enter") || matchesKey(data, "return")) {
    const file = panel?.getSelectedFile()
    if (file) openDiffForFile(file.path)
    panelActive = false
    panel?.setActive(false)
    return { consume: true }
  }
  return undefined
}


function refreshWidgets(ui: ExtensionUIContext): void {
  ui.setWidget("diff", undefined)
  ui.setWidget("review", undefined)

  if (diffPanelVisible) {
    ui.setWidget("diff", (tui, theme) => {
      if (!diffView && pendingDiff) diffView = new DiffView(theme, tui, { ...pendingDiff, hasNerdFontInstalled })
      return diffView!
    })
  }

  if (panelVisible) {
    ui.setWidget("review", createReviewWidget)
  }
}

async function openReviewPanel(ui: ExtensionUIContext, _cwd: string): Promise<void> {
  if (panelVisible) return
  panelVisible = true
  ui.setWidget("review", createReviewWidget)
}

async function openDiffForFile(path: string): Promise<boolean> {
  const cwd = sessionTracker.getCWD()
  if (!cwd) return false

  let after = ""
  try {
    after = await readFile(join(cwd, path), "utf8")
  } catch {
    after = ""
  }

  let before = sessionTracker.getUntrackedFilesAtStart().get(path)
  if (before === undefined) {
    try {
      before = await getFileContent(cwd, path, sessionTracker.getBaseline() || "HEAD")
    } catch {
      before = ""
    }
  }

  const afterLines = after.length === 0 ? [] : after.split("\n")
  const beforeLines = before.length === 0 ? [] : before.split("\n")

  pendingDiff = { path: path, before: beforeLines, after: afterLines }
  diffView = null
  diffPanelActive = true
  diffPanelVisible = true
  refreshWidgets(ui)
  return true
}
