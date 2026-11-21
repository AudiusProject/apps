import { resolveUrlWithCascadingTimeout } from './resolveUrlWithCascadingTimeout'

type StreamObject = { url?: string; mirrors?: string[] }

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
