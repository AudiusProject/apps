import React from 'react'

import { useCurrentUserId } from '@audius/common/api'

import { Flex } from '@audius/harmony-native'
import { RecentSearches } from 'app/screens/search-screen/RecentSearches'
import { useSearchCategory } from 'app/screens/search-screen/searchState'

import { ActiveDiscussions } from './ActiveDiscussions'
import { ArtistSpotlight } from './ArtistSpotlight'
import { BestSelling } from './BestSelling'
import { DownloadsAvailable } from './DownloadsAvailable'
import { FeaturedArtistCoinTracks } from './FeaturedArtistCoinTracks'
import { FeaturedPlaylists } from './FeaturedPlaylists'
import { FeaturedRemixContests } from './FeaturedRemixContests'
import { FeelingLucky } from './FeelingLucky'
import { ForYouTracks } from './ForYouTracks'
import { LabelSpotlight } from './LabelSpotlight'
import { MoodsGrid } from './MoodsGrid'
import { MostSharedTracks } from './MostSharedTracks'
import { QuickSearchGrid } from './QuickSearchGrid'
import { RecentPremiumTracks } from './RecentPremiumTracks'
import { RecentlyPlayedTracks } from './RecentlyPlayed'
import { TrendingPlaylists } from './TrendingPlaylists'
import { UndergroundTrendingTracks } from './UndergroundTrendingTracks'

export const ExploreContent = () => {
  const [category] = useSearchCategory()
  const { data: currentUserId, isLoading: isCurrentUserIdLoading } =
    useCurrentUserId()

  const showUserContextualContent = isCurrentUserIdLoading || !!currentUserId
  const showTrackContent = category === 'tracks' || category === 'all'
  const showPlaylistContent = category === 'playlists' || category === 'all'
  const showUserContent = category === 'users' || category === 'all'
  const showAlbumContent = category === 'albums' || category === 'all'

  return (
    <Flex gap='2xl' pt='s' pb={150} ph='l'>
      {showTrackContent && showUserContextualContent && <ForYouTracks />}
      {showTrackContent && <FeaturedArtistCoinTracks />}
      {showTrackContent && showUserContextualContent && (
        <RecentlyPlayedTracks />
      )}
      {showTrackContent && <QuickSearchGrid />}
      {showPlaylistContent && <FeaturedPlaylists />}
      {showTrackContent && <FeaturedRemixContests />}
      {showTrackContent && <UndergroundTrendingTracks />}
      {showUserContent && <ArtistSpotlight />}
      {showUserContent && <LabelSpotlight />}
      {showTrackContent && (
        <>
          <ActiveDiscussions />
          <DownloadsAvailable />
        </>
      )}
      {(showTrackContent || showAlbumContent || showPlaylistContent) && (
        <MoodsGrid />
      )}
      {showPlaylistContent && <TrendingPlaylists />}
      {showTrackContent && <MostSharedTracks />}
      {(showAlbumContent || showTrackContent) && <BestSelling />}
      {showTrackContent && <RecentPremiumTracks />}
      {showTrackContent && showUserContextualContent && <FeelingLucky />}
      {showUserContextualContent && <RecentSearches />}
    </Flex>
  )
}
