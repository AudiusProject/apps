import { act } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  vi
} from 'vitest'

import { testCollection } from 'test/mocks/fixtures/collections'
import { mockCollectionById } from 'test/msw/mswMocks'
import { it, render, waitFor } from 'test/test-utils'

import {
  PlaylistEditModeProvider,
  usePlaylistEditMode
} from './PlaylistEditModeContext'

const dispatchSpy = vi.fn()

vi.mock('react-redux', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-redux')>()
  return { ...actual, useDispatch: () => dispatchSpy }
})

vi.mock('services/analytics', () => ({ track: vi.fn() }))

const server = setupServer()

const premiumConditions = { usdc_purchase: { price: 500, splits: [] } }

const testAlbum = {
  ...testCollection,
  is_album: true,
  is_stream_gated: false,
  stream_conditions: null
}

type EditMode = ReturnType<typeof usePlaylistEditMode>

let editMode: EditMode
const Probe = () => {
  editMode = usePlaylistEditMode()
  return null
}

const renderProvider = () => {
  server.use(mockCollectionById(testAlbum))
  return render(
    <PlaylistEditModeProvider collectionId={1} isOwner>
      <Probe />
    </PlaylistEditModeProvider>
  )
}

describe('PlaylistEditModeContext access staging', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
  beforeEach(() => dispatchSpy.mockClear())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('marks the draft dirty when stream conditions change', async () => {
    renderProvider()
    await act(async () => editMode.enterEditMode())
    expect(editMode.hasChanges).toBe(false)

    await act(async () => {
      editMode.setField('is_stream_gated', true)
      editMode.setField('stream_conditions', premiumConditions)
    })

    await waitFor(() => expect(editMode.hasChanges).toBe(true))
  })

  it('is clean again when access is set back to its saved value', async () => {
    renderProvider()
    await act(async () => editMode.enterEditMode())

    await act(async () => {
      editMode.setField('is_stream_gated', true)
      editMode.setField('stream_conditions', premiumConditions)
    })
    await waitFor(() => expect(editMode.hasChanges).toBe(true))

    await act(async () => {
      editMode.setField('is_stream_gated', false)
      editMode.setField('stream_conditions', null)
    })

    expect(editMode.hasChanges).toBe(false)
  })

  it('passes staged stream conditions to editPlaylist on apply', async () => {
    renderProvider()
    await act(async () => editMode.enterEditMode())
    await act(async () => {
      editMode.setField('is_stream_gated', true)
      editMode.setField('stream_conditions', premiumConditions)
    })
    await waitFor(() => expect(editMode.hasChanges).toBe(true))

    await act(async () => editMode.apply())

    await waitFor(() => {
      const editAction = dispatchSpy.mock.calls
        .map(([action]) => action)
        .find((action) => action?.type === 'EDIT_PLAYLIST')
      expect(editAction).toBeDefined()
      expect(editAction.playlistId).toBe(1)
      expect(editAction.formFields.is_stream_gated).toBe(true)
      expect(editAction.formFields.stream_conditions).toEqual(premiumConditions)
      // Untouched fields still come from the collection itself
      expect(editAction.formFields.playlist_name).toBe(
        testCollection.playlist_name
      )
    })
  })
})

describe('PlaylistEditModeContext opening in edit mode', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  const renderAt = (state: unknown, isOwner: boolean) => {
    server.use(mockCollectionById(testAlbum))
    return render(
      <MemoryRouter initialEntries={[{ pathname: '/artist/album/a', state }]}>
        <PlaylistEditModeProvider collectionId={1} isOwner={isOwner}>
          <Probe />
        </PlaylistEditModeProvider>
      </MemoryRouter>,
      { skipRouter: true }
    )
  }

  it('enters edit mode when the link asks for it', async () => {
    renderAt({ editMode: true }, true)
    await waitFor(() => expect(editMode.isEditMode).toBe(true))
  })

  it('stays out of edit mode for a plain link', async () => {
    renderAt(null, true)
    await waitFor(() => expect(editMode.collectionId).toBe(1))
    expect(editMode.isEditMode).toBe(false)
  })

  it('stays out of edit mode for someone who is not the owner', async () => {
    renderAt({ editMode: true }, false)
    await waitFor(() => expect(editMode.collectionId).toBe(1))
    expect(editMode.isEditMode).toBe(false)
  })
})
