import React from 'react'

import { useCurrentUserId } from '@audius/common/api'

import { Flex } from '@audius/harmony-native'
import { RecentSearches } from 'app/screens/search-screen/RecentSearches'
import { useSearchCategory } from 'app/screens/search-screen/searchState'

import { ArtistSpotlight } from './ArtistSpotlight'
import { FeaturedArtistCoinTracks } from './FeaturedArtistCoinTracks'
import { FeaturedPlaylists } from './FeaturedPlaylists'
import { FeaturedRemixContests } from './FeaturedRemixContests'
import { FeelingLucky } from './FeelingLucky'
import { ForYouTracks } from './ForYouTracks'
import { LabelSpotlight } from './LabelSpotlight'
import { RecentlyPlayedTracks } from './RecentlyPlayed'

export const ExploreContent = () => {
  const [category] = useSearchCategory()
  const { data: currentUserId, isLoading: isCurrentUserIdLoading } =
    useCurrentUserId()

  const showUserContextualContent = isCurrentUserIdLoading || !!currentUserId
  const isAllTab = category === 'all'
  const showTrackContent = category === 'tracks'
  const showPlaylistContent = category === 'playlists'
  const showUserContent = category === 'users'

  return (
    <Flex gap='2xl' pt='s' pb={150} ph='l'>
      {showTrackContent && showUserContextualContent && <ForYouTracks />}
      {showPlaylistContent && <FeaturedPlaylists />}
      {showTrackContent && <FeaturedArtistCoinTracks />}
      {showTrackContent && showUserContextualContent && (
        <RecentlyPlayedTracks />
      )}
      {showTrackContent && <FeaturedRemixContests />}
      {showUserContent && <ArtistSpotlight />}
      {showUserContent && <LabelSpotlight />}
      {showTrackContent && showUserContextualContent && <FeelingLucky />}
      {!isAllTab && showUserContextualContent && <RecentSearches />}
    </Flex>
  )
}
