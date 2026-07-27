import { useCallback } from 'react'

import {
  isPurchaseableAlbum,
  usePurchaseableStemCount,
  type PurchaseableContentMetadata
} from '@audius/common/hooks'
import {
  collectionsSocialActions,
  tracksSocialActions
} from '@audius/common/store'
import { capitalize } from 'lodash'
import { useDispatch } from 'react-redux'

import {
  IconCaretRight,
  IconRepost,
  IconValidationCheck,
  Flex,
  Text,
  PlainButton,
  EntityActionButton
} from '@audius/harmony-native'
import { spacing } from 'app/styles/spacing'
import { EventNames, RepostSource } from 'app/types/analytics'
import { getCollectionRoute, getTrackRoute } from 'app/utils/routes'

import { XButton } from '../x-button'

const messages = {
  success: 'Your Purchase Was Successful!',
  shareXText: (contentType: string, trackTitle: string, handle: string) =>
    `I bought the ${contentType} ${trackTitle} by ${handle} on @Audius! $AUDIO`,
  view: (contentType: string) => `View ${capitalize(contentType)}`,
  repost: 'Repost',
  reposted: 'Reposted'
}

export const PurchaseSuccess = ({
  onPressViewTrack,
  metadata
}: {
  onPressViewTrack: () => void
  metadata: PurchaseableContentMetadata
}) => {
  const { handle } = metadata.user
  const { has_current_user_reposted: isReposted } = metadata
  const isAlbum = isPurchaseableAlbum(metadata)
  const title = isAlbum ? metadata.playlist_name : metadata.title
  const contentId = isAlbum ? metadata.playlist_id : metadata.track_id
  const contentType = isAlbum ? 'album' : 'track'
  const isHidden = isAlbum ? metadata.is_private : metadata.is_unlisted

  const link = isAlbum
    ? getCollectionRoute(metadata)
    : getTrackRoute(metadata, true)

  const stemCount = usePurchaseableStemCount(metadata)

  const dispatch = useDispatch()

  const handleXShare = useCallback(
    (handle: string) => {
      let shareText: string
      if (!isAlbum && metadata.is_download_gated && stemCount > 0) {
        shareText = messages.shareXText('stems for', title, handle)
      } else {
        shareText = messages.shareXText(
          isAlbum ? 'album' : 'track',
          title,
          handle
        )
      }
      return {
        shareText,
        analytics: {
          eventName: EventNames.PURCHASE_CONTENT_TWITTER_SHARE,
          text: shareText
        } as const
      }
    },
    [isAlbum, metadata, title, stemCount]
  )

  const onRepost = useCallback(() => {
    dispatch(
      isReposted
        ? (isAlbum
            ? collectionsSocialActions.undoRepostCollection
            : tracksSocialActions.undoRepostTrack)(
            contentId,
            RepostSource.PURCHASE
          )
        : (isAlbum
            ? collectionsSocialActions.repostCollection
            : tracksSocialActions.repostTrack)(contentId, RepostSource.PURCHASE)
    )
  }, [contentId, dispatch, isAlbum, isReposted])

  return (
    <Flex pt='unitHalf' gap='2xl' alignSelf='center'>
      <Flex direction='row' justifyContent='center' alignItems='center' gap='s'>
        <IconValidationCheck height={spacing(4)} width={spacing(4)} />
        <Text variant='heading' size='s'>
          {messages.success}
        </Text>
      </Flex>
      {isHidden ? null : (
        <Flex gap='l'>
          <EntityActionButton
            onPress={onRepost}
            iconLeft={IconRepost}
            isActive={isReposted}
          >
            {isReposted ? messages.reposted : messages.repost}
          </EntityActionButton>
          <XButton
            fullWidth
            type='dynamic'
            url={link}
            shareData={handleXShare}
            handle={handle}
          />
        </Flex>
      )}
      <PlainButton
        variant='subdued'
        onPress={onPressViewTrack}
        iconRight={IconCaretRight}
        size='large'
      >
        {messages.view(contentType)}
      </PlainButton>
    </Flex>
  )
}
