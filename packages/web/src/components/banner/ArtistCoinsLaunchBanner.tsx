import { useCallback, useState } from 'react'

import { Name } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { CallToActionBanner } from './CallToActionBanner'

const ARTIST_COIN_BANNER_LOCAL_STORAGE_KEY =
  'dismissArtistCoinsLaunchBanner10.15.25'

const messages = {
  pill: 'New',
  text: 'Artist Coins Are LIVE! Click Here To See If Your Favorite Artist Launched'
}

export const ArtistCoinsLaunchBanner = () => {
  const dispatch = useDispatch()
  const navigate = useNavigateToPage()
  const hasDismissed = window.localStorage.getItem(
    ARTIST_COIN_BANNER_LOCAL_STORAGE_KEY
  )
  const [isVisible, setIsVisible] = useState(!hasDismissed)

  const handleClose = useCallback(() => {
    window.localStorage.setItem(ARTIST_COIN_BANNER_LOCAL_STORAGE_KEY, 'true')
    setIsVisible(false)
  }, [])

  const handleAccept = useCallback(() => {
    dispatch(make(Name.BANNER_ARTIST_COINS_LAUNCH_CLICKED, {}))
    navigate(route.COINS_EXPLORE_PAGE)
    handleClose()
  }, [dispatch, handleClose, navigate])

  return isVisible ? (
    <CallToActionBanner
      pill={messages.pill}
      text={messages.text}
      onAccept={handleAccept}
      onClose={handleClose}
    />
  ) : null
}
