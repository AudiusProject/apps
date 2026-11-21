import { useStems } from '~/api/tan-query/tracks/useStems'

import { PurchaseableContentMetadata } from './types'

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
