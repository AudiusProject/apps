import { describe, it, expect, vi } from 'vitest'

import { StemCategory } from '~/models/Stems'
import { stemsUploadActions } from '~/store/stems-upload'

import { handleStemUpdates } from './handleStemUpdates'

const TRACK_ID = 100

const existingStem = (track_id: number) => ({ track_id })

const submittedExistingStem = (track_id: number) => ({
  metadata: { track_id },
  category: StemCategory.OTHER
})

const submittedNewStem = (name: string) => ({
  file: new File([], name),
  metadata: { title: name },
  category: StemCategory.OTHER
})

const run = ({
  stems,
  existingStems,
  inProgressStemUploads = []
}: {
  stems?: any[]
  existingStems: { track_id: number }[]
  inProgressStemUploads?: any[]
}) => {
  const deleteTrack = vi.fn()
  const dispatch = vi.fn()
  handleStemUpdates(
    { stems } as any,
    TRACK_ID,
    existingStems,
    inProgressStemUploads,
    deleteTrack,
    dispatch
  )
  return { deleteTrack, dispatch }
}

describe('handleStemUpdates', () => {
  it('deletes stems that were dropped from the submitted list', () => {
    const { deleteTrack } = run({
      stems: [submittedExistingStem(1), submittedExistingStem(3)],
      existingStems: [existingStem(1), existingStem(2), existingStem(3)]
    })

    expect(deleteTrack).toHaveBeenCalledTimes(1)
    expect(deleteTrack).toHaveBeenCalledWith(2)
  })

  it('deletes every stem when the submitted list is empty', () => {
    const { deleteTrack } = run({
      stems: [],
      existingStems: [existingStem(1), existingStem(2)]
    })

    expect(deleteTrack).toHaveBeenCalledTimes(2)
    expect(deleteTrack).toHaveBeenCalledWith(1)
    expect(deleteTrack).toHaveBeenCalledWith(2)
  })

  it('does nothing when stems are absent from the submitted metadata', () => {
    const { deleteTrack, dispatch } = run({
      stems: undefined,
      existingStems: [existingStem(1), existingStem(2)]
    })

    expect(deleteTrack).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('cannot detect removals when the existing stem list is unknown', () => {
    const { deleteTrack } = run({ stems: [], existingStems: [] })

    expect(deleteTrack).not.toHaveBeenCalled()
  })

  it('does not delete stems whose upload is still in flight', () => {
    const { deleteTrack } = run({
      stems: [],
      existingStems: [existingStem(1), existingStem(2)],
      inProgressStemUploads: [{ metadata: { track_id: 2 } }]
    })

    expect(deleteTrack).toHaveBeenCalledTimes(1)
    expect(deleteTrack).toHaveBeenCalledWith(1)
  })

  it('starts uploads for newly added files without re-uploading existing stems', () => {
    const { dispatch } = run({
      stems: [submittedExistingStem(1), submittedNewStem('kick.wav')],
      existingStems: [existingStem(1)]
    })

    expect(dispatch).toHaveBeenCalledTimes(1)
    const action = dispatch.mock.calls[0][0]
    expect(action.type).toBe(stemsUploadActions.startStemUploads.type)
    expect(action.payload.parentId).toBe(TRACK_ID)
    expect(action.payload.uploads).toHaveLength(1)
    expect(action.payload.uploads[0].metadata.title).toBe('kick.wav')
  })

  it('handles a same-name replacement as one delete plus one upload', () => {
    const { deleteTrack, dispatch } = run({
      stems: [submittedNewStem('Pads.wav')],
      existingStems: [existingStem(7)]
    })

    expect(deleteTrack).toHaveBeenCalledWith(7)
    expect(dispatch.mock.calls[0][0].payload.uploads).toHaveLength(1)
  })
})
