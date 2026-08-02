import { execFile } from "child_process";
import { readFile } from "fs/promises";
import { promisify } from "util";
import { join } from "path";

const execFileAsync = promisify(execFile)

export type GitStatus = "modified" | "added" | "deleted"

export interface GitChange {
  path: string
  status: GitStatus
  added: number
  removed: number
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["--no-pager", ...args], {
    cwd,
    maxBuffer: 32 * 1024 * 1024
  })
  return stdout
}

export async function getSnapshotOfWorkingTree(cwd: string): Promise<string | null> {
  try {
    const hash = await git(cwd, ["stash", "create", "-u"])
    return hash.trim()
  } catch {
    return null
  }
}

/**
 * List untracked files in the repo right now.
 *
 * `--exclude-standard` makes git respect `.gitignore` (and
 * `.git/info/exclude`), so build output and dependencies are filtered out.
 *
 * Returns `[]` for both "no untracked files" and "git failed / not a repo" —
 * the caller treats an empty list as "nothing to show" either way.
 */
export async function getUntrackedFiles(cwd: string): Promise<string[]> {
  try {
    const files = await git(cwd, ["ls-files", "--others", "--exclude-standard"])
    //git prints a trailing newline, so "a.txt\nb.txt\n".split("\n") → ["a.txt", "b.txt", ""]. .filter((line) => line.length > 0) drops that empty last element
    return files.split("\n").filter(line => line.length > 0)
  } catch {
    return []
  }
}

export async function getChangeSize(cwd: string, baseline: string, untrackedFilesAtStart: Set<string>): Promise<GitChange[]> {
  const ref = baseline.length > 0 ? baseline : "HEAD"
  const changes: GitChange[] = []

  // to deal with tracked changes since baseline
  try {
    const numStat = await git(cwd, ["diff", "--numstat", ref, "--"])
    for (const line of numStat.split("\n")) {
      if (line.length === 0) continue
      const [addedStr, removedStr, ...pathParts] = line.split("\t")
      if (addedStr === undefined || removedStr === undefined) continue
      if (addedStr === "-" || removedStr === "-") continue
      const added = parseInt(addedStr)
      const removed = parseInt(removedStr)
      const status: GitStatus =
        added > 0 && removed === 0 ? "added"
          : removed > 0 && added === 0 ? "deleted"
            : "modified"
      changes.push({ path: pathParts.join("\t"), status, added, removed })
    }
  } catch {

  }
  // to deal with brand new files created since baseline (untracked, absent at start)
  const untrackedFilesNow = await getUntrackedFiles(cwd)
  for (const path of untrackedFilesNow) {
    if (untrackedFilesAtStart.has(path)) continue
    changes.push({ path, status: "added", added: await lineCount(cwd, path), removed: 0 })
  }
  changes.sort((a, b) => a.path.localeCompare(b.path))
  return changes
}

async function lineCount(cwd: string, path: string): Promise<number> {
  try {
    const content = await readFile(join(cwd, path), "utf8")
    return content.length === 0 ? 0 : content.split("\n").length
  } catch {
    return 0
  }
}


















