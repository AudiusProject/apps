import { resolveUrlWithCascadingTimeout } from './resolveUrlWithCascadingTimeout'

type StreamObject = { url?: string; mirrors?: string[] }

/**
 * Resolves a working stream URL from a stream object using cascading timeouts:
 * try primary (2s) → mirrors (2s) → mirrors (5s) → mirrors (30s)
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

  return resolveUrlWithCascadingTimeout(urlsToTry, skipCount)
}
