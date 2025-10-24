import { createModal } from '../createModal'
import { ArtistCoinDetailsModalState } from '../types'

const artistCoinDetailsModal = createModal<ArtistCoinDetailsModalState>({
  reducerPath: 'ArtistCoinDetailsModal',
  initialState: {
    isOpen: false,
    mint: undefined
  },
  sliceSelector: (state) => state.ui.modals
})

export const {
  hook: useArtistCoinDetailsModal,
  actions: artistCoinDetailsModalActions,
  reducer: artistCoinDetailsModalReducer
} = artistCoinDetailsModal
