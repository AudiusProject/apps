import React from 'react'

import { useCurrentUserId } from '@audius/common/api'

import { Flex } from '@audius/harmony-native'
import { RecentSearches } from 'app/screens/search-screen/RecentSearches'
import { useSearchCategory } from 'app/screens/search-screen/searchState'

import { ArtistSpotlight } from './ArtistSpotlight'
import { BestSellingAlbums } from './BestSellingAlbums'
import { FeaturedPlaylists } from './FeaturedPlaylists'
import { FeaturedRemixContests } from './FeaturedRemixContests'
import { FeelingLucky } from './FeelingLucky'
import { ForYouTracks } from './ForYouTracks'
import { LabelSpotlight } from './LabelSpotlight'
import { NewAlbumReleases } from './NewAlbumReleases'
import { RecentlyPlayedTracks } from './RecentlyPlayed'
import { TopAlbumsThisMonth } from './TopAlbumsThisMonth'

export const ExploreContent = () => {
  const [category] = useSearchCategory()
  const { data: currentUserId, isLoading: isCurrentUserIdLoading } =
    useCurrentUserId()

  const showUserContextualContent = isCurrentUserIdLoading || !!currentUserId
  const showTrackContent = category === 'tracks' || category === 'all'
  const showPlaylistContent = category === 'playlists' || category === 'all'
  const showAlbumContent = category === 'albums' || category === 'all'
  const showUserContent = category === 'users' || category === 'all'

  return (
    <Flex gap='2xl' pt='s' pb={150} ph='l'>
      {showTrackContent && showUserContextualContent && <ForYouTracks />}
      {showPlaylistContent && <FeaturedPlaylists />}
      {showAlbumContent && <TopAlbumsThisMonth />}
      {showAlbumContent && <NewAlbumReleases />}
      {showAlbumContent && <BestSellingAlbums />}
      {showTrackContent && <FeaturedRemixContests />}
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
