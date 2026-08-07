import { useCallback, useEffect, useRef } from 'react'

import { useCanSendMessage } from '@audius/common/hooks'
import { Name, Status } from '@audius/common/models'
import { chatActions, chatSelectors } from '@audius/common/store'
import { ChatBlast, OptionalHashId } from '@audius/sdk'
import cn from 'classnames'
import { useDispatch } from 'react-redux'
import { useParams, useLocation, useNavigate } from 'react-router'

import Page from 'components/page/Page'
import { useIsContainerNarrow } from 'hooks/useIsContainerNarrow'
import { useIsMobile } from 'hooks/useIsMobile'
import { useManagedAccountNotAllowedRedirect } from 'hooks/useManagedAccountNotAllowedRedirect'
import { make, track } from 'services/analytics'
import { push } from 'utils/navigation'
import { useSelector } from 'utils/reducer'
import { chatPage } from 'utils/route'

import styles from './ChatPage.module.css'
import { ChatComposer } from './components/ChatComposer'
import { ChatHeader } from './components/ChatHeader'
import { ChatList } from './components/ChatList'
import { ChatMessageList } from './components/ChatMessageList'
import { ChatPaneHeader } from './components/ChatPaneHeader'
import { CreateChatPrompt } from './components/CreateChatPrompt'
import { SkeletonChatPage as MobileChatPage } from './components/mobile/SkeletonChatPage'

const { fetchPermissions } = chatActions
const { getChat, getChats, getChatsStatus } = chatSelectors

const messages = {
  messages: 'Messages'
}

const NARROW_LAYOUT_THRESHOLD_PX = 1080

// Local-storage key tracking which blast chat threads the user has already
// viewed, so the `Chat Blast: Message Viewed` event fires only once per blast.
const VIEWED_BLAST_CHATS_LOCAL_STORAGE_KEY = 'viewedBlastChats'

const getViewedBlastChats = (): string[] => {
  try {
    const raw = window.localStorage.getItem(
      VIEWED_BLAST_CHATS_LOCAL_STORAGE_KEY
    )
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const markBlastChatViewed = (chatId: string) => {
  try {
    const viewed = getViewedBlastChats()
    if (!viewed.includes(chatId)) {
      window.localStorage.setItem(
        VIEWED_BLAST_CHATS_LOCAL_STORAGE_KEY,
        JSON.stringify([...viewed, chatId])
      )
    }
  } catch {
    // Ignore local-storage write failures; worst case the event fires again.
  }
}

export const ChatPage = () => {
  useManagedAccountNotAllowedRedirect()
  const params = useParams<{ id?: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const currentChatId = params.id
  const presetMessage = (
    location.state as { presetMessage?: string } | undefined
  )?.presetMessage

  // All hooks must be called before any early returns
  const dispatch = useDispatch()
  const { firstOtherUser, canSendMessage } = useCanSendMessage(currentChatId)
  const chat = useSelector((state) => getChat(state, currentChatId ?? ''))

  const layoutRef = useRef<HTMLDivElement>(null)
  const isNarrowLayout = useIsContainerNarrow(
    layoutRef,
    NARROW_LAYOUT_THRESHOLD_PX
  )
  const messagesRef = useRef<HTMLDivElement>(null)

  const chats = useSelector(getChats)
  const chatsStatus = useSelector(getChatsStatus)
  // Only collapse the sidebar once we know for sure the account has no chats.
  // During LOADING / IDLE we keep the sidebar visible so the skeleton loader
  // still renders and we don't flash a layout shift.
  const hideChatList =
    chatsStatus === Status.SUCCESS && (chats?.length ?? 0) === 0

  const chatListClassName = cn(styles.chatList, {
    [styles.chatListCompact]: isNarrowLayout
  })

  // Navigate to new chats
  // Scroll to bottom if active chat is clicked again
  const handleChatClicked = useCallback(
    (chatId: string) => {
      if (chatId !== currentChatId) {
        dispatch(push(chatPage(chatId)))
      } else {
        messagesRef.current?.scrollTo({
          top: messagesRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }
    },
    [messagesRef, currentChatId, dispatch]
  )

  const handleMessageSent = useCallback(() => {
    // Set a timeout so that the date etc has a chance to render first
    setTimeout(() => {
      messagesRef.current?.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }, 0)
  }, [messagesRef])

  // Replace the preset message in browser history after the first navigation
  useEffect(() => {
    if (presetMessage) {
      navigate(location.pathname, {
        state: { presetMessage: undefined },
        replace: true
      })
    }
  }, [navigate, location.pathname, presetMessage])

  useEffect(() => {
    if (firstOtherUser && !isMobile) {
      dispatch(fetchPermissions({ userIds: [firstOtherUser.user_id] }))
    }
  }, [dispatch, firstOtherUser, isMobile])

  // Track when a user opens a blast DM thread. Fires once per blast per user.
  useEffect(() => {
    if (!currentChatId || !chat?.is_blast) return
    const viewed = getViewedBlastChats()
    if (viewed.includes(currentChatId)) return
    const blastChat = chat as ChatBlast
    markBlastChatViewed(currentChatId)
    track(
      make({
        eventName: Name.CHAT_BLAST_MESSAGE_VIEWED,
        isNativeMobile: false,
        chatId: currentChatId,
        audience: blastChat.audience,
        audienceContentType: blastChat.audience_content_type,
        audienceContentId:
          OptionalHashId.parse(blastChat.audience_content_id) ?? undefined
      })
    )
  }, [currentChatId, chat])

  if (isMobile) {
    return <MobileChatPage />
  }

  return (
    <Page
      title={`${firstOtherUser ? firstOtherUser.name + ' •' : ''} ${
        messages.messages
      }`}
      containerClassName={cn(styles.page, {
        [styles.narrowActiveChat]: isNarrowLayout && !!currentChatId
      })}
      contentClassName={styles.pageContent}
      showSearch={false}
      headerPadding={0}
      headerContentPaddingInline='0px'
      disableHeaderFrosted
      header={
        <ChatHeader
          currentChatId={currentChatId}
          isNarrowLayout={isNarrowLayout}
        />
      }
    >
      <div className={styles.layout} ref={layoutRef}>
        {hideChatList ? null : (
          <div className={chatListClassName}>
            <ChatList
              className={chatListClassName}
              currentChatId={currentChatId}
              isCompact={isNarrowLayout}
              onChatClicked={handleChatClicked}
            />
          </div>
        )}
        <div
          className={cn(styles.chatArea, {
            [styles.chatAreaNarrow]: isNarrowLayout
          })}
        >
          {currentChatId ? (
            <>
              {isNarrowLayout ? (
                <ChatPaneHeader
                  className={styles.chatPaneHeader}
                  isNarrowLayout
                  chatId={currentChatId}
                />
              ) : null}
              <ChatMessageList
                ref={messagesRef}
                className={styles.messageList}
                chatId={currentChatId}
              />
              {chat?.is_blast || (canSendMessage && chat) ? (
                <ChatComposer
                  className={styles.composer}
                  chatId={currentChatId}
                  onMessageSent={handleMessageSent}
                  presetMessage={presetMessage}
                />
              ) : null}
            </>
          ) : (
            <div className={styles.emptyState}>
              <CreateChatPrompt hasChats={!hideChatList} />
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}
