import { act } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, vi } from 'vitest'

import { testCollection } from 'test/mocks/fixtures/collections'
import { mockCollectionById } from 'test/msw/mswMocks'
import { it, render, screen, waitFor } from 'test/test-utils'

import { InlineAlbumPriceAndAudience } from './InlineAlbumPriceAndAudience'
import {
  PlaylistEditModeProvider,
  usePlaylistEditMode
} from './PlaylistEditModeContext'

vi.mock('services/analytics', () => ({ track: vi.fn() }))

const server = setupServer()

let editMode: ReturnType<typeof usePlaylistEditMode>
const Probe = () => {
  editMode = usePlaylistEditMode()
  return null
}

const renderField = (collection: typeof testCollection & any) => {
  server.use(mockCollectionById(collection))
  return render(
    <PlaylistEditModeProvider collectionId={1} isOwner>
      <Probe />
      <InlineAlbumPriceAndAudience collectionId={1} />
    </PlaylistEditModeProvider>
  )
}

describe('InlineAlbumPriceAndAudience', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('shows the Price & Audience setting for a free album', async () => {
    renderField({ ...testCollection, is_album: true })
    await act(async () => editMode.enterEditMode())

    await waitFor(() => {
      expect(screen.getByText('Price & Audience')).toBeInTheDocument()
    })
    expect(screen.getByText('Free for Everyone')).toBeInTheDocument()
  })

  it('shows the current price for a premium album', async () => {
    renderField({
      ...testCollection,
      is_album: true,
      is_stream_gated: true,
      stream_conditions: { usdc_purchase: { price: 500, splits: [] } }
    })
    await act(async () => editMode.enterEditMode())

    await waitFor(() => {
      expect(screen.getByText('Price & Audience')).toBeInTheDocument()
    })
    expect(screen.getByText('Premium')).toBeInTheDocument()
    expect(screen.getByTestId('price-display')).toHaveTextContent('$5.00')
  })
})
