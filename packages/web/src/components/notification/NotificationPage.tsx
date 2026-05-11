import { useEffect, useContext, useCallback } from 'react'

import {
  useNotifications,
  useMarkNotificationsAsViewed
} from '@audius/common/api'
import { Notification as Notifications } from '@audius/common/store'
import { Flex, LoadingSpinner } from '@audius/harmony'
import InfiniteScroll from 'react-infinite-scroller'

import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, { LeftPreset } from 'components/nav/mobile/NavContext'

import { EmptyNotifications } from './EmptyNotifications'
import { Notification } from './Notification'

const messages = {
  documentTitle: 'Notifications',
  description: 'View your notifications on Audius',
  title: 'NOTIFICATIONS'
}

// The threshold of distance from the bottom of the scroll container in the
// notification panel before requesting `loadMore` for more notifications
const SCROLL_THRESHOLD = 300

/** The notification panel displays the list of notifications w/ a
 * summary of each notification and a link to open the full
 * notification in a modal  */
export const NotificationPage = () => {
  const {
    notifications,
    isPending,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useNotifications()

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, isFetchingNextPage])

  const { mutate: markAsViewed } = useMarkNotificationsAsViewed()

  const { setLeft, setCenter, setRight } = useContext(NavContext)!

  useEffect(() => {
    setLeft(LeftPreset.CLOSE)
    setRight(null)
    setCenter(messages.title)
  }, [setLeft, setCenter, setRight])

  useEffect(() => {
    markAsViewed()
  }, [markAsViewed])

  return (
    <MobilePageContainer
      title={messages.documentTitle}
      description={messages.description}
      fullHeight
    >
      {!isPending && notifications.length === 0 ? (
        <EmptyNotifications />
      ) : (
        <Flex
          as={InfiniteScroll}
          direction='column'
          p='l'
          backgroundColor='white'
          gap='s'
          // @ts-ignore
          pageStart={0}
          loadMore={handleLoadMore}
          hasMore={hasNextPage}
          useWindow={true}
          initialLoad={false}
          threshold={SCROLL_THRESHOLD}
          element='ul'
          css={{ listStyleType: 'none', textAlign: 'left' }}
        >
          {notifications
            .filter(({ isHidden }: any) => !isHidden)
            .map((notification: Notifications) => {
              return (
                <Notification
                  key={notification.id}
                  notification={notification}
                />
              )
            })}
          {isPending && <LoadingSpinner size='3xl' />}
        </Flex>
      )}
    </MobilePageContainer>
  )
}
