import qs from 'query-string'
import { matchPath, generatePath } from 'react-router'

import { ID, SearchCategory, SearchFilters } from '~/models'

import { encodeUrlName, formatTickerForUrl } from './formatUtil'
import { convertGenreLabelToValue, Genre } from './genres'

// External Routes
export const PRIVACY_POLICY = '/legal/privacy-policy'
export const TERMS_OF_SERVICE = '/legal/terms-of-use'
export const ARTIST_COIN_TERMS = '/legal/artist-coin-terms'
export const ARTIST_COIN_ACCEPTABLE_USE = '/legal/artist-coin-acceptable-use'
export const API_TERMS = '/legal/api-terms'
export const DOWNLOAD_START_LINK = '/download?start_download=true'
export const DOWNLOAD_LINK = '/download'
export const PRESS_PAGE = '/press'
export const AUTH_REDIRECT = '/auth-redirect'

// App Routes
export const ANDROID_PLAY_STORE_LINK =
  'https://play.google.com/store/apps/details?id=co.audius.app'
export const IOS_WEBSITE_STORE_LINK =
  'https://apps.apple.com/us/app/audius-music/id1491270519'
export const IOS_APP_STORE_LINK = 'itms-apps://us/app/audius-music/id1491270519'

// Static routes.
export const FEED_PAGE = '/feed'
export const TRENDING_PAGE = '/trending'
export const TRENDING_PLAYLISTS_PAGE_LEGACY = '/trending/playlists'

export const EXPLORE_PAGE = '/explore'
export const TRENDING_PLAYLISTS_PAGE = '/explore/playlists'
export const TRENDING_UNDERGROUND_PAGE = '/explore/underground'

// DEPRECATED - use /library instead.
export const SAVED_PAGE = '/favorites'
export const FAVORITES_PAGE = '/favorites'

export const LIBRARY_PAGE = '/library'
export const HISTORY_PAGE = '/history'
export const DASHBOARD_PAGE = '/dashboard'
export const AUDIO_PAGE = '/audio'
export const REWARDS_PAGE = '/rewards'
export const AIRDROP_PAGE = '/rewards/airdrop'
export const WALLET_AUDIO_PAGE = '/wallet/audio'
export const UPLOAD_PAGE = '/upload'
export const UPLOAD_ALBUM_PAGE = '/upload/album'
export const UPLOAD_PLAYLIST_PAGE = '/upload/playlist'
export const SETTINGS_PAGE = '/settings'
export const HOME_PAGE = '/'
export const NOT_FOUND_PAGE = '/404'
export const SIGN_IN_PAGE = '/signin'
export const SIGN_IN_CONFIRM_EMAIL_PAGE = '/signin/confirm-email'
export const SIGN_UP_PAGE = '/signup'
export const SIGN_ON_ALIASES = Object.freeze([
  '/login',
  '/join',
  '/signon',
  '/register'
])
export const OAUTH_LOGIN_PAGE = '/oauth/auth'
export const NOTIFICATION_PAGE = '/notifications'
export const APP_REDIRECT = '/app-redirect'
export const CHECK_PAGE = '/check'
export const DEACTIVATE_PAGE = '/deactivate'
export const CHATS_PAGE = '/messages'
export const CHAT_PAGE = '/messages/:id?'
export const PAYMENTS_PAGE = '/payments'
export const PURCHASES_PAGE = '/payments/purchases'
export const SALES_PAGE = '/payments/sales'
export const WITHDRAWALS_PAGE = '/payments/withdrawals'
export const COIN_DETAIL_PAGE = '/coins/:ticker'
export const COIN_DETAIL_BUY_PAGE = '/coins/:ticker/buy'
export const COIN_REDEEM_PAGE = '/coins/:ticker/redeem/:code?'
export const COIN_EXCLUSIVE_TRACKS_PAGE = '/coins/:ticker/exclusive-tracks'
export const EDIT_COIN_DETAILS_PAGE = '/coins/:ticker/edit'
export const WALLET_PAGE = '/wallet'
export const WALLET_GUIDE_PAGE = '/wallet/guide'
export const CASH_PAGE = '/cash'
export const COINS_CREATE_PAGE = '/coins/create'
export const COINS_EXPLORE_PAGE = '/coins'
export const PRIVATE_KEY_EXPORTER_SETTINGS_PAGE = '/settings/export-private-key'
export const DEV_TOOLS_PAGE = '/dev-tools'
export const SOLANA_TOOLS_PAGE = '/dev-tools/solana'
export const USER_ID_PARSER_PAGE = '/dev-tools/user-id-parser'
export const COIN_API_MOCKS_PAGE = '/dev-tools/coin-api-mocks'

