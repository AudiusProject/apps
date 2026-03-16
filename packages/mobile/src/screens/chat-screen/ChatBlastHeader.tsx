import { useChatBlastAudienceContent } from '@audius/common/hooks'
import { formatCount } from '@audius/common/utils'
import type { ChatBlast } from '@audius/sdk/services'

import { Flex, Text, IconTowerBroadcast } from '@audius/harmony-native'

const messages = {
  chatBlastTitleAudienceCount: (audienceCount: number) =>
    `(${formatCount(audienceCount)})`
}

export const ChatBlastHeader = ({ chat }: { chat: ChatBlast }) => {
  const { chatBlastTitle, audienceCount } = useChatBlastAudienceContent({
    chat
  })
  return (
    <Flex row gap='s'>
      <IconTowerBroadcast color='default' />
      <Text variant='title'>{chatBlastTitle}</Text>
      {audienceCount ? (
        <Text variant='title' color='subdued'>
          {messages.chatBlastTitleAudienceCount(audienceCount)}
        </Text>
      ) : null}
    </Flex>
  )
}
