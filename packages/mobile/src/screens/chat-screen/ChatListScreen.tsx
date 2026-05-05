import { useCallback, useEffect } from 'react'

import { Status } from '@audius/common/models'
import { chatActions, chatSelectors } from '@audius/common/store'
import { FlashList } from '@shopify/flash-list'
import { View, TouchableOpacity } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { Button, IconCompose, IconMessage } from '@audius/harmony-native'
import { Text, Screen, ScreenContent, HeaderShadow } from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { useNavigation } from 'app/hooks/useNavigation'
import type { AppTabScreenParamList } from 'app/screens/app-screen'
import { makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useThemePalette } from 'app/utils/theme'

import { ChatListBlastItem } from './ChatListBlastItem'
import { ChatListItem } from './ChatListItem'
import { ChatListItemSkeleton } from './ChatListItemSkeleton'

const { getChats, getChatsStatus, getHasMoreChats } = chatSelectors
const { fetchMoreMessages, fetchLatestChats, fetchMoreChats } = chatActions

const CHATS_MESSAGES_PREFETCH_LIMIT = 10
// Precalculated height for perf optimization
const CHAT_ITEM_HEIGHT = 88 // Calculated height: pv='l' (32px) + ProfilePicture unit12 (48px) + text/margins (~8px)

const messages = {
  title: 'Messages',
  startConversation: 'Start a Conversation!',
  connect:
    'Connect with other Audius users by\nstarting a private direct message!',
  writeMessage: 'Write a Message'
}

const useStyles = makeStyles(({ spacing, palette, typography }) => ({
  rootContainer: {
    display: 'flex',
    flexGrow: 1
  },
  loadingSpinnerContainer: {
    display: 'flex',
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingSpinner: {
    height: spacing(10),
    width: spacing(10)
  },
  listContainer: {
    display: 'flex',
    minHeight: '100%'
  },
  startConversationContainer: {
    marginVertical: spacing(8),
    marginHorizontal: spacing(4),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.neutralLight7,
    borderRadius: spacing(2),
    padding: spacing(6)
  },
  startConversationTitle: {
    textAlign: 'center',
    lineHeight: typography.fontSize.xxl * 1.3
  },
  connect: {
    textAlign: 'center',
    lineHeight: typography.fontSize.medium * 1.3,
    marginTop: spacing(2)
  },
  writeMessageButton: {
    marginTop: spacing(6)
  }
}))

const ChatsEmpty = ({ onPress }: { onPress: () => void }) => {
  const styles = useStyles()
  return (
    <View style={styles.startConversationContainer}>
      <Text style={styles.startConversationTitle} fontSize='xxl' weight='bold'>
        {messages.startConversation}
      </Text>
      <Text style={styles.connect} fontSize='medium' allowNewline>
        {messages.connect}
      </Text>
      <Button
        variant='primary'
        iconLeft={IconCompose}
        onPress={onPress}
        style={styles.writeMessageButton}
      >
        {messages.writeMessage}
      </Button>
    </View>
  )
}

export const ChatListScreen = () => {
  const styles = useStyles()
  const palette = useThemePalette()
  const dispatch = useDispatch()
  const navigation = useNavigation<AppTabScreenParamList>()
  const chats = useSelector(getChats)
  const nonEmptyChats = chats.filter((chat) => !!chat.last_message_at)
  const chatsStatus = useSelector(getChatsStatus)
  const hasMore = useSelector(getHasMoreChats)

  // If this is the first fetch, we want to show the fade-out loading skeleton
  // On subsequent loads, we want to show a skeleton in each incoming chat row.
  const isLoadingFirstTime =
    chats.length === 0 && (chatsStatus ?? Status.LOADING) === Status.LOADING
  const navigateToChatUserList = () => navigation.navigate('ChatUserList')
  const iconCompose = (
    <TouchableOpacity onPress={navigateToChatUserList} hitSlop={spacing(2)}>
      <IconCompose fill={palette.neutralLight4} />
    </TouchableOpacity>
  )

  const handleLoadMore = useCallback(() => {
    if (chatsStatus === Status.LOADING || !hasMore) return
    dispatch(fetchMoreChats())
  }, [hasMore, chatsStatus, dispatch])

  const refresh = useCallback(() => {
    dispatch(fetchLatestChats())
  }, [dispatch])

  // Prefetch messages for initial loaded chats
  useEffect(() => {
    if (
      chats.length > 0 &&
      chats.every(
        (chat) => !chat.messagesStatus || chat.messagesStatus === Status.IDLE
      )
    ) {
      chats.slice(0, CHATS_MESSAGES_PREFETCH_LIMIT).forEach((chat) => {
        dispatch(fetchMoreMessages({ chatId: chat.chat_id }))
      })
    }
  }, [chats, dispatch])

  useEffect(() => {
    refresh()
  }, [refresh])

  const renderItem = useCallback(({ item }) => {
    if (item.is_blast) {
      return <ChatListBlastItem chat={item} />
    }
    return <ChatListItem chatId={item.chat_id} />
  }, [])

  const keyExtractor = useCallback((chat) => chat.chat_id, [])

  return (
    <Screen
      url='/chat'
      title={messages.title}
      variant='secondary'
      icon={IconMessage}
      topbarRight={iconCompose}
    >
      <ScreenContent>
        <HeaderShadow />
        <ScreenPrimaryContent>
          <View style={styles.rootContainer}>
            {isLoadingFirstTime ? (
              Array(4)
                .fill(null)
                .map((_, index) => (
                  <ChatListItemSkeleton
                    key={index}
                    index={index}
                    shouldFade={true}
                  />
                ))
            ) : (
              <View style={styles.listContainer}>
                <FlashList
                  refreshing={chatsStatus === 'REFRESHING'}
                  onRefresh={refresh}
                  data={nonEmptyChats}
                  renderItem={renderItem}
                  keyExtractor={keyExtractor}
                  ListEmptyComponent={() => (
                    <ChatsEmpty onPress={navigateToChatUserList} />
                  )}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.7}
                  estimatedItemSize={CHAT_ITEM_HEIGHT}
                />
              </View>
            )}
          </View>
        </ScreenPrimaryContent>
      </ScreenContent>
    </Screen>
  )
}
