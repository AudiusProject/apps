import { useCallback } from 'react'

import { User } from '@audius/common/models'
import { Nullable, route } from '@audius/common/utils'
import { useNavigate } from 'react-router'

const { profilePage } = route

export const useGoToProfile = (user: Nullable<User> | undefined) => {
  const navigate = useNavigate()

  const handleClick = useCallback(() => {
    if (!user) return
    navigate(profilePage(user.handle))
  }, [navigate, user])

  return handleClick
}
