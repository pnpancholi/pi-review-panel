//    ██████╗ ██╗███████╗███████╗    ███████╗███╗   ██╗ ██████╗ ██╗███╗   ██╗███████╗
//    ██╔══██╗██║██╔════╝██╔════╝    ██╔════╝████╗  ██║██╔════╝ ██║████╗  ██║██╔════╝
//    ██║  ██║██║█████╗  █████╗      █████╗  ██╔██╗ ██║██║  ███╗██║██╔██╗ ██║█████╗  
//    ██║  ██║██║██╔══╝  ██╔══╝      ██╔══╝  ██║╚██╗██║██║   ██║██║██║╚██╗██║██╔══╝  
//    ██████╔╝██║██║     ██║         ███████╗██║ ╚████║╚██████╔╝██║██║ ╚████║███████╗
//    ╚═════╝ ╚═╝╚═╝     ╚═╝         ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝
export type DiffLine =
  { type: "match", oldIdx: number, newIdx: number }
  | { type: "added", idx: number }
  | { type: "removed", idx: number }

export type DiffColor = DiffLine["type"]

export interface DiffResult {
  added: number
  removed: number
}

export function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const m = oldLines.length
  const n = newLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const result: DiffLine[] = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: "match", oldIdx: i - 1, newIdx: j - 1 })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "added", idx: j - 1 })
      j--
    } else {
      result.push({ type: "removed", idx: i - 1 })
      i--
    }
  }

  result.reverse()
  return result

}

export function getDiffLines(oldLines: string[], newLines: string[]): DiffResult {
  const diff = computeDiff(oldLines, newLines)
  return {
    added: diff.filter(d => d.type === "added").length,
    removed: diff.filter(d => d.type === "removed").length
  }
}

