import { useChatBlastAudienceContent } from '@audius/common/hooks'
import { SquareSizes } from '@audius/common/models'
import { formatCount } from '@audius/common/utils'
import {
  Artwork,
  Flex,
  IconTowerBroadcast,
  IconUserList,
  Text
} from '@audius/harmony'
import { ChatBlast, OptionalHashId } from '@audius/sdk'

import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

export const ChatBlastHeader = ({ chat }: { chat: ChatBlast }) => {
  const {
    audience_content_id: audienceContentId,
    audience_content_type: audienceContentType
  } = chat
  const { chatBlastSecondaryTitle, chatBlastCTA, contentTitle, audienceCount } =
    useChatBlastAudienceContent({
      chat
    })
  const decodedId = OptionalHashId.parse(audienceContentId)
  const { imageUrl: albumArtwork } = useCollectionCoverArt({
    collectionId: decodedId,
    size: SquareSizes.SIZE_150_BY_150
  })
  const { imageUrl: trackArtwork } = useTrackCoverArt({
    trackId: decodedId,
    size: SquareSizes.SIZE_150_BY_150
  })

  return (
    <Flex justifyContent='space-between' w='100%' gap='l' css={{ minWidth: 0 }}>
      <Flex gap='s' alignItems='center' css={{ minWidth: 0, flex: 1 }}>
        {audienceContentId ? (
          <Artwork
            src={audienceContentType === 'track' ? trackArtwork : albumArtwork}
            w='48px'
            css={{ flexShrink: 0 }}
          />
        ) : null}
        <Flex
          column
          gap='xs'
          alignItems='flex-start'
          css={{ minWidth: 0, flex: 1 }}
        >
          <Flex
            gap='s'
            alignItems='center'
            css={{ minWidth: 0, width: '100%' }}
          >
            <IconTowerBroadcast size='m' color='default' />
            <Text variant='title' size='l' maxLines={1} css={{ minWidth: 0 }}>
              {chatBlastSecondaryTitle}
            </Text>
            <Text
              variant='title'
              size='l'
              color='subdued'
              maxLines={1}
              css={{ minWidth: 0 }}
            >
              {contentTitle}
            </Text>
          </Flex>
          <Text variant='body' size='s' maxLines={1} css={{ minWidth: 0 }}>
            {chatBlastCTA}
          </Text>
        </Flex>
      </Flex>
      <Flex alignItems='flex-end' css={{ flexShrink: 0 }}>
        {audienceCount ? (
          <Flex gap='s' alignItems='center'>
            <IconUserList size='m' color='default' />
            <Text variant='title' size='xl'>
              {formatCount(audienceCount)}
            </Text>
          </Flex>
        ) : null}
      </Flex>
    </Flex>
  )
}
