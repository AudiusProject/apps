import { describe, expect, vi } from 'vitest'

import { render, screen, it } from 'test/test-utils'

import { TrackArtists } from './TrackArtists'

vi.mock('./UserLink', () => ({
  UserLink: ({ userId }: { userId: number }) => (
    <span data-testid='user-link'>{userId}</span>
  )
}))

describe('TrackArtists', () => {
  it('renders the owner once when collaborators are empty', () => {
    render(<TrackArtists userId={1} collaborators={[]} />)

    expect(screen.getAllByTestId('user-link')).toHaveLength(1)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('deduplicates collaborators and excludes the owner', () => {
    render(
      <TrackArtists
        userId={1}
        collaborators={[
          { user_id: 2 },
          { user_id: 2 },
          { user_id: 1 },
          { user_id: 3 },
          { user_id: 3 }
        ]}
      />
    )

    expect(
      screen.getAllByTestId('user-link').map((link) => link.textContent)
    ).toEqual(['1', '2', '3'])
    expect(screen.getAllByText(',')).toHaveLength(2)
  })
})
