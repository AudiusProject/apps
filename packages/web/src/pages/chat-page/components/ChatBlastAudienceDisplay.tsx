import {
  useAudienceUsers,
  useChatBlastAudienceContent
} from '@audius/common/hooks'
import { User } from '@audius/common/models'
import {
  Text,
  IconTowerBroadcast,
  Paper,
  Flex,
  IconInfo
} from '@audius/harmony'
import { ChatBlast, ChatBlastAudience } from '@audius/sdk'

import { UserProfilePictureList } from 'components/notification/Notification/components/UserProfilePictureList'
import { Tooltip } from 'components/tooltip'
import {
  UserListEntityType,
  UserListType
} from 'store/application/ui/userListModal/types'

const USER_LIST_LIMIT = 10

const messages = {
  title: 'Send a Message Blast',
  description: 'Send direct messages in bulk.',
  tooltip: 'Replies will appear in your inbox as new threads.'
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

  const audienceType = chat.audience
  let userListType
  switch (audienceType) {
    case ChatBlastAudience.FOLLOWERS:
      userListType = UserListType.FOLLOWER
      break
    case ChatBlastAudience.TIPPERS:
      userListType = UserListType.SUPPORTER
      break
    case ChatBlastAudience.CUSTOMERS:
      userListType = UserListType.PURCHASER
      break
    case ChatBlastAudience.REMIXERS:
      userListType = UserListType.REMIXER
      break
    default:
      userListType = UserListType.FOLLOWER
  }

  return (
    <Flex row w='100%' justifyContent='center'>
      <Paper
        column
        gap='l'
        alignItems='center'
        p='xl'
        m='2xl'
        alignSelf='center'
        flex={1}
        css={{ maxWidth: 1080 }}
      >
        <IconTowerBroadcast color='subdued' size='3xl' />
        <Text variant='heading' size='s'>
          {messages.title}
        </Text>
        <Flex row gap='s' alignItems='center'>
          <Text size='l'>{messages.description}</Text>
          <Tooltip text={messages.tooltip}>
            <IconInfo color='subdued' size='s' />
          </Tooltip>
        </Flex>
        {users.length ? (
          <UserProfilePictureList
            users={users as User[]}
            totalUserCount={audienceCount ?? 0}
            limit={USER_LIST_LIMIT}
            userListType={userListType}
            userListEntityType={UserListEntityType.USER}
          />
        ) : null}
      </Paper>
    </Flex>
  )
}