// Multi-stage sign up flow routes
export enum SignUpPath {
  createEmail = 'create-email',
  createPassword = 'create-password',
  pickHandle = 'pick-handle',
  reviewHandle = 'review-handle',
  finishProfile = 'finish-profile',
  selectGenres = 'select-genres',
  selectArtists = 'select-artists',
  loading = 'loading',
  appCta = 'app-cta',
  completedRedirect = 'completed',
  completedReferrerRedirect = 'completed-referrer'
}
export const SIGN_UP_EMAIL_PAGE = `/signup/${SignUpPath.createEmail}`
export const SIGN_UP_START_PAGE = SIGN_UP_EMAIL_PAGE // entry point for sign up if needing to redirect to the beginning
export const SIGN_UP_PASSWORD_PAGE = `/signup/${SignUpPath.createPassword}`
export const SIGN_UP_HANDLE_PAGE = `/signup/${SignUpPath.pickHandle}`
export const SIGN_UP_REVIEW_HANDLE_PAGE = `/signup/${SignUpPath.reviewHandle}`
export const SIGN_UP_FINISH_PROFILE_PAGE = `/signup/${SignUpPath.finishProfile}`
export const SIGN_UP_GENRES_PAGE = `/signup/${SignUpPath.selectGenres}`
export const SIGN_UP_ARTISTS_PAGE = `/signup/${SignUpPath.selectArtists}`
export const SIGN_UP_APP_CTA_PAGE = `/signup/${SignUpPath.appCta}`
export const SIGN_UP_LOADING_PAGE = `/signup/${SignUpPath.loading}`
export const SIGN_UP_COMPLETED_REDIRECT = `/signup/${SignUpPath.completedRedirect}`
export const SIGN_UP_COMPLETED_REFERRER_REDIRECT = `/signup/${SignUpPath.completedReferrerRedirect}`

// Param routes.
export const NOTIFICATION_USERS_PAGE = '/notification/:notificationId/users'
export const SEARCH_CATEGORY_PAGE_LEGACY = '/search/:query/:category'
export const SEARCH_PAGE = '/search/:category?'
export const SEARCH_BASE_ROUTE = '/search'
export const SEARCH_PAGE_ALL = '/search/all'
export const SEARCH_PAGE_PROFILES = '/search/profiles'
export const SEARCH_PAGE_TRACKS = '/search/tracks'
export const SEARCH_PAGE_ALBUMS = '/search/albums'
export const SEARCH_PAGE_PLAYLISTS = '/search/playlists'
export const SEARCH_DOWNLOADS_AVAILABLE = '/search/tracks?hasDownloads=true'
export const SEARCH_PREMIUM_TRACKS = '/search/tracks?isPremium=true'
export const PLAYLIST_PAGE = '/:handle/playlist/:playlistName'
export const PLAYLIST_BY_PERMALINK_PAGE = '/:handle/playlist/:slug'
export const EDIT_PLAYLIST_PAGE = '/:handle/playlist/:slug/edit'
export const ALBUM_BY_PERMALINK_PAGE = '/:handle/album/:slug'
export const ALBUM_PAGE = '/:handle/album/:albumName'
export const EDIT_ALBUM_PAGE = '/:handle/album/:slug/edit'
export const TRACK_PAGE = '/:handle/:slug'
export const TRACK_EDIT_PAGE = '/:handle/:slug/edit'
export const TRACK_REMIXES_PAGE = '/:handle/:slug/remixes'
export const TRACK_COMMENTS_PAGE = '/:handle/:slug/comments'
export const PICK_WINNERS_PAGE = '/:handle/:slug/pick-winners'
export const PROFILE_PAGE = '/:handle'
export const PROFILE_PAGE_TRACKS = '/:handle/tracks'
export const PROFILE_PAGE_ALBUMS = '/:handle/albums'
export const PROFILE_PAGE_PLAYLISTS = '/:handle/playlists'
export const PROFILE_PAGE_REPOSTS = '/:handle/reposts'
export const PROFILE_PAGE_COMMENTS = '/:handle/comments'

// Opaque id routes
export const TRACK_ID_PAGE = '/tracks/:id'
export const USER_ID_PAGE = '/users/:id'
export const PLAYLIST_ID_PAGE = '/playlists/:id'

// Mobile Only Routes
export const REPOSTING_USERS_ROUTE = '/reposting_users'
export const FAVORITING_USERS_ROUTE = '/favoriting_users'
export const FOLLOWING_USERS_ROUTE = '/following'
export const FOLLOWERS_USERS_ROUTE = '/followers'
export const LEADERBOARD_USERS_ROUTE = '/leaderboard'
export const COIN_DETAIL_MOBILE_WEB_ROUTE = '/coins/:ticker/details'
export const COIN_EXCLUSIVE_TRACKS_MOBILE_ROUTE =
  '/coins/:ticker/exclusive-tracks/mobile'
