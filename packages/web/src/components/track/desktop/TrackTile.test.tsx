import { PROFILE_PAGE, TRACK_PAGE } from '@audius/common/src/utils/route'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, beforeAll, afterEach, afterAll } from 'vitest'

import { testTrack } from 'test/mocks/fixtures/tracks'
import { artistUser } from 'test/mocks/fixtures/users'
import { mockTrackById, mockEvents, mockUsers } from 'test/msw/mswMocks'
import { mswServer, render, screen, it } from 'test/test-utils'

import { TrackTileSize } from '../types'

import { TrackTile } from './TrackTile'

function renderTrackTile(overrides = {}) {
  mswServer.use(
    mockTrackById({ ...testTrack, ...overrides }),
    mockEvents(),
    mockUsers([artistUser])
  )

  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path='/'
          element={
            <TrackTile
              uid='test-uid'
              id={1}
              index={0}
              size={TrackTileSize.SMALL}
              statSize='small'
              ordered={false}
              togglePlay={() => {}}
              isLoading={false}
              hasLoaded={() => {}}
              isTrending={false}
              isFeed={false}
            />
          }
        />
        <Route path={TRACK_PAGE} element={<h1>Mock Track Page</h1>} />
        <Route path={PROFILE_PAGE} element={<h1>Mock User Page</h1>} />
      </Routes>
    </MemoryRouter>,
    { skipRouter: true }
  )
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
    expect(
      await screen.findByRole('button', { name: /reposts 5/i })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: /favorites 10/i })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: /comments 15/i })
    ).toBeInTheDocument()
    expect(await screen.findByText('3:00')).toBeInTheDocument()
  })

  const premiumConditions = { usdc_purchase: { price: 100 } }

  const matrix = [
    {
      name: 'Public Free (non-owner)',
      overrides: {},
      assert: async () => {
        expect(
          await screen.findByRole('link', { name: 'Test Track' })
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
        expect(await screen.findByText('Premium')).toBeInTheDocument()
        expect(
          screen.getByRole('img', { name: /available for purchase/i })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: '$1.00' })
        ).toBeInTheDocument()
      }
    }
  ]

  it.each(matrix)('$name', async ({ overrides, assert }) => {
    renderTrackTile(overrides)
    await assert()
  })
})
