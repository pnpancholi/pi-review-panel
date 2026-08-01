import { matchesKey } from "@earendil-works/pi-tui"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { ReviewPanel, type ReviewFile } from "../panel"

const PLACEHOLDER_FILES: ReviewFile[] = [
  { path: "src/main.ts", added: 363, removed: 1 },
  { path: "src/utils.ts", added: 52, removed: 2 },
  { path: "README.md", added: 10405, removed: 1405 },
  { path: "LICENSE", added: 343, removed: 100 },
  { path: "package.json", added: 454, removed: 145 },
  { path: "package-lock.json", added: 54, removed: 2233 },
  { path: "biome.json", added: 45, removed: 0 },
]

let panel: ReviewPanel | null = null
let panelVisible = false
let panelActive = false
let inputListenerBound = false

export default function(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui" || inputListenerBound) return
    ctx.ui.onTerminalInput(handleTerminalInput)
    inputListenerBound = true
  })

  pi.on("session_shutdown", (_event, ctx) => {
    if (ctx.mode === "tui") {
      ctx.ui.setWidget("review", undefined)
    }
    panel = null
    panelVisible = false
    panelActive = false
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
      ctx.ui.setWidget("review", (tui, theme) => {
        panel = new ReviewPanel(theme, tui)
        panel.setFiles(PLACEHOLDER_FILES)
        panel.setActive(false)
        panelVisible = true
        return panel
      })
    },
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
