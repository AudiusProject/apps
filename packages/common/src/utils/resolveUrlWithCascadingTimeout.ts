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
