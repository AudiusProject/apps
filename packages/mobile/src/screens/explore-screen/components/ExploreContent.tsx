import React from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'

import { Flex } from '@audius/harmony-native'
import { RecentSearches } from 'app/screens/search-screen/RecentSearches'
import { useSearchCategory } from 'app/screens/search-screen/searchState'

import { ActiveDiscussions } from './ActiveDiscussions'
import { ArtistSpotlight } from './ArtistSpotlight'
import { BestOfAudiusTiles } from './BestOfAudiusTiles'
import { BestSelling } from './BestSelling'
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
  const { isEnabled: isSearchGoodiesEnabled } = useFeatureFlag(
    FeatureFlags.SEARCH_EXPLORE_GOODIES
  )
  const { isEnabled: isExploreArtistCoinTracksEnabled } = useFeatureFlag(
    FeatureFlags.EXPLORE_ARTIST_COIN_TRACKS
  )

  const showTrackContent = category === 'tracks' || category === 'all'
  const showPlaylistContent = category === 'playlists' || category === 'all'
  const showUserContent = category === 'users' || category === 'all'
  const showAlbumContent = category === 'albums' || category === 'all'

  return (
    <Flex gap='2xl' pt='s' pb={150} ph='l'>
      {showTrackContent && <ForYouTracks />}
      {isExploreArtistCoinTracksEnabled && <FeaturedArtistCoinTracks />}
      {showTrackContent && <RecentlyPlayedTracks />}
      {showTrackContent && <QuickSearchGrid />}
      {showPlaylistContent && <FeaturedPlaylists />}
      {showTrackContent && <FeaturedRemixContests />}
      {isSearchGoodiesEnabled && showTrackContent && (
        <UndergroundTrendingTracks />
      )}
      {showUserContent && <ArtistSpotlight />}
      {showUserContent && <LabelSpotlight />}
      {isSearchGoodiesEnabled && showTrackContent && <ActiveDiscussions />}
      {(showTrackContent || showAlbumContent || showPlaylistContent) && (
        <MoodsGrid />
      )}
      {isSearchGoodiesEnabled ? (
        <>
          {showPlaylistContent && <TrendingPlaylists />}
          {showTrackContent && <MostSharedTracks />}
          {(showAlbumContent || showTrackContent) && <BestSelling />}
          {showTrackContent && <RecentPremiumTracks />}
          {showTrackContent && <FeelingLucky />}
        </>
      ) : null}
      {!isSearchGoodiesEnabled && <BestOfAudiusTiles />}
      <RecentSearches />
    </Flex>
  )
}
