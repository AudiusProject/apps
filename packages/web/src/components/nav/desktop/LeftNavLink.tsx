import { ReactNode, useCallback, useMemo, useRef, useState } from 'react'

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

import { CollapsedNavItem } from './CollapsedNavItem'
import styles from './LeftNavLink.module.css'
import { useNavSidebar } from './NavSidebarContext'

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

const getAccessibleLabel = (children: ReactNode) => {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return `${children}`
  return undefined
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
    leftIcon,
    rightIcon,
    hasNotification,
    ...other
  } = props
  const location = useLocation()
  const dispatch = useDispatch()
  const { isCollapsed } = useNavSidebar()
  const [isFocusVisible, setIsFocusVisible] = useState(false)
  const isPointerFocusRef = useRef(false)
  const isSelected = useMemo(() => {
    const pathsToMatch = [to, ...additionalPathMatches].filter(removeNullable)
    return isPathMatch({
      currentPath: location.pathname,
      pathsToMatch,
      exact
    })
  }, [to, additionalPathMatches, location.pathname, exact])
  const accessibleLabel = getAccessibleLabel(children)

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

  const handlePointerDown = useCallback(() => {
    isPointerFocusRef.current = true
    setIsFocusVisible(false)
  }, [])

  const handleFocus = useCallback(() => {
    setIsFocusVisible(!isPointerFocusRef.current)
    isPointerFocusRef.current = false
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocusVisible(false)
  }, [])

  if (isCollapsed && leftIcon) {
    return (
      <NavLink
        to={to ?? ''}
        onClick={requiresAccountOnClick}
        onPointerDown={handlePointerDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={styles.navLink}
        draggable={false}
        tabIndex={disabled ? -1 : 0}
        aria-label={accessibleLabel}
        aria-current={isSelected ? 'page' : undefined}
        aria-disabled={disabled || undefined}
      >
        <CollapsedNavItem
          icon={leftIcon}
          isSelected={isSelected}
          disabled={disabled}
          hasNotification={hasNotification}
          isFocusVisible={isFocusVisible}
        />
      </NavLink>
    )
  }

  return (
    <NavLink
      to={to ?? ''}
      onClick={requiresAccountOnClick}
      onPointerDown={handlePointerDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={styles.navLink}
      draggable={false}
      tabIndex={disabled ? -1 : 0}
      aria-current={isSelected ? 'page' : undefined}
      aria-disabled={disabled || undefined}
    >
      <NavItem
        {...other}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        hasNotification={hasNotification}
        isSelected={isSelected}
        isFocusVisible={isFocusVisible}
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
