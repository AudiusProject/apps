import { getNavigationStateFromDeeplinkPath } from 'app/utils/deeplink/getNavigationStateFromDeeplinkPath'

const stubGetStateFromPath = (path: string) => ({ routes: [{ name: path }] })

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
})

