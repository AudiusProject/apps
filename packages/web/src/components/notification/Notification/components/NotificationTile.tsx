import {
  MouseEventHandler,
  ReactEventHandler,
  ReactNode,
  useCallback
} from 'react'

import { Notification, useNotificationModal } from '@audius/common/store'
import { Paper } from '@audius/harmony'

type NotificationTileProps = {
  notification: Notification
  children: ReactNode
  onClick?: ReactEventHandler
  // When `true` do not close notification panel onClick
  disableClosePanel?: boolean
}

export const NotificationTile = (props: NotificationTileProps) => {
  const { onClick, children, disableClosePanel } = props
  const { onClose } = useNotificationModal()

  const handleClick: MouseEventHandler = useCallback(
    (event) => {
      onClick?.(event)
      if (!disableClosePanel) {
        onClose()
      }
    },
    [onClick, disableClosePanel, onClose]
  )

  return (
    <Paper column shadow='flat' p='l' onClick={handleClick} border='default'>
      {children}
    </Paper>
  )
}
