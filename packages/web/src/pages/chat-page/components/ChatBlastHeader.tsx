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
import { ChatBlast, OptionalHashId } from '@audius/sdk/services'

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
    <Flex justifyContent='space-between' w='100%'>
      <Flex gap='s' alignItems='center'>
        {audienceContentId ? (
          <Artwork
            src={audienceContentType === 'track' ? trackArtwork : albumArtwork}
            w='48px'
            css={{ flexShrink: 0 }}
          />
        ) : null}
        <Flex column gap='xs' alignItems='flex-start'>
          <Flex gap='s' alignItems='center'>
            <IconTowerBroadcast size='m' color='default' />
            <Text variant='title' size='l'>
              {chatBlastSecondaryTitle}
            </Text>
            <Text variant='title' size='l' color='subdued' maxLines={1}>
              {contentTitle}
            </Text>
          </Flex>
          <Text variant='body' size='s'>
            {chatBlastCTA}
          </Text>
        </Flex>
      </Flex>
      <Flex alignItems='flex-end'>
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
