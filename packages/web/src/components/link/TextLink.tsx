import { Ref, forwardRef, useCallback, MouseEvent, ComponentType } from 'react'

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
        {...other}
      >
        {children}
      </HarmonyTextLink>
    )
  }

  return (
    <HarmonyTextLink ref={ref} asChild onClick={handleClick} {...other}>
      {to ? (
        <LinkComponent {...linkProps}>{children}</LinkComponent>
      ) : (
        <span>{children}</span>
      )}
    </HarmonyTextLink>
  )
})
