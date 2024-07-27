import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { ID, GatedContentStatus, NFTAccessSignature } from '~/models'
import { Nullable } from '~/utils'

import { PurchaseableContentType } from '../purchase-content'

type GatedContentState = {
  nftAccessSignatureMap: { [id: ID]: Nullable<NFTAccessSignature> }
  statusMap: { [id: ID]: GatedContentStatus }
  lockedContentId: Nullable<ID>
  followeeIds: ID[]
  tippedUserIds: ID[]
}

const initialState: GatedContentState = {
  nftAccessSignatureMap: {},
  statusMap: {},
  lockedContentId: null,
  followeeIds: [],
  tippedUserIds: []
}

type UpdateNftAccessSignaturesPayload = {
  [id: ID]: Nullable<NFTAccessSignature>
}

type RevokeAccessPayload = {
  revokeAccessMap: { [id: ID]: 'stream' | 'download' }
}

type UpdateGatedContentStatusPayload = {
  contentId: ID
  status: GatedContentStatus
}

type UpdateGatedContentStatusesPayload = {
  [id: ID]: GatedContentStatus
}

type IdPayload = {
  id: ID
}

const slice = createSlice({
  name: 'gatedContent',
  initialState,
  reducers: {
    updateNftAccessSignatures: (
      state,
      action: PayloadAction<UpdateNftAccessSignaturesPayload>
    ) => {
      state.nftAccessSignatureMap = {
        ...state.nftAccessSignatureMap,
        ...action.payload
      }
    },
    revokeAccess: (_state, __action: PayloadAction<RevokeAccessPayload>) => {
      // triggers saga
    },
    updateGatedContentStatus: (
      state,
      action: PayloadAction<UpdateGatedContentStatusPayload>
    ) => {
      state.statusMap[action.payload.contentId] = action.payload.status
    },
    updateGatedContentStatuses: (
      state,
      action: PayloadAction<UpdateGatedContentStatusesPayload>
    ) => {
      state.statusMap = {
        ...state.statusMap,
        ...action.payload
      }
    },
    setLockedContentId: (state, action: PayloadAction<IdPayload>) => {
      state.lockedContentId = action.payload.id
    },
    resetLockedContentId: (state) => {
      state.lockedContentId = null
    },
    addFolloweeId: (state, action: PayloadAction<IdPayload>) => {
      state.followeeIds.push(action.payload.id)
    },
    removeFolloweeId: (state, action: PayloadAction<IdPayload>) => {
      state.followeeIds = state.followeeIds.filter(
        (id) => id !== action.payload.id
      )
    },
    addTippedUserId: (state, action: PayloadAction<IdPayload>) => {
      state.tippedUserIds.push(action.payload.id)
    },
    removeTippedUserId: (state, action: PayloadAction<IdPayload>) => {
      state.tippedUserIds = state.tippedUserIds.filter(
        (id) => id !== action.payload.id
      )
    },
    startPollingGatedContent: (
      _state,
      _action: PayloadAction<{
        contentId: number
        contentType: PurchaseableContentType
        isSourceTrack: boolean
      }>
    ) => {
      // saga
    }
  }
})

export const {
  updateNftAccessSignatures,
  revokeAccess,
  updateGatedContentStatus,
  updateGatedContentStatuses,
  setLockedContentId,
  resetLockedContentId,
  addFolloweeId,
  removeFolloweeId,
  addTippedUserId,
  removeTippedUserId
} = slice.actions

export const actions = slice.actions
export default slice.reducer
