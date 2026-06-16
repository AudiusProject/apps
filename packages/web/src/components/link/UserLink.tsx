import { useUser } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { IconSize, Text, useTheme } from '@audius/harmony'
import { CSSObject } from '@emotion/react'
import { Link } from 'react-router'

import { ArtistPopover } from 'components/artist/ArtistPopover'
import UserBadges from 'components/user-badges/UserBadges'

import { TextLink, TextLinkProps } from './TextLink'

const { profilePage } = route

type UserLinkProps = Omit<TextLinkProps, 'to' | 'popover'> & {
  userId: ID | undefined
  badgeSize?: IconSize
  popover?: boolean
  noText?: boolean // Should be used if you're intending for the children to be the link element (i.e. Avatar)
  noBadges?: boolean
  // Hack to fix avatars wrapped in user link
  noOverflow?: boolean
  center?: boolean
  fullWidth?: boolean
  hideFanClubBadge?: boolean
  css?: CSSObject | CSSObject[]
}

export const UserLink = (props: UserLinkProps) => {
  const {
    userId,
    badgeSize = 's',
    popover,
    children,
    noText,
    noBadges,
    noOverflow,
    center,
    fullWidth,
    hideFanClubBadge,
    ellipses,
    css: cssProp,
    ...other
  } = props
  const { spacing } = useTheme()
  const focusStyles: CSSObject = {
    ':focus': {
      outline: 'none'
    },
    ':focus-visible': {
      borderRadius: spacing.xs,
      outline: 'none',
      boxShadow:
        'inset 0 0 0 2px var(--harmony-focus, var(--harmony-secondary))'
    }
  }

  const { data: partialUser } = useUser(userId, {
    select: (user) => {
      const { handle, name } = user ?? {}
      return { url: profilePage(handle), handle, name }
    }
  })
  const { url = '/', handle, name } = partialUser ?? {}

  if (!userId) {
    return null
  }

  // Prepare the user badges
  const badges = noBadges ? null : (
    <UserBadges
      userId={userId}
      size={badgeSize}
      hideFanClubBadge={hideFanClubBadge}
    />
  )

  const containerStyles: CSSObject = {
    alignItems: 'center',
    display: fullWidth ? 'flex' : 'inline-flex',
    justifyContent: center ? 'center' : undefined,
    lineHeight: 'normal',
    minWidth: 0,
    maxWidth: '100%',
    overflow: noOverflow ? 'visible' : 'hidden',
    width: fullWidth ? '100%' : undefined
  }
  const nameRowStyles: CSSObject = {
    alignItems: 'center',
    columnGap: spacing.xs,
    display: 'inline-grid',
    gridAutoColumns: 'max-content',
    gridAutoFlow: 'column',
    gridTemplateColumns: 'minmax(0, auto)',
    lineHeight: 'normal',
    maxWidth: '100%',
    minWidth: 0,
    verticalAlign: 'middle'
  }
  const linkStyles: CSSObject = {
    lineHeight: 'normal',
    display: ellipses ? 'block' : undefined,
    minWidth: 0,
    maxWidth: '100%',
    overflow: ellipses ? 'hidden' : undefined,
    textOverflow: ellipses ? 'ellipsis' : undefined,
    whiteSpace: ellipses ? 'nowrap' : undefined,
    ...focusStyles
  }

  // Badges should be outside the TextLink to prevent hover effects on badges
  const textLink = (
    <span css={containerStyles}>
      <span css={nameRowStyles}>
        <TextLink
          to={url}
          {...other}
          ellipses={ellipses}
          css={[linkStyles, cssProp]}
        >
          {ellipses ? name : <Text ellipses>{name}</Text>}
        </TextLink>
        {badges}
        {children}
      </span>
    </span>
  )

  const noTextLink = <Link to={url}>{children}</Link>
  const linkElement = noText ? noTextLink : textLink

  // Wrap the text in ArtistPopover if needed
  if (popover && handle && !noText) {
    return (
      <span css={containerStyles}>
        <span css={nameRowStyles}>
          <ArtistPopover
            css={{
              display: 'block',
              minWidth: 0,
              maxWidth: '100%',
              overflow: noOverflow ? 'visible' : 'hidden'
            }}
            handle={handle}
            userId={userId}
          >
            <TextLink
              to={url}
              {...other}
              ellipses={ellipses}
              css={[linkStyles, cssProp]}
            >
              {ellipses ? name : <Text ellipses>{name}</Text>}
            </TextLink>
          </ArtistPopover>
          {badges}
          {children}
        </span>
      </span>
    )
  }

  return linkElement
}
