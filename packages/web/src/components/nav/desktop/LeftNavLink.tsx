import { useMemo } from 'react'

import { Name } from '@audius/common/models'
import { NavItem, NavItemProps } from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { NavLink, useLocation } from 'react-router'

import { make } from 'common/store/analytics/actions'
import {
  RestrictionType,
  useRequiresAccountOnClick
} from 'hooks/useRequiresAccount'
import { removeNullable } from 'utils/typeUtils'

/**
 * Helper function to check if the current path matches any of the provided paths
 * @param params - Object containing path matching parameters
 * @param params.currentPath - The current pathname from location
 * @param params.pathsToMatch - Array of paths to check against
 * @param params.exact - Whether to use exact matching or startsWith
 * @returns true if any path matches, false otherwise
 */
const isPathMatch = ({
  currentPath,
  pathsToMatch,
  exact
}: {
  currentPath: string
  pathsToMatch: string[]
  exact: boolean
}): boolean => {
  if (pathsToMatch.length === 0) return false

  return pathsToMatch.some((path) => {
    if (exact) {
      return currentPath === path
    }
    return currentPath.startsWith(path)
  })
}

export type LeftNavLinkProps = Omit<NavItemProps, 'isSelected'> & {
  to?: string
  disabled?: boolean
  restriction?: RestrictionType
  exact?: boolean
  additionalPathMatches?: string[]
}

export const LeftNavLink = (props: LeftNavLinkProps) => {
  const {
    to,
    disabled,
    children,
    onClick,
    restriction,
    exact = false,
    additionalPathMatches = [],
    ...other
  } = props
  const location = useLocation()
  const dispatch = useDispatch()
  const isSelected = useMemo(() => {
    const pathsToMatch = [to, ...additionalPathMatches].filter(removeNullable)
    return isPathMatch({
      currentPath: location.pathname,
      pathsToMatch,
      exact
    })
  }, [to, additionalPathMatches, location.pathname, exact])

  const requiresAccountOnClick = useRequiresAccountOnClick(
    (e) => {
      // Only dispatch analytics if we're actually navigating
      if (to) {
        dispatch(
          make(Name.LINK_CLICKING, {
            url: to,
            source: 'left nav'
          })
        )
      }
      onClick?.(e)
    },
    [onClick, to, dispatch],
    undefined,
    undefined,
    restriction
  )

  return (
    <NavLink to={to ?? ''} onClick={requiresAccountOnClick} draggable={false}>
      <NavItem
        {...other}
        isSelected={isSelected}
        css={{
          opacity: disabled ? 0.5 : 1,
          cursor: 'pointer'
        }}
      >
        {children}
      </NavItem>
    </NavLink>
  )
}
