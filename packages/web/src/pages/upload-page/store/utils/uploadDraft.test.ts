import { UploadType } from '@audius/common/store'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TrackEditFormValues } from 'components/edit-track/types'

import {
  clearUploadDraft,
  draftToFormState,
  loadUploadDraft,
  saveUploadDraft
} from './uploadDraft'

const items = new Map<string, unknown>()
const setItem = vi.fn(async (key: string, value: unknown) => {
  items.set(key, value)
  return value
})

vi.mock('localforage', () => ({
  default: {
    INDEXEDDB: 'asyncStorage',
    createInstance: () => ({
      getItem: async (key: string) => items.get(key) ?? null,
      setItem,
      removeItem: async (key: string) => {
        items.delete(key)
      },
      keys: async () => [...items.keys()]
    })
  }
}))

const USER_ID = 7

const makeValues = (title: string, stems: File[]) => {
  const audio = new File(['audio'], 'cypher.wav', { type: 'audio/wav' })
  const art = new File(['art'], 'Artwork', { type: 'image/jpeg' })
  return {
    trackMetadatasIndex: 0,
    tracks: [
      {
        clientId: 'c1',
        file: audio,
        preview: new Audio(),
        metadata: { title: 'cypher' }
      }
    ],
    trackMetadatas: [
      {
        title,
        description: 'a long description',
        artwork: { file: art, url: 'blob:dead' },
        stems: stems.map((file) => ({
          file,
          category: 'OTHER',
          metadata: { orig_filename: file.name }
        }))
      }
    ]
  } as unknown as TrackEditFormValues
}

const fileWrites = () =>
  setItem.mock.calls.filter(([key]) => key.startsWith('file:')).length

describe('upload drafts', () => {
  beforeEach(async () => {
    await clearUploadDraft(USER_ID)
    setItem.mockClear()
  })

  it('round-trips form values, files and stems', async () => {
    const stems = [
      new File(['a'], 'riser.wav', { type: 'audio/wav' }),
      new File(['b'], 'sfx.wav', { type: 'audio/wav' })
    ]
    await saveUploadDraft(
      USER_ID,
      UploadType.INDIVIDUAL_TRACK,
      makeValues('Cypher Vol 4', stems)
    )

    const draft = await loadUploadDraft(USER_ID)
    expect(draft?.uploadType).toBe(UploadType.INDIVIDUAL_TRACK)
    const values = draft!.values as TrackEditFormValues
    const metadata = values.trackMetadatas[0] as any
    expect(metadata.title).toBe('Cypher Vol 4')
    expect(metadata.description).toBe('a long description')
    expect(metadata.stems.map((s: any) => s.file)).toEqual(stems)
    expect(metadata.stems[0].category).toBe('OTHER')
    // Dead blob URLs are recreated and previews rebuilt.
    expect(metadata.artwork.file.name).toBe('Artwork')
    expect(metadata.artwork.url).not.toBe('blob:dead')
    expect((values.tracks[0] as any).preview).toBeInstanceOf(Audio)

    const formState = draftToFormState(draft!) as any
    expect(formState.tracks[0].metadata.title).toBe('Cypher Vol 4')
    expect(formState.tracks[0].file.name).toBe('cypher.wav')
  })

  it('writes each file once across autosaves', async () => {
    const stems = [new File(['a'], 'riser.wav')]
    const values = makeValues('v1', stems)
    await saveUploadDraft(USER_ID, UploadType.INDIVIDUAL_TRACK, values)
    expect(fileWrites()).toBe(3)

    setItem.mockClear()
    const edited = {
      ...values,
      trackMetadatas: [{ ...values.trackMetadatas[0], title: 'v2' }]
    }
    await saveUploadDraft(USER_ID, UploadType.INDIVIDUAL_TRACK, edited)
    expect(fileWrites()).toBe(0)
  })

  it('drops files that are no longer in the form', async () => {
    const stems = [new File(['a'], 'riser.wav'), new File(['b'], 'sfx.wav')]
    await saveUploadDraft(
      USER_ID,
      UploadType.INDIVIDUAL_TRACK,
      makeValues('t', stems)
    )
    const before = [...items.keys()].filter((k) => k.startsWith('file:'))

    const values = makeValues('t', [stems[0]])
    await saveUploadDraft(USER_ID, UploadType.INDIVIDUAL_TRACK, values)
    const after = [...items.keys()].filter((k) => k.startsWith('file:'))
    // New audio/art files from makeValues replace the old ones; the
    // removed stem is gone either way.
    expect(after.length).toBe(3)
    expect(before.length).toBe(4)
  })

  it('clears the draft and its files', async () => {
    await saveUploadDraft(
      USER_ID,
      UploadType.INDIVIDUAL_TRACK,
      makeValues('t', [new File(['a'], 'a.wav')])
    )
    await clearUploadDraft(USER_ID)
    expect(await loadUploadDraft(USER_ID)).toBeNull()
    expect(items.size).toBe(0)
  })

  it('keeps drafts per user', async () => {
    await saveUploadDraft(
      USER_ID,
      UploadType.INDIVIDUAL_TRACK,
      makeValues('mine', [])
    )
    expect(await loadUploadDraft(USER_ID + 1)).toBeNull()
    await clearUploadDraft(USER_ID + 1)
    expect(await loadUploadDraft(USER_ID)).not.toBeNull()
  })
})
