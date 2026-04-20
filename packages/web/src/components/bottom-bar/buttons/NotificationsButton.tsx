import { memo } from 'react'

import { useNotificationUnreadCount } from '@audius/common/api'
import { formatCount } from '@audius/common/utils'
import { Flex, IconNotificationOn } from '@audius/harmony'

import StaticBottomButton from './StaticBottomButton'
import { ButtonProps } from './types'

const NotificationsButton = ({
  darkMode: _darkMode,
  isMatrixMode: _isMatrixMode,
  onClick,
  href,
  isActive,
  ...buttonProps
}: ButtonProps) => {
  const { data: notificationCount = 0 } = useNotificationUnreadCount()

  const badge =
    notificationCount > 0 ? (
      <Flex
        css={{
          position: 'absolute',
          top: -4,
          right: -8,
          backgroundColor: 'var(--harmony-red)',
          color: 'var(--harmony-white)',
          fontSize: '11px',
          fontWeight: 'bold',
          letterSpacing: '0.07px',
          lineHeight: '14px',
          padding: '0px 6px',
          borderRadius: '8px',
          pointerEvents: 'none'
        }}
      >
        {formatCount(notificationCount)}
      </Flex>
    ) : null

  return (
    <StaticBottomButton
      icon={IconNotificationOn}
      isActive={isActive}
      onClick={onClick}
      href={href}
      badge={badge}
      {...buttonProps}
    />
  )
}

export default memo(NotificationsButton)
