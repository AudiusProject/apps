import { useUser } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { IconSize, Text, useTheme, Flex } from '@audius/harmony'
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
    css: cssProp,
    tabIndex = 0,
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
      css={{
        display: 'inline-flex',
        verticalAlign: 'middle'
      }}
      hideFanClubBadge={hideFanClubBadge}
    />
  )

  const containerStyles: CSSObject = {
    columnGap: spacing.xs,
    alignItems: 'center',
    lineHeight: 'normal',
    display: 'inline-flex',
    width: fullWidth ? '100%' : undefined,
    minWidth: 0,
    overflow: 'hidden'
  }
  const linkStyles: CSSObject = {
    lineHeight: 'normal',
    minWidth: 0,
    maxWidth: '100%',
    ...focusStyles
  }

  // Badges should be outside the TextLink to prevent hover effects on badges
  const textLink = (
    <Flex justifyContent={center ? 'center' : undefined} css={containerStyles}>
      <TextLink
        to={url}
        {...other}
        css={[linkStyles, cssProp]}
        tabIndex={tabIndex}
      >
        <Text ellipses>{name}</Text>
      </TextLink>
      {badges}
      {children}
    </Flex>
  )

  const noTextLink = <Link to={url}>{children}</Link>
  const linkElement = noText ? noTextLink : textLink

  // Wrap the text in ArtistPopover if needed
  if (popover && handle && !noText) {
    return (
      <Flex
        justifyContent={center ? 'center' : undefined}
        css={containerStyles}
      >
        <ArtistPopover
          css={{
            display: 'inline-flex',
            minWidth: 0,
            overflow: noOverflow ? 'visible' : 'hidden'
          }}
          handle={handle}
        >
          <TextLink
            to={url}
            {...other}
            css={[linkStyles, cssProp]}
            tabIndex={tabIndex}
          >
            <Text ellipses>{name}</Text>
          </TextLink>
        </ArtistPopover>
        {badges}
        {children}
      </Flex>
    )
  }

  return linkElement
}
