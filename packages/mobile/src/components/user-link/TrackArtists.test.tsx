import { render, screen } from '@testing-library/react-native'

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
      Flex: ({ children, style }: any) =>
        React.createElement(View, { style }, children),
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

  it('centers artist names and renders badges for each artist', () => {
    render(<TrackArtists userId={1} collaborators={[{ user_id: 2 }]} />)

    expect(mockUseUsers).toHaveBeenCalledWith([1, 2])
    expect(screen.getByText('1:ray61626b')).toBeOnTheScreen()
    expect(screen.getByText('2:dj g8r')).toBeOnTheScreen()
    expect(screen.getByText('badges:1')).toBeOnTheScreen()
    expect(screen.getByText('badges:2')).toBeOnTheScreen()
  })
})
