import { useCallback, useEffect, useState } from 'react'

import { Status } from '@audius/common/models'
import { chatActions, chatSelectors, InboxTab } from '@audius/common/store'
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
import { InboxTabs } from './InboxTabs'

const {
  getChats,
  getChatsStatus,
  getHasMoreChats,
  getPriorityInboxChats,
  getGeneralInboxChats
} = chatSelectors
const { fetchMoreMessages, fetchLatestChats, fetchMoreChats } = chatActions

const CHATS_MESSAGES_PREFETCH_LIMIT = 10
/**
 * Chats are paginated by recency across all categories, so a tab can be
 * empty while older pages still hold chats that belong in it. Keep fetching
 * until the tab has at least this many rows or there is nothing left.
 */
const MIN_VISIBLE_CHATS_PER_TAB = 10
// Precalculated height for perf optimization
const CHAT_ITEM_HEIGHT = 88 // Calculated height: pv='l' (32px) + ProfilePicture unit12 (48px) + text/margins (~8px)

const messages = {
  title: 'Messages',
  startConversation: 'Start a Conversation!',
  connect:
    'Connect with other Audius users by\nstarting a private direct message!',
  writeMessage: 'Write a Message',
  nothingHere: 'Nothing Here Yet',
  priorityEmpty:
    'New conversations, and ones you mark as Priority, show up here.',
  generalEmpty: 'Conversations you mark as General show up here.'
}

const emptyMessageForTab: Record<InboxTab, string> = {
  [InboxTab.PRIORITY]: messages.priorityEmpty,
  [InboxTab.GENERAL]: messages.generalEmpty
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

const TabEmpty = ({ tab }: { tab: InboxTab }) => {
  const styles = useStyles()
  return (
    <View style={styles.startConversationContainer}>
      <Text style={styles.startConversationTitle} fontSize='xxl' weight='bold'>
        {messages.nothingHere}
      </Text>
      <Text style={styles.connect} fontSize='medium'>
        {emptyMessageForTab[tab]}
      </Text>
    </View>
  )
}

export const ChatListScreen = () => {
  const styles = useStyles()
  const palette = useThemePalette()
  const dispatch = useDispatch()
  const navigation = useNavigation<AppTabScreenParamList>()
  const chats = useSelector(getChats)
  const [currentTab, setCurrentTab] = useState<InboxTab>(InboxTab.PRIORITY)
  const tabChats = useSelector(
    currentTab === InboxTab.GENERAL
      ? getGeneralInboxChats
      : getPriorityInboxChats
  )
  const nonEmptyChats = tabChats.filter((chat) => !!chat.last_message_at)
  const chatsStatus = useSelector(getChatsStatus)
  const hasMore = useSelector(getHasMoreChats)
  const hasAnyChats = chats.length > 0

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

  // Backfill the current tab from older pages when it is nearly empty
  const needsBackfill =
    hasMore && nonEmptyChats.length < MIN_VISIBLE_CHATS_PER_TAB
  useEffect(() => {
    if (chatsStatus === Status.SUCCESS && needsBackfill) {
      dispatch(fetchMoreChats())
    }
  }, [chatsStatus, needsBackfill, dispatch])

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
            <InboxTabs currentTab={currentTab} onSelectTab={setCurrentTab} />
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
                  ListEmptyComponent={() =>
                    hasMore && chatsStatus !== Status.ERROR ? (
                      // Still backfilling this tab from older pages
                      <>
                        <ChatListItemSkeleton index={0} shouldFade />
                        <ChatListItemSkeleton index={1} shouldFade />
                      </>
                    ) : hasAnyChats ? (
                      <TabEmpty tab={currentTab} />
                    ) : (
                      <ChatsEmpty onPress={navigateToChatUserList} />
                    )
                  }
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
