import { render, screen } from '@testing-library/react-native'

import { TrackArtists } from './TrackArtists'

jest.mock(
  '@audius/harmony-native',
  () => {
    const React = require('react')
    const { Text, View } = require('react-native')

    return {
      Flex: ({ children, style }: any) =>
        React.createElement(View, { style }, children),
      Text: ({ children }: any) => React.createElement(Text, null, children)
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
  it('centers artist names and renders badges for each artist', () => {
    render(<TrackArtists userId={1} collaborators={[{ user_id: 2 }]} />)

    expect(screen.getByText('1:badges-hidden')).toBeOnTheScreen()
    expect(screen.getByText('2:badges-hidden')).toBeOnTheScreen()
    expect(screen.queryByText(/badges-visible/)).toBeNull()
    expect(screen.getByText('badges:1')).toBeOnTheScreen()
    expect(screen.getByText('badges:2')).toBeOnTheScreen()
  })
})