export const SUPPORTING_USERS_ROUTE = '/supporting'
export const TOP_SUPPORTERS_USERS_ROUTE = '/top-supporters'
export const ACCOUNT_SETTINGS_PAGE = '/settings/account'
export const NOTIFICATION_SETTINGS_PAGE = '/settings/notifications'
export const ABOUT_SETTINGS_PAGE = '/settings/about'
export const CHANGE_EMAIL_SETTINGS_PAGE = '/settings/change-email'
export const CHANGE_PASSWORD_SETTINGS_PAGE = '/settings/change-password'
export const AUTHORIZED_APPS_SETTINGS_PAGE = '/settings/authorized-apps'
export const LABEL_ACCOUNT_SETTINGS_PAGE = '/settings/label-account'
export const ACCOUNTS_MANAGING_YOU_SETTINGS_PAGE = '/settings/managing-you'
export const ACCOUNTS_YOU_MANAGE_SETTINGS_PAGE = '/settings/accounts-you-manage'
export const TRENDING_GENRES = '/trending/genres'
export const EMPTY_PAGE = '/empty_page'

// External Links
export const AUDIUS_X_LINK = 'https://x.com/audius'
export const AUDIUS_INSTAGRAM_LINK = 'https://www.instagram.com/audius'
export const AUDIUS_DISCORD_LINK = 'https://discord.gg/audius'
export const AUDIUS_DISCORD_OAUTH_LINK =
  'https://discord.com/oauth2/authorize?client_id=1404512878890975373&response_type=code&redirect_uri=http%3A%2F%2Fdiscord.audius.co%3A8081%2Fdiscord_callback&scope=guilds.join+identify'
export const AUDIUS_TELEGRAM_LINK = 'https://t.me/Audius'
export const AUDIUS_PRESS_LINK = 'https://brand.audius.co'
export const AUDIUS_MERCH_LINK = 'https://merch.audius.co/'
export const AUDIUS_REMIX_CONTESTS_LINK = 'https://remix.audius.co/'
export const AUDIUS_BLOG_LINK = 'https://blog.audius.co/'
export const AUDIUS_AI_BLOG_LINK =
  'https://help.audius.co/help/What-should-I-know-about-AI-generated-music-on-Audius-0a5a8'
export const AUDIUS_CONTACT_EMAIL_LINK = 'mailto:contact@audius.co'
export const AUDIUS_PROTOCOL_DASHBOARD_LINK = 'https://dashboard.audius.org'
export const OPEN_MUSIC_LICENSE_LINK =
  'https://audius.org/open-music-license.pdf'

export const externalInternalLinks = [
  AUDIUS_PRESS_LINK,
  AUDIUS_MERCH_LINK,
  AUDIUS_REMIX_CONTESTS_LINK,
  AUDIUS_BLOG_LINK,
  'https://help.audius.co'
]

// Org Links
export const AUDIUS_ORG = 'https://audius.org'
export const AUDIUS_DOCS_LINK = 'https://docs.audius.org'
export const AUDIUS_TEAM_LINK = 'https://www.tikilabs.com/team'
export const AUDIUS_DEV_STAKER_LINK = 'https://audius.org/protocol'

export const AUDIUS_HOT_AND_NEW =
  '/audius/playlist/hot-new-on-audius-%F0%9F%94%A5-4281'
export const AUDIUS_HELP_LINK = 'https://help.audius.co/'
export const AUDIUS_ARTIST_COIN_HELP_LINK =
  'https://help.audius.co/product/artist-coins'

export const AUDIUS_CAREERS_LINK = 'https://www.tikilabs.com/careers'
export const AUDIUS_PODCAST_LINK =
  'https://www.youtube.com/playlist?list=PLKEECkHRxmPbcG59urFnWgsm6EQ9GAbPb'
export const AUDIUS_CYPHER_LINK = 'https://discord.gg/audius'
export const AUDIUS_API_LINK = 'https://audius.org/api'

export const AUDIUS_ARTIST_COINS_HELP_LINK =
  'https://help.audius.co/product/artist-coins'

// Birdeye Links
export const BIRDEYE_BASE_URL = 'https://birdeye.so'
export const birdeyeUrl = (mint: string, network: string = 'solana') =>
  `${BIRDEYE_BASE_URL}/${network}/token/${mint}`

