import { Route, Routes } from 'react-router-dom-v5-compat'
import { describe, expect, it, beforeAll, afterEach, afterAll } from 'vitest'

import { testTrack } from 'test/mocks/fixtures/tracks'
import { mockTrackById, mockEvents } from 'test/msw/mswMocks'
import { mswServer, render, screen } from 'test/test-utils'

import { TrackTileSize } from '../types'

import { TrackTile } from './TrackTile'

function renderTrackTile(overrides = {}) {
  mswServer.use(mockTrackById({ ...testTrack, ...overrides }), mockEvents())

  return render(
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
      <Route path='/test-user/test-track' element={<h1>Mock Track Page</h1>} />
      <Route path='/test-user' element={<h1>Mock User Page</h1>} />
    </Routes>
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
