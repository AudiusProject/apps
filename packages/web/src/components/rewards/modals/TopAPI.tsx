import { useCallback } from 'react'

import { registerNiceModalId } from '@audius/common/services'
import { route } from '@audius/common/utils'
import { Button, IconArrowRight as IconArrow } from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'

import AudiusAPI from 'assets/img/audiusAPI.png'
import ModalDrawer from 'components/modal-drawer/ModalDrawer'
import { useWithMobileStyle } from 'hooks/useWithMobileStyle'

import styles from './TopApi.module.css'

const { AUDIUS_API_LINK } = route

const messages = {
  modalTitle: 'Audius API',
  title: "It's easy to build your own app on Audius",
  description: 'The top 10 Audius API apps each month win',
  button: 'Learn More About The Audius API'
}

const TopAPIBody = () => {
  const wm = useWithMobileStyle(styles.mobile)

  const onClickAudiusAPI = useCallback(() => {
    window.open(AUDIUS_API_LINK, '_blank')
  }, [])

  return (
    <div className={wm(styles.container)}>
      <img src={AudiusAPI} alt='Audius API Logo' />
      <span className={styles.title}>{messages.title}</span>
      <span className={styles.subtitle}>{messages.description}</span>
      <Button
        variant='primary'
        onClick={onClickAudiusAPI}
        iconRight={IconArrow}
      >
        {messages.button}
      </Button>
    </div>
  )
}

const TopAPIModal = NiceModal.create(() => {
  const modal = useModal()

  return (
    <ModalDrawer
      isOpen={modal.visible}
      onClose={() => modal.hide()}
      title={messages.modalTitle}
      isFullscreen={false}
      showTitleHeader
      showDismissButton
    >
      <TopAPIBody />
    </ModalDrawer>
  )
})

NiceModal.register('APIRewardsExplainer', TopAPIModal)
registerNiceModalId('APIRewardsExplainer')

export default TopAPIModal
