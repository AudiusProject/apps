import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { useCanSendMessage, useIsGroupChat } from '@audius/common/hooks'
import { Status } from '@audius/common/models'
import type { ChatMessageWithExtras } from '@audius/common/models'
import {
  chatActions,
  chatSelectors,
  playbackSelectors
} from '@audius/common/store'
import {
  encodeUrlName,
  isEarliestUnread,
  chatCanFetchMoreMessages
} from '@audius/common/utils'
import { OptionalHashId, OptionalId, type ChatBlast } from '@audius/sdk'
import { Portal } from '@gorhom/portal'
import { useFocusEffect } from '@react-navigation/native'
import type { FlatListProps, LayoutChangeEvent } from 'react-native'
import {
  AppState,
  FlatList,
  Keyboard,
  Platform,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import { IconKebabHorizontal, IconMessage } from '@audius/harmony-native'
import { BOTTOM_BAR_HEIGHT } from 'app/components/bottom-tab-bar'
import {
  HeaderShadow,
  KeyboardAvoidingView,
  Screen,
  ScreenContent
} from 'app/components/core'
import LoadingSpinner from 'app/components/loading-spinner'
import { withManagedAccountRestriction } from 'app/components/manager-mode/ManagedAccountUnavailableScreen'
import { PLAY_BAR_HEIGHT } from 'app/components/now-playing-drawer'
import { light } from 'app/haptics'
import { useRoute } from 'app/hooks/useRoute'
import { useToast } from 'app/hooks/useToast'
import { setVisibility } from 'app/store/drawers/slice'
import { makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useThemePalette } from 'app/utils/theme'

import { ChatBlastAudienceDisplay } from './ChatBlastAudienceDisplay'
import { ChatBlastHeader } from './ChatBlastHeader'
import { ChatBlastSubHeader } from './ChatBlastSubHeader'
import { ChatMessageListItem } from './ChatMessageListItem'
import { ChatMessageSeparator } from './ChatMessageSeparator'
import { ChatTextInput } from './ChatTextInput'
import { ChatUnavailable } from './ChatUnavailable'
import { EmptyChatMessages } from './EmptyChatMessages'
import { GroupChatHeader } from './GroupChatHeader'
import { ReactionPopup } from './ReactionPopup'
import { UserChatHeader } from './UserChatHeader'
import {
  END_REACHED_MIN_MESSAGES,
  NEW_MESSAGE_TOAST_SCROLL_THRESHOLD,
  SCROLL_TO_BOTTOM_THRESHOLD
} from './constants'
import { useKeyboardAvoidingPlaybarStyle } from './hooks/useKeyboardAvoidingPlaybarStyle'

type ChatFlatListProps = FlatListProps<ChatMessageWithExtras>
type ChatListEventHandler<K extends keyof ChatFlatListProps> = NonNullable<
  ChatFlatListProps[K]
>

const {
  getChatMessages,
  getChat,
  getChatMessageById,
  getChatMessageByIndex,
  getReactionsPopupMessageId
} = chatSelectors
const {
  fetchLatestMessages,
  fetchMoreMessages,
  markChatAsRead,
  setReactionsPopupMessageId,
  fetchBlockers,
  fetchBlockees,
  fetchPermissions
} = chatActions
const { getHasTrack } = playbackSelectors

const INITIAL_MESSAGES_TO_RENDER = 20

const messages = {
  title: 'Messages',
  beginningReached: 'Beginning of Conversation',
  newMessage: (numMessages: number) =>
    `${numMessages} New Message${numMessages > 1 ? 's' : ''}`,
  newMessageReceived: 'New Message!'
}

const useStyles = makeStyles(({ spacing, palette, typography }) => ({
  keyboardAvoiding: {
    justifyContent: 'space-between'
  },
  listContainer: {
    flexGrow: 1,
    flexShrink: 1
  },
  listContentContainer: {
    display: 'flex',
    flexGrow: 1,
    paddingHorizontal: spacing(6)
  },
  composeView: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderColor: palette.neutralLight8
  },
  whiteBackground: {
    backgroundColor: palette.white,
    position: 'absolute',
    height: 500,
    flexGrow: 1,
    top: 0,
    left: 0,
    right: 0
  },
  composeTextContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: palette.neutralLight10,
    paddingLeft: spacing(4),
    borderRadius: spacing(1)
  },
  composeTextInput: {
    fontSize: typography.fontSize.medium,
    lineHeight: spacing(6),
    paddingTop: 0
  },
  icon: {
    width: spacing(7),
    height: spacing(7),
    fill: palette.primary
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
  emptyContainer: {
    display: 'flex',
    flexGrow: 1
  },
  userBadgeTitle: {
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontByWeight.bold,
    color: palette.neutral
  }
}))

