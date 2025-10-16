import { createModal } from '../createModal'

type ConnectedWalletsModalState = {}

const connectedWalletsModal = createModal<ConnectedWalletsModalState>({
  reducerPath: 'ConnectedWallets',
  initialState: {
    isOpen: false
  },
  sliceSelector: (state) => state.ui.modals
})

export const {
  hook: useConnectedWalletsModal,
  actions: connectedWalletsModalActions,
  reducer: connectedWalletsModalReducer
} = connectedWalletsModal
