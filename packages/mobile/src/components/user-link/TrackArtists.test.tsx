import { render, screen, within } from '@testing-library/react-native'

import { TrackArtists } from './TrackArtists'

const mockUseUsers = jest.fn()

jest.mock('@audius/common/api', () => ({
  useUsers: (...args: unknown[]) => mockUseUsers(...args)
}))

jest.mock(
  '@audius/harmony-native',
  () => {
    const React = require('react')
    const { Text, View } = require('react-native')

    return {
      Flex: ({ children, style, testID }: any) =>
        React.createElement(View, { style, testID }, children),
      Text: ({ children }: any) => React.createElement(Text, null, children),
      TextLink: ({ children, to }: any) =>
        React.createElement(Text, null, `${to.params.id}:${children}`)
    }
  },
  { virtual: true }
)

jest.mock('./UserLink', () => {
  const React = require('react')
  const { Text } = require('react-native')

  return {
    UserLink: ({
      hideBadges,
      userId
    }: {
      hideBadges?: boolean
      userId: number
    }) =>
      React.createElement(
        Text,
        null,
        `${userId}:${hideBadges ? 'badges-hidden' : 'badges-visible'}`
      )
  }
})

jest.mock('../user-badges', () => {
  const React = require('react')
  const { Text } = require('react-native')

  return {
    UserBadges: ({ userId }: { userId: number }) =>
      React.createElement(Text, null, `badges:${userId}`)
  }
})

describe('TrackArtists', () => {
  beforeEach(() => {
    mockUseUsers.mockReturnValue({
      byId: {
        1: { name: 'ray61626b' },
        2: { name: 'dj g8r' }
      }
    })
  })

  it('centers artist groups with each artist badge beside its name', () => {
    render(<TrackArtists userId={1} collaborators={[{ user_id: 2 }]} />)

    const ownerGroup = screen.getByTestId('track-artist-1')
    const collaboratorGroup = screen.getByTestId('track-artist-2')

    expect(mockUseUsers).toHaveBeenCalledWith([1, 2])
    expect(within(ownerGroup).getByText('1:ray61626b')).toBeOnTheScreen()
    expect(within(ownerGroup).getByText('badges:1')).toBeOnTheScreen()
    expect(within(collaboratorGroup).getByText('2:dj g8r')).toBeOnTheScreen()
    expect(within(collaboratorGroup).getByText('badges:2')).toBeOnTheScreen()
    expect(screen.getAllByText('badges:1')).toHaveLength(1)
    expect(screen.getAllByText('badges:2')).toHaveLength(1)
  })
})
