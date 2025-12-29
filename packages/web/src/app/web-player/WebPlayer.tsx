import {
  lazy,
  Suspense,
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback
} from 'react'

import {
  selectIsGuestAccount,
  useAccountStatus,
  useCurrentAccountUser,
  useHasAccount
} from '@audius/common/api'
import { Client, Status } from '@audius/common/models'
import { StringKeys } from '@audius/common/services'
import {
  COIN_DETAIL_BUY_PAGE,
  guestRoutes
} from '@audius/common/src/utils/route'
import { route } from '@audius/common/utils'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'
import {
  generatePath,
  matchPath,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
  useNavigate
} from 'react-router'
import semver from 'semver'

import {
  openSignOn as openSignOnAction,
  updateRouteOnCompletion as updateRouteOnCompletionAction
} from 'common/store/pages/signon/actions'
import { Pages as SignOnPages } from 'common/store/pages/signon/types'
import AnimatedSwitch from 'components/animated-switch/AnimatedSwitch'
import AppRedirectListener from 'components/app-redirect-popover/AppRedirectListener'
import { AppRedirectPopover } from 'components/app-redirect-popover/components/AppRedirectPopover'
import { AppBannerWrapper } from 'components/banner/AppBannerWrapper'
import { DownloadAppBanner } from 'components/banner/DownloadAppBanner'
import { UpdateAppBanner } from 'components/banner/UpdateAppBanner'
import { Web3ErrorBanner } from 'components/banner/Web3ErrorBanner'
import { ChatListener } from 'components/chat-listener/ChatListener'
import CookieBanner from 'components/cookie-banner/CookieBanner'
import { DevModeMananger } from 'components/dev-mode-manager/DevModeManager'
import { HeaderContextConsumer } from 'components/header/mobile/HeaderContextProvider'
import Navigator from 'components/nav/Navigator'
import TopLevelPage from 'components/nav/mobile/TopLevelPage'
import Notice from 'components/notice/Notice'
import { NotificationPage } from 'components/notification'
import PlayBarProvider from 'components/play-bar/PlayBarProvider'
import { RewardClaimedToast } from 'components/reward-claimed-toast/RewardClaimedToast'
import { USDCBalanceFetcher } from 'components/usdc-balance-fetcher/USDCBalanceFetcher'
import { useEnvironment } from 'hooks/useEnvironment'
import { MAIN_CONTENT_ID, MainContentContext } from 'pages/MainContentContext'
import { TableType } from 'pages/pay-and-earn-page/types'
import { SubPage } from 'pages/settings-page/components/mobile/SettingsPage'
import { remoteConfigInstance } from 'services/remote-config/remote-config-instance'
import { initializeSentry } from 'services/sentry'
import { SsrContext } from 'ssr/SsrContext'
import { getShowCookieBanner } from 'store/application/ui/cookieBanner/selectors'
import {
  decrementScrollCount as decrementScrollCountAction,
  incrementScrollCount as incrementScrollCountAction
} from 'store/application/ui/scrollLock/actions'
import { getClient } from 'utils/clientUtil'
import 'utils/redirect'
import { getPathname } from 'utils/route'

