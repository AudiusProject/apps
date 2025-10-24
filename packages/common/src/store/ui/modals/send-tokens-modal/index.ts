import { createModal } from '../createModal'
import { SendTokensModalState } from '../types'

const sendTokensModal = createModal<SendTokensModalState>({
  reducerPath: 'SendTokensModal',
  initialState: {
    isOpen: false,
    mint: undefined
  },
  sliceSelector: (state) => state.ui.modals
})

export const {
  hook: useSendTokensModal,
  actions: sendTokensModalActions,
  reducer: sendTokensModalReducer
} = sendTokensModal