export const authenticatedRoutes = [
  FEED_PAGE,
  SAVED_PAGE,
  LIBRARY_PAGE,
  HISTORY_PAGE,
  TRACK_EDIT_PAGE,
  UPLOAD_PAGE,
  SETTINGS_PAGE,
  PRIVATE_KEY_EXPORTER_SETTINGS_PAGE,
  DEACTIVATE_PAGE,
  CHATS_PAGE,
  CHAT_PAGE,
  PURCHASES_PAGE,
  SALES_PAGE,
  PAYMENTS_PAGE,
  WITHDRAWALS_PAGE,
  COINS_CREATE_PAGE,
  WALLET_GUIDE_PAGE,
  CASH_PAGE
]

export const guestRoutes = [
  SAVED_PAGE,
  LIBRARY_PAGE,
  PURCHASES_PAGE,
  SALES_PAGE,
  PAYMENTS_PAGE
]

export const publicSiteRoutes = [
  PRESS_PAGE,
  TERMS_OF_SERVICE,
  PRIVACY_POLICY,
  API_TERMS,
  ARTIST_COIN_TERMS,
  ARTIST_COIN_ACCEPTABLE_USE,
  DOWNLOAD_LINK,
  AUTH_REDIRECT
]

// ordered list of routes the App attempts to match in increasing order of route selectivity
export const orderedRoutes = [
  SIGN_IN_PAGE,
  SIGN_UP_PAGE,
  ...SIGN_ON_ALIASES,
  SIGN_UP_EMAIL_PAGE,
  SIGN_UP_PASSWORD_PAGE,
  SIGN_UP_HANDLE_PAGE,
  SIGN_UP_FINISH_PROFILE_PAGE,
  SIGN_UP_GENRES_PAGE,
  SIGN_UP_ARTISTS_PAGE,
  FEED_PAGE,
  NOTIFICATION_USERS_PAGE,
  NOTIFICATION_PAGE,
  TRENDING_GENRES,
  TRENDING_PAGE,
  EXPLORE_PAGE,
  EMPTY_PAGE,
  SEARCH_PAGE,
  UPLOAD_ALBUM_PAGE,
  UPLOAD_PLAYLIST_PAGE,
  TRACK_EDIT_PAGE,
  UPLOAD_PAGE,
  SAVED_PAGE,
  LIBRARY_PAGE,
  HISTORY_PAGE,
  DASHBOARD_PAGE,
  PAYMENTS_PAGE,
  AUDIO_PAGE,
  WALLET_AUDIO_PAGE,
  COIN_DETAIL_PAGE,
  EDIT_COIN_DETAILS_PAGE,
  WALLET_PAGE,
  CASH_PAGE,
  COINS_EXPLORE_PAGE,
  COINS_CREATE_PAGE,
  WALLET_GUIDE_PAGE,
  REWARDS_PAGE,
  SETTINGS_PAGE,
  ACCOUNT_SETTINGS_PAGE,
  NOTIFICATION_SETTINGS_PAGE,
  ABOUT_SETTINGS_PAGE,
  PRIVATE_KEY_EXPORTER_SETTINGS_PAGE,
  ACCOUNTS_MANAGING_YOU_SETTINGS_PAGE,
  ACCOUNTS_YOU_MANAGE_SETTINGS_PAGE,
  AUTHORIZED_APPS_SETTINGS_PAGE,
  PURCHASES_PAGE,
  SALES_PAGE,
  WITHDRAWALS_PAGE,
  NOT_FOUND_PAGE,
  HOME_PAGE,
  PLAYLIST_PAGE,
  ALBUM_PAGE,
  TRACK_PAGE,
  REPOSTING_USERS_ROUTE,
  FAVORITING_USERS_ROUTE,
  FOLLOWING_USERS_ROUTE,
  FOLLOWERS_USERS_ROUTE,
  SUPPORTING_USERS_ROUTE,
  TOP_SUPPORTERS_USERS_ROUTE,
  PROFILE_PAGE_COMMENTS,
  PROFILE_PAGE
]

