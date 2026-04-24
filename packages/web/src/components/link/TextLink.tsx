import {
  Ref,
  forwardRef,
  useCallback,
  MouseEvent,
  KeyboardEvent,
  ComponentType
} from 'react'

import { ID } from '@audius/common/models'
import { route } from '@audius/common/utils'
import {
  TextLink as HarmonyTextLink,
  TextLinkProps as HarmonyTextLinkProps
} from '@audius/harmony'
import { Link, LinkProps } from 'react-router'

import { RestrictedLink, RestrictedLinkProps } from 'components/RestrictedLink'
import { SignOnLink, SignOnLinkProps } from 'components/SignOnLink'
import { RestrictionType } from 'hooks/useRequiresAccount'

const { SIGN_IN_PAGE, SIGN_UP_PAGE } = route

export type LinkKind = 'track' | 'collection' | 'user' | 'mention' | 'other'

export type TextLinkProps = HarmonyTextLinkProps &
  Partial<Omit<LinkProps, 'color' | 'onClick'>> & {
    stopPropagation?: boolean
    restriction?: RestrictionType
    onClick?: (
      e: MouseEvent<HTMLAnchorElement>,
      linkKind?: LinkKind,
      linkEntityId?: ID
    ) => void
  }

export const TextLink = forwardRef((props: TextLinkProps, ref: Ref<'a'>) => {
  const {
    to,
    children,
    stopPropagation = true,
    onClick,
    onKeyDown,
    restriction,
    isExternal,
    ...other
  } = props

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (stopPropagation) {
        e.stopPropagation()
      }
      onClick?.(e)
    },
    [stopPropagation, onClick]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      onKeyDown?.(e as KeyboardEvent<HTMLAnchorElement>)
      if (e.defaultPrevented) return

      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        if (stopPropagation) {
          e.stopPropagation()
        }
        e.currentTarget.click()
      }
    },
    [stopPropagation, onKeyDown]
  )

  let LinkComponent: ComponentType<any> = Link

  let linkProps: Partial<LinkProps | RestrictedLinkProps | SignOnLinkProps> = {
    to
  }

  if (restriction) {
    LinkComponent = RestrictedLink
    linkProps = { to, restriction }
  } else if (to === SIGN_IN_PAGE) {
    LinkComponent = SignOnLink
    linkProps = { signIn: true }
  } else if (to === SIGN_UP_PAGE) {
    LinkComponent = SignOnLink
    linkProps = { signUp: true }
  }

  if (isExternal) {
    return (
      <HarmonyTextLink
        isExternal={isExternal}
        href={to as string}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...other}
      >
        {children}
      </HarmonyTextLink>
    )
  }

  return (
    <HarmonyTextLink
      ref={ref}
      asChild
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...other}
    >
      {to ? (
        <LinkComponent {...linkProps}>{children}</LinkComponent>
      ) : (
        <span>{children}</span>
      )}
    </HarmonyTextLink>
  )
})
