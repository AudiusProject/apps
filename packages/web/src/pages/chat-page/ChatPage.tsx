import { useCallback, useEffect, useRef } from 'react'

import { useCanSendMessage } from '@audius/common/hooks'
import { chatActions, chatSelectors } from '@audius/common/store'
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
const { getChat } = chatSelectors

const messages = {
  messages: 'Messages'
}

const NARROW_LAYOUT_THRESHOLD_PX = 1080

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

  if (isMobile) {
    return <MobileChatPage />
  }

  return (
    <Page
      title={`${firstOtherUser ? firstOtherUser.name + ' •' : ''} ${
        messages.messages
      }`}
      containerClassName={styles.page}
      contentClassName={styles.pageContent}
      showSearch={false}
      headerPadding={0}
      headerContentPaddingInline='0px'
      header={
        <ChatHeader
          currentChatId={currentChatId}
          isNarrowLayout={isNarrowLayout}
        />
      }
    >
      <div className={styles.layout} ref={layoutRef}>
        <div className={chatListClassName}>
          <ChatList
            className={chatListClassName}
            currentChatId={currentChatId}
            isCompact={isNarrowLayout}
            onChatClicked={handleChatClicked}
          />
        </div>
        <div className={styles.chatArea}>
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
            <CreateChatPrompt />
          )}
        </div>
      </div>
    </Page>
  )
}
