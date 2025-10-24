import { useCallback } from 'react'

import { skipButtonMessages } from '@audius/common/messages'
import { route } from '@audius/common/utils'
import { Button } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { signUp } from 'common/store/pages/signon/actions'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

const { SIGN_UP_APP_CTA_PAGE } = route

export const SkipButton = () => {
  const navigate = useNavigateToPage()
  const dispatch = useDispatch()

  const handleSkip = useCallback(() => {
    // User is skipping genre/artist selection, create account now
    dispatch(signUp())
    navigate(SIGN_UP_APP_CTA_PAGE)
  }, [navigate, dispatch])

  return (
    <Button variant='secondary' fullWidth onClick={handleSkip}>
      {skipButtonMessages.skipThisStep}
    </Button>
  )
}
