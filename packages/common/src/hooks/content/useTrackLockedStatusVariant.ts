import { useTrack } from '~/api'
import {
  ID,
  isContentSpecialAccess,
  isContentTokenGated,
  isContentUSDCPurchaseGated
} from '~/models'
import { Nullable } from '~/utils'

import { LockedStatusVariant } from './types'

export const useTrackLockedStatusVariant = (trackId: ID) => {
  const { data: streamConditions } = useTrack(trackId, {
    select: (track) => track?.stream_conditions
  })

  const isPurchaseable = isContentUSDCPurchaseGated(streamConditions)
  const isSpecialAccess = isContentSpecialAccess(streamConditions)
  const isTokenGated = isContentTokenGated(streamConditions)

  let variant: Nullable<LockedStatusVariant> = null
  if (isPurchaseable) {
    variant = 'premium'
  } else if (isSpecialAccess) {
    variant = 'gated'
  } else if (isTokenGated) {
    variant = 'tokenGated'
  }

  return variant
}