import styles from './WebPlayer.module.css'
const TrendingGenreSelectionPage = lazy(
  () => import('components/trending-genre-selection/TrendingGenreSelectionPage')
)
// Lazy load heavy page components for code-splitting
const ArtistCoinsExplorePage = lazy(() =>
  import('pages/artist-coins-explore-page/ArtistCoinsExplorePage').then(
    (m) => ({ default: m.ArtistCoinsExplorePage })
  )
)
const LaunchpadPage = lazy(() =>
  import('pages/artist-coins-launchpad-page').then((m) => ({
    default: m.LaunchpadPage
  }))
)
const MobileArtistCoinsSortPage = lazy(() =>
  import('pages/artist-coins-sort-page/MobileArtistCoinsSortPage').then(
    (m) => ({
      default: m.MobileArtistCoinsSortPage
    })
  )
)
const CashPage = lazy(() =>
  import('pages/cash-page').then((m) => ({ default: m.CashPage }))
)
const ChatPage = lazy(() => import('pages/chat-page'))
const CoinDetailPage = lazy(() =>
  import('pages/coin-detail-page/CoinDetailPage').then((m) => ({
    default: m.CoinDetailPage
  }))
)
const ExclusiveTracksPage = lazy(() =>
  import('pages/coin-detail-page/components/ExclusiveTracksPage').then((m) => ({
    default: m.ExclusiveTracksPage
  }))
)
const ArtistCoinDetailsPage = lazy(() =>
  import('pages/coin-detail-page/components/mobile/ArtistCoinDetailsPage').then(
    (m) => ({ default: m.ArtistCoinDetailsPage })
  )
)
const MobileExclusiveTracksPage = lazy(() =>
  import('pages/coin-detail-page/components/mobile/ExclusiveTracksPage').then(
    (m) => ({ default: m.ExclusiveTracksPage })
  )
)
const CoinRedeemPage = lazy(() =>
  import('pages/coin-redeem-page/CoinRedeemPage').then((m) => ({
    default: m.CoinRedeemPage
  }))
)
const CollectionPage = lazy(
  () => import('pages/collection-page/CollectionPage')
)
const CommentHistoryPage = lazy(
  () => import('pages/comment-history/CommentHistoryPage')
)
const DashboardPage = lazy(() =>
  import('pages/dashboard-page/DashboardPage').then((m) => ({
    default: m.DashboardPage
  }))
)
const DeactivateAccountPage = lazy(() =>
  import('pages/deactivate-account-page/DeactivateAccountPage').then((m) => ({
    default: m.DeactivateAccountPage
  }))
)
const DevTools = lazy(() => import('pages/dev-tools/DevTools'))
const SolanaToolsPage = lazy(() => import('pages/dev-tools/SolanaToolsPage'))
const UserIdParserPage = lazy(() => import('pages/dev-tools/UserIdParserPage'))
const EditCoinDetailsPage = lazy(() =>
  import('pages/edit-coin-details-page/EditCoinDetailsPage').then((m) => ({
    default: m.EditCoinDetailsPage
  }))
)
const EditCollectionPage = lazy(() =>
  import('pages/edit-collection-page').then((m) => ({
    default: m.EditCollectionPage
  }))
)
const EmptyPage = lazy(() => import('pages/empty-page/EmptyPage'))
const FavoritesPage = lazy(() => import('pages/favorites-page/FavoritesPage'))
const FbSharePage = lazy(() =>
  import('pages/fb-share-page/FbSharePage').then((m) => ({
    default: m.FbSharePage
  }))
)
const FeedPage = lazy(() => import('pages/feed-page/FeedPage'))
const FollowersPage = lazy(() => import('pages/followers-page/FollowersPage'))
const FollowingPage = lazy(() => import('pages/following-page/FollowingPage'))
const HistoryPage = lazy(() => import('pages/history-page/HistoryPage'))
const LeaderboardPage = lazy(() =>
  import('pages/leaderboard-page/LeaderboardPage').then((m) => ({
    default: m.LeaderboardPage
  }))
)
const LibraryPage = lazy(() => import('pages/library-page/LibraryPage'))
const NotFoundPage = lazy(() =>
  import('pages/not-found-page/NotFoundPage').then((m) => ({
    default: m.NotFoundPage
  }))
)
const NotificationUsersPage = lazy(() =>
  import('pages/notification-users-page/NotificationUsersPage').then((m) => ({
    default: m.NotificationUsersPage
  }))
)
const PayAndEarnPage = lazy(() =>
  import('pages/pay-and-earn-page/PayAndEarnPage').then((m) => ({
    default: m.PayAndEarnPage
  }))
)
const PickWinnersPage = lazy(() =>
  import('pages/pick-winners-page/PickWinnersPage').then((m) => ({
    default: m.PickWinnersPage
  }))
)
const ProfilePage = lazy(() => import('pages/profile-page/ProfilePage'))
const RemixesPage = lazy(() => import('pages/remixes-page/RemixesPage'))
const RepostsPage = lazy(() => import('pages/reposts-page/RepostsPage'))
const RequiresUpdate = lazy(() =>
  import('pages/requires-update/RequiresUpdate').then((m) => ({
    default: m.RequiresUpdate
  }))
)
const RewardsPage = lazy(() =>
  import('pages/rewards-page/RewardsPage').then((m) => ({
    default: m.RewardsPage
  }))
)
const ExplorePage = lazy(() =>
  import('pages/search-explore-page/ExplorePage').then((m) => ({
    default: m.ExplorePage
  }))
)
const SettingsPage = lazy(() => import('pages/settings-page/SettingsPage'))
const SupportingPage = lazy(
  () => import('pages/supporting-page/SupportingPage')
)
const TopSupportersPage = lazy(
  () => import('pages/top-supporters-page/TopSupportersPage')
)
const TrackCommentsPage = lazy(() =>
  import('pages/track-page/TrackCommentsPage').then((m) => ({
    default: m.TrackCommentsPage
  }))
)
const TrackPage = lazy(() => import('pages/track-page/TrackPage'))
const TrendingPage = lazy(() => import('pages/trending-page/TrendingPage'))
const TrendingPlaylistsPage = lazy(
  () => import('pages/trending-playlists/TrendingPlaylistPage')
)
const TrendingUndergroundPage = lazy(
  () => import('pages/trending-underground/TrendingUndergroundPage')
)
const Visualizer = lazy(() => import('pages/visualizer/Visualizer'))
const WalletPage = lazy(() =>
  import('pages/wallet-page').then((m) => ({ default: m.WalletPage }))
)

const {
  FEED_PAGE,
  TRENDING_PAGE,
  NOTIFICATION_PAGE,
  NOTIFICATION_USERS_PAGE,
  EXPLORE_PAGE,
  SAVED_PAGE,
  LIBRARY_PAGE,
  HISTORY_PAGE,
  DASHBOARD_PAGE,
  COIN_DETAIL_PAGE,
  COIN_REDEEM_PAGE,
  REWARDS_PAGE,
  UPLOAD_PAGE,
  UPLOAD_ALBUM_PAGE,
  UPLOAD_PLAYLIST_PAGE,
  SETTINGS_PAGE,
  HOME_PAGE,
  NOT_FOUND_PAGE,
  SEARCH_PAGE,
  PLAYLIST_PAGE,

  ALBUM_PAGE,
  TRACK_PAGE,
  TRACK_COMMENTS_PAGE,
  TRACK_REMIXES_PAGE,
  PICK_WINNERS_PAGE,
  PROFILE_PAGE,
  authenticatedRoutes,
  EMPTY_PAGE,
  REPOSTING_USERS_ROUTE,
  FAVORITING_USERS_ROUTE,
  ACCOUNT_SETTINGS_PAGE,
  CHANGE_PASSWORD_SETTINGS_PAGE,
  CHANGE_EMAIL_SETTINGS_PAGE,
  LABEL_ACCOUNT_SETTINGS_PAGE,
  NOTIFICATION_SETTINGS_PAGE,
  ABOUT_SETTINGS_PAGE,
  FOLLOWING_USERS_ROUTE,
  FOLLOWERS_USERS_ROUTE,
  LEADERBOARD_USERS_ROUTE,
  COIN_DETAIL_MOBILE_WEB_ROUTE,
  TRENDING_GENRES,
  APP_REDIRECT,
  TRACK_ID_PAGE,
  USER_ID_PAGE,
  PLAYLIST_ID_PAGE,
  TRENDING_PLAYLISTS_PAGE,
  PROFILE_PAGE_TRACKS,
  PROFILE_PAGE_ALBUMS,
  PROFILE_PAGE_PLAYLISTS,
  PROFILE_PAGE_REPOSTS,
  TRENDING_UNDERGROUND_PAGE,
  COIN_EXCLUSIVE_TRACKS_PAGE,
  COIN_EXCLUSIVE_TRACKS_MOBILE_ROUTE,
  CHECK_PAGE,
  TRENDING_PLAYLISTS_PAGE_LEGACY,
  DEACTIVATE_PAGE,
  SUPPORTING_USERS_ROUTE,
  TOP_SUPPORTERS_USERS_ROUTE,
  publicSiteRoutes,
  CHAT_PAGE,
  PROFILE_PAGE_COMMENTS,
  PAYMENTS_PAGE,
  WITHDRAWALS_PAGE,
  PURCHASES_PAGE,
  SALES_PAGE,
  AUTHORIZED_APPS_SETTINGS_PAGE,
  ACCOUNTS_MANAGING_YOU_SETTINGS_PAGE,
  ACCOUNTS_YOU_MANAGE_SETTINGS_PAGE,
  TRACK_EDIT_PAGE,
  SEARCH_CATEGORY_PAGE_LEGACY,
  SEARCH_BASE_ROUTE,
  EDIT_PLAYLIST_PAGE,
  EDIT_ALBUM_PAGE,
  AIRDROP_PAGE,
  WALLET_PAGE,
  CASH_PAGE,
  COINS_CREATE_PAGE,
  COINS_EXPLORE_PAGE,
  EDIT_COIN_DETAILS_PAGE,
  DEV_TOOLS_PAGE,
  SOLANA_TOOLS_PAGE,
  USER_ID_PARSER_PAGE
} = route

