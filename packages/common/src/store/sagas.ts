import niceModalBridgeSagas from '~/services/nice-modal-bridge/sagas'
import { accountSagas } from '~/store/account'
import { buyUSDCSagas } from '~/store/buy-usdc'
import { sagas as castSagas } from '~/store/cast/sagas'
import { gatedContentSagas } from '~/store/gated-content'
import { chatSagas } from '~/store/pages/chat'
import { purchaseContentSagas } from '~/store/purchase-content'
import {
  toastSagas,
  deletePlaylistConfirmationModalUISagas,
  duplicateAddConfirmationModalUISagas,
  mobileOverflowMenuUISagas,
  stripeModalUISagas,
  withdrawUSDCSagas,
  modalsSagas,
  shareModalUISagas
} from '~/store/ui'

import { CommonStoreContext } from './storeContext'

export const sagas = (_ctx: CommonStoreContext) => ({
  account: accountSagas,
  buyUSDC: buyUSDCSagas,
  cast: castSagas,
  gatedContent: gatedContentSagas,
  purchaseContent: purchaseContentSagas,
  chat: chatSagas,
  toast: toastSagas,
  shareModalUI: shareModalUISagas,
  stripeModalUI: stripeModalUISagas,
  mobileOverflowMenuUI: mobileOverflowMenuUISagas,
  modals: modalsSagas,
  deletePlaylistConfirmationModalUI: deletePlaylistConfirmationModalUISagas,
  duplidateAddConfirmationModalUI: duplicateAddConfirmationModalUISagas,
  withdrawUSDC: withdrawUSDCSagas,
  niceModalBridge: niceModalBridgeSagas
})
