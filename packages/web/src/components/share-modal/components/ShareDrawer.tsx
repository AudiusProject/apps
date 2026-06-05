import { useCallback } from 'react'

import { IconLink, IconShare, IconX } from '@audius/harmony'

import BottomSheetActionDrawer from 'components/action-drawer/BottomSheetActionDrawer'

import { messages } from '../messages'
import { ShareProps } from '../types'

import styles from './ShareDrawer.module.css'

const iconSize = { height: 26, width: 26 }

type ShareDrawerProps = ShareProps

export const ShareDrawer = ({
  onShareToX,
  onCopyLink,
  isOpen,
  onClose,
  shareType
}: ShareDrawerProps) => {
  const getActions = useCallback(() => {
    const shareToXAction = {
      text: messages.x,
      icon: <IconX {...iconSize} />,
      className: styles.shareToXAction,
      onClick: onShareToX
    }

    const copyLinkAction = {
      text: messages.copyLink,
      icon: <IconLink {...iconSize} />,
      className: styles.copyLinkAction,
      onClick: onCopyLink
    }

    return [shareToXAction, copyLinkAction]
  }, [onShareToX, onCopyLink])

  return (
    <BottomSheetActionDrawer
      renderTitle={() => (
        <div className={styles.titleContainer}>
          <IconShare className={styles.titleIcon} />
          <h2 className={styles.title}>{messages.modalTitle(shareType)}</h2>
        </div>
      )}
      actions={getActions()}
      onClose={onClose}
      isOpen={isOpen}
      classes={{ actionItem: styles.actionItem }}
      ariaLabel={messages.modalTitle(shareType)}
    />
  )
}
