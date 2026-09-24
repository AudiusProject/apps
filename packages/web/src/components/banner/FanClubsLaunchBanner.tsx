import { useCallback, useState } from 'react'

import { route } from '@audius/common/utils'
import { useLocalStorage } from 'react-use'

import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { CallToActionBanner } from './CallToActionBanner'

const FAN_CLUB_BANNER_LOCAL_STORAGE_KEY = 'dismissFanClubsLaunchBanner10.15.25'

const messages = {
  pill: 'New',
  text: 'Fan Clubs Are LIVE! See If Your Favorite Artist Launched One'
}

export const FanClubsLaunchBanner = () => {
  const navigate = useNavigateToPage()
  const [isDismissed, setIsDismissed] = useLocalStorage(
    FAN_CLUB_BANNER_LOCAL_STORAGE_KEY,
    false
  )
  const [isVisible, setIsVisible] = useState(!isDismissed)

  const handleClose = useCallback(() => {
    setIsDismissed(true)
    setIsVisible(false)
  }, [setIsDismissed])

  const handleAccept = useCallback(() => {
    navigate(route.CLUBS_EXPLORE_PAGE)
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
