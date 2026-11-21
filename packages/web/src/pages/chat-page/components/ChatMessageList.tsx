import {
  ComponentPropsWithoutRef,
  Fragment,
  useCallback,
  UIEvent,
  useEffect,
  forwardRef,
  useRef,
  useLayoutEffect,
  useState,
  useMemo
} from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { useCanSendMessage } from '@audius/common/hooks'
import { Status } from '@audius/common/models'
import { chatActions, chatSelectors } from '@audius/common/store'
import {
  hasTail,
  isEarliestUnread,
  isFirstInSenderRun,
  chatCanFetchMoreMessages
} from '@audius/common/utils'
import { Flex, Text } from '@audius/harmony'
import { HashId, OptionalId } from '@audius/sdk'
import { ResizeObserver } from '@juggle/resize-observer'
import cn from 'classnames'
import { throttle } from 'lodash'
import { mergeRefs } from 'react-merge-refs'
import { useDispatch } from 'react-redux'
import useMeasure from 'react-use-measure'

import { useSelector } from 'common/hooks/useSelector'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'

import { ChatBlastAudienceDisplay } from './ChatBlastAudienceDisplay'
import styles from './ChatMessageList.module.css'
import { ChatMessageListItem } from './ChatMessageListItem'
import { InboxUnavailableMessage } from './InboxUnavailableMessage'
import { SendMessagePrompt } from './SendMessagePrompt'
import { StickyScrollList } from './StickyScrollList'

export const CONTENT_EXPANDED_LISTENER_KEY = 'audius:chat:content-expanded'
const SPINNER_HEIGHT = 48

const { fetchMoreMessages, markChatAsRead, setActiveChat } = chatActions
const { getChatMessages, getChat, getBlockees } = chatSelectors

const messages = {
  newMessages: (count: number) => `${count} New Message${count > 1 ? 's' : ''}`,
  endOfMessages: 'Beginning of Conversation'
}

type ChatMessageListProps = ComponentPropsWithoutRef<'div'> & {
  chatId?: string
}

const SCROLL_TOP_THRESHOLD = 800
const SCROLL_BOTTOM_THRESHOLD = 80
const THROTTLE_DURATION_MS = 500

const isScrolledNearBottom = (element: HTMLElement) => {
  const { scrollTop, clientHeight, scrollHeight } = element
  return scrollTop + clientHeight >= scrollHeight - SCROLL_BOTTOM_THRESHOLD
}

const isScrolledNearTop = (element: HTMLElement) => {
  return element.scrollTop < SCROLL_TOP_THRESHOLD
}

