import { useTrack } from '~/api'
import {
  isContentSpecialAccess,
  isContentTokenGated,
  isContentUSDCPurchaseGated,
  ID
} from '~/models'

export const useIsTrackUnlockable = (trackId: ID) => {
  const { data: streamConditions } = useTrack(trackId, {
    select: (track) => {
      return track.stream_conditions
    }
  })

  const isPurchaseable = isContentUSDCPurchaseGated(streamConditions)
  const isSpecialAccess = isContentSpecialAccess(streamConditions)
  const isTokenGated = isContentTokenGated(streamConditions)

  return isPurchaseable || isSpecialAccess || isTokenGated
}
