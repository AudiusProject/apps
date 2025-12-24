import { useCallback } from 'react'

import { useNavigate } from 'react-router'

export const usePushRoute = () => {
  const navigate = useNavigate()
  return useCallback((route: string) => navigate(route), [navigate])
}

export const useReplaceRoute = () => {
  const navigate = useNavigate()
  return useCallback(
    (route: string) => navigate(route, { replace: true }),
    [navigate]
  )
}
