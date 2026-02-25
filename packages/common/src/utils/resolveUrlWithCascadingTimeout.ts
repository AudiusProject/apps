/**
 * Cascading timeout phases for URL resolution.
 * Each phase tries primary + all mirrors with the given timeout:
 * - Phase 1: 2s
 * - Phase 2: 5s
 * - Phase 3: 30s
 */
export const CASCADING_TIMEOUTS_MS = [2000, 5000, 30000] as const

const tryUrlWithTimeout = async (
  url: string,
  timeoutMs: number
): Promise<boolean> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}

const tryUrlsWithTimeout = async (
  urls: string[],
  timeoutMs: number
): Promise<string | null> => {
  for (const url of urls) {
    if (await tryUrlWithTimeout(url, timeoutMs)) {
      return url
    }
  }
  return null
}

/**
 * Resolves a working URL using cascading timeouts.
 * Each phase tries primary + all mirrors with progressively longer timeouts:
 * - Phase 1: all urls with 2s
 * - Phase 2: all urls with 5s
 * - Phase 3: all urls with 30s
 *
 * @param urls - [primary, ...mirrors]
 * @param skipCount - Number of URLs to skip from the start (for retries after error)
 */
export const resolveUrlWithCascadingTimeout = async (
  urls: string[],
  skipCount = 0
): Promise<string | null> => {
  const urlsToTry = urls.slice(skipCount)
  if (urlsToTry.length === 0) {
    return null
  }

  const primaryFallback = urlsToTry[0] ?? null

  for (const timeoutMs of CASCADING_TIMEOUTS_MS) {
    const workingUrl = await tryUrlsWithTimeout(urlsToTry, timeoutMs)
    if (workingUrl) {
      return workingUrl
    }
  }

  return primaryFallback
}
