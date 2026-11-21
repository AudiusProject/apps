import { useCallback, useEffect, useState } from 'react'

import { SocialPlatform } from '@audius/common/models'
import { useDispatch } from 'react-redux'
import { AnyAction } from 'redux'

export const useSocialMediaLoader = ({
  linkedSocialOnThisPagePreviously,
  resetAction,
  page: _page
}: {
  linkedSocialOnThisPagePreviously: boolean
  resetAction?: () => AnyAction
  page?: 'create-email' | 'pick-handle'
}) => {
  const dispatch = useDispatch()
  const [isWaitingForSocialLogin, setIsWaitingForSocialLogin] = useState(false)

  useEffect(() => {
    if (linkedSocialOnThisPagePreviously && resetAction) {
      dispatch(resetAction())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch])

  const handleStartSocialMediaLogin = useCallback(
    (_platform?: SocialPlatform) => {
      setIsWaitingForSocialLogin(true)
    },
    []
  )

  const handleErrorSocialMediaLogin = useCallback(
    (_error?: Error, _platform?: SocialPlatform) => {
      setIsWaitingForSocialLogin(false)
    },
    []
  )

  return {
    isWaitingForSocialLogin,
    handleStartSocialMediaLogin,
    handleErrorSocialMediaLogin
  }
}
