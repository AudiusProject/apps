import { useCallback, useEffect, useRef } from 'react'

import { useCanSendMessage } from '@audius/common/hooks'
import { chatActions, chatSelectors } from '@audius/common/store'
import { ResizeObserver } from '@juggle/resize-observer'
import { useDispatch } from 'react-redux'
import { useParams, useLocation, useNavigate } from 'react-router'
import useMeasure from 'react-use-measure'

import Page from 'components/page/Page'
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
import { CreateChatPrompt } from './components/CreateChatPrompt'
import { SkeletonChatPage as MobileChatPage } from './components/mobile/SkeletonChatPage'

const { fetchPermissions } = chatActions
const { getChat } = chatSelectors

const messages = {
  messages: 'Messages'
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

  // Get the height of the header so we can slide the messages list underneath it for the blur effect
  const [headerRef, headerBounds] = useMeasure({
    polyfill: ResizeObserver,
    offsetSize: true
  })
  const messagesRef = useRef<HTMLDivElement>(null)

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
      header={<ChatHeader ref={headerRef} currentChatId={currentChatId} />}
    >
      <div className={styles.layout}>
        <div className={styles.chatList}>
          <ChatList
            className={styles.chatList}
            currentChatId={currentChatId}
            onChatClicked={handleChatClicked}
          />
        </div>
        <div className={styles.chatArea}>
          {currentChatId ? (
            <>
              <ChatMessageList
                ref={messagesRef}
                style={{
                  marginTop: `-${headerBounds.height}px`,
                  paddingTop: `${headerBounds.height}px`,
                  scrollPaddingTop: `${headerBounds.height}px`
                }}
                className={styles.messageList}
                chatId={currentChatId}
              />
              {chat?.is_blast || (canSendMessage && chat) ? (
                <ChatComposer
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
