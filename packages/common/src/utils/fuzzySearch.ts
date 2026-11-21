function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  const dp = Array.from(Array(m + 1), () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      if (i === 0) {
        dp[i][j] = j
      } else if (j === 0) {
        dp[i][j] = i
      } else if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

export function fuzzySearch<Data>(
  query: string,
  dataset: Data[],
  threshold: number,
  dataToString: (data: Data) => string = (data) => data as string
) {
  const results: Array<{ item: Data; distance: number }> = []

  for (const item of dataset) {
    const lowercaseItem = dataToString(item).toLowerCase()
    if (lowercaseItem.includes(query.toLowerCase())) {
      results.push({ item, distance: 0 })
    } else {
      const distance = levenshteinDistance(query.toLowerCase(), lowercaseItem)
      if (distance <= threshold) {
        results.push({ item, distance })
      }
    }
  }

  results.sort((a, b) => a.distance - b.distance)

  return results.map((result) => result.item)
}
