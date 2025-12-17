import { useCallback, useState } from 'react'

import { Name } from '@audius/common/models'
import { coinPage } from '@audius/common/src/utils/route'
import { useDispatch } from 'react-redux'
import { useLocalStorage } from 'react-use'

import { make } from 'common/store/analytics/actions'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { CallToActionBanner } from './CallToActionBanner'

const JAY_COIN_LAUNCH_BANNER_LOCAL_STORAGE_KEY =
  'dismissJayCoinLaunchBanner11.10.25'

const messages = {
  pill: 'New',
  text: 'Almighty Jay just launched $JAY coin! Check it out!'
}

export const JayCoinLaunchBanner = () => {
  const dispatch = useDispatch()
  const navigate = useNavigateToPage()
  const [isDismissed, setIsDismissed] = useLocalStorage(
    JAY_COIN_LAUNCH_BANNER_LOCAL_STORAGE_KEY,
    false
  )
  const [isVisible, setIsVisible] = useState(!isDismissed)

  const handleClose = useCallback(() => {
    setIsDismissed(true)
    setIsVisible(false)
  }, [setIsDismissed])

  const handleAccept = useCallback(() => {
    dispatch(make(Name.BANNER_JAY_COIN_LAUNCH_CLICKED, {}))
    navigate(coinPage('JAY'))
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
