import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { ID } from '../../models/Identifiers'
import { StemUploadWithFile } from '../../models/Stems'

const initialState = {
  uploadsInProgress: {} as {
    [parentID: number]: {
      [batchUploadID: string]: StemUploadWithFile[]
    }
  }
}

type StartUploadsPayload = {
  parentId: ID
  uploads: StemUploadWithFile[]
  batchUID: string
}

const slice = createSlice({
  name: 'application/ui/stemsUpload',
  initialState,
  reducers: {
    startStemUploads: (state, action: PayloadAction<StartUploadsPayload>) => {
      const { parentId, uploads, batchUID } = action.payload
      if (!state.uploadsInProgress[parentId]) {
        state.uploadsInProgress[parentId] = {}
      }
      state.uploadsInProgress[parentId][batchUID] = uploads
    },
    stemUploadsSucceeded: (
      state,
      action: PayloadAction<{ parentId: ID; batchUID: string }>
    ) => {
      const { batchUID, parentId } = action.payload
      delete state.uploadsInProgress[parentId][batchUID]
    },
    stemUploadsFailed: (
      state,
      action: PayloadAction<{ parentId: ID; batchUID: string }>
    ) => {
      const { batchUID, parentId } = action.payload
      delete state.uploadsInProgress[parentId][batchUID]
    }
  }
})

export const { startStemUploads, stemUploadsSucceeded, stemUploadsFailed } =
  slice.actions
export const actions = slice.actions
export default slice.reducer
