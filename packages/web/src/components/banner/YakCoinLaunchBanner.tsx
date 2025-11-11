import { useCallback, useState } from 'react'

import { Name } from '@audius/common/models'
import { coinPage } from '@audius/common/src/utils/route'
import { useDispatch } from 'react-redux'
import { useLocalStorage } from 'react-use'

import { make } from 'common/store/analytics/actions'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { CallToActionBanner } from './CallToActionBanner'

const YAK_COIN_LAUNCH_BANNER_LOCAL_STORAGE_KEY =
  'dismissYakCoinLaunchBanner11.10.25'

const messages = {
  pill: 'New',
  text: 'Kodak Black just launched $YAK coin! Check it out!'
}

export const YakCoinLaunchBanner = () => {
  const dispatch = useDispatch()
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
    dispatch(make(Name.BANNER_YAK_COIN_LAUNCH_CLICKED, {}))
    navigate(coinPage('YAK'))
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
