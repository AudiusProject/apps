import { useCurrentUserId } from '~/api'
import { useTrack } from '~/api/tan-query/tracks/useTrack'
import { DogEarType } from '~/models'
import { ID } from '~/models/Identifiers'
import {
  isContentSpecialAccess,
  isContentTokenGated,
  isContentUSDCPurchaseGated
} from '~/models/Track'
import { Nullable } from '~/utils'

import { useGatedTrackAccess } from './useGatedContent'

export const useTrackDogEar = (trackId: ID, hideUnlocked = false) => {
  const { data: currentUserId } = useCurrentUserId()
  const { data: partialTrack } = useTrack(trackId, {
    select: (track) => {
      return {
        streamConditions: track.stream_conditions,
        downloadConditions: track.download_conditions,
        isOwner: track.owner_id === currentUserId
      }
    }
  })
  const { streamConditions, downloadConditions, isOwner } = partialTrack ?? {}

  const { hasStreamAccess, hasDownloadAccess } = useGatedTrackAccess(trackId)

  const hideUnlockedStream = !isOwner && hasStreamAccess && hideUnlocked
  const hideUnlockedDownload = !isOwner && hasDownloadAccess && hideUnlocked

  const isPurchaseable = isContentUSDCPurchaseGated(streamConditions)
  const isSpecialAccess = isContentSpecialAccess(streamConditions)
  const isDownloadGated = isContentUSDCPurchaseGated(downloadConditions)
  const isTokenGated = isContentTokenGated(streamConditions)

  let dogEarType: Nullable<DogEarType> = null

  if (isPurchaseable && !hideUnlockedStream) {
    dogEarType = DogEarType.USDC_PURCHASE
  } else if (isSpecialAccess && !hideUnlockedStream) {
    dogEarType = DogEarType.SPECIAL_ACCESS
  } else if (isDownloadGated && !hideUnlockedDownload) {
    dogEarType = DogEarType.USDC_EXTRAS
  } else if (isTokenGated && !hideUnlockedStream) {
    dogEarType = DogEarType.TOKEN_GATED
  }

  return dogEarType
}
