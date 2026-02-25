/**
 * Cascading timeout phases for URL resolution:
 * 1. Try primary with 2s
 * 2. If fail, try all mirrors with 2s each
 * 3. If all fail, try all mirrors with 5s each
 * 4. If all fail, try all mirrors with 30s each
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
 * Resolves a working URL using cascading timeouts:
 * - Try primary with 2s
 * - If fail, try all mirrors with 2s each
 * - If all fail, try all mirrors with 5s each
 * - If all fail, try all mirrors with 30s each
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

  const [primary, ...mirrors] = urlsToTry
  const primaryFallback = primary ?? null

  // Phase 1: Try primary with 2s
  if (primary && (await tryUrlWithTimeout(primary, CASCADING_TIMEOUTS_MS[0]))) {
    return primary
  }

  if (mirrors.length === 0) {
    return primaryFallback
  }

  // Phases 2-4: Try all mirrors with 2s, 5s, then 30s
  for (const timeoutMs of CASCADING_TIMEOUTS_MS) {
    const workingUrl = await tryUrlsWithTimeout(mirrors, timeoutMs)
    if (workingUrl) {
      return workingUrl
    }
  }

  return primaryFallback
}
