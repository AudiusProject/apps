import { useCallback, useState } from 'react'

import { Name } from '@audius/common/models'
import { useDispatch } from 'react-redux'
import { useLocalStorage } from 'react-use'

import { make } from 'common/store/analytics/actions'

import { CallToActionBanner } from './CallToActionBanner'

const TRADING_VOLUME_BANNER_LOCAL_STORAGE_KEY =
  'dismissTradingVolumeLaunchBanner11.03.25'

const messages = {
  pill: 'New',
  text: 'Collect Artist Coins to earn daily $AUDIO rewards! Season 1 is live now 🔥'
}

export const TradingVolumeLaunchBanner = () => {
  const dispatch = useDispatch()
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
    dispatch(make(Name.BANNER_TRADING_VOLUME_LAUNCH_CLICKED, {}))
    window.open('https://season1.audius.co', '_blank')
    handleClose()
  }, [dispatch, handleClose])

  return isVisible ? (
    <CallToActionBanner
      pill={messages.pill}
      text={messages.text}
      onAccept={handleAccept}
      onClose={handleClose}
    />
  ) : null
}
