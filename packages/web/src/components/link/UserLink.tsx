import { useUser } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { IconSize, Text, useTheme, Flex } from '@audius/harmony'
import { CSSObject } from '@emotion/react'
import { Link } from 'react-router-dom'

import { ArtistPopover } from 'components/artist/ArtistPopover'
import { MountPlacement } from 'components/types'
import UserBadges from 'components/user-badges/UserBadges'

import { TextLink, TextLinkProps } from './TextLink'

const { profilePage } = route

type UserLinkProps = Omit<TextLinkProps, 'to' | 'popover'> & {
  userId: ID | undefined
  badgeSize?: IconSize
  popover?: boolean
  popoverMount?: MountPlacement
  noText?: boolean // Should be used if you're intending for the children to be the link element (i.e. Avatar)
  noBadges?: boolean
  // Hack to fix avatars wrapped in user link
  noOverflow?: boolean
  center?: boolean
  fullWidth?: boolean
  hideArtistCoinBadge?: boolean
}

export const UserLink = (props: UserLinkProps) => {
  const {
    userId,
    badgeSize = 's',
    popover,
    popoverMount,
    children,
    noText,
    noBadges,
    noOverflow,
    center,
    fullWidth,
    hideArtistCoinBadge,
    ...other
  } = props
  const { spacing } = useTheme()

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
      hideArtistCoinBadge={hideArtistCoinBadge}
    />
  )

  const containerStyles: CSSObject = {
    columnGap: spacing.xs,
    alignItems: 'center',
    lineHeight: 'normal',
    display: 'inline-flex',
    width: fullWidth ? '100%' : undefined,
    overflow: 'hidden'
  }

  // Badges should be outside the TextLink to prevent hover effects on badges
  const textLink = (
    <Flex justifyContent={center ? 'center' : undefined} css={containerStyles}>
      <TextLink
        to={url}
        css={{
          lineHeight: 'normal'
        }}
        {...other}
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
            overflow: noOverflow ? 'visible' : 'hidden'
          }}
          handle={handle}
          component='span'
          mount={popoverMount}
        >
          <TextLink to={url} {...other}>
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
