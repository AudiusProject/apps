import { useCallback } from 'react'

import { useNavigate } from 'react-router'

export const useNavigateToPage = () => {
  const navigate = useNavigate()
  return useCallback(
    (route: string, state?: any) => {
      navigate(route, { state })
    },
    [navigate]
  )
}
