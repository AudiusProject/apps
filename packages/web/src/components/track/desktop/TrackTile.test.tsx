import { PROFILE_PAGE, TRACK_PAGE } from '@audius/common/src/utils/route'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'

import { testTrack } from 'test/mocks/fixtures/tracks'
import { artistUser } from 'test/mocks/fixtures/users'
import { mockTrackById, mockEvents, mockUsers } from 'test/msw/mswMocks'
import { fireEvent, mswServer, render, screen, it } from 'test/test-utils'

import { TrackTileSize } from '../types'

import { TrackTile } from './TrackTile'

function renderTrackTile(overrides = {}, propOverrides = {}) {
  const togglePlay = vi.fn()

  mswServer.use(
    mockTrackById({ ...testTrack, ...overrides }),
    mockEvents(),
    mockUsers([artistUser])
  )

  const renderResult = render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path='/'
          element={
            <TrackTile
              id={1}
              index={0}
              size={TrackTileSize.SMALL}
              statSize='small'
              ordered={false}
              togglePlay={togglePlay}
              isLoading={false}
              hasLoaded={() => {}}
              isTrending={false}
              isFeed={false}
              {...propOverrides}
            />
          }
        />
        <Route path={TRACK_PAGE} element={<h1>Mock Track Page</h1>} />
        <Route path={PROFILE_PAGE} element={<h1>Mock User Page</h1>} />
      </Routes>
    </MemoryRouter>,
    { skipRouter: true }
  )

  return { ...renderResult, togglePlay }
}

describe('TrackTile', () => {
  beforeAll(() => {
    mswServer.listen()
  })

  afterEach(() => {
    mswServer.resetHandlers()
  })

  afterAll(() => {
    mswServer.close()
  })

  it('Renders non-owner track tile with title and user', async () => {
    renderTrackTile()
    expect(await screen.findByText('Test Track')).toBeInTheDocument()
    expect(await screen.findByText('Test User')).toBeInTheDocument()
    expect(await screen.findByText('1 Plays')).toBeInTheDocument()
    expect(await screen.findByText('5')).toBeInTheDocument()
    expect(await screen.findByText('10')).toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: /comments 15/i })
    ).toBeInTheDocument()
    expect(await screen.findByText('3:00')).toBeInTheDocument()
  })

  const premiumConditions = {
    usdc_purchase: {
      price: 100,
      splits: [{ user_id: artistUser.id, percentage: 100 }]
    }
  }

  const matrix = [
    {
      name: 'Public Free (non-owner)',
      overrides: {},
      assert: async () => {
        expect(
          await screen.findByRole('link', { name: /View track: Test Track/ })
        ).toBeInTheDocument()
        expect(
          await screen.findByRole('link', { name: 'Test User' })
        ).toBeInTheDocument()
        expect(screen.queryByText('Premium')).not.toBeInTheDocument()
      }
    },
    {
      name: 'Public Premium (non-owner)',
      overrides: {
        is_stream_gated: true,
        stream_conditions: premiumConditions
      },
      assert: async () => {
        expect(
          await screen.findByRole('button', { name: '$1.00' })
        ).toBeInTheDocument()
      }
    }
  ]

  it.each(matrix)('$name', async ({ overrides, assert }) => {
    renderTrackTile(overrides)
    await assert()
  })

  it('keeps the track and artist links focusable', async () => {
    renderTrackTile()

    const trackLink = await screen.findByRole('link', {
      name: /View track: Test Track/
    })
    trackLink.focus()
    expect(trackLink).toHaveFocus()

    const artistLink = await screen.findByRole('link', { name: 'Test User' })
    artistLink.focus()
    expect(artistLink).toHaveFocus()
  })

  it('keeps the track title in the natural tab order before the artist link', async () => {
    const { container } = renderTrackTile()

    const trackLink = await screen.findByRole('link', {
      name: /View track: Test Track/
    })
    const artistLink = await screen.findByRole('link', { name: 'Test User' })
    const tabbableElements = Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )
    )

    expect(tabbableElements.indexOf(trackLink)).toBeGreaterThanOrEqual(0)
    expect(tabbableElements.indexOf(artistLink)).toBeGreaterThanOrEqual(0)
    expect(tabbableElements.indexOf(trackLink)).toBeLessThan(
      tabbableElements.indexOf(artistLink)
    )
  })

  it('does not manually activate track and artist links with Space', async () => {
    const { unmount } = renderTrackTile()

    const trackLink = await screen.findByRole('link', {
      name: /View track: Test Track/
    })
    fireEvent.keyDown(trackLink, { key: ' ' })
    expect(
      screen.queryByRole('heading', { name: 'Mock Track Page' })
    ).not.toBeInTheDocument()

    unmount()
    renderTrackTile()

    const artistLink = await screen.findByRole('link', { name: 'Test User' })
    fireEvent.keyDown(artistLink, { key: ' ' })
    expect(
      screen.queryByRole('heading', { name: 'Mock User Page' })
    ).not.toBeInTheDocument()
  })

  it('plays from the tile background and artwork without stealing action clicks', async () => {
    const { togglePlay } = renderTrackTile()

    const playButton = await screen.findByRole('button', {
      name: 'Play Test Track'
    })
    const tileClickTarget = await screen.findByTestId('track-tile-click-target')

    fireEvent.click(tileClickTarget)
    expect(togglePlay).toHaveBeenCalledTimes(1)

    fireEvent.click(playButton)
    expect(togglePlay).toHaveBeenCalledTimes(2)

    const favoriteButton = await screen.findByRole('button', {
      name: /^Favorite$/i
    })
    fireEvent.click(favoriteButton)
    expect(togglePlay).toHaveBeenCalledTimes(2)

    const repostButton = await screen.findByRole('button', {
      name: /^Repost$/i
    })
    fireEvent.click(repostButton)
    expect(togglePlay).toHaveBeenCalledTimes(2)

    const shareButton = await screen.findByRole('button', {
      name: /^Share$/i
    })
    fireEvent.click(shareButton)
    expect(togglePlay).toHaveBeenCalledTimes(2)
  })
})
