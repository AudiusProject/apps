import { useTrack } from '~/api'
import {
  ID,
  isContentCollectibleGated,
  isContentSpecialAccess,
  isContentUSDCPurchaseGated
} from '~/models'
import { Nullable } from '~/utils'

import { LockedStatusVariant } from './types'

export const useTrackLockedStatusVariant = (trackId: ID) => {
  const { data: streamConditions } = useTrack(trackId, {
    select: (track) => track?.stream_conditions
  })

  const isPurchaseable = isContentUSDCPurchaseGated(streamConditions)
  const isCollectibleGated = isContentCollectibleGated(streamConditions)
  const isSpecialAccess = isContentSpecialAccess(streamConditions)

  let variant: Nullable<LockedStatusVariant> = null
  if (isPurchaseable) {
    variant = 'premium'
  } else if (isCollectibleGated) {
    variant = 'gated'
  } else if (isSpecialAccess) {
    variant = 'gated'
  }

  return variant
}
