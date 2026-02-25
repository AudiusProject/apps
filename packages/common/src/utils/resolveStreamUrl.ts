import { AUDIO_LOAD_TIMEOUT_MS } from './constants'

type StreamObject = { url?: string; mirrors?: string[] }

const tryUrl = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      AUDIO_LOAD_TIMEOUT_MS
    )
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

const tryUrls = async (urls: string[]): Promise<string> => {
  for (const url of urls) {
    if (await tryUrl(url)) {
      return url
    }
  }
  return urls[0] ?? ''
}

/**
 * Resolves a working stream URL from a stream object, trying the primary URL
 * and mirrors with a 5s timeout per attempt. Returns the first URL that
 * responds successfully, or the primary URL as fallback.
 *
 * @param streamObj - The stream or preview object with url and mirrors
 * @param skipCount - Number of URLs to skip (for retries after playback error)
 */
export const resolveStreamUrl = async (
  streamObj: StreamObject | null | undefined,
  skipCount = 0
): Promise<string | null> => {
  if (!streamObj?.url) {
    return null
  }

  const urlsToTry: string[] = [streamObj.url]
  if (streamObj.mirrors) {
    for (const mirror of streamObj.mirrors) {
      try {
        const mirrorUrl = new URL(streamObj.url)
        mirrorUrl.hostname = new URL(mirror).hostname
        urlsToTry.push(mirrorUrl.toString())
      } catch {
        // no-op
      }
    }
  }

  const urlsToAttempt = urlsToTry.slice(skipCount)
  const workingUrl = await tryUrls(urlsToAttempt)
  return workingUrl || urlsToAttempt[0] || null
}
