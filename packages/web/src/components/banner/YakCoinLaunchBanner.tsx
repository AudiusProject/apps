import { useCallback, useState } from 'react'

import { coinPage } from '@audius/common/src/utils/route'
import { useLocalStorage } from 'react-use'

import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { CallToActionBanner } from './CallToActionBanner'

const YAK_COIN_LAUNCH_BANNER_LOCAL_STORAGE_KEY =
  'dismissYakCoinLaunchBanner11.10.25'

const messages = {
  pill: 'New',
  text: 'Kodak Black just launched $YAK coin! Check it out!'
}

export const YakCoinLaunchBanner = () => {
  const navigate = useNavigateToPage()
  const [isDismissed, setIsDismissed] = useLocalStorage(
    YAK_COIN_LAUNCH_BANNER_LOCAL_STORAGE_KEY,
    false
  )
  const [isVisible, setIsVisible] = useState(!isDismissed)

  const handleClose = useCallback(() => {
    setIsDismissed(true)
    setIsVisible(false)
  }, [setIsDismissed])

  const handleAccept = useCallback(() => {
    navigate(coinPage('YAK'))
    handleClose()
  }, [handleClose, navigate])

  return isVisible ? (
    <CallToActionBanner
      pill={messages.pill}
      text={messages.text}
      onAccept={handleAccept}
      onClose={handleClose}
    />
  ) : null
}
