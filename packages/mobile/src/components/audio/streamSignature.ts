// Nodes reject stream signatures older than 48h. Queued tracks are resolved
// up front and can sit in the queue for hours, so keep a wide margin.
const MAX_SIGNATURE_AGE_MS = 1000 * 60 * 60 * 12

/**
 * Whether a cached stream URL's signature is still young enough to play.
 * Track entities never go stale in the query cache and are persisted across
 * launches, so their stream URLs can outlive the signature.
 */
export const isStreamSignatureFresh = (url: string, now = Date.now()) => {
  try {
    const signature = new URL(url).searchParams.get('signature')
    if (!signature) return true
    const { data } = JSON.parse(signature)
    const { timestamp } = typeof data === 'string' ? JSON.parse(data) : data
    if (typeof timestamp !== 'number') return true
    return now - timestamp < MAX_SIGNATURE_AGE_MS
  } catch {
    return true
  }
}
