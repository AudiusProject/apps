import {
  useAudienceUsers,
  useChatBlastAudienceContent
} from '@audius/common/hooks'
import type { User } from '@audius/common/models'
import type { ChatBlast } from '@audius/sdk/services'

import { Flex, Text, IconTowerBroadcast, Paper } from '@audius/harmony-native'

import { ProfilePictureList } from '../notifications-screen/Notification/NotificationProfilePictureList'

const USER_LIST_LIMIT = 7

const messages = {
  title: 'Send a Message Blast',
  description: 'Send direct messages in bulk.'
}

interface ChatBlastAudienceDisplayProps {
  chat: ChatBlast
}

export const ChatBlastAudienceDisplay = (
  props: ChatBlastAudienceDisplayProps
) => {
  const { chat } = props

  const { audienceCount } = useChatBlastAudienceContent({ chat })

  // Add 1 to the limit to ensure we have a bg photo for the overflow count
  const users = useAudienceUsers(chat, USER_LIST_LIMIT + 1)

  return (
    <Paper column gap='l' alignItems='center' p='xl' mh='l' mv='2xl'>
      <IconTowerBroadcast color='subdued' size='3xl' />
      <Text variant='heading' size='s'>
        {messages.title}
      </Text>
      <Flex row gap='xs' alignItems='center'>
        <Text size='l'>{messages.description}</Text>
      </Flex>
      {users.length ? (
        <ProfilePictureList
          users={users as User[]}
          totalUserCount={audienceCount ?? 0}
          limit={USER_LIST_LIMIT}
        />
      ) : null}
    </Paper>
  )
}
