const LABELS: Record<string, string> = {
  feed: 'Feed',
  trending: 'Trending',
  trendingUnderground: 'Underground Trending',
  trendingWinners: 'Trending Winners',
  trendingAlbums: 'Trending Albums',
  exploreContent: 'Explore',
  premiumTracks: 'Premium Tracks',
  exclusiveTracks: 'Exclusive Tracks',
  newReleaseAlbums: 'New Releases',
  bestSellingAlbums: 'Best Selling',
  feelingLuckyTracks: 'Feeling Lucky',
  recentlyPlayedTracks: 'Recently Played',
  recentlyCommentedTracks: 'Recently Commented',
  trackHistory: 'Listening History',
  libraryTracks: 'Your Library',
  libraryCollections: 'Your Library',
  favoritedTracks: 'Favorites',
  reposts: 'Reposts',
  profileTracks: 'Profile',
  profileReposts: 'Profile Reposts',
  tracksByUser: 'Profile',
  tracksByHandle: 'Profile',
  tracksByPlaylist: 'Playlist',
  tracksByAlbum: 'Album',
  trackPageLineup: 'More tracks',
  remixes: 'Remixes',
  search: 'Search results'
}

export const getQuerySourceLabel = (sourceKey: string | null): string => {
  if (!sourceKey) return 'Up Next'
  return LABELS[sourceKey] ?? 'Up Next'
}
