import { matchesKey } from "@earendil-works/pi-tui"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { ReviewPanel, type ReviewFile } from "../panel"
import { getSnapshotOfWorkingTree, getUntrackedFilesWithContent, getChangeSize, getFileContent } from "../git"
import { DiffView } from "../diff-view"
import { readFile } from "fs/promises"
import { join } from "path"

// const PLACEHOLDER_FILES: ReviewFile[] = [
//   { path: "src/main.ts", added: 363, removed: 1 },
//   { path: "src/utils.ts", added: 52, removed: 2 },
//   { path: "README.md", added: 10405, removed: 1405 },
//   { path: "LICENSE", added: 343, removed: 100 },
//   { path: "package.json", added: 454, removed: 145 },
//   { path: "package-lock.json", added: 54, removed: 2233 },
//   { path: "biome.json", added: 45, removed: 0 },
// ]
//
let panel: ReviewPanel | null = null
let panelVisible = false
let panelActive = false
let inputListenerBound = false

// for quick testing
let baseline: string | null = null
let untrackedFilesAtStart: Map<string, string> = new Map()


export default function(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    if (ctx.mode === "tui" && !inputListenerBound) {
      ctx.ui.onTerminalInput(handleTerminalInput)
      inputListenerBound = true
    }
    baseline = await getSnapshotOfWorkingTree(ctx.cwd)
    untrackedFilesAtStart = await getUntrackedFilesWithContent(ctx.cwd)
  })

  pi.on("session_shutdown", (_event, ctx) => {
    if (ctx.mode === "tui") {
      ctx.ui.setWidget("review", undefined)
    }
    panel = null
    panelVisible = false
    panelActive = false
    baseline = null
    untrackedFilesAtStart = new Map()
  })

  // this helps with hot-reloading the panel content
  pi.on("tool_execution_end", async (_event, ctx) => {
    if (!panel || !panelVisible) return
    //   if (_event.toolName !== "write" && _event.toolName !== "edit" && _event.toolName !== "bash") return
    const changes = await getChangeSize(ctx.cwd, baseline || "", untrackedFilesAtStart)
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
      const changes = await getChangeSize(ctx.cwd, baseline || "", untrackedFilesAtStart)
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
  pi.registerCommand("diff", {
    description: "load diff view, only for testting",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("/diff requires interactive mode", "error")
        return
      }
      const changes = await getChangeSize(ctx.cwd, baseline || "", untrackedFilesAtStart)
      if (changes.length === 0) {
        ctx.ui.notify("No changed files to show", "warning")
        return
      }
      const file = changes[0]!
      const after = await readFile(join(ctx.cwd, file.path), "utf8")

      let before = untrackedFilesAtStart.get(file.path)

      if (before === undefined) {
        try {
          before = await getFileContent(ctx.cwd, file.path, baseline || "HEAD")
        } catch {
          before = ""
        }
      }

      const beforeLines = before.length === 0 ? [] : before.split("\n")
      const afterLines = after.length === 0 ? [] : after.split("\n")

      await ctx.ui.custom(
        (tui, theme, _keybindings, done) =>
          new DiffView(theme, tui, { path: file.path, before: beforeLines, after: afterLines, done }),
        {
          overlay: true,
          overlayOptions: { width: "100%", row: "0%", maxHeight: "50%" },
        },
      )
    }
  })
}

function handleTerminalInput(data: string): { consume?: boolean } | undefined {
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
  return undefined
}
