import { useCallback } from 'react'

import { useChatBlastAudienceContent } from '@audius/common/hooks'
import { formatCount } from '@audius/common/utils'
import type { ChatBlast } from '@audius/sdk/services'
import { css } from '@emotion/native'
import { TouchableHighlight } from 'react-native'

import {
  Text,
  Flex,
  IconTowerBroadcast,
  IconUser,
  useTheme
} from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import type { AppTabScreenParamList } from '../app-screen'

const messages = {
  audience: 'audience'
}

export const ChatListBlastItem = ({ chat }: { chat: ChatBlast }) => {
  const { spacing } = useTheme()
  const navigation = useNavigation<AppTabScreenParamList>()
  const { chat_id: chatId } = chat

  const handlePress = useCallback(() => {
    navigation.push('Chat', { chatId })
  }, [navigation, chatId])

  const { audienceCount, contentTitle, chatBlastTitle } =
    useChatBlastAudienceContent({ chat })

  return (
    <TouchableHighlight onPress={handlePress}>
      <Flex
        ph='xl'
        pv='l'
        backgroundColor='white'
        borderBottom='default'
        gap='s'
      >
        <Flex row gap='s' w='100%' style={css({ overflow: 'hidden' })}>
          <IconTowerBroadcast
            width={spacing.xl}
            height={spacing.xl}
            color='default'
          />
          <Text variant='body' size='l' strength='strong'>
            {chatBlastTitle}
          </Text>
          {contentTitle ? (
            <Text variant='body' size='l' color='subdued' strength='strong'>
              {contentTitle}
            </Text>
          ) : null}
        </Flex>
        <Flex row justifyContent='space-between' w='100%'>
          <Text variant='label' textTransform='uppercase' color='subdued'>
            {messages.audience}
          </Text>
          {audienceCount ? (
            <Flex row gap='xs'>
              <IconUser width={spacing.l} height={spacing.l} color='subdued' />
              <Text variant='label' color='subdued'>
                {formatCount(audienceCount)}
              </Text>
            </Flex>
          ) : null}
        </Flex>
      </Flex>
    </TouchableHighlight>
  )
}
