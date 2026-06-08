import {
  ComponentPropsWithoutRef,
  useCallback,
  useEffect,
  useState
} from 'react'

import { Status } from '@audius/common/models'
import { chatActions, chatSelectors } from '@audius/common/store'
import cn from 'classnames'
import InfiniteScroll from 'react-infinite-scroller'
import { useDispatch } from 'react-redux'

import { useSelector } from 'common/hooks/useSelector'

import styles from './ChatList.module.css'
import { ChatListBlastItem } from './ChatListBlastItem'
import { ChatListItem } from './ChatListItem'
import { SkeletonChatListItem } from './SkeletonChatListItem'

const { getChats, getChatsStatus, getHasMoreChats } = chatSelectors
const { fetchMoreChats } = chatActions

const messages = {
  nothingHere: 'Nothing Here Yet',
  start: 'Start a Conversation!'
}

type ChatListProps = {
  currentChatId?: string
  onChatClicked: (chatId: string) => void
  isCompact?: boolean
} & ComponentPropsWithoutRef<'div'>

export const ChatList = (props: ChatListProps) => {
  const { currentChatId, onChatClicked, isCompact } = props
  const dispatch = useDispatch()
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const chats = useSelector(getChats)
  const status = useSelector(getChatsStatus)
  const hasMore = useSelector(getHasMoreChats)

  const handleLoadMoreChats = useCallback(() => {
    dispatch(fetchMoreChats())
  }, [dispatch])

  useEffect(() => {
    if (status === Status.SUCCESS) {
      setHasLoadedOnce(true)
    }
  }, [status, setHasLoadedOnce])

  return (
    <div
      className={cn(styles.root, props.className, {
        [styles.compact]: isCompact
      })}
    >
      <InfiniteScroll
        pageStart={0}
        initialLoad={true}
        loadMore={handleLoadMoreChats}
        hasMore={hasMore}
        useWindow={false}
        loader={
          hasLoadedOnce ? (
            <div key='loading-skeletons'>
              <SkeletonChatListItem
                style={{ opacity: 0.5 }}
                isCompact={isCompact}
              />
              <SkeletonChatListItem
                style={{ opacity: 0.25 }}
                isCompact={isCompact}
              />
            </div>
          ) : undefined
        }
      >
        {chats?.length > 0 ? (
          chats.map((chat) =>
            chat.is_blast ? (
              <ChatListBlastItem
                key={chat.chat_id}
                chat={chat}
                onChatClicked={onChatClicked}
                currentChatId={currentChatId}
                isCompact={isCompact}
              />
            ) : (
              <ChatListItem
                key={chat.chat_id}
                currentChatId={currentChatId}
                chat={chat}
                onChatClicked={onChatClicked}
                isCompact={isCompact}
              />
            )
          )
        ) : hasLoadedOnce ? (
          <div className={styles.empty}>
            <div className={styles.header}>{messages.nothingHere}</div>
            <div className={styles.subheader}>{messages.start}</div>
          </div>
        ) : (
          <>
            <SkeletonChatListItem isCompact={isCompact} />
            <SkeletonChatListItem
              style={{ opacity: 0.5 }}
              isCompact={isCompact}
            />
            <SkeletonChatListItem
              style={{ opacity: 0.25 }}
              isCompact={isCompact}
            />
          </>
        )}
      </InfiniteScroll>
    </div>
  )
}
