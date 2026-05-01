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
              ordered={false}
              togglePlay={togglePlay}
              isLoading={false}
              hasLoaded={() => {}}
              isTrending={false}
              isActive={false}
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

describe('Mobile TrackTile', () => {
  beforeAll(() => {
    mswServer.listen()
  })

  afterEach(() => {
    mswServer.resetHandlers()
  })

  afterAll(() => {
    mswServer.close()
  })

  it('uses the artwork as the keyboard-visible play target', async () => {
    const { togglePlay } = renderTrackTile()

    const playButton = await screen.findByRole('button', {
      name: 'Play Test Track'
    })

    playButton.focus()
    expect(playButton).toHaveFocus()

    fireEvent.click(playButton)
    expect(togglePlay).toHaveBeenCalledTimes(1)
  })
})