// TODO: do we need to lazy load edit?
const EditTrackPage = lazy(() => import('pages/edit-page'))
const UploadPage = lazy(() => import('pages/upload-page'))
const CheckPage = lazy(() => import('pages/check-page/CheckPage'))
const Modals = lazy(() => import('pages/modals/Modals'))
const ConnectedMusicConfetti = lazy(
  () => import('components/music-confetti/ConnectedMusicConfetti')
)

const includeSearch = (search: string): boolean => {
  return search.includes('oauth_token') || search.includes('code')
}

const validSearchCategories = [
  'all',
  'tracks',
  'profiles',
  'albums',
  'playlists'
]

initializeSentry()

// Wrapper components for routes that need params or location
const SearchCategoryLegacyRedirect = () => {
  const params = useParams<{ category?: string; query?: string }>()
  const to = {
    pathname: generatePath(SEARCH_PAGE, {
      category: params.category ?? ''
    }),
    search: new URLSearchParams({
      query: params.query ?? ''
    }).toString()
  }
  return <Navigate to={to} replace />
}

type SearchPageRouteProps = {
  validSearchCategories: string[]
}

const SearchPageRoute = ({ validSearchCategories }: SearchPageRouteProps) => {
  const params = useParams<{ category?: string }>()
  const { category } = params

  if (category && !validSearchCategories.includes(category)) {
    return (
      <Navigate
        to={{
          pathname: SEARCH_BASE_ROUTE,
          search: new URLSearchParams({
            query: category
          }).toString()
        }}
        replace
      />
    )
  }
  return <ExplorePage />
}

type CoinDetailPageRouteProps = {
  mainContentRef: React.RefObject<HTMLDivElement>
}

const CoinDetailPageRoute = ({ mainContentRef }: CoinDetailPageRouteProps) => {
  const params = useParams<{ ticker?: string }>()
  const location = useLocation()
  const { ticker } = params

  if (ticker && ticker !== ticker.toUpperCase()) {
    return (
      <Navigate
        to={{
          pathname: COIN_DETAIL_PAGE.replace(':ticker', ticker.toUpperCase()),
          search: location.search,
          hash: location.hash
        }}
        replace
      />
    )
  }
  return <CoinDetailPage />
}

const CoinExclusiveTracksMobileRoute = () => {
  const params = useParams<{ ticker?: string }>()
  const { ticker } = params
  return <MobileExclusiveTracksPage ticker={ticker ?? ''} />
}

type HomePageRedirectProps = {
  isGuestAccount: boolean
}

const HomePageRedirect = ({ isGuestAccount }: HomePageRedirectProps) => {
  const location = useLocation()
  const currentPath = getPathname(location)
  const to = {
    pathname:
      currentPath === HOME_PAGE
        ? isGuestAccount
          ? LIBRARY_PAGE
          : FEED_PAGE
        : currentPath,
    search: includeSearch(location.search) ? location.search : ''
  }
  return <Navigate to={to} replace />
}

type CollectionPageRouteProps = {
  type: 'playlist' | 'album'
  mainContentRef: React.RefObject<HTMLDivElement>
}

const CollectionPageRoute = ({
  type,
  mainContentRef
}: CollectionPageRouteProps) => {
  const location = useLocation()
  return <CollectionPage key={location.pathname} type={type} />
}

type ProfilePageRouteProps = {
  mainContentRef: React.RefObject<HTMLDivElement>
}

const ProfilePageRoute = ({ mainContentRef }: ProfilePageRouteProps) => {
  return <ProfilePage containerRef={mainContentRef} />
}

type WebPlayerState = {
  mainContent: null
  showWebUpdateBanner: boolean
  showRequiresWebUpdate: boolean
  showRequiresUpdate: boolean
  isUpdating: boolean
  initialPage: boolean
  entryRoute: string
  currentRoute: string
}

type WebPlayerProps = {
  isProduction: boolean
  mainContentRef: React.RefObject<HTMLDivElement>
  setMainContentRef: (node: HTMLDivElement) => void
}

