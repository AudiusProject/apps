import { useOtherChatUsers } from '@audius/common/api'
import { formatGroupChatTitle } from '@audius/common/utils'
import { css } from '@emotion/native'
import { TouchableOpacity } from 'react-native'

import { Flex, Text, useTheme } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import type { AppTabScreenParamList } from '../app-screen'

import { GroupChatAvatars } from './GroupChatAvatars'

const messages = {
  members: (count: number) => `${count} members`
}

export const GroupChatHeader = ({ chatId }: { chatId: string }) => {
  const navigation = useNavigation<AppTabScreenParamList>()
  const { spacing } = useTheme()
  const otherUsers = useOtherChatUsers(chatId)

  return (
    <Flex style={css({ maxWidth: '70%' })}>
      <TouchableOpacity
        onPress={() => navigation.push('ChatMembers', { chatId })}
      >
        <Flex direction='row' alignItems='center' gap='s'>
          <GroupChatAvatars users={otherUsers} size={spacing.unit6} limit={3} />
          <Flex column style={css({ flexShrink: 1 })}>
            <Text variant='title' numberOfLines={1}>
              {formatGroupChatTitle(otherUsers)}
            </Text>
            <Text size='xs' color='subdued' numberOfLines={1}>
              {messages.members(otherUsers.length + 1)}
            </Text>
          </Flex>
        </Flex>
      </TouchableOpacity>
    </Flex>
  )
}
