import React from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'

import { Flex } from '@audius/harmony-native'
import { RecentSearches } from 'app/screens/search-screen/RecentSearches'
import { useSearchCategory } from 'app/screens/search-screen/searchState'

import { ArtistSpotlight } from './ArtistSpotlight'
import { BestSellingAlbums } from './BestSellingAlbums'
import { FeaturedPlaylists } from './FeaturedPlaylists'
import { FeaturedRemixContests } from './FeaturedRemixContests'
import { FeedbackTracks } from './FeedbackTracks'
import { FeelingLucky } from './FeelingLucky'
import { LabelSpotlight } from './LabelSpotlight'
import { NewAlbumReleases } from './NewAlbumReleases'
import { RecentlyPlayedTracks } from './RecentlyPlayed'
import { TopAlbumsThisMonth } from './TopAlbumsThisMonth'
import { TrendingGenres } from './TrendingGenres'
import { WeeklyRotation } from './WeeklyRotation'

export const ExploreContent = () => {
  const [category] = useSearchCategory()
  const { data: currentUserId, isLoading: isCurrentUserIdLoading } =
    useCurrentUserId()

  const showUserContextualContent = isCurrentUserIdLoading || !!currentUserId
  const showTrackContent = category === 'tracks' || category === 'all'
  const showPlaylistContent = category === 'playlists' || category === 'all'
  const showAlbumContent = category === 'albums'
  const showUserContent = category === 'users' || category === 'all'
  const { isEnabled: isFeedbackEnabled } = useFeatureFlag(
    FeatureFlags.TRACK_FEEDBACK_REQUESTS
  )

  return (
    <Flex gap='2xl' pt='s' pb={150} ph='l'>
      {showTrackContent && showUserContextualContent && (
        <WeeklyRotation surface='explore' />
      )}
      {showPlaylistContent && <FeaturedPlaylists />}
      {showTrackContent && <TrendingGenres />}
      {showAlbumContent && <TopAlbumsThisMonth />}
      {showAlbumContent && <NewAlbumReleases />}
      {showAlbumContent && <BestSellingAlbums />}
      {showTrackContent && <FeaturedRemixContests />}
      {showTrackContent && isFeedbackEnabled && <FeedbackTracks />}
      {showTrackContent && showUserContextualContent && (
        <RecentlyPlayedTracks />
      )}
      {showUserContent && <ArtistSpotlight />}
      {showUserContent && <LabelSpotlight />}
      {showTrackContent && showUserContextualContent && <FeelingLucky />}
      {showUserContextualContent && <RecentSearches />}
    </Flex>
  )
}
