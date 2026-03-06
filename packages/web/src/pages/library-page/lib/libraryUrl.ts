import {
  LibraryCategory,
  LibraryPageTabs,
  LibraryCategoryType
} from '@audius/common/store'
import { route } from '@audius/common/utils'

const { LIBRARY_ALBUMS_PAGE, LIBRARY_PLAYLISTS_PAGE, LIBRARY_TRACKS_PAGE } =
  route

export const LIBRARY_FILTER_PARAM = 'filter'
export const LIBRARY_SEARCH_PARAM = 'search'

export const LIBRARY_TAB_PATHS = [
  LIBRARY_TRACKS_PAGE,
  LIBRARY_ALBUMS_PAGE,
  LIBRARY_PLAYLISTS_PAGE
] as const

const PATH_TO_TAB: Record<string, LibraryPageTabs> = {
  [LIBRARY_TRACKS_PAGE]: LibraryPageTabs.TRACKS,
  [LIBRARY_ALBUMS_PAGE]: LibraryPageTabs.ALBUMS,
  [LIBRARY_PLAYLISTS_PAGE]: LibraryPageTabs.PLAYLISTS
}

const TAB_TO_PATH: Record<LibraryPageTabs, string> = {
  [LibraryPageTabs.TRACKS]: LIBRARY_TRACKS_PAGE,
  [LibraryPageTabs.ALBUMS]: LIBRARY_ALBUMS_PAGE,
  [LibraryPageTabs.PLAYLISTS]: LIBRARY_PLAYLISTS_PAGE
}

/** URL filter values: all, favorites, reposts, premium (premium = purchase) */
export const FILTER_URL_VALUES = [
  'all',
  'favorites',
  'reposts',
  'premium'
] as const
export type LibraryFilterParam = (typeof FILTER_URL_VALUES)[number]

const URL_FILTER_TO_CATEGORY: Record<string, LibraryCategoryType> = {
  all: LibraryCategory.All,
  favorites: LibraryCategory.Favorite,
  reposts: LibraryCategory.Repost,
  premium: LibraryCategory.Purchase
}

const CATEGORY_TO_URL_FILTER: Record<LibraryCategoryType, LibraryFilterParam> =
  {
    [LibraryCategory.All]: 'all',
    [LibraryCategory.Favorite]: 'favorites',
    [LibraryCategory.Repost]: 'reposts',
    [LibraryCategory.Purchase]: 'premium'
  }

export function getTabFromPathname(pathname: string): LibraryPageTabs {
  const path = LIBRARY_TAB_PATHS.find((p) => pathname === p)
  return path ? PATH_TO_TAB[path] : LibraryPageTabs.TRACKS
}

export function getLibraryPath(tab: LibraryPageTabs): string {
  return TAB_TO_PATH[tab] ?? LIBRARY_TRACKS_PAGE
}

export function categoryFromFilterParam(
  param: string | null
): LibraryCategoryType {
  if (!param) return LibraryCategory.All
  const category = URL_FILTER_TO_CATEGORY[param.toLowerCase()]
  return category ?? LibraryCategory.All
}

export function filterParamFromCategory(
  category: LibraryCategoryType
): LibraryFilterParam {
  return CATEGORY_TO_URL_FILTER[category] ?? 'all'
}

export function isLibraryFilterParam(
  value: string
): value is LibraryFilterParam {
  return FILTER_URL_VALUES.includes(value as LibraryFilterParam)
}
