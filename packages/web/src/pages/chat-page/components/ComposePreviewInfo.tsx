import { useCollection, useTrack } from '@audius/common/api'
import { SquareSizes, ID } from '@audius/common/models'
import { Flex, Text } from '@audius/harmony'
import { pick } from 'lodash'

import DynamicImage from 'components/dynamic-image/DynamicImage'
import { UserLink } from 'components/link/UserLink'
import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

type ComposePreviewInfoProps = {
  title: string
  userId: ID
  image?: string
}

const ComposePreviewInfo = (props: ComposePreviewInfoProps) => {
  const { title, userId, image } = props
  return (
    <Flex ph='l' pv='s' gap='m' borderBottom='default'>
      <Flex
        borderRadius='s'
        h='unit12'
        w='unit12'
        style={{ overflow: 'hidden' }}
      >
        <DynamicImage style={{ height: '100%', width: '100%' }} image={image} />
      </Flex>
      <Flex direction='column' alignItems='flex-start' justifyContent='center'>
        <Text variant='body' strength='strong'>
          {title}
        </Text>
        <Flex alignItems='center' gap='xs'>
          <UserLink userId={userId} popover />
        </Flex>
      </Flex>
    </Flex>
  )
}

type ComposerTrackInfoProps = {
  trackId: ID
}

export const ComposerTrackInfo = (props: ComposerTrackInfoProps) => {
  const { trackId } = props
  const { imageUrl: image } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_150_BY_150
  })

  const { data: track } = useTrack(trackId, {
    select: (track) => ({
      title: track.title,
      owner_id: track.owner_id
    })
  })

  if (!track) return null

  return (
    <ComposePreviewInfo
      title={track.title}
      userId={track.owner_id}
      image={image}
    />
  )
}

type ComposerCollectionInfoProps = {
  collectionId: ID
}

export const ComposerCollectionInfo = (props: ComposerCollectionInfoProps) => {
  const { collectionId } = props
  const { imageUrl: image } = useCollectionCoverArt({
    collectionId,
    size: SquareSizes.SIZE_150_BY_150
  })

  const { data: partialCollection } = useCollection(collectionId, {
    enabled: !!collectionId,
    select: (collection) =>
      pick(collection, ['playlist_name', 'playlist_owner_id'])
  })
  const { playlist_name, playlist_owner_id } = partialCollection ?? {}

  if (!partialCollection || !playlist_name || !playlist_owner_id) return null

  return (
    <ComposePreviewInfo
      title={playlist_name}
      userId={playlist_owner_id}
      image={image}
    />
  )
}
