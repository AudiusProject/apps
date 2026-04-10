import queryString from 'query-string'

const parseOptionalHashId = (raw: string | undefined) => {
  return raw == null || raw === '' ? null : raw
}

type GetStateFromPath = (path: string, options: any) => any

type GetNavigationStateFromDeeplinkPathArgs = {
  path: string
  options: any
  hasAccount: boolean
  accountHandle?: string
  routeName?: string
  getStateFromPath: GetStateFromPath
}

const isProfilePathForHandle = (path: string, handle: string) => {
  const normalizedHandle = handle.replace(/^@/, '')
  const escaped = normalizedHandle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (
    path.match(new RegExp(`^/${escaped}$`, 'i')) ||
    path.match(
      new RegExp(`^/${escaped}/(tracks|albums|playlists|reposts)$`, 'i')
    )
  )
}

const createAppTabState = (state: any): any => ({
  routes: [
    {
      name: 'HomeStack',
      state: {
        routes: [
          {
            name: 'App',
            state: {
              routes: [
                {
                  name: 'AppTabs',
                  state
                }
              ]
            }
          }
        ]
      }
    }
  ]
})

const createTrendingStackState = (route): any =>
  createAppTabState({
    routes: [
      {
        name: 'trending',
        state: {
          index: 1,
          routes: [
            {
              name: 'Trending'
            },
            route
          ]
        }
      }
    ]
  })

const createExploreStackState = (route): any =>
  createAppTabState({
    routes: [
      {
        name: 'explore',
        state: {
          index: 1,
          routes: [
            {
              name: 'Explore'
            },
            route
          ]
        }
      }
    ]
  })

