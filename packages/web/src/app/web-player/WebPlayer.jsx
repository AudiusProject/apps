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
import { useFeatureFlag } from '@audius/common/hooks'
import { Client, Status } from '@audius/common/models'
import { FeatureFlags, StringKeys } from '@audius/common/services'
import { guestRoutes } from '@audius/common/src/utils/route'
import { UploadType } from '@audius/common/store'
import { route } from '@audius/common/utils'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'
import { generatePath, matchPath } from 'react-router'
import { Redirect, Route, Switch, withRouter } from 'react-router-dom'
import semver from 'semver'

import { Pages as SignOnPages } from 'common/store/pages/signon/types'
import AnimatedSwitch from 'components/animated-switch/AnimatedSwitch'
import AppRedirectListener from 'components/app-redirect-popover/AppRedirectListener'
import { AppRedirectPopover } from 'components/app-redirect-popover/components/AppRedirectPopover'
import { AppBannerWrapper } from 'components/banner/AppBannerWrapper'
import { ArtistCoinsLaunchBanner } from 'components/banner/ArtistCoinsLaunchBanner'
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
import DesktopRoute from 'components/routes/DesktopRoute'
import MobileRoute from 'components/routes/MobileRoute'
import TrendingGenreSelectionPage from 'components/trending-genre-selection/TrendingGenreSelectionPage'
import { USDCBalanceFetcher } from 'components/usdc-balance-fetcher/USDCBalanceFetcher'
import { useEnvironment } from 'hooks/useEnvironment'
import { MAIN_CONTENT_ID, MainContentContext } from 'pages/MainContentContext'
import { AiAttributedTracksPage } from 'pages/ai-attributed-tracks-page'
import { ArtistCoinsExplorePage } from 'pages/artist-coins-explore-page/ArtistCoinsExplorePage'
import { LaunchpadPage } from 'pages/artist-coins-launchpad-page'
import { MobileArtistCoinsSortPage } from 'pages/artist-coins-sort-page/MobileArtistCoinsSortPage'
import { AssetDetailPage } from 'pages/asset-detail-page/AssetDetailPage'
import { ArtistCoinDetailsPage } from 'pages/asset-detail-page/components/mobile/ArtistCoinDetailsPage'
import { AudioPage } from 'pages/audio-page/AudioPage'
import { ChatPageProvider } from 'pages/chat-page/ChatPageProvider'
import CollectionPage from 'pages/collection-page/CollectionPage'
import CommentHistoryPage from 'pages/comment-history/CommentHistoryPage'
import { DashboardPage } from 'pages/dashboard-page/DashboardPage'
import { DeactivateAccountPage } from 'pages/deactivate-account-page/DeactivateAccountPage'
import DevTools from 'pages/dev-tools/DevTools'
import SolanaToolsPage from 'pages/dev-tools/SolanaToolsPage'
import UserIdParserPage from 'pages/dev-tools/UserIdParserPage'
import { EditCoinDetailsPage } from 'pages/edit-coin-details-page/EditCoinDetailsPage'
import { EditCollectionPage } from 'pages/edit-collection-page'
import EmptyPage from 'pages/empty-page/EmptyPage'
import { ExplorePage } from 'pages/explore-page/ExplorePage'
import FavoritesPage from 'pages/favorites-page/FavoritesPage'
import { FbSharePage } from 'pages/fb-share-page/FbSharePage'
import FeedPage from 'pages/feed-page/FeedPage'
import FollowersPage from 'pages/followers-page/FollowersPage'
import FollowingPage from 'pages/following-page/FollowingPage'
import HistoryPage from 'pages/history-page/HistoryPage'
import { LeaderboardPage } from 'pages/leaderboard-page/LeaderboardPage'
import LibraryPage from 'pages/library-page/LibraryPage'
import { NotFoundPage } from 'pages/not-found-page/NotFoundPage'
import { NotificationUsersPage } from 'pages/notification-users-page/NotificationUsersPage'
import { PayAndEarnPage } from 'pages/pay-and-earn-page/PayAndEarnPage'
import { TableType } from 'pages/pay-and-earn-page/types'
import { PickWinnersPage } from 'pages/pick-winners-page/PickWinnersPage'
import ProfilePage from 'pages/profile-page/ProfilePage'
import RemixesPage from 'pages/remixes-page/RemixesPage'
import RepostsPage from 'pages/reposts-page/RepostsPage'
import { RequiresUpdate } from 'pages/requires-update/RequiresUpdate'
import { RewardsPage } from 'pages/rewards-page/RewardsPage'
import SettingsPage from 'pages/settings-page/SettingsPage'
import { SubPage } from 'pages/settings-page/components/mobile/SettingsPage'
import SupportingPage from 'pages/supporting-page/SupportingPage'
import TopSupportersPage from 'pages/top-supporters-page/TopSupportersPage'
import { TrackCommentsPage } from 'pages/track-page/TrackCommentsPage'
import TrackPage from 'pages/track-page/TrackPage'
import { TransactionHistoryPage } from 'pages/transaction-history-page/TransactionHistoryPage'
import TrendingPage from 'pages/trending-page/TrendingPage'
import TrendingPlaylistsPage from 'pages/trending-playlists/TrendingPlaylistPage'
import TrendingUndergroundPage from 'pages/trending-underground/TrendingUndergroundPage'
import Visualizer from 'pages/visualizer/Visualizer'
import { WalletPage } from 'pages/wallet-page'
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
  AUDIO_PAGE,
  ASSET_DETAIL_PAGE,
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
  ACCOUNT_VERIFICATION_SETTINGS_PAGE,
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
  CHECK_PAGE,
  TRENDING_PLAYLISTS_PAGE_LEGACY,
  DEACTIVATE_PAGE,
  SUPPORTING_USERS_ROUTE,
  TOP_SUPPORTERS_USERS_ROUTE,
  publicSiteRoutes,
  CHAT_PAGE,
  PROFILE_PAGE_AI_ATTRIBUTED_TRACKS,
  PROFILE_PAGE_COMMENTS,
  PAYMENTS_PAGE,
  WITHDRAWALS_PAGE,
  PURCHASES_PAGE,
  SALES_PAGE,
  TRANSACTION_HISTORY_PAGE,
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

