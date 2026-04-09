import { getNavigationStateFromDeeplinkPath } from 'app/utils/deeplink/getNavigationStateFromDeeplinkPath'

const stubGetStateFromPath = (path: string) =>
  path.startsWith('/track/')
    ? { routes: [{ name: 'Track' }] }
    : path.startsWith('/profile')
      ? { routes: [{ name: 'UserProfile' }] }
      : path.includes('/collection/')
        ? { routes: [{ name: 'Collection' }] }
        : { routes: [{ name: path }] }

const getLeafRouteName = (state: any): string | undefined => {
  let current: any = state
  while (current?.routes?.length) {
    current = current.routes[current.index ?? 0]
    if (current?.state) current = current.state
  }
  return current?.name
}

describe('getNavigationStateFromDeeplinkPath', () => {
  test('routes /users/:id to Profile', () => {
    const state = getNavigationStateFromDeeplinkPath({
      path: '/users/Nz9yBb4',
      options: undefined,
      hasAccount: true,
      accountHandle: 'someone',
      routeName: '/trending',
      getStateFromPath: stubGetStateFromPath as any
    })

    expect(getLeafRouteName(state)).toBe('Profile')
  })

  test('routes /playlists/:id to Collection', () => {
    const state = getNavigationStateFromDeeplinkPath({
      path: '/playlists/Nz9yBb4',
      options: undefined,
      hasAccount: true,
      accountHandle: 'someone',
      routeName: '/trending',
      getStateFromPath: stubGetStateFromPath as any
    })

    expect(getLeafRouteName(state)).toBe('Collection')
  })

  test('does not rewrite current user playlist permalink to /profile', () => {
    const state = getNavigationStateFromDeeplinkPath({
      path: '/Audius/playlist/140',
      options: undefined,
      hasAccount: true,
      accountHandle: 'Audius',
      routeName: '/trending',
      getStateFromPath: stubGetStateFromPath as any
    })

    expect(getLeafRouteName(state)).toBe('Collection')
  })
})

