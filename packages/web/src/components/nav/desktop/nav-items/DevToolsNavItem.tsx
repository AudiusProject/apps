import React from 'react'

import { route } from '@audius/common/utils'
import { IconEmbed } from '@audius/harmony'

import { useEnvironment } from 'hooks/useEnvironment'

import { LeftNavLink } from '../LeftNavLink'

const { DEV_TOOLS_PAGE } = route

export const DevToolsNavItem = () => {
  const { isProduction } = useEnvironment()

  // Only show in development environment
  if (isProduction) {
    return null
  }

  return (
    <LeftNavLink leftIcon={IconEmbed} to={DEV_TOOLS_PAGE} restriction='none'>
      DevTools
    </LeftNavLink>
  )
}