export const staticRoutes = new Set([
  FEED_PAGE,
  TRENDING_PAGE,
  EXPLORE_PAGE,
  TRENDING_PLAYLISTS_PAGE,
  TRENDING_PLAYLISTS_PAGE_LEGACY,
  TRENDING_UNDERGROUND_PAGE,
  SEARCH_BASE_ROUTE,
  SEARCH_PAGE_ALL,
  SEARCH_PAGE_PROFILES,
  SEARCH_PAGE_TRACKS,
  SEARCH_PAGE_ALBUMS,
  SEARCH_PAGE_PLAYLISTS,
  SAVED_PAGE,
  LIBRARY_PAGE,
  FAVORITES_PAGE,
  HISTORY_PAGE,
  DASHBOARD_PAGE,
  PAYMENTS_PAGE,
  AUDIO_PAGE,
  WALLET_PAGE,
  WALLET_GUIDE_PAGE,
  COINS_EXPLORE_PAGE,
  COINS_CREATE_PAGE,
  WALLET_AUDIO_PAGE,
  CASH_PAGE,
  REWARDS_PAGE,
  TRACK_EDIT_PAGE,
  UPLOAD_PAGE,
  UPLOAD_ALBUM_PAGE,
  UPLOAD_PLAYLIST_PAGE,
  SETTINGS_PAGE,
  HOME_PAGE,
  NOT_FOUND_PAGE,
  EMPTY_PAGE,
  SIGN_IN_PAGE,
  SIGN_UP_PAGE,
  ...SIGN_ON_ALIASES,
  SIGN_UP_EMAIL_PAGE,
  SIGN_UP_PASSWORD_PAGE,
  SIGN_UP_HANDLE_PAGE,
  SIGN_UP_REVIEW_HANDLE_PAGE,
  SIGN_UP_FINISH_PROFILE_PAGE,
  SIGN_UP_GENRES_PAGE,
  SIGN_UP_ARTISTS_PAGE,
  SIGN_UP_APP_CTA_PAGE,
  SIGN_UP_LOADING_PAGE,
  SIGN_UP_COMPLETED_REDIRECT,
  NOTIFICATION_PAGE,
  APP_REDIRECT,
  REPOSTING_USERS_ROUTE,
  FAVORITING_USERS_ROUTE,
  FOLLOWING_USERS_ROUTE,
  FOLLOWERS_USERS_ROUTE,
  SUPPORTING_USERS_ROUTE,
  TOP_SUPPORTERS_USERS_ROUTE,
  ACCOUNT_SETTINGS_PAGE,
  NOTIFICATION_SETTINGS_PAGE,
  ABOUT_SETTINGS_PAGE,
  PRIVATE_KEY_EXPORTER_SETTINGS_PAGE,
  ACCOUNTS_MANAGING_YOU_SETTINGS_PAGE,
  ACCOUNTS_YOU_MANAGE_SETTINGS_PAGE,
  AUTHORIZED_APPS_SETTINGS_PAGE,
  TRENDING_GENRES,
  PURCHASES_PAGE,
  SALES_PAGE,
  WITHDRAWALS_PAGE,
  CHAT_PAGE,
  CHATS_PAGE
])

export const profilePage = (handle: string | null | undefined) => {
  return `/${encodeUrlName(handle ?? '')}`
}

export const collectionPage = (
  handle?: string | null,
  playlistName?: string | null,
  playlistId?: ID | null,
  permalink?: string | null,
  isAlbum?: boolean
) => {
  // Prioritize permalink if available. If not, default to legacy routing
  if (permalink) {
    return permalink
  } else if (playlistName && playlistId && handle) {
    const collectionType = isAlbum ? 'album' : 'playlist'
    return `/${encodeUrlName(handle)}/${collectionType}/${encodeUrlName(
      playlistName
    )}-${playlistId}`
  } else {
    console.error('Missing required arguments to get PlaylistPage route.')
    return ''
  }
}

/**
 * Generate a short base36 hash for a given string.
 * Used to generate short hashes for for queries and urls.
 */
export const getHash = (str: string) =>
  Math.abs(
    str.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0)
      return a & a
    }, 0)
  ).toString(36)

/** Given a pathname, finds a matching route */
export const findRoute = (pathname: string) => {
  for (const route of orderedRoutes) {
    const match = matchPath(route, pathname)
    if (match) {
      return route
    }
  }
  return null
}

type NullableSearchFilters = {
  [key in keyof SearchFilters]: SearchFilters[key] | null
}

type SearchOptions = {
  category?: SearchCategory
  query?: string
} & NullableSearchFilters

export const searchPage = (searchOptions: SearchOptions) => {
  const { category, ...searchParams } = searchOptions

  if (searchParams.genre) {
    searchParams.genre = convertGenreLabelToValue(searchParams.genre) as Genre
  }

  return qs.stringifyUrl({
    url: generatePath(SEARCH_PAGE, { category: category ?? null }),
    query: searchParams
  })
}

export const coinPage = (ticker: string) =>
  `/coins/${formatTickerForUrl(ticker)}`

export const coinRedeemPage = (ticker: string, code?: string) =>
  `/coins/${formatTickerForUrl(ticker)}/redeem${code ? `/${code}` : ''}`