export const ChatMessageList = forwardRef<HTMLDivElement, ChatMessageListProps>(
  (props, forwardedRef) => {
    const { chatId, className: classNameProp, ...other } = props
    const dispatch = useDispatch()
    const chatMessages = useSelector((state) =>
      getChatMessages(state, chatId ?? '')
    )
    const { firstOtherUser, canSendMessage, callToAction } =
      useCanSendMessage(chatId)
    const chat = useSelector((state) => getChat(state, chatId ?? ''))
    const isGroup = !!chat && !chat.is_blast && !!chat.is_group
    const blockees = useSelector(getBlockees)
    const visibleMessages = useMemo(
      () =>
        isGroup && blockees.length > 0
          ? chatMessages?.filter(
              (m) => !blockees.includes(HashId.parse(m.sender_user_id))
            )
          : chatMessages,
      [chatMessages, isGroup, blockees]
    )
    const { data: userId } = useCurrentUserId()
    const currentUserId = OptionalId.parse(userId) ?? null
    const [unreadIndicatorEl, setUnreadIndicatorEl] =
      useState<HTMLDivElement | null>(null)
    const [, setLastScrolledChatId] = useState<string>()

    const ref = useRef<HTMLDivElement>(null)

    const [messageListRef, { height: messageListHeight }] = useMeasure({
      polyfill: ResizeObserver
    })

    useEffect(() => {
      if (chatId) {
        dispatch(markChatAsRead({ chatId }))
      }
    }, [chatId, dispatch])

    const chatFrozenRef = useRef(chat)
    useLayoutEffect(() => {
      if (chat && chatId !== chatFrozenRef.current?.chat_id) {
        chatFrozenRef.current = chat
      }
    }, [chat, chatId])

    const wasNearBottomRef = useRef<boolean>(true)

    const scrollHandler = useCallback(
      (e: UIEvent<HTMLDivElement>) => {
        if (!chatId) return

        const nearBottom = isScrolledNearBottom(e.target as HTMLDivElement)
        wasNearBottomRef.current = nearBottom
        if (nearBottom) {
          dispatch(markChatAsRead({ chatId }))
          dispatch(setActiveChat({ chatId }))
        } else {
          dispatch(setActiveChat({ chatId: null }))

          if (chat?.messagesSummary?.prev_count === undefined) {
            return
          }

          if (
            chatCanFetchMoreMessages(
              chat?.messagesStatus,
              chat?.messagesSummary?.prev_count
            ) &&
            isScrolledNearTop(e.target as HTMLDivElement)
          ) {
            dispatch(fetchMoreMessages({ chatId }))
          }
        }
      },
      [dispatch, chatId, chat?.messagesStatus, chat?.messagesSummary]
    )

    const throttledScrollHandler = useMemo(
      () =>
        throttle(scrollHandler, THROTTLE_DURATION_MS, {
          leading: true,
          trailing: true
        }),
      [scrollHandler]
    )

    useEffect(
      () => () => {
        throttledScrollHandler.cancel()
      },
      [throttledScrollHandler]
    )

    useLayoutEffect(() => {
      if (!ref.current) return
      if (wasNearBottomRef.current) {
        ref.current.scrollTo({ top: ref.current.scrollHeight })
      }
    }, [messageListHeight])

    useEffect(() => {
      const el = ref.current
      if (!el) return

      const handleExpanded = (e: Event) => {
        if (!wasNearBottomRef.current) return
        queueMicrotask(() => {
          el.scrollTo({ top: el.scrollHeight })
        })
      }
      window.addEventListener(CONTENT_EXPANDED_LISTENER_KEY, handleExpanded)
      return () => {
        window.removeEventListener(
          CONTENT_EXPANDED_LISTENER_KEY,
          handleExpanded
        )
      }
    }, [])

    const scrollIntoViewOnMount = useCallback((el: HTMLDivElement) => {
      if (el) {
        setUnreadIndicatorEl(el)
      }
    }, [])

    useLayoutEffect(() => {
      if (unreadIndicatorEl) {
        const listItemScrollContainer =
          unreadIndicatorEl.parentElement?.parentElement
        if (listItemScrollContainer) {
          listItemScrollContainer.scrollTop = Math.max(
            unreadIndicatorEl.offsetTop - 150,
            0
          )
        }

        setLastScrolledChatId(chatId)
      }
    }, [unreadIndicatorEl, chatId, setLastScrolledChatId])

    useEffect(() => {
      if (
        chatId &&
        (chat?.messagesStatus === Status.IDLE ||
          chat?.messagesStatus === 'PENDING' ||
          chat?.messagesStatus === undefined)
      ) {
        dispatch(fetchMoreMessages({ chatId }))
        dispatch(setActiveChat({ chatId }))
      }
      return () => {
        dispatch(setActiveChat({ chatId: null }))
      }
    }, [dispatch, chatId, chat?.messagesStatus])

    const autoFetchMoreGuardRef = useRef<{
      chatId: string
      prevCount: number
      messagesStatus?: Status | 'PENDING'
    } | null>(null)
    const prevCount = chat?.messagesSummary?.prev_count
    const messagesStatus = chat?.messagesStatus
    useEffect(() => {
      if (
        chatId &&
        ref.current &&
        ref.current.scrollHeight - SPINNER_HEIGHT <= ref.current.clientHeight &&
        prevCount &&
        prevCount > 0
      ) {
        const last = autoFetchMoreGuardRef.current
        if (
          last &&
          last.chatId === chatId &&
          last.prevCount === prevCount &&
          last.messagesStatus === messagesStatus
        ) {
          return
        }
        autoFetchMoreGuardRef.current = { chatId, prevCount, messagesStatus }
        dispatch(fetchMoreMessages({ chatId }))
      }
    }, [dispatch, chatId, prevCount, messagesStatus, chatMessages])

    const unreadMessageCount = chatFrozenRef.current?.unread_message_count ?? 0
    const showSendMessagePrompt =
      chat?.messagesStatus === Status.SUCCESS &&
      chatMessages?.length === 0 &&
      !chat?.is_blast

    return (
      <StickyScrollList
        ref={mergeRefs([forwardedRef, ref])}
        onScroll={throttledScrollHandler}
        className={cn(styles.root, classNameProp, {
          [styles.emptyStateRoot]: showSendMessagePrompt
        })}
        resetKey={chatId}
        updateKey={chatMessages}
        stickToBottom
        scrollBottomThreshold={SCROLL_BOTTOM_THRESHOLD}
        tabIndex={-1}
        {...other}
      >
        <div
          className={cn(styles.listRoot, {
            [styles.emptyListRoot]: showSendMessagePrompt
          })}
          ref={messageListRef}
        >
          {!canSendMessage && firstOtherUser ? (
            <InboxUnavailableMessage
              user={firstOtherUser}
              action={callToAction}
            />
          ) : null}
          {showSendMessagePrompt ? <SendMessagePrompt /> : null}
          {chatId &&
            visibleMessages?.map((message, i) => (
              <Fragment key={message.message_id}>
                <ChatMessageListItem
                  chatId={chatId}
                  message={message}
                  hasTail={hasTail(message, visibleMessages[i - 1])}
                  isGroup={isGroup}
                  isFirstInRun={isFirstInSenderRun(
                    message,
                    visibleMessages[i + 1]
                  )}
                />
                {/*
                  The separator has to come after the message to appear above it,
                  since the message list order is reversed in CSS
                */}
                {isEarliestUnread({
                  unreadCount: unreadMessageCount,
                  lastReadAt: chatFrozenRef.current?.last_read_at,
                  currentMessageIndex: i,
                  messages: visibleMessages,
                  currentUserId
                }) ? (
                  <div ref={scrollIntoViewOnMount} className={styles.separator}>
                    <span className={styles.tag}>
                      {messages.newMessages(unreadMessageCount)}
                    </span>
                  </div>
                ) : null}
              </Fragment>
            ))}
          {!chat?.messagesSummary || chat.messagesSummary.prev_count > 0 ? (
            <LoadingSpinner className={styles.spinner} />
          ) : (
            <Flex justifyContent='center' p='l'>
              <Text variant='body' size='m' color='subdued'>
                {messages.endOfMessages}
              </Text>
            </Flex>
          )}
          {chat?.is_blast ? <ChatBlastAudienceDisplay chat={chat} /> : null}
        </div>
      </StickyScrollList>
    )
  }
)
