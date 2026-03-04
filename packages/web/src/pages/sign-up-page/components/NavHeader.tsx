import { useCallback } from 'react'

import { Flex, IconCaretLeft, PlainButton, useTheme } from '@audius/harmony'
import { useMatch, useNavigate } from 'react-router'

import { useDetermineAllowedRoute } from '../utils/useDetermineAllowedRoutes'

const useIsBackAllowed = () => {
  const match = useMatch('/signup/:currentPath')
  const matchSignIn = useMatch('/signin/:currentPath')
  const determineAllowedRoute = useDetermineAllowedRoute()

  if (match?.params?.currentPath) {
    const { allowedRoutes } = determineAllowedRoute(match.params.currentPath)
    const currentRouteIndex = allowedRoutes.indexOf(match.params.currentPath)
    const isBackAllowed = allowedRoutes.length > 1 && currentRouteIndex > 0
    return isBackAllowed
  }

  if (matchSignIn?.params?.currentPath) {
    return true
  }

  return false
}

export const NavHeader = () => {
  const isBackAllowed = useIsBackAllowed()
  const navigate = useNavigate()
  const { spacing } = useTheme()

  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  if (!isBackAllowed) return null

  return (
    <Flex
      ph='l'
      pt='l'
      w='100%'
      alignItems='center'
      css={{
        flexShrink: 0
      }}
    >
      <PlainButton
        size='large'
        css={{ padding: 0 }}
        onClick={handleBack}
        iconLeft={IconCaretLeft}
        variant='subdued'
      />
    </Flex>
  )
}
