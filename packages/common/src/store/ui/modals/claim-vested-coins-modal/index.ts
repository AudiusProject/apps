import { createModal } from '../createModal'
import { ClaimVestedCoinsModalState } from '../types'

const claimVestedCoinsModal = createModal<ClaimVestedCoinsModalState>({
  reducerPath: 'ClaimVestedCoinsModal',
  initialState: {
    isOpen: false,
    ticker: '',
    claimable: 0,
    onClaim: () => {},
    isClaimPending: false
  },
  sliceSelector: (state) => state.ui.modals
})

export const {
  hook: useClaimVestedCoinsModal,
  actions: claimVestedCoinsModalActions,
  reducer: claimVestedCoinsModalReducer
} = claimVestedCoinsModal
