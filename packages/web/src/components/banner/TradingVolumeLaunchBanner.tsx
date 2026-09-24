import { useCallback, useState } from 'react'

import { useLocalStorage } from 'react-use'

import { CallToActionBanner } from './CallToActionBanner'

const TRADING_VOLUME_BANNER_LOCAL_STORAGE_KEY =
  'dismissTradingVolumeLaunchBanner11.03.25'

const messages = {
  pill: 'New',
  text: 'Collect coins to earn daily $AUDIO rewards! Season 1 is live now 🔥'
}

export const TradingVolumeLaunchBanner = () => {
  const [isDismissed, setIsDismissed] = useLocalStorage(
    TRADING_VOLUME_BANNER_LOCAL_STORAGE_KEY,
    false
  )
  const [isVisible, setIsVisible] = useState(!isDismissed)

  const handleClose = useCallback(() => {
    setIsDismissed(true)
    setIsVisible(false)
  }, [setIsDismissed])

  const handleAccept = useCallback(() => {
    window.open('https://season1.audius.co', '_blank')
    handleClose()
  }, [handleClose])

  return isVisible ? (
    <CallToActionBanner
      pill={messages.pill}
      text={messages.text}
      onAccept={handleAccept}
      onClose={handleClose}
    />
  ) : null
}
