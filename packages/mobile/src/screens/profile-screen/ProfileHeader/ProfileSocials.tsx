import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from 'react'

import { useProfileUser } from '@audius/common/api'
import {
  cacheUsersActions,
  useTierAndVerifiedForUser
} from '@audius/common/store'
import { Animated } from 'react-native'
import { useDispatch } from 'react-redux'

import { Divider, Flex } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'

import { ProfileTierTile } from './ProfileTierTile'
import {
  InstagramSocialLink,
  TikTokSocialLink,
  TwitterSocialLink,
  WebsiteSocialLink
} from './SocialLink'

const { fetchUserSocials } = cacheUsersActions

const useStyles = makeStyles(({ spacing }) => ({
  socials: {
    flexDirection: 'row',
    gap: spacing(3),
    flex: 4
  },
  socialsWithTier: {
    justifyContent: 'flex-end'
  }
}))

export const ProfileSocials = () => {
  const {
    handle,
    user_id,
    twitter_handle,
    instagram_handle,
    tiktok_handle,
    website
  } =
    useProfileUser({
      select: (user) => ({
        handle: user.handle,
        user_id: user.user_id,
        twitter_handle: user.twitter_handle,
        instagram_handle: user.instagram_handle,
        tiktok_handle: user.tiktok_handle,
        website: user.website
      })
    }).user ?? {}

  const dispatch = useDispatch()

  useEffect(() => {
    if (handle) {
      dispatch(fetchUserSocials(handle))
    }
  }, [dispatch, handle])

  const socialLinks = useMemo(() => {
    const links = [
      {
        type: 'twitter',
        handle: twitter_handle,
        SocialLink: TwitterSocialLink
      },
      {
        type: 'instagram',
        handle: instagram_handle,
        SocialLink: InstagramSocialLink
      },
      { type: 'tiktok', handle: tiktok_handle, SocialLink: TikTokSocialLink },
      { type: 'website', handle: website, SocialLink: WebsiteSocialLink }
    ]
    return links.filter(({ handle }) => !(handle === null || handle === ''))
  }, [twitter_handle, instagram_handle, tiktok_handle, website])

  const socialsCount = useMemo(() => {
    return socialLinks.filter(({ handle }) => !!handle).length
  }, [socialLinks])

  const styles = useStyles()

  const { tier } = useTierAndVerifiedForUser(user_id)
  // const tier = 'none'

  // Need to start opacity at 1 so skeleton is visible.
  const opacity = useRef(new Animated.Value(1)).current

  useLayoutEffect(() => {
    if (socialsCount > 0) {
      opacity.setValue(0.2)
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }).start()
    }
  }, [opacity, socialsCount])

  // Renders a single social link with handle text, or renders 2/3 social links
  // with dividers
  const renderSocialLinks = () => {
    if (socialsCount === 1) {
      const { SocialLink } = socialLinks[0]
      return <SocialLink showText />
    }

    return socialLinks.map(({ type, SocialLink }, index) => (
      <Fragment key={type}>
        <SocialLink showText={socialsCount === 1} />
        {index === socialLinks.length - 1 ? null : (
          <Divider orientation='vertical' />
        )}
      </Fragment>
    ))
  }
  return (
    <Flex
      row
      justifyContent='space-between'
      alignItems='center'
      pointerEvents='box-none'
      pv='m'
      gap='l'
    >
      <ProfileTierTile interactive={false} />
      <Animated.View
        pointerEvents='box-none'
        style={[
          styles.socials,
          tier !== 'none' ? styles.socialsWithTier : null,
          { opacity }
        ]}
      >
        {renderSocialLinks()}
      </Animated.View>
    </Flex>
  )
}
