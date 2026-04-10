import { useRef, type ReactNode } from 'react'
import { useEffect } from 'react'

import { useCurrentAccountUser, useHasAccount } from '@audius/common/api'
import { Status } from '@audius/common/models'
import type { LinkingOptions } from '@react-navigation/native'
import {
  NavigationContainer as RNNavigationContainer,
  createNavigationContainerRef,
  getStateFromPath
} from '@react-navigation/native'
import { useAccountStatus } from '~/api/tan-query/users/account/useAccountStatus'

import { AppTabNavigationProvider } from 'app/screens/app-screen'
import { screen } from 'app/services/analytics'
import { getPrimaryRoute } from 'app/utils/navigation'
import { useThemeVariant } from 'app/utils/theme'

import { getNavigationStateFromDeeplinkPath } from '../../utils/deeplink/getNavigationStateFromDeeplinkPath'

import { navigationThemes } from './navigationThemes'

type NavigationContainerProps = {
  children: ReactNode
  navigationIntegration: any // Sentry removed - kept for compatibility
}

export const navigationRef = createNavigationContainerRef()

/**
 * NavigationContainer contains the react-navigation context
 * and configures linking
 */
const NavigationContainer = (props: NavigationContainerProps) => {
  const { children, navigationIntegration } = props
  const theme = useThemeVariant()
  const { data: accountHandle } = useCurrentAccountUser({
    select: (user) => user?.handle
  })
  const hasAccount = useHasAccount()
  const { data: accountStatus } = useAccountStatus()
  const hasCompletedInitialLoad = useRef(false)

  const routeNameRef = useRef<string | undefined>(undefined)

  // Ensure that the user's account data is fully loaded before rendering the app.
  // This prevents the NavigationContainer from rendering prematurely, which relies
  // on the hasAccount state to determine how to handle deep links.
  useEffect(() => {
    if (
      !hasCompletedInitialLoad.current &&
      (accountStatus === Status.SUCCESS || accountStatus === Status.ERROR)
    ) {
      hasCompletedInitialLoad.current = true
    }
  }, [accountStatus])

  if (
    !hasCompletedInitialLoad.current &&
    (accountStatus === Status.IDLE ||
      (accountStatus === Status.LOADING && !hasAccount))
  ) {
    return null
  }

  const linking: LinkingOptions<{}> = {
    prefixes: [
      'audius://',
      'https://audius.co',
      'http://audius.co',
      'https://redirect.audius.co',
      'http://redirect.audius.co'
    ],
    // configuration for matching screens with paths
    config: {
      screens: {
        SignOnStack: {
          screens: {
            SignOn: 'sign-on'
          }
        },
        HomeStack: {
          screens: {
            App: {
              screens: {
                AppTabs: {
                  screens: {
                    feed: {
                      initialRouteName: 'Feed',
                      screens: {
                        Feed: 'feed'
                      }
                    },
                    trending: {
                      initialRouteName: 'Trending',
                      screens: {
                        Trending: 'trending',
                        Collection: ':handle/collection/:slug',
                        TrackRemixes: ':handle/:slug/remixes',
                        Track: 'track/:handle/:slug',
                        Profile: {
                          path: ':handle',
                          screens: {
                            Tracks: 'tracks',
                            Albums: 'albums',
                            Playlists: 'playlists',
                            Reposts: 'reposts'
                          }
                        } as any, // Nested navigator typing with own params is broken, see: https://github.com/react-navigation/react-navigation/issues/9897
                        SettingsScreen: {
                          path: 'settings'
                        },
                        RewardsScreen: {
                          path: 'rewards'
                        },
                        wallet: {
                          path: 'wallet'
                        },
                        CashScreen: {
                          path: 'cash'
                        },
                        ArtistCoinsExplore: {
                          path: 'coins'
                        },
                        CoinDetailsScreen: {
                          path: 'coins/:ticker'
                        },
                        CoinRedeemScreen: {
                          path: 'coins/:ticker/redeem/:code?'
                        }
                      }
                    },
                    explore: {
                      initialRouteName: 'Explore',
                      screens: {
                        Explore: 'explore',
                        PremiumTracks: 'explore/premium-tracks',
                        LetThemDJ: 'explore/let-them-dj',
                        TopAlbums: 'explore/top-albums',
                        UnderTheRadar: 'explore/under-the-radar',
                        BestNewReleases: 'explore/best-new-releases',
                        Remixables: 'explore/remixables',
                        MostLoved: 'explore/most-loved',
                        FeelingLucky: 'explore/feeling-lucky',
                        HeavyRotation: 'explore/heavy-rotation',
                        ChillPlaylists: 'explore/chill',
                        IntensePlaylists: 'explore/intense',
                        IntimatePlaylists: 'explore/intimate',
                        ProvokingPlaylists: 'explore/provoking',
                        UpbeatPlaylists: 'explore/upbeat'
                      }
                    },
                    library: {
                      screens: {
                        Library: 'library'
                      }
                    },
                    profile: {
                      screens: {
                        UserProfile: {
                          path: 'profile',
                          screens: {
                            Tracks: 'tracks',
                            Albums: 'albums',
                            Playlists: 'playlists',
                            Reposts: 'reposts'
                          }
                        }
                      }
                    }
                  }
                },
                Upload: {
                  path: 'upload'
                },
                ExternalWallets: {
                  initialRouteName: 'Wallets',
                  screens: {
                    Wallets: 'wallets'
                  }
                }
              }
            }
          }
        },
        ResetPassword: {
          path: 'reset-password'
        },
        OAuthScreen: {
          path: 'oauth/:rest'
        }
      }
    },
    // TODO: This should be unit tested
    getStateFromPath: (path, options) => {
      return getNavigationStateFromDeeplinkPath({
        path,
        options,
        hasAccount,
        accountHandle,
        routeName: routeNameRef.current,
        getStateFromPath
      })
    }
  }

  const onReady = () => {
    routeNameRef.current = getPrimaryRoute(navigationRef.getRootState())
    // Sentry removed - navigationIntegration is null
    if (navigationIntegration?.registerNavigationContainer) {
      navigationIntegration.registerNavigationContainer(navigationRef)
    }
  }

  return (
    <RNNavigationContainer
      linking={linking}
      theme={navigationThemes[theme]}
      ref={navigationRef}
      onReady={onReady}
      onStateChange={() => {
        // Record screen views for the primary routes
        // Secondary routes (e.g. Track, Collection, Profile) are recorded via
        // an effect in the corresponding component
        const previousRouteName = routeNameRef.current
        const currentRouteName = getPrimaryRoute(navigationRef.getRootState())

        if (currentRouteName && previousRouteName !== currentRouteName) {
          screen({ route: `/${currentRouteName}` })
        }

        routeNameRef.current = currentRouteName
      }}
    >
      <AppTabNavigationProvider>{children}</AppTabNavigationProvider>
    </RNNavigationContainer>
  )
}

export default NavigationContainer
