import { useStems } from '~/api/tan-query/tracks/useStems'

import { PurchaseableContentMetadata } from './types'

/**
 * Number of stems included in a download-gated purchase, used to itemize what
 * the buyer is paying for.
 *
 * Reads the stems query rather than anything on the metadata object: the
 * `_stems` field this previously used was never populated anywhere in the app,
 * so every purchase flow reported zero stems. Albums have no stems of their
 * own and resolve to 0.
 */
export const usePurchaseableStemCount = (
  metadata: PurchaseableContentMetadata | undefined
) => {
  const trackId =
    metadata && 'track_id' in metadata ? metadata.track_id : undefined
  const { data: stems } = useStems(trackId)

  const isDownloadGated =
    !!metadata && 'is_download_gated' in metadata && metadata.is_download_gated

  return isDownloadGated ? (stems?.length ?? 0) : 0
}
