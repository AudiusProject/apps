import { createModal } from './createModal'

export type CoinSuccessModalState = {
  mint?: string
  name?: string
  ticker?: string
  logoUri?: string
  amountUi: string
  amountUsd: string
}

const coinSuccessModal = createModal<CoinSuccessModalState>({
  reducerPath: 'CoinSuccessModal',
  initialState: {
    isOpen: false,
    mint: undefined,
    name: undefined,
    ticker: undefined,
    logoUri: undefined,
    amountUi: '0',
    amountUsd: '0'
  },
  sliceSelector: (state) => state.ui.modals
})

export const {
  hook: useCoinSuccessModal,
  reducer: coinSuccessModalReducer,
  actions: coinSuccessModalActions
} = coinSuccessModal
