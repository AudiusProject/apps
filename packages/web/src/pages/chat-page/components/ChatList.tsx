import {
  ComponentPropsWithoutRef,
  useCallback,
  useEffect,
  useState
} from 'react'

import { Status } from '@audius/common/models'
import { chatActions, chatSelectors, InboxTab } from '@audius/common/store'
import cn from 'classnames'
import InfiniteScroll from 'react-infinite-scroller'
import { useDispatch } from 'react-redux'

import { useSelector } from 'common/hooks/useSelector'

import styles from './ChatList.module.css'
import { ChatListBlastItem } from './ChatListBlastItem'
import { ChatListItem } from './ChatListItem'
import { SkeletonChatListItem } from './SkeletonChatListItem'

const { getChatsForInboxTab, getChatsStatus, getHasMoreChats } = chatSelectors
const { fetchMoreChats } = chatActions

const messages = {
  nothingHere: 'Nothing Here Yet',
  priorityEmpty:
    'New conversations, and ones you mark as Priority, show up here.',
  generalEmpty: 'Conversations you mark as General show up here.'
}

const emptyMessageForTab: Record<InboxTab, string> = {
  [InboxTab.PRIORITY]: messages.priorityEmpty,
  [InboxTab.GENERAL]: messages.generalEmpty
}

/**
 * Chats are paginated by recency across all categories, so a tab can be
 * empty while older pages still hold chats that belong in it. Keep fetching
 * until the tab has at least this many rows or there is nothing left.
 */
const MIN_VISIBLE_CHATS_PER_TAB = 10

type ChatListProps = {
  currentChatId?: string
  currentTab: InboxTab
  onChatClicked: (chatId: string) => void
  isCompact?: boolean
} & ComponentPropsWithoutRef<'div'>

export const ChatList = (props: ChatListProps) => {
  const { currentChatId, currentTab, onChatClicked, isCompact } = props
  const dispatch = useDispatch()
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const chats = useSelector((state) => getChatsForInboxTab(state, currentTab))
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

  // Backfill the current tab from older pages when it is nearly empty
  const needsBackfill = hasMore && chats.length < MIN_VISIBLE_CHATS_PER_TAB
  useEffect(() => {
    if (status === Status.SUCCESS && needsBackfill) {
      dispatch(fetchMoreChats())
    }
  }, [status, needsBackfill, dispatch])

  // While there are still pages to load, the InfiniteScroll loader (below)
  // shows skeletons, so only show the empty state once we've run out.
  const isEmptyTab =
    chats.length === 0 && hasLoadedOnce && (!hasMore || status === Status.ERROR)

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
        ) : isEmptyTab ? (
          <div className={styles.empty}>
            <div className={styles.header}>{messages.nothingHere}</div>
            <div className={styles.subheader}>
              {emptyMessageForTab[currentTab]}
            </div>
          </div>
        ) : hasLoadedOnce ? null : (
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
