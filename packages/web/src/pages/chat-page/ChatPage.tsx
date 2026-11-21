import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { useOtherChatUsers } from '@audius/common/api'
import { useCanSendMessage, useIsGroupChat } from '@audius/common/hooks'
import { Status } from '@audius/common/models'
import { chatActions, chatSelectors, InboxTab } from '@audius/common/store'
import { formatGroupChatTitle } from '@audius/common/utils'
import { ResizeObserver } from '@juggle/resize-observer'
import cn from 'classnames'
import { useDispatch } from 'react-redux'
import { useParams, useLocation, useNavigate } from 'react-router'

import Page from 'components/page/Page'
import { useIsContainerNarrow } from 'hooks/useIsContainerNarrow'
import { useIsMobile } from 'hooks/useIsMobile'
import { useManagedAccountNotAllowedRedirect } from 'hooks/useManagedAccountNotAllowedRedirect'
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
const SCROLL_BOTTOM_THRESHOLD = 80

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

  const dispatch = useDispatch()
  const { firstOtherUser, canSendMessage } = useCanSendMessage(currentChatId)
  const isGroup = useIsGroupChat(currentChatId)
  const otherUsers = useOtherChatUsers(currentChatId)
  const chatTitle = isGroup
    ? formatGroupChatTitle(otherUsers)
    : firstOtherUser?.name
  const chat = useSelector((state) => getChat(state, currentChatId ?? ''))

  const layoutRef = useRef<HTMLDivElement>(null)
  const isNarrowLayout = useIsContainerNarrow(
    layoutRef,
    NARROW_LAYOUT_THRESHOLD_PX
  )
  const messagesRef = useRef<HTMLDivElement>(null)
  const chatAreaRef = useRef<HTMLDivElement>(null)
  const [composerEl, setComposerEl] = useState<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const chatArea = chatAreaRef.current
    if (!chatArea || !composerEl) return

    const update = () => {
      const height = composerEl.getBoundingClientRect().height
      const list = messagesRef.current
      const wasAtBottom =
        !!list &&
        list.scrollTop + list.clientHeight >=
          list.scrollHeight - SCROLL_BOTTOM_THRESHOLD
      chatArea.style.setProperty('--chat-composer-height', `${height}px`)
      if (list && wasAtBottom) {
        list.scrollTop = list.scrollHeight
      }
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(composerEl)
    return () => {
      observer.disconnect()
      chatArea.style.removeProperty('--chat-composer-height')
    }
  }, [composerEl])

  const chats = useSelector(getChats)
  const chatsStatus = useSelector(getChatsStatus)
  const [currentTab, setCurrentTab] = useState<InboxTab>(InboxTab.PRIORITY)
  const hideChatList =
    chatsStatus === Status.SUCCESS && (chats?.length ?? 0) === 0

  const chatListClassName = cn(styles.chatList, {
    [styles.chatListCompact]: isNarrowLayout
  })

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
    setTimeout(() => {
      messagesRef.current?.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }, 0)
  }, [messagesRef])

  useEffect(() => {
    if (presetMessage) {
      navigate(location.pathname, {
        state: { presetMessage: undefined },
        replace: true
      })
    }
  }, [navigate, location.pathname, presetMessage])

  useEffect(() => {
    if (firstOtherUser && !isMobile && !isGroup) {
      dispatch(fetchPermissions({ userIds: [firstOtherUser.user_id] }))
    }
  }, [dispatch, firstOtherUser, isMobile, isGroup])

  if (isMobile) {
    return <MobileChatPage />
  }

  return (
    <Page
      title={`${chatTitle ? chatTitle + ' •' : ''} ${messages.messages}`}
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
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
        />
      }
    >
      <div className={styles.layout} ref={layoutRef}>
        {hideChatList ? null : (
          <div className={chatListClassName}>
            <ChatList
              className={chatListClassName}
              currentChatId={currentChatId}
              currentTab={currentTab}
              isCompact={isNarrowLayout}
              onChatClicked={handleChatClicked}
            />
          </div>
        )}
        <div
          ref={chatAreaRef}
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
                  ref={setComposerEl}
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
