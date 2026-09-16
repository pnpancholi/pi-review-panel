import { matchesKey } from "@earendil-works/pi-tui"
import type { ExtensionAPI, ExtensionUIContext } from "@earendil-works/pi-coding-agent"
import { ReviewPanel, type ReviewFile } from "../panel"
import { getChangeSize, getFileContent } from "../git"
import { DiffView } from "../diff-view"
import { readFile } from "fs/promises"
import { join } from "path"
import { SessionTracker } from "../session"

let ui: ExtensionUIContext
let diffView: DiffView | null = null
let diffPanelVisible = false
let diffPanelActive = false
let pendingDiff: { path: string, before: string[], after: string[] } | null = null
let panel: ReviewPanel | null = null
let panelVisible = false
let panelActive = false

let sessionTracker = new SessionTracker()

export default function(pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
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
  })

  pi.on("session_shutdown", (_event, ctx) => {
    if (ctx.mode === "tui") {
      ctx.ui.setWidget("review", undefined)
    }
    panel = null
    panelVisible = false
    panelActive = false
  })

  // this helps with hot-reloading the panel content
  pi.on("tool_execution_end", async (_event, ctx) => {
    if (!panel || !panelVisible) return
    const changes = await getChangeSize(ctx.cwd, sessionTracker.getBaseline(), sessionTracker.getUntrackedFilesAtStart())
    const files: ReviewFile[] = changes.map(c => ({ path: c.path, added: c.added, removed: c.removed }))
    panel.setFiles(files)
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
        return
      }
      const changes = await getChangeSize(ctx.cwd, sessionTracker.getBaseline(), sessionTracker.getUntrackedFilesAtStart())
      const files: ReviewFile[] = changes.map(c => ({
        path: c.path,
        added: c.added,
        removed: c.removed,
      }))

      ctx.ui.setWidget("review", (tui, theme) => {
        panel = new ReviewPanel(theme, tui)
        panel.setFiles(files)
        panel.setActive(false)
        panelVisible = true
        return panel
      })
    },
  })
}

function handleTerminalInput(data: string): { consume?: boolean } | undefined {
  if (diffPanelActive && diffView) {
    if (matchesKey(data, "up") || matchesKey(data, "k")) diffView.scrollBy(-1)
    else if (matchesKey(data, "down") || matchesKey(data, "j")) diffView.scrollBy(1)
    else if (matchesKey(data, "pageUp")) diffView.scrollByPage(-1)
    else if (matchesKey(data, "pageDown")) diffView.scrollByPage(1)
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
    return { consume: true }
  }
  if (matchesKey(data, "down") || matchesKey(data, "j")) {
    panel.moveSelection(1)
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
      if (!diffView && pendingDiff) diffView = new DiffView(theme, tui, pendingDiff)
      return diffView!
    })
  }

  if (panelVisible) {
    ui.setWidget("review", (tui, theme) => {
      if (!panel) panel = new ReviewPanel(theme, tui)
      return panel!
    })
  }
}

async function openDiffForFile(path: string): Promise<boolean> {
  const cwd = sessionTracker.getCWD()
  if (!cwd) return false
  const after = await readFile(join(cwd, path), "utf8")
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
