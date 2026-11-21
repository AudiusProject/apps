import { useCallback, useState } from 'react'

import { useHasAccount } from '@audius/common/api'
import { Client } from '@audius/common/models'
import { useDispatch } from 'react-redux'

import { localStorage } from 'services/local-storage'
import { setVisibility as setAppModalCTAVisibility } from 'store/application/ui/app-cta-modal/slice'
import { getClient } from 'utils/clientUtil'

import { CallToActionBanner } from './CallToActionBanner'

const MOBILE_BANNER_LOCAL_STORAGE_KEY = 'dismissMobileAppBanner'

const messages = {
  text: 'Download the Audius App',
  pill: 'New'
}

export const DownloadAppBanner = () => {
  const dispatch = useDispatch()
  const hasAccount = useHasAccount()
  const hasDismissed = localStorage.getItem(MOBILE_BANNER_LOCAL_STORAGE_KEY)
  const isDesktopWeb = getClient() === Client.DESKTOP
  const [isVisible, setIsVisible] = useState(
    !hasDismissed && isDesktopWeb && !hasAccount
  )
  const handleClose = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem(MOBILE_BANNER_LOCAL_STORAGE_KEY, 'true')
  }, [])

  const handleAccept = useCallback(() => {
    dispatch(setAppModalCTAVisibility({ isOpen: true }))
    handleClose()
  }, [dispatch, handleClose])

  return isVisible ? (
    <CallToActionBanner
      text={messages.text}
      pill={messages.pill}
      emoji={'face-with-party-horn-and-party-hat'}
      onAccept={handleAccept}
      onClose={handleClose}
    />
  ) : null
}
