import { Action, combineReducers, Reducer } from '@reduxjs/toolkit'

import { createChatModalReducer } from './create-chat-modal'
import { BaseModalState } from './createModal'
import { editPlaylistModalReducer } from './edit-playlist-modal'
import { editTracktModalReducer } from './edit-track-modal'
import { inboxUnavailableModalReducer } from './inbox-unavailable-modal'
import { leavingAudiusModalReducer } from './leaving-audius-modal'
import parentReducer, { initialState } from './parentSlice'
import { Modals, ModalsState } from './types'
import { usdcPurchaseDetailsModalReducer } from './usdc-purchase-details-modal'
import { usdcTransactionDetailsModalReducer } from './usdc-transaction-details-modal'
import { withdrawUSDCModalReducer } from './withdraw-usdc-modal'

/**
 * Create a bunch of reducers that do nothing, so that the state is maintained and not lost through the child reducers
 */
const noOpReducers = Object.keys(initialState).reduce((prev, curr) => {
  return {
    ...prev,
    [curr]: (s: BaseModalState = { isOpen: false }) => s
  }
}, {} as Record<Modals, Reducer<BaseModalState>>)

/**
 * Combine all the child reducers to build the entire parent slice state
 */
const combinedReducers = combineReducers({
  ...noOpReducers,
  EditPlaylist: editPlaylistModalReducer,
  EditTrack: editTracktModalReducer,
  CreateChatModal: createChatModalReducer,
  InboxUnavailableModal: inboxUnavailableModalReducer,
  LeavingAudiusModal: leavingAudiusModalReducer,
  WithdrawUSDCModal: withdrawUSDCModalReducer,
  USDCPurchaseDetailsModal: usdcPurchaseDetailsModalReducer,
  USDCTransactionDetailsModal: usdcTransactionDetailsModalReducer
})

/**
 * Return a reducer that processes child slices, then parent slice.
 * This maintains backwards compatibility between modals created without createModal
 */
export const rootModalReducer = (state: ModalsState, action: Action) => {
  const firstState = combinedReducers(state, action)
  return parentReducer(firstState, action)
}