type ContainerLayoutStatus = {
  top: number
  bottom: number
}

const getAutoscrollThreshold = ({ top, bottom }: ContainerLayoutStatus) => {
  return (bottom - top) / 4
}

const getNewMessageToastThreshold = (
  containerLayout: ContainerLayoutStatus
) => {
  return Platform.OS === 'ios'
    ? getAutoscrollThreshold(containerLayout)
    : NEW_MESSAGE_TOAST_SCROLL_THRESHOLD
}

const useGetLatestMessages = (
  chatId: string,
  dispatch: ReturnType<typeof useDispatch>
) => {
  const fetchLatestMessagesCallback = useCallback(() => {
    if (chatId) {
      dispatch(fetchLatestMessages({ chatId }))
    }
  }, [dispatch, chatId])

  useEffect(() => {
    console.debug('Fetching latest messages on first render')
    fetchLatestMessagesCallback()
  }, [fetchLatestMessagesCallback])

  useEffect(() => {
    const handle = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        console.debug(
          'App came back from background onto chat page, fetching latest messages'
        )
        fetchLatestMessagesCallback()
      }
    })

    return () => handle.remove()
  }, [fetchLatestMessagesCallback])
}

const ChatScreenContent = () => {
  const styles = useStyles()
  const palette = useThemePalette()
  const dispatch = useDispatch()
  const { toast } = useToast()

  const { params } = useRoute<'Chat'>()
  const { chatId, presetMessage } = params
  const url = `/chat/${encodeUrlName(chatId ?? '')}`

  const hasScrolledToUnreadTag = useRef(false)
  const flatListRef = useRef<FlatList<ChatMessageWithExtras>>(null)
  const itemsRef = useRef<Record<string, View | null>>({})
  const composeRef = useRef<View | null>(null)
  const chatContainerRef = useRef<View | null>(null)
  const messageTop = useRef(0)
  const messageHeight = useRef(0)
  const chatContainerTop = useRef(0)
  const chatContainerBottom = useRef(0)
  const scrollPosition = useRef(0)
  const latestMessageId = useRef('')
  const flatListInnerHeight = useRef(0)
  const insets = useSafeAreaInsets()

  const hasCurrentlyPlayingTrack = useSelector(getHasTrack)
  const { data: userId } = useCurrentUserId()
  const userIdEncoded = OptionalId.parse(userId)
  const chat = useSelector((state) => getChat(state, chatId ?? ''))
  const { is_blast: isBlast } = chat ?? {}
  const chatBlastWithContentOffset = isBlast ? spacing(6) : 0
  const chatMessages = useSelector((state) =>
    getChatMessages(state, chatId ?? '')
  )
  const isLoading = (chat?.messagesStatus ?? 'PENDING') === 'PENDING'
  const shouldShowEndReachedIndicator =
    !(chat?.messagesSummary?.prev_count ?? true) &&
    chatMessages.length > END_REACHED_MIN_MESSAGES &&
    flatListInnerHeight.current > chatContainerBottom.current
  const popupMessageId = useSelector(getReactionsPopupMessageId)
  const popupMessage = useSelector((state) =>
    getChatMessageById(state, chatId ?? '', popupMessageId ?? '')
  )
  const { canSendMessage, firstOtherUser: otherUser } =
    useCanSendMessage(chatId)
  const isGroup = useIsGroupChat(chatId)

  const chatFrozenRef = useRef(chat)

  useGetLatestMessages(chatId, dispatch)

  useEffect(() => {
    if (chat && chatId !== chatFrozenRef.current?.chat_id) {
      chatFrozenRef.current = chat
    }
  }, [chatId, chat])

  useEffect(() => {
    if (chatId) {
      dispatch(markChatAsRead({ chatId }))
    }
  }, [chatId, dispatch])

  useEffect(() => {
    dispatch(fetchBlockees())
    dispatch(fetchBlockers())
    if (otherUser?.user_id && !isGroup) {
      dispatch(fetchPermissions({ userIds: [otherUser.user_id] }))
    }
  }, [chatId, dispatch, otherUser?.user_id, isGroup])

  const earliestUnreadIndex = useMemo(
    () =>
      chatMessages?.findIndex((item, index) =>
        isEarliestUnread({
          unreadCount: chatFrozenRef?.current?.unread_message_count ?? 0,
          lastReadAt: chatFrozenRef?.current?.last_read_at,
          currentMessageIndex: index,
          messages: chatMessages,
          currentUserId: userIdEncoded ?? null
        })
      ),
    [chatMessages, userIdEncoded]
  )
  const earliestUnreadMessage = useSelector((state) =>
    getChatMessageByIndex(state, chatId, earliestUnreadIndex)
  )
  const earliestUnreadMessageId = earliestUnreadMessage?.message_id

  useEffect(() => {
    if (
      earliestUnreadIndex &&
      chatMessages &&
      earliestUnreadIndex > 0 &&
      earliestUnreadIndex < chatMessages.length &&
      !hasScrolledToUnreadTag.current
    ) {
      flatListRef.current?.scrollToIndex({
        index: earliestUnreadIndex,
        viewPosition: 0.95,
        animated: false
      })
      hasScrolledToUnreadTag.current = true
    }
  }, [earliestUnreadIndex, chatMessages])

  useFocusEffect(
    useCallback(() => {
      if (chat?.unread_message_count === 0) {
        flatListRef.current?.scrollToOffset({ offset: 0 })
      }
    }, [chat?.unread_message_count])
  )

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (chatId) {
          dispatch(markChatAsRead({ chatId }))
        }
        if (chatFrozenRef.current) {
          chatFrozenRef.current.unread_message_count = 0
        }
      }
    }, [chatId, dispatch])
  )

  const latestMessage = chatMessages.length > 0 ? chatMessages[0] : null

  useEffect(() => {
    if (latestMessage && latestMessage.message_id !== latestMessageId.current) {
      latestMessageId.current = latestMessage.message_id
      const isReceivedMessage =
        userIdEncoded && latestMessage.sender_user_id !== userIdEncoded
      if (
        isReceivedMessage &&
        scrollPosition.current >
          getNewMessageToastThreshold({
            bottom: chatContainerBottom.current,
            top: chatContainerTop.current
          })
      ) {
        toast({
          content: messages.newMessageReceived,
          type: 'info'
        })
      }
    }
  }, [latestMessage, latestMessageId, scrollPosition, userIdEncoded, toast])

  const handleScrollToIndexFailed = useCallback<
    ChatListEventHandler<'onScrollToIndexFailed'>
  >((e) => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: e.index,
        viewPosition: 0.95,
        animated: false
      })
    }, 10)
  }, [])

  const handleScrollToTop = useCallback(() => {
    if (
      chatId &&
      chatCanFetchMoreMessages(
        chat?.messagesStatus,
        chat?.messagesSummary?.prev_count
      )
    ) {
      dispatch(fetchMoreMessages({ chatId }))
    }
  }, [chat?.messagesStatus, chat?.messagesSummary, chatId, dispatch])

  const handleScroll = useCallback<ChatListEventHandler<'onScroll'>>(
    (event) => {
      scrollPosition.current = event.nativeEvent.contentOffset.y
      if (scrollPosition.current < SCROLL_TO_BOTTOM_THRESHOLD && chatId) {
        dispatch(markChatAsRead({ chatId }))
      }
    },
    [chatId, dispatch]
  )

  const handleTopRightPress = () => {
    Keyboard.dismiss()
    dispatch(
      setVisibility({
        drawer: 'ChatActions',
        visible: true,
        data: { userId: otherUser?.user_id, chatId }
      })
    )
  }

  const onCloseReactionPopup = useCallback(() => {
    dispatch(setReactionsPopupMessageId({ messageId: null }))
  }, [dispatch])

  const handleMessagePress = useCallback(
    async (id: string) => {
      if (chat?.is_blast || !canSendMessage) return

      const messageRef = itemsRef.current[id]
      if (messageRef === null || messageRef === undefined) {
        return
      }

      messageRef.measure((x, y, width, height, pageX, pageY) => {
        messageTop.current = pageY - spacing(2)
        messageHeight.current = height
        dispatch(setReactionsPopupMessageId({ messageId: id }))
        light()
      })
    },
    [canSendMessage, chat?.is_blast, dispatch]
  )

  const topBarRight = !isBlast ? (
    <TouchableOpacity onPress={handleTopRightPress} hitSlop={spacing(2)}>
      <IconKebabHorizontal fill={palette.neutralLight4} />
    </TouchableOpacity>
  ) : null

  const groupMessages = isGroup ? chatMessages : undefined

  const renderItem = useCallback(
    ({ item, index }) => (
      <>
        <ChatMessageListItem
          messageId={item.message_id}
          chatId={chatId}
          itemsRef={itemsRef}
          isPopup={false}
          onLongPress={handleMessagePress}
          isGroup={isGroup}
          previousMessageId={groupMessages?.[index + 1]?.message_id}
        />
        {item.message_id === earliestUnreadMessageId &&
        chatFrozenRef.current?.unread_message_count ? (
          <ChatMessageSeparator
            content={messages.newMessage(
              chatFrozenRef.current?.unread_message_count
            )}
          />
        ) : null}
      </>
    ),
    [
      earliestUnreadMessageId,
      handleMessagePress,
      chatId,
      isGroup,
      groupMessages
    ]
  )

  const maintainVisibleContentPosition = useMemo(
    () => ({
      minIndexForVisible: 0,
      autoscrollToTopThreshold: getAutoscrollThreshold({
        top: chatContainerTop.current,
        bottom: chatContainerBottom.current
      })
    }),
    []
  )

  const measureChatContainerBottom = useCallback(() => {
    composeRef.current?.measure((x, y, width, height, pageX, pageY) => {
      chatContainerBottom.current = pageY
    })
  }, [])

  const measureChatContainerTop = useCallback(() => {
    chatContainerRef.current?.measure((x, y, width, height, pageX, pageY) => {
      chatContainerTop.current = pageY
    })
  }, [])

  const handleOnContentSizeChanged = useCallback(
    (contentWidth, contentHeight) => {
      flatListInnerHeight.current = contentHeight
    },
    []
  )

  const handleFlatListLayout = useCallback((event: LayoutChangeEvent) => {
    flatListInnerHeight.current = event.nativeEvent.layout.height
  }, [])

  const handleMessageSent = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
    }, 0)
  }, [flatListRef])

  const keyboardAvoidingPlaybarStyle = useKeyboardAvoidingPlaybarStyle()

  return (
    <Screen
      url={url}
      headerTitle={
        isBlast
          ? () => <ChatBlastHeader chat={chat as ChatBlast} />
          : isGroup
            ? () => <GroupChatHeader chatId={chatId} />
            : otherUser
              ? () => <UserChatHeader user={otherUser} />
              : () => (
                  <Text style={styles.userBadgeTitle}>{messages.title}</Text>
                )
      }
      icon={otherUser || isGroup ? undefined : IconMessage}
      topbarRight={topBarRight}
    >
      <ScreenContent>
        {isBlast ? <ChatBlastSubHeader chat={chat as ChatBlast} /> : null}
        <HeaderShadow />
        {/* Everything inside the portal displays on top of all other screen contents. */}
        <Portal hostName='ChatReactionsPortal'>
          {canSendMessage && popupMessage ? (
            <ReactionPopup
              chatId={chatId}
              messageTop={messageTop.current}
              messageHeight={messageHeight.current}
              containerTop={chatContainerTop.current}
              containerBottom={chatContainerBottom.current}
              isAuthor={
                OptionalHashId.parse(popupMessage?.sender_user_id) === userId
              }
              message={popupMessage}
              onClose={onCloseReactionPopup}
            />
          ) : null}
        </Portal>
        <View ref={chatContainerRef} onLayout={measureChatContainerTop}>
          <KeyboardAvoidingView
            keyboardShowingOffset={
              hasCurrentlyPlayingTrack
                ? PLAY_BAR_HEIGHT + BOTTOM_BAR_HEIGHT + insets.bottom
                : BOTTOM_BAR_HEIGHT + insets.bottom
            }
            style={[styles.keyboardAvoiding, keyboardAvoidingPlaybarStyle]}
            onKeyboardHide={measureChatContainerBottom}
            onKeyboardShow={measureChatContainerBottom}
          >
            {isLoading ? (
              <View style={styles.loadingSpinnerContainer}>
                <LoadingSpinner style={styles.loadingSpinner} />
              </View>
            ) : (
              <View style={styles.listContainer}>
                <FlatList
                  onLayout={handleFlatListLayout}
                  contentContainerStyle={styles.listContentContainer}
                  data={chatMessages}
                  keyExtractor={(message) => message.message_id}
                  onContentSizeChange={handleOnContentSizeChanged}
                  renderItem={renderItem}
                  onEndReached={handleScrollToTop}
                  inverted
                  initialNumToRender={Math.max(
                    INITIAL_MESSAGES_TO_RENDER,
                    (earliestUnreadIndex ?? 0) + INITIAL_MESSAGES_TO_RENDER
                  )}
                  ref={flatListRef}
                  onScroll={handleScroll}
                  onScrollToIndexFailed={handleScrollToIndexFailed}
                  refreshing={chat?.messagesStatus === Status.LOADING}
                  keyboardShouldPersistTaps='handled'
                  maintainVisibleContentPosition={
                    maintainVisibleContentPosition
                  }
                  ListEmptyComponent={
                    !chat?.is_blast ? (
                      <View style={styles.emptyContainer}>
                        <EmptyChatMessages />
                      </View>
                    ) : null
                  }
                  ListHeaderComponent={
                    !canSendMessage && !isGroup ? (
                      <ChatUnavailable chatId={chatId} />
                    ) : null
                  }
                  ListFooterComponent={
                    chat?.is_blast ? (
                      <ChatBlastAudienceDisplay chat={chat as ChatBlast} />
                    ) : shouldShowEndReachedIndicator ? (
                      <ChatMessageSeparator
                        content={messages.beginningReached}
                      />
                    ) : null
                  }
                  scrollEnabled={popupMessageId == null}
                  removeClippedSubviews
                  windowSize={5}
                />
              </View>
            )}

            {canSendMessage && chat ? (
              <View
                style={styles.composeView}
                onLayout={measureChatContainerBottom}
                ref={composeRef}
                pointerEvents={'box-none'}
              >
                <View style={styles.whiteBackground} />
                <ChatTextInput
                  extraOffset={chatBlastWithContentOffset}
                  chatId={chatId}
                  presetMessage={presetMessage}
                  onMessageSent={handleMessageSent}
                />
              </View>
            ) : null}
          </KeyboardAvoidingView>
        </View>
      </ScreenContent>
    </Screen>
  )
}

export const ChatScreen = withManagedAccountRestriction(ChatScreenContent)
