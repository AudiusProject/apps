import {
  lazy,
  MouseEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  selectIsAccountComplete,
  useCurrentAccountUser,
  useHasAccount,
  useNotificationUnreadCount
} from '@audius/common/api'
import { Name } from '@audius/common/models'
import { useNotificationModal } from '@audius/common/store'
import { Flex, IconNotificationOn, NotificationCount } from '@audius/harmony'
import { useSearchParam } from 'react-use'

import { make, useRecord } from 'common/store/analytics/actions'
import { AnnouncementModal } from 'components/notification/AnnouncementModal'
import { useRequiresAccountFn } from 'hooks/useRequiresAccount'

import { canAccess } from './NavHeader'
import { NavHeaderButton } from './NavHeaderButton'

const loadNotificationPanel = () =>
  import('components/notification/NotificationPanel')
const NotificationPanel = lazy(() =>
  loadNotificationPanel().then((m) => ({ default: m.NotificationPanel }))
)

const messages = {
  label: (count: number) => `${count} unread notifications`
}

type NotificationsButtonProps = {
  size?: 'xs' | 's' | 'm' | 'l' | 'xl'
}

export const NotificationsButton = ({ size }: NotificationsButtonProps) => {
  const { data: notificationCount = 0 } = useNotificationUnreadCount()
  const hasAccount = useHasAccount()
  const { data: isAccountComplete = false } = useCurrentAccountUser({
    select: selectIsAccountComplete
  })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { isOpen, onOpen, onClose } = useNotificationModal()
  const [shouldMountPanel, setShouldMountPanel] = useState(false)
  if (isOpen && !shouldMountPanel) setShouldMountPanel(true)
  const handleMouseEnter = useCallback(() => setShouldMountPanel(true), [])

  const record = useRecord()
  const { requiresAccount } = useRequiresAccountFn(undefined, 'account')
  const shouldOpenNotifications = useSearchParam('openNotifications')

  useEffect(() => {
    if (shouldOpenNotifications) {
      onOpen()
    }
  }, [shouldOpenNotifications, onOpen])

  const handleToggleNotificationPanel = useCallback(
    (e: MouseEvent) => {
      if (!canAccess('account', hasAccount, isAccountComplete)) {
        e.preventDefault()
        requiresAccount()
        return
      }

      if (!isOpen) {
        onOpen()
        record(make(Name.NOTIFICATIONS_OPEN, { source: 'button' }))
      } else {
        onClose()
      }
    },
    [
      hasAccount,
      isAccountComplete,
      onOpen,
      record,
      requiresAccount,
      isOpen,
      onClose
    ]
  )

  const shouldShowCount = notificationCount > 0 && !isOpen
  const notificationButton = useMemo(() => {
    const button = (
      <NavHeaderButton
        ref={buttonRef}
        icon={IconNotificationOn}
        aria-label={messages.label(notificationCount)}
        isActive={isOpen}
        size={size}
      />
    )
    if (shouldShowCount) {
      return (
        <Flex
          css={{ cursor: 'pointer' }}
          onClick={() => onOpen()}
          onMouseEnter={handleMouseEnter}
        >
          <NotificationCount size='m' count={notificationCount}>
            {button}
          </NotificationCount>
        </Flex>
      )
    }
    return (
      <Flex
        onClick={handleToggleNotificationPanel}
        onMouseEnter={handleMouseEnter}
      >
        {button}
      </Flex>
    )
  }, [
    notificationCount,
    handleToggleNotificationPanel,
    isOpen,
    shouldShowCount,
    onOpen,
    handleMouseEnter,
    size
  ])

  return (
    <>
      {notificationButton}
      {shouldMountPanel ? (
        <Suspense fallback={null}>
          <NotificationPanel
            anchorRef={buttonRef}
            isOpen={isOpen}
            onClose={onClose}
          />
        </Suspense>
      ) : null}
      <AnnouncementModal />
    </>
  )
}
