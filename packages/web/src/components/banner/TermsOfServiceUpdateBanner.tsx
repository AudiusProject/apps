import { useCallback, useState } from 'react'

import { route } from '@audius/common/utils'

import { CallToActionBanner } from './CallToActionBanner'

const { TERMS_OF_SERVICE } = route

const messages = {
  text: 'We’ve updated our Terms of Service. By continuing to use Audius, you agree to our updated Terms of Service'
}

const TOS_BANNER_LOCAL_STORAGE_KEY = 'dismissTermsOfServiceBanner10.5.25'

/**
 * Displays a CTA Banner announcing ToS Updates
 */
export const TermsOfServiceUpdateBanner = () => {
  const hasDismissed = window.localStorage.getItem(TOS_BANNER_LOCAL_STORAGE_KEY)
  const [isVisible, setIsVisible] = useState(!hasDismissed)

  const handleClose = useCallback(() => {
    setIsVisible(false)
    window.localStorage.setItem(TOS_BANNER_LOCAL_STORAGE_KEY, 'true')
  }, [])

  const handleAccept = useCallback(() => {
    window.open(TERMS_OF_SERVICE)
    handleClose()
  }, [handleClose])

  return isVisible ? (
    <CallToActionBanner
      text={messages.text}
      emoji='gear'
      size='small'
      onClose={handleClose}
      onAccept={handleAccept}
    />
  ) : null
}