const WebPlayer = (props: WebPlayerProps) => {
  const { isProduction, mainContentRef, setMainContentRef } = props
  const location = useLocation()
  const navigate = useNavigate()

  const dispatch = useDispatch()

  const { data: accountUserData } = useCurrentAccountUser({
    select: (user) => ({
      userHandle: user.handle,
      isGuestAccount: selectIsGuestAccount(user)
    })
  })
  const hasAccount = useHasAccount()
  const { userHandle, isGuestAccount = false } = accountUserData ?? {}
  const { data: accountStatus } = useAccountStatus()
  const showCookieBanner = useSelector(getShowCookieBanner)

  // Convert mapDispatchToProps to useCallback with useDispatch
  const updateRouteOnSignUpCompletion = useCallback(
    (route: string) => dispatch(updateRouteOnCompletionAction(route)),
    [dispatch]
  )

  const openSignOn = useCallback(
    (
      signIn = true,
      page: string | null = null,
      fields: Record<string, unknown> = {}
    ) => dispatch(openSignOnAction(signIn, page, fields)),
    [dispatch]
  )

  const handleIncrementScroll = useCallback(
    () => dispatch(incrementScrollCountAction()),
    [dispatch]
  )

  const handleDecrementScroll = useCallback(
    () => dispatch(decrementScrollCountAction()),
    [dispatch]
  )

  const context = useContext(SsrContext)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ipcRef = useRef<any>(null)
  const currentPathname = getPathname(location)
  const previousRouteRef = useRef<string>(currentPathname)

  const [state, setState] = useState<WebPlayerState>({
    mainContent: null,
    showWebUpdateBanner: false,
    showRequiresWebUpdate: false,
    showRequiresUpdate: false,
    isUpdating: false,
    initialPage: true,
    entryRoute: currentPathname,
    currentRoute: currentPathname
  })

  const scrollToTop = useCallback(() => {
    const current = mainContentRef.current
    if (current && 'scrollTo' in current) {
      current.scrollTo({ top: 0 })
    }
  }, [mainContentRef])

  // Listen to location changes using useLocation hook
  useEffect(() => {
    const newRoute = getPathname(location)
    const previousRoute = previousRouteRef.current

    // Only scroll to top and update state if the pathname actually changed (we dont want to scroll on query params)
    if (newRoute !== previousRoute) {
      scrollToTop()
      previousRouteRef.current = newRoute
      setState((prev) => ({
        ...prev,
        initialPage: false,
        currentRoute: newRoute
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, scrollToTop])

  useEffect(() => {
    const client = getClient()

    if (client === Client.ELECTRON) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ipcRef.current = window.require('electron').ipcRenderer

      ipcRef.current.on('updateDownloaded', (_event: any, _arg: any) => {
        console.info('updateDownload', _event, _arg)
      })

      ipcRef.current.on('updateDownloadProgress', (_event: any, _arg: any) => {
        console.info('updateDownloadProgress', _event, _arg)
      })

      ipcRef.current.on('updateError', (_event: any, _arg: any) => {
        console.error('updateError', _event, _arg)
      })

      ipcRef.current.on(
        'webUpdateAvailable',
        async (_event: any, arg: { currentVersion: string }) => {
          console.info('webUpdateAvailable', _event, arg)
          const { currentVersion } = arg
          await remoteConfigInstance.waitForRemoteConfig()
          const minAppVersion = remoteConfigInstance.getRemoteVar(
            StringKeys.MIN_APP_VERSION
          )

          if (minAppVersion && semver.lt(currentVersion, minAppVersion)) {
            setState((prev) => ({ ...prev, showRequiresWebUpdate: true }))
          } else {
            setState((prev) => ({ ...prev, showWebUpdateBanner: true }))
          }
        }
      )

      ipcRef.current.on(
        'updateAvailable',
        (_event: any, arg: { version: string; currentVersion: string }) => {
          console.info('updateAvailable', _event, arg)
          const { version, currentVersion } = arg
          if (
            semver.major(currentVersion) < semver.major(version) ||
            semver.minor(currentVersion) < semver.minor(version)
          ) {
            setState((prev) => ({ ...prev, showRequiresUpdate: true }))
          }
        }
      )

      if (typeof window !== 'undefined') {
        const windowOpen = window.open

        const a = document.createElement('a')
        window.open = (...args: Parameters<typeof window.open>) => {
          const url = args[0]
          if (!url) {
            const popup = windowOpen(window.location.href)
            if (!popup) return null
            const win = {
              popup,
              closed: popup.closed,
              close: () => {
                popup.close()
              }
            }
            Object.defineProperty(win, 'location', {
              get: () => {
                a.href = popup.location.href
                if (!a.search) {
                  return {
                    href: popup.location.href,
                    search: a.search,
                    hostname: ''
                  }
                }
                return {
                  href: popup.location.href,
                  search: a.search,
                  hostname: a.hostname
                }
              },
              set: (locationHref: string) => {
                popup.location.href = locationHref
                // @ts-expect-error - setting custom property
                win.locationHref = locationHref
              }
            })
            return win as unknown as Window
          }
          return windowOpen(...args)
        }
      }
    }

    return () => {
      if (client === Client.ELECTRON && ipcRef.current) {
        ipcRef.current.removeAllListeners('updateDownloaded')
        ipcRef.current.removeAllListeners('updateAvailable')
      }
    }
  }, [])

  const pushWithToken = useCallback(
    (route: string) => {
      const search = location.search
      if (includeSearch(search)) {
        navigate(`${route}${search}`)
      } else {
        navigate(route)
      }
    },
    [navigate, location.search]
  )

  useEffect(() => {
    const allowedRoutes = isGuestAccount ? guestRoutes : authenticatedRoutes
    if (
      !hasAccount &&
      accountStatus &&
      accountStatus !== Status.IDLE &&
      accountStatus !== Status.LOADING &&
      allowedRoutes.some((route) => {
        const match = matchPath(route, getPathname(location))
        return !!match
      })
    ) {
      pushWithToken(TRENDING_PAGE)
      dispatch(openSignOnAction(true, SignOnPages.SIGNIN))
      dispatch(updateRouteOnCompletionAction(state.entryRoute))
    }
  }, [
    hasAccount,
    accountStatus,
    location,
    isGuestAccount,
    pushWithToken,
    dispatch,
    state.entryRoute,
    openSignOn,
    updateRouteOnSignUpCompletion
  ])

  const acceptUpdateApp = () => {
    setState((prev) => ({ ...prev, isUpdating: true }))
    ipcRef.current?.send('update')
  }

  const dismissUpdateWebAppBanner = () => {
    setState((prev) => ({ ...prev, showWebUpdateBanner: false }))
  }

  const dismissRequiresWebUpdate = () => {
    setState((prev) => ({ ...prev, showRequiresWebUpdate: false }))
  }

  const acceptWebUpdate = () => {
    if (state.showWebUpdateBanner) {
      dismissUpdateWebAppBanner()
    } else if (state.showRequiresWebUpdate) {
      dismissRequiresWebUpdate()
    }
    setState((prev) => ({ ...prev, isUpdating: true }))
    ipcRef.current?.send('web-update')
  }

  const {
    showWebUpdateBanner,
    isUpdating,
    showRequiresUpdate,
    showRequiresWebUpdate,
    initialPage,
    currentRoute
  } = state

  const isMobile = context.isMobile

  if (showRequiresUpdate)
    return <RequiresUpdate isUpdating={isUpdating} onUpdate={acceptUpdateApp} />

  if (showRequiresWebUpdate)
    return <RequiresUpdate isUpdating={isUpdating} onUpdate={acceptWebUpdate} />

  const noScroll = !!matchPath(CHAT_PAGE, currentRoute)

  return (
    <div className={styles.root}>
      <AppBannerWrapper>
        <DownloadAppBanner />
        {/* Re-enable for ToS updates */}
        {/* <TermsOfServiceUpdateBanner /> */}
        <Web3ErrorBanner />
        {showWebUpdateBanner ? (
          <UpdateAppBanner
            onAccept={acceptWebUpdate}
            onClose={dismissUpdateWebAppBanner}
          />
        ) : null}
      </AppBannerWrapper>
      <ChatListener />
      <USDCBalanceFetcher />
      <div className={cn(styles.app, { [styles.mobileApp]: isMobile })}>
        {showCookieBanner ? <CookieBanner /> : null}
        <Notice shouldPadTop={false} />
        <Navigator />
        <div
          ref={(node) => {
            if (node) setMainContentRef(node)
          }}
          id={MAIN_CONTENT_ID}
          role='main'
          className={cn(styles.mainContentWrapper, {
            [styles.mainContentWrapperMobile]: isMobile,
            [styles.noScroll]: noScroll
          })}
        >
          {isMobile && <TopLevelPage />}
          {isMobile && <HeaderContextConsumer />}

          <Suspense fallback={null}>
            {isMobile ? (
              <AnimatedSwitch
                isInitialPage={initialPage}
                handle={userHandle ?? null}
              >
                {publicSiteRoutes.map((route) => (
                  <Route
                    key={route}
                    path={route}
                    element={<Navigate to='/' replace />}
                  />
                ))}
                <Route path='/fb/share' element={<FbSharePage />} />
                <Route
                  path={FEED_PAGE}
                  element={<FeedPage containerRef={mainContentRef} />}
                />
                <Route
                  path={NOTIFICATION_USERS_PAGE}
                  element={<NotificationUsersPage />}
                />
                <Route
                  path={NOTIFICATION_PAGE}
                  element={<NotificationPage />}
                />
                {isMobile ? (
                  <Route
                    path={TRENDING_GENRES}
                    element={<TrendingGenreSelectionPage />}
                  />
                ) : (
                  <Route
                    path={TRENDING_GENRES}
                    element={<Navigate to={TRENDING_PAGE} replace />}
                  />
                )}
                <Route
                  path={TRENDING_PAGE}
                  element={<TrendingPage containerRef={mainContentRef} />}
                />
                <Route
                  path={TRENDING_PLAYLISTS_PAGE_LEGACY}
                  element={<Navigate to={TRENDING_PLAYLISTS_PAGE} replace />}
                />
                <Route
                  path={TRENDING_PLAYLISTS_PAGE}
                  element={
                    <TrendingPlaylistsPage
                      containerRef={mainContentRef.current!}
                    />
                  }
                />
                <Route
                  path={TRENDING_UNDERGROUND_PAGE}
                  element={
                    <TrendingUndergroundPage
                      containerRef={mainContentRef.current!}
                    />
                  }
                />
                <Route path={EXPLORE_PAGE} element={<ExplorePage />} />
                <Route
                  path={SEARCH_CATEGORY_PAGE_LEGACY}
                  element={<SearchCategoryLegacyRedirect />}
                />
                <Route
                  path={SEARCH_PAGE}
                  element={
                    <SearchPageRoute
                      validSearchCategories={validSearchCategories}
                    />
                  }
                />
                {!isMobile ? (
                  <>
                    <Route
                      path={UPLOAD_ALBUM_PAGE}
                      element={<UploadPage scrollToTop={scrollToTop} />}
                    />
                    <Route
                      path={UPLOAD_PLAYLIST_PAGE}
                      element={<UploadPage scrollToTop={scrollToTop} />}
                    />
                    <Route
                      path={UPLOAD_PAGE}
                      element={<UploadPage scrollToTop={scrollToTop} />}
                    />
                  </>
                ) : (
                  <>
                    <Route
                      path={UPLOAD_ALBUM_PAGE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={UPLOAD_PLAYLIST_PAGE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={UPLOAD_PAGE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                  </>
                )}
                <Route path={SAVED_PAGE} element={<LibraryPage />} />
                <Route path={LIBRARY_PAGE} element={<LibraryPage />} />
                <Route path={HISTORY_PAGE} element={<HistoryPage />} />
                {!isProduction ? (
                  <Route path={DEV_TOOLS_PAGE} element={<DevTools />} />
                ) : null}
                {!isProduction ? (
                  <Route
                    path={SOLANA_TOOLS_PAGE}
                    element={<SolanaToolsPage />}
                  />
                ) : null}
                {!isProduction ? (
                  <Route
                    path={USER_ID_PARSER_PAGE}
                    element={<UserIdParserPage />}
                  />
                ) : null}

                {!isMobile ? (
                  <Route path={DASHBOARD_PAGE} element={<DashboardPage />} />
                ) : (
                  <Route
                    path={DASHBOARD_PAGE}
                    element={<Navigate to={TRENDING_PAGE} replace />}
                  />
                )}
                <Route
                  path={WITHDRAWALS_PAGE}
                  element={<PayAndEarnPage tableView={TableType.WITHDRAWALS} />}
                />
                <Route
                  path={PURCHASES_PAGE}
                  element={<PayAndEarnPage tableView={TableType.PURCHASES} />}
                />
                <Route
                  path={SALES_PAGE}
                  element={<PayAndEarnPage tableView={TableType.SALES} />}
                />
                <Route
                  path={COINS_EXPLORE_PAGE}
                  element={<ArtistCoinsExplorePage />}
                />
                <Route
                  path='/coins/sort'
                  element={<MobileArtistCoinsSortPage />}
                />
                <Route path={COINS_CREATE_PAGE} element={<LaunchpadPage />} />
                <Route
                  path={COIN_DETAIL_PAGE}
                  element={
                    <CoinDetailPageRoute mainContentRef={mainContentRef} />
                  }
                />
                <Route
                  path={COIN_DETAIL_BUY_PAGE}
                  element={
                    <CoinDetailPageRoute mainContentRef={mainContentRef} />
                  }
                />
                <Route path={COIN_REDEEM_PAGE} element={<CoinRedeemPage />} />
                {!isMobile ? (
                  <Route
                    path={COIN_EXCLUSIVE_TRACKS_PAGE}
                    element={<ExclusiveTracksPage />}
                  />
                ) : (
                  <Route
                    path={COIN_EXCLUSIVE_TRACKS_PAGE}
                    element={<Navigate to={TRENDING_PAGE} replace />}
                  />
                )}
                <Route
                  path={COIN_EXCLUSIVE_TRACKS_MOBILE_ROUTE}
                  element={<CoinExclusiveTracksMobileRoute />}
                />
                <Route
                  path={EDIT_COIN_DETAILS_PAGE}
                  element={<EditCoinDetailsPage />}
                />
                <Route path={PAYMENTS_PAGE} element={<WalletPage />} />
                <Route path={WALLET_PAGE} element={<WalletPage />} />
                <Route path={CASH_PAGE} element={<CashPage />} />
                <Route path={REWARDS_PAGE} element={<RewardsPage />} />
                <Route path={AIRDROP_PAGE} element={<RewardsPage />} />

                <Route path={CHAT_PAGE} element={<ChatPage />} />
                <Route
                  path={DEACTIVATE_PAGE}
                  element={<DeactivateAccountPage />}
                />
                <Route
                  path={SETTINGS_PAGE}
                  element={<SettingsPage containerRef={mainContentRef} />}
                />
                <Route
                  path={AUTHORIZED_APPS_SETTINGS_PAGE}
                  element={<SettingsPage containerRef={mainContentRef} />}
                />
                <Route
                  path={ACCOUNTS_YOU_MANAGE_SETTINGS_PAGE}
                  element={<SettingsPage containerRef={mainContentRef} />}
                />
                <Route
                  path={ACCOUNTS_MANAGING_YOU_SETTINGS_PAGE}
                  element={<SettingsPage containerRef={mainContentRef} />}
                />
                <Route
                  path={LABEL_ACCOUNT_SETTINGS_PAGE}
                  element={<SettingsPage containerRef={mainContentRef} />}
                />
                <Route path={CHECK_PAGE} element={<CheckPage />} />
                {isMobile ? (
                  <>
                    <Route
                      path={ACCOUNT_SETTINGS_PAGE}
                      element={
                        <SettingsPage
                          containerRef={mainContentRef}
                          subPage={SubPage.ACCOUNT}
                        />
                      }
                    />
                    <Route
                      path={CHANGE_PASSWORD_SETTINGS_PAGE}
                      element={
                        <SettingsPage
                          containerRef={mainContentRef}
                          subPage={SubPage.CHANGE_PASSWORD}
                        />
                      }
                    />
                    <Route
                      path={CHANGE_EMAIL_SETTINGS_PAGE}
                      element={
                        <SettingsPage
                          containerRef={mainContentRef}
                          subPage={SubPage.CHANGE_EMAIL}
                        />
                      }
                    />
                    <Route
                      path={NOTIFICATION_SETTINGS_PAGE}
                      element={
                        <SettingsPage
                          containerRef={mainContentRef}
                          subPage={SubPage.NOTIFICATIONS}
                        />
                      }
                    />
                    <Route
                      path={ABOUT_SETTINGS_PAGE}
                      element={
                        <SettingsPage
                          containerRef={mainContentRef}
                          subPage={SubPage.ABOUT}
                        />
                      }
                    />
                  </>
                ) : (
                  <>
                    <Route
                      path={ACCOUNT_SETTINGS_PAGE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={CHANGE_PASSWORD_SETTINGS_PAGE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={CHANGE_EMAIL_SETTINGS_PAGE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={NOTIFICATION_SETTINGS_PAGE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={ABOUT_SETTINGS_PAGE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                  </>
                )}
                <Route path={APP_REDIRECT} element={<AppRedirectListener />} />
                <Route path={NOT_FOUND_PAGE} element={<NotFoundPage />} />
                <Route
                  path={PLAYLIST_PAGE}
                  element={
                    <CollectionPageRoute
                      type='playlist'
                      mainContentRef={mainContentRef}
                    />
                  }
                />
                <Route
                  path={EDIT_PLAYLIST_PAGE}
                  element={<EditCollectionPage />}
                />
                <Route
                  path={EDIT_ALBUM_PAGE}
                  element={<EditCollectionPage />}
                />
                <Route
                  path={ALBUM_PAGE}
                  element={
                    <CollectionPageRoute
                      type='album'
                      mainContentRef={mainContentRef}
                    />
                  }
                />
                <Route
                  path={USER_ID_PAGE}
                  element={<ProfilePageRoute mainContentRef={mainContentRef} />}
                />
                <Route path={TRACK_ID_PAGE} element={<TrackPage />} />
                <Route
                  path={PLAYLIST_ID_PAGE}
                  element={<CollectionPage type='playlist' />}
                />
                <Route
                  path={PROFILE_PAGE_TRACKS}
                  element={<ProfilePageRoute mainContentRef={mainContentRef} />}
                />
                <Route
                  path={PROFILE_PAGE_ALBUMS}
                  element={<ProfilePageRoute mainContentRef={mainContentRef} />}
                />
                <Route
                  path={PROFILE_PAGE_PLAYLISTS}
                  element={<ProfilePageRoute mainContentRef={mainContentRef} />}
                />
                <Route
                  path={PROFILE_PAGE_REPOSTS}
                  element={<ProfilePageRoute mainContentRef={mainContentRef} />}
                />
                <Route
                  path={PROFILE_PAGE_COMMENTS}
                  element={<CommentHistoryPage />}
                />
                <Route path={TRACK_PAGE} element={<TrackPage />} />
                {isMobile ? (
                  <Route
                    path={TRACK_COMMENTS_PAGE}
                    element={<TrackCommentsPage />}
                  />
                ) : (
                  <Route
                    path={TRACK_COMMENTS_PAGE}
                    element={<Navigate to={TRENDING_PAGE} replace />}
                  />
                )}
                {!isMobile ? (
                  <Route
                    path={TRACK_EDIT_PAGE}
                    element={<EditTrackPage scrollToTop={scrollToTop} />}
                  />
                ) : (
                  <Route
                    path={TRACK_EDIT_PAGE}
                    element={<Navigate to={TRENDING_PAGE} replace />}
                  />
                )}

                <Route
                  path={TRACK_REMIXES_PAGE}
                  element={<RemixesPage containerRef={mainContentRef} />}
                />
                <Route path={PICK_WINNERS_PAGE} element={<PickWinnersPage />} />
                {isMobile ? (
                  <>
                    <Route
                      path={REPOSTING_USERS_ROUTE}
                      element={<RepostsPage />}
                    />
                    <Route
                      path={FAVORITING_USERS_ROUTE}
                      element={<FavoritesPage />}
                    />
                    <Route
                      path={FOLLOWING_USERS_ROUTE}
                      element={<FollowingPage />}
                    />
                    <Route
                      path={FOLLOWERS_USERS_ROUTE}
                      element={<FollowersPage />}
                    />
                    <Route
                      path={LEADERBOARD_USERS_ROUTE}
                      element={<LeaderboardPage />}
                    />
                    <Route
                      path={COIN_DETAIL_MOBILE_WEB_ROUTE}
                      element={<ArtistCoinDetailsPage />}
                    />
                    <Route
                      path={SUPPORTING_USERS_ROUTE}
                      element={<SupportingPage />}
                    />
                    <Route
                      path={TOP_SUPPORTERS_USERS_ROUTE}
                      element={<TopSupportersPage />}
                    />
                    <Route path={EMPTY_PAGE} element={<EmptyPage />} />
                  </>
                ) : (
                  <>
                    <Route
                      path={REPOSTING_USERS_ROUTE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={FAVORITING_USERS_ROUTE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={FOLLOWING_USERS_ROUTE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={FOLLOWERS_USERS_ROUTE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={LEADERBOARD_USERS_ROUTE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={COIN_DETAIL_MOBILE_WEB_ROUTE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={SUPPORTING_USERS_ROUTE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={TOP_SUPPORTERS_USERS_ROUTE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                    <Route
                      path={EMPTY_PAGE}
                      element={<Navigate to={TRENDING_PAGE} replace />}
                    />
                  </>
                )}
                <Route
                  path={PROFILE_PAGE}
                  element={<ProfilePageRoute mainContentRef={mainContentRef} />}
                />
                <Route
                  path={HOME_PAGE}
                  element={<HomePageRedirect isGuestAccount={isGuestAccount} />}
                />
              </AnimatedSwitch>
            ) : (
              <Routes>
                {publicSiteRoutes.map((route) => (
                  <Route
                    key={route}
                    path={route}
                    element={<Navigate to='/' replace />}
                  />
                ))}
                <Route path='/fb/share' element={<FbSharePage />} />
                <Route
                  path={FEED_PAGE}
                  element={<FeedPage containerRef={mainContentRef} />}
                />
                <Route
                  path={NOTIFICATION_USERS_PAGE}
                  element={<NotificationUsersPage />}
                />
                <Route
                  path={NOTIFICATION_PAGE}
                  element={<NotificationPage />}
                />
                <Route
                  path={TRENDING_GENRES}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={TRENDING_PAGE}
                  element={<TrendingPage containerRef={mainContentRef} />}
                />
                <Route
                  path={TRENDING_PLAYLISTS_PAGE_LEGACY}
                  element={<Navigate to={TRENDING_PLAYLISTS_PAGE} replace />}
                />
                <Route
                  path={TRENDING_PLAYLISTS_PAGE}
                  element={
                    <TrendingPlaylistsPage
                      containerRef={mainContentRef.current!}
                    />
                  }
                />
                <Route
                  path={TRENDING_UNDERGROUND_PAGE}
                  element={
                    <TrendingUndergroundPage
                      containerRef={mainContentRef.current!}
                    />
                  }
                />
                <Route path={EXPLORE_PAGE} element={<ExplorePage />} />
                <Route
                  path={SEARCH_CATEGORY_PAGE_LEGACY}
                  element={<SearchCategoryLegacyRedirect />}
                />
                <Route
                  path={SEARCH_PAGE}
                  element={
                    <SearchPageRoute
                      validSearchCategories={validSearchCategories}
                    />
                  }
                />
                <Route
                  path={UPLOAD_ALBUM_PAGE}
                  element={<UploadPage scrollToTop={scrollToTop} />}
                />
                <Route
                  path={UPLOAD_PLAYLIST_PAGE}
                  element={<UploadPage scrollToTop={scrollToTop} />}
                />
                <Route
                  path={UPLOAD_PAGE}
                  element={<UploadPage scrollToTop={scrollToTop} />}
                />
                <Route path={SAVED_PAGE} element={<LibraryPage />} />
                <Route path={LIBRARY_PAGE} element={<LibraryPage />} />
                <Route path={HISTORY_PAGE} element={<HistoryPage />} />
                {!isProduction ? (
                  <Route path={DEV_TOOLS_PAGE} element={<DevTools />} />
                ) : null}
                {!isProduction ? (
                  <Route
                    path={SOLANA_TOOLS_PAGE}
                    element={<SolanaToolsPage />}
                  />
                ) : null}
                {!isProduction ? (
                  <Route
                    path={USER_ID_PARSER_PAGE}
                    element={<UserIdParserPage />}
                  />
                ) : null}
                <Route path={DASHBOARD_PAGE} element={<DashboardPage />} />
                <Route
                  path={WITHDRAWALS_PAGE}
                  element={<PayAndEarnPage tableView={TableType.WITHDRAWALS} />}
                />
                <Route
                  path={PURCHASES_PAGE}
                  element={<PayAndEarnPage tableView={TableType.PURCHASES} />}
                />
                <Route
                  path={SALES_PAGE}
                  element={<PayAndEarnPage tableView={TableType.SALES} />}
                />
                <Route
                  path={COINS_EXPLORE_PAGE}
                  element={<ArtistCoinsExplorePage />}
                />
                <Route path={COINS_CREATE_PAGE} element={<LaunchpadPage />} />
                <Route
                  path={COIN_DETAIL_PAGE}
                  element={
                    <CoinDetailPageRoute mainContentRef={mainContentRef} />
                  }
                />
                <Route
                  path={COIN_DETAIL_BUY_PAGE}
                  element={
                    <CoinDetailPageRoute mainContentRef={mainContentRef} />
                  }
                />
                <Route path={COIN_REDEEM_PAGE} element={<CoinRedeemPage />} />
                <Route
                  path={COIN_EXCLUSIVE_TRACKS_PAGE}
                  element={<ExclusiveTracksPage />}
                />
                <Route
                  path={EDIT_COIN_DETAILS_PAGE}
                  element={<EditCoinDetailsPage />}
                />
                <Route path={PAYMENTS_PAGE} element={<WalletPage />} />
                <Route path={WALLET_PAGE} element={<WalletPage />} />
                <Route path={CASH_PAGE} element={<CashPage />} />
                <Route path={REWARDS_PAGE} element={<RewardsPage />} />
                <Route path={AIRDROP_PAGE} element={<RewardsPage />} />
                <Route path={CHAT_PAGE} element={<ChatPage />} />
                <Route
                  path={DEACTIVATE_PAGE}
                  element={<DeactivateAccountPage />}
                />
                <Route
                  path={SETTINGS_PAGE}
                  element={<SettingsPage containerRef={mainContentRef} />}
                />
                <Route
                  path={AUTHORIZED_APPS_SETTINGS_PAGE}
                  element={<SettingsPage containerRef={mainContentRef} />}
                />
                <Route
                  path={ACCOUNTS_YOU_MANAGE_SETTINGS_PAGE}
                  element={<SettingsPage containerRef={mainContentRef} />}
                />
                <Route
                  path={ACCOUNTS_MANAGING_YOU_SETTINGS_PAGE}
                  element={<SettingsPage containerRef={mainContentRef} />}
                />
                <Route
                  path={LABEL_ACCOUNT_SETTINGS_PAGE}
                  element={<SettingsPage containerRef={mainContentRef} />}
                />
                <Route path={CHECK_PAGE} element={<CheckPage />} />
                <Route
                  path={ACCOUNT_SETTINGS_PAGE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={CHANGE_PASSWORD_SETTINGS_PAGE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={CHANGE_EMAIL_SETTINGS_PAGE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={NOTIFICATION_SETTINGS_PAGE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={ABOUT_SETTINGS_PAGE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route path={APP_REDIRECT} element={<AppRedirectListener />} />
                <Route path={NOT_FOUND_PAGE} element={<NotFoundPage />} />
                <Route
                  path={PLAYLIST_PAGE}
                  element={
                    <CollectionPageRoute
                      type='playlist'
                      mainContentRef={mainContentRef}
                    />
                  }
                />
                <Route
                  path={EDIT_PLAYLIST_PAGE}
                  element={<EditCollectionPage />}
                />
                <Route
                  path={EDIT_ALBUM_PAGE}
                  element={<EditCollectionPage />}
                />
                <Route
                  path={ALBUM_PAGE}
                  element={
                    <CollectionPageRoute
                      type='album'
                      mainContentRef={mainContentRef}
                    />
                  }
                />
                <Route
                  path={USER_ID_PAGE}
                  element={<ProfilePageRoute mainContentRef={mainContentRef} />}
                />
                <Route path={TRACK_ID_PAGE} element={<TrackPage />} />
                <Route
                  path={PLAYLIST_ID_PAGE}
                  element={<CollectionPage type='playlist' />}
                />
                <Route
                  path={PROFILE_PAGE_TRACKS}
                  element={<ProfilePageRoute mainContentRef={mainContentRef} />}
                />
                <Route
                  path={PROFILE_PAGE_ALBUMS}
                  element={<ProfilePageRoute mainContentRef={mainContentRef} />}
                />
                <Route
                  path={PROFILE_PAGE_PLAYLISTS}
                  element={<ProfilePageRoute mainContentRef={mainContentRef} />}
                />
                <Route
                  path={PROFILE_PAGE_REPOSTS}
                  element={<ProfilePageRoute mainContentRef={mainContentRef} />}
                />
                <Route
                  path={PROFILE_PAGE_COMMENTS}
                  element={<CommentHistoryPage />}
                />
                <Route path={TRACK_PAGE} element={<TrackPage />} />
                <Route
                  path={TRACK_COMMENTS_PAGE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={TRACK_EDIT_PAGE}
                  element={<EditTrackPage scrollToTop={scrollToTop} />}
                />
                <Route
                  path={TRACK_REMIXES_PAGE}
                  element={<RemixesPage containerRef={mainContentRef} />}
                />
                <Route path={PICK_WINNERS_PAGE} element={<PickWinnersPage />} />
                <Route
                  path={REPOSTING_USERS_ROUTE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={FAVORITING_USERS_ROUTE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={FOLLOWING_USERS_ROUTE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={FOLLOWERS_USERS_ROUTE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={LEADERBOARD_USERS_ROUTE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={COIN_DETAIL_MOBILE_WEB_ROUTE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={SUPPORTING_USERS_ROUTE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={TOP_SUPPORTERS_USERS_ROUTE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={EMPTY_PAGE}
                  element={<Navigate to={TRENDING_PAGE} replace />}
                />
                <Route
                  path={PROFILE_PAGE}
                  element={<ProfilePageRoute mainContentRef={mainContentRef} />}
                />
                <Route
                  path={HOME_PAGE}
                  element={<HomePageRedirect isGuestAccount={isGuestAccount} />}
                />
              </Routes>
            )}
          </Suspense>
        </div>
        <PlayBarProvider />

        <Suspense fallback={null}>
          <Modals />
        </Suspense>
        <ConnectedMusicConfetti />

        <RewardClaimedToast />
        {!isMobile ? <Visualizer /> : null}
        {!isMobile ? <DevModeMananger /> : null}
        {isMobile ? (
          <AppRedirectPopover
            incrementScroll={handleIncrementScroll}
            decrementScroll={handleDecrementScroll}
          />
        ) : null}
      </div>
    </div>
  )
}

const RouterWebPlayer = WebPlayer

// Taking this approach because the class component cannot use hooks
type FeatureFlaggedWebPlayerProps = Omit<WebPlayerProps, 'isProduction'>

const FeatureFlaggedWebPlayer = (props: FeatureFlaggedWebPlayerProps) => {
  const { isProduction } = useEnvironment()

  return <RouterWebPlayer {...props} isProduction={isProduction} />
}

const MainContentRouterWebPlayer = () => {
  return (
    <MainContentContext.Consumer>
      {({ ref, setRef }) => {
        // Convert MutableRefObject<HTMLDivElement | undefined> to RefObject<HTMLDivElement>
        const mainContentRef = ref as React.RefObject<HTMLDivElement>
        return (
          <FeatureFlaggedWebPlayer
            setMainContentRef={setRef}
            mainContentRef={mainContentRef}
          />
        )
      }}
    </MainContentContext.Consumer>
  )
}

export default MainContentRouterWebPlayer
