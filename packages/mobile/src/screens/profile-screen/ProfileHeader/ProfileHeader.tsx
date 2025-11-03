import { memo, useCallback, useEffect, useState } from 'react'

import {
  useArtistCreatedCoin,
  useCurrentUserId,
  useUserComments,
  useProfileUser
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { useTierAndVerifiedForUser } from '@audius/common/store'
import { css } from '@emotion/native'
import { LayoutAnimation } from 'react-native'
import { useToggle } from 'react-use'

import { Box, Divider, Flex, useTheme } from '@audius/harmony-native'
import { OnlineOnly } from 'app/components/offline-placeholder/OnlineOnly'
import { zIndex } from 'app/utils/zIndex'

import { ArtistRecommendations } from '../ArtistRecommendations'
import { BuyArtistCoinButton } from '../BuyArtistCoinButton'
import { ProfileCoverPhoto } from '../ProfileCoverPhoto'
import { ProfileInfo } from '../ProfileInfo'
import { ProfileMetrics } from '../ProfileMetrics'
import { TipAudioButton } from '../TipAudioButton'
import { UploadTrackButton } from '../UploadTrackButton'

import { ArtistProfilePicture } from './ArtistProfilePicture'
import { Bio } from './Bio'
import { CollapsedSection } from './CollapsedSection'
import { ExpandHeaderToggleButton } from './ExpandHeaderToggleButton'
import { ProfileInfoTiles } from './ProfileInfoTiles'
import { SocialsAndSites } from './SocialsAndSites'

// Memoized since material-top-tabs triggers unecessary rerenders
export const ProfileHeader = memo(() => {
  const { data: accountId } = useCurrentUserId()
  const [hasUserFollowed, setHasUserFollowed] = useToggle(false)
  const [isExpanded, setIsExpanded] = useToggle(false)
  const [isExpandable, setIsExpandable] = useState(false)

  const {
    user_id: userId,
    does_current_user_follow: doesCurrentUserFollow,
    current_user_followee_follow_count: currentUserFolloweeFollowCount,
    website,
    twitter_handle: twitterHandle,
    instagram_handle: instagramHandle,
    tiktok_handle: tikTokHandle,
    supporting_count: supportingCount
  } = useProfileUser({
    select: (user) => ({
      user_id: user.user_id,
      does_current_user_follow: user.does_current_user_follow,
      current_user_followee_follow_count:
        user.current_user_followee_follow_count,
      website: user.website,
      twitter_handle: user.twitter_handle,
      instagram_handle: user.instagram_handle,
      tiktok_handle: user.tiktok_handle,
      supporting_count: user.supporting_count
    })
  }).user ?? {}

  const { data: comments } = useUserComments({
    userId: userId || 0,
    pageSize: 1
  })
  const { data: artistCoin, isPending: isArtistCoinLoading } =
    useArtistCreatedCoin(userId)
  const { tier } = useTierAndVerifiedForUser(userId)
  const hasTier = tier !== 'none'
  const isOwner = userId === accountId
  const hasMutuals = !isOwner && (currentUserFolloweeFollowCount ?? 0) > 0
  const hasMultipleSocials =
    [website, twitterHandle, instagramHandle, tikTokHandle].filter(Boolean)
      .length > 1
  const isSupporting = supportingCount && supportingCount > 0

  const { isEnabled: isRecentCommentsEnabled } = useFeatureFlag(
    FeatureFlags.RECENT_COMMENTS
  )
  // Note: we also if the profile bio is longer than 3 lines, but that's handled in the Bio component.
  const shouldExpand =
    hasTier ||
    hasMutuals ||
    hasMultipleSocials ||
    isSupporting ||
    (comments && comments?.length > 0 && isRecentCommentsEnabled)

  useEffect(() => {
    if (!isExpandable && shouldExpand) {
      setIsExpandable(true)
    }
  }, [shouldExpand, isExpandable, setIsExpandable])

  const handleFollow = useCallback(() => {
    if (!doesCurrentUserFollow) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setHasUserFollowed(true)
    }
  }, [setHasUserFollowed, doesCurrentUserFollow])

  const handleCloseArtistRecs = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setHasUserFollowed(false)
  }, [setHasUserFollowed])

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded)
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
  }, [isExpanded, setIsExpanded])

  const { spacing } = useTheme()

  return (
    <>
      <ProfileCoverPhoto />
      <Box
        style={css({
          position: 'absolute',
          top: spacing.unit13,
          left: spacing.unit3,
          zIndex: zIndex.PROFILE_PAGE_PROFILE_PICTURE
        })}
      >
        {userId ? <ArtistProfilePicture userId={userId} /> : null}
      </Box>
      <Flex
        column
        pointerEvents='box-none'
        backgroundColor='white'
        pv='s'
        ph='m'
        style={{ gap: 9 }}
        borderBottom='default'
      >
        <ProfileInfo onFollow={handleFollow} />
        <OnlineOnly>
          <ProfileMetrics />
          {isExpanded ? (
            <>
              <Bio />
              <SocialsAndSites />
              <ProfileInfoTiles />
            </>
          ) : (
            <CollapsedSection
              isExpandable={isExpandable}
              setIsExpandable={setIsExpandable}
            />
          )}
          {isExpandable ? (
            <ExpandHeaderToggleButton
              isExpanded={isExpanded}
              onPress={handleToggleExpand}
            />
          ) : null}
          <Divider mh={-12} />
          {!hasUserFollowed ? null : (
            <ArtistRecommendations onClose={handleCloseArtistRecs} />
          )}
          <Flex pointerEvents='box-none' mt='s'>
            {isOwner ? (
              <UploadTrackButton />
            ) : isArtistCoinLoading ? null : userId && artistCoin?.mint ? (
              <BuyArtistCoinButton userId={userId} />
            ) : (
              <TipAudioButton />
            )}
          </Flex>
        </OnlineOnly>
      </Flex>
    </>
  )
})
