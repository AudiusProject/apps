export type SearchPageState = Record<string, never>

export enum SearchKind {
  TRACKS = 'tracks',
  USERS = 'users',
  PLAYLISTS = 'playlists',
  ALBUMS = 'albums',
  ALL = 'all'
}

export type SearchSortMethod = 'relevant' | 'popular' | 'recent'
