//
// ███████╗███████╗███████╗███████╗██╗ ██████╗ ███╗   ██╗    ████████╗██████╗  █████╗  ██████╗██╗  ██╗███████╗██████╗ 
// ██╔════╝██╔════╝██╔════╝██╔════╝██║██╔═══██╗████╗  ██║    ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗
// ███████╗█████╗  ███████╗███████╗██║██║   ██║██╔██╗ ██║       ██║   ██████╔╝███████║██║     █████╔╝ █████╗  ██████╔╝
// ╚════██║██╔══╝  ╚════██║╚════██║██║██║   ██║██║╚██╗██║       ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ██╔══╝  ██╔══██╗
// ███████║███████╗███████║███████║██║╚██████╔╝██║ ╚████║       ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗███████╗██║  ██║
// ╚══════╝╚══════╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝       ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝

import type { ExtensionContext } from "@earendil-works/pi-coding-agent"
import { getSnapshotOfWorkingTree, getUntrackedFilesWithContent } from "./git"

interface SessionSnapshot {
  cwd: string
  // Null handles edge case if git isn't available.
  baseline: string | null,
  // Record is used because Map doesn't serialize JSON
  untrackedFilesAtStart: Record<string, string>
}

// This class owns every thing in relationship to a session. 
//1. New session starts → capture baseline + untracked files → save them with pi.appendEntry("review-snapshot", data)
//2. Session resumes → read entries → find the one with customType === "review-snapshot" → restore baseline + untracked files
//3. Session shuts down → don't touch the data, pi keeps the file

export class SessionTracker {
  private baseline!: string | null
  private untrackedFilesAtStart!: Map<string, string>
  private cwd!: string

  async init(ctx: ExtensionContext): Promise<void> {
    this.baseline = await getSnapshotOfWorkingTree(ctx.cwd)
    this.untrackedFilesAtStart = await getUntrackedFilesWithContent(ctx.cwd)
    this.cwd = ctx.cwd
  }

  getSnapshot(): SessionSnapshot {
    return {
      cwd: this.cwd,
      baseline: this.baseline,
      untrackedFilesAtStart: Object.fromEntries(this.untrackedFilesAtStart)
    }
  }

  restoreFromSnapshot(entries: readonly { type: string; customType?: string; data?: unknown }[]): void {
    const snapshotData = entries.find(
      e => e.type === "custom" && e.customType === "session-snapshot"
    )

    if (snapshotData?.data) {
      const data = snapshotData.data as SessionSnapshot
      this.cwd = data.cwd
      this.baseline = data.baseline
      this.untrackedFilesAtStart = new Map(Object.entries(data.untrackedFilesAtStart))
    }
  }

  getBaseline(): string | null {
    return this.baseline
  }

  getCWD(): string {
    return this.cwd
  }
  getUntrackedFilesAtStart(): Map<string, string> {
    return this.untrackedFilesAtStart
  }

}
