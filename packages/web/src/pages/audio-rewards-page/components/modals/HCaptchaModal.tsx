import { useCallback } from 'react'

import { audioRewardsPageActions, HCaptchaStatus } from '@audius/common/store'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useDispatch } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'
import { env } from 'services/env'

import styles from './HCaptchaModal.module.css'
import ModalDrawer from './ModalDrawer'
const { setHCaptchaStatus } = audioRewardsPageActions

const sitekey = env.HCAPTCHA_SITE_KEY

const messages = {
  title: 'Complete Captcha Verification'
}

export const HCaptchaModal = () => {
  const [isOpen, setOpen] = useModalState('HCaptcha')
  const dispatch = useDispatch()

  const handleClose = useCallback(
    (userInitiated = true) => {
      if (userInitiated) {
        dispatch(setHCaptchaStatus({ status: HCaptchaStatus.USER_CLOSED }))
      }
      setOpen(false)
    },
    [setOpen, dispatch]
  )

  const onVerify = useCallback(
    async (token: string) => {
      // TODO-NOW: Need to pass account user if exists
      const result = await audiusBackendInstance.updateHCaptchaScore(token)
      if (result.error) {
        dispatch(setHCaptchaStatus({ status: HCaptchaStatus.ERROR }))
      } else {
        dispatch(setHCaptchaStatus({ status: HCaptchaStatus.SUCCESS }))
      }
      handleClose(false)
    },
    [dispatch, handleClose]
  )

  return sitekey ? (
    <ModalDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title={messages.title}
      showTitleHeader
      dismissOnClickOutside
      showDismissButton
      bodyClassName={styles.modalBody}
    >
      <HCaptcha sitekey={sitekey} onVerify={onVerify} />
    </ModalDrawer>
  ) : null
}

export default HCaptchaModal