export const getNavigationStateFromDeeplinkPath = ({
  path,
  options,
  hasAccount,
  accountHandle,
  routeName,
  getStateFromPath
}: GetNavigationStateFromDeeplinkPathArgs) => {
  const pathPart = (path: string) => (index: number) => {
    const rawResult = path.split('/')[index]
    const queryIndex = rawResult?.indexOf('?') ?? -1
    const trimmed = queryIndex > -1 ? rawResult.slice(0, queryIndex) : rawResult
    return trimmed
  }

  // Add leading slash if it is missing
  if (path[0] !== '/') path = `/${path}`

  // Decode URL-encoded characters in the path
  try {
    path = decodeURIComponent(path)
  } catch (e) {
    // If decoding fails, continue with the original path
    console.warn('Failed to decode URL path:', path, e)
  }

  path = path.replace('#embed', '')

  // OAuth authorization URLs (e.g. /oauth/authorize?...) are intercepted by
  // the app via Universal Links. Route them to the OAuth screen instead of
  // crashing with an unmatched path.
  if (path.match(/^\/oauth\//)) {
    const queryStart = path.indexOf('?')
    const search = queryStart > -1 ? path.slice(queryStart) : ''
    return {
      routes: [{ name: 'OAuthScreen', params: { search } }]
    }
  }

  const connectPath = /^\/(connect)/
  if (path.match(connectPath)) {
    path = `${path.replace(connectPath, routeName ?? '/trending')}&path=connect`
  }

  const walletConnectPath = /^\/(wallet-connect)/
  if (path.match(walletConnectPath)) {
    path = `${path.replace(walletConnectPath, '/wallets')}&path=wallet-connect`
  }

  const walletSignPath = /^\/(wallet-sign-message)/
  if (path.match(walletSignPath)) {
    path = `${path.replace(
      walletSignPath,
      '/wallets'
    )}&path=wallet-sign-message`
  }

  if (path.match(`^/app-redirect`)) {
    // Remove the app-redirect prefix if present
    path = path.replace(`/app-redirect`, '')
  }

  // Strip the trending query param because `/trending` will
  // always go to ThisWeek
  if (path.match(/^\/trending/)) {
    path = '/trending'
  }

  // Opaque ID routes
  // /tracks/Nz9yBb4
  if (path.match(/^\/tracks\//)) {
    const id = parseOptionalHashId(pathPart(path)(2))
    return createTrendingStackState({
      name: 'Track',
      params: {
        id
      }
    })
  }

  // /users/Nz9yBb4
  if (path.match(/^\/users\//)) {
    const id = parseOptionalHashId(pathPart(path)(2))
    return createTrendingStackState({
      name: 'Profile',
      params: {
        id
      }
    })
  }

  // /playlists/Nz9yBb4
  if (path.match(/^\/playlists\//)) {
    const id = parseOptionalHashId(pathPart(path)(2))
    return createTrendingStackState({
      name: 'Collection',
      params: {
        id
      }
    })
  }

  if (path.match(/^\/rewards/)) {
    return createTrendingStackState({
      name: 'RewardsScreen'
    })
  }

  if (path.match(/^\/wallet(?:\/|\?|$)/)) {
    return createTrendingStackState({
      name: 'wallet'
    })
  }

  if (path.match(/^\/coins/)) {
    const ticker = pathPart(path)(2)
    const coinRoute = pathPart(path)(3)
    const redeemCode = pathPart(path)(4)

    if (ticker && ticker !== 'create') {
      // Normalize ticker to uppercase
      const normalizedTicker = ticker.toUpperCase()

      if (coinRoute === 'redeem') {
        return createTrendingStackState({
          name: 'CoinRedeemScreen',
          params: {
            ticker: normalizedTicker,
            code: redeemCode ?? undefined
          }
        })
      }

      return createTrendingStackState({
        name: 'CoinDetailsScreen',
        params: { ticker: normalizedTicker }
      })
    }

    return createTrendingStackState({
      name: 'ArtistCoinsExplore'
    })
  }

  // /search
  if (path.match(/^\/search(?:\/|\?|$)/)) {
    const {
      query: { query: searchQuery, ...filters }
    } = queryString.parseUrl(path)

    // Route search URLs to the explore tab with SearchExplore screen
    // This ensures proper deeplinking for both search URLs and search with filters
    return createExploreStackState({
      name: 'SearchExplore',
      params: {
        query: searchQuery,
        category: pathPart(path)(2) ?? 'all',
        filters,
        autoFocus: false
      }
    })
  }

  // /explore
  if (path.match(/^\/explore(?:\/|\?|$)/)) {
    const {
      query: { query: exploreQuery, ...filters }
    } = queryString.parseUrl(path)

    // Route explore URLs to the explore tab with SearchExplore screen
    // This ensures both /search and /explore URLs work for deeplinking
    return createExploreStackState({
      name: 'SearchExplore',
      params: {
        query: exploreQuery,
        category: pathPart(path)(2) ?? 'all',
        filters,
        autoFocus: false
      }
    })
  }

  const { query } = queryString.parseUrl(path)
  const { login, warning } = query

  if (login && warning) {
    path = queryString.stringifyUrl({ url: '/reset-password', query })
  }

  const settingsPath = /^\/(settings)/
  if (path.match(settingsPath)) {
    const subpath = pathPart(path)(2)
    const subpathParam = subpath != null ? `?path=${subpath}` : ''
    const queryParamsStart = path.indexOf('?')
    const queryParams =
      queryParamsStart > -1 ? `&${path.slice(queryParamsStart + 1)}` : ''
    path = `/settings${subpathParam}${queryParams}`
  } else if (accountHandle && isProfilePathForHandle(path, accountHandle)) {
    // If the path is explicitly a profile URL for the current user, rewrite to `/profile`
    path = path.replace(
      new RegExp(`^/${accountHandle.replace(/^@/, '')}`, 'i'),
      '/profile'
    )
  } else {
    // If the path has two parts
    if (path.match(/^\/[^/]+\/[^/]+$/)) {
      // If the path doesn't match a profile tab, it's a track
      if (!path.match(/^\/[^/]+\/(tracks|albums|playlists|reposts)$/)) {
        path = `/track${path}`
      }
    }

    if (path.match(/^\/[^/]+\/playlist\/[^/]+$/)) {
      // set the path as `collection`
      path = path.replace(/(^\/[^/]+\/)(playlist)(\/[^/]+$)/, '$1collection$3')
      path = `${path}?collectionType=playlist`
    } else if (path.match(/^\/[^/]+\/album\/[^/]+$/)) {
      // set the path as `collection`
      path = path.replace(/(^\/[^/]+\/)(album)(\/[^/]+$)/, '$1collection$3')
      path = `${path}?collectionType=album`
    }
  }

  if (!hasAccount && !path.match(/^\/reset-password/)) {
    // Redirect to sign in with original path in query params
    const { url, query } = queryString.parseUrl(path)

    // If url is signin or signup, set screen param instead of routeOnCompletion
    if (url === '/signin' || url === '/signup') {
      path = queryString.stringifyUrl({
        url: '/sign-on',
        query: {
          ...query,
          screen: url === '/signin' ? 'sign-in' : 'sign-up'
        }
      })
    } else {
      path = queryString.stringifyUrl({
        url: '/sign-on',
        query: { ...query, screen: 'sign-up', routeOnCompletion: url }
      })
    }
  }

  return getStateFromPath(path, options)
}
