import { createModal } from '../createModal'

export enum WithdrawUSDCModalPages {
  ENTER_TRANSFER_DETAILS = 'enter_transfer_details',
  COINFLOW_TRANSFER = 'coinflow_transfer',
  CONFIRM_TRANSFER_DETAILS = 'confirm_transfer_details',
  PREPARE_TRANSFER = 'prepare_transfer',
  TRANSFER_IN_PROGRESS = 'transfer_in_progress',
  TRANSFER_SUCCESSFUL = 'transfer_successful',
  ERROR = 'error'
}

export type WithdrawUSDCModalState = {
  page: WithdrawUSDCModalPages
  /** One-time fee in USDC dollars when destination has no USDC account (wallet route) */
  ataCreationFeeUsdc?: number
}

const withdrawUSDCModal = createModal<WithdrawUSDCModalState>({
  reducerPath: 'WithdrawUSDCModal',
  initialState: {
    isOpen: false,
    page: WithdrawUSDCModalPages.ENTER_TRANSFER_DETAILS
  },
  sliceSelector: (state) => state.ui.modals
})

export const {
  hook: useWithdrawUSDCModal,
  reducer: withdrawUSDCModalReducer,
  actions: withdrawUSDCModalActions
} = withdrawUSDCModal
