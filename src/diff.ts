export interface DiffResult {
  added: number
  removed: number
}

export function getDiffLines(oldLines: string[], newLines: string[]): DiffResult {
  const m = oldLines.length
  const n = newLines.length

  const dp: number[] = new Array(n + 1).fill(0)

  for (let i = 1; i <= m; i++) {
    let prev = 0

    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = oldLines[i - 1] === newLines[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1])
      prev = tmp
    }
  }
  const lcs = dp[n]
  return { added: n - lcs, removed: m - lcs }
}
