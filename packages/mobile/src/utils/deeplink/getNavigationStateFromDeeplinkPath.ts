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

  if (path[0] !== '/') path = `/${path}`

  try {
    path = decodeURIComponent(path)
  } catch (e) {
    console.warn('Failed to decode URL path:', path, e)
  }

  path = path.replace('#embed', '')

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
    path = path.replace(`/app-redirect`, '')
  }

  if (path.match(/^\/trending/)) {
    path = '/trending'
  }

  if (path.match(/^\/tracks\//)) {
    const id = parseOptionalHashId(pathPart(path)(2))
    return createTrendingStackState({
      name: 'Track',
      params: {
        id
      }
    })
  }

  if (path.match(/^\/users\//)) {
    const id = parseOptionalHashId(pathPart(path)(2))
    return createTrendingStackState({
      name: 'Profile',
      params: {
        id
      }
    })
  }

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
      name: 'FanClubsExplore'
    })
  }

  if (path.match(/^\/search(?:\/|\?|$)/)) {
    const {
      query: { query: searchQuery, ...filters }
    } = queryString.parseUrl(path)

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

  if (path.match(/^\/explore(?:\/|\?|$)/)) {
    const {
      query: { query: exploreQuery, ...filters }
    } = queryString.parseUrl(path)

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
    path = path.replace(
      new RegExp(`^/${accountHandle.replace(/^@/, '')}`, 'i'),
      '/profile'
    )
  } else {
    if (path.match(/^\/[^/]+\/[^/]+$/)) {
      if (!path.match(/^\/[^/]+\/(tracks|albums|playlists|reposts)$/)) {
        path = `/track${path}`
      }
    }

    if (path.match(/^\/[^/]+\/playlist\/[^/]+$/)) {
      path = path.replace(/(^\/[^/]+\/)(playlist)(\/[^/]+$)/, '$1collection$3')
      path = `${path}?collectionType=playlist`
    } else if (path.match(/^\/[^/]+\/album\/[^/]+$/)) {
      path = path.replace(/(^\/[^/]+\/)(album)(\/[^/]+$)/, '$1collection$3')
      path = `${path}?collectionType=album`
    }
  }

  if (!hasAccount && !path.match(/^\/reset-password/)) {
    const { url, query } = queryString.parseUrl(path)

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
