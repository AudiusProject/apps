import { BulkUpdateTracksResult } from '@audius/common/api'
import { beforeEach, describe, expect, vi } from 'vitest'

import { TrackSelectionProvider } from 'components/collection/desktop/edit-mode/tracks/TrackSelectionContext'
import { fireEvent, it, render, screen, waitFor } from 'test/test-utils'

import { BulkEditTracksBar } from './BulkEditTracksBar'

const { bulkUpdateTracks } = vi.hoisted(() => ({ bulkUpdateTracks: vi.fn() }))

vi.mock('@audius/common/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@audius/common/api')>()),
  useBulkUpdateTracks: () => ({
    mutateAsync: bulkUpdateTracks,
    isPending: false
  })
}))

vi.mock('components/upload/UploadArtwork', () => ({ default: () => null }))

const tracks = [
  { track_id: 1, title: 'First' },
  { track_id: 2, title: 'Second Remix' },
  { track_id: 3, title: 'Third' }
]

const makeResult = (
  overrides: Partial<BulkUpdateTracksResult> = {}
): BulkUpdateTracksResult => ({
  updated: [1, 2, 3],
  unchanged: [],
  failed: [],
  priceSkipped: [],
  ...overrides
})

const renderBar = () =>
  render(
    <TrackSelectionProvider orderedIds={tracks.map((t) => t.track_id)}>
      <BulkEditTracksBar tracks={tracks} />
    </TrackSelectionProvider>
  )

const openModalWithAllSelected = async () => {
  renderBar()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }))
  expect(screen.getByText('3 selected')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
  expect(await screen.findByText('Edit 3 Tracks')).toBeInTheDocument()
}

describe('BulkEditTracksBar', () => {
  beforeEach(() => {
    bulkUpdateTracks.mockReset()
  })

  it('hides the edit button until a track is selected', () => {
    renderBar()
    expect(screen.getByText('Select all')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
  })

  it('submits only the filled-in fields for the selected tracks', async () => {
    bulkUpdateTracks.mockResolvedValue(makeResult())
    await openModalWithAllSelected()

    const submit = screen.getByRole('button', { name: 'Update 3 Tracks' })
    expect(submit).toBeDisabled()

    fireEvent.change(document.querySelector('input[name="genre"]')!, {
      target: { value: 'Techno' }
    })
    await waitFor(() => expect(submit).toBeEnabled())
    fireEvent.click(submit)

    await waitFor(() => expect(bulkUpdateTracks).toHaveBeenCalledTimes(1))
    expect(bulkUpdateTracks.mock.calls[0][0]).toMatchObject({
      trackIds: [1, 2, 3],
      edit: {
        genre: 'Techno',
        mood: undefined,
        tags: undefined,
        price: undefined
      },
      imageFile: undefined
    })
    // Selection clears once the tracks are updated.
    await waitFor(() =>
      expect(screen.getByText('Select all')).toBeInTheDocument()
    )
  })

  it('requires a price before a premium edit can be submitted', async () => {
    await openModalWithAllSelected()

    fireEvent.click(screen.getByRole('radio', { name: 'Set price' }))
    expect(await screen.findByLabelText('Price per track')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Update 3 Tracks' })
    ).toBeDisabled()
    expect(bulkUpdateTracks).not.toHaveBeenCalled()
  })

  it('lists tracks whose price could not be changed', async () => {
    bulkUpdateTracks.mockResolvedValue(
      makeResult({
        updated: [1, 3],
        unchanged: [2],
        priceSkipped: [{ trackId: 2, reason: 'remix' }]
      })
    )
    await openModalWithAllSelected()

    fireEvent.click(screen.getByRole('radio', { name: 'Make free' }))
    const submit = screen.getByRole('button', { name: 'Update 3 Tracks' })
    await waitFor(() => expect(submit).toBeEnabled())
    fireEvent.click(submit)

    expect(await screen.findByText('2 tracks updated.')).toBeInTheDocument()
    expect(screen.getByText('Second Remix')).toBeInTheDocument()
    expect(bulkUpdateTracks.mock.calls[0][0].edit.price).toEqual({
      type: 'free'
    })
  })
})
