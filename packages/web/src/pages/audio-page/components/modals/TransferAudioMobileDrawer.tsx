import { useCallback } from 'react'

import { registerNiceModalId } from '@audius/common/services'
import { IconTokenGold as IconGold } from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'

import Drawer from 'components/drawer/Drawer'

import styles from './TransferAudioMobileDrawer.module.css'

const messages = {
  title: 'Transfer $AUDIO',
  subtitle: 'To transfer AUDIO please visit audius.co from a desktop browser'
}

const TransferAudioMobileDrawer = NiceModal.create(() => {
  const modal = useModal()
  const handleClose = useCallback(() => modal.hide(), [modal])

  return (
    <Drawer isOpen={modal.visible} onClose={handleClose}>
      <div className={styles.container}>
        <IconGold />
        <span className={styles.title}>{messages.title}</span>
        <span className={styles.subtitle}>{messages.subtitle}</span>
      </div>
    </Drawer>
  )
})

NiceModal.register('TransferAudioMobileWarning', TransferAudioMobileDrawer)
registerNiceModalId('TransferAudioMobileWarning')

export default TransferAudioMobileDrawer
