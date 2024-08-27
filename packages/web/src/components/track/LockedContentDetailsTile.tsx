import { PurchaseableContentMetadata } from '@audius/common/hooks'
import {
  SquareSizes,
  isContentCollectibleGated,
  isContentUSDCPurchaseGated,
  Track,
  UserMetadata,
  Collection
} from '@audius/common/models'
import { getDogEarType, Nullable } from '@audius/common/utils'
import {
  Flex,
  Text,
  IconCart,
  IconCollectible,
  IconComponent,
  IconSpecialAccess,
  useTheme
} from '@audius/harmony'
import cn from 'classnames'

import { DogEar } from 'components/dog-ear'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import { UserLink } from 'components/link'
import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

import styles from './LockedContentDetailsTile.module.css'

const messages = {
  by: 'By',
  collectibleGated: 'COLLECTIBLE GATED',
  specialAccess: 'SPECIAL ACCESS',
  premiumTrack: (contentType: 'track' | 'album') =>
    `PREMIUM ${contentType.toUpperCase()}`,
  earn: (amount: string) => `Earn ${amount} $AUDIO for this purchase!`
}

export type LockedContentDetailsTileProps = {
  metadata: PurchaseableContentMetadata | Track | Collection
  owner: UserMetadata
  showLabel?: boolean
  disabled?: boolean
  earnAmount?: string
}

export const LockedContentDetailsTile = ({
  metadata,
  owner,
  showLabel = true,
  disabled = false,
  earnAmount
}: LockedContentDetailsTileProps) => {
  const { stream_conditions: streamConditions } = metadata
  const isAlbum = 'playlist_id' in metadata
  const contentId = isAlbum ? metadata.playlist_id : metadata.track_id
  const title = isAlbum ? metadata.playlist_name : metadata.title
  const downloadConditions = !isAlbum ? metadata.download_conditions : null
  const isDownloadGated = !isAlbum && metadata.is_download_gated

  const trackArt = useTrackCoverArt(
    contentId,
    metadata._cover_art_sizes ?? null,
    SquareSizes.SIZE_150_BY_150
  )
  const albumArt = useCollectionCoverArt(
    contentId,
    metadata._cover_art_sizes ?? null,
    SquareSizes.SIZE_150_BY_150
  )
  const image = isAlbum ? albumArt : trackArt

  const dogEarType = getDogEarType({
    streamConditions,
    downloadConditions
  })
  const label = `${title} by ${owner.name}`
  const isCollectibleGated = isContentCollectibleGated(streamConditions)
  const isUSDCPurchaseGated = isContentUSDCPurchaseGated(streamConditions)
  const { color } = useTheme()

  let IconComponent: Nullable<IconComponent>
  let message: Nullable<string>

  if (isCollectibleGated) {
    IconComponent = IconCollectible
    message = messages.collectibleGated
  } else if (isUSDCPurchaseGated) {
    IconComponent = IconCart
    message = messages.premiumTrack(isAlbum ? 'album' : 'track')
  } else if (isDownloadGated) {
    IconComponent = null
    message = null
  } else {
    IconComponent = IconSpecialAccess
    message = messages.specialAccess
  }

  return (
    <Flex
      alignItems='center'
      gap='l'
      p='l'
      border='strong'
      borderRadius='m'
      backgroundColor='surface1'
      css={{
        position: 'relative'
      }}
    >
      <DynamicImage
        wrapperClassName={styles.imageWrapper}
        className={styles.image}
        image={image}
        aria-label={label}
      />
      {dogEarType ? (
        <Flex
          css={{
            position: 'absolute',
            top: -1,
            left: -1
          }}
        >
          <DogEar type={dogEarType} />
        </Flex>
      ) : null}
      <Flex css={{ overflow: 'hidden' }}>
        {showLabel && IconComponent && message ? (
          <Flex
            className={cn(styles.gatedContentLabel, {
              [styles.usdcContentLabel]: isUSDCPurchaseGated
            })}
          >
            <IconComponent
              size='s'
              fill={
                isUSDCPurchaseGated
                  ? color.special.lightGreen
                  : color.special.blue
              }
            />
            <Text>{message}</Text>
          </Flex>
        ) : null}
        <Flex w='100%' direction='column' gap='xs'>
          <Text ellipses variant='title' size='m'>
            {title}
          </Text>
          <UserLink
            textVariant='body'
            size='m'
            userId={owner.user_id}
            disabled={disabled}
          />
          {earnAmount ? (
            <Flex alignItems='center' gap='xs' pt='xs'>
              <IconCart height={16} width={16} color='premium' />
              <Text variant='body' size='xs' strength='strong' color='premium'>
                {messages.earn(earnAmount)}
              </Text>
            </Flex>
          ) : null}
        </Flex>
      </Flex>
    </Flex>
  )
}
