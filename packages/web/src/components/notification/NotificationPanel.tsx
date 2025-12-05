import { useRef, useCallback, useEffect, RefObject } from 'react'

import {
  useMarkNotificationsAsViewed,
  useNotifications
} from '@audius/common/api'
import { Nullable } from '@audius/common/utils'
import {
  Scrollbar,
  IconNotificationOn as IconNotification,
  Popup,
  Flex,
  Text,
  LoadingSpinner
} from '@audius/harmony'
import InfiniteScroll from 'react-infinite-scroller'
import { useSelector } from 'react-redux'

import { getIsOpen as getIsUserListOpen } from 'store/application/ui/userListModal/selectors'
import zIndex from 'utils/zIndex'

import { EmptyNotifications } from './EmptyNotifications'
import { Notification } from './Notification'

const messages = {
  title: 'Notifications'
}

type NotificationPanelProps = {
  anchorRef: RefObject<HTMLButtonElement | null>
  isOpen: boolean
  onClose: () => void
}

const scrollbarId = 'notificationsPanelScroll'

const getScrollParent = () => {
  const scrollbarElement = window.document.getElementById(scrollbarId)
  return scrollbarElement || null
}

// The threshold of distance from the bottom of the scroll container in the
// notification panel before requesting `loadMore` for more notifications
const SCROLL_THRESHOLD = 1000

/** The notification panel displays the list of notifications w/ a
 * summary of each notification and a link to open the full
 * notification in a modal  */
export const NotificationPanel = ({
  anchorRef,
  isOpen,
  onClose
}: NotificationPanelProps) => {
  const {
    notifications,
    fetchNextPage,
    hasNextPage,
    isAllPending: isPending,
    isError,
    isFetchingNextPage
  } = useNotifications()

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, isFetchingNextPage])

  const isUserListOpen = useSelector(getIsUserListOpen)
  const { mutate: markAsViewed } = useMarkNotificationsAsViewed()

  const panelRef = useRef<Nullable<HTMLDivElement>>(null)

  const handleCheckClickInside = useCallback(
    (target: EventTarget) => {
      if (isUserListOpen) return true
      if (target instanceof Element) {
        return !!(
          panelRef.current?.contains(target) ||
          anchorRef.current?.contains(target)
        )
      }
      return false
    },
    [anchorRef, isUserListOpen]
  )

  useEffect(() => {
    if (isOpen) {
      markAsViewed()
    }
  }, [isOpen, markAsViewed])

  const userHasNoNotifications =
    (!isPending || isError) && notifications.length === 0

  return (
    <Popup
      anchorRef={anchorRef}
      isVisible={isOpen}
      checkIfClickInside={handleCheckClickInside}
      onClose={onClose}
      transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      shadow='far'
      zIndex={zIndex.NAVIGATOR_POPUP}
    >
      <Flex
        backgroundColor='default'
        column
        borderRadius='m'
        w={428}
        ref={panelRef}
      >
        <Flex
          inline
          justifyContent='center'
          alignItems='center'
          backgroundColor='accent'
          borderBottom='default'
          borderTopLeftRadius='m'
          borderTopRightRadius='m'
          p='s'
          gap='s'
        >
          <IconNotification color='white' size='xl' />
          <Text
            variant='label'
            size='xl'
            strength='strong'
            color='white'
            lineHeight='single'
          >
            {messages.title}
          </Text>
        </Flex>

        <Scrollbar css={{ maxHeight: 'calc(100vh - 333px)' }} id={scrollbarId}>
          <InfiniteScroll
            loadMore={handleLoadMore}
            hasMore={hasNextPage}
            initialLoad={isPending}
            useWindow={false}
            threshold={SCROLL_THRESHOLD}
            loader={
              <LoadingSpinner
                key='loading-spinner'
                size='xl'
                alignSelf='center'
                mv='xl'
              />
            }
            getScrollParent={getScrollParent}
            css={(theme) => ({
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.s,
              padding: theme.spacing.l,
              paddingTop: theme.spacing.xl,
              listStyleType: 'none'
            })}
            element='ul'
          >
            {userHasNoNotifications ? (
              <EmptyNotifications />
            ) : (
              notifications.map((notification) => {
                return (
                  <Notification
                    key={notification.id}
                    notification={notification}
                  />
                )
              })
            )}
          </InfiniteScroll>
        </Scrollbar>
      </Flex>
    </Popup>
  )
}
