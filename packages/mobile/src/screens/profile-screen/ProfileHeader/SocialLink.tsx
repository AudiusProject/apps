import { useCallback, useState } from 'react'

import { useProfileUser } from '@audius/common/api'
import type { StyleProp, ViewStyle } from 'react-native'
import { View } from 'react-native'

import type { IconButtonProps } from '@audius/harmony-native'
import {
  IconInstagram,
  IconLink,
  IconTikTok,
  IconX,
  Text
} from '@audius/harmony-native'
import type { LinkProps } from 'app/components/core'
import { Link, UserGeneratedText } from 'app/components/core'
import { make } from 'app/services/analytics'
import { makeStyles } from 'app/styles'
import { EventNames } from 'app/types/analytics'
import { prependProtocol } from 'app/utils/prependProtocol'

const useStyles = makeStyles(({ spacing }) => ({
  iconSkeleton: {
    height: 24,
    width: 24
  },
  linkSkeleton: {
    height: 24,
    width: 150,
    marginLeft: spacing(3)
  },
  withText: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing(2),
    maxWidth: '100%',
    flexShrink: 1
  },
  textContainer: {
    flexShrink: 1,
    minWidth: 0 // Needed for text truncation to work properly
  }
}))

export type SocialLinkProps = LinkProps &
  Pick<IconButtonProps, 'icon'> & {
    style?: StyleProp<ViewStyle>
    text: string | null | undefined
    showText?: boolean
    hyperlink?: boolean
  }

export const SocialLink = (props: SocialLinkProps) => {
  const { text, showText, url, icon: Icon, hyperlink, style, ...other } = props
  const styles = useStyles()
  const [isActive, setIsActive] = useState(false)

  const handlePressIn = useCallback(() => {
    setIsActive(true)
  }, [])

  const handlePressOut = useCallback(() => {
    setIsActive(false)
  }, [])

  if (text === null || text === '') return null

  const iconButtonElement = (
    <Icon height={28} width={28} color={isActive ? 'active' : 'default'} />
  )

  if (showText)
    return (
      <Link
        url={url}
        style={[styles.withText, style]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...other}
      >
        {iconButtonElement}
        <View style={styles.textContainer}>
          {hyperlink ? (
            <UserGeneratedText
              variant='body'
              source='profile page'
              numberOfLines={1}
            >
              {text}
            </UserGeneratedText>
          ) : (
            <Text
              variant='body'
              numberOfLines={1}
              color={isActive ? 'active' : 'default'}
            >
              {text}
            </Text>
          )}
        </View>
      </Link>
    )

  return (
    <Link
      url={url}
      style={style}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {iconButtonElement}
    </Link>
  )
}

type XSocialLinkProps = Partial<SocialLinkProps>

export const XSocialLink = (props: XSocialLinkProps) => {
  const { handle, x_handle } =
    useProfileUser({
      select: (user) => ({
        handle: user.handle,
        x_handle: user.twitter_handle
      })
    }).user ?? {}

  const sanitizedHandle = handle?.replace('@', '')

  return (
    <SocialLink
      url={`https://x.com/${x_handle}`}
      text={x_handle ? `@${x_handle}` : x_handle}
      icon={IconX}
      analytics={make({
        eventName: EventNames.PROFILE_PAGE_CLICK_TWITTER,
        handle: sanitizedHandle ?? 'undefined',
        twitterHandle: x_handle as string
      })}
      {...props}
    />
  )
}

type InstagramSocialLinkProps = Partial<SocialLinkProps>

export const InstagramSocialLink = (props: InstagramSocialLinkProps) => {
  const { handle, instagram_handle } =
    useProfileUser({
      select: (user) => ({
        handle: user.handle,
        instagram_handle: user.instagram_handle
      })
    }).user ?? {}

  const sanitizedHandle = handle?.replace('@', '')

  return (
    <SocialLink
      url={`https://instagram.com/${instagram_handle}`}
      text={instagram_handle ? `@${instagram_handle}` : instagram_handle}
      icon={IconInstagram}
      analytics={make({
        eventName: EventNames.PROFILE_PAGE_CLICK_INSTAGRAM,
        handle: sanitizedHandle ?? 'undefined',
        instagramHandle: instagram_handle as string
      })}
      {...props}
    />
  )
}

type TikTokSocialLinkProps = Partial<SocialLinkProps>

export const TikTokSocialLink = (props: TikTokSocialLinkProps) => {
  const { handle, tiktok_handle } =
    useProfileUser({
      select: (user) => ({
        handle: user.handle,
        tiktok_handle: user.tiktok_handle
      })
    }).user ?? {}

  const sanitizedHandle = handle?.replace('@', '')

  return (
    <SocialLink
      url={`https://tiktok.com/@${tiktok_handle}`}
      text={tiktok_handle ? `@${tiktok_handle}` : tiktok_handle}
      icon={IconTikTok}
      analytics={make({
        eventName: EventNames.PROFILE_PAGE_CLICK_TIKTOK,
        handle: sanitizedHandle ?? 'undefined',
        tikTokHandle: tiktok_handle as string
      })}
      {...props}
    />
  )
}

export const WebsiteSocialLink = (props: Partial<SocialLinkProps>) => {
  const { website } =
    useProfileUser({
      select: (user) => ({ website: user.website })
    }).user ?? {}

  return (
    <SocialLink
      url={prependProtocol(website)}
      text={website}
      icon={IconLink}
      {...props}
    />
  )
}