const includeSearch = (search) => {
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

const WebPlayer = (props) => {
  const { isProduction, history, location, mainContentRef, setMainContentRef } =
    props

  const dispatch = useDispatch()

  const { data: accountUserData } = useCurrentAccountUser({
    select: (user) => ({
      userHandle: user.handle,
      isGuestAccount: selectIsGuestAccount(user)
    })
  })
  const hasAccount = useHasAccount()
  const { userHandle, isGuestAccount = false } = accountUserData || {}
  const { data: accountStatus } = useAccountStatus()
  const showCookieBanner = useSelector(getShowCookieBanner)

  // Convert mapDispatchToProps to useCallback with useDispatch
  const updateRouteOnSignUpCompletion = useCallback(
    (route) => dispatch(updateRouteOnSignUpCompletion(route)),
    [dispatch]
  )

  const openSignOn = useCallback(
    (signIn = true, page = null, fields = {}) =>
      dispatch(openSignOn(signIn, page, fields)),
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
  const ipcRef = useRef(null)
  const previousRouteRef = useRef(getPathname(history.location))

  const [state, setState] = useState({
    mainContent: null,
    showWebUpdateBanner: false,
    showRequiresWebUpdate: false,
    showRequiresUpdate: false,
    isUpdating: false,
    initialPage: true,
    entryRoute: getPathname(history.location),
    currentRoute: getPathname(history.location)
  })

  const scrollToTop = useCallback(() => {
    mainContentRef.current &&
      mainContentRef.current.scrollTo &&
      mainContentRef.current.scrollTo({ top: 0 })
  }, [mainContentRef])

  useEffect(() => {
    const client = getClient()

    const removeHistoryEventListener = history.listen((location, action) => {
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
    })

    if (client === Client.ELECTRON) {
      ipcRef.current = window.require('electron').ipcRenderer

      ipcRef.current.on('updateDownloaded', (event, arg) => {
        console.info('updateDownload', event, arg)
      })

      ipcRef.current.on('updateDownloadProgress', (event, arg) => {
        console.info('updateDownloadProgress', event, arg)
      })

      ipcRef.current.on('updateError', (event, arg) => {
        console.error('updateError', event, arg)
      })

      ipcRef.current.on('webUpdateAvailable', async (event, arg) => {
        console.info('webUpdateAvailable', event, arg)
        const { currentVersion } = arg
        await remoteConfigInstance.waitForRemoteConfig()
        const minAppVersion = remoteConfigInstance.getRemoteVar(
          StringKeys.MIN_APP_VERSION
        )

        if (semver.lt(currentVersion, minAppVersion)) {
          setState((prev) => ({ ...prev, showRequiresWebUpdate: true }))
        } else {
          setState((prev) => ({ ...prev, showWebUpdateBanner: true }))
        }
      })

      ipcRef.current.on('updateAvailable', (event, arg) => {
        console.info('updateAvailable', event, arg)
        const { version, currentVersion } = arg
        if (
          semver.major(currentVersion) < semver.major(version) ||
          semver.minor(currentVersion) < semver.minor(version)
        ) {
          setState((prev) => ({ ...prev, showRequiresUpdate: true }))
        }
      })

      if (typeof window !== 'undefined') {
        const windowOpen = window.open

        const a = document.createElement('a')
        window.open = (...args) => {
          const url = args[0]
          if (!url) {
            const popup = windowOpen(window.location)
            const win = {
              popup,
              closed: popup.closed,
              close: () => {
                popup.close()
              }
            }
            Object.defineProperty(win, 'location', {
              get: () => {
                a.href = popup.location
                if (!a.search) {
                  return {
                    href: popup.location,
                    search: a.search,
                    hostname: ''
                  }
                }
                return {
                  href: popup.location,
                  search: a.search,
                  hostname: a.hostname
                }
              },
              set: (locationHref) => {
                popup.location = locationHref
                this.locationHref = locationHref
              }
            })
            return win
          }
          return windowOpen(...args)
        }
      }
    }

    return () => {
      removeHistoryEventListener()
      if (client === Client.ELECTRON && ipcRef.current) {
        ipcRef.current.removeAllListeners('updateDownloaded')
        ipcRef.current.removeAllListeners('updateAvailable')
      }
    }
  }, [history, scrollToTop])

  const pushWithToken = useCallback(
    (route) => {
      const search = location.search
      if (includeSearch(search)) {
        history.push(`${route}${search}`)
      } else {
        history.push(route)
      }
    },
    [history, location.search]
  )

  useEffect(() => {
    const allowedRoutes = isGuestAccount ? guestRoutes : authenticatedRoutes
    if (
      !hasAccount &&
      accountStatus !== Status.IDLE &&
      accountStatus !== Status.LOADING &&
      allowedRoutes.some((route) => {
        const match = matchPath(getPathname(location), {
          path: route,
          exact: true
        })
        return !!match
      })
    ) {
      if (accountStatus === Status.LOADING) {
        pushWithToken(TRENDING_PAGE)
        dispatch(openSignOn(true, SignOnPages.SIGNIN))
        dispatch(updateRouteOnSignUpCompletion(state.entryRoute))
      } else {
        pushWithToken(TRENDING_PAGE)
      }
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
    ipcRef.current.send('update')
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
    ipcRef.current.send('web-update')
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

  const SwitchComponent = context.isMobile ? AnimatedSwitch : Switch
  const noScroll = matchPath(currentRoute, CHAT_PAGE)

  return (
    <div className={styles.root}>
      <AppBannerWrapper>
        <DownloadAppBanner />
        {/* Re-enable for ToS updates */}
        {/* <TermsOfServiceUpdateBanner /> */}
        <ArtistCoinsLaunchBanner />
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
        <Notice />
        <Navigator />
        <div
          ref={setMainContentRef}
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
            <SwitchComponent isInitialPage={initialPage} handle={userHandle}>
              {publicSiteRoutes.map((route) => (
                <Redirect
                  key={route}
                  from={route}
                  to={{ pathname: getPathname({ pathname: '' }) }}
                />
              ))}
              <Route
                exact
                path={'/fb/share'}
                render={(props) => <FbSharePage />}
              />
              <Route
                exact
                path={FEED_PAGE}
                isMobile={isMobile}
                render={() => (
                  <FeedPage containerRef={mainContentRef.current} />
                )}
              />
              <Route
                exact
                path={NOTIFICATION_USERS_PAGE}
                isMobile={isMobile}
                component={NotificationUsersPage}
              />
              <Route
                exact
                path={NOTIFICATION_PAGE}
                isMobile={isMobile}
                component={NotificationPage}
              />
              <MobileRoute
                exact
                path={TRENDING_GENRES}
                isMobile={isMobile}
                component={TrendingGenreSelectionPage}
              />
              <Route
                exact
                path={TRENDING_PAGE}
                render={() => (
                  <TrendingPage containerRef={mainContentRef.current} />
                )}
              />
              <Redirect
                from={TRENDING_PLAYLISTS_PAGE_LEGACY}
                to={TRENDING_PLAYLISTS_PAGE}
              />
              <Route
                exact
                path={TRENDING_PLAYLISTS_PAGE}
                render={() => (
                  <TrendingPlaylistsPage
                    containerRef={mainContentRef.current}
                  />
                )}
              />
              <Route
                exact
                path={TRENDING_UNDERGROUND_PAGE}
                render={() => (
                  <TrendingUndergroundPage
                    containerRef={mainContentRef.current}
                  />
                )}
              />
              <Route exact path={EXPLORE_PAGE} render={() => <ExplorePage />} />
              <Route
                exact
                path={SEARCH_CATEGORY_PAGE_LEGACY}
                render={(props) => (
                  <Redirect
                    to={{
                      pathname: generatePath(SEARCH_PAGE, {
                        category: props.match.params.category
                      }),
                      search: new URLSearchParams({
                        query: props.match.params.query
                      }).toString()
                    }}
                  />
                )}
              />
              <Route
                path={SEARCH_PAGE}
                render={(props) => {
                  const { category } = props.match.params

                  return category &&
                    !validSearchCategories.includes(category) ? (
                    <Redirect
                      to={{
                        pathname: SEARCH_BASE_ROUTE,
                        search: new URLSearchParams({
                          query: category
                        }).toString()
                      }}
                    />
                  ) : (
                    <ExplorePage />
                  )
                }}
              />
              <DesktopRoute
                path={UPLOAD_ALBUM_PAGE}
                isMobile={isMobile}
                render={() => <UploadPage uploadType={UploadType.ALBUM} />}
              />
              <DesktopRoute
                path={UPLOAD_PLAYLIST_PAGE}
                isMobile={isMobile}
                render={() => <UploadPage uploadType={UploadType.PLAYLIST} />}
              />
              <DesktopRoute
                path={UPLOAD_PAGE}
                isMobile={isMobile}
                render={(props) => (
                  <UploadPage {...props} scrollToTop={scrollToTop} />
                )}
              />
              <Route
                exact
                path={[SAVED_PAGE, LIBRARY_PAGE]}
                component={LibraryPage}
              />
              <Route exact path={HISTORY_PAGE} component={HistoryPage} />
              {!isProduction ? (
                <Route exact path={DEV_TOOLS_PAGE} component={DevTools} />
              ) : null}
              {!isProduction ? (
                <Route
                  exact
                  path={SOLANA_TOOLS_PAGE}
                  component={SolanaToolsPage}
                />
              ) : null}
              {!isProduction ? (
                <Route
                  exact
                  path={USER_ID_PARSER_PAGE}
                  component={UserIdParserPage}
                />
              ) : null}

              <DesktopRoute
                exact
                path={DASHBOARD_PAGE}
                isMobile={isMobile}
                component={DashboardPage}
              />
              <Route
                exact
                path={WITHDRAWALS_PAGE}
                isMobile={isMobile}
                render={(props) => (
                  <PayAndEarnPage
                    {...props}
                    tableView={TableType.WITHDRAWALS}
                  />
                )}
              />
              <Route
                exact
                path={PURCHASES_PAGE}
                isMobile={isMobile}
                render={(props) => (
                  <PayAndEarnPage {...props} tableView={TableType.PURCHASES} />
                )}
              />
              <Route
                exact
                path={SALES_PAGE}
                isMobile={isMobile}
                render={(props) => (
                  <PayAndEarnPage {...props} tableView={TableType.SALES} />
                )}
              />
              <Route
                exact
                path={TRANSACTION_HISTORY_PAGE}
                isMobile={isMobile}
                component={TransactionHistoryPage}
              />
              <Route
                exact
                path={COINS_EXPLORE_PAGE}
                isMobile={isMobile}
                component={ArtistCoinsExplorePage}
              />
              <Route
                exact
                path='/coins/sort'
                isMobile={isMobile}
                component={MobileArtistCoinsSortPage}
              />
              <Route
                exact
                path={COINS_CREATE_PAGE}
                isMobile={isMobile}
                component={LaunchpadPage}
              />
              <Route
                exact
                path={ASSET_DETAIL_PAGE}
                isMobile={isMobile}
                render={(props) => {
                  return <AssetDetailPage {...props} />
                }}
              />
              <Route
                exact
                path={EDIT_COIN_DETAILS_PAGE}
                isMobile={isMobile}
                render={(props) => <EditCoinDetailsPage {...props} />}
              />
              <Route
                exact
                path={PAYMENTS_PAGE}
                isMobile={isMobile}
                component={WalletPage}
              />
              <Route
                exact
                path={AUDIO_PAGE}
                isMobile={isMobile}
                component={AudioPage}
              />
              <Route
                exact
                path={WALLET_PAGE}
                isMobile={isMobile}
                component={WalletPage}
              />
              <Route
                exact
                path={[REWARDS_PAGE, AIRDROP_PAGE]}
                isMobile={isMobile}
                component={RewardsPage}
              />

              <Route
                exact
                path={CHAT_PAGE}
                isMobile={isMobile}
                component={ChatPageProvider}
              />
              <Route
                exact
                path={DEACTIVATE_PAGE}
                isMobile={isMobile}
                component={DeactivateAccountPage}
              />
              <Route
                exact
                path={[
                  SETTINGS_PAGE,
                  AUTHORIZED_APPS_SETTINGS_PAGE,
                  ACCOUNTS_YOU_MANAGE_SETTINGS_PAGE,
                  ACCOUNTS_MANAGING_YOU_SETTINGS_PAGE,
                  LABEL_ACCOUNT_SETTINGS_PAGE
                ]}
                isMobile={isMobile}
                component={SettingsPage}
              />
              <Route exact path={CHECK_PAGE} component={CheckPage} />
              <MobileRoute
                exact
                path={ACCOUNT_SETTINGS_PAGE}
                isMobile={isMobile}
                render={() => <SettingsPage subPage={SubPage.ACCOUNT} />}
              />
              <MobileRoute
                exact
                path={ACCOUNT_VERIFICATION_SETTINGS_PAGE}
                isMobile={isMobile}
                render={() => <SettingsPage subPage={SubPage.VERIFICATION} />}
              />
              <MobileRoute
                exact
                path={CHANGE_PASSWORD_SETTINGS_PAGE}
                isMobile={isMobile}
                render={() => (
                  <SettingsPage subPage={SubPage.CHANGE_PASSWORD} />
                )}
              />
              <MobileRoute
                exact
                path={CHANGE_EMAIL_SETTINGS_PAGE}
                isMobile={isMobile}
                render={() => <SettingsPage subPage={SubPage.CHANGE_EMAIL} />}
              />
              <MobileRoute
                exact
                path={NOTIFICATION_SETTINGS_PAGE}
                isMobile={isMobile}
                render={() => <SettingsPage subPage={SubPage.NOTIFICATIONS} />}
              />
              <MobileRoute
                exact
                path={ABOUT_SETTINGS_PAGE}
                isMobile={isMobile}
                render={() => <SettingsPage subPage={SubPage.ABOUT} />}
              />
              <Route path={APP_REDIRECT} component={AppRedirectListener} />
              <Route exact path={NOT_FOUND_PAGE} component={NotFoundPage} />
              <Route
                exact
                path={PLAYLIST_PAGE}
                render={({ location }) => {
                  return (
                    <CollectionPage key={location.pathname} type='playlist' />
                  )
                }}
              />
              <Route
                exact
                path={[EDIT_PLAYLIST_PAGE, EDIT_ALBUM_PAGE]}
                component={EditCollectionPage}
              />
              <Route
                exact
                path={ALBUM_PAGE}
                render={({ location }) => (
                  <CollectionPage key={location.pathname} type='album' />
                )}
              />
              <Route
                exact
                path={USER_ID_PAGE}
                render={(props) => (
                  <ProfilePage
                    {...props}
                    containerRef={mainContentRef.current}
                  />
                )}
              />
              <Route exact path={TRACK_ID_PAGE} component={TrackPage} />
              <Route exact path={PLAYLIST_ID_PAGE} component={CollectionPage} />
              <Route
                exact
                path={[
                  PROFILE_PAGE_TRACKS,
                  PROFILE_PAGE_ALBUMS,
                  PROFILE_PAGE_PLAYLISTS,
                  PROFILE_PAGE_REPOSTS
                ]}
                render={(props) => (
                  <ProfilePage
                    {...props}
                    containerRef={mainContentRef.current}
                  />
                )}
              />
              <Route
                exact
                path={PROFILE_PAGE_COMMENTS}
                component={CommentHistoryPage}
              />
              <Route
                exact
                path={PROFILE_PAGE_AI_ATTRIBUTED_TRACKS}
                component={AiAttributedTracksPage}
              />
              <Route exact path={TRACK_PAGE} component={TrackPage} />
              <MobileRoute
                exact
                path={TRACK_COMMENTS_PAGE}
                isMobile={isMobile}
                component={TrackCommentsPage}
              />
              <Route exact path={TRACK_PAGE} component={TrackPage} />
              <DesktopRoute
                path={TRACK_EDIT_PAGE}
                isMobile={isMobile}
                render={(props) => (
                  <EditTrackPage {...props} scrollToTop={scrollToTop} />
                )}
              />

              <Route
                exact
                path={TRACK_REMIXES_PAGE}
                render={(props) => (
                  <RemixesPage
                    {...props}
                    containerRef={mainContentRef.current}
                  />
                )}
              />
              <Route
                exact
                path={PICK_WINNERS_PAGE}
                component={PickWinnersPage}
              />
              <MobileRoute
                exact
                path={REPOSTING_USERS_ROUTE}
                isMobile={isMobile}
                component={RepostsPage}
              />
              <MobileRoute
                exact
                path={FAVORITING_USERS_ROUTE}
                isMobile={isMobile}
                component={FavoritesPage}
              />
              <MobileRoute
                exact
                path={FOLLOWING_USERS_ROUTE}
                isMobile={isMobile}
                component={FollowingPage}
              />
              <MobileRoute
                exact
                path={FOLLOWERS_USERS_ROUTE}
                isMobile={isMobile}
                component={FollowersPage}
              />
              <MobileRoute
                exact
                path={LEADERBOARD_USERS_ROUTE}
                isMobile={isMobile}
                component={LeaderboardPage}
              />
              <MobileRoute
                exact
                path={COIN_DETAIL_MOBILE_WEB_ROUTE}
                isMobile={isMobile}
                component={ArtistCoinDetailsPage}
              />
              <MobileRoute
                exact
                path={SUPPORTING_USERS_ROUTE}
                isMobile={isMobile}
                component={SupportingPage}
              />
              <MobileRoute
                exact
                path={TOP_SUPPORTERS_USERS_ROUTE}
                isMobile={isMobile}
                component={TopSupportersPage}
              />
              <MobileRoute
                exact
                path={EMPTY_PAGE}
                isMobile={isMobile}
                component={EmptyPage}
              />
              <Route
                exact
                path={PROFILE_PAGE}
                render={(props) => (
                  <ProfilePage
                    {...props}
                    containerRef={mainContentRef.current}
                  />
                )}
              />
              <Redirect
                from={HOME_PAGE}
                to={{
                  pathname:
                    getPathname(history.location) === HOME_PAGE
                      ? isGuestAccount
                        ? LIBRARY_PAGE
                        : FEED_PAGE
                      : getPathname(history.location),
                  search: includeSearch(history.location.search)
                    ? history.location.search
                    : ''
                }}
              />
            </SwitchComponent>
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

const RouterWebPlayer = withRouter(WebPlayer)

// Taking this approach because the class component cannot use hooks
const FeatureFlaggedWebPlayer = (props) => {
  const { isEnabled: isSearchExploreEnabled } = useFeatureFlag(
    FeatureFlags.SEARCH_EXPLORE
  )
  const { isProduction } = useEnvironment()

  return (
    <RouterWebPlayer
      {...props}
      isSearchExploreEnabled={isSearchExploreEnabled}
      isProduction={isProduction}
    />
  )
}

const MainContentRouterWebPlayer = () => {
  return (
    <MainContentContext.Consumer>
      {({ ref, setRef }) => {
        return (
          <FeatureFlaggedWebPlayer
            setMainContentRef={setRef}
            mainContentRef={ref}
          />
        )
      }}
    </MainContentContext.Consumer>
  )
}

export default MainContentRouterWebPlayer
