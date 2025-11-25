import { useCallback } from 'react'

import { useNavigate } from 'react-router-dom'

/**
 * Wraps page navigation.
 * Usage:
 * ```
 *  const navigate = useNavigateToPage()
 *  ...
 *  navigate(SETTINGS_PAGE)
 * ```
 */
export const useNavigateToPage = () => {
  const navigate = useNavigate()
  return useCallback(
    (route: string, state?: any) => {
      navigate(route, { state })
    },
    [navigate]
  )
}
