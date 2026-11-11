import { useCollection, useCurrentUserId } from '~/api'
import { AccessType } from '~/models/AccessType'
import { ID } from '~/models/Identifiers'
import { isContentUSDCPurchaseGated } from '~/models/Track'
import { Nullable } from '~/utils'

import { useGatedCollectionAccess } from './useGatedContent'

type CollectionAccessType = {
  type: Nullable<AccessType>
  scheduledReleaseDate?: string
  isUnlocked?: boolean
}

export const useCollectionAccessTypeLabel = (
  collectionId: ID
): CollectionAccessType => {
  const { hasStreamAccess } = useGatedCollectionAccess(collectionId)

  const { data: collection } = useCollection(collectionId, {
    select: (collection) => ({
      streamConditions: collection?.stream_conditions,
      releaseDate: collection?.release_date,
      isScheduledRelease: collection?.is_scheduled_release,
      isPrivate: collection?.is_private,
      playlistOwnerId: collection?.playlist_owner_id
    })
  })

  const isPurchaseable = isContentUSDCPurchaseGated(
    collection?.streamConditions
  )
  const releaseDate = collection?.releaseDate
  const isScheduledRelease =
    collection?.isScheduledRelease &&
    releaseDate &&
    new Date(releaseDate) > new Date()
  const isPrivate = collection?.isPrivate

  const { data: accountUserId } = useCurrentUserId()

  const isOwner = collection?.playlistOwnerId === accountUserId

  const isUnlockedStream = Boolean(!isOwner && hasStreamAccess)

  let type: Nullable<AccessType> = null
  let isUnlocked = false

  if (isScheduledRelease) {
    type = AccessType.SCHEDULED_RELEASE
  } else if (isPrivate) {
    type = AccessType.HIDDEN
  } else if (isPurchaseable) {
    type = AccessType.PREMIUM
    isUnlocked = isUnlockedStream
  }

  return {
    type,
    isUnlocked,
    scheduledReleaseDate: isScheduledRelease ? releaseDate : undefined
  }
}
