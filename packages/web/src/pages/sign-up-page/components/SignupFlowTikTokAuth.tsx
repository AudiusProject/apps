import { ReactElement } from 'react'

import { Name, TikTokProfile } from '@audius/common'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { TikTokAuth } from 'components/tiktok-auth/TikTokAuthButton'

import { useSetProfileFromTikTok } from '../hooks/socialMediaLogin'

type SignupFlowTikTokAuthProps = {
  onFailure: (e: unknown) => void
  onSuccess: (info: { requiresReview: boolean; handle: string }) => void
  children: ReactElement
}

export const SignupFlowTikTokAuth = ({
  onFailure,
  onSuccess,
  children
}: SignupFlowTikTokAuthProps) => {
  const dispatch = useDispatch()

  const setProfileFromTikTok = useSetProfileFromTikTok()

  const handleError = (e: unknown) => {
    console.error(e)
    onFailure(e)
  }

  const handleTikTokLogin = async ({
    uuid,
    profile
  }: {
    uuid: string
    profile: TikTokProfile
  }) => {
    let res
    try {
      res = await setProfileFromTikTok({ uuid, tikTokProfile: profile })
    } catch (e) {
      handleError(e)
      return
    }
    onSuccess({
      requiresReview: res.requiresReview,
      handle: res.handle
    })
  }

  return (
    <TikTokAuth
      onClick={() => {
        dispatch(make(Name.CREATE_ACCOUNT_START_INSTAGRAM, {}))
      }}
      onFailure={handleError}
      onSuccess={(uuid, profile) => handleTikTokLogin({ uuid, profile })}
    >
      {children}
    </TikTokAuth>
  )
}
