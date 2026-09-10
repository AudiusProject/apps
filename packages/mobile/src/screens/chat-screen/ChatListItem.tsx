import { useCallback, useMemo, useRef } from 'react'

import { useOtherChatUsers } from '@audius/common/api'
import { useProxySelector } from '@audius/common/hooks'
import { chatSelectors } from '@audius/common/store'
import { css } from '@emotion/native'
import { useTheme } from '@emotion/react'
import { TouchableHighlight } from 'react-native'
import ReanimatedSwipeable, {
  type SwipeableMethods
} from 'react-native-gesture-handler/ReanimatedSwipeable'
import { useDispatch } from 'react-redux'

import { Box, Flex, Text } from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { UserBadges } from 'app/components/user-badges'
import { useNavigation } from 'app/hooks/useNavigation'
import { setVisibility } from 'app/store/drawers/slice'

import type { AppTabScreenParamList } from '../app-screen'

import { ChatCategorySwipeActions } from './ChatCategorySwipeActions'
import { ChatListItemSkeleton } from './ChatListItemSkeleton'

const { getChat } = chatSelectors

const messages = {
  new: 'new'
}

const clipMessageCount = (count: number) => {
  if (count > 9) {
    return '9+'
  }
  return count.toString()
}

const useRemoveLeadingWhitespace = (message: string) => {
  return useMemo(() => message.replace(/^\s+/, ''), [message])
}

export const ChatListItem = ({ chatId }: { chatId: string }) => {
  const { spacing } = useTheme()
  const dispatch = useDispatch()
  const navigation = useNavigation<AppTabScreenParamList>()

  const chat = useProxySelector((state) => getChat(state, chatId), [chatId])
  const otherUsers = useOtherChatUsers(chatId)
  const otherUser = otherUsers[0]
  const lastMessage = useRemoveLeadingWhitespace(
    (!chat?.is_blast && chat?.last_message) || ''
  )
  const category = chat && !chat.is_blast ? (chat.category ?? null) : null
  const swipeableRef = useRef<SwipeableMethods>(null)

  const handlePress = useCallback(() => {
    navigation.push('Chat', { chatId })
  }, [navigation, chatId])

  const handleLongPress = useCallback(() => {
    if (!otherUser) return
    dispatch(
      setVisibility({
        drawer: 'ChatActions',
        visible: true,
        data: { userId: otherUser.user_id, chatId }
      })
    )
  }, [dispatch, otherUser, chatId])

  const closeSwipeable = useCallback(() => {
    swipeableRef.current?.close()
  }, [])

  // Swipe left to reveal Priority / General; long-press for the full menu.
  const renderRightActions = useCallback(
    () => (
      <ChatCategorySwipeActions
        chatId={chatId}
        category={category}
        onAction={closeSwipeable}
      />
    ),
    [chatId, category, closeSwipeable]
  )

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}
    >
      <TouchableHighlight onPress={handlePress} onLongPress={handleLongPress}>
        {otherUser ? (
          <Flex
            column
            pv='l'
            ph='xl'
            backgroundColor='white'
            borderBottom='default'
            w='100%'
          >
            <Flex row justifyContent='space-between' w='100%' gap='s'>
              <Flex row flex={1} justifyContent='space-between'>
                <ProfilePicture
                  userId={otherUser.user_id}
                  style={css({ width: spacing.unit12, height: spacing.unit12 })}
                />
                <Flex column pt='2xs' ml='s' mb='s' flex={1}>
                  <Flex row mb='xs' wrap='nowrap' alignItems='center' gap='xs'>
                    <Text
                      size='l'
                      strength='strong'
                      numberOfLines={1}
                      flexShrink={1}
                    >
                      {otherUser.name}
                    </Text>
                    <UserBadges userId={otherUser.user_id} badgeSize='xs' />
                  </Flex>
                  <Text size='s' numberOfLines={1}>
                    @{otherUser.handle}
                  </Text>
                </Flex>
              </Flex>
              {chat?.unread_message_count && chat?.unread_message_count > 0 ? (
                <Box style={css({ flexShrink: 0 })}>
                  <Flex
                    pv='xs'
                    ph='s'
                    borderRadius='xs'
                    backgroundColor='accent'
                    justifyContent='center'
                    alignItems='center'
                  >
                    <Text
                      variant='heading'
                      size='xs'
                      textTransform='uppercase'
                      strength='strong'
                      color='white'
                      style={css({ letterSpacing: 0.5 })}
                    >
                      {clipMessageCount(chat?.unread_message_count ?? 0)}{' '}
                      {messages.new}
                    </Text>
                  </Flex>
                </Box>
              ) : null}
            </Flex>
            <Text numberOfLines={1}>{lastMessage}</Text>
          </Flex>
        ) : (
          <ChatListItemSkeleton />
        )}
      </TouchableHighlight>
    </ReanimatedSwipeable>
  )
}
