import type { BuySellTab } from '../../buy-sell/types'
import { createModal } from '../createModal'

export type BuySellModalState = {
  isOpen: boolean
  ticker?: string
  initialTab?: BuySellTab
}

const BuySellModal = createModal<BuySellModalState>({
  reducerPath: 'BuySellModal',
  initialState: {
    isOpen: false,
    ticker: undefined
  },
  sliceSelector: (state) => state.ui.modals
})

export const { hook: useBuySellModal, reducer: buySellModalReducer } =
  BuySellModal
