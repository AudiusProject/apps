import { useChatBlastAudienceContent } from '@audius/common/hooks'
import { SquareSizes } from '@audius/common/models'
import { OptionalHashId, type ChatBlast } from '@audius/sdk/services'
import { css } from '@emotion/native'

import { Flex, Text } from '@audius/harmony-native'
import { CollectionImage } from 'app/components/image/CollectionImage'
import { TrackImage } from 'app/components/image/TrackImage'
import { zIndex } from 'app/utils/zIndex'

export const ChatBlastSubHeader = ({ chat }: { chat: ChatBlast }) => {
  const {
    audience_content_id: audienceContentId,
    audience_content_type: audienceContentType
  } = chat
  const { chatBlastAudienceDescription, contentTitle } =
    useChatBlastAudienceContent({ chat })
  const decodedId = OptionalHashId.parse(audienceContentId)
  return (
    <Flex
      row
      backgroundColor='white'
      justifyContent='center'
      pb='s'
      style={css({ zIndex: zIndex.CHAT_BLAST_SUBHEADER })}
    >
      {decodedId ? (
        <Flex row gap='xs'>
          {audienceContentType === 'track' ? (
            <TrackImage
              trackId={decodedId}
              size={SquareSizes.SIZE_150_BY_150}
            />
          ) : (
            <CollectionImage
              collectionId={decodedId}
              size={SquareSizes.SIZE_150_BY_150}
            />
          )}
          <Text variant='body' size='s' strength='strong'>
            {contentTitle}
          </Text>
        </Flex>
      ) : (
        <Text variant='body' size='s' color='subdued'>
          {chatBlastAudienceDescription}
        </Text>
      )}
    </Flex>
  )
}
